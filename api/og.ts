import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import satori from 'satori';
import { Resvg } from '@resvg/resvg-js';
import {
  calcularDiasSinEscupo,
  calcularRecordHistorico,
  obtenerFechaHoySantiago,
  obtenerUltimoIncidente,
} from '../src/lib/contador.js';
import type { Escupo } from '../src/types/escupo.js';

type SatoriChild = SatoriNode | string | number | null | undefined;
interface SatoriNode {
  type: string;
  props: {
    style?: Record<string, string | number>;
    children?: SatoriChild | SatoriChild[];
  };
}

function el(
  type: string,
  style: Record<string, string | number>,
  ...children: SatoriChild[]
): SatoriNode {
  return {
    type,
    props: {
      style,
      children: children.length === 1 ? children[0] : children,
    },
  };
}

function truncarTexto(texto: string, max: number): string {
  const limpio = texto.replace(/\s+/g, ' ').trim();
  if (limpio.length <= max) return limpio;
  return `${limpio.slice(0, max - 1).trimEnd()}…`;
}

function cargarEscupos(): Escupo[] {
  const ruta = new URL('../src/data/escupos.json', import.meta.url);
  const crudo = readFileSync(ruta, 'utf8');
  return JSON.parse(crudo) as Escupo[];
}

let fuentesCache:
  | {
      name: string;
      data: Buffer;
      weight: 400 | 700;
      style: 'normal';
    }[]
  | null = null;

function cargarFuentes() {
  if (fuentesCache) return fuentesCache;
  const raiz = process.cwd();
  fuentesCache = [
    {
      name: 'Source Serif 4',
      data: readFileSync(
        join(raiz, 'node_modules/@fontsource/source-serif-4/files/source-serif-4-latin-700-normal.woff')
      ),
      weight: 700,
      style: 'normal',
    },
    {
      name: 'Public Sans',
      data: readFileSync(
        join(raiz, 'node_modules/@fontsource/public-sans/files/public-sans-latin-400-normal.woff')
      ),
      weight: 400,
      style: 'normal',
    },
    {
      name: 'Public Sans',
      data: readFileSync(
        join(raiz, 'node_modules/@fontsource/public-sans/files/public-sans-latin-700-normal.woff')
      ),
      weight: 700,
      style: 'normal',
    },
    {
      name: 'JetBrains Mono',
      data: readFileSync(
        join(raiz, 'node_modules/@fontsource/jetbrains-mono/files/jetbrains-mono-latin-700-normal.woff')
      ),
      weight: 700,
      style: 'normal',
    },
  ];
  return fuentesCache;
}

/**
 * Genera la tarjeta Open Graph dinámica (`1200×630` PNG) con el cómputo del día
 * en horario de Santiago y el último expediente registrado.
 */
export async function GET(): Promise<Response> {
  try {
    const escupos = cargarEscupos();
    const fechaHoy = obtenerFechaHoySantiago();
    const diasSinEscupo = calcularDiasSinEscupo(escupos, fechaHoy);
    const recordHistorico = calcularRecordHistorico(escupos, diasSinEscupo);
    const ultimo = obtenerUltimoIncidente(escupos);

    const etiquetaDias = diasSinEscupo === 1 ? 'día sin escupo' : 'días sin escupo';
    const tituloUltimo = ultimo
      ? truncarTexto(ultimo.titulo, 95)
      : 'Archivo documental de coherencia política';
    const citaPasado = ultimo
      ? truncarTexto(`"${ultimo.pasado.cita}"`, 120)
      : 'Declaraciones públicas contrastadas con hechos verificables.';
    const hechoPresente = ultimo
      ? truncarTexto(ultimo.presente.titulo, 100)
      : 'Revisión cronológica de prensa y archivo.';

    const arbol = el(
      'div',
      {
        width: '1200px',
        height: '630px',
        display: 'flex',
        flexDirection: 'column',
        backgroundColor: '#f6f4ef',
        color: '#141413',
        fontFamily: 'Public Sans',
      },
      el(
        'div',
        {
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          margin: '34px 46px',
        },
        el(
          'div',
          {
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            borderBottom: '3px solid #141413',
            paddingBottom: '14px',
          },
          el(
            'div',
            {
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              fontSize: '20px',
              fontWeight: 700,
              letterSpacing: '0.07em',
              fontFamily: 'JetBrains Mono',
            },
            el('div', {
              width: '12px',
              height: '12px',
              borderRadius: '6px',
              backgroundColor: '#b91c1c',
            }),
            el('span', {}, 'EL CONTADOR DEL ESCUPO · CHILE')
          ),
          el(
            'div',
            {
              fontSize: '17px',
              color: '#4a4843',
              fontFamily: 'JetBrains Mono',
              fontWeight: 700,
              letterSpacing: '0.05em',
            },
            `CÓMPUTO AL ${fechaHoy}`
          )
        ),
        el(
          'div',
          {
            display: 'flex',
            flex: 1,
            gap: '28px',
            paddingTop: '22px',
            paddingBottom: '18px',
          },
          el(
            'div',
            {
              width: '350px',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              backgroundColor: '#141413',
              color: '#f6f4ef',
              borderRadius: '12px',
              padding: '24px 28px',
            },
            el(
              'div',
              {
                display: 'flex',
                alignItems: 'center',
                fontSize: '14px',
                fontWeight: 700,
                letterSpacing: '0.14em',
                color: '#fca5a5',
                fontFamily: 'JetBrains Mono',
              },
              'MARCADOR EN VIVO'
            ),
            el(
              'div',
              {
                display: 'flex',
                flexDirection: 'column',
                gap: '4px',
              },
              el(
                'div',
                {
                  fontSize: '118px',
                  fontWeight: 700,
                  lineHeight: 0.95,
                  color: '#ffffff',
                  fontFamily: 'JetBrains Mono',
                },
                String(diasSinEscupo)
              ),
              el(
                'div',
                {
                  fontSize: '26px',
                  fontWeight: 700,
                  color: '#f6f4ef',
                  marginTop: '8px',
                  fontFamily: 'Source Serif 4',
                },
                etiquetaDias
              ),
              el(
                'div',
                {
                  fontSize: '16px',
                  color: '#d6d1c4',
                  lineHeight: 1.35,
                },
                'al cielo en el mandato actual'
              )
            ),
            el(
              'div',
              {
                display: 'flex',
                justifyContent: 'space-between',
                borderTop: '1px solid #383632',
                paddingTop: '14px',
                fontSize: '15px',
                fontWeight: 700,
                color: '#d6d1c4',
                fontFamily: 'JetBrains Mono',
              },
              el('span', {}, `${escupos.length} casos`),
              el('span', {}, `Récord: ${recordHistorico} d`)
            )
          ),
          el(
            'div',
            {
              flex: 1,
              minWidth: 0,
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              backgroundColor: '#ffffff',
              border: '1px solid #dcd7cc',
              borderRadius: '12px',
              padding: '24px 28px',
            },
            el(
              'div',
              {
                display: 'flex',
                flexDirection: 'column',
                gap: '10px',
              },
              el(
                'div',
                {
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  fontSize: '14px',
                  fontWeight: 700,
                  letterSpacing: '0.1em',
                  color: '#b91c1c',
                  fontFamily: 'JetBrains Mono',
                },
                el('span', {}, 'ÚLTIMO EXPEDIENTE'),
                el('span', { color: '#4a4843' }, ultimo?.fechaIncidente ?? fechaHoy)
              ),
              el(
                'div',
                {
                  fontSize: '27px',
                  fontWeight: 700,
                  lineHeight: 1.22,
                  color: '#141413',
                  fontFamily: 'Source Serif 4',
                },
                tituloUltimo
              )
            ),
            el(
              'div',
              {
                display: 'flex',
                flexDirection: 'column',
                gap: '12px',
                borderTop: '1px solid #ece7dc',
                paddingTop: '14px',
              },
              el(
                'div',
                {
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '4px',
                },
                el(
                  'span',
                  {
                    fontSize: '13px',
                    fontWeight: 700,
                    color: '#6b675e',
                    fontFamily: 'JetBrains Mono',
                    letterSpacing: '0.08em',
                  },
                  `LO QUE DIJO (${ultimo?.pasado.fecha ?? 'ARCHIVO'})`
                ),
                el(
                  'span',
                  {
                    fontSize: '17px',
                    color: '#2f2e2a',
                    lineHeight: 1.35,
                  },
                  citaPasado
                )
              ),
              el(
                'div',
                {
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '4px',
                },
                el(
                  'span',
                  {
                    fontSize: '13px',
                    fontWeight: 700,
                    color: '#b91c1c',
                    fontFamily: 'JetBrains Mono',
                    letterSpacing: '0.08em',
                  },
                  `HECHO (${ultimo?.presente.medio ?? 'PRENSA'})`
                ),
                el(
                  'span',
                  {
                    fontSize: '17px',
                    fontWeight: 700,
                    color: '#141413',
                    lineHeight: 1.35,
                  },
                  hechoPresente
                )
              )
            )
          )
        ),
        el(
          'div',
          {
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            borderTop: '1px solid #dcd7cc',
            paddingTop: '12px',
            fontSize: '16px',
            fontWeight: 700,
            color: '#4a4843',
            fontFamily: 'JetBrains Mono',
          },
          el('span', {}, 'escupometro.vercel.app'),
          el('span', {}, 'Archivo documental verificable · Prensa y citas públicas')
        )
      )
    );

    const svg = await satori(arbol as unknown as Parameters<typeof satori>[0], {
      width: 1200,
      height: 630,
      fonts: cargarFuentes(),
    });

    const resvg = new Resvg(svg, {
      fitTo: { mode: 'width', value: 1200 },
    });
    const pngBuffer = resvg.render().asPng();

    return new Response(pngBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'image/png',
        'Cache-Control': 'public, max-age=0, s-maxage=300, stale-while-revalidate=600',
      },
    });
  } catch (err) {
    return new Response(
      JSON.stringify({
        error: 'No se pudo generar la tarjeta OG.',
        detalle: err instanceof Error ? err.message : String(err),
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json; charset=utf-8' },
      }
    );
  }
}
