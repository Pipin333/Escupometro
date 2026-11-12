import type {
  CategoriaEscupo,
  DichoHistorico,
  PosturaDicho,
} from '../types/escupo';
import { normalizarTexto, tokenizar } from './detector';

export interface RegistroDichoCrudo {
  id?: string;
  fecha: string;
  texto: string;
  url: string;
  usuario?: string;
  rol?: string;
  tipoMedio?: DichoHistorico['tipoMedio'];
}

export interface ResultadoFusionDichos {
  dichos: DichoHistorico[];
  agregados: number;
  omitidosDuplicados: number;
}

const REGLAS_CATEGORIA: ReadonlyArray<{
  categoria: CategoriaEscupo;
  palabras: ReadonlyArray<string>;
}> = [
  {
    categoria: 'nepotismo',
    palabras: [
      'pituto',
      'pitutos',
      'pariente',
      'parientes',
      'familiar',
      'familiares',
      'operador',
      'operadores',
      'cuoteo',
      'cargo',
      'designacion',
      'merito',
      'idoneidad',
      'preparado',
      'sueldo',
      'asesor',
      'asesores',
      'nepotismo',
      'corrupcion',
    ],
  },
  {
    categoria: 'impuestos',
    palabras: [
      'impuesto',
      'impuestos',
      'iva',
      'contribuciones',
      'tributaria',
      'tributo',
      'recaudacion',
      'bencina',
      'combustible',
      'combustibles',
      'petroleo',
      'alza',
      'pymes',
      'sii',
      'arancel',
      'tasas',
    ],
  },
  {
    categoria: 'seguridad',
    palabras: [
      'delincuencia',
      'delincuente',
      'delincuentes',
      'narcotrafico',
      'narco',
      'crimen',
      'indulto',
      'indultos',
      'carcel',
      'condena',
      'pena',
      'rebaja',
      'terrorismo',
      'carabineros',
      'frontera',
      'migracion',
      'seguridad',
      'homicidio',
      'violencia',
    ],
  },
  {
    categoria: 'gasto-publico',
    palabras: [
      'gasto',
      'austeridad',
      'despilfarro',
      'viatico',
      'viaticos',
      'viaje',
      'viajes',
      'gira',
      'giras',
      'comitiva',
      'presupuesto',
      'fiscal',
      'deficit',
      'estado',
      'ministerio',
      'ministerios',
      'licencia',
      'fundacion',
      'fundaciones',
      'grasa',
    ],
  },
  {
    categoria: 'constitucion',
    palabras: [
      'constitucion',
      'constitucional',
      'congreso',
      'senado',
      'camara',
      'contraloria',
      'decreto',
      'ley',
      'reglamento',
      'institucionalidad',
      'democracia',
      'plebiscito',
      'tribunal',
      'republica',
    ],
  },
  {
    categoria: 'libertades',
    palabras: [
      'libertad',
      'expresion',
      'prensa',
      'censura',
      'transparencia',
      'probidad',
      'propiedad',
      'protesta',
      'paro',
      'bloqueo',
      'derecho',
      'censurar',
      'opinar',
    ],
  },
];

const REGLAS_POSTURA: ReadonlyArray<{
  postura: PosturaDicho;
  patrones: ReadonlyArray<string>;
}> = [
  {
    postura: 'promete',
    patrones: [
      'vamos a',
      'haremos',
      'terminaremos',
      'eliminaremos',
      'reduciremos',
      'en nuestro gobierno',
      'mi compromiso',
      'nos comprometemos',
      'devolveremos',
      'cerraremos',
    ],
  },
  {
    postura: 'prohibe',
    patrones: [
      'no mas',
      'nunca mas',
      'jamas',
      'prohibir',
      'prohibido',
      'intolerable',
      'inaceptable',
      'inadmisible',
      'basta de',
      'cero tolerancia',
    ],
  },
  {
    postura: 'exige',
    patrones: [
      'debe ',
      'deben ',
      'tiene que',
      'tienen que',
      'exigimos',
      'exijo',
      'renuncia',
      'renunciar',
      'urge',
      'es urgente',
      'hay que',
      'necesitamos',
    ],
  },
  {
    postura: 'condena',
    patrones: [
      'verguenza',
      'escandalo',
      'fracaso',
      'corrupcion',
      'ineptitud',
      'abuso',
      'mentira',
      'engano',
      'doble estandar',
      'inconsecuencia',
    ],
  },
];

const PALABRAS_RUIDO_CONCEPTOS = new Set([
  'chile',
  'gobierno',
  'presidente',
  'ahora',
  'hoy',
  'ayer',
  'siempre',
  'nunca',
  'todo',
  'todos',
  'todas',
  'solo',
  'hacer',
  'hace',
  'tiene',
  'tienen',
  'esta',
  'estan',
  'este',
  'estos',
  'puede',
  'pueden',
  'pais',
  'personas',
  'gente',
  'jose',
  'antonio',
  'kast',
  'joseantoniokast',
]);

/**
 * Limpia enlaces acortados de X (`t.co`) y espacios redundantes en el texto de un tweet.
 *
 * @param texto Texto crudo del tweet o declaración.
 * @returns Cita limpia preservando el contenido sustantivo.
 */
export function limpiarTextoTweet(texto: string): string {
  return texto
    .replace(/https?:\/\/t\.co\/\w+/gi, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Normaliza una fecha arbitraria (`YYYY-MM-DD`, ISO 8601 o formato Twitter) a `YYYY-MM-DD`.
 *
 * @param fecha Fecha original entregada por API o exportación.
 * @returns Fecha en formato `YYYY-MM-DD`, o cadena vacía si no es parseable.
 */
export function normalizarFechaIso(fecha: string): string {
  const limpia = fecha.trim();
  if (!limpia) return '';

  const coincidenciaDirecta = limpia.match(/^(\d{4}-\d{2}-\d{2})/);
  if (coincidenciaDirecta) {
    return coincidenciaDirecta[1];
  }

  const parsed = new Date(limpia);
  if (Number.isNaN(parsed.getTime())) {
    return '';
  }

  return parsed.toISOString().slice(0, 10);
}

/**
 * Extrae el ID numérico de un tweet desde una URL de `x.com` o `twitter.com`.
 *
 * @param url URL del estado o publicación.
 * @returns ID numérico del tweet o `null` si la URL no corresponde a un status.
 */
export function extraerIdTweetDesdeUrl(url: string): string | null {
  const match = url.match(/(?:twitter\.com|x\.com)\/[^/]+\/status\/(\d+)/i);
  return match ? match[1] : null;
}

/**
 * Normaliza una URL de publicación para detectar duplicados entre `twitter.com` y `x.com`.
 *
 * @param url URL original de fuente.
 * @returns URL canónica en minúsculas sin parámetros de seguimiento.
 */
export function normalizarUrlFuente(url: string): string {
  const sinQuery = url.trim().split('?')[0].split('#')[0].replace(/\/+$/, '');
  return sinQuery
    .toLowerCase()
    .replace(/^https?:\/\/(?:www\.)?twitter\.com\//, 'https://x.com/')
    .replace(/^https?:\/\/(?:www\.)?x\.com\//, 'https://x.com/');
}

/**
 * Infiere el cargo o rol político aproximado según la fecha histórica de la declaración.
 *
 * @param fechaIso Fecha normalizada `YYYY-MM-DD`.
 * @returns Rol político contextual en Chile.
 */
export function inferirRolPorFecha(fechaIso: string): string {
  if (!fechaIso) return 'Declaración histórica';
  if (fechaIso < '2018-03-11') return 'Diputado / Candidato presidencial';
  if (fechaIso < '2025-12-15') return 'Líder de oposición / Candidato presidencial';
  if (fechaIso < '2026-03-11') return 'Presidente electo';
  return 'Presidente en ejercicio';
}

/**
 * Determina si un texto de tweet corresponde a una declaración original sustantiva
 * y no a un retweet ni a ruido demasiado breve para contrastar contra prensa.
 *
 * @param texto Texto del tweet ya sea crudo o limpio.
 * @returns `true` cuando el tweet contiene una afirmación contrastable.
 */
export function esTweetSustantivo(texto: string): boolean {
  const crudoSinEspacios = texto.trim();
  if (/^rt\s+@/i.test(crudoSinEspacios)) {
    return false;
  }

  const limpio = limpiarTextoTweet(crudoSinEspacios);
  if (limpio.length < 35) {
    return false;
  }

  return tokenizar(limpio).length >= 5;
}

/**
 * Clasifica automáticamente una cita dentro de las categorías temáticas del observatorio.
 *
 * @param texto Texto de la declaración o tweet.
 * @returns Categoría dominante según coincidencia léxica.
 */
export function inferirCategoriaDicho(texto: string): CategoriaEscupo {
  const normalizado = ` ${normalizarTexto(texto)} `;
  const tokens = new Set(tokenizar(texto));

  let mejorCategoria: CategoriaEscupo = 'gasto-publico';
  let mejorPuntaje = 0;

  for (const regla of REGLAS_CATEGORIA) {
    let puntaje = 0;
    for (const palabra of regla.palabras) {
      if (tokens.has(palabra) || normalizado.includes(` ${palabra} `)) {
        puntaje += 2;
      } else if (normalizado.includes(palabra)) {
        puntaje += 1;
      }
    }

    if (puntaje > mejorPuntaje) {
      mejorPuntaje = puntaje;
      mejorCategoria = regla.categoria;
    }
  }

  return mejorCategoria;
}

/**
 * Infiere la postura normativa del emisor (`promete`, `prohibe`, `exige` o `condena`).
 *
 * @param texto Texto de la declaración o tweet.
 * @returns Postura detectada para alimentar el motor de contradicciones.
 */
export function inferirPosturaDicho(texto: string): PosturaDicho {
  const normalizado = normalizarTexto(texto);

  for (const regla of REGLAS_POSTURA) {
    for (const patron of regla.patrones) {
      if (normalizado.includes(patron)) {
        return regla.postura;
      }
    }
  }

  return 'condena';
}

function reducirPluralEspanol(palabra: string): string {
  if (palabra.length <= 4) return palabra;
  if (/(?:jes|tes|ches|lles)$/.test(palabra)) {
    return palabra.slice(0, -1);
  }
  if (/(?:ones|ores|ades|udes|eyes|ices)$/.test(palabra)) {
    return palabra.slice(0, -2);
  }
  if (/(?:as|os|is)$/.test(palabra)) {
    return palabra.slice(0, -1);
  }
  return palabra;
}

/**
 * Extrae conceptos clave limpios y ordenados por relevancia semántica para el cruce RSS.
 *
 * @param texto Texto de la declaración o tweet.
 * @param maxConceptos Límite superior de conceptos a conservar.
 * @returns Lista deduplicada de términos clave normalizados.
 */
export function extraerConceptosClave(texto: string, maxConceptos = 8): string[] {
  const textoSinMenciones = limpiarTextoTweet(texto).replace(/@[a-z0-9_]+/gi, ' ');
  const tokensCrudos = normalizarTexto(textoSinMenciones)
    .split(' ')
    .filter((token) => token.length >= 4);
  const frecuencia = new Map<string, number>();

  for (const raw of tokensCrudos) {
    if (PALABRAS_RUIDO_CONCEPTOS.has(raw)) {
      continue;
    }
    const concepto = reducirPluralEspanol(raw);
    if (concepto.length < 4 || PALABRAS_RUIDO_CONCEPTOS.has(concepto)) {
      continue;
    }
    frecuencia.set(concepto, (frecuencia.get(concepto) ?? 0) + 1);
  }

  const diccionarioDominio = new Set(
    REGLAS_CATEGORIA.flatMap((regla) =>
      regla.palabras.flatMap((palabra) => [
        palabra,
        reducirPluralEspanol(palabra),
        ...tokenizar(palabra),
      ])
    )
  );

  return [...frecuencia.entries()]
    .sort((a, b) => {
      const pesoDominioA = diccionarioDominio.has(a[0]) ? 10 : 0;
      const pesoDominioB = diccionarioDominio.has(b[0]) ? 10 : 0;
      const scoreA = a[1] * 3 + pesoDominioA + Math.min(a[0].length, 10) * 0.2;
      const scoreB = b[1] * 3 + pesoDominioB + Math.min(b[0].length, 10) * 0.2;
      return scoreB - scoreA;
    })
    .slice(0, maxConceptos)
    .map(([token]) => token);
}

function generarHashCorto(entrada: string): string {
  let hash = 2166136261;
  for (let i = 0; i < entrada.length; i += 1) {
    hash ^= entrada.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(36);
}

/**
 * Convierte un registro crudo de tweet o declaración en un `DichoHistorico` listo
 * para almacenarse en `src/data/archivo-dichos.json`.
 *
 * @param crudo Registro de entrada con texto, fecha y URL.
 * @returns Objeto `DichoHistorico` estructurado, o `null` si los datos son insuficientes.
 */
export function construirDichoHistorico(
  crudo: RegistroDichoCrudo
): DichoHistorico | null {
  const fechaIso = normalizarFechaIso(crudo.fecha);
  const cita = limpiarTextoTweet(crudo.texto);
  const url = crudo.url.trim();

  if (!fechaIso || cita.length < 15 || !url) {
    return null;
  }

  const tweetId = extraerIdTweetDesdeUrl(url);
  const idBase =
    crudo.id?.trim() ||
    (tweetId
      ? `tweet-${tweetId}`
      : `dicho-${fechaIso}-${generarHashCorto(normalizarTexto(cita))}`);

  const usuarioNormalizado = crudo.usuario
    ? crudo.usuario.startsWith('@')
      ? crudo.usuario
      : `@${crudo.usuario}`
    : '@joseantoniokast';

  return {
    id: idBase,
    fecha: fechaIso,
    rol: crudo.rol?.trim() || inferirRolPorFecha(fechaIso),
    tipoMedio: crudo.tipoMedio ?? 'tweet',
    ...(crudo.tipoMedio === undefined || crudo.tipoMedio === 'tweet'
      ? { usuarioTweet: usuarioNormalizado }
      : {}),
    cita,
    fuenteUrl: url,
    categoria: inferirCategoriaDicho(cita),
    postura: inferirPosturaDicho(cita),
    conceptosClave: extraerConceptosClave(cita),
  };
}

/**
 * Fusiona nuevos dichos dentro del archivo histórico sin duplicar entradas existentes,
 * comparando por ID, URL normalizada y texto normalizado de la cita.
 *
 * @param existentes Registros ya guardados en `archivo-dichos.json`.
 * @param nuevos Registros recién ingestados.
 * @returns Arreglo consolidado ordenado del más reciente al más antiguo y contadores.
 */
export function fusionarDichosSinDuplicados(
  existentes: DichoHistorico[],
  nuevos: DichoHistorico[]
): ResultadoFusionDichos {
  const ids = new Set<string>();
  const urls = new Set<string>();
  const citas = new Set<string>();

  const registrarClaves = (dicho: DichoHistorico): void => {
    ids.add(dicho.id);
    if (dicho.fuenteUrl) {
      urls.add(normalizarUrlFuente(dicho.fuenteUrl));
    }
    citas.add(normalizarTexto(dicho.cita));
  };

  const combinados: DichoHistorico[] = [];
  for (const dicho of existentes) {
    registrarClaves(dicho);
    combinados.push(dicho);
  }

  let agregados = 0;
  let omitidosDuplicados = 0;

  for (const candidato of nuevos) {
    const claveUrl = candidato.fuenteUrl
      ? normalizarUrlFuente(candidato.fuenteUrl)
      : '';
    const claveCita = normalizarTexto(candidato.cita);

    const yaExiste =
      ids.has(candidato.id) ||
      (claveUrl !== '' && urls.has(claveUrl)) ||
      citas.has(claveCita);

    if (yaExiste) {
      omitidosDuplicados += 1;
      continue;
    }

    registrarClaves(candidato);
    combinados.push(candidato);
    agregados += 1;
  }

  combinados.sort((a, b) => b.fecha.localeCompare(a.fecha));

  return {
    dichos: combinados,
    agregados,
    omitidosDuplicados,
  };
}
