import { DOCUMENT, InjectionToken, inject } from '@angular/core';

/**
 * ESEMPIO 6 — InjectionToken con e senza factory
 */

/** Senza factory: nessun valore di default, qualcuno DEVE fornirlo (tipico: app.config.ts). */
export const API_BASE_URL = new InjectionToken<string>('API_BASE_URL');

/**
 * Con factory: tree-shakable, fornito in root automaticamente. `providedIn: 'root'` qui è esplicito,
 * ma è già il default quando c'è una factory (vedi DOCUMENT_LANG). Sovrascrivibile da qualunque
 * `providers` più vicino a chi inietta.
 */
export const PAGE_SIZE = new InjectionToken<number>('PAGE_SIZE', {
  providedIn: 'root',
  factory: () => 20,
});

/** La factory gira in injection context: può usare inject(). Niente accesso diretto ai globali (SSR). */
export const DOCUMENT_LANG = new InjectionToken<string>('DOCUMENT_LANG', {
  factory: () => inject(DOCUMENT).documentElement.lang || 'non impostata',
});
