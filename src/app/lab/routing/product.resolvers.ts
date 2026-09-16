import { inject } from '@angular/core';
import { RedirectCommand, ResolveFn, createUrlTreeFromSnapshot } from '@angular/router';
import { Product, ProductApi } from './product-api';

/**
 * ResolveFn: la navigazione ASPETTA la Promise/Observable (per un Observable: il primo valore
 * e poi il complete) prima di attivare il componente.
 *
 * - `inject()` va chiamato in modo sincrono, PRIMA di qualsiasi `await` (injection context).
 * - prodotto inesistente → `RedirectCommand`: la navigazione corrente viene annullata e ne parte
 *   un'altra verso "not-found" (catturata da `**`). `browserUrl` lascia nella barra l'URL richiesto.
 * - `createUrlTreeFromSnapshot`: URL relativo allo snapshot, indipendente da dove è montata la feature.
 */
export const productResolver: ResolveFn<Product> = async (route, state) => {
  const api = inject(ProductApi);
  const product = await api.fetch(Number(route.paramMap.get('id')));
  if (product) return product;
  // '..' sale di UN SEGMENTO di URL, non di una route: 'products/:id' sono due segmenti.
  // Con ['..', 'not-found'] si finirebbe su products/not-found → di nuovo questo resolver → loop.
  return new RedirectCommand(createUrlTreeFromSnapshot(route, ['../..', 'not-found']), {
    browserUrl: state.url,
  });
};

/** `title` accetta anche un ResolveFn<string>: viene risolto insieme ai resolver della rotta. */
export const productTitleResolver: ResolveFn<string> = (route) =>
  `Prodotto #${route.paramMap.get('id')}`;
