import React from 'react'
import ReactDOM from 'react-dom/client'
import { App } from './App'
import { applyTheme, getStoredTheme } from './lib/theme'
import './index.css'

// O index.html já aplicou o tema antes da pintura. Aqui só mantemos em sincronia
// com o sistema enquanto o usuário não tiver escolhido manualmente.
window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
  if (!getStoredTheme()) applyTheme(e.matches ? 'dark' : 'light')
})

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
