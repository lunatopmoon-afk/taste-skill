import { lazy, Suspense, useEffect, useMemo, useState } from 'react'
import { motion } from 'motion/react'
import {
  ArrowsOutCardinal,
  Lightbulb,
  LightbulbFilament,
  ShoppingBagOpen,
  SteeringWheel,
  Wind,
  X,
} from '@phosphor-icons/react'
import { formatMoney } from '../lib/shopify.js'

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
  const [photo, setPhoto] = useState(null)
  const variant = product.variants.find((v) => v.id === variantId) ?? product.variants[0]
  const optionName = useMemo(() => frameOptionName(product.options), [product.options])
  const finish = optionName
    ? variant?.selectedOptions.find((o) => o.name === optionName)?.value
    : undefined
  const showVariants = product.variants.length > 1
  const photos = product.images?.length ? product.images : product.model.photos

  useEffect(() => {
    const onKey = (e) => {
      if (e.key !== 'Escape') return
      if (photo) setPhoto(null)
      else onClose()
    }
    window.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
    }
  }, [onClose, photo])

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
        <Suspense fallback={null}>
          <FrameViewer
            product={product}
            finish={finish}
            open={open}
            ledOn={ledOn}
            drsOpen={drsOpen}
            onToggleOpen={() => setOpen((o) => !o)}
          />
        </Suspense>
        <p className="pointer-events-none absolute bottom-4 left-4 right-4 flex items-center gap-2 font-mono text-[11px] uppercase tracking-widest text-dim">
          <ArrowsOutCardinal size={14} weight="bold" />
          {open
            ? 'Mueve el cursor: las ruedas delanteras giran contigo'
            : 'Arrastra para girar · doble clic saca el auto'}
        </p>
        <button
          onClick={onClose}
          className="absolute right-4 top-4 grid size-11 place-items-center rounded-full border border-line bg-pit/80 text-chalk backdrop-blur transition hover:border-chalk"
          aria-label="Cerrar"
        >
          <X size={18} weight="bold" />
        </button>
      </div>

      <aside className="flex flex-col gap-7 overflow-y-auto border-line bg-pit px-6 py-8 lg:border-l lg:px-10 lg:py-12">
        <div>
          <p className="font-mono text-xs uppercase tracking-widest text-dim">
            N.º {product.number} · {product.model.code}
          </p>
          <h2 className="mt-2 text-3xl font-semibold leading-[1.05] tracking-tighter md:text-4xl">
            {product.title}
          </h2>
          <p className="mt-3 font-mono text-xl text-signal">
            {formatMoney(variant?.price ?? product.price)}
          </p>
        </div>

        <p className="max-w-[60ch] text-[15px] leading-relaxed text-dim">
          {product.description || product.model.blurb}
        </p>

        {photos.length > 0 && (
          <div>
            <p className="mb-3 font-mono text-xs uppercase tracking-widest text-dim">Fotos reales</p>
            <div className="flex gap-2">
              {photos.map((src) => (
                <button
                  key={src}
                  onClick={() => setPhoto(src)}
                  className="aspect-[4/5] w-20 overflow-hidden rounded-lg border border-line transition hover:border-chalk"
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
          <p className="font-mono text-xs uppercase tracking-widest text-dim">Interactúa</p>
          <div className="grid grid-cols-2 gap-2">
            <Toggle
              on={ledOn}
              onClick={() => setLedOn((v) => !v)}
              iconOn={<LightbulbFilament size={18} weight="fill" />}
              iconOff={<Lightbulb size={18} />}
              labelOn="LED encendido"
              labelOff="LED apagado"
            />
            <Toggle
              on={drsOpen}
              onClick={() => setDrsOpen((v) => !v)}
              iconOn={<Wind size={18} weight="bold" />}
              iconOff={<Wind size={18} />}
              labelOn="DRS abierto"
              labelOff="Abrir DRS"
            />
          </div>
          <Toggle
            on={open}
            onClick={() => setOpen((o) => !o)}
            iconOn={<SteeringWheel size={18} weight="fill" />}
            iconOff={<SteeringWheel size={18} />}
            labelOn="Colgar el auto de nuevo"
            labelOff="Sacar el auto del cuadro"
          />
          <button
            onClick={() => onAdd(product, variant)}
            disabled={busy || !variant?.availableForSale}
            className="mt-2 flex items-center justify-center gap-2 rounded-full bg-signal px-6 py-4 text-sm font-semibold text-asphalt transition hover:brightness-110 active:scale-[0.98] disabled:opacity-50"
          >
            <ShoppingBagOpen size={18} weight="bold" />
            {variant?.availableForSale ? 'Agregar al carrito' : 'Agotado'}
          </button>
        </div>
      </aside>

      {photo && (
        <button
          className="fixed inset-0 z-[60] grid place-items-center bg-black/90 p-6"
          onClick={() => setPhoto(null)}
          aria-label="Cerrar foto"
        >
          <img src={photo} alt={product.title} className="max-h-full max-w-full rounded-lg object-contain" />
        </button>
      )}
    </motion.div>
  )
}
