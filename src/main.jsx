import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { GoogleOAuthProvider } from "@react-oauth/google";
import App from './App.jsx';
import './index.css';

const googleClientId =
    "949837373074-ogp692j5frscosvncrgcckep6kuueld9.apps.googleusercontent.com";

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <GoogleOAuthProvider clientId={googleClientId}>
      <App/>
    </GoogleOAuthProvider>
  </StrictMode>,
)