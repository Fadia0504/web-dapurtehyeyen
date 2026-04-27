import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import './index.css'
import App from './App.jsx'
import { supabase } from './lib/supabase'
import { useAuthStore } from './store/authStore'

// Listen auth state
supabase.auth.onAuthStateChange((_event, session) => {
  const { setUser, fetchProfile, setLoading } = useAuthStore.getState()
  setUser(session?.user ?? null)
  if (session?.user) fetchProfile(session.user.id)
  setLoading(false)
})

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </StrictMode>,
)