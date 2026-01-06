/**
 * Data processing benchmarks
 *
 * Benchmarks for data transformation operations:
 * - Time offset calculations
 * - Expression evaluation
 * - Color conversion
 * - Coordinate transformation
 */

import { bench, describe } from 'vitest';
import { TimeOffsetCalculator } from '../src/timing';
import { ExpressionEvaluator } from '../src/expressions';
import { hexToRgba, rgbaToHex } from '../src/utils/color';
import { generatePointFeatures } from './setup';

// =============================================================================
// Time Offset Benchmarks
// =============================================================================

describe('TimeOffsetCalculator', () => {
  const calculator = new TimeOffsetCalculator();

  bench('fixed offset (1,000 features)', () => {
    const features = generatePointFeatures(1000);
    calculator.calculateOffsets(features, { timeOffset: 0.5 });
  });

  bench('random offset (1,000 features)', () => {
    const features = generatePointFeatures(1000);
    calculator.calculateOffsets(features, { timeOffset: 'random' });
  });

  bench('range offset (1,000 features)', () => {
    const features = generatePointFeatures(1000);
    calculator.calculateOffsets(features, { timeOffset: { min: 0, max: 2 } });
  });

  bench('property-based offset (1,000 features)', () => {
    const features = generatePointFeatures(1000);
    calculator.calculateOffsets(features, { timeOffset: ['get', 'value'] });
  });

  bench('hash-based offset (1,000 features)', () => {
    const features = generatePointFeatures(1000);
    calculator.calculateOffsets(features, { timeOffset: ['hash', 'id'] });
  });

  bench('fixed offset (10,000 features)', () => {
    const features = generatePointFeatures(10000);
    calculator.calculateOffsets(features, { timeOffset: 0.5 });
  });

  bench('hash-based offset (10,000 features)', () => {
    const features = generatePointFeatures(10000);
    calculator.calculateOffsets(features, { timeOffset: ['hash', 'id'] });
  });

  bench('expanded offsets (1,000 features, 4 vertices)', () => {
    const features = generatePointFeatures(1000);
    calculator.calculateOffsetsExpanded(features, { timeOffset: 0.5 }, 4);
  });
});

// =============================================================================
// Expression Evaluation Benchmarks
// =============================================================================

describe('ExpressionEvaluator', () => {
  bench('compile simple get expression', () => {
    const evaluator = new ExpressionEvaluator();
    evaluator.compile('test', ['get', 'value'], 'number');
    evaluator.clear();
  });

  bench('compile match expression', () => {
    const evaluator = new ExpressionEvaluator();
    evaluator.compile('test', [
      'match',
      ['get', 'category'],
      'A', '#ff0000',
      'B', '#00ff00',
      'C', '#0000ff',
      '#888888'
    ], 'color');
    evaluator.clear();
  });

  bench('compile interpolate expression', () => {
    const evaluator = new ExpressionEvaluator();
    evaluator.compile('test', [
      'interpolate',
      ['linear'],
      ['get', 'value'],
      0, '#ff0000',
      50, '#ffff00',
      100, '#00ff00'
    ], 'color');
    evaluator.clear();
  });

  bench('evaluate get (1,000 features)', () => {
    const evaluator = new ExpressionEvaluator();
    evaluator.compile('value', ['get', 'value'], 'number');

    const features = generatePointFeatures(1000);
    for (const feature of features) {
      evaluator.evaluateExpression('value', feature, 10);
    }
    evaluator.clear();
  });

  bench('evaluate match (1,000 features)', () => {
    const evaluator = new ExpressionEvaluator();
    evaluator.compile('color', [
      'match',
      ['get', 'category'],
      'A', '#ff0000',
      'B', '#00ff00',
      'C', '#0000ff',
      '#888888'
    ], 'color');

    const features = generatePointFeatures(1000);
    for (const feature of features) {
      evaluator.evaluateExpression('color', feature, 10);
    }
    evaluator.clear();
  });

  bench('evaluate complex (1,000 features)', () => {
    const evaluator = new ExpressionEvaluator();
    evaluator.compile('color', [
      'case',
      ['<', ['get', 'value'], 30], '#ff0000',
      ['<', ['get', 'value'], 70], '#ffff00',
      '#00ff00'
    ], 'color');

    const features = generatePointFeatures(1000);
    for (const feature of features) {
      evaluator.evaluateExpression('color', feature, 10);
    }
    evaluator.clear();
  });

  bench('multiple expressions (1,000 features)', () => {
    const evaluator = new ExpressionEvaluator();
    evaluator.compile('color', ['get', 'category'], 'string');
    evaluator.compile('intensity', ['/', ['get', 'value'], 100], 'number');
    evaluator.compile('size', ['+', ['get', 'value'], 10], 'number');

    const features = generatePointFeatures(1000);
    for (const feature of features) {
      evaluator.evaluateExpression('color', feature, 10);
      evaluator.evaluateExpression('intensity', feature, 10);
      evaluator.evaluateExpression('size', feature, 10);
    }
    evaluator.clear();
  });
});

// =============================================================================
// Color Conversion Benchmarks
// =============================================================================

describe('Color Conversion', () => {
  const testColors = [
    '#ff0000', '#00ff00', '#0000ff', '#ffffff', '#000000',
    '#123456', '#abcdef', '#fedcba', '#112233', '#aabbcc',
  ];

  bench('hexToRgba (1,000 conversions)', () => {
    for (let i = 0; i < 1000; i++) {
      hexToRgba(testColors[i % testColors.length]);
    }
  });

  bench('rgbaToHex (1,000 conversions)', () => {
    const rgbaColors: [number, number, number, number][] = [
      [1, 0, 0, 1], [0, 1, 0, 1], [0, 0, 1, 1],
      [1, 1, 1, 1], [0, 0, 0, 1], [0.5, 0.5, 0.5, 1],
    ];

    for (let i = 0; i < 1000; i++) {
      rgbaToHex(rgbaColors[i % rgbaColors.length]);
    }
  });

  bench('round-trip conversion (1,000 times)', () => {
    for (let i = 0; i < 1000; i++) {
      const hex = testColors[i % testColors.length];
      const rgba = hexToRgba(hex);
      rgbaToHex(rgba);
    }
  });
});

// =============================================================================
// Coordinate Transformation Benchmarks
// =============================================================================

describe('Coordinate Transformation', () => {
  // Mercator projection function (same as in layers)
  const lngLatToMercator = (lng: number, lat: number): [number, number] => {
    const x = (lng + 180) / 360;
    const sinLat = Math.sin((lat * Math.PI) / 180);
    const y = 0.5 - (0.25 * Math.log((1 + sinLat) / (1 - sinLat))) / Math.PI;
    return [x, y];
  };

  bench('lngLat to Mercator (10,000 points)', () => {
    for (let i = 0; i < 10000; i++) {
      const lng = -180 + Math.random() * 360;
      const lat = -85 + Math.random() * 170;
      lngLatToMercator(lng, lat);
    }
  });

  bench('process coordinates array (1,000 lines x 10 pts)', () => {
    const lines: number[][][] = [];
    for (let i = 0; i < 1000; i++) {
      const line: number[][] = [];
      for (let j = 0; j < 10; j++) {
        line.push([-180 + Math.random() * 360, -85 + Math.random() * 170]);
      }
      lines.push(line);
    }

    for (const line of lines) {
      for (const [lng, lat] of line) {
        lngLatToMercator(lng, lat);
      }
    }
  });
});

// =============================================================================
// Buffer Building Benchmarks
// =============================================================================

describe('Buffer Building', () => {
  bench('Float32Array allocation (1,000 points, 24 bytes each)', () => {
    // Each point: 4 vertices × 6 floats = 24 floats
    new Float32Array(1000 * 4 * 6);
  });

  bench('Float32Array allocation (10,000 points)', () => {
    new Float32Array(10000 * 4 * 6);
  });

  bench('Float32Array fill (1,000 points)', () => {
    const buffer = new Float32Array(1000 * 4 * 6);
    for (let i = 0; i < 1000; i++) {
      const base = i * 24;
      for (let j = 0; j < 4; j++) {
        const offset = base + j * 6;
        buffer[offset] = Math.random();
        buffer[offset + 1] = Math.random();
        buffer[offset + 2] = (j % 2) * 2 - 1;
        buffer[offset + 3] = Math.floor(j / 2) * 2 - 1;
        buffer[offset + 4] = i;
        buffer[offset + 5] = 0;
      }
    }
  });

  bench('Uint16Array index buffer (1,000 quads)', () => {
    const indices = new Uint16Array(1000 * 6);
    for (let i = 0; i < 1000; i++) {
      const base = i * 4;
      const offset = i * 6;
      indices[offset] = base;
      indices[offset + 1] = base + 1;
      indices[offset + 2] = base + 2;
      indices[offset + 3] = base;
      indices[offset + 4] = base + 2;
      indices[offset + 5] = base + 3;
    }
  });
});
