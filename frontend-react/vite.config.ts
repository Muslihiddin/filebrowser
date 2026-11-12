import path from 'node:path'
import { gzipSync } from 'node:zlib'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig, type Plugin } from 'vite'

/**
 * The Go server only serves JavaScript files from their gzipped copy
 * (see http/static.go), so emit a `.gz` file next to every `.js` file.
 */
function gzipJs(): Plugin {
  return {
    name: 'filebrowser:gzip-js',
    apply: 'build',
    generateBundle(_options, bundle) {
      for (const file of Object.values(bundle)) {
        if (!file.fileName.endsWith('.js')) continue
        const source = file.type === 'chunk' ? file.code : file.source
        this.emitFile({
          type: 'asset',
          fileName: `${file.fileName}.gz`,
          source: gzipSync(source, { level: 9 }),
        })
      }
    },
  }
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss(), gzipJs()],
  resolve: {
    alias: {
      '@': path.resolve(import.meta.dirname, './src'),
    },
  },
  server: {
    fs: {
      // translations are shared with the Vue app
      allow: [
        import.meta.dirname,
        path.resolve(import.meta.dirname, '../frontend/src/i18n'),
      ],
    },
    proxy: {
      '/api/command': {
        target: 'ws://127.0.0.1:8080',
        ws: true,
      },
      '/api': 'http://127.0.0.1:8080',
    },
  },
  // Same output layout as the Vue app (frontend/vite.config.ts): the Go server
  // renders dist/public/index.html as a template and serves the other files
  // under "<BaseURL>/static/".
  base: '',
  build: {
    rolldownOptions: {
      input: {
        index: path.resolve(import.meta.dirname, './public/index.html'),
      },
      output: {
        codeSplitting: {
          groups: [
            // bundle the translations in a separate chunk, like the Vue app
            { name: 'i18n', test: /[\\/]frontend[\\/]src[\\/]i18n[\\/]/ },
            { name: 'vendor', test: /[\\/]node_modules[\\/]/ },
          ],
        },
      },
    },
  },
  experimental: {
    renderBuiltUrl(filename, { hostType }) {
      if (hostType === 'js') {
        return { runtime: `window.__prependStaticUrl(${JSON.stringify(filename)})` }
      } else if (hostType === 'html') {
        return `[{[ .StaticURL ]}]/${filename}`
      } else {
        return { relative: true }
      }
    },
  },
})
