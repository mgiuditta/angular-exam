import { JsonPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { scan } from 'rxjs';

/** Esempio 2: setValue vs patchValue, value vs getRawValue, disable con/senza emitEvent. */
@Component({
  selector: 'sbu-value-api-demo',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule, JsonPipe],
  template: `
    <form [formGroup]="address" class="flex flex-wrap items-end gap-3">
      <label class="flex flex-col gap-1 text-sm">
        Via
        <input class="field" formControlName="street" />
      </label>
      <label class="flex flex-col gap-1 text-sm">
        Città
        <input class="field" formControlName="city" />
      </label>
      <label class="flex flex-col gap-1 text-sm">
        CAP
        <input class="field w-24" formControlName="zip" />
      </label>
    </form>
    <div class="mt-3 flex flex-wrap gap-2">
      <button type="button" class="btn" (click)="setAll()">setValue(tutti i campi)</button>
      <button type="button" class="btn" (click)="address.patchValue({ city: 'Torino' })">patchValue(city)</button>
      <button type="button" class="btn" (click)="toggleZip(true)">
        {{ address.controls.zip.disabled ? 'enable' : 'disable' }}(zip)
      </button>
      <button type="button" class="btn" (click)="toggleZip(false)">
        {{ address.controls.zip.disabled ? 'enable' : 'disable' }}(zip, emitEvent: false)
      </button>
    </div>
    <dl class="mt-3 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm">
      <dt>value</dt>
      <dd><code>{{ address.value | json }}</code></dd>
      <dt>getRawValue()</dt>
      <dd><code>{{ address.getRawValue() | json }}</code></dd>
      <dt>emissioni valueChanges</dt>
      <dd>{{ valueChangesCount() }}</dd>
    </dl>
  `,
})
export class ValueApiDemo {
  protected readonly address = new FormGroup({
    street: new FormControl('Via Roma 1', { nonNullable: true }),
    city: new FormControl('Milano', { nonNullable: true }),
    zip: new FormControl('20100', { nonNullable: true }),
  });

  protected readonly valueChangesCount = toSignal(this.address.valueChanges.pipe(scan((count) => count + 1, 0)), {
    initialValue: 0,
  });

  protected setAll(): void {
    this.address.setValue({ street: 'Corso Italia 10', city: 'Roma', zip: '00100' });
  }

  protected toggleZip(emitEvent: boolean): void {
    const zip = this.address.controls.zip;
    if (zip.disabled) zip.enable({ emitEvent });
    else zip.disable({ emitEvent });
  }
}
