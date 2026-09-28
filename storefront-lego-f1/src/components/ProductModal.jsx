import { lazy, Suspense, useEffect, useMemo, useState } from 'react'
import { motion } from 'motion/react'
import {
  ArrowsOutCardinal,
  CaretLeft,
  CaretRight,
  Cube,
  CubeFocus,
  Images,
  Lightbulb,
  LightbulbFilament,
  ShoppingBagOpen,
  SteeringWheel,
  Wind,
  X,
} from '@phosphor-icons/react'
import { formatMoney } from '../lib/shopify.js'

const SMALL_SCREEN =
  typeof window !== 'undefined' && Math.min(window.innerWidth, window.innerHeight) < 700

const SIDE_PHOTO_MASK =
  'linear-gradient(to right, transparent, #000 9%, #000 91%, transparent), linear-gradient(to bottom, transparent, #000 6%, #000 94%, transparent)'

const FrameViewer = lazy(() =>
  import('../three/FrameViewer.jsx').then((m) => ({ default: m.FrameViewer })),
)

// Busca la opción que define el marco (Marco / Frame / Acabado / Color).
function frameOptionName(options) {
  return options.find((o) => /(marco|frame|acabado|finish|color)/i.test(o.name))?.name
}

function Toggle({ on, onClick, iconOn, iconOff, labelOn, labelOff }) {
  return (
    <button
      onClick={onClick}
      aria-pressed={on}
      className={`flex items-center justify-center gap-2 rounded-full border px-4 py-3 text-sm font-medium transition active:scale-[0.98] ${
        on ? 'border-chalk bg-chalk text-asphalt' : 'border-line text-chalk hover:border-chalk'
      }`}
    >
      {on ? iconOn : iconOff}
      {on ? labelOn : labelOff}
    </button>
  )
}

export function ProductModal({ product, onClose, onAdd, busy }) {
  const [variantId, setVariantId] = useState(product.variants[0]?.id)
  const [open, setOpen] = useState(false)
  const [ledOn, setLedOn] = useState(true)
  const [drsOpen, setDrsOpen] = useState(false)
  const [sideView, setSideView] = useState(false)
  const hasPhoto = Boolean(product.model.poster)
  const sidePhoto = SMALL_SCREEN ? product.model.sidePhotoSmall : product.model.sidePhoto
  const showSidePhoto = sideView && Boolean(sidePhoto)
  const [tilt, setTilt] = useState({ x: 0, y: 0 })
  // Cuando la foto de costado ya tapa el visor, el 3D deja de dibujar (ahorra GPU y batería)
  const [paused, setPaused] = useState(false)
  useEffect(() => {
    if (!showSidePhoto) {
      setPaused(false)
      return
    }
    const t = setTimeout(() => setPaused(true), 1400)
    return () => clearTimeout(t)
  }, [showSidePhoto])
  const variant = product.variants.find((v) => v.id === variantId) ?? product.variants[0]
  const optionName = useMemo(() => frameOptionName(product.options), [product.options])
  const finish = optionName
    ? variant?.selectedOptions.find((o) => o.name === optionName)?.value
    : undefined
  const showVariants = product.variants.length > 1
  const photos = product.images?.length ? product.images : product.model.photos
  // Al abrir se ven las fotos del producto; el 3D se abre con el botón "Ver en 3D"
  const [view, setView] = useState(photos.length ? 'photos' : '3d')
  const [photoIndex, setPhotoIndex] = useState(0)
  const show3d = view === '3d'
  const step = (d) => setPhotoIndex((i) => (i + d + photos.length) % photos.length)

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') onClose()
      if (!show3d && photos.length > 1) {
        if (e.key === 'ArrowRight') step(1)
        if (e.key === 'ArrowLeft') step(-1)
      }
    }
    window.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
    }
  }, [onClose, show3d, photos.length])

  return (
    <motion.div
      className="fixed inset-0 z-50 grid bg-asphalt lg:grid-cols-[1fr_440px]"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      role="dialog"
      aria-modal="true"
      aria-label={product.title}
    >
      <div className="relative min-h-[55dvh] lg:min-h-0">
        {show3d ? (
          <>
            <Suspense fallback={null}>
              <FrameViewer
                product={product}
                finish={finish}
                open={open}
                ledOn={ledOn}
                drsOpen={drsOpen}
                sideView={sideView}
                paused={paused}
                onToggleOpen={() => !hasPhoto && setOpen((o) => !o)}
              />
            </Suspense>

            {/* Vista lateral: el cuadro 3D gira y se funde con la foto REAL de costado */}
            {sidePhoto && (
              <button
                type="button"
                onPointerMove={(e) => {
                  const r = e.currentTarget.getBoundingClientRect()
                  setTilt({
                    x: (e.clientX - r.left) / r.width - 0.5,
                    y: (e.clientY - r.top) / r.height - 0.5,
                  })
                }}
                onPointerLeave={() => setTilt({ x: 0, y: 0 })}
                aria-label="Foto de costado"
                tabIndex={showSidePhoto ? 0 : -1}
                className={`absolute inset-0 block overflow-hidden bg-[#0b0b0c] transition-opacity ease-out ${
                  showSidePhoto
                    ? 'opacity-100 delay-500 duration-700'
                    : 'pointer-events-none opacity-0 duration-300'
                }`}
              >
                <img
                  src={sidePhoto}
                  alt={`${product.title}, vista de costado`}
                  decoding="async"
                  className="absolute left-1/2 top-1/2 h-full w-auto max-w-none transition-transform duration-500 ease-out"
                  style={{
                    // bordes difuminados para que la foto se funda con el fondo del visor
                    maskImage: SIDE_PHOTO_MASK,
                    WebkitMaskImage: SIDE_PHOTO_MASK,
                    maskComposite: 'intersect',
                    WebkitMaskComposite: 'source-in',
                    transform: `translate(-50%, -50%) perspective(1400px) rotateY(${tilt.x * 5}deg) rotateX(${-tilt.y * 4}deg) scale(1.02)`,
                  }}
                />
              </button>
            )}
            <p className="pointer-events-none absolute bottom-4 left-4 right-4 z-10 flex items-center gap-2 font-mono text-[11px] uppercase tracking-widest text-dim">
              <ArrowsOutCardinal size={14} weight="bold" />
              {showSidePhoto
                ? 'Foto real de costado'
                : hasPhoto
                  ? 'Desliza a los lados para ver cómo sobresale el LEGO'
                  : open
                    ? 'Mueve el cursor: las ruedas delanteras giran contigo'
                    : 'Arrastra para girar · doble clic saca el auto'}
            </p>
            <button
              onClick={() => setView('photos')}
              className="glass absolute left-4 top-4 z-10 flex items-center gap-2 rounded-full px-4 py-3 text-sm font-medium text-chalk transition hover:border-chalk"
            >
              <Images size={18} />
              Ver fotos
            </button>
          </>
        ) : (
          <div className="absolute inset-0 bg-[#0b0b0c]">
            {/* Fotos del producto (las de Shopify), en este mismo panel */}
            {photos.map((src, i) => (
              <img
                key={src}
                src={src}
                alt={`${product.title}, foto ${i + 1}`}
                decoding="async"
                className={`absolute inset-0 size-full object-contain p-4 transition-opacity duration-500 md:p-8 ${
                  i === photoIndex ? 'opacity-100' : 'opacity-0'
                }`}
              />
            ))}
            {photos.length > 1 && (
              <>
                <button
                  onClick={() => step(-1)}
                  aria-label="Foto anterior"
                  className="glass absolute left-4 top-1/2 z-10 grid size-11 -translate-y-1/2 place-items-center rounded-full text-chalk transition hover:border-chalk"
                >
                  <CaretLeft size={18} weight="bold" />
                </button>
                <button
                  onClick={() => step(1)}
                  aria-label="Foto siguiente"
                  className="glass absolute right-4 top-1/2 z-10 grid size-11 -translate-y-1/2 place-items-center rounded-full text-chalk transition hover:border-chalk"
                >
                  <CaretRight size={18} weight="bold" />
                </button>
                <div className="absolute inset-x-0 bottom-24 z-10 flex justify-center gap-2">
                  {photos.map((src, i) => (
                    <button
                      key={src}
                      onClick={() => setPhotoIndex(i)}
                      aria-label={`Foto ${i + 1}`}
                      className={`h-1.5 rounded-full transition-all ${
                        i === photoIndex ? 'w-6 bg-signal' : 'w-1.5 bg-chalk/40'
                      }`}
                    />
                  ))}
                </div>
              </>
            )}
            <button
              onClick={() => setView('3d')}
              className="btn-gold absolute bottom-6 left-1/2 z-10 flex -translate-x-1/2 items-center gap-3 rounded-full px-8 py-4 text-base font-semibold shadow-[0_18px_50px_-12px_rgba(228,192,126,0.6)] active:scale-[0.98]"
            >
              <Cube size={22} weight="bold" />
              Ver en 3D
            </button>
          </div>
        )}
        <button
          onClick={onClose}
          className="absolute right-4 top-4 z-10 grid size-11 place-items-center rounded-full border border-line bg-pit/80 text-chalk backdrop-blur transition hover:border-chalk"
          aria-label="Cerrar"
        >
          <X size={18} weight="bold" />
        </button>
      </div>

      <aside className="flex flex-col gap-7 overflow-y-auto border-line bg-[#09090a] px-6 py-8 lg:border-l lg:px-10 lg:py-12">
        <div>
          <p className="font-mono text-xs uppercase tracking-widest text-dim">
            N.º {product.number} · {product.model.code}
          </p>
          <h2 className="mt-2 text-3xl font-semibold leading-[1.05] tracking-tighter md:text-4xl">
            {product.title}
          </h2>
          <p className="gold-text mt-4 inline-block font-display text-4xl font-semibold tracking-tight md:text-5xl">
            {formatMoney(variant?.price ?? product.price)}
          </p>
        </div>

        <p className="max-w-[60ch] text-[15px] leading-relaxed text-dim">
          {product.description || product.model.blurb}
        </p>

        {photos.length > 0 && (
          <div>
            <p className="mb-3 font-mono text-xs uppercase tracking-widest text-dim">Fotos</p>
            <div className="flex flex-wrap gap-2">
              {photos.map((src, i) => (
                <button
                  key={src}
                  onClick={() => {
                    setPhotoIndex(i)
                    setView('photos')
                  }}
                  aria-label={`Ver foto ${i + 1}`}
                  className={`aspect-[4/5] w-20 overflow-hidden rounded-lg border transition hover:border-chalk ${
                    !show3d && i === photoIndex ? 'border-signal' : 'border-line'
                  }`}
                >
                  <img src={src} alt="" loading="lazy" className="size-full object-cover" />
                </button>
              ))}
            </div>
          </div>
        )}

        {showVariants && (
          <fieldset>
            <legend className="mb-3 font-mono text-xs uppercase tracking-widest text-dim">
              {optionName ?? 'Opción'}
            </legend>
            <div className="flex flex-wrap gap-2">
              {product.variants.map((v) => (
                <button
                  key={v.id}
                  onClick={() => setVariantId(v.id)}
                  disabled={!v.availableForSale}
                  className={`rounded-full border px-4 py-2 text-sm transition disabled:opacity-40 ${
                    v.id === variant?.id
                      ? 'border-signal bg-signal text-asphalt'
                      : 'border-line text-chalk hover:border-chalk'
                  }`}
                >
                  {v.title}
                </button>
              ))}
            </div>
          </fieldset>
        )}

        <div className="mt-auto grid gap-3">
          {show3d ? (
            <>
              <p className="font-mono text-xs uppercase tracking-widest text-dim">
                Interactúa en 3D
              </p>
              <div className="grid grid-cols-2 gap-2">
                {hasPhoto && (
                  <Toggle
                    on={sideView}
                    onClick={() => setSideView((v) => !v)}
                    iconOn={<CubeFocus size={18} weight="fill" />}
                    iconOff={<CubeFocus size={18} />}
                    labelOn="Vista de frente"
                    labelOff="Vista lateral"
                  />
                )}
                <Toggle
                  on={ledOn}
                  onClick={() => setLedOn((v) => !v)}
                  iconOn={<LightbulbFilament size={18} weight="fill" />}
                  iconOff={<Lightbulb size={18} />}
                  labelOn="LED encendido"
                  labelOff="LED apagado"
                />
                {!hasPhoto && (
                  <Toggle
                    on={drsOpen}
                    onClick={() => setDrsOpen((v) => !v)}
                    iconOn={<Wind size={18} weight="bold" />}
                    iconOff={<Wind size={18} />}
                    labelOn="DRS abierto"
                    labelOff="Abrir DRS"
                  />
                )}
              </div>
              {!hasPhoto && (
                <Toggle
                  on={open}
                  onClick={() => setOpen((o) => !o)}
                  iconOn={<SteeringWheel size={18} weight="fill" />}
                  iconOff={<SteeringWheel size={18} />}
                  labelOn="Colgar el auto de nuevo"
                  labelOff="Sacar el auto del cuadro"
                />
              )}
            </>
          ) : (
            <button
              onClick={() => setView('3d')}
              className="flex items-center justify-center gap-2 rounded-full border border-signal/60 px-6 py-4 text-sm font-semibold text-signal transition hover:bg-signal hover:text-asphalt active:scale-[0.98]"
            >
              <Cube size={18} weight="bold" />
              Ver en 3D
            </button>
          )}
          <button
            onClick={() => onAdd(product, variant)}
            disabled={busy || !variant?.availableForSale}
            className="mt-2 flex items-center justify-center gap-2 rounded-full btn-gold px-6 py-4 text-sm font-semibold active:scale-[0.98] disabled:opacity-50"
          >
            <ShoppingBagOpen size={18} weight="bold" />
            {variant?.availableForSale ? 'Agregar al carrito' : 'Agotado'}
          </button>
        </div>
      </aside>
    </motion.div>
  )
}
