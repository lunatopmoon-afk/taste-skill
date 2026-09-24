// Catálogo de muestra: se usa mientras la tienda no está conectada
// (faltan VITE_SHOPIFY_STORE_DOMAIN / VITE_SHOPIFY_STOREFRONT_TOKEN).
// Cuando se conecta Shopify, estos datos se reemplazan por los productos reales.

const FRAME_OPTIONS = [{ name: 'Marco', values: ['Negro mate', 'Nogal', 'Blanco'] }]

function variants(handle, amount) {
  return FRAME_OPTIONS[0].values.map((value, i) => ({
    id: `demo-${handle}-${i}`,
    title: value,
    availableForSale: true,
    price: { amount: String(amount + i * 10), currencyCode: 'USD' },
    selectedOptions: [{ name: 'Marco', value }],
  }))
}

export const DEMO_PRODUCTS = [
  {
    id: 'demo-rosso',
    handle: 'rosso-corsa',
    number: '01',
    title: 'Rosso Corsa',
    description:
      'Monoplaza de bloques en rojo carrera, colgado en caja de sombra con vidrio frontal y fondo impreso con el trazado del circuito.',
    image: null,
    price: { amount: '189', currencyCode: 'USD' },
    options: FRAME_OPTIONS,
    variants: variants('rosso-corsa', 189),
    livery: { primary: '#D8141C', secondary: '#F4F4F2', accent: '#F6D21A' },
  },
  {
    id: 'demo-papaya',
    handle: 'papaya',
    number: '02',
    title: 'Papaya',
    description:
      'Naranja papaya con pontones en grafito. Montado separado del fondo para que las ruedas proyecten sombra real.',
    image: null,
    price: { amount: '199', currencyCode: 'USD' },
    options: FRAME_OPTIONS,
    variants: variants('papaya', 199),
    livery: { primary: '#FF8000', secondary: '#232326', accent: '#47C7FC' },
  },
  {
    id: 'demo-midnight',
    handle: 'midnight',
    number: '03',
    title: 'Midnight',
    description:
      'Azul medianoche con detalles en rojo y amarillo. Soportes invisibles y placa grabada con el nombre del auto.',
    image: null,
    price: { amount: '209', currencyCode: 'USD' },
    options: FRAME_OPTIONS,
    variants: variants('midnight', 209),
    livery: { primary: '#1B2A55', secondary: '#E10600', accent: '#FFCC00' },
  },
]
