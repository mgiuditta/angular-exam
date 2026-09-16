import { InjectionToken } from '@angular/core';

/** Contratto "solo tipo": l'interface descrive, l'InjectionToken fa da chiave a runtime. */
export interface AppConfig {
  readonly appName: string;
  readonly retries: number;
}

/** Senza factory: se nessuno lo fornisce → NullInjectorError (o null con `optional`). */
export const APP_CONFIG = new InjectionToken<AppConfig>('APP_CONFIG');

/** Valore calcolato da una useFactory a partire da APP_CONFIG. */
export const GREETING = new InjectionToken<string>('GREETING');
