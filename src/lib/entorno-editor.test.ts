import { describe, expect, it } from 'vitest';
import {
  determinarVistaInicial,
  puedeAccederRedaccion,
} from './entorno-editor';

describe('control de visibilidad de Mesa de Redacción', () => {
  it('mantiene visible la Mesa de Redacción en desarrollo local', () => {
    expect(
      puedeAccederRedaccion({ isDev: true, search: '', hash: '' })
    ).toBe(true);
    expect(
      determinarVistaInicial({ isDev: true, search: '', hash: '' })
    ).toBe('archivo');
  });

  it('oculta herramientas de redacción a visitantes públicos en producción', () => {
    expect(
      puedeAccederRedaccion({ isDev: false, search: '', hash: '' })
    ).toBe(false);
    expect(
      determinarVistaInicial({
        isDev: false,
        search: '?algo=1',
        hash: '#frases-bronce',
      })
    ).toBe('archivo');
  });

  it('habilita Mesa de Redacción en producción solo con ?editor=1 o #redaccion', () => {
    expect(
      puedeAccederRedaccion({ isDev: false, search: '?editor=1', hash: '' })
    ).toBe(true);
    expect(
      determinarVistaInicial({ isDev: false, search: '', hash: '#redaccion' })
    ).toBe('redaccion');
    expect(
      puedeAccederRedaccion({ isDev: false, search: '', hash: '#editor' })
    ).toBe(true);
  });
});
