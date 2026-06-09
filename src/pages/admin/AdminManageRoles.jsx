import { useEffect, useState, useRef } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuthStore } from '../../store/authStore'
import AdminSidebar from '../../components/admin/AdminSidebar'
import AdminNotifBell from '../../components/admin/AdminNotifBell'
import {
  MagnifyingGlassIcon, ChevronDownIcon, ArrowRightOnRectangleIcon,
  ShieldCheckIcon, PencilIcon, CheckIcon, XMarkIcon
} from '@heroicons/react/24/outline'
import Swal from 'sweetalert2'

const ROLE_OPTIONS = ['customer', 'staff', 'admin', 'superadmin']
const ROLE_COLORS = {
  customer: 'bg-gray-100 text-gray-600',
  staff: 'bg-green-100 text-green-600',
  admin: 'bg-blue-100 text-blue-600',
  superadmin: 'bg-purple-100 text-purple-600',
}
const ROLE_LABELS = {
  customer: 'Customer',
  staff: 'Staff',
  admin: 'Admin',
  superadmin: 'Super Admin',
}

export default function AdminManageRoles() {
  const { profile } = useAuthStore()
  const adminDropRef = useRef()
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [editingId, setEditingId] = useState(null)
  const [editRole, setEditRole] = useState('')
  const [saving, setSaving] = useState(false)
  const [adminDropdown, setAdminDropdown] = useState(false)

  useEffect(() => { fetchUsers() }, [])

  useEffect(() => {
    const handler = (e) => {
      if (adminDropRef.current && !adminDropRef.current.contains(e.target))
        setAdminDropdown(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  async function fetchUsers() {
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .order('created_at', { ascending: false })
    setUsers(data || [])
    setLoading(false)
  }

  const handleSaveRole = async (userId) => {
    if (!editRole) return
    setSaving(true)
    const { error } = await supabase.from('profiles').update({ role: editRole }).eq('id', userId)
    if (error) {
      Swal.fire({ icon: 'error', title: 'Gagal', text: error.message, confirmButtonColor: '#f97316', customClass: { popup: 'rounded-2xl' } })
    } else {
      Swal.fire({ icon: 'success', title: 'Role Diperbarui!', timer: 1500, showConfirmButton: false, customClass: { popup: 'rounded-2xl' } })
      setEditingId(null)
      await fetchUsers()
    }
    setSaving(false)
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    window.location.href = '/login'
  }

  const filtered = users.filter(u =>
    (u.full_name || '').toLowerCase().includes(search.toLowerCase()) ||
    (u.phone || '').includes(search)
  )

  const adminName = profile?.full_name || 'Admin'

  return (
    <div className="flex min-h-screen bg-gray-50">
      <AdminSidebar />
      <div className="flex-1 ml-56">

        <header className="bg-white border-b border-gray-100 px-8 py-4 flex items-center gap-4 sticky top-0 z-10">
          <div className="flex-1 max-w-md">
            <div className="relative">
              <MagnifyingGlassIcon className="w-5 h-5 text-gray-300 absolute left-3 top-1/2 -translate-y-1/2" />
              <input value={search} onChange={e => setSearch(e.target.value)}
                placeholder="Cari pengguna..."
                className="w-full bg-gray-50 border border-gray-100 rounded-xl pl-10 pr-4 py-2.5 text-sm outline-none focus:border-orange-300 transition" />
            </div>
          </div>
          <div className="ml-auto flex items-center gap-4">
            <AdminNotifBell />
            <div className="relative" ref={adminDropRef}>
              <button onClick={() => setAdminDropdown(p => !p)}
                className="flex items-center gap-3 pl-4 border-l border-gray-100 hover:bg-gray-50 px-3 py-2 rounded-xl transition">
                <div className="w-9 h-9 bg-purple-100 rounded-full flex items-center justify-center font-bold text-purple-500 text-sm">
                  {adminName[0].toUpperCase()}
                </div>
                <div className="text-left">
                  <p className="text-sm font-semibold text-gray-800">{adminName.split(' ')[0]}</p>
                  <p className="text-xs text-purple-500 font-medium">Super Admin</p>
                </div>
                <ChevronDownIcon className={`w-4 h-4 text-gray-400 transition-transform ${adminDropdown ? 'rotate-180' : ''}`} />
              </button>
              {adminDropdown && (
                <div className="absolute right-0 top-full mt-2 w-48 bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden z-50">
                  <button onClick={handleLogout}
                    className="flex items-center gap-3 px-4 py-3 text-sm text-gray-700 hover:bg-red-50 hover:text-red-500 transition w-full text-left">
                    <ArrowRightOnRectangleIcon className="w-5 h-5" />
                    Logout
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        <main className="p-8">
          <div className="mb-6">
            <h1 className="text-2xl font-bold text-gray-800 tracking-tight flex items-center gap-2">
              <ShieldCheckIcon className="w-7 h-7 text-purple-500" />
              Kelola Role & Akses
            </h1>
            <p className="text-gray-400 text-sm mt-1">Atur role dan hak akses setiap pengguna sistem.</p>
          </div>

          {/* Role Info Cards */}
          <div className="grid grid-cols-4 gap-4 mb-6">
            {[
              { role: 'superadmin', label: 'Super Admin', desc: 'Akses penuh ke seluruh sistem termasuk kelola role', color: 'border-purple-200 bg-purple-50', badge: 'bg-purple-100 text-purple-600' },
              { role: 'admin', label: 'Admin', desc: 'Kelola menu, pesanan, pelanggan, laporan, ulasan', color: 'border-blue-200 bg-blue-50', badge: 'bg-blue-100 text-blue-600' },
              { role: 'staff', label: 'Staff', desc: 'Akses kasir, lihat pesanan, update status pesanan', color: 'border-green-200 bg-green-50', badge: 'bg-green-100 text-green-600' },
              { role: 'customer', label: 'Customer', desc: 'Hanya akses halaman pelanggan (tidak bisa masuk admin)', color: 'border-gray-200 bg-gray-50', badge: 'bg-gray-100 text-gray-600' },
            ].map(r => (
              <div key={r.role} className={`rounded-2xl border p-4 ${r.color}`}>
                <span className={`text-xs px-2 py-1 rounded-full font-semibold ${r.badge}`}>{r.label}</span>
                <p className="text-xs text-gray-600 mt-2 leading-relaxed">{r.desc}</p>
                <p className="text-lg font-black text-gray-800 mt-2">
                  {users.filter(u => u.role === r.role).length}
                  <span className="text-xs text-gray-400 font-normal ml-1">pengguna</span>
                </p>
              </div>
            ))}
          </div>

          {/* Table */}
          <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-50 text-left">
                  <th className="px-6 py-4 text-xs font-semibold text-gray-400">Pengguna</th>
                  <th className="px-4 py-4 text-xs font-semibold text-gray-400">Telepon</th>
                  <th className="px-4 py-4 text-xs font-semibold text-gray-400">Bergabung</th>
                  <th className="px-4 py-4 text-xs font-semibold text-gray-400">Role Saat Ini</th>
                  <th className="px-4 py-4 text-xs font-semibold text-gray-400">Ubah Role</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  [...Array(4)].map((_, i) => (
                    <tr key={i} className="border-b border-gray-50">
                      <td colSpan={5} className="px-6 py-4"><div className="h-10 bg-gray-100 rounded-xl animate-pulse" /></td>
                    </tr>
                  ))
                ) : filtered.map(user => (
                  <tr key={user.id} className="border-b border-gray-50 hover:bg-gray-50/50 transition">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-sm flex-shrink-0 ${
                          user.role === 'superadmin' ? 'bg-purple-100 text-purple-500'
                          : user.role === 'admin' ? 'bg-blue-100 text-blue-500'
                          : user.role === 'staff' ? 'bg-green-100 text-green-500'
                          : 'bg-gray-100 text-gray-500'
                        }`}>
                          {(user.full_name || 'U')[0].toUpperCase()}
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-gray-800">{user.full_name || '(Belum diset)'}</p>
                          <p className="text-xs text-gray-400">{user.id.slice(0, 12)}...</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <p className="text-sm text-gray-600">{user.phone || '-'}</p>
                    </td>
                    <td className="px-4 py-4">
                      <p className="text-sm text-gray-600">
                        {new Date(user.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </p>
                    </td>
                    <td className="px-4 py-4">
                      <span className={`text-xs px-3 py-1.5 rounded-full font-semibold ${ROLE_COLORS[user.role] || 'bg-gray-100 text-gray-500'}`}>
                        {ROLE_LABELS[user.role] || user.role}
                      </span>
                    </td>
                    <td className="px-4 py-4">
                      {editingId === user.id ? (
                        <div className="flex items-center gap-2">
                          <select value={editRole} onChange={e => setEditRole(e.target.value)}
                            className="border border-gray-200 rounded-lg px-2 py-1.5 text-sm outline-none focus:border-orange-300">
                            {ROLE_OPTIONS.map(r => (
                              <option key={r} value={r}>{ROLE_LABELS[r]}</option>
                            ))}
                          </select>
                          <button onClick={() => handleSaveRole(user.id)} disabled={saving}
                            className="w-7 h-7 bg-green-500 rounded-lg flex items-center justify-center hover:bg-green-600 transition">
                            <CheckIcon className="w-4 h-4 text-white" />
                          </button>
                          <button onClick={() => setEditingId(null)}
                            className="w-7 h-7 bg-gray-100 rounded-lg flex items-center justify-center hover:bg-gray-200 transition">
                            <XMarkIcon className="w-4 h-4 text-gray-500" />
                          </button>
                        </div>
                      ) : (
                        <button onClick={() => { setEditingId(user.id); setEditRole(user.role) }}
                          disabled={user.id === profile?.id}
                          className="w-8 h-8 border border-gray-200 rounded-lg flex items-center justify-center hover:bg-orange-50 hover:border-orange-300 hover:text-orange-500 transition disabled:opacity-30 disabled:cursor-not-allowed"
                          title={user.id === profile?.id ? 'Tidak bisa mengubah role diri sendiri' : 'Ubah Role'}>
                          <PencilIcon className="w-4 h-4" />
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </main>
      </div>
    </div>
  )
}