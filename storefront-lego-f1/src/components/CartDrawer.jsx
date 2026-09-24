import { motion } from 'motion/react'
import { Minus, Plus, X } from '@phosphor-icons/react'
import { formatMoney, isShopifyConfigured } from '../lib/shopify.js'

export function CartDrawer({ cart, busy, error, onClose, onQuantity }) {
  const lines = cart?.lines.nodes ?? []

  return (
    <>
      <motion.div
        className="fixed inset-0 z-40 bg-black/60"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
      />
      <motion.aside
        className="fixed inset-y-0 right-0 z-50 flex w-full max-w-md flex-col border-l border-line bg-pit"
        initial={{ x: '100%' }}
        animate={{ x: 0 }}
        exit={{ x: '100%' }}
        transition={{ type: 'spring', stiffness: 320, damping: 34 }}
        aria-label="Carrito"
      >
        <header className="flex items-center justify-between border-b border-line px-6 py-5">
          <h2 className="font-mono text-xs uppercase tracking-widest text-dim">
            Carrito · {cart?.totalQuantity ?? 0}
          </h2>
          <button onClick={onClose} className="grid size-10 place-items-center" aria-label="Cerrar carrito">
            <X size={18} weight="bold" />
          </button>
        </header>

        <ul className="flex-1 divide-y divide-line overflow-y-auto px-6">
          {lines.length === 0 && (
            <li className="py-16 text-center text-sm text-dim">Todavía no hay cuadros en tu pared.</li>
          )}
          {lines.map((line) => (
            <li key={line.id} className="flex items-center gap-4 py-5">
              <div className="flex-1">
                <p className="font-medium">{line.merchandise.product.title}</p>
                <p className="text-sm text-dim">{line.merchandise.title}</p>
                <p className="mt-1 font-mono text-sm">{formatMoney(line.merchandise.price)}</p>
              </div>
              <div className="flex items-center rounded-full border border-line">
                <button
                  className="grid size-9 place-items-center disabled:opacity-40"
                  onClick={() => onQuantity(line, line.quantity - 1)}
                  disabled={busy}
                  aria-label="Quitar uno"
                >
                  <Minus size={14} />
                </button>
                <span className="w-6 text-center font-mono text-sm">{line.quantity}</span>
                <button
                  className="grid size-9 place-items-center disabled:opacity-40"
                  onClick={() => onQuantity(line, line.quantity + 1)}
                  disabled={busy}
                  aria-label="Agregar uno"
                >
                  <Plus size={14} />
                </button>
              </div>
            </li>
          ))}
        </ul>

        <footer className="grid gap-4 border-t border-line px-6 py-6">
          {error && <p className="text-sm text-red-400">{error}</p>}
          <div className="flex items-baseline justify-between">
            <span className="text-sm text-dim">Subtotal</span>
            <span className="font-mono text-lg">
              {cart ? formatMoney(cart.cost.subtotalAmount) : '—'}
            </span>
          </div>
          {isShopifyConfigured ? (
            <a
              href={cart?.checkoutUrl ?? undefined}
              aria-disabled={!lines.length}
              className={`rounded-full btn-gold px-6 py-4 text-center text-sm font-semibold ${
                lines.length ? '' : 'pointer-events-none opacity-40'
              }`}
            >
              Ir a pagar
            </a>
          ) : (
            <p className="rounded-2xl border border-dashed border-line px-4 py-3 text-xs leading-relaxed text-dim">
              Modo demo: conecta tu tienda en el archivo <code className="font-mono">.env</code> para
              que el botón de pago lleve al checkout de Shopify.
            </p>
          )}
        </footer>
      </motion.aside>
    </>
  )
}
