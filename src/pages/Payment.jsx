import { useState, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import {
  ChevronLeftIcon, ChevronDownIcon, ChevronUpIcon,
  ShieldCheckIcon, ClockIcon, CheckCircleIcon,
  TruckIcon, PhoneIcon
} from '@heroicons/react/24/outline'

const banks = [
  { name: 'BCA', bg: 'bg-blue-600' },
  { name: 'Mandiri', bg: 'bg-yellow-500' },
  { name: 'BNI', bg: 'bg-orange-600' },
  { name: 'BRI', bg: 'bg-blue-800' },
]

const bankAccounts = {
  BCA: { number: '1234 5678 901', name: 'DAPUR TEH YEYEN' },
  Mandiri: { number: '8901 2345 6789', name: 'DAPUR TEH YEYEN' },
  BNI: { number: '5678 9012 345', name: 'DAPUR TEH YEYEN' },
  BRI: { number: '2345 6789 012', name: 'DAPUR TEH YEYEN' },
}

const paymentMethods = [
  { id: 'bank', label: 'Transfer Bank', desc: 'Bayar melalui transfer ke rekening bank kami.', badge: 'Disarankan' },
  { id: 'ewallet', label: 'E-Wallet', desc: 'Bayar menggunakan saldo e-wallet favoritmu.', logos: 'OVO • GoPay • DANA • ShopeePay' },
  { id: 'va', label: 'Virtual Account', desc: 'Bayar melalui Virtual Account dari berbagai bank.', logos: 'BCA • Mandiri • BNI • BRI' },
  { id: 'card', label: 'Kartu Kredit / Debit', desc: 'Bayar menggunakan kartu kredit atau debit.', logos: 'VISA • Mastercard • JCB' },
  { id: 'qris', label: 'QRIS', desc: 'Bayar cepat dengan scan QR code.', logos: 'QRIS' },
]

export default function Payment() {
  const navigate = useNavigate()
  const [method, setMethod] = useState('bank')
  const [selectedBank, setSelectedBank] = useState('BCA')
  const [copied, setCopied] = useState(false)
  const [timeLeft, setTimeLeft] = useState(86400)
  const [paymentData, setPaymentData] = useState(null)

  useEffect(() => {
    // Baca dari sessionStorage — lebih reliable dari location.state
    const saved = sessionStorage.getItem('paymentData')
    if (saved) {
      try {
        setPaymentData(JSON.parse(saved))
      } catch {
        navigate('/menu')
      }
    } else {
      navigate('/menu')
    }
  }, [])

  useEffect(() => {
    const timer = setInterval(() => setTimeLeft(t => Math.max(0, t - 1)), 1000)
    return () => clearInterval(timer)
  }, [])

  const formatTime = (s) => {
    const h = Math.floor(s / 3600).toString().padStart(2, '0')
    const m = Math.floor((s % 3600) / 60).toString().padStart(2, '0')
    const sec = (s % 60).toString().padStart(2, '0')
    return `${h}:${m}:${sec}`
  }

  const handleCopy = () => {
    navigator.clipboard.writeText(bankAccounts[selectedBank]?.number.replace(/\s/g, ''))
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleKonfirmasi = () => {
    sessionStorage.removeItem('paymentData')
    navigate('/success')
  }

  if (!paymentData) return (
    <div className="flex items-center justify-center min-h-screen">
      <p className="text-gray-400 text-sm">Memuat data pembayaran...</p>
    </div>
  )

  const { items, total } = paymentData
  const subtotal = total || 0
  const ongkir = subtotal >= 100000 ? 0 : 15000
  const grandTotal = subtotal + ongkir

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-5xl mx-auto px-4 py-8">
        <Link to="/cart" className="flex items-center gap-2 text-gray-500 hover:text-orange-500 mb-6 transition">
          <ChevronLeftIcon className="w-4 h-4" />
          <span className="text-sm">Kembali</span>
        </Link>

        <h1 className="text-2xl font-black text-gray-900 mb-1" style={{fontFamily:'Playfair Display, serif'}}>
          Pembayaran
        </h1>
        <p className="text-gray-400 text-sm mb-6">Selesaikan pembayaran untuk melanjutkan pesananmu.</p>

        <div className="bg-green-50 border border-green-100 rounded-2xl px-4 py-3 flex items-center gap-3 mb-6">
          <ShieldCheckIcon className="w-5 h-5 text-green-500 flex-shrink-0" />
          <p className="text-sm text-green-700">Transaksi kamu aman dan dienkripsi. Data kartu tidak akan disimpan.</p>
        </div>

        <div className="grid grid-cols-3 gap-6">
          {/* KIRI - Metode Pembayaran */}
          <div className="col-span-2 space-y-3">
            <h2 className="font-bold text-gray-800 mb-2">Pilih Metode Pembayaran</h2>

            {paymentMethods.map(m => (
              <div key={m.id}
                className={`bg-white rounded-2xl shadow-sm overflow-hidden border-2 transition ${method === m.id ? 'border-orange-500' : 'border-transparent'}`}>

                <button onClick={() => setMethod(m.id)} className="w-full flex items-center justify-between p-5">
                  <div className="flex items-center gap-3">
                    <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${method === m.id ? 'border-orange-500' : 'border-gray-300'}`}>
                      {method === m.id && <div className="w-2.5 h-2.5 bg-orange-500 rounded-full" />}
                    </div>
                    <div className="text-left">
                      <div className="flex items-center gap-2">
                        <p className="font-semibold text-gray-800 text-sm">{m.label}</p>
                        {m.badge && (
                          <span className="bg-green-100 text-green-600 text-xs px-2 py-0.5 rounded-full font-medium">{m.badge}</span>
                        )}
                      </div>
                      <p className="text-gray-400 text-xs">{m.desc}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {m.logos && <span className="text-xs text-gray-400">{m.logos}</span>}
                    {method === m.id ? <ChevronUpIcon className="w-4 h-4 text-gray-400" /> : <ChevronDownIcon className="w-4 h-4 text-gray-400" />}
                  </div>
                </button>

                {/* Transfer Bank */}
                {method === 'bank' && m.id === 'bank' && (
                  <div className="px-5 pb-5 border-t border-gray-50 pt-4">
                    <p className="text-sm font-medium text-gray-700 mb-3">Pilih Bank Tujuan</p>
                    <div className="grid grid-cols-4 gap-3 mb-5">
                      {banks.map(bank => (
                        <button key={bank.name}
                          onClick={() => setSelectedBank(bank.name)}
                          className={`border-2 rounded-xl p-3 text-center transition ${selectedBank === bank.name ? 'border-orange-500 bg-orange-50' : 'border-gray-100 hover:border-orange-200'}`}>
                          <div className={`w-8 h-8 ${bank.bg} rounded-lg mx-auto mb-1 flex items-center justify-center text-white text-xs font-bold`}>
                            {bank.name.slice(0, 1)}
                          </div>
                          <p className="text-xs font-bold text-gray-700">{bank.name}</p>
                          {selectedBank === bank.name && <CheckCircleIcon className="w-4 h-4 text-orange-500 mx-auto mt-1" />}
                        </button>
                      ))}
                    </div>
                    <div className="bg-gray-50 rounded-xl p-4 mb-4">
                      <p className="text-xs text-gray-400 mb-1">Nomor Rekening</p>
                      <div className="flex items-center justify-between mb-2">
                        <p className="text-xl font-black text-gray-900">{bankAccounts[selectedBank]?.number}</p>
                        <button onClick={handleCopy}
                          className="border border-orange-300 text-orange-500 px-3 py-1.5 rounded-lg text-xs font-medium hover:bg-orange-50 transition">
                          {copied ? '✓ Tersalin' : '📋 Salin'}
                        </button>
                      </div>
                      <p className="text-xs text-gray-400">Atas Nama</p>
                      <p className="font-bold text-gray-800">{bankAccounts[selectedBank]?.name}</p>
                    </div>
                    <div className="flex justify-between items-center">
                      <div>
                        <p className="text-xs text-gray-400">Total Pembayaran</p>
                        <p className="text-xl font-black text-orange-500">Rp {grandTotal.toLocaleString('id-ID')}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-xs text-gray-400">Selesaikan dalam</p>
                        <div className="flex items-center gap-1 text-gray-700">
                          <ClockIcon className="w-4 h-4" />
                          <p className="font-mono font-bold">{formatTime(timeLeft)}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Metode lain - coming soon */}
                {method === m.id && m.id !== 'bank' && (
                  <div className="px-5 pb-5 border-t border-gray-50 pt-4">
                    {m.id === 'qris' ? (
                      <div className="text-center">
                        <div className="w-40 h-40 bg-gray-100 rounded-2xl mx-auto my-4 flex items-center justify-center border-2 border-dashed border-gray-300">
                          <p className="text-gray-400 text-sm">QR Code<br />Midtrans</p>
                        </div>
                        <p className="text-xs text-gray-400">Scan dengan aplikasi e-wallet apapun</p>
                      </div>
                    ) : (
                      <p className="text-sm text-gray-500">Fitur ini akan segera tersedia via Midtrans.</p>
                    )}
                  </div>
                )}
              </div>
            ))}

            <div className="bg-orange-50 rounded-2xl p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <ShieldCheckIcon className="w-8 h-8 text-orange-400" />
                <div>
                  <p className="font-semibold text-gray-800 text-sm">Butuh bantuan pembayaran?</p>
                  <p className="text-gray-400 text-xs">Hubungi Customer Service kami jika ada kendala.</p>
                </div>
              </div>
              <Link to="/contact"
                className="border border-orange-500 text-orange-500 px-4 py-2 rounded-xl text-sm font-semibold hover:bg-orange-500 hover:text-white transition flex-shrink-0">
                Hubungi CS
              </Link>
            </div>

            <button onClick={handleKonfirmasi}
              className="w-full bg-orange-500 text-white py-4 rounded-2xl font-bold text-lg hover:bg-orange-600 transition shadow-lg shadow-orange-200">
              ✓ Konfirmasi Pembayaran
            </button>

            <div className="grid grid-cols-4 gap-4 pt-2 text-center">
              {[
                { icon: '🔒', label: '100% Aman', desc: 'Transaksi dienkripsi' },
                { icon: '✅', label: 'Kualitas Terjamin', desc: 'Bahan segar premium' },
                { icon: '⏰', label: 'Pengiriman Tepat', desc: 'Sesuai jadwal' },
                { icon: '📞', label: 'CS 24/7', desc: 'Siap membantu' },
              ].map((b, i) => (
                <div key={i}>
                  <p className="text-2xl mb-1">{b.icon}</p>
                  <p className="text-xs font-bold text-gray-700">{b.label}</p>
                  <p className="text-xs text-gray-400">{b.desc}</p>
                </div>
              ))}
            </div>
          </div>

          {/* KANAN - Ringkasan */}
          <div>
            <div className="bg-white rounded-2xl shadow-sm p-5 sticky top-24">
              <h2 className="font-bold text-gray-800 mb-4">Ringkasan Pesanan</h2>
              {items?.map((item, i) => (
                <div key={i} className="flex gap-3 mb-4">
                  <div className="w-14 h-14 rounded-xl bg-orange-50 overflow-hidden flex-shrink-0">
                    {item.image
                      ? <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
                      : <div className="w-full h-full flex items-center justify-center text-2xl">🍽️</div>
                    }
                  </div>
                  <div className="flex-1">
                    <p className="font-semibold text-gray-800 text-sm">{item.name}</p>
                    <p className="text-orange-500 text-xs">Rp {item.price?.toLocaleString('id-ID')} /{item.unit || 'porsi'}</p>
                    <span className="text-xs bg-orange-100 text-orange-500 px-2 py-0.5 rounded-full">
                      {item.qty || 1} {item.unit || 'porsi'}
                    </span>
                  </div>
                </div>
              ))}

              <div className="border-t border-gray-100 pt-4 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-400">Subtotal</span>
                  <span className="font-medium">Rp {subtotal.toLocaleString('id-ID')}</span>
                </div>
                <div className="flex justify-between text-sm items-center">
                  <span className="text-gray-400">Ongkir</span>
                  {ongkir === 0
                    ? <span className="bg-green-100 text-green-600 text-xs px-2 py-0.5 rounded-full font-medium">GRATIS</span>
                    : <span className="font-medium">Rp {ongkir.toLocaleString('id-ID')}</span>
                  }
                </div>
                <div className="border-t border-gray-100 pt-2 flex justify-between font-bold">
                  <span>Total Pembayaran</span>
                  <span className="text-orange-500 text-lg">Rp {grandTotal.toLocaleString('id-ID')}</span>
                </div>
              </div>

              {ongkir === 0 && (
                <div className="bg-green-50 rounded-xl p-3 mt-3 flex items-center gap-2">
                  <span className="text-lg">🎉</span>
                  <div>
                    <p className="text-xs font-bold text-green-700">Yay! Kamu dapat gratis ongkir</p>
                    <p className="text-xs text-green-600">Minimum pemesanan Rp 100.000</p>
                  </div>
                </div>
              )}

              <div className="mt-4 space-y-3">
                {[
                  { icon: <TruckIcon className="w-4 h-4 text-orange-500" />, title: 'Pengiriman Tepat Waktu', desc: 'Pesanan diantar sesuai waktu yang dipilih' },
                  { icon: <ShieldCheckIcon className="w-4 h-4 text-orange-500" />, title: 'Kualitas Terjamin', desc: 'Bahan segar & dimasak dengan higienis' },
                  { icon: <PhoneIcon className="w-4 h-4 text-orange-500" />, title: 'Layanan Pelanggan 24/7', desc: 'Kami siap membantu kapan saja' },
                ].map((info, i) => (
                  <div key={i} className="flex items-start gap-3">
                    <div className="w-8 h-8 bg-orange-50 rounded-lg flex items-center justify-center flex-shrink-0">{info.icon}</div>
                    <div>
                      <p className="text-xs font-semibold text-gray-700">{info.title}</p>
                      <p className="text-xs text-gray-400">{info.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}