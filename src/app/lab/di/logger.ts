import { Injectable, InjectionToken, signal } from '@angular/core';
import { nextInstanceId } from './instance-id';

/**
 * Classe ASTRATTA come token: esiste a runtime (è una funzione JS), quindi può essere la
 * chiave del DI e insieme il tipo restituito da `inject(Logger)`.
 * Un'`interface` no: TypeScript la cancella in compilazione, a runtime non c'è nulla da usare
 * come chiave → per contratti "solo tipo" serve `InjectionToken<MyInterface>`.
 */
export abstract class Logger {
  readonly id: string;
  private readonly _lines = signal<readonly string[]>([]);
  readonly lines = this._lines.asReadonly();

  protected constructor(kind: string) {
    this.id = nextInstanceId(kind);
  }

  log(message: string): void {
    this._lines.update((lines) => [...lines, this.format(message)]);
  }

  protected abstract format(message: string): string;
}

/** Implementazione semplice. Senza `providedIn`: va messa esplicitamente in un array `providers`. */
@Injectable()
export class MemoryLogger extends Logger {
  constructor() {
    super('MemoryLogger');
  }

  protected format(message: string): string {
    return message;
  }
}

/** Implementazione alternativa, sostituibile con `useClass` senza toccare chi inietta `Logger`. */
@Injectable()
export class ShoutLogger extends Logger {
  constructor() {
    super('ShoutLogger');
  }

  protected format(message: string): string {
    return message.toUpperCase();
  }
}

/** Secondo token per lo stesso tipo: usato per confrontare `useExisting` e `useClass`. */
export const LOGGER_COPY = new InjectionToken<Logger>('LOGGER_COPY');
