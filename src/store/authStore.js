import { create } from 'zustand'
import { supabase } from '../lib/supabase'

export const useAuthStore = create((set, get) => ({
  user: null,
  profile: null,
  permissions: [],
  loading: true,

  setUser: (user) => set({ user }),
  setProfile: (profile) => set({ profile }),

  fetchProfile: async (userId) => {
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single()

    if (data) {
      set({ profile: data })

      // Fetch permissions berdasarkan role
      if (data.role === 'superadmin') {
        // superadmin punya semua permission
        set({ permissions: ['all'] })
      } else {
        const { data: perms } = await supabase
          .from('role_permissions')
          .select('permission')
          .eq('role', data.role)
        set({ permissions: perms?.map(p => p.permission) || [] })
      }
    }
    return data
  },

  // Helper: cek permission
  can: (permission) => {
    const { permissions } = get()
    return permissions.includes('all') || permissions.includes(permission)
  },

  logout: async () => {
    await supabase.auth.signOut()
    set({ user: null, profile: null, permissions: [] })
  },
}))