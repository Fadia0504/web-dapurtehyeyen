import { useEffect, useState } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useCartStore } from '../store/cartStore'
import {
  HeartIcon, MinusIcon, PlusIcon, ChevronRightIcon, CheckIcon
} from '@heroicons/react/24/outline'
import { StarIcon as StarSolid } from '@heroicons/react/24/solid'

export default function FoodDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const addItem = useCartStore(state => state.addItem)
  const [food, setFood] = useState(null)
  const [related, setRelated] = useState([])
  const [options, setOptions] = useState([]) // [{group, items}]
  const [selected, setSelected] = useState({}) // {option_id: item_id} untuk single
  const [selectedMulti, setSelectedMulti] = useState({}) // {item_id: qty} untuk add on
  const [qty, setQty] = useState(1)
  const [loading, setLoading] = useState(true)
  const [wishlist, setWishlist] = useState(false)

  useEffect(() => {
    fetchFood()
  }, [id])

  async function fetchFood() {
    setLoading(true)
    const { data: foodData } = await supabase
      .from('foods').select('*, categories(name)')
      .eq('id', id).single()
    setFood(foodData)
    setQty(foodData?.min_order || 1)

    // Fetch options
    const { data: optData } = await supabase
      .from('food_options').select('*, food_option_items(*)')
      .eq('food_id', id)
      .order('created_at')
    setOptions(optData || [])

    // Init selected
    const initSelected = {}
    optData?.filter(o => o.group_type === 'single').forEach(o => {
      initSelected[o.id] = null
    })
    setSelected(initSelected)
    setSelectedMulti({})

    // Related
    if (foodData?.category_id) {
      const { data: rel } = await supabase.from('foods')
        .select('*, categories(name)')
        .eq('category_id', foodData.category_id)
        .neq('id', id).limit(4)
      setRelated(rel || [])
    }
    setLoading(false)
  }

  const getExtraPrice = () => {
    let extra = 0
    // Single options
    Object.entries(selected).forEach(([optId, itemId]) => {
      if (!itemId) return
      const opt = options.find(o => o.id === optId)
      const item = opt?.food_option_items?.find(i => i.id === itemId)
      if (item) extra += item.extra_price || 0
    })
    // Multi options
    Object.entries(selectedMulti).forEach(([itemId, itemQty]) => {
      options.forEach(opt => {
        const item = opt.food_option_items?.find(i => i.id === itemId)
        if (item) extra += (item.extra_price || 0) * itemQty
      })
    })
    return extra
  }

  const pricePerUnit = food ? food.price + getExtraPrice() : 0
  const total = pricePerUnit * qty

  const isValid = () => {
    const requiredOpts = options.filter(o => o.required && o.group_type === 'single')
    return requiredOpts.every(o => selected[o.id] !== null && selected[o.id] !== undefined)
  }

  const handleAddToCart = () => {
    if (!isValid()) {
      alert('Harap lengkapi semua pilihan yang wajib!')
      return
    }
    addItem({ ...food, qty, price: pricePerUnit, selected, selectedMulti })
    navigate('/cart')
  }

  if (loading) return (
    <div className="flex justify-center items-center min-h-[60vh] text-gray-400">Memuat...</div>
  )
  if (!food) return (
    <div className="flex justify-center items-center min-h-[60vh] text-gray-400">Menu tidak ditemukan</div>
  )

  const singleOptions = options.filter(o => o.group_type === 'single')
  const multiOptions = options.filter(o => o.group_type === 'multiple')

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Breadcrumb */}
      <div className="bg-white border-b border-gray-100 px-8 py-3">
        <p className="text-sm text-gray-400 flex items-center gap-1">
          <Link to="/" className="hover:text-orange-500">Beranda</Link>
          <ChevronRightIcon className="w-3 h-3" />
          <Link to="/menu" className="hover:text-orange-500">{food.categories?.name}</Link>
          <ChevronRightIcon className="w-3 h-3" />
          <span className="text-gray-700">{food.name}</span>
        </p>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-8">
        <div className="grid grid-cols-2 gap-10 mb-12">

          {/* KIRI */}
          <div>
            <div className="relative bg-white rounded-3xl overflow-hidden shadow-sm mb-3 aspect-square">
              {food.image ? (
                <img src={food.image} alt={food.name} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-8xl bg-orange-50">🍽️</div>
              )}
              <button onClick={() => setWishlist(!wishlist)}
                className="absolute top-4 right-4 w-10 h-10 bg-white rounded-full shadow-md flex items-center justify-center hover:scale-110 transition">
                <HeartIcon className={`w-5 h-5 ${wishlist ? 'text-red-500 fill-red-500' : 'text-gray-400'}`} />
              </button>
            </div>

            <div className="bg-green-50 rounded-2xl p-4 flex items-center gap-3 mb-4">
              <span className="text-2xl">📦</span>
              <div>
                <p className="font-semibold text-gray-800 text-sm">Disiapkan segar setiap hari</p>
                <p className="text-gray-400 text-xs">Pesanan sebelum 08.00 akan dikirim di hari yang sama</p>
              </div>
            </div>

            <div className="bg-white rounded-2xl p-5 shadow-sm">
              <h3 className="font-bold text-gray-900 mb-3">Tentang Menu</h3>
              <p className="text-gray-500 text-sm leading-relaxed mb-4">{food.description}</p>
              <div className="space-y-2.5">
                {food.min_order > 1 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-400">👥 Minimal pemesanan</span>
                    <span className="font-medium text-gray-700">{food.min_order} {food.unit}</span>
                  </div>
                )}
                <div className="flex justify-between text-sm">
                  <span className="text-gray-400">⏰ Waktu pemesanan</span>
                  <span className="font-medium text-gray-700">H-1 sebelum 15.00 WIB</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-400">🚚 Pengiriman</span>
                  <span className="font-medium text-gray-700">Gratis ongkir area tertentu</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-400">📦 Kemasan</span>
                  <span className="font-medium text-gray-700">Food grade & higienis</span>
                </div>
              </div>
            </div>
          </div>

          {/* KANAN */}
          <div>
            <span className="inline-block bg-orange-100 text-orange-500 text-xs font-semibold px-3 py-1 rounded-full mb-3">
              {food.categories?.name}
            </span>
            <h1 className="text-3xl font-black text-gray-900 mb-1" style={{fontFamily:'Playfair Display, serif'}}>
              {food.name}
            </h1>
            <p className="text-gray-400 text-sm mb-3">{food.description}</p>

            <div className="flex items-center gap-3 mb-3">
              <div className="flex gap-0.5">
                {[...Array(5)].map((_, i) => (
                  <StarSolid key={i} className={`w-4 h-4 ${i < Math.floor(food.rating || 4.5) ? 'text-orange-400' : 'text-gray-200'}`} />
                ))}
              </div>
              <span className="text-sm text-gray-500">{food.rating || '4.5'} ({food.sold_count || 0} ulasan)</span>
              <span className="text-gray-300">•</span>
              <span className="text-sm text-gray-500">{food.sold_count || 0}+ terjual</span>
            </div>

            <p className="text-4xl font-black text-orange-500 mb-5">
              Rp {food.price?.toLocaleString('id-ID')}
              <span className="text-lg text-gray-400 font-normal">/{food.unit || 'porsi'}</span>
            </p>

            {/* PILIHAN WAJIB (Single) */}
            {singleOptions.map((opt, idx) => (
              <div key={opt.id} className="bg-white rounded-2xl p-5 shadow-sm mb-3">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="font-bold text-gray-900 flex items-center gap-2">
                    <span className="w-6 h-6 bg-orange-500 text-white text-xs rounded-full flex items-center justify-center font-bold">
                      {idx + 1}
                    </span>
                    {opt.group_name}
                  </h3>
                  {opt.required && (
                    <span className="text-orange-500 text-xs font-medium">Wajib pilih 1</span>
                  )}
                </div>
                <div className="grid grid-cols-5 gap-2">
                  {opt.food_option_items?.map(item => (
                    <button key={item.id}
                      onClick={() => setSelected(prev => ({ ...prev, [opt.id]: item.id }))}
                      className={`relative flex flex-col items-center gap-1.5 p-2 rounded-xl border-2 transition ${selected[opt.id] === item.id
                        ? 'border-orange-500 bg-orange-50'
                        : 'border-gray-100 hover:border-orange-200'}`}>
                      {selected[opt.id] === item.id && (
                        <div className="absolute top-1 right-1 w-4 h-4 bg-orange-500 rounded-full flex items-center justify-center">
                          <CheckIcon className="w-2.5 h-2.5 text-white" />
                        </div>
                      )}
                      <div className="w-12 h-12 bg-orange-50 rounded-xl flex items-center justify-center text-2xl overflow-hidden">
                        {item.image ? (
                          <img src={item.image} alt={item.name} className="w-full h-full object-cover rounded-xl" />
                        ) : '🍽️'}
                      </div>
                      <p className="text-xs text-center text-gray-700 leading-tight font-medium">{item.name}</p>
                      {item.extra_price > 0 && (
                        <p className="text-xs text-orange-500 font-medium">+Rp {item.extra_price?.toLocaleString('id-ID')}</p>
                      )}
                    </button>
                  ))}
                </div>
              </div>
            ))}

            {/* ADD ON (Multiple) */}
            {multiOptions.map(opt => (
              <div key={opt.id} className="bg-white rounded-2xl p-5 shadow-sm mb-3">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="font-bold text-gray-900">{opt.group_name}</h3>
                  <span className="text-gray-400 text-xs">Opsional</span>
                </div>
                <div className="space-y-2">
                  {opt.food_option_items?.map(item => (
                    <div key={item.id} className="flex items-center justify-between py-1">
                      <div className="flex items-center gap-3">
                        <input type="checkbox"
                          checked={!!selectedMulti[item.id]}
                          onChange={e => setSelectedMulti(prev => ({
                            ...prev,
                            [item.id]: e.target.checked ? 1 : 0
                          }))}
                          className="accent-orange-500 w-4 h-4" />
                        <span className="text-sm text-gray-700">{item.name}</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-orange-500 text-sm font-medium">
                          + Rp {item.extra_price?.toLocaleString('id-ID')}
                        </span>
                        {selectedMulti[item.id] > 0 && (
                          <div className="flex items-center gap-2">
                            <button onClick={() => setSelectedMulti(prev => ({ ...prev, [item.id]: Math.max(0, (prev[item.id] || 0) - 1) }))}
                              className="w-6 h-6 rounded-full border border-gray-200 flex items-center justify-center text-xs hover:bg-orange-50 transition">
                              −
                            </button>
                            <span className="text-sm font-medium w-4 text-center">{selectedMulti[item.id]}</span>
                            <button onClick={() => setSelectedMulti(prev => ({ ...prev, [item.id]: (prev[item.id] || 0) + 1 }))}
                              className="w-6 h-6 rounded-full border border-gray-200 flex items-center justify-center text-xs hover:bg-orange-50 transition">
                              +
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}

            {/* Jumlah */}
            <div className="bg-white rounded-2xl p-5 shadow-sm mb-4">
              <h3 className="font-bold text-gray-900 mb-1">Jumlah ({food.unit || 'porsi'})</h3>
              {food.min_order > 1 && (
                <p className="text-xs text-gray-400 mb-3">Minimal pemesanan {food.min_order} {food.unit}</p>
              )}
              <div className="flex items-center gap-4">
                <button onClick={() => setQty(q => Math.max(food.min_order || 1, q - 1))}
                  className="w-10 h-10 rounded-full border border-gray-200 flex items-center justify-center hover:bg-orange-50 hover:border-orange-300 transition">
                  <MinusIcon className="w-4 h-4 text-gray-600" />
                </button>
                <span className="text-2xl font-bold text-gray-900 w-12 text-center">{qty}</span>
                <button onClick={() => setQty(q => q + 1)}
                  className="w-10 h-10 rounded-full border border-gray-200 flex items-center justify-center hover:bg-orange-50 hover:border-orange-300 transition">
                  <PlusIcon className="w-4 h-4 text-gray-600" />
                </button>
              </div>
            </div>

            {/* Total */}
            <div className="bg-orange-50 rounded-2xl p-4 mb-5">
              <div className="flex justify-between items-center">
                <span className="font-semibold text-gray-700">Total Harga</span>
                <div className="text-right">
                  <p className="text-2xl font-black text-orange-500">
                    Rp {total.toLocaleString('id-ID')}
                  </p>
                  <p className="text-xs text-gray-400">({qty} {food.unit || 'porsi'})</p>
                </div>
              </div>
            </div>

            {/* Buttons */}
            <div className="flex gap-3">
              <button onClick={handleAddToCart}
                className="flex-1 border-2 border-orange-500 text-orange-500 py-4 rounded-2xl font-bold hover:bg-orange-50 transition flex items-center justify-center gap-2">
                🛒 Tambah ke Keranjang
              </button>
              <button
                onClick={() => { if (!isValid()) { alert('Harap lengkapi semua pilihan yang wajib!'); return; } addItem({ ...food, qty, price: pricePerUnit }); navigate('/checkout') }}
                className="flex-1 bg-orange-500 text-white py-4 rounded-2xl font-bold hover:bg-orange-600 transition">
                Pesan Sekarang
              </button>
            </div>
          </div>
        </div>

        {/* Related */}
        {related.length > 0 && (
          <div>
            <h2 className="text-xl font-black text-gray-900 mb-4" style={{fontFamily:'Playfair Display, serif'}}>
              Menu Lainnya yang Mungkin Kamu Suka
            </h2>
            <div className="grid grid-cols-4 gap-4">
              {related.map(item => (
                <Link key={item.id} to={`/menu/${item.id}`}
                  className="bg-white rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition hover:-translate-y-1">
                  <div className="h-36 bg-orange-50 overflow-hidden">
                    {item.image ? (
                      <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-4xl">🍽️</div>
                    )}
                  </div>
                  <div className="p-3">
                    <p className="font-semibold text-gray-800 text-sm">{item.name}</p>
                    <p className="text-orange-500 font-bold text-sm mt-1">
                      Rp {item.price?.toLocaleString('id-ID')}
                      <span className="text-gray-400 font-normal text-xs">/{item.unit || 'porsi'}</span>
                    </p>
                    <div className="flex items-center gap-1 mt-1">
                      <StarSolid className="w-3 h-3 text-orange-400" />
                      <span className="text-xs text-gray-400">{item.rating || '4.5'} • {item.sold_count || 0}+ terjual</span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}