import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { StoreProvider } from './lib/stores/index.tsx'
import { GoogleOAuthProvider } from '@react-oauth/google'

createRoot(document.getElementById('root')!).render(
  <GoogleOAuthProvider clientId={import.meta.env.VITE_GOOGLE_CLIENT_ID ?? '252744646128-cjav2fij0vfbauvb11co4qtrgq27cd7p.apps.googleusercontent.com'}>
    <StoreProvider>
      <App />
    </StoreProvider>
  </GoogleOAuthProvider>,
)
