import { useEffect, useState } from 'react'

// Largada de F1 al abrir la página: bandas de carrera que cruzan la pantalla, el semáforo
// enciende sus 5 luces rojas una por una y al apagarse ("lights out") se abre la página y
// caen los autos. Es solo HTML/CSS (no carga la GPU) y tapa el tiempo en que carga el 3D.
// Se muestra una vez por visita; tocar la pantalla la salta.

const STEP = 0.42 // segundos entre luz y luz (como la largada real: ~1 s, aquí más ágil)
const FIRST = 0.75 // primera luz
const OUT = FIRST + STEP * 4 + 0.7 // se apagan todas
const END = OUT + 0.85 // la cortina termina de subir

export function shouldShowLightsOut() {
  if (typeof window === 'undefined') return false
  if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return false
  if (new URLSearchParams(window.location.search).has('introT')) return false
  try {
    return sessionStorage.getItem('lights-out') !== '1'
  } catch {
    return true
  }
}

export function LightsOut({ onGo, onDone }) {
  const [out, setOut] = useState(false)
  useEffect(() => {
    try {
      sessionStorage.setItem('lights-out', '1')
    } catch {
      /* modo privado: no pasa nada */
    }
    // las luces se animan por CSS (compositor): siguen fluidas aunque el 3D ocupe el hilo
    const timers = []
    timers.push(
      setTimeout(() => {
        setOut(true)
        onGo?.() // los autos empiezan a caer mientras sube la cortina
      }, OUT * 1000),
    )
    timers.push(setTimeout(onDone, END * 1000))
    return () => timers.forEach(clearTimeout)
  }, [onGo, onDone])

  return (
    <div
      className={`lights-out fixed inset-0 z-[70] grid cursor-pointer place-items-center overflow-hidden bg-asphalt ${
        out ? 'lights-out--gone' : ''
      }`}
      onClick={() => {
        onGo?.()
        onDone()
      }}
      role="presentation"
    >
      {/* bandas de carrera: cuadros y franjas que cruzan en diagonal */}
      <div className="race-stripes" aria-hidden>
        <span className="race-stripe race-stripe--checker" />
        <span className="race-stripe race-stripe--gold" />
        <span className="race-stripe race-stripe--red" />
        <span className="race-stripe race-stripe--thin" />
      </div>

      <div className="relative flex flex-col items-center gap-8 px-6">
        {/* semáforo: viga negra con 5 columnas de 4 luces; se encienden las 2 de abajo */}
        <div className="gantry" aria-hidden>
          {[0, 1, 2, 3, 4].map((c) => (
            <div
              key={c}
              className="gantry-col"
              style={{ '--on': `${FIRST + STEP * c}s`, '--off': `${OUT}s` }}
            >
              {[0, 1, 2, 3].map((r) => (
                <span key={r} className={`gantry-light ${r >= 2 ? 'is-red' : ''}`} />
              ))}
            </div>
          ))}
        </div>
        <p
          className={`font-mono text-[11px] uppercase tracking-[0.5em] transition-all duration-300 ${
            out ? 'scale-110 text-signal' : 'text-dim'
          }`}
        >
          {out ? 'Lights out' : 'F1 Luxury Edition'}
        </p>
      </div>
      <p className="absolute bottom-6 font-mono text-[10px] uppercase tracking-widest text-dim/60">
        Toca para saltar
      </p>
    </div>
  )
}
