/**
 * Services
 */

export { ShaderCompiler, shaderCompiler } from './ShaderCompiler';
export type { CompilationResult } from './ShaderCompiler';

export {
  exportProject,
  downloadProject,
  importProject,
  importProjectFromFile,
  validateProjectFile,
  stateToProjectFile,
  projectFileToState,
} from './ProjectService';

export { AutoSaveService, autoSaveService } from './AutoSaveService';

export { processGLSL, getAvailableLibraries } from './GLSLPreprocessor';
