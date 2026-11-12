import { describe, expect, it, vi } from 'vitest';
import {
  calcularResumenEncuesta,
  cargarEncuestaGlobal,
  crearEstadoInicialEncuesta,
  enviarVotoGlobal,
  registrarVotoEncuesta,
} from './encuesta';

describe('encuesta de apoyo al gobierno', () => {
  it('inicia en cero sin votos ficticios', () => {
    const inicial = crearEstadoInicialEncuesta();
    const resumen = calcularResumenEncuesta(inicial.conteos);
    expect(resumen.total).toBe(0);
    expect(resumen.porcentajes).toEqual({
      aprueba: 0,
      desaprueba: 0,
      neutral: 0,
    });
  });

  it('registra voto y permite cambiar de opción sin duplicar conteo', () => {
    let estado = crearEstadoInicialEncuesta();
    estado = registrarVotoEncuesta(estado, 'desaprueba', '2026-11-12T18:00:00Z');
    expect(estado.conteos.desaprueba).toBe(1);
    expect(estado.votoUsuario).toBe('desaprueba');

    // Repetir la misma opción no duplica
    estado = registrarVotoEncuesta(estado, 'desaprueba', '2026-11-12T18:01:00Z');
    expect(estado.conteos.desaprueba).toBe(1);

    // Cambiar de opción resta la anterior y suma la nueva
    estado = registrarVotoEncuesta(estado, 'aprueba', '2026-11-12T18:02:00Z');
    expect(estado.conteos).toEqual({ aprueba: 1, desaprueba: 0, neutral: 0 });
    expect(calcularResumenEncuesta(estado.conteos)).toEqual({
      total: 1,
      porcentajes: { aprueba: 100, desaprueba: 0, neutral: 0 },
    });
  });

  it('sincroniza encuesta global cuando /api/encuesta está configurada y degrada a null si no', async () => {
    const fetchNoConfig = vi.fn().mockResolvedValue({ ok: false, status: 503 }) as unknown as typeof fetch;
    expect(await cargarEncuestaGlobal(fetchNoConfig)).toBeNull();

    const fetchOk = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        configurada: true,
        conteos: { aprueba: 12, desaprueba: 45, neutral: 3 },
        actualizadoEn: '2026-11-12T18:50:00Z',
      }),
    }) as unknown as typeof fetch;

    const globalResp = await cargarEncuestaGlobal(fetchOk);
    expect(globalResp?.conteos).toEqual({ aprueba: 12, desaprueba: 45, neutral: 3 });

    const postResp = await enviarVotoGlobal('desaprueba', null, fetchOk);
    expect(postResp?.configurada).toBe(true);
  });
});
