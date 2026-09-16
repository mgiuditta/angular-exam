import { Injectable, signal } from '@angular/core';

export interface Product {
  readonly id: number;
  readonly name: string;
  readonly price: number;
}

const PRODUCTS: readonly Product[] = [
  { id: 1, name: 'Tastiera meccanica', price: 89 },
  { id: 2, name: 'Monitor 27"', price: 249 },
  { id: 3, name: 'Mouse ergonomico', price: 59 },
];

const LATENCY_MS = 400;

/** Finta API asincrona. Conta le chiamate per mostrare QUANDO il resolver viene rieseguito. */
@Injectable({ providedIn: 'root' })
export class ProductApi {
  private readonly callCount = signal(0);
  readonly calls = this.callCount.asReadonly();

  fetch(id: number): Promise<Product | undefined> {
    this.callCount.update((n) => n + 1);
    return new Promise((resolve) =>
      setTimeout(() => resolve(PRODUCTS.find((product) => product.id === id)), LATENCY_MS),
    );
  }
}
