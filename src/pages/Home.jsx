import { Link } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import FoodCard from '../components/FoodCard'
import { StarIcon, TruckIcon, SparklesIcon } from '@heroicons/react/24/solid'
import { ShoppingBagIcon } from '@heroicons/react/24/outline'

export default function Home() {
  const [popularFoods, setPopularFoods] = useState([])

  useEffect(() => {
    supabase.from('foods').select('*, categories(name)')
      .eq('is_available', true).limit(3)
      .then(({ data }) => setPopularFoods(data || []))
  }, [])

  return (
    <div className="font-sans">

      {/* HERO */}
      <section className="relative overflow-hidden bg-white min-h-[90vh] flex items-center">
        <div className="absolute top-0 right-0 w-[55%] h-full bg-orange-400 rounded-bl-[120px] z-0" />
        <div className="relative z-10 max-w-6xl mx-auto px-8 w-full grid grid-cols-2 gap-8 items-center">
          <div>
            <p className="text-orange-500 font-semibold text-sm mb-3 tracking-widest uppercase">— Restaurant</p>
            <h1 className="text-6xl font-black leading-tight text-gray-900 mb-6" style={{fontFamily:'Playfair Display, serif'}}>
              We Serve<br />
              <span className="text-orange-500">Delicious</span> Food
            </h1>
            <p className="text-gray-500 text-lg mb-8 max-w-md leading-relaxed">
              Masakan rumahan yang lezat dan sehat, dibuat dengan bahan-bahan pilihan terbaik setiap harinya.
            </p>
            <Link to="/menu"
              className="inline-flex items-center gap-2 bg-orange-500 text-white px-8 py-4 rounded-full font-semibold text-lg hover:bg-orange-600 transition-all hover:scale-105 shadow-lg shadow-orange-200">
              <ShoppingBagIcon className="w-5 h-5" />
              Pesan Sekarang
            </Link>
          </div>

          {/* Hero Image Area */}
          <div className="relative flex justify-center items-center h-[480px]">
            {/* Main circle - foto makanan utama */}
            <div className="w-80 h-80 bg-white rounded-full shadow-2xl overflow-hidden border-4 border-white">
              <img
                src="https://tgsrztwdaxkjyrerodnh.supabase.co/storage/v1/object/public/food-images/nasi-goreng.jpeg"
                alt="Featured Food"
                className="w-full h-full object-cover"
                onError={(e) => { e.target.style.display='none'; e.target.parentElement.innerHTML='<div class="w-full h-full bg-orange-50 flex items-center justify-center text-8xl">🍛</div>' }}
              />
            </div>
            {/* Bubble kecil - foto lain */}
            <div className="absolute top-6 right-10 w-20 h-20 bg-white rounded-full shadow-lg overflow-hidden border-2 border-white">
              <img
                src="https://tgsrztwdaxkjyrerodnh.supabase.co/storage/v1/object/public/food-images/nasi-kebuli.jpeg"
                alt="Food 2"
                className="w-full h-full object-cover"
                onError={(e) => { e.target.style.display='none'; e.target.parentElement.innerHTML='<div class="w-full h-full bg-orange-50 flex items-center justify-center text-2xl">🥗</div>' }}
              />
            </div>
            <div className="absolute bottom-10 right-6 w-16 h-16 bg-white rounded-full shadow-lg overflow-hidden border-2 border-white">
              <img
                src="https://tgsrztwdaxkjyrerodnh.supabase.co/storage/v1/object/public/food-images/klepon.jpeg"
                alt="Food 3"
                className="w-full h-full object-cover"
                onError={(e) => { e.target.style.display='none'; e.target.parentElement.innerHTML='<div class="w-full h-full bg-orange-50 flex items-center justify-center text-2xl">🍜</div>' }}
              />
            </div>
            <div className="absolute bottom-16 left-6 w-16 h-16 bg-white rounded-full shadow-lg overflow-hidden border-2 border-white">
              <img
                src="https://tgsrztwdaxkjyrerodnh.supabase.co/storage/v1/object/public/food-images/nasi-goreng.jpeg"
                alt="Food 4"
                className="w-full h-full object-cover"
                onError={(e) => { e.target.style.display='none'; e.target.parentElement.innerHTML='<div class="w-full h-full bg-orange-50 flex items-center justify-center text-2xl">🍲</div>' }}
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
            {/* Foto about us */}
            <div className="relative z-10 w-72 h-72 rounded-3xl shadow-xl overflow-hidden ml-8 border-4 border-white">
              <img
                src="https://tgsrztwdaxkjyrerodnh.supabase.co/storage/v1/object/public/food-images/nasi-kebuli.jpeg"
                alt="About Us"
                className="w-full h-full object-cover"
                onError={(e) => { e.target.style.display='none'; e.target.parentElement.innerHTML='<div class="w-full h-full bg-orange-50 flex items-center justify-center text-8xl">🍱</div>' }}
              />
            </div>
          </div>
          <div>
            <h2 className="text-4xl font-black text-gray-900 mb-4" style={{fontFamily:'Playfair Display, serif'}}>
              About <span className="text-orange-500">Us</span>
            </h2>
            <p className="text-gray-500 leading-relaxed mb-6">
              Kami menyajikan makanan sehat dan lezat yang mudah dijangkau. Setiap hidangan dibuat dengan cinta menggunakan bahan-bahan segar pilihan. Kepuasan pelanggan adalah prioritas utama kami.
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
          <h2 className="text-4xl font-black text-center text-gray-900 mb-2" style={{fontFamily:'Playfair Display, serif'}}>
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
          <h2 className="text-4xl font-black text-center text-gray-900 mb-12" style={{fontFamily:'Playfair Display, serif'}}>
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

      {/* TESTIMONIAL */}
      <section className="py-24 bg-gray-50">
        <div className="max-w-6xl mx-auto px-8">
          <h2 className="text-4xl font-black text-center text-gray-900 mb-12" style={{fontFamily:'Playfair Display, serif'}}>
            Customers <span className="text-orange-500">Say</span>
          </h2>
          <div className="grid grid-cols-3 gap-6">
            {[
              { name: 'Siti Rahayu', rating: 5, text: 'Makanannya enak banget! Nasi gorengnya juara, selalu jadi pilihan makan siang keluarga.' },
              { name: 'Budi Santoso', rating: 5, text: 'Pengiriman cepat, makanan masih hangat. Mie gorengnya recommended banget!' },
              { name: 'Dewi Lestari', rating: 5, text: 'Harga terjangkau, porsi besar, rasa tidak kalah sama restoran mewah. Langganan terus!' },
            ].map((t, i) => (
              <div key={i} className="bg-white p-6 rounded-3xl shadow-sm">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center text-xl font-bold text-orange-500">
                    {t.name[0]}
                  </div>
                  <div>
                    <p className="font-semibold text-gray-800">{t.name}</p>
                    <div className="flex gap-0.5 mt-0.5">
                      {[...Array(t.rating)].map((_, i) => (
                        <StarIcon key={i} className="w-4 h-4 text-orange-400" />
                      ))}
                    </div>
                  </div>
                </div>
                <p className="text-gray-500 italic leading-relaxed">"{t.text}"</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="bg-gray-900 text-white py-16">
        <div className="max-w-6xl mx-auto px-8 grid grid-cols-4 gap-8">
          <div>
            <h3 className="text-xl font-black text-orange-500 mb-4">🍜 Dapur Teh Yeyen</h3>
            <p className="text-gray-400 text-sm leading-relaxed">Masakan rumahan yang lezat, sehat, dan terjangkau.</p>
          </div>
          <div>
            <h4 className="font-semibold mb-4">Jam Buka</h4>
            <p className="text-gray-400 text-sm">Sen–Jum: 09.00–18.00</p>
            <p className="text-gray-400 text-sm">Sabtu: 09.00–16.00</p>
            <p className="text-gray-400 text-sm">Minggu: Tutup</p>
          </div>
          <div>
            <h4 className="font-semibold mb-4">Kontak</h4>
            <p className="text-gray-400 text-sm">Jakarta, Indonesia</p>
            <p className="text-gray-400 text-sm">+62 812-3456-7890</p>
            <p className="text-gray-400 text-sm">dapur@tehyeyen.com</p>
          </div>
          <div>
            <h4 className="font-semibold mb-4">Subscribe</h4>
            <div className="flex">
              <input type="email" placeholder="Email kamu..."
                className="bg-gray-800 text-white px-4 py-2 rounded-l-full text-sm flex-1 outline-none" />
              <button className="bg-orange-500 px-4 py-2 rounded-r-full hover:bg-orange-600 transition">→</button>
            </div>
          </div>
        </div>
      </footer>

    </div>
  )
}