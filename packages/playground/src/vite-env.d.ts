/// <reference types="vite/client" />

declare module 'monaco-editor' {
  export * from 'monaco-editor/esm/vs/editor/editor.api';
}

declare module '*.glsl' {
  const content: string;
  export default content;
}
