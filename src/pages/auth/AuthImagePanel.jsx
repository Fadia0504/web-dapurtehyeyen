import { useEffect, useState } from 'react'

// Tagline slides for the dark panel. Each slide pairs a short line with the dot indicator below it.
const SLIDES = [
  { title: 'Dari dapur ke meja makanmu', sub: 'Dipesan online, disiapkan dengan hangat.' },
  { title: 'Segar setiap hari', sub: 'Bahan dipilih pagi ini, bukan kemarin.' },
  { title: 'Rasa rumah, disajikan cepat', sub: 'Pantau pesananmu sampai ke depan pintu.' },
]

export default function AuthImagePanel() {
  const [active, setActive] = useState(0)

  useEffect(() => {
    const id = setInterval(() => setActive(i => (i + 1) % SLIDES.length), 4500)
    return () => clearInterval(id)
  }, [])

  return (
    <div className="relative hidden md:flex flex-col justify-between overflow-hidden bg-[#241208] p-10 min-h-[560px]">
      <style>{`
        @keyframes steam-rise {
          0%   { transform: translateY(0) scaleX(1); opacity: 0; }
          15%  { opacity: .55; }
          50%  { transform: translateY(-34px) scaleX(1.25); opacity: .35; }
          100% { transform: translateY(-72px) scaleX(1.5); opacity: 0; }
        }
        .steam-thread { animation: steam-rise 3.6s ease-in-out infinite; transform-origin: bottom center; }
        .steam-thread.d2 { animation-delay: 1.1s; }
        .steam-thread.d3 { animation-delay: 2.2s; }
        @keyframes ember-drift {
          0%   { transform: translate(0,0); opacity: 0; }
          20%  { opacity: .8; }
          100% { transform: translate(var(--dx), -140px); opacity: 0; }
        }
        .ember { animation: ember-drift 5.5s ease-in infinite; }
      `}</style>

      {/* background glow */}
      <div className="pointer-events-none absolute -top-24 -right-16 w-72 h-72 rounded-full bg-orange-600/20 blur-3xl" />
      <div className="pointer-events-none absolute bottom-0 left-0 w-64 h-64 rounded-full bg-orange-900/40 blur-3xl" />

      {/* embers */}
      {[...Array(10)].map((_, i) => (
        <span
          key={i}
          className="ember pointer-events-none absolute w-1 h-1 rounded-full bg-orange-400/70"
          style={{
            left: `${8 + ((i * 37) % 84)}%`,
            bottom: `${10 + ((i * 23) % 40)}%`,
            animationDelay: `${(i * 0.6) % 5.5}s`,
            '--dx': `${(i % 2 === 0 ? 1 : -1) * (10 + (i * 5) % 30)}px`,
          }}
        />
      ))}

      {/* brand mark */}
      <div className="relative z-10 flex items-center gap-2">
        <img
          src="https://tgsrztwdaxkjyrerodnh.supabase.co/storage/v1/object/public/food-images/rawr.png"
          alt="Dapur Teh Yeyen"
          className="h-8 w-auto brightness-0 invert opacity-90"
        />
        <span className="font-black text-white/90 text-sm tracking-wide">DAPUR TEH YEYEN</span>
      </div>

      {/* signature: teacup with rising steam */}
      <div className="relative z-10 flex-1 flex items-center justify-center py-8">
        <svg width="180" height="180" viewBox="0 0 180 180" fill="none">
          <ellipse cx="90" cy="150" rx="46" ry="7" fill="#000" opacity="0.25" />
          <path d="M52 96 h76 l-8 42 a14 14 0 0 1-14 12 H74 a14 14 0 0 1-14-12 Z" fill="#FFEDD5" opacity="0.95" />
          <path d="M56 100 h68 l-1 6 H57 Z" fill="#f97316" opacity="0.85" />
          <path d="M128 104 q22-2 22 16 q0 20-24 18" stroke="#FFEDD5" strokeWidth="6" fill="none" opacity="0.9" />
          <g className="steam-thread" opacity="0.6">
            <path d="M76 92 q-8-14 0-26 q8-12 0-24" stroke="#FDBA74" strokeWidth="4" strokeLinecap="round" fill="none" />
          </g>
          <g className="steam-thread d2" opacity="0.6">
            <path d="M92 92 q8-12 0-24 q-8-12 0-24" stroke="#FDBA74" strokeWidth="4" strokeLinecap="round" fill="none" />
          </g>
          <g className="steam-thread d3" opacity="0.6">
            <path d="M106 92 q-6-13 2-23 q7-10 1-21" stroke="#FDBA74" strokeWidth="4" strokeLinecap="round" fill="none" />
          </g>
        </svg>
      </div>

      {/* rotating tagline + dots */}
      <div className="relative z-10">
        <p className="text-white font-bold text-lg leading-snug" style={{ fontFamily: 'Playfair Display, serif' }}>
          {SLIDES[active].title}
        </p>
        <p className="text-white/50 text-sm mt-1 mb-5">{SLIDES[active].sub}</p>
        <div className="flex gap-2">
          {SLIDES.map((_, i) => (
            <button
              key={i}
              onClick={() => setActive(i)}
              aria-label={`Slide ${i + 1}`}
              className={`h-1.5 rounded-full transition-all ${i === active ? 'w-6 bg-orange-400' : 'w-1.5 bg-white/25'}`}
            />
          ))}
        </div>
      </div>
    </div>
  )
}