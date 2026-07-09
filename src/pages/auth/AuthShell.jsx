import AuthImagePanel from './AuthImagePanel'

// imageSide: 'left' | 'right' — which side the photo panel sits on.
export default function AuthShell({ imageSide = 'left', children }) {
  return (
    <div className="min-h-screen relative flex items-center justify-center px-4 py-10 bg-[#fdf6ee] overflow-hidden">
      {/* ambient texture */}
      <div className="pointer-events-none absolute inset-0 opacity-[0.4]"
        style={{ background: 'radial-gradient(circle at 15% 20%, #fed7aa55, transparent 45%), radial-gradient(circle at 85% 80%, #fdba7444, transparent 50%)' }} />

      <div className="relative w-full max-w-4xl grid grid-cols-1 md:grid-cols-2 rounded-[2rem] overflow-hidden shadow-2xl shadow-orange-950/10 bg-white">
        <div className={imageSide === 'left' ? 'order-1' : 'order-1 md:order-2'}>
          <AuthImagePanel />
        </div>
        <div className={`flex flex-col justify-center p-8 md:p-12 ${imageSide === 'left' ? 'order-2' : 'order-2 md:order-1'}`}>
          {children}
        </div>
      </div>
    </div>
  )
}