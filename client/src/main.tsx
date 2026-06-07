import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { TonConnectUIProvider } from '@tonconnect/ui-react';
import { Omniston, OmnistonProvider } from '@ston-fi/omniston-sdk-react';
import App from './App.tsx';
import './index.css';

// Initialize the Omniston SDK with the sandbox environment URL
const omniston = new Omniston({
  apiUrl: 'wss://omni-ws-sandbox.ston.fi',
});

// Configure the manifest URL for TonConnect dynamically
const manifestUrl = `${window.location.origin}/tonconnect-manifest.json`;

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <TonConnectUIProvider manifestUrl={manifestUrl}>
      <OmnistonProvider omniston={omniston}>
        <App />
      </OmnistonProvider>
    </TonConnectUIProvider>
  </StrictMode>,
);
