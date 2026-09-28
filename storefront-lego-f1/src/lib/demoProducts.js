// Catálogo de muestra con los 3 cuadros reales. Se usa mientras la tienda no responde
// (sin .env o sin conexión). Con Shopify conectado, títulos, precios, fotos y variantes
// salen de la tienda; los precios de aquí son solo de ejemplo.
import { MODELS } from './models.js'

function demo(key, number, title, description, amount) {
  const model = MODELS[key]
  return {
    id: `demo-${key}`,
    handle: key,
    number,
    title,
    description,
    image: model.photos[0],
    images: model.photos,
    price: { amount: String(amount), currencyCode: 'USD' },
    options: [],
    variants: [
      {
        id: `demo-${key}-default`,
        title: 'Default Title',
        availableForSale: true,
        price: { amount: String(amount), currencyCode: 'USD' },
        selectedOptions: [],
      },
    ],
    model,
  }
}

export const DEMO_PRODUCTS = [
  demo('mercedes', '01', 'Mercedes-AMG F1 W14 E Performance', MODELS.mercedes.blurb, 0),
  demo('redbull', '02', 'Oracle Red Bull Racing RB-20', MODELS.redbull.blurb, 0),
  demo('ferrari', '03', 'Ferrari SF-24', MODELS.ferrari.blurb, 0),
]
