// Ficha de cada cuadro, sacada de las fotos reales de los productos.
// Define cómo se pinta en 3D: colores del auto, fondo del cuadro y luz LED.
//
// Un producto de Shopify se asocia a un modelo por:
//   1. metafield custom.modelo  (valor: mercedes | redbull | ferrari)
//   2. etiqueta "modelo:mercedes"
//   3. palabras del título ("W14", "RB-20", "SF-24", "Ferrari"…)

// Todos los cuadros usan la misma retroiluminación cálida (la del Red Bull)
const WARM_HALO = '#ffbf6e'

export const MODELS = {
  mercedes: {
    key: 'mercedes',
    // Foto real del cuadro, recortada por dentro de la línea de luz y escalada a 4K
    poster: '/cuadros/mercedes-4k.webp', // 4K (escalada con IA desde la foto original)
    posterSmall: '/cuadros/mercedes-2k.webp', // versión liviana para celular
    // Foto real de costado (sin línea de luz interior, con la luz cálida en la pared), 4K
    sidePhoto: '/cuadros/mercedes-lateral-4k.webp',
    sidePhotoSmall: '/cuadros/mercedes-lateral-2k.webp',
    relief: '/cuadros/mercedes-relieve.png', // mapa de alturas: blanco = sobresale más
    // Entrada: auto LEGO recortado (con transparencia) y póster sin el auto
    cutout: '/cuadros/mercedes-auto.webp',
    // Entrada: foto del auto F1 real recortada (con transparencia, escalada con IA)
    realCar: '/cuadros/mercedes-real.webp',
    realAspect: 2.0374,
    posterEmpty: '/cuadros/mercedes-vacio.webp',
    // Llantas 3D: [centro x, centro y, ancho, alto] en fracción del póster (y desde arriba)
    wheels: [
      [0.2665, 0.234, 0.124, 0.112],
      [0.7345, 0.234, 0.12, 0.112],
      [0.2659, 0.7622, 0.1326, 0.1064],
      [0.7324, 0.7622, 0.1292, 0.1064],
    ],
    posterAspect: 0.5822,
    match: /(mercedes|amg|w14|petronas)/i,
    code: 'W14',
    title: ['Mercedes-AMG', 'F1 W14 E Performance'],
    titleStyle: 'highlight', // "W14" resaltado en el color del LED
    highlight: 'W14',
    blurb:
      'El W14 negro con detalles turquesa, montado sobre fondo verde petróleo. Marco negro con retroiluminación cálida que baña la pared.',
    backdrop: { center: '#1d8a84', mid: '#0d4a48', edge: '#041615' },
    led: { border: '#5ff5e6', halo: WARM_HALO, haloStrength: 1 },
    tires: '#f2c40c',
    engine: 'mercedes',
    livery: {
      body: '#101112',
      bodyAlt: '#1c1d1f',
      nose: '#101112',
      accent: '#00d2be',
      wing: '#111213',
      wingAccent: '#00d2be',
      rearFlap: '#1b1c1e',
      floor: '#0a0a0b',
      helmet: '#e8e9ea',
      stripes: '#c7ccd1',
    },
    photos: ['/cuadros/mercedes-lateral-2k.webp'],
  },
  redbull: {
    key: 'redbull',
    // Foto real del cuadro, recortada por dentro de la línea de luz y escalada a 4K
    poster: '/cuadros/redbull-4k.webp', // 4K (escalada con IA desde la foto original)
    posterSmall: '/cuadros/redbull-2k.webp', // versión liviana para celular
    // Foto real de costado (sin línea de luz interior, con la luz cálida en la pared), 4K
    sidePhoto: '/cuadros/redbull-lateral-4k.webp',
    sidePhotoSmall: '/cuadros/redbull-lateral-2k.webp',
    relief: '/cuadros/redbull-relieve.png', // mapa de alturas: blanco = sobresale más
    // Entrada: auto LEGO recortado (con transparencia) y póster sin el auto
    cutout: '/cuadros/redbull-auto.webp',
    // Entrada: foto del auto F1 real recortada (con transparencia, escalada con IA)
    realCar: '/cuadros/redbull-real.webp',
    realAspect: 2.449,
    posterEmpty: '/cuadros/redbull-vacio.webp',
    // Llantas 3D: [centro x, centro y, ancho, alto] en fracción del póster (y desde arriba)
    wheels: [
      [0.3048, 0.2422, 0.1067, 0.1055],
      [0.7022, 0.2422, 0.1039, 0.1055],
      [0.3048, 0.7598, 0.0983, 0.1113],
      [0.7044, 0.7598, 0.1081, 0.1113],
    ],
    posterAspect: 0.6955,
    match: /(red ?bull|rb-?20|oracle)/i,
    code: 'RB-20',
    title: ['ORACLE Red Bull RACING', 'RB-20'],
    titleStyle: 'rules', // segunda línea entre dos rayas
    blurb:
      'El RB-20 azul con morro amarillo y detalles rojos, sobre fondo azul rey. Marco negro con retroiluminación cálida que baña la pared.',
    backdrop: { center: '#2a55e0', mid: '#12308f', edge: '#050b24' },
    led: { border: null, halo: WARM_HALO, haloStrength: 1 },
    tires: '#e3261d',
    engine: 'gearbox',
    livery: {
      body: '#1f45c4',
      bodyAlt: '#16266b',
      nose: '#1f45c4',
      noseTip: '#ffcc00',
      accent: '#e3261d',
      wing: '#141416',
      wingAccent: '#f3f3f3',
      rearFlap: '#1a1a1d',
      floor: '#0c0d12',
      helmet: '#ffcc00',
      stripes: '#e3261d',
    },
    photos: ['/cuadros/redbull-lateral-2k.webp'],
  },
  ferrari: {
    key: 'ferrari',
    // Foto real del cuadro, recortada por dentro de la línea de luz y escalada a 4K
    poster: '/cuadros/ferrari-4k.webp', // 4K (escalada con IA desde la foto original)
    posterSmall: '/cuadros/ferrari-2k.webp', // versión liviana para celular
    // Foto real de costado (sin línea de luz interior, con la luz cálida en la pared), 4K
    sidePhoto: '/cuadros/ferrari-lateral-4k.webp',
    sidePhotoSmall: '/cuadros/ferrari-lateral-2k.webp',
    relief: '/cuadros/ferrari-relieve.png', // mapa de alturas: blanco = sobresale más
    // Entrada: auto LEGO recortado (con transparencia) y póster sin el auto
    cutout: '/cuadros/ferrari-auto.webp',
    // Entrada: foto del auto F1 real recortada (con transparencia, escalada con IA)
    realCar: '/cuadros/ferrari-real.webp',
    realAspect: 2.6374,
    posterEmpty: '/cuadros/ferrari-vacio.webp',
    // Llantas 3D: [centro x, centro y, ancho, alto] en fracción del póster (y desde arriba)
    wheels: [
      [0.2761, 0.2104, 0.1313, 0.126],
      [0.7382, 0.2114, 0.1263, 0.1279],
      [0.2736, 0.7607, 0.1364, 0.1289],
      [0.734, 0.7607, 0.138, 0.1289],
    ],
    posterAspect: 0.5802,
    match: /(ferrari|sf-?24|scuderia)/i,
    code: 'SF-24',
    title: ['Ferrari SF-24', 'Formula One Racing'],
    titleStyle: 'divider', // dos líneas doradas con separador
    blurb:
      'El SF-24 rojo con alerones negros y blancos, sobre fondo rojo profundo. Marco negro con retroiluminación cálida que baña la pared.',
    backdrop: { center: '#c0170f', mid: '#6d0a07', edge: '#1c0302' },
    led: { border: '#ffc24d', halo: WARM_HALO, haloStrength: 1 },
    tires: '#f2c40c',
    engine: null,
    livery: {
      body: '#d3121a',
      bodyAlt: '#a50d13',
      nose: '#d3121a',
      accent: '#ffd23a',
      wing: '#141414',
      wingAccent: '#f4f4f4',
      rearFlap: '#b80f16',
      floor: '#0d0d0d',
      helmet: '#d3121a',
      stripes: '#f4f4f4',
    },
    photos: ['/cuadros/ferrari-lateral-2k.webp'],
  },
}

const ORDER = ['mercedes', 'redbull', 'ferrari']

export function resolveModel(product, index = 0) {
  const explicit =
    product.modelo?.value ||
    product.tags?.find((t) => t.toLowerCase().startsWith('modelo:'))?.slice(7)
  if (explicit && MODELS[explicit.trim().toLowerCase()]) {
    return MODELS[explicit.trim().toLowerCase()]
  }
  const haystack = `${product.title} ${product.handle}`
  const found = ORDER.find((k) => MODELS[k].match.test(haystack))
  return MODELS[found ?? ORDER[index % ORDER.length]]
}
