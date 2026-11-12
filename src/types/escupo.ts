export type CategoriaEscupo = 
  | 'impuestos' 
  | 'nepotismo' 
  | 'seguridad' 
  | 'constitucion' 
  | 'gasto-publico' 
  | 'libertades';

export interface CitaPasada {
  fecha: string; // YYYY-MM-DD
  rol: string; // ej: "Candidato Presidencial", "Diputado UDI"
  cita: string;
  fuenteUrl?: string;
  tipoMedio: 'tweet' | 'prensa' | 'debate' | 'congreso';
  usuarioTweet?: string;
}

export interface HechoPresente {
  fecha: string; // YYYY-MM-DD
  titulo: string;
  descripcion: string;
  fuenteUrl?: string;
  impacto: string; // Breve remate o consecuencia
}

export interface Escupo {
  id: string;
  titulo: string;
  categoria: CategoriaEscupo;
  fechaIncidente: string; // YYYY-MM-DD del hecho que provocó la caída del escupo
  diasSinEscupoPrevios: number; // días que duró el récord previo
  gravedad: 'leve' | 'moderada' | 'critica' | 'termocéfala';
  pasado: CitaPasada;
  presente: HechoPresente;
  veredictoSatirico: string;
  votosComunidad?: number;
}
