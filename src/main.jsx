import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import './index.css'
import App from './App.jsx'
import { supabase } from './lib/supabase'
import { useAuthStore } from './store/authStore'

supabase.auth.getSession().then(({ data: { session } }) => {
  const { setUser, fetchProfile, setLoading } = useAuthStore.getState()
  if (session?.user) {
    setUser(session.user)
    fetchProfile(session.user.id).then(() => setLoading(false))
  } else {
    setLoading(false)
  }
})

supabase.auth.onAuthStateChange((_event, session) => {
  const { setUser, fetchProfile, setLoading } = useAuthStore.getState()
  setUser(session?.user ?? null)
  if (session?.user) {
    fetchProfile(session.user.id).then(() => setLoading(false))
  } else {
    setLoading(false)
  }
})

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </StrictMode>,
)