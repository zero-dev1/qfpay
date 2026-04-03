import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

// ─── Suppress browser context menu for native app feel ───────────────────────
document.addEventListener('contextmenu', (e) => {
  // Allow in regular browser (non-PWA) mode
  if (!window.matchMedia('(display-mode: standalone)').matches) return;
  // Allow on inputs, textareas, links, images, video
  const target = e.target as HTMLElement;
  if (target.closest('a, img, video, audio, textarea, input[type="text"]')) return;
  // Allow if user has selected text
  const selection = window.getSelection();
  if (selection && selection.toString().length > 0) return;
  e.preventDefault();
});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
