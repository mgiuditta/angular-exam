import { Signal, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import {
  Event as AnyRouterEvent,
  NavigationCancel,
  NavigationEnd,
  NavigationError,
  NavigationSkipped,
  NavigationStart,
  Router,
} from '@angular/router';
import { filter, map, scan } from 'rxjs';

type NavigationLifecycleEvent =
  | NavigationStart
  | NavigationEnd
  | NavigationCancel
  | NavigationSkipped
  | NavigationError;

function isNavigationLifecycle(event: AnyRouterEvent): event is NavigationLifecycleEvent {
  return (
    event instanceof NavigationStart ||
    event instanceof NavigationEnd ||
    event instanceof NavigationCancel ||
    event instanceof NavigationSkipped ||
    event instanceof NavigationError
  );
}

function describeEvent(event: NavigationLifecycleEvent): string {
  if (event instanceof NavigationStart) {
    return `#${event.id} NavigationStart ${event.url} (trigger: ${event.navigationTrigger})`;
  }
  if (event instanceof NavigationEnd) return `#${event.id} NavigationEnd ${event.urlAfterRedirects}`;
  if (event instanceof NavigationCancel) return `#${event.id} NavigationCancel: ${event.reason}`;
  if (event instanceof NavigationSkipped) return `#${event.id} NavigationSkipped: ${event.reason}`;
  return `#${event.id} NavigationError: ${String(event.error)}`;
}

/**
 * Ultimi `limit` eventi di navigazione come signal.
 * Funzione `inject*`: va chiamata in injection context (field initializer / constructor),
 * come `toSignal`, che fa unsubscribe da solo alla distruzione del componente.
 */
export function injectNavigationLog(limit = 8): Signal<readonly string[]> {
  const events = inject(Router).events.pipe(
    filter(isNavigationLifecycle),
    map(describeEvent),
    scan((log: readonly string[], line: string) => [...log, line].slice(-limit), []),
  );
  return toSignal(events, { initialValue: [] });
}
