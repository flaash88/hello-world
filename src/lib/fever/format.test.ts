import { describe, expect, it } from 'vitest'
import { dosis, grad, tagText } from './format'

describe('grad', () => {
  it('schreibt immer eine Nachkommastelle', () => {
    expect(grad(38)).toBe('38,0 °C')
    expect(grad(37.45)).toBe('37,5 °C')
  })
})

describe('dosis', () => {
  it('nennt beide Angaben, wenn beide dastehen', () => {
    expect(dosis({ doseMl: 2.5, doseMg: 100 })).toBe('2,5 ml · 100 mg')
  })

  it('bleibt leer, wenn nichts eingetragen ist', () => {
    expect(dosis({ doseMl: null, doseMg: null })).toBe('')
  })
})

describe('tagText', () => {
  it('nennt Flasche, Stillen und Windeln', () => {
    expect(tagText({ trinkmengeMl: 420, stillminuten: 65, windelnNass: 6, windelnStuhl: 2 })).toBe(
      '420 ml aus der Flasche · 65 Min gestillt · 6 nasse, 2 volle Windeln',
    )
  })

  it('lässt das Stillen weg, wenn nicht gestillt wurde', () => {
    expect(tagText({ trinkmengeMl: 300, stillminuten: 0, windelnNass: 4, windelnStuhl: 1 })).toBe(
      '300 ml aus der Flasche · 4 nasse, 1 volle Windeln',
    )
  })

  it('sagt bei null Flasche „keine Flasche" statt „0 ml"', () => {
    expect(tagText({ trinkmengeMl: 0, stillminuten: 90, windelnNass: 5, windelnStuhl: 0 })).toBe(
      'keine Flasche · 90 Min gestillt · 5 nasse, 0 volle Windeln',
    )
  })
})
