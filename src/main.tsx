import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import '@fontsource/fredoka/500.css';
import '@fontsource/fredoka/600.css';
import '@fontsource/fredoka/700.css';
import './styles.css';
import App from './App';
import { registerSW } from 'virtual:pwa-register';

// Lets :active styles (the card press) work on iOS Safari.
document.addEventListener('touchstart', () => undefined, { passive: true });

if (import.meta.env.PROD) registerSW({ immediate: true });

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
