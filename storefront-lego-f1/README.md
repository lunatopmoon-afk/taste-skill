# F1 Luxury Edition: storefront headless

Tienda headless para Shopify (`f1luxuryedtionn.myshopify.com`): cuadros con autos LEGO Technic de Fórmula 1 y luz LED, mostrados en **3D interactivo**.

Los 3 modelos están recreados en 3D a partir de las fotos de producto:

| Cuadro | Fondo | Luz LED | Auto |
|---|---|---|---|
| **Mercedes-AMG F1 W14 E Performance** | verde petróleo | línea turquesa alrededor del póster | negro con detalles turquesa, motor V6 bronce a la vista, neumáticos con banda amarilla |
| **Oracle Red Bull Racing RB-20** | azul rey | retroiluminación cálida sobre la pared | azul con morro amarillo, detalles rojos, alerones negros, neumáticos con banda roja |
| **Ferrari SF-24** | rojo profundo | línea dorada + resplandor ámbar | rojo con alerón delantero negro y blanco, neumáticos con banda amarilla |

**Interacciones**
- **Al entrar:** los LED de cada cuadro se encienden uno por uno, con parpadeo de neón.
- **Cursor sobre un cuadro:** el cuadro se inclina hacia ti y se acerca, el LED sube de intensidad y las ruedas giran.
- **Clic:** abre el visor 3D. Ahí puedes arrastrar para girar el cuadro y usar estos botones:
  - **Sacar el auto del cuadro:** el auto sale y gira frente a ti, y las ruedas delanteras siguen al cursor. También funciona con doble clic.
  - **Abrir DRS:** el alerón trasero se abre.
  - **LED encendido/apagado.**
  - **Fotos reales** del cuadro, para ampliarlas.
- **Carrito** con la Storefront API y pago en el checkout oficial de Shopify.
- **En el móvil:** un cuadro a la vez, con flechas para pasar de uno a otro.

Todo el 3D es procedural (Three.js), sin archivos de modelos.

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

## 3. Qué modelo 3D usa cada producto

La web reconoce el modelo por el **título** del producto: "W14"/"Mercedes", "RB-20"/"Red Bull" o "SF-24"/"Ferrari".
Si quieres fijarlo a mano, usa uno de estos:

1. **Metafield** `custom.modelo` (texto de una línea, expuesto a la Storefront API) con el valor `mercedes`, `redbull` o `ferrari`.
2. **Etiqueta** del producto: `modelo:mercedes`, `modelo:redbull` o `modelo:ferrari`.

Los colores, el fondo y el LED de cada modelo están en `src/lib/models.js`.
Las **fotos** del visor salen de las imágenes del producto en Shopify. En modo demo se usan las de `public/fotos/`.

## 4. Variantes de marco

Si el producto tiene una opción llamada **Marco**, **Frame**, **Acabado** o **Color**, el visor 3D pinta el marco según el valor elegido:

| Valor contiene | Color del marco |
|---|---|
| negro / cualquier otro | negro mate |
| nogal / walnut / madera | nogal |
| dorado / gold | dorado |
| blanco / white | blanco |
| plata / aluminio | aluminio |

## 5. Agregar un cuarto cuadro

1. Créalo en Shopify.
2. Agrega su ficha en `src/lib/models.js`: copia uno de los modelos y cambia los colores, el fondo y el LED.

La pared 3D acomoda sola los productos que haya.

## Estructura

```
src/
  lib/shopify.js        Cliente Storefront API (productos + carrito)
  lib/useCart.js        Estado del carrito (Shopify o demo)
  lib/demoProducts.js   Catálogo de muestra
  lib/models.js         Ficha de cada modelo (colores, fondo, LED, fotos)
  three/LegoF1Car.jsx   Auto F1 estilo LEGO Technic (alerones, DRS, suspensión, ruedas)
  three/LedFrame.jsx    Cuadro: marco negro, póster, línea LED y retroiluminación
  three/GalleryWall.jsx Pared de galería del inicio
  three/FrameViewer.jsx Visor 3D del producto
  components/           Modal del producto y carrito
```

LEGO®, Technic y las marcas de los equipos de F1 pertenecen a sus respectivos dueños.
