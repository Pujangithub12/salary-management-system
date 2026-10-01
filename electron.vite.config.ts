import { resolve } from 'path'
import { defineConfig, externalizeDepsPlugin } from 'electron-vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

const shared = { '@shared': resolve('src/shared') }
// The generated Prisma client is CommonJS with a native engine: keep it out of the bundle.
const dbClient = resolve('prisma-client/index.js')

export default defineConfig({
  main: {
    plugins: [externalizeDepsPlugin()],
    resolve: { alias: { ...shared, '@db-client': dbClient } },
    build: { rollupOptions: { external: [dbClient], makeAbsoluteExternalsRelative: true } }
  },
  preload: { plugins: [externalizeDepsPlugin()], resolve: { alias: shared } },
  renderer: {
    plugins: [react(), tailwindcss()],
    resolve: { alias: { '@': resolve('src/renderer/src'), ...shared } }
  }
})
