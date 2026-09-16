import { JsonPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';

/** Esempio 1: FormControl/FormGroup tipizzati, nonNullable e reset(). */
@Component({
  selector: 'sbu-typed-controls-demo',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule, JsonPipe],
  template: `
    <form [formGroup]="profile" class="flex flex-wrap items-end gap-3">
      <label class="flex flex-col gap-1 text-sm">
        name (nonNullable)
        <input class="field" formControlName="name" />
      </label>
      <label class="flex flex-col gap-1 text-sm">
        nickname (nullable)
        <input class="field" formControlName="nickname" />
      </label>
      <button type="button" class="btn" (click)="profile.reset()">reset()</button>
      <button type="button" class="btn" (click)="profile.controls.nickname.setValue(null)">nickname.setValue(null)</button>
    </form>
    <dl class="mt-3 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm">
      <dt>profile.value</dt>
      <dd><code>{{ profile.value | json }}</code></dd>
      <dt>name.defaultValue</dt>
      <dd><code>{{ profile.controls.name.defaultValue | json }}</code></dd>
    </dl>
  `,
})
export class TypedControlsDemo {
  protected readonly profile = new FormGroup({
    name: new FormControl('Ada', { nonNullable: true }), // FormControl<string>
    nickname: new FormControl('ada'), //                    FormControl<string | null>
  });
}
