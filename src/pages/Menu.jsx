import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import FoodCard from '../components/FoodCard'

export default function Menu() {
  const [foods, setFoods] = useState([])
  const [categories, setCategories] = useState([])
  const [activeCategory, setActiveCategory] = useState('Semua')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchData()
  }, [])

  async function fetchData() {
    const { data: cats } = await supabase.from('categories').select('*')
    const { data: foodData } = await supabase
      .from('foods')
      .select('*, categories(name)')
      .eq('is_available', true)

    setCategories([{ name: 'Semua' }, ...cats])
    setFoods(foodData)
    setLoading(false)
  }

  const filtered = activeCategory === 'Semua'
    ? foods
    : foods.filter(f => f.categories?.name === activeCategory)

  if (loading) return (
    <div className="flex justify-center items-center min-h-[60vh]">
      <p className="text-gray-400 text-lg">Loading menu...</p>
    </div>
  )

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <h2 className="text-3xl font-bold text-gray-800 mb-6">Menu Kami</h2>

      {/* Filter Kategori */}
      <div className="flex gap-3 mb-8 flex-wrap">
        {categories.map(cat => (
          <button
            key={cat.name}
            onClick={() => setActiveCategory(cat.name)}
            className={`px-5 py-2 rounded-full text-sm font-medium transition ${
              activeCategory === cat.name
                ? 'bg-orange-500 text-white'
                : 'bg-white text-gray-600 border border-gray-200 hover:border-orange-300'
            }`}
          >
            {cat.name}
          </button>
        ))}
      </div>

      {/* Grid Menu */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {filtered.map(food => (
          <FoodCard key={food.id} food={food} />
        ))}
      </div>
    </div>
  )
}