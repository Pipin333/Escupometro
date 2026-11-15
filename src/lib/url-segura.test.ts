import { describe, expect, it } from 'vitest';
import { esHostPrivadoOLocal, sanitizarUrlHttp } from './url-segura';

describe('sanitizarUrlHttp', () => {
  it('permite URLs https y http válidas normalizadas', () => {
    expect(sanitizarUrlHttp('https://www.biobiochile.cl/noticia/123')).toBe(
      'https://www.biobiochile.cl/noticia/123'
    );
    expect(sanitizarUrlHttp('  http://example.com/ruta?a=1#hash  ')).toBe(
      'http://example.com/ruta?a=1#hash'
    );
  });

  it('bloquea esquemas peligrosos o ejecutables', () => {
    expect(sanitizarUrlHttp('javascript:alert(1)')).toBeNull();
    expect(sanitizarUrlHttp('  JaVaScRiPt:alert(document.cookie)  ')).toBeNull();
    expect(sanitizarUrlHttp('data:text/html,<script>alert(1)</script>')).toBeNull();
    expect(sanitizarUrlHttp('vbscript:msgbox(1)')).toBeNull();
    expect(sanitizarUrlHttp('file:///etc/passwd')).toBeNull();
  });

  it('bloquea URLs con userinfo (phishing), caracteres de control o exceso de longitud', () => {
    expect(sanitizarUrlHttp('https://admin:secreto@banco.cl/login')).toBeNull();
    expect(sanitizarUrlHttp('https://kast.cl@atacante.tld/')).toBeNull();
    expect(sanitizarUrlHttp('https://ejemplo.cl/\nSet-Cookie: a=1')).toBeNull();
    expect(sanitizarUrlHttp(`https://ejemplo.cl/${'a'.repeat(2100)}`)).toBeNull();
    expect(sanitizarUrlHttp(null)).toBeNull();
    expect(sanitizarUrlHttp('/ruta-relativa')).toBeNull();
  });
});

describe('esHostPrivadoOLocal', () => {
  it('bloquea loopback, redes privadas RFC1918, link-local, CGNAT y multidifusión', () => {
    expect(esHostPrivadoOLocal('localhost')).toBe(true);
    expect(esHostPrivadoOLocal('api.localhost')).toBe(true);
    expect(esHostPrivadoOLocal('servicio.internal')).toBe(true);
    expect(esHostPrivadoOLocal('127.0.0.1')).toBe(true);
    expect(esHostPrivadoOLocal('0.0.0.0')).toBe(true);
    expect(esHostPrivadoOLocal('10.24.0.5')).toBe(true);
    expect(esHostPrivadoOLocal('172.16.0.1')).toBe(true);
    expect(esHostPrivadoOLocal('192.168.1.10')).toBe(true);
    expect(esHostPrivadoOLocal('169.254.169.254')).toBe(true);
    expect(esHostPrivadoOLocal('100.64.0.1')).toBe(true);
    expect(esHostPrivadoOLocal('[::1]')).toBe(true);
    expect(esHostPrivadoOLocal('[::ffff:7f00:1]')).toBe(true);
    expect(esHostPrivadoOLocal('[::ffff:a9fe:a9fe]')).toBe(true);
    expect(esHostPrivadoOLocal('[fe80::1]')).toBe(true);
  });

  it('permite dominios e IPs públicas legítimas', () => {
    expect(esHostPrivadoOLocal('www.latercera.com')).toBe(false);
    expect(esHostPrivadoOLocal('news.google.com')).toBe(false);
    expect(esHostPrivadoOLocal('172.32.0.1')).toBe(false);
    expect(esHostPrivadoOLocal('8.8.8.8')).toBe(false);
  });
});
