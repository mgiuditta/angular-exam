import { InjectionToken, Provider } from '@angular/core';

export interface PasswordRule {
  readonly label: string;
  readonly test: (value: string) => boolean;
}

/**
 * ESEMPIO 5 — Multi provider
 * Con `multi: true` ogni provider AGGIUNGE un elemento: `inject(PASSWORD_RULES)` restituisce l'array.
 * Stesso meccanismo di NG_VALIDATORS, HTTP_INTERCEPTORS, provideAppInitializer.
 */
export const PASSWORD_RULES = new InjectionToken<readonly PasswordRule[]>('PASSWORD_RULES');

/** Funzione `provideXxx()`: nasconde token e forma del provider a chi lo usa. */
export function providePasswordRule(label: string, test: (value: string) => boolean): Provider {
  return { provide: PASSWORD_RULES, useValue: { label, test } satisfies PasswordRule, multi: true };
}
