import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './ui/App.tsx'

// Это прибор, а не веб-страница: долгое нажатие здесь — действие (удержать клавишу,
// прокручивать кнопкой), а не вызов меню браузера. Меню открывалось поверх экрана
// и обрывало удержание, поэтому отключаем его во всём приложении.
document.addEventListener('contextmenu', (event) => event.preventDefault())

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
