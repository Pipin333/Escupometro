import { describe, expect, it } from 'vitest';
import {
  agruparEnSegmentos,
  construirUrlConTiempo,
  extraerIdVideoYoutube,
  fechaPublicacionVideo,
  filtrarPorTramos,
  parsearTramos,
  parsearVttYoutube,
  type LineaTranscripcion,
  type SegmentoTranscripcion,
} from './youtube-transcripciones';

const VTT_YOUTUBE_ROLLING = `WEBVTT
Kind: captions
Language: es

00:00:01.309 --> 00:01:09.030 align:start position:0%
 
[música]

00:01:09.030 --> 00:01:09.040 align:start position:0%
 
 

00:01:09.040 --> 00:01:11.270 align:start position:0%
 
mundo<00:01:09.400><c> a</c><00:01:09.600><c> través</c><00:01:10.280><c> del</c><00:01:10.479><c> aire,</c><00:01:10.740><c> [música]</c>

00:01:11.270 --> 00:01:11.280 align:start position:0%
mundo a través del aire, [música]
 

00:01:11.280 --> 00:01:14.429 align:start position:0%
mundo a través del aire, [música]
el<00:01:11.479><c> cable,</c><00:01:12.159><c> el</c><00:01:12.400><c> satélite,</c><00:01:13.600><c> internet,</c>
`;

function linea(inicio: number, fin: number, texto: string): LineaTranscripcion {
  return { inicio, fin, texto };
}

function segmento(inicio: number, fin: number, texto = 'x'): SegmentoTranscripcion {
  return { inicio, fin, texto };
}

function verificarLineasRolling(lineas: LineaTranscripcion[]): void {
  expect(lineas).toHaveLength(2);
  expect(lineas[0].texto).toBe('mundo a través del aire,');
  expect(lineas[0].inicio).toBeCloseTo(69.04, 3);
  expect(lineas[0].fin).toBeCloseTo(71.27, 3);
  expect(lineas[1].texto).toBe('el cable, el satélite, internet,');
  expect(lineas[1].inicio).toBeCloseTo(71.28, 3);
  expect(lineas[1].fin).toBeCloseTo(74.429, 3);
}

describe('youtube-transcripciones: parsearVttYoutube', () => {
  it('limpia etiquetas de tiempo, anotaciones y repeticiones del formato rolling (LF)', () => {
    verificarLineasRolling(parsearVttYoutube(VTT_YOUTUBE_ROLLING));
  });

  it('produce el mismo resultado con saltos de línea CRLF', () => {
    verificarLineasRolling(parsearVttYoutube(VTT_YOUTUBE_ROLLING.replace(/\n/g, '\r\n')));
  });

  it('parsea VTT normal con tiempos MM:SS.mmm, entidades y cues de varias líneas', () => {
    const vtt = [
      'WEBVTT',
      '',
      '00:05.000 --> 00:07.500',
      'Hola &amp; adiós   mundo',
      '',
      '00:07.500 --> 00:09.000',
      '[Aplausos]',
      'Precio &gt; 10&nbsp;mil',
      '',
      '01:00.250 --> 01:02.000',
      '<v Kast>Línea uno</v>',
      'Línea dos [aplausos]',
      '',
    ].join('\n');

    const lineas = parsearVttYoutube(vtt);

    expect(lineas.map((l) => l.texto)).toEqual([
      'Hola & adiós mundo',
      'Precio > 10 mil',
      'Línea uno',
      'Línea dos',
    ]);
    expect(lineas[0].inicio).toBeCloseTo(5, 3);
    expect(lineas[0].fin).toBeCloseTo(7.5, 3);
    expect(lineas[1].inicio).toBeCloseTo(7.5, 3);
    expect(lineas[2].inicio).toBeCloseTo(60.25, 3);
    expect(lineas[3].inicio).toBeCloseTo(60.25, 3);
    expect(lineas[3].fin).toBeCloseTo(62, 3);
  });

  it('devuelve lista vacía cuando sólo hay anotaciones o cues vacíos', () => {
    const vtt = 'WEBVTT\n\n00:00:01.000 --> 00:00:02.000\n[Música]\n\n00:00:02.000 --> 00:00:03.000\n \n';
    expect(parsearVttYoutube(vtt)).toEqual([]);
  });
});

describe('youtube-transcripciones: agruparEnSegmentos', () => {
  it('devuelve lista vacía para entrada vacía', () => {
    expect(agruparEnSegmentos([])).toEqual([]);
  });

  it('cierra el segmento antes de superar maxCaracteres sin partir líneas', () => {
    const segmentos = agruparEnSegmentos(
      [linea(0, 2, 'aaaa bbbb cccc'), linea(2, 4, 'dddd eeee ffff'), linea(4, 5, 'gggg')],
      { maxSegundos: 100, maxCaracteres: 30, minCaracteres: 10 }
    );

    expect(segmentos).toEqual([
      { inicio: 0, fin: 4, texto: 'aaaa bbbb cccc dddd eeee ffff' },
      { inicio: 4, fin: 5, texto: 'gggg' },
    ]);
  });

  it('mantiene intacta una línea que por sí sola supera maxCaracteres', () => {
    const larga = 'una linea extremadamente larga que supera el limite permitido';
    const segmentos = agruparEnSegmentos([linea(0, 1, 'corta'), linea(1, 2, larga)], {
      maxSegundos: 100,
      maxCaracteres: 30,
      minCaracteres: 10,
    });

    expect(segmentos).toEqual([
      { inicio: 0, fin: 1, texto: 'corta' },
      { inicio: 1, fin: 2, texto: larga },
    ]);
  });

  it('cierra el segmento antes de que la duración supere maxSegundos', () => {
    const segmentos = agruparEnSegmentos(
      [linea(0, 3, 'uno'), linea(3, 8, 'dos'), linea(8, 12, 'tres')],
      { maxSegundos: 10, maxCaracteres: 1000, minCaracteres: 10 }
    );

    expect(segmentos).toEqual([
      { inicio: 0, fin: 8, texto: 'uno dos' },
      { inicio: 8, fin: 12, texto: 'tres' },
    ]);
  });

  it('cierra en fin de oración sólo si alcanza minCaracteres', () => {
    const opciones = { maxSegundos: 45, maxCaracteres: 100, minCaracteres: 10 };

    expect(
      agruparEnSegmentos(
        [linea(0, 1, 'Hola.'), linea(1, 3, 'Esto termina aquí.'), linea(3, 4, 'Siguiente')],
        opciones
      )
    ).toEqual([
      { inicio: 0, fin: 3, texto: 'Hola. Esto termina aquí.' },
      { inicio: 3, fin: 4, texto: 'Siguiente' },
    ]);

    expect(
      agruparEnSegmentos(
        [linea(0, 1, 'Es verdad?'), linea(1, 2, 'Sí!'), linea(2, 3, 'Y más')],
        opciones
      )
    ).toEqual([
      { inicio: 0, fin: 1, texto: 'Es verdad?' },
      { inicio: 1, fin: 3, texto: 'Sí! Y más' },
    ]);
  });
});

describe('youtube-transcripciones: tramos', () => {
  it('parsea tramos en formatos SS, MM:SS y H:MM:SS con espacios', () => {
    expect(parsearTramos('12:30-14:10, 1:02:05-1:03:00,90-120')).toEqual([
      { desde: 750, hasta: 850 },
      { desde: 3725, hasta: 3780 },
      { desde: 90, hasta: 120 },
    ]);
    expect(parsearTramos(' 1:00 - 2:00 ,  5 - 6 ')).toEqual([
      { desde: 60, hasta: 120 },
      { desde: 5, hasta: 6 },
    ]);
    expect(parsearTramos('')).toEqual([]);
  });

  it('lanza Error ante formato inválido o tramo no creciente', () => {
    expect(() => parsearTramos('abc')).toThrow(Error);
    expect(() => parsearTramos('10-')).toThrow(Error);
    expect(() => parsearTramos('20-10')).toThrow(Error);
    expect(() => parsearTramos('1:00-1:00')).toThrow(Error);
  });

  it('filtra segmentos por punto medio incluyendo los extremos', () => {
    const segmentos = [segmento(0, 10, 'a'), segmento(10, 30, 'b'), segmento(40, 50, 'c'), segmento(100, 110, 'd')];

    expect(filtrarPorTramos(segmentos, [{ desde: 5, hasta: 20 }]).map((s) => s.texto)).toEqual(['a', 'b']);
    expect(
      filtrarPorTramos(segmentos, [
        { desde: 5, hasta: 20 },
        { desde: 105, hasta: 200 },
      ]).map((s) => s.texto)
    ).toEqual(['a', 'b', 'd']);
    expect(filtrarPorTramos(segmentos, [])).toEqual([]);
  });
});

describe('youtube-transcripciones: URLs y fechas', () => {
  it('extrae el ID de video desde las variantes de URL de YouTube', () => {
    const urls = [
      'https://www.youtube.com/watch?v=fUfJmxVgttA&t=30s',
      'https://youtu.be/fUfJmxVgttA?t=5',
      'https://www.youtube.com/live/fUfJmxVgttA',
      'https://youtube.com/shorts/fUfJmxVgttA',
      'https://www.youtube.com/embed/fUfJmxVgttA',
      'https://m.youtube.com/watch?v=fUfJmxVgttA',
    ];
    for (const url of urls) {
      expect(extraerIdVideoYoutube(url)).toBe('fUfJmxVgttA');
    }
    expect(extraerIdVideoYoutube('https://www.youtube.com/watch?v=a-B_c1D2e3F')).toBe('a-B_c1D2e3F');
  });

  it('devuelve null para URLs ajenas a YouTube o IDs malformados', () => {
    expect(extraerIdVideoYoutube('https://vimeo.com/123456789')).toBeNull();
    expect(extraerIdVideoYoutube('https://example.com/watch?v=fUfJmxVgttA')).toBeNull();
    expect(extraerIdVideoYoutube('https://www.youtube.com/watch?v=corto')).toBeNull();
    expect(extraerIdVideoYoutube('https://youtu.be/fUfJmxVgttAX')).toBeNull();
    expect(extraerIdVideoYoutube('no es una url')).toBeNull();
  });

  it('construye URL corta con segundos truncados y nunca negativos', () => {
    expect(construirUrlConTiempo('fUfJmxVgttA', 95.9)).toBe('https://youtu.be/fUfJmxVgttA?t=95');
    expect(construirUrlConTiempo('fUfJmxVgttA', 0)).toBe('https://youtu.be/fUfJmxVgttA?t=0');
    expect(construirUrlConTiempo('fUfJmxVgttA', -3)).toBe('https://youtu.be/fUfJmxVgttA?t=0');
  });

  it('calcula la fecha de publicación en zona America/Santiago con respaldos', () => {
    expect(fechaPublicacionVideo({ timestamp: 1765338661 })).toBe('2025-12-10');
    expect(fechaPublicacionVideo({ release_timestamp: 1765328400 })).toBe('2025-12-09');
    expect(fechaPublicacionVideo({ release_timestamp: 1765328400, timestamp: 1765338661 })).toBe('2025-12-09');
    expect(fechaPublicacionVideo({ release_timestamp: null, timestamp: null, upload_date: '20251210' })).toBe(
      '2025-12-10'
    );
    expect(fechaPublicacionVideo({})).toBe('');
    expect(fechaPublicacionVideo({ timestamp: null, upload_date: null })).toBe('');
  });
});
