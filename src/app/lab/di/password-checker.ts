import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { PASSWORD_RULES, providePasswordRule } from './password-rules';

/**
 * ESEMPIO 5 — Il componente non conosce le regole: le riceve tutte dal multi provider.
 * Aggiungere una regola = aggiungere un provider, zero modifiche qui (open/closed).
 */
@Component({
  selector: 'sbu-di-password-checker',
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [
    providePasswordRule('Almeno 8 caratteri', (value) => value.length >= 8),
    providePasswordRule('Almeno una cifra', (value) => /\d/.test(value)),
    providePasswordRule('Almeno una maiuscola', (value) => /[A-Z]/.test(value)),
  ],
  template: `
    <label class="flex flex-col gap-1 text-sm">
      Password di prova
      <input #field class="field" type="text" autocomplete="off" [value]="value()" (input)="value.set(field.value)" />
    </label>
    <ul class="mt-3 space-y-1 text-sm" aria-live="polite">
      @for (check of checks(); track check.label) {
        <li>
          <span [class]="check.ok ? 'font-semibold' : 'text-muted-foreground'">{{ check.ok ? '✓ ok' : '✗ manca' }}</span>
          — {{ check.label }}
        </li>
      }
    </ul>
    <p class="mt-2 text-sm">inject(PASSWORD_RULES).length = {{ rules.length }}</p>
  `,
})
export class PasswordChecker {
  protected readonly rules = inject(PASSWORD_RULES);
  protected readonly value = signal('');
  protected readonly checks = computed(() =>
    this.rules.map((rule) => ({ label: rule.label, ok: rule.test(this.value()) })),
  );
}
