import { Link } from 'react-router-dom'
import { useEffect, useState, useRef } from 'react'
import { supabase } from '../lib/supabase'
import FoodCard from '../components/FoodCard'
import { StarIcon, TruckIcon, SparklesIcon } from '@heroicons/react/24/solid'
import { ShoppingBagIcon, ChevronLeftIcon, ChevronRightIcon } from '@heroicons/react/24/outline'

export default function Home() {
  const [popularFoods, setPopularFoods] = useState([])
  const [testimonials, setTestimonials] = useState([])
  const [settings, setSettings] = useState(null)
  const scrollRef = useRef()

  // ── Ambil data dari Supabase ──────────────────────────────────────────────
  useEffect(() => {
    // 1) Settings toko — satu baris JSON di app_settings (id=1), kolom `value`.
    supabase.from('app_settings').select('value').eq('id', 1).maybeSingle()
      .then(({ data }) => setSettings(data?.value || null))

    // 2) Menu paling populer — diurutkan dari jumlah terjual sungguhan
    loadPopular()

    // 3) Testimoni
    supabase.from('testimonials').select('*')
      .order('created_at', { ascending: false })
      .then(({ data }) => setTestimonials(data || []))
  }, [])

  async function loadPopular() {
    // Hitung total terjual per menu dari order_items
    const { data: rows } = await supabase.from('order_items').select('food_id, quantity')
    const counts = {}
    ;(rows || []).forEach(r => {
      if (!r.food_id) return
      counts[r.food_id] = (counts[r.food_id] || 0) + (r.quantity || 1)
    })
    const topIds = Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 3).map(([id]) => id)

    if (topIds.length > 0) {
      const { data } = await supabase.from('foods')
        .select('*, categories(name)')
        .in('id', topIds)
        .eq('is_available', true)
      // pertahankan urutan populernya
      const ordered = topIds.map(id => (data || []).find(f => String(f.id) === String(id))).filter(Boolean)
      if (ordered.length > 0) { setPopularFoods(ordered); return }
    }

    // Fallback: kalau belum ada penjualan, tampilkan 3 menu tersedia
    const { data } = await supabase.from('foods').select('*, categories(name)')
      .eq('is_available', true).limit(3)
    setPopularFoods(data || [])
  }

  // ── Helper baca settings dengan fallback aman ─────────────────────────────
  // Key sesuai app_settings.value dari halaman AdminSettings.
  const store = {
    name: settings?.store_name || 'Dapur Teh Yeyen',
    description: settings?.store_description ||
      'Masakan rumahan yang lezat, sehat, dan terjangkau untuk keluarga Indonesia.',
    aboutText: settings?.store_description ||
      'Kami menyajikan makanan sehat dan lezat yang mudah dijangkau. Setiap hidangan dibuat dengan cinta menggunakan bahan-bahan segar pilihan. Kepuasan pelanggan adalah prioritas utama kami.',
    address: settings?.store_address || 'Jakarta, Indonesia',
    phone: settings?.store_phone || '+62 812-3456-7890',
    email: settings?.store_email || 'dapur@tehyeyen.com', // tidak ada di settings; fallback statis
    logo: settings?.logo_url ||
      'https://tgsrztwdaxkjyrerodnh.supabase.co/storage/v1/object/public/food-images/rawr.png',
    // Jam operasional: array [{ day, open, close, closed }]
    hours: Array.isArray(settings?.operational_hours) ? settings.operational_hours : null,
  }

  const scroll = (dir) => {
    const el = scrollRef.current
    if (!el) return
    el.scrollBy({ left: dir === 'left' ? -300 : 300, behavior: 'smooth' })
  }

  const displayTestimonials = testimonials.length > 0 ? testimonials : [
    { id: 1, name: 'Siti Rahayu', rating: 5, city: 'Jakarta', text: 'Makanannya enak banget! Nasi gorengnya juara, selalu jadi pilihan makan siang keluarga kami.' },
    { id: 2, name: 'Budi Santoso', rating: 5, city: 'Bekasi', text: 'Pengiriman cepat, makanan masih hangat. Paket cateringnya sangat recommended banget!' },
    { id: 3, name: 'Dewi Lestari', rating: 5, city: 'Depok', text: 'Harga terjangkau, porsi besar, rasa tidak kalah sama restoran mewah. Langganan terus!' },
    { id: 4, name: 'Andi Wijaya', rating: 5, city: 'Tangerang', text: 'Catering untuk acara kantor kami selalu pesan di sini. Pelayanan ramah dan tepat waktu!' },
    { id: 5, name: 'Rina Sari', rating: 5, city: 'Bogor', text: 'Sudah berlangganan 3 bulan, kualitas konsisten enak. Paket cateringnya sangat worth it!' },
  ]

  return (
    <div className="font-sans">

      {/* HERO */}
      <section className="relative overflow-hidden bg-white min-h-[90vh] flex items-center">
        <div className="absolute top-0 right-0 w-[55%] h-full bg-orange-400 rounded-bl-[120px] z-0" />
        <div className="relative z-10 max-w-6xl mx-auto px-8 w-full grid grid-cols-2 gap-8 items-center">
          <div>
            <p className="text-orange-500 font-semibold text-sm mb-3 tracking-widest uppercase">— Restaurant</p>
            <h1 className="text-6xl font-black leading-tight text-gray-900 mb-6" style={{ fontFamily: 'Playfair Display, serif' }}>
              We Serve<br />
              <span className="text-orange-500">Delicious</span> Food
            </h1>
            <p className="text-gray-500 text-lg mb-8 max-w-md leading-relaxed">
              {store.description}
            </p>
            <Link to="/menu"
              className="inline-flex items-center gap-2 bg-orange-500 text-white px-8 py-4 rounded-full font-semibold text-lg hover:bg-orange-600 transition-all hover:scale-105 shadow-lg shadow-orange-200">
              <ShoppingBagIcon className="w-5 h-5" />
              Pesan Sekarang
            </Link>
          </div>

          <div className="relative flex justify-center items-center h-[480px]">
            <div className="w-80 h-80 bg-white rounded-full shadow-2xl overflow-hidden border-4 border-white">
              <img
                src="https://tgsrztwdaxkjyrerodnh.supabase.co/storage/v1/object/public/food-images/nasi-goreng.jpeg"
                alt="Featured Food" className="w-full h-full object-cover"
                onError={e => { e.target.style.display='none'; e.target.parentElement.innerHTML='<div class="w-full h-full bg-orange-50 flex items-center justify-center text-8xl">🍛</div>' }}
              />
            </div>
            <div className="absolute top-6 right-10 w-20 h-20 bg-white rounded-full shadow-lg overflow-hidden border-2 border-white">
              <img src="https://tgsrztwdaxkjyrerodnh.supabase.co/storage/v1/object/public/food-images/nasi-kebuli.jpeg"
                alt="Food 2" className="w-full h-full object-cover"
                onError={e => { e.target.style.display='none'; e.target.parentElement.innerHTML='<div class="w-full h-full bg-orange-50 flex items-center justify-center text-2xl">🥗</div>' }}
              />
            </div>
            <div className="absolute bottom-10 right-6 w-16 h-16 bg-white rounded-full shadow-lg overflow-hidden border-2 border-white">
              <img src="https://tgsrztwdaxkjyrerodnh.supabase.co/storage/v1/object/public/food-images/klepon.jpeg"
                alt="Food 3" className="w-full h-full object-cover"
                onError={e => { e.target.style.display='none'; e.target.parentElement.innerHTML='<div class="w-full h-full bg-orange-50 flex items-center justify-center text-2xl">🍜</div>' }}
              />
            </div>
            <div className="absolute bottom-16 left-6 w-16 h-16 bg-white rounded-full shadow-lg overflow-hidden border-2 border-white">
              <img src="https://tgsrztwdaxkjyrerodnh.supabase.co/storage/v1/object/public/food-images/nasi-goreng.jpeg"
                alt="Food 4" className="w-full h-full object-cover"
                onError={e => { e.target.style.display='none'; e.target.parentElement.innerHTML='<div class="w-full h-full bg-orange-50 flex items-center justify-center text-2xl">🍲</div>' }}
              />
            </div>
          </div>
        </div>
      </section>

      {/* ABOUT */}
      <section id="about" className="py-24 bg-white">
        <div className="max-w-6xl mx-auto px-8 grid grid-cols-2 gap-16 items-center">
          <div className="relative">
            <div className="w-64 h-64 bg-orange-400 rounded-full absolute -left-6 -top-6 z-0" />
            <div className="relative z-10 w-72 h-72 rounded-3xl shadow-xl overflow-hidden ml-8 border-4 border-white">
              <img
                src="https://tgsrztwdaxkjyrerodnh.supabase.co/storage/v1/object/public/food-images/nasi-kebuli.jpeg"
                alt="About Us" className="w-full h-full object-cover"
                onError={e => { e.target.style.display='none'; e.target.parentElement.innerHTML='<div class="w-full h-full bg-orange-50 flex items-center justify-center text-8xl">🍱</div>' }}
              />
            </div>
          </div>
          <div>
            <h2 className="text-4xl font-black text-gray-900 mb-4" style={{ fontFamily: 'Playfair Display, serif' }}>
              About <span className="text-orange-500">Us</span>
            </h2>
            <p className="text-gray-500 leading-relaxed mb-6">
              {store.aboutText}
            </p>
            <Link to="/menu"
              className="border-2 border-orange-500 text-orange-500 px-6 py-3 rounded-full font-semibold hover:bg-orange-500 hover:text-white transition">
              Lihat Menu
            </Link>
          </div>
        </div>
      </section>

      {/* POPULAR FOODS */}
      <section className="py-24 bg-gray-50">
        <div className="max-w-6xl mx-auto px-8">
          <h2 className="text-4xl font-black text-center text-gray-900 mb-2" style={{ fontFamily: 'Playfair Display, serif' }}>
            Most Popular <span className="text-orange-500">Food</span>
          </h2>
          <p className="text-center text-gray-400 mb-12">Menu favorit pelanggan setia kami</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
            {popularFoods.length > 0 ? popularFoods.map(food => (
              <FoodCard key={food.id} food={food} />
            )) : (
              <p className="col-span-3 text-center text-gray-400">Menu sedang dimuat...</p>
            )}
          </div>
          <div className="text-center mt-10">
            <Link to="/menu"
              className="bg-orange-500 text-white px-8 py-3 rounded-full font-semibold hover:bg-orange-600 transition">
              Lihat Semua Menu
            </Link>
          </div>
        </div>
      </section>

      {/* WHY CHOOSE US */}
      <section className="py-24 bg-white">
        <div className="max-w-6xl mx-auto px-8">
          <h2 className="text-4xl font-black text-center text-gray-900 mb-12" style={{ fontFamily: 'Playfair Display, serif' }}>
            Why Choose Our <span className="text-orange-500">Food</span>
          </h2>
          <div className="grid grid-cols-3 gap-8">
            {[
              { icon: <StarIcon className="w-8 h-8 text-orange-500" />, title: 'Quality Food', desc: 'Bahan-bahan segar pilihan yang kami seleksi setiap hari untuk menjaga kualitas terbaik.' },
              { icon: <SparklesIcon className="w-8 h-8 text-orange-500" />, title: 'Super Taste', desc: 'Resep rahasia turun-temurun yang menghasilkan cita rasa autentik dan tak terlupakan.', highlight: true },
              { icon: <TruckIcon className="w-8 h-8 text-orange-500" />, title: 'Fast Delivery', desc: 'Pengiriman cepat dan tepat waktu agar makanan sampai dalam kondisi hangat dan segar.' },
            ].map((item, i) => (
              <div key={i} className={`p-8 rounded-3xl ${item.highlight ? 'bg-white shadow-xl border-2 border-orange-100 scale-105' : 'bg-gray-50'}`}>
                <div className="mb-4">{item.icon}</div>
                <h3 className="font-bold text-gray-900 text-xl mb-3">{item.title}</h3>
                <p className="text-gray-500 leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* TESTIMONIALS */}
      <section className="py-24 bg-gray-50 overflow-hidden">
        <div className="max-w-6xl mx-auto px-8">

          {/* Header */}
          <div className="text-center mb-14">
            <span className="inline-flex items-center gap-1.5 bg-white border border-gray-200 text-gray-500 text-xs font-medium px-4 py-1.5 rounded-full mb-5 shadow-sm">
              <StarIcon className="w-3.5 h-3.5 text-orange-400" />
              Testimonials
            </span>
            <h2 className="text-4xl font-black text-gray-900" style={{ fontFamily: 'Playfair Display, serif' }}>
              What Our <span className="text-orange-500 italic">Customers</span> Are Saying
            </h2>
          </div>

          {/* Scrollable Cards */}
          <div
            ref={scrollRef}
            className="flex gap-5 overflow-x-auto pb-4"
            style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
            {displayTestimonials.map((t, i) => {
              const isCenter = i % 3 === 1
              return (
                <div key={t.id || i}
                  className={`bg-white rounded-3xl flex-shrink-0 overflow-hidden border border-gray-100 transition-all ${
                    isCenter
                      ? 'w-72 shadow-2xl -mt-3'
                      : 'w-64 shadow-md'
                  }`}>

                  {/* Foto atas */}
                  <div className="h-44 overflow-hidden bg-gradient-to-br from-orange-100 to-orange-200 flex-shrink-0">
                    {t.image ? (
                      <img src={t.image} alt={t.name} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <span className="text-7xl font-black text-orange-300 select-none">
                          {(t.name || 'U')[0].toUpperCase()}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Konten */}
                  <div className="p-5">
                    <h3 className="font-bold text-gray-800 text-sm mb-2">
                      {t.city ? `Pelanggan dari ${t.city}` : 'Pelanggan Setia'}
                    </h3>
                    <p className="text-gray-500 text-sm leading-relaxed italic mb-4 line-clamp-3">
                      "{t.text}"
                    </p>

                    {/* Reviewer */}
                    <div className="flex items-center gap-3 pt-3 border-t border-gray-50">
                      <div className="w-9 h-9 rounded-full overflow-hidden bg-orange-100 flex-shrink-0 flex items-center justify-center">
                        {t.image
                          ? <img src={t.image} alt={t.name} className="w-full h-full object-cover" />
                          : <span className="text-xs font-bold text-orange-500">{(t.name || 'U')[0].toUpperCase()}</span>
                        }
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-gray-800">{t.name}</p>
                        <div className="flex gap-0.5 mt-0.5">
                          {[...Array(t.rating || 5)].map((_, j) => (
                            <StarIcon key={j} className="w-3 h-3 text-orange-400" />
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>

          {/* Navigasi panah — bawah tengah */}
          <div className="flex justify-center gap-3 mt-10">
            <button onClick={() => scroll('left')}
              className="w-12 h-12 rounded-full bg-white border-2 border-gray-200 shadow-sm flex items-center justify-center hover:border-orange-500 hover:text-orange-500 hover:bg-orange-50 transition group">
              <ChevronLeftIcon className="w-5 h-5 text-gray-500 group-hover:text-orange-500" />
            </button>
            <button onClick={() => scroll('right')}
              className="w-12 h-12 rounded-full bg-orange-500 border-2 border-orange-500 shadow-sm flex items-center justify-center hover:bg-orange-600 transition">
              <ChevronRightIcon className="w-5 h-5 text-white" />
            </button>
          </div>

          {/* Link ke halaman testimoni */}
          <div className="text-center mt-6">
            <Link to="/testimonials" className="text-orange-500 text-sm font-medium hover:underline">
              Lihat semua ulasan pelanggan →
            </Link>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="bg-gray-900 text-white py-16">
        <div className="max-w-6xl mx-auto px-8 grid grid-cols-4 gap-8">
          <div>
            <div className="flex items-center gap-2 mb-4">
              <img
                src={store.logo}
                alt="Logo" className="h-8 w-auto object-contain"
                onError={e => { e.target.style.display='none' }}
              />
              <span className="text-lg font-black text-orange-500" style={{ fontFamily: 'Playfair Display, serif' }}>
                {store.name}
              </span>
            </div>
            <p className="text-gray-400 text-sm leading-relaxed">
              {store.description}
            </p>
          </div>
          <div>
            <h4 className="font-semibold mb-4 text-white">Jam Buka</h4>
            {store.hours ? (
              store.hours.map((h, i) => (
                <p key={i} className="text-gray-400 text-sm mb-1">
                  {h.day}: {h.closed ? 'Tutup' : `${h.open} – ${h.close}`}
                </p>
              ))
            ) : (
              <>
                <p className="text-gray-400 text-sm mb-1">Senin – Jumat: 09.00 – 18.00</p>
                <p className="text-gray-400 text-sm mb-1">Sabtu: 09.00 – 16.00</p>
                <p className="text-gray-400 text-sm">Minggu: Tutup</p>
              </>
            )}
          </div>
          <div>
            <h4 className="font-semibold mb-4 text-white">Kontak</h4>
            <p className="text-gray-400 text-sm mb-1">{store.address}</p>
            <p className="text-gray-400 text-sm mb-1">{store.phone}</p>
            <p className="text-gray-400 text-sm">{store.email}</p>
          </div>
          <div>
            <h4 className="font-semibold mb-4 text-white">Newsletter</h4>
            <p className="text-gray-400 text-sm mb-3">Dapatkan promo dan menu terbaru.</p>
            <div className="flex">
              <input type="email" placeholder="Email kamu..."
                className="bg-gray-800 text-white px-4 py-2.5 rounded-l-full text-sm flex-1 outline-none placeholder-gray-500 border border-gray-700 border-r-0" />
              <button className="bg-orange-500 px-5 py-2.5 rounded-r-full hover:bg-orange-600 transition text-sm font-semibold border border-orange-500">
                Kirim
              </button>
            </div>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="max-w-6xl mx-auto px-8 mt-10 pt-6 border-t border-gray-800 flex items-center justify-between">
          <p className="text-gray-500 text-sm">
            © {new Date().getFullYear()} {store.name}. All rights reserved.
          </p>
          <div className="flex gap-6">
            <Link to="/menu" className="text-gray-500 text-sm hover:text-orange-500 transition">Menu</Link>
            <Link to="/testimonials" className="text-gray-500 text-sm hover:text-orange-500 transition">Testimoni</Link>
            <Link to="/contact" className="text-gray-500 text-sm hover:text-orange-500 transition">Kontak</Link>
          </div>
        </div>
      </footer>

    </div>
  )
}