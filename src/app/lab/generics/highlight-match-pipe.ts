import { Pipe, PipeTransform } from '@angular/core';

export interface TextPart {
  readonly text: string;
  readonly match: boolean;
}

const escapeRegExp = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/**
 * Spezza il testo in parti evidenziate e non: `{{ label | highlightMatch: query }}`.
 *
 * - Restituisce dati, non HTML: il template decide se usare `<mark>`.
 *   Niente `[innerHTML]` → niente sanitizzazione né rischio XSS.
 * - Più parole cercate ("mar ros") → ognuna evidenziata, case-insensitive.
 * - `split` con un gruppo di cattura tiene i separatori: indici dispari = match.
 */
@Pipe({ name: 'highlightMatch' })
export class HighlightMatchPipe implements PipeTransform {
  transform(text: string, query: string): TextPart[] {
    const words = query
      .trim()
      .split(/\s+/)
      .filter(Boolean)
      .map(escapeRegExp)
      .sort((a, b) => b.length - a.length);
    if (!words.length) return [{ text, match: false }];

    return text
      .split(new RegExp(`(${words.join('|')})`, 'gi'))
      .map((part, i) => ({ text: part, match: i % 2 === 1 }))
      .filter((part) => part.text);
  }
}
