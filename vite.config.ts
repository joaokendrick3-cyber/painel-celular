import { defineConfig, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'
import { readFileSync, existsSync } from 'node:fs'
import { resolve } from 'node:path'

// Só no modo de desenvolvimento: serve o resumo real (cópia local, fora do git) em /dev-resumo.json.
// No build final esse arquivo NUNCA entra.
function resumoDeDesenvolvimento(): Plugin {
  return {
    name: 'resumo-dev',
    apply: 'serve',
    configureServer(servidor) {
      servidor.middlewares.use('/dev-resumo.json', (_req, res) => {
        const arq = resolve(__dirname, 'dev/resumo-real.json')
        if (!existsSync(arq)) { res.statusCode = 404; res.end('sem resumo de desenvolvimento'); return }
        res.setHeader('Content-Type', 'application/json')
        res.end(readFileSync(arq))
      })
    }
  }
}

export default defineConfig({
  base: process.env.BASE ?? '/painel-celular/',
  resolve: { alias: { '@shared': resolve(__dirname, '../Painel Academico App/src/shared') } },
  server: { fs: { allow: ['..'] } },
  plugins: [
    react(),
    resumoDeDesenvolvimento(),
    VitePWA({
      strategies: 'injectManifest',
      srcDir: 'src',
      filename: 'sw.ts',
      registerType: 'autoUpdate',
      includeAssets: ['icone-180.png'],
      manifest: {
        name: 'PAINEL', short_name: 'PAINEL', description: 'Faltas, notas e provas da UEM',
        lang: 'pt-BR', display: 'standalone', orientation: 'portrait',
        background_color: '#06070c', theme_color: '#06070c', start_url: '.', scope: '.',
        icons: [
          { src: 'icone-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icone-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' }
        ]
      },
      injectManifest: { globPatterns: ['**/*.{js,css,html,png,woff2,svg}'] }
    })
  ]
})
