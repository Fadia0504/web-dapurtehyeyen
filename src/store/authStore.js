import { create } from 'zustand'
import { supabase } from '../lib/supabase'

export const useAuthStore = create((set, get) => ({
  user: null,
  profile: null,
  permissions: [],
  loading: true,

  setUser: (user) => set({ user }),
  setProfile: (profile) => set({ profile }),
  setLoading: (loading) => set({ loading }),

  fetchProfile: async (userId) => {
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single()

    if (data) {
      set({ profile: data })

      if (data.role === 'admin') {
        // admin punya semua permission
        set({ permissions: ['all'] })
      } else if (data.role === 'staff') {
        // staff hanya kasir + lihat pesanan online
        set({
          permissions: [
            'view_kasir',
            'create_kasir_transaction',
            'view_kasir_history',
            'view_orders',
          ]
        })
      } else {
        // customer — tidak ada akses admin
        set({ permissions: [] })
      }
    }
    return data
  },

  can: (permission) => {
    const { permissions } = get()
    return permissions.includes('all') || permissions.includes(permission)
  },

  logout: async () => {
    await supabase.auth.signOut()
    set({ user: null, profile: null, permissions: [], loading: false })
  },
}))