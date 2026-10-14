// spec/schema.ts
/**
 * Status: draft until M-S exit B. MILESTONES.md 1.5, D-179.
 * M-S runs this file first; exit B freezes the whole file.
 */
// A local schema interface, structurally compatible with Standard Schema v1
// (https://standardschema.dev), so spec carries zero dependencies while zod 4
// schemas in packages satisfy it directly (D-046).
// Version 4, 2026-10-04.

/** One validation problem. */
export interface SchemaIssue {
  readonly message: string;
  /** Path into the validated value; keys or { key } segments. */
  readonly path?: ReadonlyArray<PropertyKey | { readonly key: PropertyKey }> | undefined;
}

export interface SchemaSuccess<O> {
  readonly value: O;
  readonly issues?: undefined;
}

export interface SchemaFailure {
  readonly issues: ReadonlyArray<SchemaIssue>;
}

export type SchemaResult<O> = SchemaSuccess<O> | SchemaFailure;

/** The `~standard` property bag of Standard Schema v1. */
export interface SchemaProps<I, O> {
  /** Standard Schema version, always 1. */
  readonly version: 1;
  /** Library name, for example "zod". */
  readonly vendor: string;
  readonly validate: (value: unknown) => SchemaResult<O> | Promise<SchemaResult<O>>;
  readonly types?: { readonly input: I; readonly output: O } | undefined;
}

/**
 * Any Standard Schema v1 schema. zod 4 objects satisfy it. Command inputs,
 * feature schemas and chase schemas are typed as SchemaLike so spec never
 * imports zod.
 */
export interface SchemaLike<I = unknown, O = I> {
  readonly "~standard": SchemaProps<I, O>;
}

/** Output type of a schema. */
export type SchemaOutput<S> = S extends SchemaLike<unknown, infer O> ? O : never;
