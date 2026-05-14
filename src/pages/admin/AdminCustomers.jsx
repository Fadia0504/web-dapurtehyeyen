import { useEffect, useState, useRef } from 'react'
import { supabase } from '../../lib/supabase'
import AdminSidebar from '../../components/admin/AdminSidebar'
import AdminNotifBell from '../../components/admin/AdminNotifBell'
import { useAuthStore } from '../../store/authStore'
import {
  MagnifyingGlassIcon, ChevronDownIcon, ArrowRightOnRectangleIcon,
  ChevronLeftIcon, ChevronRightIcon, EyeIcon, TrashIcon,
  ArrowDownTrayIcon, UserGroupIcon, XMarkIcon, CalendarIcon,
  CheckCircleIcon, UserPlusIcon, UserIcon, ShoppingBagIcon
} from '@heroicons/react/24/outline'
import Swal from 'sweetalert2'
import * as XLSX from 'xlsx'

export default function AdminCustomers() {
  const { profile } = useAuthStore()
  const adminDropRef = useRef()
  const [adminDropdown, setAdminDropdown] = useState(false)
  const [customers, setCustomers] = useState([])
  const [orderStats, setOrderStats] = useState({})
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filterStatus, setFilterStatus] = useState('')
  const [page, setPage] = useState(1)
  const [perPage] = useState(8)
  const [showDetail, setShowDetail] = useState(false)
  const [selectedCustomer, setSelectedCustomer] = useState(null)
  const [customerOrders, setCustomerOrders] = useState([])
  const [loadingOrders, setLoadingOrders] = useState(false)
  const [showExportModal, setShowExportModal] = useState(false)
  const [exportFormat, setExportFormat] = useState('excel')

  useEffect(() => { fetchData() }, [])

  useEffect(() => {
    const handler = (e) => {
      if (adminDropRef.current && !adminDropRef.current.contains(e.target))
        setAdminDropdown(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  async function fetchData() {
    setLoading(true)
    const [{ data: profileData }, { data: orderData }] = await Promise.all([
      supabase.from('profiles').select('*').eq('role', 'customer').order('created_at', { ascending: false }),
      supabase.from('orders').select('user_id, total, status'),
    ])
    setCustomers(profileData || [])
    const stats = {}
    orderData?.forEach(o => {
      if (!stats[o.user_id]) stats[o.user_id] = { count: 0, total: 0 }
      stats[o.user_id].count += 1
      stats[o.user_id].total += o.total || 0
    })
    setOrderStats(stats)
    setLoading(false)
  }

  async function fetchCustomerOrders(userId) {
    setLoadingOrders(true)
    const { data } = await supabase
      .from('orders')
      .select('*, order_items(*, foods(name))')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(5)
    setCustomerOrders(data || [])
    setLoadingOrders(false)
  }

  const handleViewDetail = async (customer) => {
    setSelectedCustomer(customer)
    setShowDetail(true)
    await fetchCustomerOrders(customer.id)
  }

  const handleDeleteCustomer = async (customerId, customerName) => {
    const result = await Swal.fire({
      icon: 'warning',
      title: 'Hapus Pelanggan?',
      html: `Akun <strong>${customerName || 'Pengguna'}</strong> akan dihapus secara permanen.`,
      showCancelButton: true,
      confirmButtonColor: '#ef4444',
      cancelButtonColor: '#e5e7eb',
      confirmButtonText: 'Ya, Hapus',
      cancelButtonText: 'Batal',
      customClass: { popup: 'rounded-2xl', cancelButton: '!text-gray-700' },
    })
    if (!result.isConfirmed) return
    try {
      await supabase.from('profiles').delete().eq('id', customerId)
      await fetchData()
      setShowDetail(false)
      Swal.fire({
        icon: 'success',
        title: 'Berhasil Dihapus',
        text: 'Akun pelanggan telah dihapus.',
        confirmButtonColor: '#f97316',
        timer: 1800,
        timerProgressBar: true,
        showConfirmButton: false,
        customClass: { popup: 'rounded-2xl' },
      })
    } catch (err) {
      Swal.fire({
        icon: 'error',
        title: 'Gagal Menghapus',
        text: err.message,
        confirmButtonColor: '#f97316',
        customClass: { popup: 'rounded-2xl' },
      })
    }
  }

  const handleExportExcel = () => {
    const wb = XLSX.utils.book_new()
    const exportDate = new Date().toLocaleString('id-ID')

    // Sheet Ringkasan
    const ringkasan = [
      ['LAPORAN DATA PELANGGAN'],
      [`Tanggal Export: ${exportDate}`],
      [],
      ['Total Pelanggan', totalCustomers],
      ['Pelanggan Aktif', activeCustomers],
      ['Pelanggan Baru Bulan Ini', newCustomers],
      ['Pelanggan Nonaktif', inactiveCustomers],
    ]
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(ringkasan), 'Ringkasan')

    // Sheet Data Pelanggan
    const headers = ['No', 'Nama', 'No. Telepon', 'Total Pesanan', 'Total Belanja', 'Status', 'Bergabung']
    const rows = filtered.map((c, i) => [
      i + 1,
      c.full_name || '-',
      c.phone || '-',
      `${orderStats[c.id]?.count || 0} Pesanan`,
      `Rp ${(orderStats[c.id]?.total || 0).toLocaleString('id-ID')}`,
      (orderStats[c.id]?.count || 0) > 0 ? 'Aktif' : 'Nonaktif',
      new Date(c.created_at).toLocaleDateString('id-ID'),
    ])
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([headers, ...rows]), 'Data Pelanggan')

    XLSX.writeFile(wb, `Pelanggan_${new Date().toISOString().slice(0,10)}.xlsx`)
    setShowExportModal(false)
    Swal.fire({
      icon: 'success', title: 'Export Berhasil',
      text: 'File Excel berhasil diunduh.',
      confirmButtonColor: '#f97316', timer: 2000,
      timerProgressBar: true, showConfirmButton: false,
      customClass: { popup: 'rounded-2xl' },
    })
  }

  const handleExportPDF = async () => {
    const { default: jsPDF } = await import('jspdf')
    const { default: autoTable } = await import('jspdf-autotable')
    const doc = new jsPDF('p', 'mm', 'a4')
    const pageW = doc.internal.pageSize.getWidth()
    const exportDate = new Date().toLocaleString('id-ID')

    // Header
    doc.setFillColor(249, 115, 22)
    doc.rect(0, 0, pageW, 18, 'F')
    doc.setTextColor(255, 255, 255)
    doc.setFontSize(13)
    doc.setFont('helvetica', 'bold')
    doc.text('Dapur Teh Yeyen', 14, 11)
    doc.setFontSize(10)
    doc.setFont('helvetica', 'normal')
    doc.text('LAPORAN DATA PELANGGAN', pageW / 2, 8, { align: 'center' })
    doc.text(`Dicetak: ${exportDate}`, pageW / 2, 14, { align: 'center' })
    doc.setTextColor(50, 50, 50)

    // Stats boxes
    const statData = [
      { label: 'Total Pelanggan', value: String(totalCustomers) },
      { label: 'Pelanggan Aktif', value: String(activeCustomers) },
      { label: 'Pelanggan Baru', value: String(newCustomers) },
      { label: 'Nonaktif', value: String(inactiveCustomers) },
    ]
    const boxW = (pageW - 28 - 9) / 4
    statData.forEach((s, i) => {
      const x = 14 + i * (boxW + 3)
      doc.setFillColor(255, 247, 237)
      doc.roundedRect(x, 24, boxW, 16, 2, 2, 'F')
      doc.setFontSize(7)
      doc.setTextColor(150, 100, 50)
      doc.text(s.label, x + 3, 30)
      doc.setFontSize(11)
      doc.setFont('helvetica', 'bold')
      doc.setTextColor(50, 50, 50)
      doc.text(s.value, x + 3, 37)
      doc.setFont('helvetica', 'normal')
    })

    // Tabel
    doc.setFontSize(10)
    doc.setFont('helvetica', 'bold')
    doc.text('Data Pelanggan', 14, 50)
    doc.setFont('helvetica', 'normal')

    autoTable(doc, {
      startY: 53,
      head: [['No', 'Nama', 'No. Telepon', 'Total Pesanan', 'Total Belanja', 'Status', 'Bergabung']],
      body: filtered.map((c, i) => [
        i + 1,
        c.full_name || '-',
        c.phone || '-',
        `${orderStats[c.id]?.count || 0} Pesanan`,
        `Rp ${(orderStats[c.id]?.total || 0).toLocaleString('id-ID')}`,
        (orderStats[c.id]?.count || 0) > 0 ? 'Aktif' : 'Nonaktif',
        new Date(c.created_at).toLocaleDateString('id-ID'),
      ]),
      headStyles: { fillColor: [249, 115, 22], textColor: 255, fontSize: 8 },
      bodyStyles: { fontSize: 8 },
      alternateRowStyles: { fillColor: [255, 247, 237] },
      margin: { left: 14, right: 14 },
    })

    doc.save(`Pelanggan_${new Date().toISOString().slice(0,10)}.pdf`)
    setShowExportModal(false)
    Swal.fire({
      icon: 'success', title: 'Export Berhasil',
      text: 'File PDF berhasil diunduh.',
      confirmButtonColor: '#f97316', timer: 2000,
      timerProgressBar: true, showConfirmButton: false,
      customClass: { popup: 'rounded-2xl' },
    })
  }

  const handleLogout = async () => {
    const result = await Swal.fire({
      icon: 'question', title: 'Keluar dari Akun?',
      text: 'Kamu akan keluar dari sesi admin ini.',
      showCancelButton: true,
      confirmButtonColor: '#ef4444', cancelButtonColor: '#e5e7eb',
      confirmButtonText: 'Ya, Keluar', cancelButtonText: 'Batal',
      customClass: { popup: 'rounded-2xl', cancelButton: '!text-gray-700' },
    })
    if (!result.isConfirmed) return
    await supabase.auth.signOut()
    window.location.href = '/login'
  }

  const filtered = customers.filter(c => {
    const matchSearch =
      c.full_name?.toLowerCase().includes(search.toLowerCase()) ||
      c.phone?.includes(search)
    const isActive = (orderStats[c.id]?.count || 0) > 0
    const matchStatus = !filterStatus ? true
      : filterStatus === 'aktif' ? isActive
      : filterStatus === 'nonaktif' ? !isActive
      : true
    return matchSearch && matchStatus
  })

  const totalPages = Math.ceil(filtered.length / perPage)
  const paginated = filtered.slice((page - 1) * perPage, page * perPage)
  const adminName = profile?.full_name || 'Admin'

  const totalCustomers = customers.length
  const activeCustomers = customers.filter(c => (orderStats[c.id]?.count || 0) > 0).length
  const thisMonth = new Date(); thisMonth.setDate(1)
  const newCustomers = customers.filter(c => new Date(c.created_at) >= thisMonth).length
  const inactiveCustomers = customers.filter(c => (orderStats[c.id]?.count || 0) === 0).length

  const getPaginationPages = () => {
    if (totalPages <= 5) return [...Array(totalPages)].map((_, i) => i + 1)
    if (page <= 3) return [1, 2, 3, '...', totalPages]
    if (page >= totalPages - 2) return [1, '...', totalPages - 2, totalPages - 1, totalPages]
    return [1, '...', page - 1, page, page + 1, '...', totalPages]
  }

  const statusMap = {
    pending:    { label: 'Menunggu',     color: 'bg-yellow-100 text-yellow-700' },
    confirmed:  { label: 'Dikonfirmasi', color: 'bg-blue-100 text-blue-700' },
    processing: { label: 'Diproses',     color: 'bg-orange-100 text-orange-600' },
    delivered:  { label: 'Dikirim',      color: 'bg-purple-100 text-purple-600' },
    done:       { label: 'Selesai',      color: 'bg-green-100 text-green-700' },
    cancelled:  { label: 'Dibatalkan',   color: 'bg-red-100 text-red-600' },
  }

  return (
    <div className="flex min-h-screen bg-gray-50">
      <AdminSidebar />
      <div className="flex-1 ml-56">

        {/* TOPBAR */}
        <header className="bg-white border-b border-gray-100 px-8 py-4 flex items-center gap-4 sticky top-0 z-10">
          <div className="flex-1 max-w-md">
            <div className="relative">
              <MagnifyingGlassIcon className="w-5 h-5 text-gray-300 absolute left-3 top-1/2 -translate-y-1/2" />
              <input value={search} onChange={e => { setSearch(e.target.value); setPage(1) }}
                placeholder="Cari pelanggan..."
                className="w-full bg-gray-50 border border-gray-100 rounded-xl pl-10 pr-4 py-2.5 text-sm outline-none focus:border-orange-300 transition" />
            </div>
          </div>
          <div className="ml-auto flex items-center gap-4">
            <AdminNotifBell />
            <div className="relative" ref={adminDropRef}>
              <button onClick={() => setAdminDropdown(prev => !prev)}
                className="flex items-center gap-3 pl-4 border-l border-gray-100 hover:bg-gray-50 px-3 py-2 rounded-xl transition">
                <div className="w-9 h-9 bg-orange-100 rounded-full flex items-center justify-center font-bold text-orange-500 text-sm">
                  {adminName[0].toUpperCase()}
                </div>
                <div className="text-left">
                  <p className="text-sm font-semibold text-gray-800">{adminName.split(' ')[0]}</p>
                  <p className="text-xs text-gray-400">Super Administrator</p>
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
            <h1 className="text-2xl font-bold text-gray-800 tracking-tight">Pelanggan</h1>
            <p className="text-gray-400 text-sm mt-1">Kelola semua data pelanggan yang terdaftar.</p>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-4 gap-4 mb-6">
            {[
              { label: 'Total Pelanggan', value: totalCustomers, sub: `+${newCustomers} dari bulan lalu`, subUp: true, bg: 'bg-blue-50', iconBg: 'bg-blue-100', icon: <UserGroupIcon className="w-6 h-6 text-blue-500" /> },
              { label: 'Pelanggan Aktif', value: activeCustomers, sub: `${activeCustomers} sudah pernah pesan`, subUp: true, bg: 'bg-green-50', iconBg: 'bg-green-100', icon: <CheckCircleIcon className="w-6 h-6 text-green-500" /> },
              { label: 'Pelanggan Baru', value: newCustomers, sub: 'bergabung bulan ini', subUp: true, bg: 'bg-orange-50', iconBg: 'bg-orange-100', icon: <UserPlusIcon className="w-6 h-6 text-orange-500" /> },
              { label: 'Pelanggan Nonaktif', value: inactiveCustomers, sub: 'belum pernah pesan', subUp: false, bg: 'bg-red-50', iconBg: 'bg-red-100', icon: <UserIcon className="w-6 h-6 text-red-400" /> },
            ].map((stat, i) => (
              <div key={i} className={`${stat.bg} rounded-2xl p-5 flex items-center gap-4`}>
                <div className={`${stat.iconBg} w-14 h-14 rounded-2xl flex items-center justify-center flex-shrink-0`}>
                  {stat.icon}
                </div>
                <div>
                  <p className="text-xs text-gray-500 font-medium mb-0.5">{stat.label}</p>
                  <p className="text-3xl font-black text-gray-900">{stat.value}</p>
                  <p className={`text-xs font-medium mt-0.5 ${stat.subUp ? 'text-green-500' : 'text-red-400'}`}>
                    {stat.sub}
                  </p>
                </div>
              </div>
            ))}
          </div>

          {/* Filter */}
          <div className="flex gap-3 mb-6 items-center">
            <div className="relative max-w-xs flex-1">
              <MagnifyingGlassIcon className="w-4 h-4 text-gray-300 absolute left-3 top-1/2 -translate-y-1/2" />
              <input value={search} onChange={e => { setSearch(e.target.value); setPage(1) }}
                placeholder="Cari pelanggan..."
                className="w-full bg-white border border-gray-200 rounded-xl pl-9 pr-4 py-2.5 text-sm outline-none focus:border-orange-300 shadow-sm" />
            </div>
            <div className="relative">
              <select value={filterStatus} onChange={e => { setFilterStatus(e.target.value); setPage(1) }}
                className="appearance-none bg-white border border-gray-200 rounded-xl pl-4 pr-9 py-2.5 text-sm outline-none shadow-sm cursor-pointer">
                <option value="">Semua Status</option>
                <option value="aktif">Aktif</option>
                <option value="nonaktif">Nonaktif</option>
              </select>
              <ChevronDownIcon className="w-4 h-4 text-gray-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
            <div className="relative">
              <CalendarIcon className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input type="date"
                className="bg-white border border-gray-200 rounded-xl pl-9 pr-4 py-2.5 text-sm outline-none shadow-sm text-gray-500" />
            </div>
            <button onClick={() => setShowExportModal(true)}
              className="ml-auto flex items-center gap-2 bg-orange-500 text-white px-5 py-2.5 rounded-xl font-semibold text-sm hover:bg-orange-600 transition shadow-sm shadow-orange-200">
              <ArrowDownTrayIcon className="w-4 h-4" />
              Export
            </button>
          </div>

          {/* Table */}
          <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-50 text-left">
                  <th className="px-6 py-4 text-xs font-semibold text-gray-400 w-10">No</th>
                  <th className="px-4 py-4 text-xs font-semibold text-gray-400">Pelanggan</th>
                  <th className="px-4 py-4 text-xs font-semibold text-gray-400">Email</th>
                  <th className="px-4 py-4 text-xs font-semibold text-gray-400">No. Telepon</th>
                  <th className="px-4 py-4 text-xs font-semibold text-gray-400">Total Pesanan</th>
                  <th className="px-4 py-4 text-xs font-semibold text-gray-400">Total Belanja</th>
                  <th className="px-4 py-4 text-xs font-semibold text-gray-400">Status</th>
                  <th className="px-4 py-4 text-xs font-semibold text-gray-400">Bergabung</th>
                  <th className="px-4 py-4 text-xs font-semibold text-gray-400">Aksi</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  [...Array(6)].map((_, i) => (
                    <tr key={i} className="border-b border-gray-50">
                      <td colSpan={9} className="px-6 py-4">
                        <div className="h-12 bg-gray-100 rounded-xl animate-pulse" />
                      </td>
                    </tr>
                  ))
                ) : paginated.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="text-center py-14 text-gray-400">
                      <UserGroupIcon className="w-12 h-12 mx-auto mb-3 text-gray-200" />
                      <p className="font-medium text-gray-600 mb-1">Tidak ada pelanggan ditemukan</p>
                      <p className="text-sm">Coba ubah kata kunci pencarian</p>
                    </td>
                  </tr>
                ) : paginated.map((customer, idx) => {
                  const stats = orderStats[customer.id] || { count: 0, total: 0 }
                  const isActive = stats.count > 0
                  const joinDate = new Date(customer.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })
                  const name = customer.full_name || 'Pengguna'
                  return (
                    <tr key={customer.id} className="border-b border-gray-50 hover:bg-gray-50/50 transition">
                      <td className="px-6 py-4 text-sm text-gray-400">{(page-1)*perPage+idx+1}</td>
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full overflow-hidden bg-orange-100 flex-shrink-0 flex items-center justify-center">
                            {customer.avatar_url
                              ? <img src={customer.avatar_url} alt={name} className="w-full h-full object-cover" />
                              : <span className="font-bold text-orange-500 text-sm">{name[0].toUpperCase()}</span>
                            }
                          </div>
                          <div>
                            <p className="font-semibold text-gray-800 text-sm">{name}</p>
                            <p className="text-gray-400 text-xs">{customer.phone || '-'}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <p className="text-sm text-gray-500">—</p>
                      </td>
                      <td className="px-4 py-4">
                        <p className="text-sm text-gray-600">{customer.phone || '-'}</p>
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-1.5">
                          <ShoppingBagIcon className="w-4 h-4 text-gray-300" />
                          <span className="text-sm font-semibold text-gray-700">{stats.count}</span>
                          <span className="text-gray-400 text-sm">Pesanan</span>
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <span className="text-sm font-bold text-gray-800">Rp {stats.total.toLocaleString('id-ID')}</span>
                      </td>
                      <td className="px-4 py-4">
                        <span className={`text-xs px-3 py-1.5 rounded-full font-medium ${isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                          {isActive ? 'Aktif' : 'Nonaktif'}
                        </span>
                      </td>
                      <td className="px-4 py-4">
                        <p className="text-sm text-gray-500">{joinDate}</p>
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-1.5">
                          <button onClick={() => handleViewDetail(customer)} title="Lihat Detail"
                            className="w-8 h-8 border border-gray-200 rounded-lg flex items-center justify-center hover:bg-blue-50 hover:border-blue-300 hover:text-blue-500 transition">
                            <EyeIcon className="w-4 h-4" />
                          </button>
                          <button onClick={() => handleDeleteCustomer(customer.id, customer.full_name)} title="Hapus"
                            className="w-8 h-8 border border-gray-200 rounded-lg flex items-center justify-center hover:bg-red-50 hover:border-red-300 hover:text-red-500 transition">
                            <TrashIcon className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>

            <div className="flex items-center justify-between px-6 py-4 border-t border-gray-50">
              <p className="text-sm text-gray-400">
                Menampilkan {filtered.length===0?0:(page-1)*perPage+1} - {Math.min(page*perPage,filtered.length)} dari {filtered.length} pelanggan
              </p>
              <div className="flex items-center gap-1">
                <button onClick={() => setPage(p=>Math.max(1,p-1))} disabled={page===1}
                  className="w-8 h-8 rounded-lg border border-gray-200 flex items-center justify-center hover:bg-gray-50 disabled:opacity-40 transition">
                  <ChevronLeftIcon className="w-4 h-4" />
                </button>
                {getPaginationPages().map((p,i) => p==='...'
                  ? <span key={`d${i}`} className="w-8 h-8 flex items-center justify-center text-gray-400 text-sm">…</span>
                  : <button key={p} onClick={()=>setPage(p)}
                      className={`w-8 h-8 rounded-lg text-sm font-medium transition ${page===p?'bg-orange-500 text-white':'border border-gray-200 hover:bg-gray-50'}`}>
                      {p}
                    </button>
                )}
                <button onClick={() => setPage(p=>Math.min(totalPages,p+1))} disabled={page>=totalPages}
                  className="w-8 h-8 rounded-lg border border-gray-200 flex items-center justify-center hover:bg-gray-50 disabled:opacity-40 transition">
                  <ChevronRightIcon className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </main>
      </div>

      {/* DETAIL PANEL */}
      {showDetail && selectedCustomer && (
        <div className="fixed inset-0 z-50 flex">
          <div className="flex-1 bg-black/30" onClick={() => setShowDetail(false)} />
          <div className="w-[480px] bg-white h-full overflow-y-auto shadow-2xl">
            <div className="flex justify-between items-center px-6 py-5 border-b border-gray-100 sticky top-0 bg-white z-10">
              <div>
                <h2 className="font-bold text-gray-900">Detail Pelanggan</h2>
                <p className="text-xs text-gray-400 mt-0.5">Informasi lengkap akun pelanggan</p>
              </div>
              <button onClick={() => setShowDetail(false)}
                className="w-8 h-8 rounded-lg hover:bg-gray-100 flex items-center justify-center transition">
                <XMarkIcon className="w-5 h-5 text-gray-500" />
              </button>
            </div>
            <div className="p-6">
              <div className="flex items-center gap-4 mb-6 bg-orange-50 rounded-2xl p-5">
                <div className="w-16 h-16 rounded-full overflow-hidden bg-orange-100 flex-shrink-0 flex items-center justify-center">
                  {selectedCustomer.avatar_url
                    ? <img src={selectedCustomer.avatar_url} alt={selectedCustomer.full_name} className="w-full h-full object-cover" />
                    : <span className="text-2xl font-black text-orange-500">{(selectedCustomer.full_name||'U')[0].toUpperCase()}</span>
                  }
                </div>
                <div>
                  <h3 className="font-bold text-gray-900 text-lg">{selectedCustomer.full_name || 'Pengguna'}</h3>
                  <p className="text-sm text-gray-500">{selectedCustomer.phone || '-'}</p>
                  <div className="flex items-center gap-2 mt-1.5">
                    <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${
                      (orderStats[selectedCustomer.id]?.count||0)>0 ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
                    }`}>
                      {(orderStats[selectedCustomer.id]?.count||0)>0 ? 'Pelanggan Aktif' : 'Belum Pernah Pesan'}
                    </span>
                    <span className="text-xs text-gray-400">
                      Bergabung {new Date(selectedCustomer.created_at).toLocaleDateString('id-ID',{day:'numeric',month:'long',year:'numeric'})}
                    </span>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 mb-6">
                <div className="bg-blue-50 rounded-xl p-4 text-center">
                  <p className="text-2xl font-black text-blue-600">{orderStats[selectedCustomer.id]?.count||0}</p>
                  <p className="text-xs text-gray-500 mt-1">Total Pesanan</p>
                </div>
                <div className="bg-green-50 rounded-xl p-4 text-center">
                  <p className="text-xl font-black text-green-600">Rp {(orderStats[selectedCustomer.id]?.total||0).toLocaleString('id-ID')}</p>
                  <p className="text-xs text-gray-500 mt-1">Total Belanja</p>
                </div>
              </div>

              <div className="bg-white border border-gray-100 rounded-2xl p-5 mb-5">
                <h4 className="font-bold text-gray-800 mb-4">Informasi Pribadi</h4>
                <div className="space-y-3">
                  {[
                    { label: 'Nama Lengkap', value: selectedCustomer.full_name||'-' },
                    { label: 'No. Telepon', value: selectedCustomer.phone||'-' },
                    { label: 'Tanggal Lahir', value: selectedCustomer.birth_date ? new Date(selectedCustomer.birth_date).toLocaleDateString('id-ID',{day:'numeric',month:'long',year:'numeric'}) : '-' },
                    { label: 'Jenis Kelamin', value: selectedCustomer.gender||'-' },
                    { label: 'Pekerjaan', value: selectedCustomer.job||'-' },
                    { label: 'Alamat', value: selectedCustomer.address||'-' },
                  ].map((item, i) => (
                    <div key={i} className="flex justify-between items-start py-2 border-b border-gray-50 last:border-0">
                      <span className="text-sm text-gray-400 w-32 flex-shrink-0">{item.label}</span>
                      <span className="text-sm text-gray-700 font-medium text-right flex-1">{item.value}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-white border border-gray-100 rounded-2xl p-5 mb-5">
                <h4 className="font-bold text-gray-800 mb-4">Pesanan Terbaru</h4>
                {loadingOrders ? (
                  <div className="space-y-3">{[...Array(3)].map((_,i)=><div key={i} className="h-12 bg-gray-100 rounded-xl animate-pulse"/>)}</div>
                ) : customerOrders.length===0 ? (
                  <p className="text-center text-gray-400 text-sm py-4">Belum ada pesanan</p>
                ) : customerOrders.map(order => {
                  const status = statusMap[order.status]||{label:'-',color:'bg-gray-100 text-gray-500'}
                  return (
                    <div key={order.id} className="flex items-center justify-between py-2.5 border-b border-gray-50 last:border-0">
                      <div>
                        <p className="text-sm font-semibold text-gray-800">#{order.id.slice(0,8).toUpperCase()}</p>
                        <p className="text-xs text-gray-400">{new Date(order.created_at).toLocaleDateString('id-ID',{day:'numeric',month:'short',year:'numeric'})}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-bold text-orange-500">Rp {order.total?.toLocaleString('id-ID')}</p>
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${status.color}`}>{status.label}</span>
                      </div>
                    </div>
                  )
                })}
              </div>

              <button onClick={() => handleDeleteCustomer(selectedCustomer.id, selectedCustomer.full_name)}
                className="w-full border border-red-300 text-red-500 py-3 rounded-xl font-semibold text-sm hover:bg-red-50 transition flex items-center justify-center gap-2">
                <TrashIcon className="w-4 h-4" />
                Hapus Akun Pelanggan
              </button>
            </div>
          </div>
        </div>
      )}

      {/* EXPORT MODAL */}
      {showExportModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40" onClick={() => setShowExportModal(false)} />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6">
            <div className="flex justify-between items-center mb-5">
              <h2 className="font-bold text-gray-900">Export Data Pelanggan</h2>
              <button onClick={() => setShowExportModal(false)}
                className="w-8 h-8 rounded-lg hover:bg-gray-100 flex items-center justify-center">
                <XMarkIcon className="w-5 h-5 text-gray-500" />
              </button>
            </div>
            <p className="text-sm text-gray-500 mb-5">
              Pilih format export untuk <span className="font-semibold text-gray-700">{filtered.length} pelanggan</span>.
            </p>
            <div className="flex gap-3 mb-6">
              {[
                { key: 'excel', label: 'Excel (.xlsx)', icon: '📊' },
                { key: 'pdf',   label: 'PDF (.pdf)',    icon: '📄' },
              ].map(fmt => (
                <button key={fmt.key} onClick={() => setExportFormat(fmt.key)}
                  className={`flex-1 flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition ${
                    exportFormat===fmt.key ? 'border-orange-500 bg-orange-50' : 'border-gray-200 hover:border-orange-200'
                  }`}>
                  <span className="text-2xl">{fmt.icon}</span>
                  <span className="text-sm font-semibold text-gray-700">{fmt.label}</span>
                </button>
              ))}
            </div>
            <div className="flex gap-3">
              <button onClick={() => setShowExportModal(false)}
                className="flex-1 border border-gray-200 text-gray-600 py-3 rounded-xl font-semibold text-sm hover:bg-gray-50 transition">
                Batal
              </button>
              <button onClick={exportFormat==='excel' ? handleExportExcel : handleExportPDF}
                className="flex-1 bg-orange-500 text-white py-3 rounded-xl font-semibold text-sm hover:bg-orange-600 transition flex items-center justify-center gap-2">
                <ArrowDownTrayIcon className="w-4 h-4" />
                Export {exportFormat==='excel' ? 'Excel' : 'PDF'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}