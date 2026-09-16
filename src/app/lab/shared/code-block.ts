import { ChangeDetectionStrategy, Component, input } from '@angular/core';

/**
 * Tag per snippet multi-riga: `ts\`...\`` toglie l'indentazione comune e le righe vuote ai bordi,
 * così lo snippet può restare indentato nel sorgente. Nessuna interpolazione: `${` va scritto `\${`.
 */
export function ts(strings: TemplateStringsArray): string {
  const lines = strings[0].replace(/^\s*\n/, '').trimEnd().split('\n');
  const indent = Math.min(...lines.filter((line) => line.trim()).map((line) => line.search(/\S/)));
  return lines.map((line) => line.slice(indent)).join('\n');
}

/** Blocco di codice scrollabile. tabindex: una regione scrollabile deve essere raggiungibile da tastiera (axe). */
@Component({
  selector: 'sbu-code',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'mt-3 block' },
  template: `
    <pre
      tabindex="0"
      [attr.aria-label]="label()"
      class="overflow-x-auto rounded-md border border-border bg-muted p-3 font-mono text-xs leading-relaxed text-foreground focus-visible:outline-2 focus-visible:outline-ring"
    ><code>{{ code() }}</code></pre>
  `,
})
export class CodeBlock {
  readonly code = input.required<string>();
  readonly label = input('Codice dell’esempio');
}
