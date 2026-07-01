import { useCartStore } from '../store/cartStore'
import { StarIcon } from '@heroicons/react/24/solid'

export default function FoodCard({ food }) {
  const addItem = useCartStore(state => state.addItem)

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-lg transition-all hover:-translate-y-1 flex flex-col h-full">
      {/* Gambar — aspect-ratio tetap supaya card tidak acak-acakan */}
      <div className="relative w-full aspect-[4/3] overflow-hidden bg-orange-50 flex-shrink-0">
        {food.image ? (
          <img
            src={food.image}
            alt={food.name}
            className="w-full h-full object-cover hover:scale-105 transition-transform duration-300"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-6xl">🍽️</div>
        )}
        {food.sold_count > 0 && (
          <div className="absolute top-2 left-2 bg-black/60 text-white text-[11px] px-2 py-1 rounded-full font-medium">
            {food.sold_count}+ terjual
          </div>
        )}
      </div>

      {/* Konten */}
      <div className="p-4 flex flex-col flex-1">
        <h3 className="font-semibold text-gray-800 text-base leading-snug line-clamp-1">{food.name}</h3>
        <p className="text-gray-400 text-xs mt-1 mb-2 line-clamp-2 min-h-[2.2em]">{food.description}</p>

        {(food.rating > 0 || food.sold_count > 0) && (
          <div className="flex items-center gap-1 mb-2">
            <StarIcon className="w-3.5 h-3.5 text-orange-400" />
            <span className="text-xs text-gray-500 font-medium">
              {food.rating > 0 ? food.rating : '-'}
            </span>
          </div>
        )}

        <div className="mt-auto flex justify-between items-center gap-2">
          <span className="text-orange-500 font-bold text-base whitespace-nowrap">
            Rp {food.price?.toLocaleString('id-ID')}
          </span>
          <button
            onClick={() => addItem(food)}
            className="bg-orange-500 text-white px-3.5 py-2 rounded-full text-xs font-semibold hover:bg-orange-600 transition flex-shrink-0"
          >
            + Tambah
          </button>
        </div>
      </div>
    </div>
  )
}