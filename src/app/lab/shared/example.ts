import { ChangeDetectionStrategy, Component, input } from '@angular/core';

let nextId = 0;

/**
 * Contenitore di un esempio. È anche un esempio di content projection:
 * - `<ng-content />`               → slot di default (tutto ciò che non matcha altri slot)
 * - `<ng-content select="[note]"/>` → slot con selettore CSS (qui un attributo `note`)
 *
 * Lifecycle (domanda d'esame): il contenuto proiettato viene CREATO dal componente PADRE,
 * anche se questo componente non lo mostrasse mai (es. dentro un `@if` falso).
 * Il suo constructor/ngOnInit girano comunque. Per contenuto davvero lazy serve `<ng-template>`.
 */
@Component({
  selector: 'sbu-example',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block' },
  template: `
    <section
      [attr.aria-labelledby]="headingId"
      class="rounded-xl border border-border bg-card p-5 text-card-foreground shadow-sm"
    >
      <header class="mb-3 flex flex-wrap items-baseline gap-2">
        <h2 [id]="headingId" class="text-lg font-semibold tracking-tight">
          {{ n() }}. {{ title() }}
        </h2>
        <span class="rounded-full bg-secondary px-2 py-0.5 text-xs font-medium text-secondary-foreground">
          {{ level() }}
        </span>
      </header>
      <div class="rounded-lg border border-dashed border-border p-4">
        <ng-content />
      </div>
      <div class="mt-3 space-y-1 text-sm text-muted-foreground">
        <ng-content select="[note]" />
      </div>
    </section>
  `,
})
export class Example {
  readonly n = input.required<number>();
  readonly title = input.required<string>();
  readonly level = input<'base' | 'intermedio' | 'avanzato'>('base');

  protected readonly headingId = `example-${nextId++}`;
}

/** Layout comune delle pagine: titolo + intro + lista esempi. */
@Component({
  selector: 'sbu-lab-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <main class="mx-auto flex max-w-5xl flex-col gap-6 p-4 md:p-6">
      <header class="flex flex-col gap-2">
        <h1 class="text-3xl font-bold tracking-tight">{{ heading() }}</h1>
        <div class="text-muted-foreground"><ng-content select="[intro]" /></div>
      </header>
      <ng-content />
    </main>
  `,
})
export class LabPage {
  readonly heading = input.required<string>();
}
