const counters = new Map<string, number>();

/**
 * Etichetta progressiva per istanza ("CounterStore #2"): rende VISIBILE quante istanze
 * ha creato il DI. Due oggetti con la stessa etichetta sono la stessa istanza.
 */
export function nextInstanceId(kind: string): string {
  const n = (counters.get(kind) ?? 0) + 1;
  counters.set(kind, n);
  return `${kind} #${n}`;
}
