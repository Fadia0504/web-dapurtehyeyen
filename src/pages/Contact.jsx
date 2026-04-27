import { useState } from 'react'
import { MapPinIcon, EnvelopeIcon, PhoneIcon, ClockIcon, ChevronRightIcon, PaperAirplaneIcon } from '@heroicons/react/24/outline'

const faqs = [
  'Bagaimana cara melakukan pemesanan?',
  'Metode pembayaran apa saja yang tersedia?',
  'Berapa lama waktu pengiriman makanan?',
  'Bagaimana jika pesanan saya bermasalah?',
  'Apakah bisa membatalkan pesanan?',
]

export default function Contact() {
  const [form, setForm] = useState({ name: '', email: '', subject: '', message: '' })
  const [charCount, setCharCount] = useState(0)

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value })
    if (e.target.name === 'message') setCharCount(e.target.value.length)
  }

  return (
    <div className="min-h-screen bg-orange-50/30">
      {/* HEADER */}
      <div className="text-center py-14 px-4">
        <h1 className="text-4xl font-black text-gray-900" style={{fontFamily:'Playfair Display, serif'}}>
          Contact Us
        </h1>
        <p className="text-gray-400 mt-2">Kami siap membantu! Hubungi kami untuk informasi, saran, atau keluhan.</p>
      </div>

      <div className="max-w-5xl mx-auto px-4 pb-16 space-y-6">

        {/* INFO + FORM */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

          {/* Info Kontak */}
          <div className="bg-white rounded-3xl p-6 shadow-sm">
            <h2 className="text-xl font-bold text-gray-900 mb-1">Informasi Kontak</h2>
            <p className="text-gray-400 text-sm mb-6">Pilih cara yang paling nyaman untuk menghubungi kami.</p>

            <div className="space-y-5">
              {[
                { icon: <MapPinIcon className="w-5 h-5 text-orange-500" />, label: 'Alamat', value: 'Cluster, Pd. Jaya, Kec. Sepatan, Kabupaten Tangerang, Banten 15520' },
                { icon: <EnvelopeIcon className="w-5 h-5 text-orange-500" />, label: 'Email', value: 'Toryen0705.com' },
                { icon: <PhoneIcon className="w-5 h-5 text-orange-500" />, label: 'Telepon / WhatsApp', value: '0812-1120-3366' },
                { icon: <ClockIcon className="w-5 h-5 text-orange-500" />, label: 'Jam Operasional', value: 'Senin-Jumat, 08.00 – 22.00 WIB' },
              ].map((c, i) => (
                <div key={i} className="flex gap-4 items-start">
                  <div className="w-10 h-10 bg-orange-50 rounded-xl flex items-center justify-center flex-shrink-0">
                    {c.icon}
                  </div>
                  <div>
                    <p className="font-semibold text-gray-800 text-sm">{c.label}</p>
                    <p className="text-gray-400 text-sm">{c.value}</p>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-6">
              <p className="text-sm font-semibold text-gray-700 mb-3">Ikuti kami di media sosial</p>
              <div className="flex gap-3">
                {['IG', 'FB', 'TT', 'YT'].map((s, i) => (
                  <div key={i} className="w-9 h-9 bg-gray-100 rounded-full flex items-center justify-center text-xs font-bold text-gray-500 hover:bg-orange-100 hover:text-orange-500 cursor-pointer transition">
                    {s}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Form */}
          <div className="bg-white rounded-3xl p-6 shadow-sm">
            <h2 className="text-xl font-bold text-gray-900 mb-1">Kirim Pesan</h2>
            <p className="text-gray-400 text-sm mb-6">Isi form berikut dan kami akan segera merespon pesanmu.</p>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-700 block mb-1">Nama Lengkap</label>
                  <input name="name" value={form.name} onChange={handleChange}
                    placeholder="Contoh: Budi Santoso"
                    className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-orange-400 transition" />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700 block mb-1">Email</label>
                  <input name="email" value={form.email} onChange={handleChange}
                    placeholder="Contoh: budi@email.com"
                    className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-orange-400 transition" />
                </div>
              </div>

              <div>
                <label className="text-sm font-medium text-gray-700 block mb-1">Subjek</label>
                <select name="subject" value={form.subject} onChange={handleChange}
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-orange-400 transition text-gray-600">
                  <option value="">Pilih subjek</option>
                  <option>Pertanyaan Menu</option>
                  <option>Keluhan Pesanan</option>
                  <option>Kerjasama</option>
                  <option>Lainnya</option>
                </select>
              </div>

              <div>
                <label className="text-sm font-medium text-gray-700 block mb-1">Pesan</label>
                <textarea name="message" value={form.message} onChange={handleChange}
                  placeholder="Tulis pesanmu di sini..."
                  rows={4}
                  maxLength={500}
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-orange-400 transition resize-none" />
                <p className="text-right text-xs text-gray-400">{charCount}/500</p>
              </div>

              <button className="w-full bg-orange-500 text-white py-3 rounded-full font-semibold hover:bg-orange-600 transition flex items-center justify-center gap-2">
                <PaperAirplaneIcon className="w-5 h-5" />
                Kirim Pesan
              </button>
            </div>
          </div>
        </div>

        {/* FAQ + MAP */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

          {/* FAQ */}
          <div className="bg-white rounded-3xl p-6 shadow-sm">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Pertanyaan yang Sering Diajukan</h2>
            <div className="space-y-2">
              {faqs.map((q, i) => (
                <div key={i} className="flex justify-between items-center p-4 rounded-xl hover:bg-orange-50 cursor-pointer transition group">
                  <span className="text-sm text-gray-700 group-hover:text-orange-600">{q}</span>
                  <ChevronRightIcon className="w-4 h-4 text-gray-400 group-hover:text-orange-500 flex-shrink-0" />
                </div>
              ))}
            </div>
            <button className="mt-4 border border-orange-500 text-orange-500 px-6 py-2 rounded-full text-sm font-semibold hover:bg-orange-500 hover:text-white transition">
              Lihat Semua FAQ
            </button>
          </div>

          {/* Map */}
          <div className="bg-white rounded-3xl overflow-hidden shadow-sm">
            <iframe
              title="Lokasi Dapur Teh Yeyen"
              src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3967.0823203630453!2d106.58457747355278!3d-6.11962136000616!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x2e6a01a4cee2f7ad%3A0xbafa4424e464dfaa!2sDapur%20Teh%20Yeyen!5e0!3m2!1sid!2sid!4v1777271286273!5m2!1sid!2sid"
              width="100%"
              height="100%"
              className="min-h-[380px]"
              style={{border:0}}
              allowFullScreen=""
              loading="lazy"
            />
          </div>
        </div>
      </div>
    </div>
  )
}