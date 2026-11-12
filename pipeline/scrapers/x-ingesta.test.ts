import { describe, expect, it } from 'vitest';
import {
  parsearContenidoExportacionTweets,
  parsearCsvTabla,
} from './x-ingesta';

describe('x-ingesta parsers locales', () => {
  it('parsea JSON plano o estructura { tweets: [...] } normalizando URL e ID', () => {
    const json = JSON.stringify({
      tweets: [
        {
          id_str: '1461708384729202695',
          full_text: 'En nuestro gobierno vamos a terminar con los pitutos en el Estado.',
          created_at: 'Fri Nov 19 15:00:00 +0000 2021',
        },
      ],
    });

    const registros = parsearContenidoExportacionTweets(json, '.json');
    expect(registros).toHaveLength(1);
    expect(registros[0]).toMatchObject({
      id: 'tweet-1461708384729202695',
      fecha: '2021-11-19',
      url: 'https://x.com/joseantoniokast/status/1461708384729202695',
      usuario: '@joseantoniokast',
    });
  });

  it('parsea tweets.js del archivo oficial de X (window.YTD.tweets.part0)', () => {
    const archivoJs = `window.YTD.tweets.part0 = [
      {
        "tweet": {
          "id_str": "1888111222333",
          "full_text": "No mas alzas de impuestos ni despilfarro en viaticos.",
          "created_at": "Tue Jun 11 10:00:00 +0000 2024"
        }
      }
    ];`;

    const registros = parsearContenidoExportacionTweets(archivoJs, '.js');
    expect(registros).toHaveLength(1);
    expect(registros[0].id).toBe('tweet-1888111222333');
    expect(registros[0].fecha).toBe('2024-06-11');
  });

  it('parsea CSV respetando comas dentro de comillas dobles', () => {
    const csv = [
      'fecha,texto,url',
      '2022-05-03,"No vamos a viajar, ni gastar dinero fiscal en giras inutiles",https://x.com/joseantoniokast/status/777888999',
    ].join('\n');

    const tabla = parsearCsvTabla(csv);
    expect(tabla).toHaveLength(2);
    expect(tabla[1][1]).toBe(
      'No vamos a viajar, ni gastar dinero fiscal en giras inutiles'
    );

    const registros = parsearContenidoExportacionTweets(csv, '.csv');
    expect(registros).toHaveLength(1);
    expect(registros[0].id).toBe('tweet-777888999');
  });
});
