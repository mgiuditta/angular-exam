import { ChangeDetectionStrategy, Component } from '@angular/core';
import { DeferredCard } from './deferred-card';

/**
 * Secondo componente lazy, usato solo nell'esempio degli stati di @defer: ha un chunk suo,
 * quindi non è già in cache per colpa dei blocchi `on immediate` dell'esempio precedente.
 * Contiene un @defer annidato: il blocco interno parte solo quando questo componente è renderizzato.
 */
@Component({
  selector: 'sbu-deferred-details',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [DeferredCard],
  host: { class: 'flex flex-col gap-2' },
  template: `
    <p class="rounded-md border border-success p-2 text-sm">✅ Blocco esterno caricato (chunk dedicato)</p>
    @defer (on timer(1500ms)) {
      <sbu-deferred-card trigger="annidato: on timer(1500ms)" />
    } @placeholder {
      <p class="text-sm text-muted-foreground">Blocco annidato: parte 1,5 s dopo il render del padre…</p>
    }
  `,
})
export class DeferredDetails {}
