import { useState, useRef, useEffect } from 'react'
import { BellIcon, XMarkIcon } from '@heroicons/react/24/outline'
import { useRealtimeNotifications } from '../../hooks/useRealtimeNotifications'

export default function AdminNotifBell() {
  const { notifications, unreadCount, markAllRead, markRead } = useRealtimeNotifications()
  const [open, setOpen] = useState(false)
  const ref = useRef()

  useEffect(() => {
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => { setOpen(prev => !prev); if (!open) markAllRead() }}
        className="relative text-gray-500 hover:text-orange-500 transition">
        <BellIcon className="w-6 h-6" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs w-5 h-5 rounded-full flex items-center justify-center font-bold animate-pulse">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-3 w-80 bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden z-50">
          {/* Header */}
          <div className="flex justify-between items-center px-4 py-3 border-b border-gray-100">
            <h3 className="font-bold text-gray-900 text-sm">Notifikasi</h3>
            <div className="flex items-center gap-2">
              <button onClick={markAllRead} className="text-xs text-orange-500 hover:underline">
                Tandai semua dibaca
              </button>
              <button onClick={() => setOpen(false)}
                className="w-6 h-6 rounded-lg hover:bg-gray-100 flex items-center justify-center">
                <XMarkIcon className="w-4 h-4 text-gray-400" />
              </button>
            </div>
          </div>

          {/* List */}
          <div className="max-h-80 overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="text-center py-8 text-gray-400">
                <BellIcon className="w-8 h-8 mx-auto mb-2 text-gray-200" />
                <p className="text-sm">Belum ada notifikasi</p>
              </div>
            ) : notifications.map((notif, i) => (
              <div key={i}
                onClick={() => markRead(notif.id)}
                className={`flex items-start gap-3 px-4 py-3 border-b border-gray-50 cursor-pointer transition hover:bg-gray-50 ${!notif.read ? 'bg-orange-50/50' : ''}`}>
                <div className={`w-9 h-9 ${notif.color} rounded-xl flex items-center justify-center flex-shrink-0 text-base`}>
                  {notif.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-xs font-semibold text-gray-800">{notif.title}</p>
                    {!notif.read && <div className="w-2 h-2 bg-orange-500 rounded-full flex-shrink-0 mt-1" />}
                  </div>
                  <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">{notif.message}</p>
                  <p className="text-xs text-gray-400 mt-1">{notif.time}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Footer */}
          <div className="px-4 py-3 border-t border-gray-100">
            <button className="w-full text-center text-xs text-orange-500 font-medium hover:underline">
              Lihat semua notifikasi
            </button>
          </div>
        </div>
      )}
    </div>
  )
}