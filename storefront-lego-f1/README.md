# F1 Luxury Edition: storefront headless

Tienda headless para Shopify (`f1luxuryedtionn.myshopify.com`): cuadros con autos LEGO Technic de Fórmula 1 y luz LED, mostrados en **3D interactivo**.

Dentro de cada cuadro 3D va **la foto real del producto**, recortada al borde interior del marco (`public/cuadros/`).
El LEGO **sobresale en relieve**: un mapa de alturas (`*-relieve.png`) levanta las llantas, la carrocería y los alerones sobre el fondo.
Así, al inclinar o girar el cuadro, se ve el auto colgado en 3D.
Los tres cuadros usan la misma retroiluminación cálida (la del Red Bull).

| Cuadro | Foto | Luz LED en 3D |
|---|---|---|
| **Mercedes-AMG F1 W14 E Performance** | `public/cuadros/mercedes.webp` | retroiluminación cálida sobre la pared |
| **Oracle Red Bull Racing RB-20** | `public/cuadros/redbull.webp` | retroiluminación cálida sobre la pared |
| **Ferrari SF-24** | `public/cuadros/ferrari.webp` | retroiluminación cálida sobre la pared |

**Interacciones**
- **Al entrar:** los cuadros se encienden uno por uno, con parpadeo de neón y el resplandor en la pared.
- **Cursor sobre un cuadro:** el cuadro se inclina hacia ti y se acerca, sube el brillo y un reflejo recorre el vidrio.
- **Clic:** abre el visor 3D. Ahí puedes girar el cuadro, acercarte con la rueda o pellizcando, y usar:
  - **Vista lateral:** el cuadro gira como en la foto de costado.
  - **LED encendido/apagado.**
  - **Fotos reales**, para ampliarlas.
- **Carrito** con la Storefront API y pago en el checkout oficial de Shopify.
- **En el móvil:** un cuadro a la vez, con flechas para pasar de uno a otro.

Si agregas un modelo **sin foto**, se muestra un auto LEGO 3D procedural. Ese auto sí se puede sacar del cuadro y tiene DRS.

## Cambiar o agregar la foto de un cuadro

1. Recorta la foto de frente justo por el borde interior del marco.
2. Guárdala en `public/cuadros/<modelo>.webp`.
3. En `src/lib/models.js`, pon en `posterAspect` el ancho ÷ alto de la imagen.
4. Para el relieve, crea `public/cuadros/<modelo>-relieve.png`: una imagen en escala de grises del mismo encuadre, con el negro como fondo plano y el blanco como la parte que más sobresale (las llantas). Si no existe, la foto se ve plana.

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
