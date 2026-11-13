import { describe, it, expect } from 'vitest';
import {
  calcularTotalVotosExpediente,
  cargarVotosGlobales,
  enviarVotoExpedienteGlobal,
  normalizarVotosApi,
} from './votos';
import { parsearVotosDesdeHgetall } from '../../api/votos';

describe('Votos globales de expedientes', () => {
  it('sincroniza conteos globales cuando /api/votos responde ok y degrada a null si falla', async () => {
    const fetchOk = (async () =>
      new Response(
        JSON.stringify({
          configurada: true,
          votos: { 'trinidad-zegers-rabat-nepotismo-2026': 12, 'otro-caso': 3 },
        }),
        { status: 200 }
      )) as unknown as typeof fetch;

    const mapa = await cargarVotosGlobales(fetchOk);
    expect(mapa).toEqual({
      'trinidad-zegers-rabat-nepotismo-2026': 12,
      'otro-caso': 3,
    });

    const fetch503 = (async () =>
      new Response(JSON.stringify({ configurada: false }), { status: 503 })) as unknown as typeof fetch;

    expect(await cargarVotosGlobales(fetch503)).toBeNull();
  });

  it('envía sumar/restar a /api/votos y retorna el total actualizado', async () => {
    let metodoUsado = '';
    let cuerpoEnviado: Record<string, unknown> = {};

    const fetchPost = (async (_url: RequestInfo | URL, init?: RequestInit) => {
      metodoUsado = init?.method ?? '';
      cuerpoEnviado = JSON.parse(String(init?.body ?? '{}')) as Record<string, unknown>;
      return new Response(
        JSON.stringify({ configurada: true, id: 'caso-1', votos: 7 }),
        { status: 200 }
      );
    }) as unknown as typeof fetch;

    const total = await enviarVotoExpedienteGlobal('caso-1', 'sumar', fetchPost);
    expect(metodoUsado).toBe('POST');
    expect(cuerpoEnviado).toEqual({ id: 'caso-1', accion: 'sumar' });
    expect(total).toBe(7);

    const fetchError = (async () => {
      throw new Error('sin red');
    }) as unknown as typeof fetch;
    expect(await enviarVotoExpedienteGlobal('caso-1', 'restar', fetchError)).toBeNull();
  });

  it('parsea HGETALL de Upstash en formato lista o mapa y normaliza totales', () => {
    expect(
      parsearVotosDesdeHgetall(['caso-a', '15', 'caso-b', '-4', 'invalido con espacios', '9'])
    ).toEqual({
      'caso-a': 15,
      'caso-b': 0,
    });

    expect(normalizarVotosApi({ 'caso-a': 4.8, malo: -1, texto: 'nope' })).toEqual({
      'caso-a': 4,
    });

    expect(calcularTotalVotosExpediente(100, 14, 0)).toBe(114);
    expect(calcularTotalVotosExpediente(undefined, undefined, -3)).toBe(0);
  });
});
