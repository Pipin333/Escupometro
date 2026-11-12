import type {
  CandidatoContradiccion,
  DichoHistorico,
  NoticiaScrapeada,
} from '../types/escupo';

const STOP_WORDS = new Set([
  'el', 'la', 'los', 'las', 'un', 'una', 'unos', 'unas', 'de', 'del', 'al', 'a',
  'en', 'con', 'por', 'para', 'sin', 'sobre', 'entre', 'y', 'o', 'pero', 'que',
  'se', 'su', 'sus', 'es', 'son', 'fue', 'ser', 'ha', 'han', 'este', 'esta',
  'como', 'mas', 'ya', 'no', 'si', 'chile', 'kast', 'jose', 'antonio', 'gobierno',
]);

/**
 * Mapa de equivalencias léxicas para ampliar el alcance semántico entre titulares y dichos.
 */
const SINONIMOS_DOMINIO: Record<string, string[]> = {
  viaje: ['gira', 'periplo', 'extranjero', 'comitiva', 'europa', 'asia', 'china', 'vietnam', 'japon', 'madrid', 'roma'],
  indulto: ['rebaja', 'condena', 'pena', 'beneficio', 'carcelario', 'reos', 'decreto', 'abusador', 'pederasta', 'violador', 'rabat'],
  bencina: ['combustible', 'combustibles', 'diesel', 'petroleo', 'bencinazo', 'transporte', 'camioneros', 'paro'],
  corrupcion: ['fraude', 'desafuero', 'pituto', 'convenios', 'fundaciones', 'cargo', 'fisco', 'cohecho', 'sueldo'],
  china: ['beijing', 'xi', 'jinping', 'vietnam', 'comunista', 'comunismo', 'asia'],
  empleo: ['desempleo', 'cesantia', 'trabajo', 'economia', 'inversion', 'ajuste', 'crecimiento'],
};

const SENALES_ACCION_CONTRARIA = [
  'mantiene', 'confirma', 'viaja', 'respalda', 'blinda', 'rebaja', 'rebajaron',
  'decretos', 'pese', 'medio', 'paro', 'alza', 'criticas', 'emplazan', 'retro-tuits',
  'retrotuits', 'doble', 'desafuero', 'renuncia', 'sin acuerdo', 'comitiva', 'continua',
];

/**
 * Normaliza texto eliminando tildes, signos y pasando a minúsculas.
 */
export function normalizarTexto(texto: string): string {
  return texto
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Extrae tokens significativos y aplica reducción básica de plurales en español.
 */
export function tokenizar(texto: string): string[] {
  const normalizado = normalizarTexto(texto);
  const tokens = normalizado
    .split(' ')
    .filter((t) => t.length > 2 && !STOP_WORDS.has(t));

  return tokens.map((token) => {
    if (token.endsWith('es') && token.length > 4) return token.slice(0, -2);
    if (token.endsWith('s') && token.length > 3) return token.slice(0, -1);
    return token;
  });
}

function construirGrupoSemantico(conceptos: string[]): Set<string> {
  const grupo = new Set<string>();
  for (const raw of conceptos) {
    const norm = normalizarTexto(raw);
    grupo.add(norm);
    for (const token of tokenizar(norm)) {
      grupo.add(token);
    }
    const equivalentes = SINONIMOS_DOMINIO[norm];
    if (equivalentes) {
      for (const eq of equivalentes) {
        grupo.add(eq);
        for (const t of tokenizar(eq)) grupo.add(t);
      }
    }
  }
  return grupo;
}

function clasificarTipoChoque(
  dicho: DichoHistorico,
  senalesEncontradas: string[]
): CandidatoContradiccion['tipoChoque'] {
  if (senalesEncontradas.some((s) => s.includes('retro') || s.includes('doble'))) {
    return 'Doble estándar';
  }
  if (dicho.postura === 'promete' || dicho.postura === 'exige') {
    return 'Promesa incumplida';
  }
  if (dicho.postura === 'prohibe') {
    return 'Inversión de postura';
  }
  return 'Bumerán retórico';
}

/**
 * Evalúa una noticia frente a un dicho histórico y calcula su score de contradicción (0-100).
 */
export function evaluarContradiccion(
  noticia: NoticiaScrapeada,
  dicho: DichoHistorico
): CandidatoContradiccion | null {
  // Una contradicción solo puede ocurrir después del dicho original
  if (noticia.fecha < dicho.fecha) {
    return null;
  }

  const textoTitulo = normalizarTexto(noticia.titulo);
  const textoCompleto = normalizarTexto(`${noticia.titulo} ${noticia.bajada}`);
  const tokensNoticia = new Set(tokenizar(textoCompleto));
  const tokensTitulo = new Set(tokenizar(textoTitulo));

  const conceptosDicho = construirGrupoSemantico(dicho.conceptosClave);
  const evidencias: string[] = [];

  let puntosTematicos = 0;
  for (const conceptoRaw of dicho.conceptosClave) {
    const conceptoNorm = normalizarTexto(conceptoRaw);
    const variantes = [conceptoNorm, ...(SINONIMOS_DOMINIO[conceptoNorm] || [])];

    let encontroEnTitulo = false;
    let encontroEnCuerpo = false;
    let palabraEncontrada = '';

    for (const v of variantes) {
      const raiz = tokenizar(v)[0] || v;
      if (tokensTitulo.has(raiz) || textoTitulo.includes(v)) {
        encontroEnTitulo = true;
        palabraEncontrada = v;
        break;
      }
      if (tokensNoticia.has(raiz) || textoCompleto.includes(v)) {
        encontroEnCuerpo = true;
        palabraEncontrada = v;
      }
    }

    if (encontroEnTitulo) {
      puntosTematicos += 18;
      evidencias.push(palabraEncontrada);
    } else if (encontroEnCuerpo) {
      puntosTematicos += 10;
      evidencias.push(palabraEncontrada);
    }
  }

  // Verificar equivalencias adicionales del grupo semántico si no hubo match directo
  if (evidencias.length === 0) {
    for (const concepto of conceptosDicho) {
      if (concepto.length > 3 && (tokensTitulo.has(concepto) || textoTitulo.includes(concepto))) {
        puntosTematicos += 14;
        evidencias.push(concepto);
      }
    }
  }

  const evidenciasUnicas = Array.from(new Set(evidencias));
  if (evidenciasUnicas.length === 0) {
    return null;
  }

  const scoreTematico = Math.min(60, puntosTematicos);

  // Detectar señales de polaridad contraria o conflicto político en la noticia
  const senalesEncontradas: string[] = [];
  for (const senal of SENALES_ACCION_CONTRARIA) {
    if (textoCompleto.includes(senal)) {
      senalesEncontradas.push(senal);
    }
  }

  const scorePolaridad = Math.min(40, senalesEncontradas.length * 12 + (evidenciasUnicas.length >= 2 ? 12 : 0));
  const scoreTotal = Math.min(99, scoreTematico + scorePolaridad);

  if (scoreTotal < 35) {
    return null;
  }

  const tipoChoque = clasificarTipoChoque(dicho, senalesEncontradas);
  const explicacionMotor = [
    `Coincidencia temática en ${evidenciasUnicas.length} concepto(s) clave (${evidenciasUnicas.slice(0, 5).join(', ')}).`,
    senalesEncontradas.length > 0
      ? `El titular/bajada registra indicadores de ejecución contraria o conflicto (${senalesEncontradas.slice(0, 4).join(', ')}) frente a la postura original de "${dicho.postura}" emitida el ${dicho.fecha}.`
      : `Relación directa con el compromiso histórico de ${dicho.fecha} (${dicho.rol}).`,
  ].join(' ');

  return {
    id: `${noticia.id}__${dicho.id}`,
    noticia,
    dicho,
    scoreContradiccion: scoreTotal,
    tipoChoque,
    evidenciasLexicas: evidenciasUnicas.slice(0, 6),
    explicacionMotor,
    generadoEn: new Date().toISOString().split('T')[0],
    metodoAnalisis: 'motor-determinista',
  };
}

/**
 * Cruza un lote de noticias scrapeadas contra la base de dichos históricos.
 * Devuelve los candidatos ordenados por mayor score de contradicción.
 */
export function detectarContradiccionesEnLote(
  noticias: NoticiaScrapeada[],
  dichos: DichoHistorico[],
  umbralMinimo = 45
): CandidatoContradiccion[] {
  const hallazgos: CandidatoContradiccion[] = [];

  for (const noticia of noticias) {
    let mejorCandidatoParaNoticia: CandidatoContradiccion | null = null;

    for (const dicho of dichos) {
      const resultado = evaluarContradiccion(noticia, dicho);
      if (resultado && resultado.scoreContradiccion >= umbralMinimo) {
        if (
          !mejorCandidatoParaNoticia ||
          resultado.scoreContradiccion > mejorCandidatoParaNoticia.scoreContradiccion
        ) {
          mejorCandidatoParaNoticia = resultado;
        }
      }
    }

    if (mejorCandidatoParaNoticia) {
      hallazgos.push(mejorCandidatoParaNoticia);
    }
  }

  return hallazgos.sort((a, b) => b.scoreContradiccion - a.scoreContradiccion);
}
