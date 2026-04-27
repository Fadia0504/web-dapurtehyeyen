import { create } from 'zustand'

export const useCartStore = create((set, get) => ({
  items: [],

  addItem: (food) => {
    const items = get().items
    const existing = items.find(i => i.id === food.id)
    if (existing) {
      set({ items: items.map(i => i.id === food.id ? { ...i, qty: i.qty + 1 } : i) })
    } else {
      set({ items: [...items, { ...food, qty: 1 }] })
    }
  },

  removeItem: (id) => set({ items: get().items.filter(i => i.id !== id) }),

  updateQty: (id, qty) => {
    if (qty <= 0) return get().removeItem(id)
    set({ items: get().items.map(i => i.id === id ? { ...i, qty } : i) })
  },

  clearCart: () => set({ items: [] }),

  total: () => get().items.reduce((sum, i) => sum + i.price * i.qty, 0),
}))