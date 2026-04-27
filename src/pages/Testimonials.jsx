import { useState } from 'react'
import { StarIcon } from '@heroicons/react/24/solid'
import { FaceSmileIcon, TruckIcon, HeartIcon, CameraIcon } from '@heroicons/react/24/outline'

const reviews = [
  { name: 'Siti Nurhaliza', city: 'Jakarta', rating: 5, time: '2 hari lalu', text: 'Makanannya enak banget, bumbunya meresap dan porsinya pas. Pengiriman juga cepat!' },
  { name: 'Rizky Pratama', city: 'Bandung', rating: 4, time: '5 hari lalu', text: 'Sudah beberapa kali pesan di sini, selalu puas! Ayam gepreknya juara banget 🔥' },
  { name: 'Anisa Putri', city: 'Surabaya', rating: 5, time: '1 minggu lalu', text: 'Packing rapi, makanan masih hangat sampai. Rasa kopi susunya juga enak dan pas.' },
  { name: 'Budi Santoso', city: 'Yogyakarta', rating: 5, time: '1 minggu lalu', text: 'Tempat favorit kalau lagi males masak. Variasi menunya banyak dan semuanya enak!' },
]

const ratingData = [
  { star: 5, count: 1020 }, { star: 4, count: 180 },
  { star: 3, count: 38 }, { star: 2, count: 8 }, { star: 1, count: 2 },
]
const total = ratingData.reduce((s, r) => s + r.count, 0)

export default function Testimonials() {
  const [rating, setRating] = useState(0)
  const [hover, setHover] = useState(0)
  const [text, setText] = useState('')

  return (
    <div className="min-h-screen bg-orange-50/30">
      {/* HEADER */}
      <div className="text-center py-14 px-4 relative">
        <div className="absolute left-1/2 -translate-x-1/2 top-8 flex justify-between w-80 pointer-events-none">
          <HeartIcon className="w-10 h-10 text-orange-300" />
          <FaceSmileIcon className="w-10 h-10 text-orange-400" />
        </div>
        <h1 className="text-4xl font-black text-gray-900 mt-4" style={{fontFamily:'Playfair Display, serif'}}>
          Testimonial Pelanggan
        </h1>
        <p className="text-gray-400 mt-2">Kata mereka tentang pengalaman menikmati makanan di Dapur Teh Yeyen.</p>
      </div>

      <div className="max-w-5xl mx-auto px-4 pb-16 space-y-8">

        {/* RATING SUMMARY */}
        <div className="bg-white rounded-3xl p-6 shadow-sm grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Kiri - skor */}
          <div className="flex gap-8 items-center">
            <div className="text-center">
              <p className="text-6xl font-black text-orange-500">4.9</p>
              <div className="flex gap-0.5 mt-2 justify-center">
                {[...Array(5)].map((_, i) => <StarIcon key={i} className="w-5 h-5 text-orange-400" />)}
              </div>
              <p className="text-gray-400 text-sm mt-1">({total.toLocaleString()} ulasan)</p>
            </div>
            <div className="flex-1 space-y-2">
              {ratingData.map(r => (
                <div key={r.star} className="flex items-center gap-2">
                  <span className="text-sm text-gray-500 w-3">{r.star}</span>
                  <StarIcon className="w-4 h-4 text-orange-400 flex-shrink-0" />
                  <div className="flex-1 bg-gray-100 rounded-full h-2">
                    <div className="bg-orange-400 h-2 rounded-full" style={{width: `${(r.count/1020)*100}%`}} />
                  </div>
                  <span className="text-sm text-gray-400 w-12 text-right">{r.count.toLocaleString()}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Kanan - stats */}
          <div className="grid grid-cols-3 gap-4">
            {[
              { icon: <FaceSmileIcon className="w-8 h-8 text-yellow-400" />, label: 'Rasa Enak', desc: '98% pelanggan puas dengan rasa makanan', bg: 'bg-yellow-50' },
              { icon: <TruckIcon className="w-8 h-8 text-green-400" />, label: 'Pengiriman Cepat', desc: '95% pesanan sampai tepat waktu', bg: 'bg-green-50' },
              { icon: <HeartIcon className="w-8 h-8 text-purple-400" />, label: 'Pelayanan Ramah', desc: 'Pelanggan merasa dilayani dengan baik', bg: 'bg-purple-50' },
            ].map((s, i) => (
              <div key={i} className={`${s.bg} rounded-2xl p-4 text-center`}>
                <div className="flex justify-center mb-2">{s.icon}</div>
                <p className="font-bold text-gray-800 text-sm">{s.label}</p>
                <p className="text-gray-400 text-xs mt-1">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>

        {/* REVIEW LIST */}
        <div>
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold text-gray-800">Apa Kata Mereka?</h2>
            <select className="border border-gray-200 rounded-xl px-4 py-2 text-sm text-gray-600 outline-none">
              <option>Terbaru</option>
              <option>Rating Tertinggi</option>
            </select>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {reviews.map((r, i) => (
              <div key={i} className="bg-white rounded-2xl p-5 shadow-sm">
                <div className="flex justify-between items-start mb-3">
                  <div className="flex gap-0.5">
                    {[...Array(r.rating)].map((_, j) => <StarIcon key={j} className="w-4 h-4 text-orange-400" />)}
                  </div>
                  <span className="text-gray-400 text-xs">{r.time}</span>
                </div>
                <p className="text-gray-600 text-sm leading-relaxed mb-4">"{r.text}"</p>
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 bg-orange-100 rounded-full flex items-center justify-center font-bold text-orange-500 text-sm">
                    {r.name[0]}
                  </div>
                  <div>
                    <p className="font-semibold text-gray-800 text-sm">{r.name}</p>
                    <p className="text-gray-400 text-xs">{r.city}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* FORM TESTIMONIAL */}
        <div className="bg-white rounded-3xl p-8 shadow-sm text-center">
          <h2 className="text-2xl font-black text-gray-900 mb-1" style={{fontFamily:'Playfair Display, serif'}}>
            Bagikan Pengalamanmu
          </h2>
          <p className="text-gray-400 text-sm mb-8">Yuk, bantu pelanggan lain dengan berbagi pengalamanmu menikmati makanan di Dapur Teh Yeyen.</p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-left">
            {/* Rating */}
            <div>
              <label className="text-sm font-semibold text-gray-700 block mb-3">Beri Rating</label>
              <div className="flex gap-1">
                {[1,2,3,4,5].map(s => (
                  <StarIcon
                    key={s}
                    className={`w-8 h-8 cursor-pointer transition ${s <= (hover || rating) ? 'text-orange-400' : 'text-gray-200'}`}
                    onMouseEnter={() => setHover(s)}
                    onMouseLeave={() => setHover(0)}
                    onClick={() => setRating(s)}
                  />
                ))}
              </div>
            </div>

            {/* Teks */}
            <div>
              <label className="text-sm font-semibold text-gray-700 block mb-3">Tulis Testimonialmu</label>
              <textarea
                value={text}
                onChange={e => setText(e.target.value.slice(0, 500))}
                placeholder="Ceritakan pengalamanmu di sini..."
                rows={4}
                className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-orange-400 transition resize-none"
              />
              <p className="text-right text-xs text-gray-400 mt-1">{text.length}/500</p>
            </div>

            {/* Upload foto */}
            <div>
              <label className="text-sm font-semibold text-gray-700 block mb-3">Foto (Opsional)</label>
              <div className="border-2 border-dashed border-gray-200 rounded-xl p-6 flex flex-col items-center justify-center text-center cursor-pointer hover:border-orange-300 transition h-32">
                <CameraIcon className="w-8 h-8 text-gray-300 mb-2" />
                <p className="text-gray-400 text-sm">Upload Foto</p>
                <p className="text-gray-300 text-xs">PNG, JPG maks. 2MB</p>
              </div>
            </div>
          </div>

          <button className="mt-6 bg-orange-500 text-white px-8 py-3 rounded-full font-semibold hover:bg-orange-600 transition">
            Kirim Testimonial
          </button>
        </div>
      </div>
    </div>
  )
}