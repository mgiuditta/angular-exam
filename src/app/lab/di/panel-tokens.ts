import { InjectionToken } from '@angular/core';

/** ESEMPIO 7 — Un token per canale, così il lettore può dire da dove arriva il valore. */
export const FROM_PROVIDERS = new InjectionToken<string>('FROM_PROVIDERS');
export const FROM_VIEW_PROVIDERS = new InjectionToken<string>('FROM_VIEW_PROVIDERS');
