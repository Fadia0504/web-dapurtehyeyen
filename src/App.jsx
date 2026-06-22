import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuthStore } from './store/authStore'
import Home from './pages/Home'
import Menu from './pages/Menu'
import Cart from './pages/Cart'
import Checkout from './pages/Checkout'
import Success from './pages/Success'
import Testimonials from './pages/Testimonials'
import Contact from './pages/Contact'
import Login from './pages/Login'
import Register from './pages/Register'
import Dashboard from './pages/Dashboard'
import AdminDashboard from './pages/admin/AdminDashboard'
import Navbar from './components/Navbar'
import FoodDetail from './pages/FoodDetail'
import Payment from './pages/Payment'
import AdminFoods from './pages/admin/AdminFoods'
import AdminOrders from './pages/admin/AdminOrders'
import AdminCategories from './pages/admin/AdminCategories'
import AdminCustomers from './pages/admin/AdminCustomers'
import AdminReviews from './pages/admin/AdminReviews'
import AdminReports from './pages/admin/AdminReports'
import AdminKasir from './pages/admin/AdminKasir'
import AdminKasirHistory from './pages/admin/AdminKasirHistory'
import AdminManageRoles from './pages/admin/AdminManageRoles'

// Loading spinner
function LoadingScreen() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <div className="w-10 h-10 border-2 border-orange-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
        <p className="text-gray-400 text-sm">Memuat...</p>
      </div>
    </div>
  )
}

// Guard: hanya admin yang bisa akses
function AdminOnlyRoute({ children }) {
  const { user, profile, loading } = useAuthStore()
  if (loading) return <LoadingScreen />
  if (!user || !profile) return <Navigate to="/login" replace />
  if (profile.role !== 'admin') {
    // staff diarahkan ke kasir
    if (profile.role === 'staff') return <Navigate to="/admin/kasir" replace />
    // customer diarahkan ke home
    return <Navigate to="/" replace />
  }
  return children
}

// Guard: admin & staff bisa akses (khusus kasir & riwayat)
function StaffRoute({ children }) {
  const { user, profile, loading } = useAuthStore()
  if (loading) return <LoadingScreen />
  if (!user || !profile) return <Navigate to="/login" replace />
  if (profile.role !== 'admin' && profile.role !== 'staff') {
    return <Navigate to="/" replace />
  }
  return children
}

// Guard: customer route — redirect admin/staff ke /admin
function CustomerRoute({ children }) {
  const { profile, loading } = useAuthStore()
  if (loading) return <LoadingScreen />
  if (profile?.role === 'admin') return <Navigate to="/admin" replace />
  if (profile?.role === 'staff') return <Navigate to="/admin/kasir" replace />
  return children
}

function App() {
  return (
    <Routes>

      {/* ===== ADMIN ONLY (tidak termasuk kasir) ===== */}
      <Route path="/admin" element={<AdminOnlyRoute><AdminDashboard /></AdminOnlyRoute>} />
      <Route path="/admin/orders" element={<AdminOnlyRoute><AdminOrders /></AdminOnlyRoute>} />
      <Route path="/admin/foods" element={<AdminOnlyRoute><AdminFoods /></AdminOnlyRoute>} />
      <Route path="/admin/categories" element={<AdminOnlyRoute><AdminCategories /></AdminOnlyRoute>} />
      <Route path="/admin/customers" element={<AdminOnlyRoute><AdminCustomers /></AdminOnlyRoute>} />
      <Route path="/admin/reviews" element={<AdminOnlyRoute><AdminReviews /></AdminOnlyRoute>} />
      <Route path="/admin/reports" element={<AdminOnlyRoute><AdminReports /></AdminOnlyRoute>} />
      <Route path="/admin/manage-roles" element={<AdminOnlyRoute><AdminManageRoles /></AdminOnlyRoute>} />

      {/* ===== STAFF & ADMIN (kasir) ===== */}
      <Route path="/admin/kasir" element={<StaffRoute><AdminKasir /></StaffRoute>} />
      <Route path="/admin/kasir/history" element={<StaffRoute><AdminKasirHistory /></StaffRoute>} />

      {/* ===== PUBLIC + CUSTOMER (dengan Navbar) ===== */}
      <Route path="/*" element={
        <>
          <Navbar />
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/menu" element={<Menu />} />
            <Route path="/menu/:id" element={<FoodDetail />} />
            <Route path="/testimonials" element={<Testimonials />} />
            <Route path="/contact" element={<Contact />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            {/* Customer only */}
            <Route path="/cart" element={<CustomerRoute><Cart /></CustomerRoute>} />
            <Route path="/checkout" element={<CustomerRoute><Checkout /></CustomerRoute>} />
            <Route path="/payment" element={<CustomerRoute><Payment /></CustomerRoute>} />
            <Route path="/success" element={<CustomerRoute><Success /></CustomerRoute>} />
            <Route path="/dashboard" element={<CustomerRoute><Dashboard /></CustomerRoute>} />
          </Routes>
        </>
      } />

    </Routes>
  )
}

export default App