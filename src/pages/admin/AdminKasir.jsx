import { useEffect, useState, useRef } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuthStore } from '../../store/authStore'
import AdminSidebar from '../../components/admin/AdminSidebar'
import AdminNotifBell from '../../components/admin/AdminNotifBell'
import Swal from 'sweetalert2'
import {
  MagnifyingGlassIcon, PlusIcon, MinusIcon, TrashIcon,
  ChevronDownIcon, ArrowRightOnRectangleIcon,
  PrinterIcon, ReceiptRefundIcon, XMarkIcon,
  BanknotesIcon, CreditCardIcon, QrCodeIcon,
  ShoppingCartIcon, CheckCircleIcon
} from '@heroicons/react/24/outline'
import { useNavigate } from 'react-router-dom'

const PAYMENT_METHODS = [
  { key: 'cash', label: 'Tunai', icon: BanknotesIcon, color: 'bg-green-50 border-green-300 text-green-700' },
  { key: 'transfer', label: 'Transfer', icon: CreditCardIcon, color: 'bg-blue-50 border-blue-300 text-blue-700' },
  { key: 'qris', label: 'QRIS', icon: QrCodeIcon, color: 'bg-purple-50 border-purple-300 text-purple-700' },
]

export default function AdminKasir() {
  const { profile } = useAuthStore()
  const navigate = useNavigate()
  const adminDropRef = useRef()

  const [foods, setFoods] = useState([])
  const [categories, setCategories] = useState([])
  const [activeCategory, setActiveCategory] = useState('Semua')
  const [search, setSearch] = useState('')
  const [cart, setCart] = useState([])
  const [paymentMethod, setPaymentMethod] = useState('cash')
  const [cashInput, setCashInput] = useState('')
  const [adminDropdown, setAdminDropdown] = useState(false)
  const [loading, setLoading] = useState(true)
  const [processing, setProcessing] = useState(false)
  const [showReceipt, setShowReceipt] = useState(false)
  const [lastOrder, setLastOrder] = useState(null)
  const [customerName, setCustomerName] = useState('')

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
    const [{ data: cats }, { data: foodData }] = await Promise.all([
      supabase.from('categories').select('*').order('created_at'),
      supabase.from('foods').select('*, categories(name)').eq('is_available', true).eq('is_offline', true),
    ])
    setCategories(cats || [])
    setFoods(foodData || [])
    setLoading(false)
  }

  const handleLogout = async () => {
    const result = await Swal.fire({
      icon: 'question',
      title: 'Keluar dari Akun?',
      showCancelButton: true,
      confirmButtonColor: '#ef4444',
      cancelButtonColor: '#e5e7eb',
      confirmButtonText: 'Ya, Keluar',
      cancelButtonText: 'Batal',
      customClass: { popup: 'rounded-2xl', cancelButton: '!text-gray-700' }
    })
    if (!result.isConfirmed) return
    await supabase.auth.signOut()
    window.location.href = '/login'
  }

  const addToCart = (food) => {
    setCart(prev => {
      const existing = prev.find(i => i.id === food.id)
      if (existing) return prev.map(i => i.id === food.id ? { ...i, qty: i.qty + 1 } : i)
      return [...prev, { ...food, qty: 1 }]
    })
  }

  const updateQty = (id, delta) => {
    setCart(prev => {
      const updated = prev.map(i => i.id === id ? { ...i, qty: Math.max(0, i.qty + delta) } : i)
      return updated.filter(i => i.qty > 0)
    })
  }

  const removeFromCart = (id) => setCart(prev => prev.filter(i => i.id !== id))

  const clearCart = () => {
    setCart([])
    setCashInput('')
    setCustomerName('')
    setPaymentMethod('cash')
  }

  const subtotal = cart.reduce((s, i) => s + i.price * i.qty, 0)
  const tax = Math.round(subtotal * 0.0) // bisa atur pajak di sini
  const total = subtotal + tax
  const cashAmount = parseInt(cashInput.replace(/\D/g, '') || '0')
  const change = paymentMethod === 'cash' ? Math.max(0, cashAmount - total) : 0

  const quickCash = [
    total,
    Math.ceil(total / 10000) * 10000,
    Math.ceil(total / 50000) * 50000,
    Math.ceil(total / 100000) * 100000,
  ].filter((v, i, a) => a.indexOf(v) === i).slice(0, 4)

  const handleCheckout = async () => {
    if (cart.length === 0) {
      Swal.fire({ icon: 'warning', title: 'Keranjang Kosong', text: 'Tambahkan menu terlebih dahulu.', confirmButtonColor: '#f97316', customClass: { popup: 'rounded-2xl' } })
      return
    }
    if (paymentMethod === 'cash' && cashAmount < total) {
      Swal.fire({ icon: 'warning', title: 'Uang Kurang', text: `Kurang Rp ${(total - cashAmount).toLocaleString('id-ID')}`, confirmButtonColor: '#f97316', customClass: { popup: 'rounded-2xl' } })
      return
    }

    setProcessing(true)
    try {
      // Insert order
      const { data: orderData, error: orderError } = await supabase.from('orders').insert({
        user_id: null,
        customer_name: customerName || 'Walk-in Customer',
        customer_phone: '-',
        customer_address: 'Kasir (Ambil di Tempat)',
        total,
        status: 'done',
        source: 'kasir',
        notes: `Pembayaran: ${PAYMENT_METHODS.find(m => m.key === paymentMethod)?.label}${paymentMethod === 'cash' ? ` | Bayar: Rp ${cashAmount.toLocaleString('id-ID')} | Kembalian: Rp ${change.toLocaleString('id-ID')}` : ''}`,
      }).select().single()

      if (orderError) throw orderError

      // Insert order items
      const orderItems = cart.map(item => ({
        order_id: orderData.id,
        food_id: item.id,
        quantity: item.qty,
        price: item.price,
      }))
      const { error: itemsError } = await supabase.from('order_items').insert(orderItems)
      if (itemsError) throw itemsError

      setLastOrder({
        ...orderData,
        items: cart,
        paymentMethod,
        cashAmount,
        change,
      })
      setShowReceipt(true)
      setCart([])
      setCashInput('')
      setCustomerName('')

    } catch (err) {
      Swal.fire({ icon: 'error', title: 'Gagal Transaksi', text: err.message, confirmButtonColor: '#f97316', customClass: { popup: 'rounded-2xl' } })
    } finally {
      setProcessing(false)
    }
  }

  const handlePrint = () => {
    window.print()
  }

  const filtered = foods.filter(f => {
    const matchCat = activeCategory === 'Semua' || f.categories?.name === activeCategory
    const matchSearch = f.name.toLowerCase().includes(search.toLowerCase())
    return matchCat && matchSearch
  })

  const adminName = profile?.full_name || 'Admin'
  const categoryTabs = ['Semua', ...categories.map(c => c.name)]

  return (
    <div className="flex min-h-screen bg-gray-50">
      <AdminSidebar />
      <div className="flex-1 ml-56">

        {/* TOPBAR */}
        <header className="bg-white border-b border-gray-100 px-8 py-4 flex items-center gap-4 sticky top-0 z-10">
          <div>
            <h1 className="text-lg font-bold text-gray-800">Kasir</h1>
            <p className="text-xs text-gray-400">Point of Sale — Dapur Teh Yeyen</p>
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
                  <p className="text-xs text-gray-400">Kasir</p>
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

        {/* MAIN CONTENT - 2 kolom */}
        <div className="flex h-[calc(100vh-73px)]">

          {/* KIRI: Katalog Menu */}
          <div className="flex-1 flex flex-col overflow-hidden">

            {/* Search & Filter */}
            <div className="bg-white border-b border-gray-100 px-6 py-4 space-y-3">
              <div className="relative">
                <MagnifyingGlassIcon className="w-5 h-5 text-gray-300 absolute left-3 top-1/2 -translate-y-1/2" />
                <input value={search} onChange={e => setSearch(e.target.value)}
                  placeholder="Cari menu..."
                  className="w-full bg-gray-50 border border-gray-100 rounded-xl pl-10 pr-4 py-2.5 text-sm outline-none focus:border-orange-300 transition" />
              </div>
              <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
                {categoryTabs.map(cat => (
                  <button key={cat} onClick={() => setActiveCategory(cat)}
                    className={`flex-shrink-0 px-4 py-1.5 rounded-full text-sm font-medium transition border ${
                      activeCategory === cat
                        ? 'bg-orange-500 text-white border-orange-500'
                        : 'bg-white text-gray-600 border-gray-200 hover:border-orange-300'
                    }`}>
                    {cat}
                  </button>
                ))}
              </div>
            </div>

            {/* Grid Menu */}
            <div className="flex-1 overflow-y-auto p-6">
              {loading ? (
                <div className="grid grid-cols-3 gap-4">
                  {[...Array(9)].map((_, i) => <div key={i} className="bg-white rounded-2xl h-40 animate-pulse" />)}
                </div>
              ) : filtered.length === 0 ? (
                <div className="text-center py-16 text-gray-400">
                  <p className="text-3xl mb-2">🍽️</p>
                  <p>Menu tidak ditemukan</p>
                </div>
              ) : (
                <div className="grid grid-cols-3 gap-4">
                  {filtered.map(food => {
                    const inCart = cart.find(i => i.id === food.id)
                    return (
                      <button key={food.id}
                        onClick={() => addToCart(food)}
                        className={`bg-white rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-all hover:-translate-y-0.5 text-left group relative ${inCart ? 'ring-2 ring-orange-400' : ''}`}>
                        <div className="h-32 bg-orange-50 overflow-hidden relative">
                          {food.image ? (
                            <img src={food.image} alt={food.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-4xl">🍽️</div>
                          )}
                          {inCart && (
                            <div className="absolute top-2 right-2 w-6 h-6 bg-orange-500 rounded-full flex items-center justify-center">
                              <span className="text-white text-xs font-bold">{inCart.qty}</span>
                            </div>
                          )}
                        </div>
                        <div className="p-3">
                          <p className="font-semibold text-gray-800 text-sm leading-tight mb-1 line-clamp-1">{food.name}</p>
                          <p className="text-orange-500 font-bold text-sm">Rp {food.price?.toLocaleString('id-ID')}</p>
                          <p className="text-gray-400 text-xs">/{food.unit || 'porsi'}</p>
                        </div>
                        <div className="absolute inset-0 bg-orange-500/0 group-hover:bg-orange-500/5 transition-colors rounded-2xl flex items-center justify-center opacity-0 group-hover:opacity-100">
                          <div className="w-10 h-10 bg-orange-500 rounded-full flex items-center justify-center shadow-lg">
                            <PlusIcon className="w-5 h-5 text-white" />
                          </div>
                        </div>
                      </button>
                    )
                  })}
                </div>
              )}
            </div>
          </div>

          {/* KANAN: Keranjang & Pembayaran */}
          <div className="w-80 bg-white border-l border-gray-100 flex flex-col">

            {/* Header Keranjang */}
            <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ShoppingCartIcon className="w-5 h-5 text-orange-500" />
                <h2 className="font-bold text-gray-900">Pesanan</h2>
                {cart.length > 0 && (
                  <span className="bg-orange-500 text-white text-xs w-5 h-5 rounded-full flex items-center justify-center font-bold">
                    {cart.reduce((s, i) => s + i.qty, 0)}
                  </span>
                )}
              </div>
              {cart.length > 0 && (
                <button onClick={clearCart}
                  className="text-xs text-red-400 hover:text-red-500 hover:underline">
                  Hapus Semua
                </button>
              )}
            </div>

            {/* Input Nama Pelanggan */}
            <div className="px-5 py-3 border-b border-gray-50">
              <input value={customerName} onChange={e => setCustomerName(e.target.value)}
                placeholder="Nama pelanggan (opsional)"
                className="w-full bg-gray-50 border border-gray-100 rounded-xl px-3 py-2 text-sm outline-none focus:border-orange-300 transition" />
            </div>

            {/* Item Keranjang */}
            <div className="flex-1 overflow-y-auto px-5 py-3">
              {cart.length === 0 ? (
                <div className="text-center py-12 text-gray-400">
                  <ShoppingCartIcon className="w-12 h-12 text-gray-200 mx-auto mb-3" />
                  <p className="text-sm font-medium text-gray-500">Keranjang kosong</p>
                  <p className="text-xs mt-1">Pilih menu dari katalog</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {cart.map(item => (
                    <div key={item.id} className="flex items-center gap-3 bg-gray-50 rounded-xl p-3">
                      <div className="w-10 h-10 rounded-xl overflow-hidden bg-orange-50 flex-shrink-0">
                        {item.image ? <img src={item.image} alt={item.name} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-xl">🍽️</div>}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-800 truncate">{item.name}</p>
                        <p className="text-xs text-orange-500 font-semibold">Rp {(item.price * item.qty).toLocaleString('id-ID')}</p>
                      </div>
                      <div className="flex items-center gap-1 flex-shrink-0">
                        <button onClick={() => updateQty(item.id, -1)}
                          className="w-6 h-6 rounded-full bg-white border border-gray-200 flex items-center justify-center hover:bg-red-50 hover:border-red-300 transition">
                          <MinusIcon className="w-3 h-3 text-gray-600" />
                        </button>
                        <span className="w-6 text-center text-sm font-bold text-gray-800">{item.qty}</span>
                        <button onClick={() => updateQty(item.id, 1)}
                          className="w-6 h-6 rounded-full bg-orange-500 flex items-center justify-center hover:bg-orange-600 transition">
                          <PlusIcon className="w-3 h-3 text-white" />
                        </button>
                      </div>
                      <button onClick={() => removeFromCart(item.id)}
                        className="w-6 h-6 flex items-center justify-center text-gray-300 hover:text-red-400 transition flex-shrink-0">
                        <XMarkIcon className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Ringkasan & Pembayaran */}
            <div className="border-t border-gray-100 px-5 py-4 space-y-4">

              {/* Subtotal */}
              <div className="space-y-1.5">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Subtotal ({cart.reduce((s, i) => s + i.qty, 0)} item)</span>
                  <span className="font-medium text-gray-800">Rp {subtotal.toLocaleString('id-ID')}</span>
                </div>
                <div className="flex justify-between text-base font-bold border-t border-gray-100 pt-2">
                  <span className="text-gray-900">Total</span>
                  <span className="text-orange-500 text-lg">Rp {total.toLocaleString('id-ID')}</span>
                </div>
              </div>

              {/* Metode Pembayaran */}
              <div className="grid grid-cols-3 gap-2">
                {PAYMENT_METHODS.map(m => (
                  <button key={m.key} onClick={() => setPaymentMethod(m.key)}
                    className={`flex flex-col items-center gap-1 py-2 px-1 rounded-xl border-2 text-xs font-medium transition ${
                      paymentMethod === m.key ? m.color : 'border-gray-100 text-gray-400 hover:border-gray-200'
                    }`}>
                    <m.icon className="w-5 h-5" />
                    {m.label}
                  </button>
                ))}
              </div>

              {/* Input Tunai */}
              {paymentMethod === 'cash' && (
                <div className="space-y-2">
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">Rp</span>
                    <input
                      type="text"
                      inputMode="numeric"
                      value={cashInput}
                      onChange={e => {
                        const raw = e.target.value.replace(/\D/g, '')
                        setCashInput(raw ? Number(raw).toLocaleString('id-ID') : '')
                      }}
                      placeholder="Uang diterima"
                      className="w-full border border-gray-200 rounded-xl pl-9 pr-4 py-2.5 text-sm outline-none focus:border-orange-300 transition" />
                  </div>
                  <div className="flex gap-1.5 flex-wrap">
                    {quickCash.map(amount => (
                      <button key={amount} onClick={() => setCashInput(amount.toLocaleString('id-ID'))}
                        className="text-xs bg-orange-50 text-orange-600 px-2 py-1 rounded-lg hover:bg-orange-100 transition font-medium">
                        {amount.toLocaleString('id-ID')}
                      </button>
                    ))}
                  </div>
                  {cashAmount >= total && total > 0 && (
                    <div className="bg-green-50 rounded-xl px-3 py-2 flex justify-between items-center">
                      <span className="text-xs text-green-600 font-medium">Kembalian</span>
                      <span className="text-sm font-bold text-green-600">Rp {change.toLocaleString('id-ID')}</span>
                    </div>
                  )}
                </div>
              )}

              {/* Tombol Bayar */}
              <button onClick={handleCheckout} disabled={processing || cart.length === 0}
                className="w-full bg-orange-500 text-white py-3.5 rounded-2xl font-bold text-sm hover:bg-orange-600 transition disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2">
                {processing ? (
                  <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Memproses...</>
                ) : (
                  <><CheckCircleIcon className="w-5 h-5" /> Bayar Rp {total.toLocaleString('id-ID')}</>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* MODAL STRUK */}
      {showReceipt && lastOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-sm overflow-hidden">

            {/* Header Struk */}
            <div className="bg-orange-500 text-white text-center py-6 px-6">
              <CheckCircleIcon className="w-12 h-12 mx-auto mb-2 text-white" />
              <h2 className="text-xl font-black">Pembayaran Berhasil!</h2>
              <p className="text-orange-100 text-sm mt-1">#{lastOrder.id.slice(0, 8).toUpperCase()}</p>
            </div>

            {/* Detail Struk */}
            <div className="p-6 print:block" id="receipt-content">
              <div className="text-center mb-4">
                <p className="font-black text-gray-900 text-lg">Dapur Teh Yeyen</p>
                <p className="text-gray-400 text-xs">Terima kasih atas pembelianmu!</p>
                <p className="text-gray-400 text-xs">{new Date().toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' })}</p>
              </div>

              <div className="border-t border-dashed border-gray-200 pt-4 mb-4">
                {lastOrder.items.map((item, i) => (
                  <div key={i} className="flex justify-between text-sm py-1">
                    <span className="text-gray-700">{item.name} <span className="text-gray-400">x{item.qty}</span></span>
                    <span className="font-medium text-gray-800">Rp {(item.price * item.qty).toLocaleString('id-ID')}</span>
                  </div>
                ))}
              </div>

              <div className="border-t border-gray-200 pt-3 space-y-1.5 mb-4">
                <div className="flex justify-between font-bold text-gray-900 text-base">
                  <span>Total</span>
                  <span className="text-orange-500">Rp {lastOrder.total?.toLocaleString('id-ID')}</span>
                </div>
                <div className="flex justify-between text-sm text-gray-500">
                  <span>Metode Bayar</span>
                  <span>{PAYMENT_METHODS.find(m => m.key === lastOrder.paymentMethod)?.label}</span>
                </div>
                {lastOrder.paymentMethod === 'cash' && (
                  <>
                    <div className="flex justify-between text-sm text-gray-500">
                      <span>Uang Diterima</span>
                      <span>Rp {lastOrder.cashAmount?.toLocaleString('id-ID')}</span>
                    </div>
                    <div className="flex justify-between text-sm font-semibold text-green-600">
                      <span>Kembalian</span>
                      <span>Rp {lastOrder.change?.toLocaleString('id-ID')}</span>
                    </div>
                  </>
                )}
              </div>

              <p className="text-center text-xs text-gray-400 border-t border-dashed border-gray-200 pt-3">
                Simpan struk ini sebagai bukti pembayaran
              </p>
            </div>

            {/* Tombol Aksi */}
            <div className="px-6 pb-6 flex gap-3">
              <button onClick={handlePrint}
                className="flex-1 flex items-center justify-center gap-2 border border-gray-200 text-gray-600 py-3 rounded-2xl font-semibold text-sm hover:bg-gray-50 transition">
                <PrinterIcon className="w-4 h-4" />
                Cetak Struk
              </button>
              <button onClick={() => { setShowReceipt(false); setLastOrder(null) }}
                className="flex-1 bg-orange-500 text-white py-3 rounded-2xl font-semibold text-sm hover:bg-orange-600 transition flex items-center justify-center gap-2">
                <ReceiptRefundIcon className="w-4 h-4" />
                Transaksi Baru
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}