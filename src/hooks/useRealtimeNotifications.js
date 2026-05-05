import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { formatDateTime } from '../lib/timeUtils'

export function useRealtimeNotifications() {
  const [notifications, setNotifications] = useState([])
  const [unreadCount, setUnreadCount] = useState(0)

  useEffect(() => {
    fetchInitialNotifications()

    const channel = supabase
      .channel('realtime-orders')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'orders' },
        (payload) => {
          const newOrder = payload.new
          const now = new Date()
          const notif = {
            id: newOrder.id,
            type: 'new_order',
            title: 'Pesanan Baru Masuk!',
            message: `${newOrder.customer_name || 'Pelanggan'} memesan senilai Rp ${newOrder.total?.toLocaleString('id-ID')}`,
            time:
              now.toLocaleTimeString('id-ID', {
                hour: '2-digit',
                minute: '2-digit',
                timeZone: 'Asia/Jakarta',
              }) + ' WIB',
            read: false,
            color: 'bg-orange-100 text-orange-500',
            icon: '🛒',
          }
          setNotifications((prev) => [notif, ...prev])
          setUnreadCount((prev) => prev + 1)
        }
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'orders' },
        (payload) => {
          const updated = payload.new
          const statusLabels = {
            confirmed: 'dikonfirmasi',
            processing: 'sedang diproses',
            delivered: 'sedang dikirim',
            done: 'selesai',
            cancelled: 'dibatalkan',
          }
          if (statusLabels[updated.status]) {
            const now = new Date()
            const notif = {
              id: `${updated.id}-${updated.status}`,
              type: 'status_update',
              title: 'Status Pesanan Diupdate',
              message: `Pesanan #${updated.id.slice(0, 8).toUpperCase()} ${statusLabels[updated.status]}`,
              time:
                now.toLocaleTimeString('id-ID', {
                  hour: '2-digit',
                  minute: '2-digit',
                  timeZone: 'Asia/Jakarta',
                }) + ' WIB',
              read: false,
              color:
                updated.status === 'done'
                  ? 'bg-green-100 text-green-500'
                  : updated.status === 'cancelled'
                  ? 'bg-red-100 text-red-500'
                  : 'bg-blue-100 text-blue-500',
              icon:
                updated.status === 'done'
                  ? '✅'
                  : updated.status === 'cancelled'
                  ? '❌'
                  : '📦',
            }
            setNotifications((prev) => [notif, ...prev])
            setUnreadCount((prev) => prev + 1)
          }
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [])

  async function fetchInitialNotifications() {
    const { data } = await supabase
      .from('orders')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(10)

    if (data) {
      const notifs = data.map((order) => {
        const { time } = formatDateTime(order.created_at)
        return {
          id: order.id,
          type: 'new_order',
          title: 'Pesanan Masuk',
          message: `${order.customer_name || 'Pelanggan'} memesan senilai Rp ${order.total?.toLocaleString('id-ID')}`,
          time,
          read: true,
          color: 'bg-orange-100 text-orange-500',
          icon: '🛒',
        }
      })
      setNotifications(notifs)
    }
  }

  const markAllRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })))
    setUnreadCount(0)
  }

  const markRead = (id) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n))
    )
    setUnreadCount((prev) => Math.max(0, prev - 1))
  }

  return { notifications, unreadCount, markAllRead, markRead }
}