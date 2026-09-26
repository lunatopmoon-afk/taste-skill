// Los 12 autos de "Lights Out Legends Live" para la carrera 3D de la sección de la parrilla.
// Colores tomados de los autos LEGO reales del cuadro (en colores oficiales LEGO), en el
// mismo orden que en el cuadro, de izquierda a derecha.
import { MODELS } from './models.js'

const BLACK = '#05131D'
const WHITE = '#F4F4F4'
const RED = '#C91A09'
const CARBON = '#0e0e0f'

function team(key, name, livery, tires = '#F2CD37', engine = null) {
  return {
    key,
    name,
    tires,
    engine,
    livery: {
      floor: '#0a0a0b',
      wing: CARBON,
      rearFlap: livery.body,
      helmet: livery.accent,
      stripes: livery.accent,
      ...livery,
    },
  }
}

export const GRID_TEAMS = [
  { ...MODELS.ferrari, name: 'Ferrari' },
  team('mclaren', 'McLaren', {
    body: '#FE8A18',
    bodyAlt: BLACK,
    nose: '#FE8A18',
    accent: BLACK,
    wingAccent: '#FE8A18',
    rearFlap: '#FE8A18',
  }),
  { ...MODELS.redbull, name: 'Red Bull Racing' },
  { ...MODELS.mercedes, name: 'Mercedes-AMG' },
  team('aston', 'Aston Martin', {
    body: '#184632',
    bodyAlt: '#0f2c20',
    nose: '#184632',
    accent: '#BBE90B',
    wingAccent: '#BBE90B',
  }),
  team('alpine', 'Alpine', {
    body: '#0055BF',
    bodyAlt: BLACK,
    nose: BLACK,
    noseTip: '#E4ADC8',
    accent: '#E4ADC8',
    wingAccent: '#E4ADC8',
    rearFlap: '#E4ADC8',
  }),
  team('haas', 'Haas', {
    body: BLACK,
    bodyAlt: WHITE,
    nose: WHITE,
    accent: RED,
    wingAccent: RED,
    rearFlap: RED,
  }, RED),
  team('racingbulls', 'Racing Bulls', {
    body: '#0055BF',
    bodyAlt: WHITE,
    nose: WHITE,
    accent: RED,
    wingAccent: WHITE,
  }, WHITE),
  team('williams', 'Williams', {
    body: '#0A3463',
    bodyAlt: '#0055BF',
    nose: '#0055BF',
    noseTip: WHITE,
    accent: '#5A93DB',
    wingAccent: WHITE,
  }),
  team('sauber', 'Kick Sauber', {
    body: '#4BD12A',
    bodyAlt: BLACK,
    nose: BLACK,
    accent: '#4BD12A',
    wingAccent: '#4BD12A',
    rearFlap: BLACK,
  }),
  team('apxgp', 'APXGP', {
    body: BLACK,
    bodyAlt: '#1b1b1d',
    nose: BLACK,
    noseTip: '#E0B000',
    accent: '#E0B000',
    wingAccent: '#E0B000',
  }),
  team('audi', 'Audi', {
    body: '#A0A5A9',
    bodyAlt: '#6C6E68',
    nose: WHITE,
    accent: RED,
    wingAccent: '#A0A5A9',
    rearFlap: RED,
  }, RED),
]
