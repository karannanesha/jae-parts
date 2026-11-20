import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import '@jae/shared/styles/tokens.css';
import './styles/store.css';
import App from './App.jsx';
import { AuthProvider } from './state/AuthContext.jsx';
import { CartProvider } from './state/CartContext.jsx';
import { UiProvider } from './state/UiContext.jsx';

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <UiProvider>
          <CartProvider>
            <App />
          </CartProvider>
        </UiProvider>
      </AuthProvider>
    </BrowserRouter>
  </StrictMode>,
);
