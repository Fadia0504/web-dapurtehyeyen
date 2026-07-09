import AuthImagePanel from './AuthImagePanel'

// imageSide: 'left' | 'right' — which side the dark image panel sits on.
// edgeLabel: short word printed vertically on the outer edge, opposite the image panel.
export default function AuthShell({ imageSide = 'left', edgeLabel, children }) {
  return (
    <div className="min-h-screen relative flex items-center justify-center px-4 py-10 bg-[#fdf6ee] overflow-hidden">
      {/* ambient texture */}
      <div className="pointer-events-none absolute inset-0 opacity-[0.4]"
        style={{ background: 'radial-gradient(circle at 15% 20%, #fed7aa55, transparent 45%), radial-gradient(circle at 85% 80%, #fdba7444, transparent 50%)' }} />

      {edgeLabel && (
        <span
          className={`hidden lg:block absolute top-1/2 -translate-y-1/2 text-orange-900/30 font-black text-sm tracking-[0.3em] select-none ${
            imageSide === 'left' ? 'right-6' : 'left-6'
          }`}
          style={{ writingMode: 'vertical-rl' }}
        >
          {edgeLabel}
        </span>
      )}

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