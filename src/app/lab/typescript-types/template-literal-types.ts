import type { Equal, Expect } from '../shared/type-test';

/**
 * TEMPLATE LITERAL TYPES e tipi stringa intrinseci.
 */

// ---------------------------------------------------------------------------
// Intrinseci: implementati DENTRO il compilatore (non riscrivibili in TS)
// ---------------------------------------------------------------------------
type _upper = Expect<Equal<Uppercase<'ciao'>, 'CIAO'>>;
type _lower = Expect<Equal<Lowercase<'CIAO'>, 'ciao'>>;
type _capitalize = Expect<Equal<Capitalize<'userLogin'>, 'UserLogin'>>;
type _uncapitalize = Expect<Equal<Uncapitalize<'UserLogin'>, 'userLogin'>>;
// distribuiscono sulle union
type _distributes = Expect<Equal<Uppercase<'a' | 'b'>, 'A' | 'B'>>;
// su `string` restano un tipo "pattern": 'ciao' non è Uppercase<string>
type AcceptsUpper<T extends Uppercase<string>> = T;
type _upperOk = AcceptsUpper<'CIAO'>;
// @ts-expect-error 'ciao' non è maiuscolo
type _upperKo = AcceptsUpper<'ciao'>;

// ---------------------------------------------------------------------------
// Template literal: prodotto cartesiano delle union
// ---------------------------------------------------------------------------
type Variant = 'primary' | 'danger';
type Size = 'sm' | 'lg';
type ButtonClass = `btn-${Variant}-${Size}`;
type _cartesian = Expect<Equal<ButtonClass, 'btn-primary-sm' | 'btn-primary-lg' | 'btn-danger-sm' | 'btn-danger-lg'>>;

// "pattern" con tipi primitivi: accetta infinite stringhe con una certa forma
type CssLength = `${number}px` | `${number}rem`;
type AcceptsLength<T extends CssLength> = T;
type _px = AcceptsLength<'12px' | '1.5rem'>;
// @ts-expect-error 'em' non è nel pattern
type _em = AcceptsLength<'2em'>;

// ---------------------------------------------------------------------------
// Parsing con infer: split, kebab → camel (ricorsivi)
// ---------------------------------------------------------------------------
type Split<S extends string, D extends string> = S extends `${infer Head}${D}${infer Tail}`
  ? [Head, ...Split<Tail, D>]
  : [S];
type _split = Expect<Equal<Split<'a.b.c', '.'>, ['a', 'b', 'c']>>;

type KebabToCamel<S extends string> = S extends `${infer Head}-${infer Tail}`
  ? `${Head}${KebabToCamel<Capitalize<Tail>>}`
  : S;
type _camel = Expect<Equal<KebabToCamel<'user-login-failed'>, 'userLoginFailed'>>;

// ---------------------------------------------------------------------------
// Emitter tipizzato: la mappa degli eventi guida nomi, payload e nomi degli handler
// ---------------------------------------------------------------------------
/**
 * `type` e non `interface`: un'interfaccia NON ha index signature implicita, quindi
 * non sarebbe assegnabile a `Record<string, object>` (errore classico).
 */
export type AppEvents = {
  userLogin: { name: string };
  userLogout: { reason: 'manuale' | 'scaduta' };
  cartUpdated: { items: number };
};

export type HandlerName<K extends string> = `on${Capitalize<K>}`;
export type Handlers<E> = { [K in keyof E & string as HandlerName<K>]: (payload: E[K]) => void };

type _handlerName = Expect<Equal<HandlerName<keyof AppEvents>, 'onUserLogin' | 'onUserLogout' | 'onCartUpdated'>>;
type _handlers = Expect<Equal<Handlers<AppEvents>['onCartUpdated'], (payload: { items: number }) => void>>;

interface AppEventsInterface {
  userLogin: { name: string };
}
type AcceptsEventMap<E extends Record<string, object>> = E;
type _typeAlias = AcceptsEventMap<AppEvents>;
// @ts-expect-error interfaccia senza index signature implicita
type _interface = AcceptsEventMap<AppEventsInterface>;

export function handlerName<K extends string>(event: K): HandlerName<K> {
  // a runtime una stringa qualsiasi: TS non verifica che il calcolo corrisponda al tipo
  return `on${event.charAt(0).toUpperCase()}${event.slice(1)}` as HandlerName<K>;
}

export interface Emitter<E extends Record<string, object>> {
  on<K extends keyof E & string>(event: K, handler: (payload: E[K]) => void): () => void;
  emit<K extends keyof E & string>(event: K, payload: E[K]): void;
}

export function createEmitter<E extends Record<string, object>>(): Emitter<E> {
  const listeners: { [K in keyof E]?: ((payload: E[K]) => void)[] } = {};
  return {
    on(event, handler) {
      (listeners[event] ??= []).push(handler);
      return () => {
        listeners[event] = listeners[event]?.filter((current) => current !== handler);
      };
    },
    emit(event, payload) {
      listeners[event]?.forEach((handler) => handler(payload));
    },
  };
}

// ---------------------------------------------------------------------------
// Parametri di una rotta: '/users/:id/posts/:postId' → { id: string; postId: string }
// ---------------------------------------------------------------------------
type ParamNames<Path extends string> = Path extends `${string}:${infer Name}/${infer Rest}`
  ? Name | ParamNames<Rest>
  : Path extends `${string}:${infer Name}`
    ? Name
    : never;

export type RouteParams<Path extends string> = { [K in ParamNames<Path>]: string };

type _routeParams = Expect<Equal<RouteParams<'/users/:id/posts/:postId'>, { id: string; postId: string }>>;
type _noParams = Expect<Equal<RouteParams<'/home'>, {}>>;
// con un path `string` (non letterale) non si estrae nulla → nessun controllo sui parametri
type _wideString = Expect<Equal<RouteParams<string>, {}>>;

export function buildRoute<Path extends string>(path: Path, params: RouteParams<Path>): string {
  const values: Record<string, string> = params;
  return path.replace(/:(\w+)/g, (_, name: string) => encodeURIComponent(values[name] ?? ''));
}
