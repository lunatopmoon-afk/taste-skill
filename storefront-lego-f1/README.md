# Pit/Wall: storefront headless de cuadros LEGO F1

Tienda headless para Shopify: cuadros de exhibición (caja de sombra) con autos LEGO de Fórmula 1 colgados, mostrados en **3D interactivo**.

- **Pared de galería 3D:** los cuadros cuelgan con luz de museo. Al pasar el cursor, el cuadro se inclina hacia ti y las ruedas giran.
- **Visor del producto:** puedes girar el cuadro, **abrir la vitrina y sacar el auto**, que da vueltas frente a ti. Al elegir el marco (Negro, Nogal, Blanco…), el color cambia en 3D.
- **Carrito y pago** con la Storefront API. El botón "Ir a pagar" lleva al checkout oficial de Shopify.
- En el móvil, los cuadros se ven uno por uno, con flechas para pasar de uno a otro.

Todo el 3D es procedural (Three.js). No hace falta modelar nada: los colores de cada auto salen de Shopify.

## 1. Conectar tu tienda

```bash
cp .env.example .env
```

Llena `.env` con:

| Variable | Qué poner |
|---|---|
| `VITE_SHOPIFY_STORE_DOMAIN` | `tu-tienda.myshopify.com` |
| `VITE_SHOPIFY_STOREFRONT_TOKEN` | El **token público de Storefront API** de la app Headless |

> **Importante sobre los tokens**
> - Un token que empieza por **`shpat_`** es de la **Admin API** (privado). Tiene control total de la tienda: pedidos, clientes, productos. **Nunca** debe ir en `.env` de este proyecto ni en ningún código que llegue al navegador.
> - En la app Headless, el token para esta web es el **"Public access token"** de la Storefront API.
> - Si compartiste el token `shpat_` en algún chat o documento, **revócalo y genera uno nuevo** en Shopify (Apps → Headless → tu storefront → Manage/Rotate).

Si no hay `.env`, la web funciona en **modo demo** con 3 productos de muestra.

## 2. Correrla

```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # genera /dist para publicar
```

`dist/` se puede publicar en Vercel, Netlify o Cloudflare Pages. Es una web estática, sin servidor.

## 3. Colores de cada auto (desde Shopify)

Cada producto define los colores de su auto LEGO de una de estas dos formas:

1. **Metafield** (recomendado): en *Configuración → Datos personalizados → Productos*, crea `custom.livery` (texto de una línea), exponlo a la **Storefront API** y ponle un valor como
   `#FF8000,#232326,#47C7FC` (principal, secundario, detalles).
2. **Etiqueta** del producto: `livery:#FF8000,#232326,#47C7FC`

Si un producto no tiene ninguna de las dos, usa una paleta de muestra.

## 4. Variantes de marco

Si el producto tiene una opción llamada **Marco**, **Frame**, **Acabado** o **Color**, el visor 3D pinta el marco según el valor elegido:

| Valor contiene | Color del marco |
|---|---|
| negro / cualquier otro | negro mate |
| nogal / walnut / madera | nogal |
| roble / oak / natural | roble claro |
| blanco / white | blanco |
| plata / aluminio | aluminio |

## 5. Agregar un cuarto (o quinto) cuadro

Solo créalo en Shopify, con su `custom.livery`. La pared 3D acomoda los productos que haya (carga hasta 12, por los más vendidos).

## Estructura

```
src/
  lib/shopify.js        Cliente Storefront API (productos + carrito)
  lib/useCart.js        Estado del carrito (Shopify o demo)
  lib/demoProducts.js   Catálogo de muestra
  three/LegoF1Car.jsx   Auto F1 hecho con piezas y studs tipo LEGO
  three/ShadowBox.jsx   Cuadro: marco, fondo impreso, soportes, vidrio con bisagra
  three/GalleryWall.jsx Pared de galería del inicio
  three/FrameViewer.jsx Visor 3D del producto
  components/           Modal del producto y carrito
```

LEGO® es una marca de LEGO Group, que no patrocina ni respalda esta tienda.
