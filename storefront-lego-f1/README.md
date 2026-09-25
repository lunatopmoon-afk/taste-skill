# F1 Luxury Edition: storefront headless

Tienda headless para Shopify (`f1luxuryedtionn.myshopify.com`): cuadros con autos LEGO Technic de Fórmula 1 y luz LED, mostrados en **3D interactivo**.

Dentro de cada cuadro 3D va **la foto real del producto** (`public/cuadros/`).
Se recortó por dentro de la línea de luz: así los tres cuadros quedan simples, como el Red Bull.
Después se escaló ×4 con Real-ESRGAN (IA) hasta **4K (4096 px de alto)**. En celular se carga la versión 2K.
El LEGO **sobresale en relieve**: un mapa de alturas (`*-relieve.png`) levanta las llantas, la carrocería y los alerones sobre el fondo.
Así, al inclinar o girar el cuadro, se ve el auto colgado en 3D.
Las **llantas son cilindros 3D reales** (`wheels` en `src/lib/models.js`): de frente muestran la foto; de lado, el flanco con la banda de color, el rin y el centro.
Los tres cuadros usan la misma retroiluminación cálida (la del Red Bull).

| Cuadro | Foto | Luz LED en 3D |
|---|---|---|
| **Mercedes-AMG F1 W14 E Performance** | `public/cuadros/mercedes-4k.webp` | retroiluminación cálida sobre la pared |
| **Oracle Red Bull Racing RB-20** | `public/cuadros/redbull-4k.webp` | retroiluminación cálida sobre la pared |
| **Ferrari SF-24** | `public/cuadros/ferrari-4k.webp` | retroiluminación cálida sobre la pared |

**Interacciones**
- **Entrada (unos 7 s, con botón "Saltar intro"). El texto del inicio se ve desde el primer momento; los autos caen en el espacio negro de arriba, sobre donde luego quedan los cuadros:**
  1. Caen desde arriba los tres autos F1 reales vistos desde arriba, morro abajo, como en el video aprobado (`<modelo>-real.webp`, tomados del video y escalados con IA).
  2. La carrocería se va convirtiendo en LEGO: aparecen las juntas y los studs de ladrillos 1x2 (aparejo corrido). Cada ladrillo se suelta de su lugar, deja su hueco exacto y sale disparado hacia la cámara con el color del auto, que pasa al color LEGO en el aire. De adentro salen además piezas Technic: ladrillos y placas con studs, vigas Technic con agujeros, engranajes, ejes en cruz y pines, en colores oficiales LEGO (`src/three/legoPieces.js`).
  3. Las piezas se rearman: cada una toma el color de la foto real en su punto, y el conjunto se funde con el auto LEGO de la foto, ahora con el morro hacia arriba.
  4. Los cuadros llegan vacíos desde el fondo oscuro y cada LEGO encaja en el suyo.
  5. Se prenden las tres luces a la vez.

  La secuencia está en `src/three/Intro.jsx` y sus tiempos, en `INTRO`. Para revisar un momento exacto, agrega `?introT=4.2` a la dirección y la animación se congela en ese segundo. Con "reducir movimiento" activado, la entrada se salta.
- **Cursor sobre un cuadro:** el cuadro gira un poco de izquierda a derecha, se acerca y sube el brillo.
- **Clic:** abre el visor 3D. Solo se gira de izquierda a derecha, en un rango corto, sin acercar ni alejar. Además:
  - **Vista lateral:** el cuadro 3D gira y se funde con **la foto real de costado**, en 4K. Esa foto se retocó para que los tres queden iguales: sin línea de luz interior, marco negro y la misma luz cálida en la pared. Si mueves el cursor encima, se inclina un poco; con un clic se amplía.
  - **LED encendido/apagado.**
  - **Fotos reales**, para ampliarlas.
- **Carrito** con la Storefront API y pago en el checkout oficial de Shopify.
- **En el móvil:** se ven los tres cuadros en fila.

Si agregas un modelo **sin foto**, se muestra un auto LEGO 3D procedural. Ese auto sí se puede sacar del cuadro y tiene DRS.

## Cambiar o agregar la foto de un cuadro

1. Recorta la foto de frente justo por el borde interior del marco.
2. Guárdala en `public/cuadros/<modelo>-4k.webp` (4096 px de alto) y `<modelo>-2k.webp` (2048 px). Si tienes la foto original en alta resolución, úsala directo: se verá todavía mejor.
3. En `src/lib/models.js`, pon en `posterAspect` el ancho ÷ alto de la imagen.
4. Para la vista lateral, guarda la foto de costado como `<modelo>-lateral-4k.webp` y `<modelo>-lateral-2k.webp`.
5. Para la entrada: `<modelo>-auto.webp` es el auto recortado con transparencia y `<modelo>-vacio.webp` es el póster sin el auto.
6. Para el relieve, crea `public/cuadros/<modelo>-relieve.png`: una imagen en escala de grises del mismo encuadre, con el negro como fondo plano y el blanco como la parte que más sobresale (las llantas). Si no existe, la foto se ve plana.

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
Las **fotos** del visor salen de las imágenes del producto en Shopify. En modo demo se usan las fotos de costado de `public/cuadros/`.

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
