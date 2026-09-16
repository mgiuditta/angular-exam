import type {
  InputSignal,
  InputSignalWithTransform,
  ModelSignal,
  OutputEmitterRef,
  Signal,
  WritableSignal,
} from '@angular/core';
import { FormControl, FormGroup, type ɵFormGroupRawValue, type ɵFormGroupValue } from '@angular/forms';
import type { RedirectCommand, ResolveFn } from '@angular/router';
import type { Observable } from 'rxjs';
import type { Equal, Expect } from '../shared/type-test';

/**
 * COME ANGULAR USA IL TYPE SYSTEM (verificato con gli import reali).
 */

type Extends<A, B> = A extends B ? true : false;

// ---------------------------------------------------------------------------
// Signal<T> = (() => T) & { [SIGNAL]: unknown } → ReturnType e infer funzionano
// ---------------------------------------------------------------------------
export type SignalValue<S> = S extends Signal<infer V> ? V : never;
type _signalReturn = Expect<Equal<ReturnType<Signal<number>>, number>>;
type _signalValue = Expect<Equal<SignalValue<WritableSignal<string[]>>, string[]>>;
// gerarchia: ModelSignal ⊂ WritableSignal ⊂ Signal; InputSignal ⊂ Signal (ma NON scrivibile)
type _writable = Expect<Equal<Extends<WritableSignal<number>, Signal<number>>, true>>;
type _model = Expect<Equal<Extends<ModelSignal<number>, WritableSignal<number>>, true>>;
type _inputNotWritable = Expect<Equal<Extends<InputSignal<number>, WritableSignal<number>>, false>>;
// input con transform: il componente LEGGE T, il template SCRIVE TransformT
type _transform = Expect<Equal<SignalValue<InputSignalWithTransform<boolean, string | boolean>>, boolean>>;
type _inputAlias = Expect<Equal<Extends<InputSignal<string>, InputSignalWithTransform<string, string>>, true>>;
// output(): OutputEmitterRef<T>.emit accetta T
type _output = Expect<Equal<Parameters<OutputEmitterRef<number>['emit']>, [value: number]>>;

/** Mapped type su un oggetto di signal: legge tutti i valori in un colpo (utile dentro un computed). */
export function readSignals<T extends Record<string, Signal<unknown>>>(signals: T): { [K in keyof T]: SignalValue<T[K]> } {
  const values: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(signals)) {
    values[key] = value();
  }
  return values as { [K in keyof T]: SignalValue<T[K]> };
}

// ---------------------------------------------------------------------------
// Typed forms: il tipo del FormGroup deriva dai controlli
// ---------------------------------------------------------------------------
export function createProfileForm() {
  return new FormGroup({
    name: new FormControl('', { nonNullable: true }),
    email: new FormControl(''), // senza nonNullable: reset() → null, quindi string | null
    newsletter: new FormControl(false, { nonNullable: true }),
  });
}
export type ProfileForm = ReturnType<typeof createProfileForm>;
type ProfileControls = ProfileForm['controls'];

type _control = Expect<Equal<ProfileControls['email'], FormControl<string | null>>>;
// .value è PARZIALE: i controlli disabilitati sono esclusi a runtime
type _value = Expect<Equal<ProfileForm['value'], Partial<{ name: string; email: string | null; newsletter: boolean }>>>;
// getRawValue() include anche i disabilitati → tutto obbligatorio
type _rawValue = Expect<
  Equal<ReturnType<ProfileForm['getRawValue']>, { name: string; email: string | null; newsletter: boolean }>
>;
// le derivazioni interne di Angular (ɵ = API privata: solo per capire, non usarle nel codice)
type _internalValue = Expect<Equal<ɵFormGroupValue<ProfileControls>, ProfileForm['value']>>;
type _internalRaw = Expect<Equal<ɵFormGroupRawValue<ProfileControls>, ReturnType<ProfileForm['getRawValue']>>>;

/** Dal modello ai controlli: mapped type che rende il FormGroup coerente con un'interfaccia. */
export type ControlsOf<T> = { [K in keyof T]: FormControl<T[K]> };
type _controlsOf = Expect<
  Equal<ProfileForm, FormGroup<ControlsOf<{ name: string; email: string | null; newsletter: boolean }>>>
>;
// @ts-expect-error il controllo 'phone' non esiste nel FormGroup tipizzato
type _noPhone = ProfileControls['phone'];

// ---------------------------------------------------------------------------
// ResolveFn<T>: il ritorno può essere sincrono, Observable o Promise (MaybeAsync, non esportato)
// ---------------------------------------------------------------------------
type _resolveFn = Expect<
  Equal<
    ReturnType<ResolveFn<string>>,
    string | RedirectCommand | Observable<string | RedirectCommand> | Promise<string | RedirectCommand>
  >
>;
export type ResolvedData<R> = R extends ResolveFn<infer T> ? T : never;
type _resolved = Expect<Equal<ResolvedData<ResolveFn<{ id: number }>>, { id: number }>>;
