import * as THREE from 'three'
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js'
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js'

// Piezas LEGO con forma real (unidad = 1 stud = 8 mm):
// ladrillos y placas con sus studs, vigas Technic con agujeros de verdad,
// engranajes con dientes, ejes en cruz y pines con collarín.

const STUD_R = 0.3
const STUD_H = 0.18
const BRICK_H = 1.2
const PLATE_H = 0.4

function prep(g) {
  const out = g.index ? g.toNonIndexed() : g
  out.deleteAttribute?.('uv')
  return out
}

function studs(cols, rows, top) {
  const parts = []
  for (let i = 0; i < cols; i++)
    for (let j = 0; j < rows; j++) {
      const s = new THREE.CylinderGeometry(STUD_R, STUD_R, STUD_H, 16)
      s.translate(i - (cols - 1) / 2, top + STUD_H / 2, j - (rows - 1) / 2)
      parts.push(prep(s))
    }
  return parts
}

function brick(cols, rows, h = BRICK_H) {
  const body = new RoundedBoxGeometry(cols - 0.02, h, rows - 0.02, 2, 0.05)
  const g = mergeGeometries([prep(body), ...studs(cols, rows, h / 2)])
  g.computeVertexNormals()
  return g
}

// Viga Technic: perfil de "estadio" con agujeros redondos pasantes
function technicBeam(holes) {
  const len = holes - 1
  const shape = new THREE.Shape()
  shape.moveTo(0, -0.5)
  shape.lineTo(len, -0.5)
  shape.absarc(len, 0, 0.5, -Math.PI / 2, Math.PI / 2, false)
  shape.lineTo(0, 0.5)
  shape.absarc(0, 0, 0.5, Math.PI / 2, (Math.PI * 3) / 2, false)
  for (let i = 0; i < holes; i++) {
    const h = new THREE.Path()
    h.absarc(i, 0, 0.24, 0, Math.PI * 2, true)
    shape.holes.push(h)
  }
  const g = new THREE.ExtrudeGeometry(shape, {
    depth: 0.72,
    bevelEnabled: true,
    bevelThickness: 0.04,
    bevelSize: 0.04,
    bevelSegments: 2,
    curveSegments: 14,
  })
  g.translate(-len / 2, 0, -0.36)
  return prep(g)
}

// Engranaje con dientes y agujero de eje en cruz
function gear(teeth) {
  const R = teeth / 16
  const shape = new THREE.Shape()
  const steps = teeth * 4
  for (let i = 0; i <= steps; i++) {
    const a = (i / steps) * Math.PI * 2
    const r = i % 4 < 2 ? R + 0.16 : R
    const x = Math.cos(a) * r
    const y = Math.sin(a) * r
    i === 0 ? shape.moveTo(x, y) : shape.lineTo(x, y)
  }
  const c = 0.09
  const w = 0.24
  const cross = new THREE.Path()
  cross.moveTo(c, w)
  ;[
    [-c, w],
    [-c, c],
    [-w, c],
    [-w, -c],
    [-c, -c],
    [-c, -w],
    [c, -w],
    [c, -c],
    [w, -c],
    [w, c],
    [c, c],
    [c, w],
  ].forEach(([x, y]) => cross.lineTo(x, y))
  shape.holes.push(cross)
  const g = new THREE.ExtrudeGeometry(shape, {
    depth: 0.34,
    bevelEnabled: true,
    bevelThickness: 0.03,
    bevelSize: 0.03,
    bevelSegments: 1,
  })
  g.translate(0, 0, -0.17)
  return prep(g)
}

// Eje Technic: sección en cruz
function axle(len) {
  const c = 0.09
  const w = 0.24
  const shape = new THREE.Shape()
  shape.moveTo(c, w)
  ;[
    [-c, w],
    [-c, c],
    [-w, c],
    [-w, -c],
    [-c, -c],
    [-c, -w],
    [c, -w],
    [c, -c],
    [w, -c],
    [w, c],
    [c, c],
    [c, w],
  ].forEach(([x, y]) => shape.lineTo(x, y))
  const g = new THREE.ExtrudeGeometry(shape, { depth: len, bevelEnabled: false })
  g.translate(0, 0, -len / 2)
  return prep(g)
}

// Pin Technic con collarín central
function pin() {
  const a = new THREE.CylinderGeometry(0.24, 0.24, 1.9, 16)
  const b = new THREE.CylinderGeometry(0.3, 0.3, 0.14, 16)
  const g = mergeGeometries([prep(a), prep(b)])
  g.computeVertexNormals()
  return g
}

let cache
export function legoGeometries() {
  if (cache) return cache
  cache = {
    brick2x4: brick(4, 2),
    brick2x2: brick(2, 2),
    brick1x2: brick(2, 1),
    plate2x4: brick(4, 2, PLATE_H),
    plate1x4: brick(4, 1, PLATE_H),
    beam7: technicBeam(7),
    beam5: technicBeam(5),
    gear24: gear(24),
    gear12: gear(12),
    axle4: axle(4),
    pin: pin(),
  }
  return cache
}

// Mezcla de piezas en la explosión (peso relativo)
export const PIECE_MIX = [
  ['beam7', 0.14],
  ['beam5', 0.14],
  ['brick2x4', 0.12],
  ['brick2x2', 0.12],
  ['brick1x2', 0.1],
  ['plate2x4', 0.1],
  ['plate1x4', 0.08],
  ['gear24', 0.05],
  ['gear12', 0.05],
  ['axle4', 0.05],
  ['pin', 0.05],
]

// Colores oficiales LEGO: cada pieza toma el color LEGO más cercano al de la foto
const PALETTE = [
  '#05131D', // Black
  '#6C6E68', // Dark Bluish Gray
  '#A0A5A9', // Light Bluish Gray
  '#F4F4F4', // White
  '#C91A09', // Red
  '#720E0F', // Dark Red
  '#0055BF', // Blue
  '#0A3463', // Dark Blue
  '#5A93DB', // Medium Blue
  '#F2CD37', // Yellow
  '#FE8A18', // Orange
  '#F8BB3D', // Bright Light Orange
  '#008F9B', // Dark Turquoise
  '#36AEBF', // Medium Azure
  '#BBE90B', // Lime
].map((h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16))) // sRGB 0-255

// r, g, b en sRGB 0-1 (tal como vienen del píxel de la foto)
export function nearestLegoColor(r, g, b) {
  // distancia "redmean": se parece más a cómo vemos el color que la RGB simple
  const R = r * 255
  const G = g * 255
  const B = b * 255
  let best = PALETTE[0]
  let bestD = Infinity
  for (const c of PALETTE) {
    const rm = (R + c[0]) / 2
    const d =
      (2 + rm / 256) * (R - c[0]) ** 2 +
      4 * (G - c[1]) ** 2 +
      (2 + (255 - rm) / 256) * (B - c[2]) ** 2
    if (d < bestD) {
      bestD = d
      best = c
    }
  }
  return new THREE.Color().setRGB(best[0] / 255, best[1] / 255, best[2] / 255, THREE.SRGBColorSpace)
}
