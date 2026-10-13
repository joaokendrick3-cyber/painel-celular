import { createRoot } from 'react-dom/client'
import { registerSW } from 'virtual:pwa-register'
import App from './App'
import './estilo.css'
import './capa.css'

registerSW({ immediate: true })
createRoot(document.getElementById('root')!).render(<App />)
