export type CategoriaEscupo =
  | 'impuestos'
  | 'nepotismo'
  | 'seguridad'
  | 'constitucion'
  | 'gasto-publico'
  | 'libertades';

export type PosturaDicho = 'prohibe' | 'condena' | 'promete' | 'exige';

export interface CitaPasada {
  fecha: string;
  rol: string;
  cita: string;
  fuenteUrl?: string;
  archivoUrl?: string;
  tipoMedio: 'tweet' | 'prensa' | 'debate' | 'congreso';
  usuarioTweet?: string;
}

export interface HechoPresente {
  fecha: string;
  medio?: string;
  titulo: string;
  descripcion: string;
  fuenteUrl?: string;
  impacto: string;
}

export interface Escupo {
  id: string;
  titulo: string;
  categoria: CategoriaEscupo;
  fechaIncidente: string;
  diasSinEscupoPrevios: number;
  gravedad: 'leve' | 'moderada' | 'critica' | 'termocéfala';
  pasado: CitaPasada;
  presente: HechoPresente;
  veredictoSatirico: string;
  votosComunidad?: number;
}

/**
 * Declaración histórica indexada en la base de conocimientos para cruce automático.
 */
export interface DichoHistorico {
  id: string;
  fecha: string;
  rol: string;
  tipoMedio: 'tweet' | 'prensa' | 'debate' | 'congreso';
  usuarioTweet?: string;
  cita: string;
  fuenteUrl: string;
  categoria: CategoriaEscupo;
  postura: PosturaDicho;
  conceptosClave: string[];
}

/**
 * Artículo noticioso recolectado por los scrapers de prensa.
 */
export interface NoticiaScrapeada {
  id: string;
  titulo: string;
  bajada: string;
  medio: string;
  fecha: string;
  publicadoEn?: string;
  url: string;
}

/**
 * Resultado del cruce realizado por el Motor de Detección de Contradicciones.
 */
export interface CandidatoContradiccion {
  id: string;
  noticia: NoticiaScrapeada;
  dicho: DichoHistorico;
  scoreContradiccion: number; // 0 a 100
  tipoChoque: 'Doble estándar' | 'Promesa incumplida' | 'Inversión de postura' | 'Bumerán retórico';
  evidenciasLexicas: string[];
  explicacionMotor: string;
  generadoEn: string;
  metodoAnalisis: 'motor-determinista' | 'motor-llm';
}

/**
 * Cita textual destacada del oficialismo o su sector registrada en la sección "Frases para el bronce".
 */
export interface FraseBronce {
  id: string;
  fecha: string;
  autor: string;
  cargo: string;
  cita: string;
  contexto: string;
  medio: string;
  fuenteUrl: string;
}

export type OpcionEncuesta = 'aprueba' | 'desaprueba' | 'neutral';
