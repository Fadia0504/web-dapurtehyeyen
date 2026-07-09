import { useEffect, useState } from 'react'
import foodImage from '../../assets/fotoLogin.jpeg'

// Tagline slides for the photo panel. Each slide pairs a short line with the dot indicator below it.
const SLIDES = [
  { title: 'Dari dapur ke meja makanmu', sub: 'Dipesan online, disiapkan dengan hangat.' },
  { title: 'Segar setiap hari', sub: 'Bahan dipilih pagi ini, bukan kemarin.' },
  { title: 'Rasa rumah, disajikan cepat', sub: 'Pantau pesananmu sampai ke depan pintu.' },
]

export default function AuthImagePanel({ imageSrc = foodImage }) {
  const [active, setActive] = useState(0)

  useEffect(() => {
    const id = setInterval(() => setActive(i => (i + 1) % SLIDES.length), 4500)
    return () => clearInterval(id)
  }, [])

  return (
    <div className="relative hidden md:flex flex-col justify-between overflow-hidden min-h-[560px]">
      <img
        src={imageSrc}
        alt="Hidangan Dapur Teh Yeyen"
        className="absolute inset-0 w-full h-full object-cover"
      />
      {/* gradient overlay so the text stays readable on top of the photo */}
      <div className="absolute inset-0 bg-gradient-to-b from-black/50 via-black/10 to-black/70" />

      {/* brand mark */}
      <div className="relative z-10 p-10 flex items-center gap-2">
        <img
          src="https://tgsrztwdaxkjyrerodnh.supabase.co/storage/v1/object/public/food-images/rawr.png"
          alt="Dapur Teh Yeyen"
          className="h-8 w-auto brightness-0 invert opacity-90"
        />
        <span className="font-black text-white/90 text-sm tracking-wide">DAPUR TEH YEYEN</span>
      </div>

      {/* rotating tagline + dots */}
      <div className="relative z-10 p-10">
        <p className="text-white font-bold text-lg leading-snug drop-shadow-sm" style={{ fontFamily: 'Playfair Display, serif' }}>
          {SLIDES[active].title}
        </p>
        <p className="text-white/70 text-sm mt-1 mb-5">{SLIDES[active].sub}</p>
        <div className="flex gap-2">
          {SLIDES.map((_, i) => (
            <button
              key={i}
              onClick={() => setActive(i)}
              aria-label={`Slide ${i + 1}`}
              className={`h-1.5 rounded-full transition-all ${i === active ? 'w-6 bg-orange-400' : 'w-1.5 bg-white/40'}`}
            />
          ))}
        </div>
      </div>
    </div>
  )
}