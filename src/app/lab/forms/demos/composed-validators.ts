import { JsonPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, ValidatorFn, Validators } from '@angular/forms';
import { ErrorMessagePipe } from '../error-message';
import { minArrayLength, uniqueValues } from '../validators';

/** Esempio 15: compose/composeAsync/nullValidator e validator applicati a un FormArray. */
@Component({
  selector: 'sbu-composed-validators-demo',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule, JsonPipe, ErrorMessagePipe],
  template: `
    @let tags = talk.controls.tags;
    <form [formGroup]="talk" class="flex flex-col gap-3 text-sm">
      <div class="flex flex-col gap-1">
        <label for="comp-title">Titolo (un solo ValidatorFn creato con Validators.compose)</label>
        <input
          id="comp-title"
          class="field"
          formControlName="title"
          [attr.aria-invalid]="talk.controls.title.invalid && talk.controls.title.touched"
          [attr.aria-describedby]="
            talk.controls.title.invalid && talk.controls.title.touched ? 'comp-title-error' : null
          "
        />
        @if (talk.controls.title.invalid && talk.controls.title.touched) {
          <p id="comp-title-error" class="text-destructive">{{ talk.controls.title.errors | errorMessage }}</p>
        }
      </div>

      <fieldset formArrayName="tags" class="flex flex-col gap-2">
        <legend class="mb-1 font-medium">Tag (almeno 2, senza duplicati)</legend>
        @for (tag of tags.controls; track tag; let i = $index) {
          <div class="flex items-end gap-2">
            <label class="flex flex-col gap-1">
              Tag {{ i + 1 }}
              <input
                class="field"
                [formControlName]="i"
                [attr.aria-invalid]="tag.invalid && tag.touched"
                [attr.aria-describedby]="tag.invalid && tag.touched ? 'comp-tag-error-' + i : null"
              />
            </label>
            <button type="button" class="btn" (click)="removeTag(i)">
              Rimuovi <span class="sr-only">tag {{ i + 1 }}</span>
            </button>
            @if (tag.invalid && tag.touched) {
              <p [id]="'comp-tag-error-' + i" class="pb-2 text-destructive">{{ tag.errors | errorMessage }}</p>
            }
          </div>
        }
        <div class="flex flex-wrap gap-2">
          <button type="button" class="btn" (click)="addTag()">Aggiungi tag</button>
          <button type="button" class="btn" (click)="addDuplicate()">Aggiungi un duplicato</button>
        </div>
        <!-- gli errori del FormArray stanno sull'array, non sui suoi figli -->
        @if (tags.errors) {
          <p class="text-destructive" aria-live="polite">{{ tags.errors | errorMessage }}</p>
        }
      </fieldset>
    </form>

    <dl class="mt-3 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm">
      <dt>tags.value</dt>
      <dd><code>{{ tags.value | json }}</code></dd>
      <dt>tags.errors (array)</dt>
      <dd><code>{{ tags.errors | json }}</code></dd>
      <dt>title.errors</dt>
      <dd><code>{{ talk.controls.title.errors | json }}</code></dd>
      <dt>form valid</dt>
      <dd>{{ talk.valid }}</dd>
    </dl>
  `,
})
export class ComposedValidatorsDemo {
  private readonly fb = inject(NonNullableFormBuilder);

  // compose() unisce più ValidatorFn in UNA sola: utile quando un'API accetta un solo validator.
  // Gli errori si fondono in un unico oggetto; compose([]) e compose(null) restituiscono null.
  private readonly titleValidator: ValidatorFn = Validators.compose([
    Validators.required,
    Validators.minLength(5),
    Validators.maxLength(60),
  ])!;

  protected readonly talk = this.fb.group({
    title: ['', this.titleValidator],
    // i validator su un FormArray guardano il valore dell'INTERO array
    tags: this.fb.array([this.createTag('angular')], [minArrayLength(2), uniqueValues()]),
  });

  protected addTag(value = ''): void {
    this.talk.controls.tags.push(this.createTag(value));
  }

  protected addDuplicate(): void {
    this.addTag(this.talk.controls.tags.at(0)?.value ?? 'angular');
  }

  protected removeTag(index: number): void {
    this.talk.controls.tags.removeAt(index);
  }

  private createTag(value: string) {
    // Validators.nullValidator non fa nulla: segnaposto "nessun validator" (utile nei ternari)
    return this.fb.control(value, [Validators.required, Validators.minLength(2), Validators.nullValidator]);
  }
}
