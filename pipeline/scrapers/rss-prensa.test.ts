import { describe, it, expect } from 'vitest';
import { esNoticiaRelevante, limpiarHtml } from './rss-prensa';

describe('Filtro de idioma y relevancia en rss-prensa', () => {
  it('acepta noticias relevantes en español de medios chilenos', () => {
    expect(
      esNoticiaRelevante(
        'Rabat decía tener las manos atadas, pero Justicia rechazó 22 rebajas tras su giro de criterio',
        'El ministro Rabat declaró ante la Cámara que no podía revertir las rebajas aprobadas por las comisiones.',
        'https://www.elciudadano.com/actualidad/rabat-decia-tener-las-manos-atadas/'
      )
    ).toBe(true);

    expect(
      esNoticiaRelevante(
        'Kast acordó con los camioneros y desactivó el paro en Chile: importante baja del diésel',
        'Kast acordó con los camioneros y desactivó el paro en Chile',
        'https://www.losandes.com.ar/mundo/kast-acordo/'
      )
    ).toBe(true);
  });

  it('descarta traducciones en inglés y alemán de El Ciudadano u otros feeds', () => {
    expect(
      esNoticiaRelevante(
        'Minister Fernando Rabat behauptet, er sei machtlos, doch das Justizministerium wies 22 Strafmilderungen nach Kursänderung zurück',
        'Originalbeitrag: Rabat decía tener las manos atadas Der Justizminister, Fernando Rabat, erklärte vor der Abgeordnetenkammer...',
        'https://www.elciudadano.com/de/minister-fernando-rabat-behauptet/'
      )
    ).toBe(false);

    expect(
      esNoticiaRelevante(
        'Justice Minister Claims Constraints Amid Rejection of 22 Sentence Reductions After Policy Shift',
        'Original article: Rabat decía tener las manos atadas Justice Minister Fernando Rabat told the Chamber of Deputies that he felt handcuffed.',
        'https://www.elciudadano.com/en/justice-minister-claims-constraints/'
      )
    ).toBe(false);

    // Incluso si la URL no tiene /en/ ni dice "Original article:", el texto en inglés debe descartarse
    expect(
      esNoticiaRelevante(
        'Justice Minister Claims Constraints Amid Rejection of 22 Sentence Reductions',
        'Justice Minister Fernando Rabat told the Chamber of Deputies that his ministry could not oppose the sentence reductions.',
        'https://example.com/news/rabat-story'
      )
    ).toBe(false);
  });

  it('decodifica entidades HTML numéricas y tipográficas en limpiarHtml', () => {
    expect(
      limpiarHtml('Rebajas aprobadas [&#8230;] &ldquo;doctrina Rabat&rdquo; &amp; fallo&#8217;s')
    ).toBe('Rebajas aprobadas […] "doctrina Rabat" & fallo\'s');
  });
});
