import { Link } from 'react-router-dom'

export default function Success() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[70vh] text-center px-4">
      <div className="text-8xl mb-6">🎉</div>
      <h2 className="text-3xl font-bold text-gray-800 mb-3" style={{fontFamily:'Playfair Display, serif'}}>
        Pesanan <span className="text-orange-500">Berhasil!</span>
      </h2>
      <p className="text-gray-500 mb-8 max-w-md">
        Terima kasih sudah memesan! Pesananmu sedang kami proses dan akan segera dikirim.
      </p>
      <Link to="/"
        className="bg-orange-500 text-white px-8 py-3 rounded-full font-semibold hover:bg-orange-600 transition">
        Kembali ke Home
      </Link>
    </div>
  )
}