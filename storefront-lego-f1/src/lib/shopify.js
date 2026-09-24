// Cliente mínimo de la Storefront API de Shopify (headless).
// Solo usa el token PÚBLICO de Storefront. El token Admin (shpat_...) jamás debe
// llegar al navegador: da control total de la tienda.

import { DEMO_PRODUCTS } from './demoProducts.js'

const DOMAIN = import.meta.env.VITE_SHOPIFY_STORE_DOMAIN
const TOKEN = import.meta.env.VITE_SHOPIFY_STOREFRONT_TOKEN
const VERSION = import.meta.env.VITE_SHOPIFY_API_VERSION || '2026-07'

export const isShopifyConfigured = Boolean(DOMAIN && TOKEN)

async function storefront(query, variables = {}) {
  const res = await fetch(`https://${DOMAIN}/api/${VERSION}/graphql.json`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Shopify-Storefront-Access-Token': TOKEN,
    },
    body: JSON.stringify({ query, variables }),
  })
  if (!res.ok) throw new Error(`Storefront API ${res.status}`)
  const json = await res.json()
  if (json.errors?.length) throw new Error(json.errors.map((e) => e.message).join('; '))
  return json.data
}

const PRODUCT_FIELDS = `
  id
  handle
  title
  description
  tags
  featuredImage { url altText }
  priceRange { minVariantPrice { amount currencyCode } }
  options { name values }
  livery: metafield(namespace: "custom", key: "livery") { value }
  variants(first: 20) {
    nodes {
      id
      title
      availableForSale
      price { amount currencyCode }
      selectedOptions { name value }
    }
  }
`

// Colores del auto: metafield custom.livery = "#FF8000,#1E1E1E,#47C7FC"
// o una etiqueta del producto: "livery:#FF8000,#1E1E1E,#47C7FC".
function parseLivery(product, index) {
  const raw =
    product.livery?.value ||
    product.tags?.find((t) => t.toLowerCase().startsWith('livery:'))?.slice(7)
  const colors = raw?.split(',').map((c) => c.trim()).filter(Boolean)
  if (colors?.length >= 2) {
    return { primary: colors[0], secondary: colors[1], accent: colors[2] || colors[1] }
  }
  return DEMO_PRODUCTS[index % DEMO_PRODUCTS.length].livery
}

function normalize(product, index) {
  return {
    id: product.id,
    handle: product.handle,
    title: product.title,
    description: product.description,
    image: product.featuredImage?.url || null,
    price: product.priceRange.minVariantPrice,
    options: product.options,
    variants: product.variants.nodes,
    livery: parseLivery(product, index),
    number: String(index + 1).padStart(2, '0'),
  }
}

export async function fetchProducts() {
  if (!isShopifyConfigured) return DEMO_PRODUCTS
  const data = await storefront(`
    query Products {
      products(first: 12, sortKey: BEST_SELLING) { nodes { ${PRODUCT_FIELDS} } }
    }
  `)
  const products = data.products.nodes.map(normalize)
  return products.length ? products : DEMO_PRODUCTS
}

// ---------- Carrito ----------

const CART_FIELDS = `
  id
  checkoutUrl
  totalQuantity
  cost { subtotalAmount { amount currencyCode } }
  lines(first: 50) {
    nodes {
      id
      quantity
      merchandise {
        ... on ProductVariant {
          id
          title
          price { amount currencyCode }
          product { title handle }
        }
      }
    }
  }
`

export async function createCart(lines) {
  const data = await storefront(
    `mutation CartCreate($lines: [CartLineInput!]) {
      cartCreate(input: { lines: $lines }) { cart { ${CART_FIELDS} } userErrors { message } }
    }`,
    { lines },
  )
  return data.cartCreate.cart
}

export async function addCartLines(cartId, lines) {
  const data = await storefront(
    `mutation CartLinesAdd($cartId: ID!, $lines: [CartLineInput!]!) {
      cartLinesAdd(cartId: $cartId, lines: $lines) { cart { ${CART_FIELDS} } userErrors { message } }
    }`,
    { cartId, lines },
  )
  return data.cartLinesAdd.cart
}

export async function updateCartLine(cartId, lineId, quantity) {
  const data = await storefront(
    `mutation CartLinesUpdate($cartId: ID!, $lines: [CartLineUpdateInput!]!) {
      cartLinesUpdate(cartId: $cartId, lines: $lines) { cart { ${CART_FIELDS} } userErrors { message } }
    }`,
    { cartId, lines: [{ id: lineId, quantity }] },
  )
  return data.cartLinesUpdate.cart
}

export async function fetchCart(cartId) {
  const data = await storefront(
    `query Cart($id: ID!) { cart(id: $id) { ${CART_FIELDS} } }`,
    { id: cartId },
  )
  return data.cart
}

export function formatMoney({ amount, currencyCode }) {
  return new Intl.NumberFormat('es', { style: 'currency', currency: currencyCode }).format(
    Number(amount),
  )
}
