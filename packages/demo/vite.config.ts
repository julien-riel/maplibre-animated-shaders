import { defineConfig } from 'vite';
import { resolve } from 'path';
import { existsSync } from 'fs';
import glsl from 'vite-plugin-glsl';

export default defineConfig({
  root: resolve(__dirname),
  resolve: {
    alias: {
      // Resolve workspace package to source for development
      'maplibre-animated-shaders/types': resolve(__dirname, '../../src/types'),
      'maplibre-animated-shaders/plugins': resolve(__dirname, '../../src/plugins'),
      'maplibre-animated-shaders': resolve(__dirname, '../../src'),
    },
  },
  json: {
    stringify: false,
  },
  server: {
    port: 3000,
    open: true,
    fs: {
      // Allow serving files from generated-docs
      allow: ['..'],
    },
  },
  build: {
    outDir: resolve(__dirname, '../../dist-demo'),
    emptyOutDir: true,
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
      },
    },
  },
  plugins: [
    // Handle GLSL shader files
    glsl(),
    // Handle .geojson files as JSON
    {
      name: 'geojson-loader',
      transform(code, id) {
        if (id.endsWith('.geojson')) {
          return {
            code: `export default ${code}`,
            map: null,
          };
        }
      },
    },
    // Serve generated API documentation
    {
      name: 'serve-api-docs',
      configureServer(server) {
        const docsPath = resolve(__dirname, '../../generated-docs');

        // Import sirv once at startup
        let sirvHandler: ReturnType<typeof import('sirv').default> | null = null;

        // Redirect /api-docs to /api-docs/ for correct relative path resolution
        server.middlewares.use((req, res, next) => {
          if (req.url === '/api-docs') {
            res.writeHead(301, { Location: '/api-docs/' });
            res.end();
            return;
          }
          next();
        });

        server.middlewares.use('/api-docs', async (req, res, next) => {
          if (!existsSync(docsPath)) {
            res.statusCode = 404;
            res.end('API documentation not generated. Run: npm run docs');
            return;
          }

          // Initialize sirv handler once
          if (!sirvHandler) {
            const sirv = (await import('sirv')).default;
            sirvHandler = sirv(docsPath, {
              dev: true,
              etag: true,
              single: false,
            });
          }

          // Handle root path
          if (req.url === '/' || req.url === '') {
            req.url = '/index.html';
          }

          sirvHandler(req, res, next);
        });
      },
    },
  ],
});
