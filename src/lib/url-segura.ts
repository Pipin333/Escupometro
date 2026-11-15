const MAX_URL_LONGITUD = 2048;
const REGEX_CARACTERES_CONTROL = /[\u0000-\u001F\u007F]/;

/**
 * Valida y normaliza una URL externa garantizando esquema HTTP(S) seguro
 * sin credenciales embebidas ni esquemas ejecutables (`javascript:`, `data:`, etc.).
 *
 * @param valor Valor candidato a URL externa.
 * @returns URL normalizada (`parsed.href`) o `null` si no supera la validación.
 */
export function sanitizarUrlHttp(valor: unknown): string | null {
  if (typeof valor !== 'string') return null;

  const limpia = valor.trim();
  if (!limpia || limpia.length > MAX_URL_LONGITUD || REGEX_CARACTERES_CONTROL.test(limpia)) {
    return null;
  }

  let parsed: URL;
  try {
    parsed = new URL(limpia);
  } catch {
    return null;
  }

  if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') {
    return null;
  }

  if (!parsed.hostname || parsed.username || parsed.password) {
    return null;
  }

  return parsed.href;
}

/**
 * Determina si un hostname apunta a loopback, red privada, enlace local o dominio interno
 * para prevenir redirecciones SSRF desde scrapers del servidor.
 *
 * @param hostname Hostname ya normalizado desde `URL.hostname`.
 * @returns `true` si el destino corresponde a una dirección privada o reservada.
 */
export function esHostPrivadoOLocal(hostname: string): boolean {
  const host = hostname.trim().toLowerCase().replace(/^\[|\]$/g, '');
  if (!host) return true;

  if (
    host === 'localhost' ||
    host.endsWith('.localhost') ||
    host.endsWith('.local') ||
    host.endsWith('.internal')
  ) {
    return true;
  }

  if (
    host === '::' ||
    host === '::1' ||
    /^fe[89ab][0-9a-f]?:/i.test(host) ||
    /^f[cd][0-9a-f]{2}:/i.test(host)
  ) {
    return true;
  }

  let hostIpv4 = host.startsWith('::ffff:') ? host.slice(7) : host;
  const matchIpv6HexMapped = hostIpv4.match(/^([0-9a-f]{1,4}):([0-9a-f]{1,4})$/i);
  if (host.startsWith('::ffff:') && matchIpv6HexMapped) {
    const hi = Number.parseInt(matchIpv6HexMapped[1], 16);
    const lo = Number.parseInt(matchIpv6HexMapped[2], 16);
    hostIpv4 = `${(hi >> 8) & 0xff}.${hi & 0xff}.${(lo >> 8) & 0xff}.${lo & 0xff}`;
  }

  const matchIpv4 = hostIpv4.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
  if (matchIpv4) {
    const a = Number(matchIpv4[1]);
    const b = Number(matchIpv4[2]);
    if (a === 0 || a === 10 || a === 127) return true;
    if (a === 169 && b === 254) return true;
    if (a === 172 && b >= 16 && b <= 31) return true;
    if (a === 192 && b === 168) return true;
    if (a === 100 && b >= 64 && b <= 127) return true;
    if (a >= 224) return true;
  }

  return false;
}
