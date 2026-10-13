import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import './index.css'
import { applyFontScale } from './lib/fontScale'

// 首帧渲染前应用用户保存的全局字号，避免默认字号闪现
applyFontScale()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
)
