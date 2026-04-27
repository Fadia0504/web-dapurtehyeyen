import { Link } from 'react-router-dom'
import { useCartStore } from '../store/cartStore'

export default function Cart() {
  const { items, removeItem, updateQty, total } = useCartStore()

  if (items.length === 0) return (
    <div className="flex flex-col items-center justify-center min-h-[70vh] text-center px-4">
      <div className="text-8xl mb-6">🛒</div>
      <h2 className="text-2xl font-bold text-gray-800 mb-2">Keranjang Kosong</h2>
      <p className="text-gray-400 mb-8">Yuk tambahkan makanan favoritmu!</p>
      <Link to="/menu"
        className="bg-orange-500 text-white px-8 py-3 rounded-full font-semibold hover:bg-orange-600 transition">
        Lihat Menu
      </Link>
    </div>
  )

  return (
    <div className="max-w-4xl mx-auto px-4 py-12">
      <h2 className="text-3xl font-bold text-gray-800 mb-8" style={{fontFamily:'Playfair Display, serif'}}>
        Keranjang <span className="text-orange-500">Belanja</span>
      </h2>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* List Items */}
        <div className="lg:col-span-2 space-y-4">
          {items.map(item => (
            <div key={item.id} className="bg-white rounded-2xl p-4 flex gap-4 shadow-sm border border-gray-100">
              <div className="w-20 h-20 rounded-xl overflow-hidden bg-orange-50 flex-shrink-0">
                {item.image ? (
                  <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-3xl">🍽️</div>
                )}
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-gray-800">{item.name}</h3>
                <p className="text-orange-500 font-bold mt-1">
                  Rp {item.price.toLocaleString('id-ID')}
                </p>
                <div className="flex items-center gap-3 mt-2">
                  <button
                    onClick={() => updateQty(item.id, item.qty - 1)}
                    className="w-8 h-8 rounded-full border border-gray-200 flex items-center justify-center hover:bg-orange-50 hover:border-orange-300 transition font-bold text-gray-600">
                    −
                  </button>
                  <span className="font-semibold w-6 text-center">{item.qty}</span>
                  <button
                    onClick={() => updateQty(item.id, item.qty + 1)}
                    className="w-8 h-8 rounded-full border border-gray-200 flex items-center justify-center hover:bg-orange-50 hover:border-orange-300 transition font-bold text-gray-600">
                    +
                  </button>
                  <button
                    onClick={() => removeItem(item.id)}
                    className="ml-auto text-red-400 hover:text-red-600 text-sm transition">
                    Hapus
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Summary */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 h-fit">
          <h3 className="font-bold text-gray-800 text-lg mb-4">Ringkasan Pesanan</h3>
          <div className="space-y-3 mb-4">
            {items.map(item => (
              <div key={item.id} className="flex justify-between text-sm text-gray-500">
                <span>{item.name} x{item.qty}</span>
                <span>Rp {(item.price * item.qty).toLocaleString('id-ID')}</span>
              </div>
            ))}
          </div>
          <div className="border-t border-gray-100 pt-4 mb-6">
            <div className="flex justify-between font-bold text-gray-800 text-lg">
              <span>Total</span>
              <span className="text-orange-500">Rp {total().toLocaleString('id-ID')}</span>
            </div>
          </div>
          <Link to="/checkout"
            className="block w-full bg-orange-500 text-white text-center py-3 rounded-full font-semibold hover:bg-orange-600 transition">
            Lanjut Checkout →
          </Link>
          <Link to="/menu"
            className="block w-full text-center text-gray-400 text-sm mt-3 hover:text-orange-500 transition">
            + Tambah Menu Lain
          </Link>
        </div>
      </div>
    </div>
  )
}