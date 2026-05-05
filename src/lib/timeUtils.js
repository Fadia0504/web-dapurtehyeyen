export function parseUTC(dateStr) {
  if (!dateStr) return new Date()
  const str =
    typeof dateStr === 'string' &&
    !dateStr.includes('Z') &&
    !dateStr.includes('+')
      ? dateStr + 'Z'
      : dateStr
  return new Date(str)
}

export function formatTimeAgo(date) {
  const d = parseUTC(date instanceof Date ? date.toISOString() : date)
  const diff = Math.floor((Date.now() - d) / 1000)
  if (diff < 10) return 'Baru saja'
  if (diff < 60) return `${diff} detik lalu`
  if (diff < 3600) return `${Math.floor(diff / 60)} menit lalu`
  if (diff < 86400) return `${Math.floor(diff / 3600)} jam lalu`
  if (diff < 604800) return `${Math.floor(diff / 86400)} hari lalu`
  return `${Math.floor(diff / 604800)} minggu lalu`
}

export function formatDateTime(date) {
  const d = parseUTC(date instanceof Date ? date.toISOString() : date)
  return {
    date: d.toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      timeZone: 'Asia/Jakarta',
    }),
    time:
      d.toLocaleTimeString('id-ID', {
        hour: '2-digit',
        minute: '2-digit',
        timeZone: 'Asia/Jakarta',
      }) + ' WIB',
  }
}