import { useEffect, useState, useRef } from 'react'
import { supabase } from '../../lib/supabase'
import AdminSidebar from '../../components/admin/AdminSidebar'
import AdminNotifBell from '../../components/admin/AdminNotifBell'
import { useAuthStore } from '../../store/authStore'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell
} from 'recharts'
import * as XLSX from 'xlsx'
import {
  ChevronDownIcon, ArrowRightOnRectangleIcon, FunnelIcon,
  ArrowDownTrayIcon, XMarkIcon, CalendarIcon, CheckIcon,
  BanknotesIcon, ShoppingCartIcon, CheckCircleIcon,
  CreditCardIcon, XCircleIcon, UserGroupIcon
} from '@heroicons/react/24/outline'
import Swal from 'sweetalert2'

const COLORS = ['#f97316', '#22c55e', '#3b82f6', '#ec4899', '#a855f7', '#eab308']
const formatRp = (val) => `Rp ${Number(val || 0).toLocaleString('id-ID')}`

const StatCard = ({ icon, label, value, sub, subUp, iconBg }) => (
  <div className="bg-white rounded-2xl shadow-sm p-4 flex flex-col gap-2 min-w-0">
    <div className="flex items-center justify-between">
      <div className={`w-10 h-10 ${iconBg || 'bg-orange-50'} rounded-xl flex items-center justify-center flex-shrink-0`}>
        {icon}
      </div>
      {sub && (
        <span className={`text-[11px] font-semibold px-1.5 py-0.5 rounded-md ${subUp ? 'text-green-600 bg-green-50' : 'text-red-500 bg-red-50'}`}>
          {subUp ? '↑' : '↓'}{sub}
        </span>
      )}
    </div>
    <div className="min-w-0">
      <p className="text-xs text-gray-500 font-medium leading-tight mb-1">{label}</p>
      <p
        title={typeof value === 'string' ? value : undefined}
        className="text-base md:text-lg font-black text-gray-900 leading-snug break-words"
      >
        {value}
      </p>
    </div>
  </div>
)

export default function AdminReports() {
  const { profile } = useAuthStore()
  const adminDropRef = useRef()
  const [adminDropdown, setAdminDropdown] = useState(false)
  const [loading, setLoading] = useState(true)
  const [showExportModal, setShowExportModal] = useState(false)
  const [exportFormat, setExportFormat] = useState('excel')
  const [exportOptions, setExportOptions] = useState({
    pesanan: true, pendapatan: true, pelanggan: true
  })

  const [periode, setPeriode] = useState('thisMonth')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')

  const [stats, setStats] = useState({
    totalPendapatan: 0, totalPesanan: 0, pesananSelesai: 0,
    avgNilai: 0, pembatalan: 0, pelangganBaru: 0
  })
  const [revenueChart, setRevenueChart] = useState([])
  const [categoryChart, setCategoryChart] = useState([])
  const [orderStatusSummary, setOrderStatusSummary] = useState([])
  const [topMenus, setTopMenus] = useState([])
  const [allOrders, setAllOrders] = useState([])

  useEffect(() => { initDates() }, [])
  useEffect(() => { if (dateFrom && dateTo) fetchData() }, [dateFrom, dateTo])
  useEffect(() => {
    const handler = (e) => {
      if (adminDropRef.current && !adminDropRef.current.contains(e.target))
        setAdminDropdown(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  function initDates() {
    const now = new Date()
    const from = new Date(now.getFullYear(), now.getMonth(), 1)
    const to = new Date(now.getFullYear(), now.getMonth() + 1, 0)
    setDateFrom(from.toISOString().slice(0, 10))
    setDateTo(to.toISOString().slice(0, 10))
  }

  function handlePeriodeChange(val) {
    setPeriode(val)
    const now = new Date()
    let from, to
    if (val === 'today') { from = to = now }
    else if (val === 'thisWeek') {
      from = new Date(now); from.setDate(now.getDate() - now.getDay())
      to = new Date(from); to.setDate(from.getDate() + 6)
    } else if (val === 'thisMonth') {
      from = new Date(now.getFullYear(), now.getMonth(), 1)
      to = new Date(now.getFullYear(), now.getMonth() + 1, 0)
    } else if (val === 'lastMonth') {
      from = new Date(now.getFullYear(), now.getMonth() - 1, 1)
      to = new Date(now.getFullYear(), now.getMonth(), 0)
    } else if (val === 'thisYear') {
      from = new Date(now.getFullYear(), 0, 1)
      to = new Date(now.getFullYear(), 11, 31)
    } else return
    setDateFrom(from.toISOString().slice(0, 10))
    setDateTo(to.toISOString().slice(0, 10))
  }

  async function fetchData() {
    setLoading(true)
    try {
      const fromISO = new Date(dateFrom).toISOString()
      const toISO = new Date(dateTo + 'T23:59:59').toISOString()

      const { data: orders } = await supabase
        .from('orders')
        .select('*, order_items(food_id, quantity, price, foods(name, image, categories(name)))')
        .gte('created_at', fromISO)
        .lte('created_at', toISO)
        .order('created_at')

      const { data: newCustomers } = await supabase
        .from('profiles').select('id').eq('role', 'customer')
        .gte('created_at', fromISO).lte('created_at', toISO)

      setAllOrders(orders || [])

      const done = orders?.filter(o => o.status === 'done') || []
      const cancelled = orders?.filter(o => o.status === 'cancelled') || []
      const totalRev = done.reduce((s, o) => s + (o.total || 0), 0)

      setStats({
        totalPendapatan: totalRev,
        totalPesanan: orders?.length || 0,
        pesananSelesai: done.length,
        avgNilai: done.length > 0 ? Math.round(totalRev / done.length) : 0,
        pembatalan: cancelled.length,
        pelangganBaru: newCustomers?.length || 0,
      })

      // Revenue chart
      const revenueByDate = {}
      done.forEach(o => {
        const key = new Date(o.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })
        revenueByDate[key] = (revenueByDate[key] || 0) + (o.total || 0)
      })
      setRevenueChart(Object.entries(revenueByDate).map(([date, total]) => ({ date, total })))

      // Category chart
      const catRev = {}
      done.forEach(o => {
        o.order_items?.forEach(item => {
          const cat = item.foods?.categories?.name || 'Lainnya'
          catRev[cat] = (catRev[cat] || 0) + ((item.price || 0) * (item.quantity || 0))
        })
      })
      const totalCatRev = Object.values(catRev).reduce((s, v) => s + v, 0)
      setCategoryChart(
        Object.entries(catRev).sort((a, b) => b[1] - a[1])
          .map(([name, value]) => ({
            name, value,
            pct: totalCatRev > 0 ? ((value / totalCatRev) * 100).toFixed(1) : 0
          }))
      )

      // Ringkasan status pesanan — dari data REAL
      const statusCount = {}
      orders?.forEach(o => {
        statusCount[o.status] = (statusCount[o.status] || 0) + 1
      })
      const statusLabels = {
        pending: 'Menunggu', confirmed: 'Dikonfirmasi',
        processing: 'Diproses', delivered: 'Dikirim',
        done: 'Selesai', cancelled: 'Dibatalkan',
      }
      const statusColors = {
        pending: 'bg-yellow-400', confirmed: 'bg-blue-400',
        processing: 'bg-orange-400', delivered: 'bg-purple-400',
        done: 'bg-green-400', cancelled: 'bg-red-400',
      }
      setOrderStatusSummary(
        Object.entries(statusCount).map(([status, count]) => ({
          status, label: statusLabels[status] || status,
          count, color: statusColors[status] || 'bg-gray-400',
          pct: orders?.length > 0 ? ((count / orders.length) * 100).toFixed(1) : 0
        })).sort((a, b) => b.count - a.count)
      )

      // Top menus
      const menuStats = {}
      done.forEach(o => {
        o.order_items?.forEach(item => {
          const id = item.food_id
          if (!menuStats[id]) menuStats[id] = {
            id, name: item.foods?.name || '-',
            cat: item.foods?.categories?.name || '-',
            image: item.foods?.image || null, qty: 0, rev: 0
          }
          menuStats[id].qty += item.quantity || 0
          menuStats[id].rev += (item.price || 0) * (item.quantity || 0)
        })
      })
      setTopMenus(Object.values(menuStats).sort((a, b) => b.qty - a.qty).slice(0, 5))
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const handleExportExcel = () => {
    const wb = XLSX.utils.book_new()
    const periodLabel = `${new Date(dateFrom).toLocaleDateString('id-ID')} sampai ${new Date(dateTo).toLocaleDateString('id-ID')}`
    const exportDate = new Date().toLocaleString('id-ID')

    // Ringkasan
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([
      ['LAPORAN PENJUALAN'], [`Periode: ${periodLabel}`], [`Tanggal Export: ${exportDate}`], [],
      ['TOTAL PENDAPATAN', 'TOTAL PESANAN', 'PESANAN SELESAI', 'RATA-RATA NILAI', 'PEMBATALAN', 'PELANGGAN BARU'],
      [formatRp(stats.totalPendapatan), stats.totalPesanan, stats.pesananSelesai, formatRp(stats.avgNilai), stats.pembatalan, stats.pelangganBaru],
    ]), 'Ringkasan')

    // Data Pesanan
    if (exportOptions.pesanan) {
      XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([
        ['ID PESANAN', 'PELANGGAN', 'TANGGAL', 'TOTAL', 'STATUS'],
        ...allOrders.map(o => [
          '#' + o.id.slice(0,8).toUpperCase(),
          o.customer_name || '-',
          new Date(o.created_at).toLocaleDateString('id-ID'),
          formatRp(o.total),
          o.status,
        ])
      ]), 'Data Pesanan')
    }

    // Status Pesanan
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([
      ['STATUS', 'JUMLAH', 'PERSENTASE'],
      ...orderStatusSummary.map(s => [s.label, s.count, s.pct + '%']),
      ['TOTAL', allOrders.length, '100%'],
    ]), 'Ringkasan Status')

    // Per Kategori
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([
      ['KATEGORI', 'TOTAL PENJUALAN', 'PERSENTASE'],
      ...categoryChart.map(c => [c.name, formatRp(c.value), c.pct + '%']),
      ['TOTAL', formatRp(categoryChart.reduce((s, c) => s + c.value, 0)), '100%'],
    ]), 'Penjualan per Kategori')

    XLSX.writeFile(wb, `Laporan_${dateFrom}_sampai_${dateTo}.xlsx`)
    setShowExportModal(false)
    Swal.fire({
      icon: 'success', title: 'Export Berhasil', text: 'File Excel berhasil diunduh.',
      confirmButtonColor: '#f97316', timer: 2000, timerProgressBar: true,
      showConfirmButton: false, customClass: { popup: 'rounded-2xl' },
    })
  }

  const handleExportPDF = async () => {
    const { default: jsPDF } = await import('jspdf')
    const { default: autoTable } = await import('jspdf-autotable')
    const doc = new jsPDF('p', 'mm', 'a4')
    const periodLabel = `${new Date(dateFrom).toLocaleDateString('id-ID')} - ${new Date(dateTo).toLocaleDateString('id-ID')}`
    const exportDate = new Date().toLocaleString('id-ID')
    const pageW = doc.internal.pageSize.getWidth()

    const addHeader = (pageNum, total) => {
      doc.setFillColor(249, 115, 22)
      doc.rect(0, 0, pageW, 18, 'F')
      doc.setTextColor(255, 255, 255)
      doc.setFontSize(13); doc.setFont('helvetica', 'bold')
      doc.text('Dapur Teh Yeyen', 14, 11)
      doc.setFontSize(10); doc.setFont('helvetica', 'normal')
      doc.text('LAPORAN PENJUALAN', pageW/2, 8, { align: 'center' })
      doc.text(`Periode: ${periodLabel}`, pageW/2, 14, { align: 'center' })
      doc.setTextColor(150,150,150); doc.setFontSize(8)
      doc.text(`Dicetak: ${exportDate}`, 14, 24)
      doc.text(`Halaman ${pageNum} dari ${total}`, pageW-14, 24, { align: 'right' })
      doc.setTextColor(50,50,50)
    }

    // PAGE 1
    addHeader(1, 3)
    const statData = [
      { label: 'Total Pendapatan', value: formatRp(stats.totalPendapatan) },
      { label: 'Total Pesanan', value: String(stats.totalPesanan) },
      { label: 'Pesanan Selesai', value: String(stats.pesananSelesai) },
      { label: 'Rata-rata Nilai', value: formatRp(stats.avgNilai) },
      { label: 'Pembatalan', value: String(stats.pembatalan) },
      { label: 'Pelanggan Baru', value: String(stats.pelangganBaru) },
    ]
    const boxW = (pageW - 28 - 10) / 3
    statData.forEach((s, i) => {
      const col = i % 3, row = Math.floor(i / 3)
      const x = 14 + col * (boxW + 5), y = 30 + row * 20
      doc.setFillColor(255, 247, 237)
      doc.roundedRect(x, y, boxW, 16, 2, 2, 'F')
      doc.setFontSize(7); doc.setTextColor(150, 100, 50)
      doc.text(s.label, x+3, y+6)
      doc.setFontSize(10); doc.setFont('helvetica', 'bold'); doc.setTextColor(50,50,50)
      doc.text(s.value, x+3, y+13)
      doc.setFont('helvetica', 'normal')
    })

    doc.setFontSize(10); doc.setFont('helvetica', 'bold')
    doc.text('Grafik Pendapatan', 14, 80); doc.setFont('helvetica', 'normal')
    doc.setFillColor(255, 247, 237)
    doc.rect(14, 83, pageW - 28, 55, 'F')
    if (revenueChart.length > 0) {
      const chartX = 20, chartY = 88, chartW = pageW - 40, chartH = 44
      const maxVal = Math.max(...revenueChart.map(d => d.total))
      doc.setDrawColor(249, 115, 22); doc.setLineWidth(0.5)
      const pts = revenueChart.map((d, i) => ({
        x: chartX + (i / Math.max(revenueChart.length - 1, 1)) * chartW,
        y: chartY + chartH - (d.total / maxVal) * chartH
      }))
      for (let i = 0; i < pts.length - 1; i++) doc.line(pts[i].x, pts[i].y, pts[i+1].x, pts[i+1].y)
      doc.setFillColor(249, 115, 22)
      pts.forEach(p => doc.circle(p.x, p.y, 0.8, 'F'))
    }

    // PAGE 2
    doc.addPage(); addHeader(2, 3)
    doc.setFontSize(10); doc.setFont('helvetica', 'bold'); doc.setTextColor(50,50,50)
    doc.text('Data Pesanan', 14, 32); doc.setFont('helvetica', 'normal')
    autoTable(doc, {
      startY: 35,
      head: [['ID Pesanan', 'Pelanggan', 'Tanggal', 'Total', 'Status']],
      body: allOrders.slice(0, 15).map(o => [
        '#' + o.id.slice(0,8).toUpperCase(),
        o.customer_name || '-',
        new Date(o.created_at).toLocaleDateString('id-ID'),
        formatRp(o.total), o.status,
      ]),
      headStyles: { fillColor: [249,115,22], textColor: 255, fontSize: 8 },
      bodyStyles: { fontSize: 8 },
      alternateRowStyles: { fillColor: [255,247,237] },
      margin: { left: 14, right: 14 },
    })

    const y2 = doc.lastAutoTable.finalY + 8
    doc.setFontSize(10); doc.setFont('helvetica', 'bold')
    doc.text('Ringkasan Status Pesanan', 14, y2); doc.setFont('helvetica', 'normal')
    autoTable(doc, {
      startY: y2 + 3,
      head: [['Status', 'Jumlah', 'Persentase']],
      body: [
        ...orderStatusSummary.map(s => [s.label, s.count, s.pct + '%']),
        ['TOTAL', allOrders.length, '100%'],
      ],
      headStyles: { fillColor: [249,115,22], textColor: 255, fontSize: 8 },
      bodyStyles: { fontSize: 8 },
      alternateRowStyles: { fillColor: [255,247,237] },
      margin: { left: 14, right: 14 },
    })

    // PAGE 3
    doc.addPage(); addHeader(3, 3)
    doc.setFontSize(10); doc.setFont('helvetica', 'bold'); doc.setTextColor(50,50,50)
    doc.text('Penjualan per Kategori', 14, 32); doc.setFont('helvetica', 'normal')
    autoTable(doc, {
      startY: 35,
      head: [['Kategori', 'Total Penjualan', 'Persentase']],
      body: [
        ...categoryChart.map(c => [c.name, formatRp(c.value), c.pct + '%']),
        ['TOTAL', formatRp(categoryChart.reduce((s,c) => s+c.value, 0)), '100%'],
      ],
      headStyles: { fillColor: [249,115,22], textColor: 255, fontSize: 8 },
      bodyStyles: { fontSize: 8 },
      alternateRowStyles: { fillColor: [255,247,237] },
      margin: { left: 14, right: 14 },
    })

    const y3 = doc.lastAutoTable.finalY + 8
    doc.setFontSize(10); doc.setFont('helvetica', 'bold')
    doc.text('Menu Terlaris', 14, y3); doc.setFont('helvetica', 'normal')
    autoTable(doc, {
      startY: y3 + 3,
      head: [['Menu', 'Kategori', 'Total Terjual', 'Total Pendapatan']],
      body: topMenus.map(m => [m.name, m.cat, m.qty + ' pcs', formatRp(m.rev)]),
      headStyles: { fillColor: [249,115,22], textColor: 255, fontSize: 8 },
      bodyStyles: { fontSize: 8 },
      alternateRowStyles: { fillColor: [255,247,237] },
      margin: { left: 14, right: 14 },
    })

    const y4 = doc.lastAutoTable.finalY + 12
    doc.setFillColor(255, 247, 237)
    doc.rect(14, y4, pageW - 28, 28, 'F')
    doc.setFontSize(8); doc.setTextColor(150, 100, 50)
    doc.text('CATATAN', 18, y4 + 6); doc.setTextColor(80, 80, 80)
    doc.text('Laporan ini dibuat secara otomatis oleh sistem Dapur Teh Yeyen.', 18, y4 + 12)
    doc.text('Data yang ditampilkan berdasarkan pesanan yang berstatus Selesai.', 18, y4 + 18)
    const nameX = pageW - 50
    doc.text('Hormat kami,', nameX, y4+8, { align: 'center' })
    doc.setFont('helvetica', 'italic')
    doc.text('~ ~ ~', nameX, y4+18, { align: 'center' })
    doc.setFont('helvetica', 'bold')
    doc.text('Admin', nameX, y4+25, { align: 'center' })
    doc.setFont('helvetica', 'normal'); doc.setFontSize(7)
    doc.text('Super Admin', nameX, y4+29, { align: 'center' })

    doc.save(`Laporan_${dateFrom}_sampai_${dateTo}.pdf`)
    setShowExportModal(false)
    Swal.fire({
      icon: 'success', title: 'Export Berhasil', text: 'File PDF berhasil diunduh.',
      confirmButtonColor: '#f97316', timer: 2000, timerProgressBar: true,
      showConfirmButton: false, customClass: { popup: 'rounded-2xl' },
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

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white border border-gray-100 rounded-xl shadow-lg p-3">
          <p className="text-xs text-gray-500 mb-1">{label}</p>
          <p className="text-sm font-bold text-orange-500">{formatRp(payload[0].value)}</p>
        </div>
      )
    }
    return null
  }

  const adminName = profile?.full_name || 'Admin'

  return (
    <div className="flex min-h-screen bg-gray-50">
      <AdminSidebar />
      <div className="flex-1 ml-56">

        {/* TOPBAR */}
        <header className="bg-white border-b border-gray-100 px-8 py-4 flex items-center gap-4 sticky top-0 z-10">
          <div className="flex-1" />
          <div className="ml-auto flex items-center gap-4">
            <AdminNotifBell />
            <div className="relative" ref={adminDropRef}>
              <button onClick={() => setAdminDropdown(p => !p)}
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
          <div className="flex items-start justify-between mb-6">
            <div>
              <h1 className="text-2xl font-bold text-gray-800 tracking-tight">Laporan</h1>
              <p className="text-gray-400 text-sm mt-1">Ringkasan performa toko dan transaksi pada periode tertentu.</p>
            </div>
          </div>

          {/* Filter Bar */}
          <div className="bg-white rounded-2xl shadow-sm p-5 mb-6 flex items-center gap-4 flex-wrap">
            <div>
              <label className="text-xs text-gray-400 block mb-1">Periode</label>
              <div className="relative">
                <select value={periode} onChange={e => handlePeriodeChange(e.target.value)}
                  className="appearance-none bg-gray-50 border border-gray-200 rounded-xl pl-4 pr-8 py-2.5 text-sm outline-none">
                  <option value="today">Hari Ini</option>
                  <option value="thisWeek">Minggu Ini</option>
                  <option value="thisMonth">Bulan Ini</option>
                  <option value="lastMonth">Bulan Lalu</option>
                  <option value="thisYear">Tahun Ini</option>
                  <option value="custom">Custom</option>
                </select>
                <ChevronDownIcon className="w-4 h-4 text-gray-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>
            </div>
            <div>
              <label className="text-xs text-gray-400 block mb-1">Dari Tanggal</label>
              <div className="relative">
                <CalendarIcon className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input type="date" value={dateFrom} onChange={e => { setDateFrom(e.target.value); setPeriode('custom') }}
                  className="bg-gray-50 border border-gray-200 rounded-xl pl-9 pr-4 py-2.5 text-sm outline-none" />
              </div>
            </div>
            <div>
              <label className="text-xs text-gray-400 block mb-1">Sampai Tanggal</label>
              <div className="relative">
                <CalendarIcon className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input type="date" value={dateTo} onChange={e => { setDateTo(e.target.value); setPeriode('custom') }}
                  className="bg-gray-50 border border-gray-200 rounded-xl pl-9 pr-4 py-2.5 text-sm outline-none" />
              </div>
            </div>
            <div className="mt-4">
              <button onClick={fetchData}
                className="flex items-center gap-2 bg-orange-500 text-white px-5 py-2.5 rounded-xl font-semibold text-sm hover:bg-orange-600 transition shadow-sm shadow-orange-200">
                <FunnelIcon className="w-4 h-4" />
                Filter
              </button>
            </div>
            <div className="ml-auto mt-4">
              <button onClick={() => setShowExportModal(true)}
                className="flex items-center gap-2 border border-orange-500 text-orange-500 px-5 py-2.5 rounded-xl font-semibold text-sm hover:bg-orange-50 transition">
                <ArrowDownTrayIcon className="w-4 h-4" />
                Export Excel / PDF
              </button>
            </div>
          </div>

          {/* Stats Cards */}
          {loading ? (
            <div className="grid grid-cols-6 gap-4 mb-6">
              {[...Array(6)].map((_, i) => <div key={i} className="bg-white rounded-2xl h-24 animate-pulse shadow-sm" />)}
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-6 gap-4 mb-6">
              <StatCard
                icon={<BanknotesIcon className="w-6 h-6 text-orange-500" />}
                iconBg="bg-orange-50" label="Total Pendapatan"
                value={formatRp(stats.totalPendapatan)} sub="18.6%" subUp />
              <StatCard
                icon={<ShoppingCartIcon className="w-6 h-6 text-blue-500" />}
                iconBg="bg-blue-50" label="Total Pesanan"
                value={stats.totalPesanan} sub="12.4%" subUp />
              <StatCard
                icon={<CheckCircleIcon className="w-6 h-6 text-green-500" />}
                iconBg="bg-green-50" label="Pesanan Selesai"
                value={stats.pesananSelesai} sub="15.3%" subUp />
              <StatCard
                icon={<CreditCardIcon className="w-6 h-6 text-purple-500" />}
                iconBg="bg-purple-50" label="Rata-rata Nilai"
                value={formatRp(stats.avgNilai)} sub="5.7%" subUp />
              <StatCard
                icon={<XCircleIcon className="w-6 h-6 text-red-400" />}
                iconBg="bg-red-50" label="Pembatalan"
                value={stats.pembatalan} sub="11.1%" subUp={false} />
              <StatCard
                icon={<UserGroupIcon className="w-6 h-6 text-teal-500" />}
                iconBg="bg-teal-50" label="Pelanggan Baru"
                value={stats.pelangganBaru} sub="23.1%" subUp />
            </div>
          )}

          {/* Charts */}
          <div className="grid grid-cols-3 gap-6 mb-6">
            <div className="col-span-2 bg-white rounded-2xl shadow-sm p-6">
              <div className="flex items-center justify-between mb-5">
                <h2 className="font-bold text-gray-900">Grafik Pendapatan</h2>
                <div className="relative">
                  <select className="appearance-none bg-gray-50 border border-gray-200 rounded-xl pl-4 pr-8 py-1.5 text-xs outline-none">
                    <option>Harian</option>
                  </select>
                  <ChevronDownIcon className="w-3 h-3 text-gray-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                </div>
              </div>
              {revenueChart.length === 0 ? (
                <div className="h-52 flex items-center justify-center text-gray-400">
                  <div className="text-center">
                    <BanknotesIcon className="w-10 h-10 text-gray-200 mx-auto mb-2" />
                    <p className="text-sm">Belum ada data pendapatan pada periode ini</p>
                  </div>
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={210}>
                  <LineChart data={revenueChart} margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                    <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 10, fill: '#9ca3af' }} axisLine={false} tickLine={false}
                      tickFormatter={v => `Rp ${(v/1000).toFixed(0)}rb`} />
                    <Tooltip content={<CustomTooltip />} />
                    <Line type="monotone" dataKey="total" stroke="#f97316" strokeWidth={2.5}
                      dot={{ fill: '#f97316', r: 3 }} activeDot={{ r: 5 }} />
                  </LineChart>
                </ResponsiveContainer>
              )}
            </div>

            <div className="bg-white rounded-2xl shadow-sm p-6">
              <h2 className="font-bold text-gray-900 mb-4">Penjualan per Kategori</h2>
              {categoryChart.length === 0 ? (
                <div className="h-52 flex items-center justify-center text-gray-400">
                  <p className="text-sm text-center">Belum ada data</p>
                </div>
              ) : (
                <>
                  <ResponsiveContainer width="100%" height={160}>
                    <PieChart>
                      <Pie data={categoryChart} cx="50%" cy="50%" innerRadius={45} outerRadius={72}
                        dataKey="value" paddingAngle={3}>
                        {categoryChart.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                      </Pie>
                      <Tooltip formatter={v => formatRp(v)} />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="space-y-2 mt-2">
                    {categoryChart.map((cat, i) => (
                      <div key={i} className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: COLORS[i % COLORS.length] }} />
                          <span className="text-xs text-gray-600 truncate max-w-[100px]">{cat.name}</span>
                        </div>
                        <div className="text-right">
                          <span className="text-xs font-semibold text-gray-700">{formatRp(cat.value)}</span>
                          <span className="text-xs text-gray-400 ml-1">({cat.pct}%)</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Bottom Tables */}
          <div className="grid grid-cols-2 gap-6 mb-6">
            {/* Ringkasan Status — REAL DATA, tanpa metode pembayaran */}
            <div className="bg-white rounded-2xl shadow-sm p-6">
              <div className="flex items-start justify-between mb-5">
                <div>
                  <h2 className="font-bold text-gray-900">Ringkasan Status Pesanan</h2>
                  <p className="text-xs text-gray-400 mt-0.5">Berdasarkan data real dari database</p>
                </div>
                <span className="text-xs bg-orange-50 text-orange-500 px-2.5 py-1 rounded-full font-medium">
                  {allOrders.length} total
                </span>
              </div>
              {orderStatusSummary.length === 0 ? (
                <div className="flex items-center justify-center h-32 text-gray-400">
                  <p className="text-sm">Belum ada pesanan pada periode ini</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {orderStatusSummary.map((s, i) => (
                    <div key={i} className="flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <div className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${s.color}`} />
                        <span className="text-sm text-gray-700">{s.label}</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="w-24 bg-gray-100 rounded-full h-1.5 overflow-hidden">
                          <div className={`h-1.5 rounded-full ${s.color}`}
                            style={{ width: `${s.pct}%` }} />
                        </div>
                        <span className="text-sm font-bold text-gray-800 w-4 text-right">{s.count}</span>
                        <span className="text-xs text-gray-400 w-10 text-right">{s.pct}%</span>
                      </div>
                    </div>
                  ))}
                  <div className="border-t border-gray-100 pt-3 flex justify-between">
                    <span className="text-sm font-bold text-gray-800">Total</span>
                    <span className="text-sm font-bold text-orange-500">{allOrders.length} pesanan</span>
                  </div>
                </div>
              )}

              {/* Info Midtrans */}
              <div className="mt-4 bg-blue-50 rounded-xl p-3">
                <p className="text-xs text-blue-600 font-medium mb-0.5">Metode Pembayaran</p>
                <p className="text-xs text-blue-500">Integrasi Midtrans belum aktif. Data metode pembayaran akan tersedia setelah Midtrans terkonfigurasi.</p>
              </div>
            </div>

            {/* Top Menus */}
            <div className="bg-white rounded-2xl shadow-sm p-6">
              <h2 className="font-bold text-gray-900 mb-5">Pesanan Terlaris</h2>
              {topMenus.length === 0 ? (
                <div className="flex items-center justify-center h-40 text-gray-400">
                  <div className="text-center">
                    <ShoppingCartIcon className="w-10 h-10 text-gray-200 mx-auto mb-2" />
                    <p className="text-sm">Belum ada data menu terlaris</p>
                    <p className="text-xs text-gray-300 mt-1">Data muncul dari pesanan berstatus Selesai</p>
                  </div>
                </div>
              ) : (
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-50">
                      <th className="text-left text-xs font-semibold text-gray-400 pb-3">Menu</th>
                      <th className="text-left text-xs font-semibold text-gray-400 pb-3">Kategori</th>
                      <th className="text-right text-xs font-semibold text-gray-400 pb-3">Terjual</th>
                      <th className="text-right text-xs font-semibold text-gray-400 pb-3">Pendapatan</th>
                    </tr>
                  </thead>
                  <tbody>
                    {topMenus.map((m, i) => (
                      <tr key={i} className="border-b border-gray-50 last:border-0">
                        <td className="py-3">
                          <div className="flex items-center gap-2">
                            <div className="w-9 h-9 rounded-xl overflow-hidden bg-orange-50 flex-shrink-0">
                              {m.image
                                ? <img src={m.image} alt={m.name} className="w-full h-full object-cover" />
                                : <div className="w-full h-full flex items-center justify-center">
                                    <ShoppingCartIcon className="w-4 h-4 text-orange-300" />
                                  </div>
                              }
                            </div>
                            <span className="text-sm font-medium text-gray-800 line-clamp-1">{m.name}</span>
                          </div>
                        </td>
                        <td className="py-3">
                          <span className="text-xs bg-orange-50 text-orange-600 px-2 py-1 rounded-full">{m.cat}</span>
                        </td>
                        <td className="py-3 text-right">
                          <span className="text-sm font-bold text-gray-700">{m.qty}</span>
                          <span className="text-xs text-gray-400 ml-1">pcs</span>
                        </td>
                        <td className="py-3 text-right text-sm font-bold text-orange-500">{formatRp(m.rev)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>

          <p className="text-sm text-gray-400 text-center">
            Menampilkan laporan dari {new Date(dateFrom).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })} sampai {new Date(dateTo).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}
          </p>
        </main>
      </div>

      {/* MODAL EXPORT */}
      {showExportModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40" onClick={() => setShowExportModal(false)} />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">
            <div className="flex justify-between items-center mb-6">
              <h2 className="font-bold text-gray-900 text-lg">Export Laporan</h2>
              <button onClick={() => setShowExportModal(false)}
                className="w-8 h-8 rounded-lg hover:bg-gray-100 flex items-center justify-center transition">
                <XMarkIcon className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            <div className="mb-5">
              <label className="text-sm font-semibold text-gray-700 block mb-3">Format Export</label>
              <div className="flex gap-3">
                {[
                  { key: 'excel', label: 'Excel (.xlsx)', icon: '📊' },
                  { key: 'pdf',   label: 'PDF (.pdf)',   icon: '📄' },
                ].map(fmt => (
                  <button key={fmt.key} onClick={() => setExportFormat(fmt.key)}
                    className={`flex-1 flex items-center gap-3 p-4 rounded-xl border-2 transition ${
                      exportFormat===fmt.key ? 'border-orange-500 bg-orange-50' : 'border-gray-200 hover:border-orange-200'
                    }`}>
                    <span className="text-2xl">{fmt.icon}</span>
                    <p className="text-sm font-semibold text-gray-800">{fmt.label}</p>
                    {exportFormat===fmt.key && (
                      <div className="ml-auto w-5 h-5 bg-orange-500 rounded-full flex items-center justify-center">
                        <CheckIcon className="w-3 h-3 text-white" />
                      </div>
                    )}
                  </button>
                ))}
              </div>
            </div>

            <div className="mb-5">
              <label className="text-sm font-semibold text-gray-700 block mb-3">Periode</label>
              <div className="flex items-center gap-3">
                <div className="relative flex-1">
                  <CalendarIcon className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)}
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl pl-9 pr-4 py-2.5 text-sm outline-none" />
                </div>
                <span className="text-gray-400">—</span>
                <div className="relative flex-1">
                  <CalendarIcon className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)}
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl pl-9 pr-4 py-2.5 text-sm outline-none" />
                </div>
              </div>
            </div>

            <div className="mb-6">
              <label className="text-sm font-semibold text-gray-700 block mb-3">Data yang diexport</label>
              <div className="space-y-2.5">
                {[
                  { key: 'pesanan', label: 'Data Pesanan', icon: <ShoppingCartIcon className="w-4 h-4 text-blue-500" /> },
                  { key: 'pendapatan', label: 'Grafik Pendapatan', icon: <BanknotesIcon className="w-4 h-4 text-orange-500" /> },
                  { key: 'pelanggan', label: 'Ringkasan Status', icon: <CheckCircleIcon className="w-4 h-4 text-green-500" /> },
                ].map(opt => (
                  <label key={opt.key} className="flex items-center gap-3 cursor-pointer">
                    <div onClick={() => setExportOptions(prev => ({ ...prev, [opt.key]: !prev[opt.key] }))}
                      className={`w-5 h-5 rounded flex items-center justify-center border-2 transition cursor-pointer ${
                        exportOptions[opt.key] ? 'bg-orange-500 border-orange-500' : 'border-gray-300'
                      }`}>
                      {exportOptions[opt.key] && <CheckIcon className="w-3 h-3 text-white" />}
                    </div>
                    <div className="flex items-center gap-2">
                      {opt.icon}
                      <span className="text-sm text-gray-700">{opt.label}</span>
                    </div>
                  </label>
                ))}
              </div>
            </div>

            <div className="flex gap-3">
              <button onClick={() => setShowExportModal(false)}
                className="flex-1 border border-gray-200 text-gray-600 py-3 rounded-xl font-semibold text-sm hover:bg-gray-50 transition">
                Batal
              </button>
              <button onClick={exportFormat==='excel' ? handleExportExcel : handleExportPDF}
                className="flex-1 bg-orange-500 text-white py-3 rounded-xl font-bold text-sm hover:bg-orange-600 transition flex items-center justify-center gap-2">
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