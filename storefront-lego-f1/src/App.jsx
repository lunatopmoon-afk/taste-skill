import { lazy, Suspense, useCallback, useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import {
  Cube,
  GlobeHemisphereWest,
  LightbulbFilament,
  Package,
  ShieldCheck,
  ShoppingBag,
} from '@phosphor-icons/react'
import { fetchCatalog, formatMoney, isShopifyConfigured } from './lib/shopify.js'
import { DEMO_PRODUCTS } from './lib/demoProducts.js'
import { useCart } from './lib/useCart.js'
import { ProductModal } from './components/ProductModal.jsx'
import { CartDrawer } from './components/CartDrawer.jsx'
import { LightsOut, shouldShowLightsOut } from './components/LightsOut.jsx'

const GalleryWall = lazy(() =>
  import('./three/GalleryWall.jsx').then((m) => ({ default: m.GalleryWall })),
)

// Ajusta estos textos a las características reales de tus cuadros.
const SPECS = [
  [
    'Auto de bloques armado',
    'El modelo completo, armado pieza por pieza con bloques de construcción y fijado al fondo en vista cenital, con sus ruedas, alerones y suspensión.',
  ],
  [
    'Retroiluminación LED',
    'Luz cálida detrás del marco que baña la pared y hace que el auto flote en la oscuridad.',
  ],
  ['Fondo del equipo', 'Póster con el color de la escudería y el nombre del auto al pie.'],
  ['Marco negro', 'Perfil delgado negro mate para que todo el protagonismo sea del auto.'],
]

// Lo que más pregunta quien compra, a la vista apenas baja del inicio
const PERKS = [
  [Package, 'Llega armado', 'Listo para colgar en tu pared'],
  [LightbulbFilament, 'Luz LED incluida', 'Retroiluminación cálida'],
  [ShieldCheck, 'Pago seguro', 'Checkout oficial de Shopify'],
  [GlobeHemisphereWest, 'Envíos internacionales', 'Embalaje protegido'],
]

export default function App() {
  const [products, setProducts] = useState(DEMO_PRODUCTS)
  const [shopName, setShopName] = useState('F1 Luxury Edition')
  const [loadError, setLoadError] = useState(null)
  const [active, setActive] = useState(0)
  const [selected, setSelected] = useState(null)
  const [cartOpen, setCartOpen] = useState(false)
  // Entrada animada del hero: el texto aparece cuando termina
  const [introDone, setIntroDone] = useState(false)
  const [skipIntro, setSkipIntro] = useState(false)
  // Largada (semáforo) al abrir: los autos caen cuando se apagan las luces
  const [lightsOut, setLightsOut] = useState(shouldShowLightsOut)
  const [holdIntro, setHoldIntro] = useState(lightsOut)
  const goLightsOut = useCallback(() => setHoldIntro(false), [])
  const endLightsOut = useCallback(() => setLightsOut(false), [])
  const { cart, busy, error, add, setQuantity } = useCart()

  useEffect(() => {
    fetchCatalog()
      .then(({ shopName: name, products: list, empty }) => {
        setProducts(list)
        if (name) setShopName(name)
        if (empty)
          setLoadError(
            'conectado, pero no hay productos publicados en el canal Headless (Shopify → Productos → Publicación)',
          )
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

  const current = products[active] ?? products[0]

  return (
    <div className="min-h-[100dvh]">
      <header className="fixed inset-x-0 top-0 z-30 flex items-center justify-between bg-gradient-to-b from-[#060607] via-[#060607]/85 to-transparent px-5 py-4 md:px-10">
        <a href="#" className="font-mono text-sm font-medium uppercase tracking-[0.3em]">
          {shopName}
        </a>
        <nav className="flex items-center gap-6 text-sm">
          <a href="#coleccion" className="hidden text-dim transition hover:text-chalk sm:block">
            Colección
          </a>
          <a href="#detalles" className="hidden text-dim transition hover:text-chalk sm:block">
            Detalles
          </a>
          <button
            onClick={() => setCartOpen(true)}
            className="glass relative grid size-11 place-items-center rounded-full transition hover:border-signal"
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
      {/* svh: altura fija aunque la barra del navegador del celular aparezca o se esconda */}
      <section className="relative h-[100svh] min-h-[620px] overflow-hidden">
        <Suspense fallback={<div className="absolute inset-0 bg-asphalt" />}>
          <div className="absolute inset-0">
            <GalleryWall
              products={products}
              onActiveChange={setActive}
              onSelect={setSelected}
              onIntroDone={() => setIntroDone(true)}
              skipIntro={skipIntro}
              hold={holdIntro}
              paused={Boolean(selected)}
            />
          </div>
        </Suspense>

        {!introDone && (
          <button
            onClick={() => setSkipIntro(true)}
            className="glass absolute right-5 top-24 z-10 rounded-full px-4 py-2 font-mono text-[11px] uppercase tracking-widest text-dim transition hover:text-chalk md:right-10"
          >
            Saltar intro
          </button>
        )}
        <motion.div
          className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-asphalt via-asphalt/80 to-transparent px-5 pb-8 pt-24 md:px-10 md:pb-10"
          // el texto se ve desde que abre la página; los autos caen en el espacio negro de arriba
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
        >
          <div className="mx-auto flex max-w-[1400px] flex-col gap-6 md:flex-row md:items-end md:justify-between">
            <div>
              <h1 className="max-w-[16ch] text-4xl font-semibold leading-[1.02] tracking-tighter md:text-6xl">
                Tu F1 favorito, <span className="gold-text">colgado en tu pared.</span>
              </h1>
              <p className="mt-3 max-w-[48ch] text-[15px] leading-relaxed text-dim">
                Autos de Fórmula 1 de bloques de construcción, montados en cuadros con luz LED. Toca
                un cuadro para verlo en 3D, de frente y de lado.
              </p>
            </div>

            {/* Torre de tiempos: selector de cuadros */}
            <div className="pointer-events-auto">
              <ol className="glass w-full min-w-[260px] divide-y divide-line rounded-2xl font-mono text-xs md:w-[320px]">
                {products.map((p, i) => (
                  <li key={p.id}>
                    <button
                      onMouseEnter={() => setActive(i)}
                      onFocus={() => setActive(i)}
                      onClick={() => setSelected(p)}
                      className="flex w-full items-center gap-3 px-4 py-3 text-left"
                    >
                      <span className={i === active ? 'text-signal' : 'text-dim'}>P{i + 1}</span>
                      <span
                        className="size-2.5 rounded-sm"
                        style={{
                          background: p.model.backdrop.center,
                          boxShadow: `0 0 8px ${p.model.led.halo ?? p.model.led.border}`,
                        }}
                      />
                      <span className="flex-1 truncate uppercase tracking-wider">{p.title}</span>
                      <span className="text-dim">{formatMoney(p.price)}</span>
                    </button>
                  </li>
                ))}
              </ol>
            </div>
          </div>
        </motion.div>
      </section>

      {/* BENEFICIOS */}
      <section aria-label="Beneficios" className="border-y border-line bg-pit/60">
        <ul className="mx-auto grid max-w-[1400px] grid-cols-2 gap-px md:grid-cols-4">
          {PERKS.map(([Icon, title, text]) => (
            <li key={title} className="flex items-center gap-3 px-5 py-5 md:px-8 md:py-6">
              <Icon size={26} weight="light" className="shrink-0 text-signal" />
              <div>
                <p className="text-sm font-semibold">{title}</p>
                <p className="text-xs text-dim">{text}</p>
              </div>
            </li>
          ))}
        </ul>
      </section>

      {/* COLECCIÓN */}
      <section id="coleccion" className="mx-auto max-w-[1400px] px-5 py-24 md:px-10 md:py-32">
        <div className="mb-12 flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="font-mono text-xs uppercase tracking-widest text-signal">
              01 · Parrilla de salida
            </p>
            <h2 className="mt-3 text-3xl font-semibold tracking-tighter md:text-5xl">
              La <span className="gold-text">colección</span>
            </h2>
          </div>
          {!isShopifyConfigured && (
            <p className="font-mono text-xs uppercase tracking-widest text-dim">
              Catálogo de muestra · Shopify sin conectar
            </p>
          )}
          {loadError && (
            <p className="text-sm text-red-400">No se pudo cargar Shopify: {loadError}</p>
          )}
        </div>

        <ul className="divide-y divide-line">
          <li aria-hidden className="gold-rule" />
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
                className="group grid w-full grid-cols-[92px_1fr_auto] items-center gap-4 py-6 text-left sm:grid-cols-[auto_110px_1fr_auto] sm:gap-5 md:grid-cols-[80px_140px_1fr_auto_auto] md:gap-8"
              >
                <span className="hidden font-mono text-sm text-dim sm:block">{p.number}</span>
                <div
                  className="aspect-[4/5] w-full overflow-hidden rounded-lg border border-line shadow-[0_18px_40px_-18px_rgba(228,192,126,0.45)] transition duration-500 group-hover:border-signal/60 group-hover:shadow-[0_22px_50px_-14px_rgba(228,192,126,0.7)]"
                  style={{
                    background: `radial-gradient(circle at 50% 40%, ${p.model.backdrop.center}, ${p.model.backdrop.edge})`,
                  }}
                >
                  {p.image && (
                    <img
                      src={p.image}
                      alt={p.title}
                      loading="lazy"
                      className="size-full object-cover transition duration-700 group-hover:scale-[1.04]"
                    />
                  )}
                </div>
                <div>
                  <p className="text-xl font-semibold leading-tight tracking-tight transition group-hover:translate-x-1 sm:text-2xl md:text-3xl">
                    {p.title}
                  </p>
                  <p className="mt-1 line-clamp-2 max-w-[60ch] text-sm text-dim">{p.description}</p>
                </div>
                <span className="gold-text hidden font-display text-2xl font-semibold md:block">
                  {formatMoney(p.price)}
                </span>
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
      <section id="detalles" className="carbon relative">
        <div className="gold-rule absolute inset-x-0 top-0" />
        <div className="mx-auto grid max-w-[1400px] gap-12 px-5 py-24 md:grid-cols-[1fr_1.4fr] md:px-10 md:py-32">
          <div>
            <p className="font-mono text-xs uppercase tracking-widest text-signal">
              02 · Ficha técnica
            </p>
            <h2 className="mt-3 max-w-[14ch] text-3xl font-semibold tracking-tighter md:text-5xl">
              Hecho para verse desde el otro lado del cuarto.
            </h2>
            <button
              onClick={() => setSelected(current)}
              className="btn-gold mt-8 rounded-full px-6 py-4 text-sm font-semibold active:scale-[0.98]"
            >
              Abrir {current?.title} en 3D
            </button>
          </div>
          <dl className="grid gap-px overflow-hidden rounded-2xl border border-signal/15 bg-signal/10 sm:grid-cols-2">
            {SPECS.map(([title, text], i) => (
              <div
                key={title}
                className={`bg-[#09090a]/95 p-6 md:p-8 ${i === 0 ? 'sm:col-span-2' : ''}`}
              >
                <dt className="font-mono text-xs uppercase tracking-widest text-signal/80">
                  {String(i + 1).padStart(2, '0')} · {title}
                </dt>
                <dd className="mt-3 max-w-[48ch] leading-relaxed">{text}</dd>
              </div>
            ))}
          </dl>
        </div>
      </section>

      <div className="checker-rule" aria-hidden />
      <footer className="mx-auto max-w-[1400px] px-5 pb-10 pt-14 md:px-10">
        <div className="grid gap-10 md:grid-cols-[1.4fr_1fr_1fr]">
          <div>
            <p className="font-mono text-sm font-medium uppercase tracking-[0.3em]">{shopName}</p>
            <p className="mt-3 max-w-[40ch] text-sm leading-relaxed text-dim">
              Cuadros de colección con autos de Fórmula 1 de bloques de construcción y luz LED.
              Listos para colgar.
            </p>
          </div>
          <nav aria-label="Pie de página" className="grid content-start gap-2 text-sm">
            <p className="mb-1 font-mono text-xs uppercase tracking-widest text-signal">Tienda</p>
            <a href="#coleccion" className="text-dim transition hover:text-chalk">
              Colección
            </a>
            <a href="#detalles" className="text-dim transition hover:text-chalk">
              Ficha técnica
            </a>
            <button
              onClick={() => setCartOpen(true)}
              className="text-left text-dim transition hover:text-chalk"
            >
              Carrito
            </button>
          </nav>
          <div className="grid content-start gap-2 text-sm">
            <p className="mb-1 font-mono text-xs uppercase tracking-widest text-signal">Compra</p>
            <p className="flex items-center gap-2 text-dim">
              <ShieldCheck size={16} className="text-signal" /> Pago seguro con Shopify
            </p>
            <p className="flex items-center gap-2 text-dim">
              <GlobeHemisphereWest size={16} className="text-signal" /> Envíos internacionales
            </p>
          </div>
        </div>
        <div className="gold-rule mt-10" />
        <div className="mt-6 flex flex-wrap justify-between gap-4 font-mono text-[11px] text-dim">
          <span>
            © {new Date().getFullYear()} {shopName}
          </span>
          <span className="max-w-[80ch]">
            Producto independiente. Fórmula 1, F1 y los nombres y marcas de los equipos pertenecen a
            sus respectivos dueños; no estamos afiliados ni patrocinados por ellos.
          </span>
        </div>
      </footer>

      {lightsOut && <LightsOut onGo={goLightsOut} onDone={endLightsOut} />}
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
