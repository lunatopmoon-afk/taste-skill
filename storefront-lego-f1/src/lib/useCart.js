import { useCallback, useEffect, useState } from 'react'
import {
  addCartLines,
  createCart,
  fetchCart,
  isShopifyConfigured,
  updateCartLine,
} from './shopify.js'

const KEY = 'pitwall-cart-id'

function readId() {
  try {
    return localStorage.getItem(KEY)
  } catch {
    return null
  }
}

function writeId(id) {
  try {
    if (id) localStorage.setItem(KEY, id)
    else localStorage.removeItem(KEY)
  } catch {
    /* almacenamiento bloqueado: el carrito vive solo en esta sesión */
  }
}

// Carrito local para el modo demo (sin Shopify conectado)
function demoAdd(cart, product, variant) {
  const lines = cart?.lines.nodes ?? []
  const existing = lines.find((l) => l.merchandise.id === variant.id)
  const next = existing
    ? lines.map((l) => (l === existing ? { ...l, quantity: l.quantity + 1 } : l))
    : [
        ...lines,
        {
          id: `line-${variant.id}`,
          quantity: 1,
          merchandise: { id: variant.id, title: variant.title, price: variant.price, product },
        },
      ]
  return demoCart(next)
}

function demoCart(lines) {
  const amount = lines.reduce((s, l) => s + Number(l.merchandise.price.amount) * l.quantity, 0)
  return {
    id: 'demo',
    checkoutUrl: null,
    totalQuantity: lines.reduce((s, l) => s + l.quantity, 0),
    cost: {
      subtotalAmount: {
        amount: String(amount),
        currencyCode: lines[0]?.merchandise.price.currencyCode ?? 'USD',
      },
    },
    lines: { nodes: lines },
  }
}

export function useCart() {
  const [cart, setCart] = useState(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    const id = readId()
    if (!isShopifyConfigured || !id) return
    fetchCart(id)
      .then((c) => (c ? setCart(c) : writeId(null)))
      .catch(() => writeId(null))
  }, [])

  const run = useCallback(async (fn) => {
    setBusy(true)
    setError(null)
    try {
      const next = await fn()
      if (next) {
        setCart(next)
        writeId(next.id)
      }
    } catch (e) {
      setError(e.message)
    } finally {
      setBusy(false)
    }
  }, [])

  const add = useCallback(
    (product, variant) => {
      if (!isShopifyConfigured) {
        setCart((c) => demoAdd(c, product, variant))
        return Promise.resolve()
      }
      const lines = [{ merchandiseId: variant.id, quantity: 1 }]
      return run(() => (cart ? addCartLines(cart.id, lines) : createCart(lines)))
    },
    [cart, run],
  )

  const setQuantity = useCallback(
    (line, quantity) => {
      if (!isShopifyConfigured) {
        setCart((c) =>
          demoCart(
            c.lines.nodes
              .map((l) => (l.id === line.id ? { ...l, quantity } : l))
              .filter((l) => l.quantity > 0),
          ),
        )
        return Promise.resolve()
      }
      return run(() => updateCartLine(cart.id, line.id, quantity))
    },
    [cart, run],
  )

  return { cart, busy, error, add, setQuantity }
}
