import { useCartStore } from '../store/cartStore'

export default function FoodCard({ food }) {
  const addItem = useCartStore(state => state.addItem)

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-lg transition-all hover:-translate-y-1">
      <div className="h-48 overflow-hidden bg-orange-50">
        {food.image ? (
          <img
            src={food.image}
            alt={food.name}
            className="w-full h-full object-cover hover:scale-105 transition-transform duration-300"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-6xl">🍽️</div>
        )}
      </div>
      <div className="p-4">
        <h3 className="font-semibold text-gray-800 text-lg">{food.name}</h3>
        <p className="text-gray-400 text-sm mt-1 mb-3 line-clamp-2">{food.description}</p>
        <div className="flex justify-between items-center">
          <span className="text-orange-500 font-bold text-lg">
            Rp {food.price.toLocaleString('id-ID')}
          </span>
          <button
            onClick={() => addItem(food)}
            className="bg-orange-500 text-white px-4 py-2 rounded-full text-sm hover:bg-orange-600 transition"
          >
            + Tambah
          </button>
        </div>
      </div>
    </div>
  )
}