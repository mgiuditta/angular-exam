import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { LOGGER_COPY, Logger, MemoryLogger } from './logger';

/**
 * ESEMPIO 4 — useExisting (alias) vs useClass (nuova istanza)
 *
 * - `{ provide: Logger, useExisting: MemoryLogger }`: chi chiede Logger riceve LA STESSA istanza
 *   registrata sotto MemoryLogger (che deve essere fornita a sua volta).
 * - `{ provide: LOGGER_COPY, useClass: MemoryLogger }`: il token ha la SUA istanza, separata.
 * Caso tipico di useExisting: restringere un servizio a un'API più piccola, o rinominare un token.
 */
@Component({
  selector: 'sbu-di-alias-demo',
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [
    MemoryLogger,
    { provide: Logger, useExisting: MemoryLogger },
    { provide: LOGGER_COPY, useClass: MemoryLogger },
  ],
  template: `
    <table class="w-full text-left text-sm">
      <caption class="sr-only">Istanze risolte per ogni token</caption>
      <thead>
        <tr class="border-b border-border">
          <th scope="col" class="py-1 pr-2">Token</th>
          <th scope="col" class="py-1 pr-2">Istanza</th>
          <th scope="col" class="py-1 pr-2">Righe</th>
          <th scope="col" class="py-1"><span class="sr-only">Azione</span></th>
        </tr>
      </thead>
      <tbody>
        @for (row of rows; track row.token) {
          <tr class="border-b border-border">
            <th scope="row" class="py-1 pr-2 font-normal"><code>{{ row.token }}</code></th>
            <td class="py-1 pr-2"><code>{{ row.logger.id }}</code></td>
            <td class="py-1 pr-2">{{ row.logger.lines().length }}</td>
            <td class="py-1">
              <button type="button" class="btn" (click)="row.logger.log(row.token)">log via {{ row.token }}</button>
            </td>
          </tr>
        }
      </tbody>
    </table>
    <p class="mt-2 text-sm">
      Logger === MemoryLogger: <strong>{{ aliasIsSame }}</strong> · LOGGER_COPY === MemoryLogger:
      <strong>{{ copyIsSame }}</strong>
    </p>
  `,
})
export class AliasDemo {
  private readonly memory = inject(MemoryLogger);
  private readonly alias = inject(Logger);
  private readonly copy = inject(LOGGER_COPY);

  protected readonly rows = [
    { token: 'MemoryLogger', logger: this.memory },
    { token: 'Logger (useExisting)', logger: this.alias },
    { token: 'LOGGER_COPY (useClass)', logger: this.copy },
  ];
  protected readonly aliasIsSame = this.alias === this.memory;
  protected readonly copyIsSame = this.copy === this.memory;
}
