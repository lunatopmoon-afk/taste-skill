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
    shadow: '/cuadros/mercedes-sombra.png', // sombra suave del LEGO sobre el póster
    // Entrada: auto LEGO recortado (con transparencia) y póster sin el auto
    cutout: '/cuadros/mercedes-auto.webp',
    cutout4k: '/cuadros/mercedes-auto-4k.webp', // LEGO recortado en 4K: capa sobre el póster
    // Entrada: auto F1 real visto desde arriba (foto de estudio recortada, escalada con IA)
    realCar: '/cuadros/mercedes-real.webp',
    realAspect: 0.3571,
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
    shadow: '/cuadros/redbull-sombra.png', // sombra suave del LEGO sobre el póster
    // Entrada: auto LEGO recortado (con transparencia) y póster sin el auto
    cutout: '/cuadros/redbull-auto.webp',
    cutout4k: '/cuadros/redbull-auto-4k.webp', // LEGO recortado en 4K: capa sobre el póster
    // Entrada: auto F1 real visto desde arriba (foto de estudio recortada, escalada con IA)
    realCar: '/cuadros/redbull-real.webp',
    realAspect: 0.365,
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
    shadow: '/cuadros/ferrari-sombra.png', // sombra suave del LEGO sobre el póster
    // Entrada: auto LEGO recortado (con transparencia) y póster sin el auto
    cutout: '/cuadros/ferrari-auto.webp',
    cutout4k: '/cuadros/ferrari-auto-4k.webp', // LEGO recortado en 4K: capa sobre el póster
    // Entrada: auto F1 real visto desde arriba (foto de estudio recortada, escalada con IA)
    realCar: '/cuadros/ferrari-real.webp',
    realAspect: 0.3736,
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
  // Cuarto producto: cuadro panorámico con los 12 autos de la parrilla
  parrilla: {
    key: 'parrilla',
    layout: 'wide', // no va en la fila de 3 del inicio: tiene su propia sección
    poster: '/cuadros/parrilla-4k.webp', // escalado con IA desde la foto del producto
    posterSmall: '/cuadros/parrilla-2k.webp',
    // cada auto sobresale en relieve (recorte con su silueta, capa sobre el póster)
    cutout: '/cuadros/parrilla-auto.webp',
    cutout4k: '/cuadros/parrilla-auto-4k.webp',
    posterAspect: 2.7333, // cuadro completo, con las 12 bases enteras
    match: /(lights ?out|legends|parrilla|grid|12 autos|12 carros)/i,
    code: 'LOL',
    title: ['Lights Out', 'Legends Live'],
    titleStyle: 'rules',
    blurb:
      'Los 12 autos de la parrilla en LEGO, cada uno sobre la base del color de su equipo, con los circuitos del calendario y luz LED interior en el marco.',
    backdrop: { center: '#2a2d33', mid: '#16181c', edge: '#08090b' },
    // como en el cuadro real: tira LED blanca cálida escondida en el borde interior del
    // marco, que ilumina el fondo pegado al borde
    led: { border: null, halo: null, haloStrength: 0, lip: '#ffe9cc' },
    tires: '#f2c40c',
    engine: null,
    livery: {
      body: '#1a1b1f',
      bodyAlt: '#23252a',
      nose: '#1a1b1f',
      accent: '#ffffff',
      wing: '#141414',
      wingAccent: '#ffffff',
      rearFlap: '#1a1a1d',
      floor: '#0d0d0d',
      helmet: '#ffffff',
      stripes: '#ffffff',
    },
    // posición horizontal (fracción del póster) de cada auto, de izquierda a derecha
    cars: [
      { x: 0.0542, team: 'Ferrari', color: '#d3121a' },
      { x: 0.1356, team: 'McLaren', color: '#ff8000' },
      { x: 0.2170, team: 'Red Bull Racing', color: '#1e3a8a' },
      { x: 0.2983, team: 'Mercedes-AMG', color: '#00d2be' },
      { x: 0.3797, team: 'Aston Martin', color: '#0f7a4a' },
      { x: 0.4611, team: 'Alpine', color: '#f2a0c8' },
      { x: 0.5425, team: 'Haas', color: '#e10600' },
      { x: 0.6239, team: 'Racing Bulls', color: '#1f6fe0' },
      { x: 0.7052, team: 'Williams', color: '#1b2f9e' },
      { x: 0.7866, team: 'Kick Sauber', color: '#22b14c' },
      { x: 0.8680, team: 'APXGP', color: '#e0b000' },
      { x: 0.9494, team: 'Audi', color: '#c9ced6' },
    ],
    photos: ['/cuadros/parrilla-2k.webp'],
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
  if (MODELS.parrilla.match.test(haystack)) return MODELS.parrilla
  const found = ORDER.find((k) => MODELS[k].match.test(haystack))
  return MODELS[found ?? ORDER[index % ORDER.length]]
}
