import { lazy, Suspense, useEffect, useMemo, useState } from 'react'
import { motion } from 'motion/react'
import { ArrowsOutCardinal, Door, DoorOpen, ShoppingBagOpen, X } from '@phosphor-icons/react'
import { formatMoney } from '../lib/shopify.js'

const FrameViewer = lazy(() =>
  import('../three/FrameViewer.jsx').then((m) => ({ default: m.FrameViewer })),
)

// Busca la opción que define el marco (Marco / Frame / Acabado / Color).
function frameOptionName(options) {
  return options.find((o) => /(marco|frame|acabado|finish|color)/i.test(o.name))?.name
}

export function ProductModal({ product, onClose, onAdd, busy }) {
  const [variantId, setVariantId] = useState(product.variants[0]?.id)
  const [open, setOpen] = useState(false)
  const variant = product.variants.find((v) => v.id === variantId) ?? product.variants[0]
  const optionName = useMemo(() => frameOptionName(product.options), [product.options])
  const finish = optionName
    ? variant?.selectedOptions.find((o) => o.name === optionName)?.value
    : variant?.title

  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
    }
  }, [onClose])

  return (
    <motion.div
      className="fixed inset-0 z-50 grid bg-asphalt lg:grid-cols-[1fr_420px]"
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
            onToggleOpen={() => setOpen((o) => !o)}
          />
        </Suspense>
        <p className="pointer-events-none absolute bottom-4 left-4 flex items-center gap-2 font-mono text-[11px] uppercase tracking-widest text-dim">
          <ArrowsOutCardinal size={14} weight="bold" />
          Arrastra para girar · doble clic abre la vitrina
        </p>
        <button
          onClick={onClose}
          className="absolute right-4 top-4 grid size-11 place-items-center rounded-full border border-line bg-pit/80 text-chalk backdrop-blur transition hover:border-chalk"
          aria-label="Cerrar"
        >
          <X size={18} weight="bold" />
        </button>
      </div>

      <aside className="flex flex-col gap-8 overflow-y-auto border-line bg-pit px-6 py-8 lg:border-l lg:px-10 lg:py-14">
        <div>
          <p className="font-mono text-xs uppercase tracking-widest text-dim">N.º {product.number}</p>
          <h2 className="mt-2 text-4xl font-semibold tracking-tighter">{product.title}</h2>
          <p className="mt-3 font-mono text-xl text-signal">
            {formatMoney(variant?.price ?? product.price)}
          </p>
        </div>

        {product.description && (
          <p className="max-w-[60ch] text-[15px] leading-relaxed text-dim">{product.description}</p>
        )}

        {product.variants.length > 1 && (
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
          <button
            onClick={() => setOpen((o) => !o)}
            className="flex items-center justify-center gap-2 rounded-full border border-line px-6 py-4 text-sm font-medium transition hover:border-chalk active:scale-[0.98]"
          >
            {open ? <Door size={18} /> : <DoorOpen size={18} />}
            {open ? 'Colgar el auto de nuevo' : 'Abrir vitrina y sacar el auto'}
          </button>
          <button
            onClick={() => onAdd(product, variant)}
            disabled={busy || !variant?.availableForSale}
            className="flex items-center justify-center gap-2 rounded-full bg-signal px-6 py-4 text-sm font-semibold text-asphalt transition hover:brightness-110 active:scale-[0.98] disabled:opacity-50"
          >
            <ShoppingBagOpen size={18} weight="bold" />
            {variant?.availableForSale ? 'Agregar al carrito' : 'Agotado'}
          </button>
        </div>
      </aside>
    </motion.div>
  )
}
