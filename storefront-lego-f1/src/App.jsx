import { lazy, Suspense, useCallback, useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { ArrowLeft, ArrowRight, Cube, ShoppingBag } from '@phosphor-icons/react'
import { fetchCatalog, formatMoney, isShopifyConfigured } from './lib/shopify.js'
import { DEMO_PRODUCTS } from './lib/demoProducts.js'
import { useCart } from './lib/useCart.js'
import { ProductModal } from './components/ProductModal.jsx'
import { CartDrawer } from './components/CartDrawer.jsx'

const GalleryWall = lazy(() =>
  import('./three/GalleryWall.jsx').then((m) => ({ default: m.GalleryWall })),
)

// Ajusta estos textos a las características reales de tus cuadros.
const SPECS = [
  ['Auto LEGO Technic armado', 'El modelo completo, armado pieza por pieza y fijado al fondo en vista cenital, con sus ruedas, alerones y suspensión.'],
  ['Luz LED', 'Línea de luz alrededor del póster o retroiluminación que baña la pared, según el modelo.'],
  ['Fondo del equipo', 'Póster con el color de la escudería y el nombre del auto al pie.'],
  ['Marco negro', 'Perfil delgado negro mate para que todo el protagonismo sea del auto.'],
]

export default function App() {
  const [products, setProducts] = useState(DEMO_PRODUCTS)
  const [shopName, setShopName] = useState('F1 Luxury Edition')
  const [loadError, setLoadError] = useState(null)
  const [active, setActive] = useState(0)
  const [selected, setSelected] = useState(null)
  const [cartOpen, setCartOpen] = useState(false)
  const { cart, busy, error, add, setQuantity } = useCart()

  useEffect(() => {
    fetchCatalog()
      .then(({ shopName: name, products: list }) => {
        setProducts(list)
        if (name) setShopName(name)
      })
      .catch((e) => setLoadError(e.message))
  }, [])

  const handleAdd = useCallback(
    async (product, variant) => {
      await add(product, variant)
      setSelected(null)
      setCartOpen(true)
    },
    [add],
  )

  const step = (d) => setActive((i) => (i + d + products.length) % products.length)
  const current = products[active] ?? products[0]

  return (
    <div className="min-h-[100dvh]">
      <header className="fixed inset-x-0 top-0 z-30 flex items-center justify-between px-5 py-4 md:px-10">
        <a href="#" className="font-mono text-sm font-medium uppercase tracking-[0.3em]">
          {shopName}
        </a>
        <nav className="flex items-center gap-6 text-sm">
          <a href="#coleccion" className="hidden text-dim transition hover:text-chalk sm:block">Colección</a>
          <a href="#detalles" className="hidden text-dim transition hover:text-chalk sm:block">Detalles</a>
          <button
            onClick={() => setCartOpen(true)}
            className="relative grid size-11 place-items-center rounded-full border border-line bg-pit/70 backdrop-blur transition hover:border-chalk"
            aria-label="Abrir carrito"
          >
            <ShoppingBag size={18} />
            {cart?.totalQuantity > 0 && (
              <span className="absolute -right-1 -top-1 grid size-5 place-items-center rounded-full bg-signal font-mono text-[10px] font-bold text-asphalt">
                {cart.totalQuantity}
              </span>
            )}
          </button>
        </nav>
      </header>

      {/* HERO: la pared con los cuadros en 3D */}
      <section className="relative h-[100dvh] min-h-[620px] overflow-hidden">
        <Suspense fallback={<div className="absolute inset-0 bg-asphalt" />}>
          <div className="absolute inset-0">
            <GalleryWall
              products={products}
              active={active}
              onActiveChange={setActive}
              onSelect={setSelected}
              paused={Boolean(selected)}
            />
          </div>
        </Suspense>

        <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-asphalt via-asphalt/80 to-transparent px-5 pb-8 pt-24 md:px-10 md:pb-10">
          <div className="mx-auto flex max-w-[1400px] flex-col gap-6 md:flex-row md:items-end md:justify-between">
            <div>
              <h1 className="max-w-[16ch] text-4xl font-semibold leading-[1.02] tracking-tighter md:text-6xl">
                Tu F1 favorito, colgado en tu pared.
              </h1>
              <p className="mt-3 max-w-[48ch] text-[15px] leading-relaxed text-dim">
                Autos LEGO Technic de Fórmula 1 montados en cuadros con luz LED. Pasa el cursor
                para acercarlos y haz clic para verlos en 3D, de frente y de lado.
              </p>
            </div>

            {/* Torre de tiempos: selector de cuadros */}
            <div className="pointer-events-auto flex items-center gap-3">
              <button
                onClick={() => step(-1)}
                className="grid size-11 place-items-center rounded-full border border-line transition hover:border-chalk md:hidden"
                aria-label="Cuadro anterior"
              >
                <ArrowLeft size={16} />
              </button>
              <ol className="w-full min-w-[260px] divide-y divide-line rounded-2xl border border-line bg-pit/80 font-mono text-xs backdrop-blur md:w-[320px]">
                {products.map((p, i) => (
                  <li key={p.id} className={i === active ? '' : 'hidden md:block'}>
                    <button
                      onMouseEnter={() => setActive(i)}
                      onFocus={() => setActive(i)}
                      onClick={() => setSelected(p)}
                      className="flex w-full items-center gap-3 px-4 py-3 text-left"
                    >
                      <span className={i === active ? 'text-signal' : 'text-dim'}>P{i + 1}</span>
                      <span className="size-2.5 rounded-sm" style={{ background: p.model.backdrop.center, boxShadow: `0 0 8px ${p.model.led.halo ?? p.model.led.border}` }} />
                      <span className="flex-1 truncate uppercase tracking-wider">{p.title}</span>
                      <span className="text-dim">{formatMoney(p.price)}</span>
                    </button>
                  </li>
                ))}
              </ol>
              <button
                onClick={() => step(1)}
                className="grid size-11 place-items-center rounded-full border border-line transition hover:border-chalk md:hidden"
                aria-label="Cuadro siguiente"
              >
                <ArrowRight size={16} />
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* COLECCIÓN */}
      <section id="coleccion" className="mx-auto max-w-[1400px] px-5 py-24 md:px-10 md:py-32">
        <div className="mb-12 flex flex-wrap items-end justify-between gap-4">
          <h2 className="text-3xl font-semibold tracking-tighter md:text-5xl">La colección</h2>
          {!isShopifyConfigured && (
            <p className="font-mono text-xs uppercase tracking-widest text-dim">Catálogo de muestra</p>
          )}
          {loadError && <p className="text-sm text-red-400">No se pudo cargar Shopify: {loadError}</p>}
        </div>

        <ul className="divide-y divide-line border-y border-line">
          {products.map((p, i) => (
            <motion.li
              key={p.id}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-80px' }}
              transition={{ duration: 0.6, delay: i * 0.06, ease: [0.22, 1, 0.36, 1] }}
            >
              <button
                onClick={() => setSelected(p)}
                className="group grid w-full grid-cols-[auto_1fr_auto] items-center gap-5 py-6 text-left md:grid-cols-[80px_140px_1fr_auto_auto] md:gap-8"
              >
                <span className="font-mono text-sm text-dim">{p.number}</span>
                <div
                  className="hidden aspect-[4/5] w-full overflow-hidden rounded-lg border border-line md:block"
                  style={{ background: `radial-gradient(circle at 50% 40%, ${p.model.backdrop.center}, ${p.model.backdrop.edge})` }}
                >
                  {p.image && (
                    <img src={p.image} alt={p.title} loading="lazy" className="size-full object-cover" />
                  )}
                </div>
                <div>
                  <p className="text-2xl font-semibold tracking-tight transition group-hover:translate-x-1 md:text-3xl">
                    {p.title}
                  </p>
                  <p className="mt-1 line-clamp-2 max-w-[60ch] text-sm text-dim">{p.description}</p>
                </div>
                <span className="hidden font-mono md:block">{formatMoney(p.price)}</span>
                <span className="flex items-center gap-2 rounded-full border border-line px-4 py-2 text-sm transition group-hover:border-signal group-hover:text-signal">
                  <Cube size={16} />
                  <span className="hidden sm:inline">Ver en 3D</span>
                </span>
              </button>
            </motion.li>
          ))}
        </ul>
      </section>

      {/* DETALLES */}
      <section id="detalles" className="border-t border-line bg-pit">
        <div className="mx-auto grid max-w-[1400px] gap-12 px-5 py-24 md:grid-cols-[1fr_1.4fr] md:px-10 md:py-32">
          <div>
            <p className="font-mono text-xs uppercase tracking-widest text-signal">Ficha técnica</p>
            <h2 className="mt-3 max-w-[14ch] text-3xl font-semibold tracking-tighter md:text-5xl">
              Hecho para verse desde el otro lado del cuarto.
            </h2>
            <button
              onClick={() => setSelected(current)}
              className="mt-8 rounded-full bg-signal px-6 py-4 text-sm font-semibold text-asphalt transition hover:brightness-110 active:scale-[0.98]"
            >
              Abrir {current?.title} en 3D
            </button>
          </div>
          <dl className="grid gap-px overflow-hidden rounded-2xl border border-line bg-line sm:grid-cols-2">
            {SPECS.map(([title, text], i) => (
              <div key={title} className={`bg-pit p-6 md:p-8 ${i === 0 ? 'sm:col-span-2' : ''}`}>
                <dt className="font-mono text-xs uppercase tracking-widest text-dim">
                  {String(i + 1).padStart(2, '0')} · {title}
                </dt>
                <dd className="mt-3 max-w-[48ch] leading-relaxed">{text}</dd>
              </div>
            ))}
          </dl>
        </div>
      </section>

      <footer className="mx-auto flex max-w-[1400px] flex-wrap justify-between gap-4 px-5 py-10 font-mono text-xs text-dim md:px-10">
        <span>© {new Date().getFullYear()} {shopName}</span>
        <span className="max-w-[70ch]">
          LEGO®, Technic y las marcas de los equipos de F1 pertenecen a sus respectivos dueños.
        </span>
      </footer>

      <AnimatePresence>
        {selected && (
          <ProductModal
            key={selected.id}
            product={selected}
            busy={busy}
            onAdd={handleAdd}
            onClose={() => setSelected(null)}
          />
        )}
      </AnimatePresence>
      <AnimatePresence>
        {cartOpen && (
          <CartDrawer
            cart={cart}
            busy={busy}
            error={error}
            onQuantity={setQuantity}
            onClose={() => setCartOpen(false)}
          />
        )}
      </AnimatePresence>
    </div>
  )
}
