import { useEffect, useState } from 'react'

// Los tres autos reales, como imagen normal, desde el primer instante: así nadie ve la
// pantalla negra mientras carga el 3D. Cuando la animación 3D arranca, cada imagen se
// acomoda justo sobre su auto 3D (rects) y se desvanece: el paso no se nota.

// Dónde queda cada auto 3D al empezar la animación (medido en la pared 3D): así la imagen
// ya está casi en su lugar y el cambio al 3D no se nota
function startRect(i, n, aspect) {
  const W = window.innerWidth
  const H = Math.max(window.innerHeight, 620)
  const h = Math.min(H * 0.446, W * 0.364)
  const cy = H * (W > H ? 0.41 : 0.372)
  const cx = W / 2 + (i - (n - 1) / 2) * W * 0.256
  const w = h * aspect
  return { left: cx - w / 2, top: cy - h / 2, width: w, height: h }
}

export function HeroCars({ products, rects, hidden }) {
  const [phase, setPhase] = useState('show') // show → align → fade → gone
  useEffect(() => {
    if (!rects) return
    setPhase('align')
    const a = setTimeout(() => setPhase('fade'), 60)
    const b = setTimeout(() => setPhase('gone'), 700)
    return () => {
      clearTimeout(a)
      clearTimeout(b)
    }
  }, [rects])
  if (hidden || phase === 'gone') return null
  const cars = products.filter((p) => p.model.realCarSmall)
  return (
    <div
      data-phase={phase}
      className={`pointer-events-none absolute inset-0 transition-opacity duration-[600ms] ${
        phase === 'fade' ? 'opacity-0' : 'opacity-100'
      }`}
    >
      {rects
        ? cars.map((p, i) =>
            rects[i] ? (
              <img
                key={p.id}
                src={p.model.realCarSmall}
                alt=""
                className="absolute object-contain"
                style={rects[i]}
              />
            ) : null,
          )
        : cars.map((p, i) => {
            const r = startRect(i, cars.length, p.model.realAspect ?? 0.36)
            return (
              <img
                key={p.id}
                src={p.model.realCarSmall}
                alt={p.title}
                fetchPriority="high"
                className="absolute object-contain"
                style={r}
              />
            )
          })}
    </div>
  )
}
