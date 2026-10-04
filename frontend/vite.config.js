import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  // Configurazione del server di sviluppo Vite:
  // Inoltriamo le richieste con prefisso /api e le connessioni /socket.io al backend Express (porta 4000)
  // Questo previene l'errore 404 Not Found durante lo sviluppo locale
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:4000',
        changeOrigin: true,
        secure: false,
      },
      '/socket.io': {
        target: 'http://localhost:4000',
        ws: true, // Abilita il proxying dei WebSocket
      },
    },
  },
})
