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

  const handleOpen = () => {
    setOpen(prev => !prev)
    // JANGAN markAllRead saat buka — biarkan user baca dulu
  }

  const handleMarkAllRead = () => {
    markAllRead()
  }

  const handleClose = () => {
    setOpen(false)
  }

  return (
    <div className="relative" ref={ref}>
      {/* Tombol bel */}
      <button
        onClick={handleOpen}
        className="relative w-10 h-10 flex items-center justify-center rounded-xl hover:bg-gray-50 text-gray-500 hover:text-orange-500 transition">
        <BellIcon className="w-6 h-6" />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 bg-red-500 text-white text-xs min-w-[18px] h-[18px] px-1 rounded-full flex items-center justify-center font-bold leading-none">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-3 w-80 bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden z-50">

          {/* Header */}
          <div className="flex justify-between items-center px-4 py-3 border-b border-gray-100">
            <div className="flex items-center gap-2">
              <h3 className="font-bold text-gray-900 text-sm">Notifikasi</h3>
              {unreadCount > 0 && (
                <span className="bg-red-500 text-white text-xs px-1.5 py-0.5 rounded-full font-bold">
                  {unreadCount} baru
                </span>
              )}
            </div>
            <div className="flex items-center gap-2">
              {unreadCount > 0 && (
                <button onClick={handleMarkAllRead}
                  className="text-xs text-orange-500 hover:underline font-medium">
                  Tandai semua dibaca
                </button>
              )}
              <button onClick={handleClose}
                className="w-6 h-6 rounded-lg hover:bg-gray-100 flex items-center justify-center transition">
                <XMarkIcon className="w-4 h-4 text-gray-400" />
              </button>
            </div>
          </div>

          {/* List */}
          <div className="max-h-80 overflow-y-auto divide-y divide-gray-50">
            {notifications.length === 0 ? (
              <div className="text-center py-10 text-gray-400">
                <BellIcon className="w-10 h-10 mx-auto mb-2 text-gray-200" />
                <p className="text-sm font-medium text-gray-500">Belum ada notifikasi</p>
                <p className="text-xs text-gray-400 mt-1">Notifikasi pesanan baru akan muncul di sini</p>
              </div>
            ) : notifications.map((notif, i) => (
              <div key={i}
                onClick={() => markRead(notif.id)}
                className={`flex items-start gap-3 px-4 py-3 cursor-pointer transition hover:bg-gray-50 ${
                  !notif.read ? 'bg-orange-50/60' : 'bg-white'
                }`}>

                {/* Icon */}
                <div className={`w-9 h-9 ${notif.color || 'bg-orange-100'} rounded-xl flex items-center justify-center flex-shrink-0 text-base`}>
                  {notif.icon}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <p className={`text-xs font-semibold ${!notif.read ? 'text-gray-900' : 'text-gray-700'}`}>
                      {notif.title}
                    </p>
                    {!notif.read && (
                      <div className="w-2 h-2 bg-orange-500 rounded-full flex-shrink-0 mt-1" />
                    )}
                  </div>
                  <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">{notif.message}</p>
                  <p className="text-xs text-gray-400 mt-1">{notif.time}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Footer */}
          {notifications.length > 0 && (
            <div className="px-4 py-3 border-t border-gray-100 flex items-center justify-between">
              <p className="text-xs text-gray-400">
                {unreadCount > 0 ? `${unreadCount} belum dibaca` : 'Semua sudah dibaca'}
              </p>
              <button onClick={handleMarkAllRead}
                className="text-xs text-orange-500 font-medium hover:underline">
                Tandai semua dibaca
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}