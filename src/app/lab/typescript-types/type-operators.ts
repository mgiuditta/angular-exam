import type { Equal, Expect } from '../shared/type-test';

/**
 * OPERATORI DI TIPO: keyof, typeof, accesso indicizzato.
 * Ogni affermazione è verificata dal compilatore con `Expect<Equal<…>>`.
 */

// ---------------------------------------------------------------------------
// typeof + as const + T[number]: l'union si DERIVA dall'array (un'unica fonte di verità)
// ---------------------------------------------------------------------------
export const ROLES = ['admin', 'editor', 'viewer'] as const;
export type Role = (typeof ROLES)[number];

type _roles = Expect<Equal<typeof ROLES, readonly ['admin', 'editor', 'viewer']>>;
type _role = Expect<Equal<Role, 'admin' | 'editor' | 'viewer'>>;
// senza `as const` l'array viene "allargato": string[] → l'union si perde
type _widened = Expect<Equal<(string[])[number], string>>;

export const PERMISSIONS = {
  admin: ['read', 'write', 'delete'],
  editor: ['read', 'write'],
  viewer: ['read'],
} as const;

// keyof typeof oggetto → union delle chiavi; T[K][number] → union dei valori annidati
type _permissionKeys = Expect<Equal<keyof typeof PERMISSIONS, Role>>;
export type Permission = (typeof PERMISSIONS)[Role][number];
type _permission = Expect<Equal<Permission, 'read' | 'write' | 'delete'>>;

// ---------------------------------------------------------------------------
// keyof e accesso indicizzato su un'interfaccia
// ---------------------------------------------------------------------------
export interface Account {
  readonly id: number;
  name: string;
  email: string;
  role: Role;
  address: { city: string; zip: string };
  tags: string[];
}

type _keys = Expect<Equal<keyof Account, 'id' | 'name' | 'email' | 'role' | 'address' | 'tags'>>;
type _nested = Expect<Equal<Account['address']['city'], string>>;
// indice con union → union dei tipi dei valori
type _unionIndex = Expect<Equal<Account['id' | 'role'], number | Role>>;
// T[number] sugli array, T[keyof T] = "ValueOf"
type _element = Expect<Equal<Account['tags'][number], string>>;
type ValueOf<T> = T[keyof T];
type _valueOf = Expect<Equal<ValueOf<{ a: 1; b: 'x' }>, 1 | 'x'>>;
// sulle tuple: indici numerici e 'length' letterale
type _tupleIndex = Expect<Equal<[string, number][1], number>>;
type _tupleLength = Expect<Equal<[string, number]['length'], 2>>;

// @ts-expect-error 'phone' non è una chiave di Account (niente accesso "a caso" come in JS)
type _missing = Account['phone'];
// @ts-expect-error nei TIPI si usa T['k'], non la dot notation (T.k è un namespace)
type _dot = Account.name;

// ---------------------------------------------------------------------------
// Casi limite di keyof (domande d'esame)
// ---------------------------------------------------------------------------
// index signature string → keyof include anche number (obj[0] diventa obj['0'])
type _indexSignature = Expect<Equal<keyof { [key: string]: unknown }, string | number>>;
type _anyKeys = Expect<Equal<keyof any, string | number | symbol>>;
// union → solo le chiavi COMUNI; intersezione → tutte
type _keyofUnion = Expect<Equal<keyof ({ a: 1; b: 2 } | { a: 1; c: 3 }), 'a'>>;
type _keyofIntersection = Expect<Equal<keyof ({ a: 1 } & { b: 2 }), 'a' | 'b'>>;
// keyof di un array: indici numerici + metodi (raramente utile)
type _arrayKeys = Expect<Equal<'length' extends keyof string[] ? true : false, true>>;

// ---------------------------------------------------------------------------
// Runtime: type guard costruita sull'array `as const`
// ---------------------------------------------------------------------------
/** `includes` su un readonly tuple accetta solo Role → si allarga a readonly string[] per cercare una stringa qualsiasi. */
export function isRole(value: string): value is Role {
  return (ROLES as readonly string[]).includes(value);
}

export function permissionsOf(role: Role): readonly Permission[] {
  return PERMISSIONS[role];
}
