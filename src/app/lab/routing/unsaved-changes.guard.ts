import { CanDeactivateFn } from '@angular/router';

/** Contratto che il componente deve rispettare per essere protetto dalla guard. */
export interface ConfirmLeave {
  confirmLeave(targetUrl: string): boolean | Promise<boolean>;
}

/**
 * CanDeactivateFn<T>: riceve l'ISTANZA del componente che si sta lasciando e lo stato di arrivo.
 * Tipizzata sull'interfaccia, non sul componente: riusabile da qualsiasi form.
 */
export const unsavedChangesGuard: CanDeactivateFn<ConfirmLeave> = (
  component,
  _currentRoute,
  _currentState,
  nextState,
) => component.confirmLeave(nextState.url);
