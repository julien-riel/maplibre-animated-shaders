#!/usr/bin/env tsx
/**
 * GLSL Validation Script
 *
 * Validates all GLSL shaders in the project for syntax errors.
 * This script performs static analysis without requiring a WebGL context.
 *
 * Run with: npx tsx scripts/validate-glsl.ts
 * Or: npm run validate:glsl
 */

import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ANSI color codes for terminal output
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  gray: '\x1b[90m',
};

interface ValidationError {
  file: string;
  line?: number;
  message: string;
  severity: 'error' | 'warning';
}

interface ValidationResult {
  file: string;
  valid: boolean;
  errors: ValidationError[];
  warnings: ValidationError[];
}

/**
 * Valid GLSL ES 1.0 / 3.0 keywords and built-in functions
 */
const GLSL_KEYWORDS = new Set([
  // Storage qualifiers
  'const', 'uniform', 'varying', 'attribute', 'in', 'out', 'inout',
  // Precision
  'precision', 'lowp', 'mediump', 'highp',
  // Control flow
  'if', 'else', 'for', 'while', 'do', 'switch', 'case', 'default',
  'break', 'continue', 'return', 'discard',
  // Types
  'void', 'bool', 'int', 'uint', 'float',
  'vec2', 'vec3', 'vec4',
  'ivec2', 'ivec3', 'ivec4',
  'uvec2', 'uvec3', 'uvec4',
  'bvec2', 'bvec3', 'bvec4',
  'mat2', 'mat3', 'mat4',
  'mat2x2', 'mat2x3', 'mat2x4',
  'mat3x2', 'mat3x3', 'mat3x4',
  'mat4x2', 'mat4x3', 'mat4x4',
  'sampler2D', 'sampler3D', 'samplerCube',
  'sampler2DShadow', 'samplerCubeShadow',
  'isampler2D', 'isampler3D', 'isamplerCube',
  'usampler2D', 'usampler3D', 'usamplerCube',
  // Struct
  'struct',
  // Boolean literals
  'true', 'false',
]);

const GLSL_BUILTIN_FUNCTIONS = new Set([
  // Math functions
  'radians', 'degrees', 'sin', 'cos', 'tan', 'asin', 'acos', 'atan',
  'sinh', 'cosh', 'tanh', 'asinh', 'acosh', 'atanh',
  'pow', 'exp', 'log', 'exp2', 'log2', 'sqrt', 'inversesqrt',
  'abs', 'sign', 'floor', 'trunc', 'round', 'roundEven', 'ceil', 'fract',
  'mod', 'modf', 'min', 'max', 'clamp', 'mix', 'step', 'smoothstep',
  // Geometric functions
  'length', 'distance', 'dot', 'cross', 'normalize', 'faceforward',
  'reflect', 'refract',
  // Matrix functions
  'matrixCompMult', 'outerProduct', 'transpose', 'determinant', 'inverse',
  // Vector relational
  'lessThan', 'lessThanEqual', 'greaterThan', 'greaterThanEqual',
  'equal', 'notEqual', 'any', 'all', 'not',
  // Texture functions
  'texture', 'texture2D', 'texture3D', 'textureCube',
  'textureProj', 'textureLod', 'textureGrad',
  'texelFetch', 'textureSize',
  // Derivative functions
  'dFdx', 'dFdy', 'fwidth',
  // Noise functions (deprecated but common)
  'noise1', 'noise2', 'noise3', 'noise4',
]);

const GLSL_BUILTIN_VARIABLES = new Set([
  'gl_Position', 'gl_PointSize', 'gl_FragCoord', 'gl_FrontFacing',
  'gl_FragColor', 'gl_FragData', 'gl_PointCoord',
  'gl_VertexID', 'gl_InstanceID', 'gl_FragDepth',
]);

/**
 * Check if file is a GLSL library (utility functions, not a complete shader)
 */
function isGLSLLibrary(filename: string): boolean {
  const libraryPatterns = [
    '/common/',
    '/utils/',
    '/lib/',
    '/include/',
    '.lib.glsl',
    '.inc.glsl',
  ];
  return libraryPatterns.some(pattern => filename.includes(pattern));
}

/**
 * Validate GLSL source code
 */
function validateGLSL(source: string, filename: string): ValidationResult {
  const errors: ValidationError[] = [];
  const warnings: ValidationError[] = [];
  const lines = source.split('\n');
  const isLibrary = isGLSLLibrary(filename);

  // Track state
  let inBlockComment = false;
  let braceDepth = 0;
  let parenDepth = 0;
  let hasMainFunction = false;
  let hasPrecision = false;
  let hasFragColor = false;

  for (let i = 0; i < lines.length; i++) {
    let line = lines[i];
    const lineNum = i + 1;

    // Handle block comments
    if (inBlockComment) {
      const endIdx = line.indexOf('*/');
      if (endIdx !== -1) {
        inBlockComment = false;
        line = line.substring(endIdx + 2);
      } else {
        continue;
      }
    }

    // Remove single-line comments
    const commentIdx = line.indexOf('//');
    if (commentIdx !== -1) {
      line = line.substring(0, commentIdx);
    }

    // Handle start of block comments
    const blockStart = line.indexOf('/*');
    if (blockStart !== -1) {
      const blockEnd = line.indexOf('*/', blockStart + 2);
      if (blockEnd !== -1) {
        line = line.substring(0, blockStart) + line.substring(blockEnd + 2);
      } else {
        line = line.substring(0, blockStart);
        inBlockComment = true;
      }
    }

    // Count braces and parentheses
    for (const char of line) {
      if (char === '{') braceDepth++;
      if (char === '}') braceDepth--;
      if (char === '(') parenDepth++;
      if (char === ')') parenDepth--;
    }

    // Check for precision declaration
    if (line.match(/precision\s+(lowp|mediump|highp)\s+float/)) {
      hasPrecision = true;
    }

    // Check for main function
    if (line.match(/void\s+main\s*\(\s*\)/)) {
      hasMainFunction = true;
    }

    // Check for gl_FragColor (fragment shaders)
    if (line.includes('gl_FragColor')) {
      hasFragColor = true;
    }

    // Validation checks
    const trimmed = line.trim();

    // Check for empty statements (double semicolons)
    if (trimmed.match(/;;\s*$/)) {
      warnings.push({
        file: filename,
        line: lineNum,
        message: 'Double semicolon detected',
        severity: 'warning',
      });
    }

    // Check for = in conditions (potential bug)
    const conditionMatch = trimmed.match(/if\s*\(\s*([^)]+)\s*\)/);
    if (conditionMatch) {
      const condition = conditionMatch[1];
      if (condition.match(/[^=!<>]=(?!=)/) && !condition.includes('==')) {
        warnings.push({
          file: filename,
          line: lineNum,
          message: 'Assignment in condition - did you mean "=="?',
          severity: 'warning',
        });
      }
    }

    // Check for undeclared macros (simple heuristic)
    const macroMatch = trimmed.match(/#define\s+(\w+)/);
    if (macroMatch) {
      // Valid macro definition
    }

    // Check for invalid preprocessor directives
    if (trimmed.startsWith('#')) {
      const directive = trimmed.match(/^#(\w+)/);
      if (directive) {
        const validDirectives = ['define', 'undef', 'if', 'ifdef', 'ifndef', 'else', 'elif', 'endif', 'error', 'pragma', 'extension', 'version', 'line'];
        if (!validDirectives.includes(directive[1])) {
          errors.push({
            file: filename,
            line: lineNum,
            message: `Invalid preprocessor directive: #${directive[1]}`,
            severity: 'error',
          });
        }
      }
    }

    // Check for common typos in GLSL types
    const typeMatch = trimmed.match(/\b(vect\d|flaot|intt|booll)\b/i);
    if (typeMatch) {
      errors.push({
        file: filename,
        line: lineNum,
        message: `Possible typo in type: "${typeMatch[1]}"`,
        severity: 'error',
      });
    }
  }

  // Global checks
  if (braceDepth !== 0) {
    errors.push({
      file: filename,
      message: `Unbalanced braces: ${braceDepth > 0 ? 'missing ' + braceDepth + ' closing' : 'extra ' + Math.abs(braceDepth) + ' closing'} brace(s)`,
      severity: 'error',
    });
  }

  if (parenDepth !== 0) {
    errors.push({
      file: filename,
      message: `Unbalanced parentheses: ${parenDepth > 0 ? 'missing ' + parenDepth + ' closing' : 'extra ' + Math.abs(parenDepth) + ' closing'} parenthesis(es)`,
      severity: 'error',
    });
  }

  // Skip main() and precision checks for library files
  if (!isLibrary) {
    if (!hasMainFunction) {
      errors.push({
        file: filename,
        message: 'Missing main() function',
        severity: 'error',
      });
    }

    if (!hasPrecision) {
      warnings.push({
        file: filename,
        message: 'Missing precision declaration (e.g., "precision highp float;")',
        severity: 'warning',
      });
    }
  }

  return {
    file: filename,
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Extract GLSL code from TypeScript shader files
 */
function extractGLSLFromTS(content: string, filename: string): { name: string; source: string }[] {
  const shaders: { name: string; source: string }[] = [];

  // Match template literals assigned to variables containing "Shader" or "shader"
  const shaderPattern = /(?:const|let|var)\s+(\w*[Ss]hader\w*)\s*=\s*`([^`]+)`/g;
  let match;

  while ((match = shaderPattern.exec(content)) !== null) {
    shaders.push({
      name: match[1],
      source: match[2],
    });
  }

  // Also match exports like: fragmentShader: `...`
  const exportPattern = /fragmentShader:\s*`([^`]+)`/g;
  while ((match = exportPattern.exec(content)) !== null) {
    shaders.push({
      name: `${path.basename(filename, '.ts')}_fragment`,
      source: match[1],
    });
  }

  return shaders;
}

/**
 * Find all shader files in the project
 */
function findShaderFiles(dir: string): string[] {
  const files: string[] = [];

  function walk(currentDir: string) {
    const entries = fs.readdirSync(currentDir, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(currentDir, entry.name);

      if (entry.isDirectory()) {
        if (!['node_modules', 'dist', '.git', 'coverage'].includes(entry.name)) {
          walk(fullPath);
        }
      } else if (entry.isFile()) {
        if (entry.name.endsWith('.glsl') || entry.name.endsWith('.vert') || entry.name.endsWith('.frag')) {
          files.push(fullPath);
        } else if (entry.name.endsWith('.ts') && !entry.name.endsWith('.test.ts')) {
          // Check if it's a shader file
          const content = fs.readFileSync(fullPath, 'utf-8');
          if (content.includes('fragmentShader') || content.includes('vertexShader')) {
            files.push(fullPath);
          }
        }
      }
    }
  }

  walk(dir);
  return files;
}

/**
 * Main validation function
 */
async function main() {
  console.log(`\n${colors.blue}╔══════════════════════════════════════════╗${colors.reset}`);
  console.log(`${colors.blue}║       GLSL Shader Validation Tool        ║${colors.reset}`);
  console.log(`${colors.blue}╚══════════════════════════════════════════╝${colors.reset}\n`);

  const srcDir = path.resolve(__dirname, '../packages/lib/src');
  const files = findShaderFiles(srcDir);

  console.log(`${colors.gray}Scanning ${files.length} files for GLSL shaders...${colors.reset}\n`);

  let totalShaders = 0;
  let validShaders = 0;
  let totalErrors = 0;
  let totalWarnings = 0;
  const allResults: ValidationResult[] = [];

  for (const file of files) {
    const content = fs.readFileSync(file, 'utf-8');
    const relativePath = path.relative(process.cwd(), file);

    if (file.endsWith('.glsl') || file.endsWith('.vert') || file.endsWith('.frag')) {
      // Pure GLSL file
      const result = validateGLSL(content, relativePath);
      allResults.push(result);
      totalShaders++;

      if (result.valid) {
        validShaders++;
      }
      totalErrors += result.errors.length;
      totalWarnings += result.warnings.length;
    } else {
      // TypeScript file with embedded GLSL
      const shaders = extractGLSLFromTS(content, relativePath);

      for (const shader of shaders) {
        const result = validateGLSL(shader.source, `${relativePath}:${shader.name}`);
        allResults.push(result);
        totalShaders++;

        if (result.valid) {
          validShaders++;
        }
        totalErrors += result.errors.length;
        totalWarnings += result.warnings.length;
      }
    }
  }

  // Print results
  for (const result of allResults) {
    if (result.errors.length > 0 || result.warnings.length > 0) {
      console.log(`\n${colors.yellow}━━━ ${result.file} ━━━${colors.reset}`);

      for (const error of result.errors) {
        const lineInfo = error.line ? `:${error.line}` : '';
        console.log(`  ${colors.red}✖ ERROR${lineInfo}: ${error.message}${colors.reset}`);
      }

      for (const warning of result.warnings) {
        const lineInfo = warning.line ? `:${warning.line}` : '';
        console.log(`  ${colors.yellow}⚠ WARNING${lineInfo}: ${warning.message}${colors.reset}`);
      }
    }
  }

  // Summary
  console.log(`\n${colors.blue}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${colors.reset}`);
  console.log(`${colors.blue}                  Summary                    ${colors.reset}`);
  console.log(`${colors.blue}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${colors.reset}`);

  console.log(`\n  Total shaders analyzed: ${totalShaders}`);
  console.log(`  ${colors.green}✓ Valid: ${validShaders}${colors.reset}`);

  if (totalErrors > 0) {
    console.log(`  ${colors.red}✖ Errors: ${totalErrors}${colors.reset}`);
  }
  if (totalWarnings > 0) {
    console.log(`  ${colors.yellow}⚠ Warnings: ${totalWarnings}${colors.reset}`);
  }

  const successRate = totalShaders > 0 ? ((validShaders / totalShaders) * 100).toFixed(1) : 0;
  console.log(`\n  Success rate: ${successRate}%\n`);

  // Exit with error if there are validation errors
  if (totalErrors > 0) {
    console.log(`${colors.red}✖ Validation failed with ${totalErrors} error(s)${colors.reset}\n`);
    process.exit(1);
  } else {
    console.log(`${colors.green}✓ All shaders validated successfully!${colors.reset}\n`);
    process.exit(0);
  }
}

main().catch((error) => {
  console.error(`${colors.red}Validation script error:${colors.reset}`, error);
  process.exit(1);
});
