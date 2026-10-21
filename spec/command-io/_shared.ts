// Types the spec/command-io interfaces share; not part of the spec index.

/** Named facts a query takes: a number, string or flag per name. */
export type Facts = Readonly<Record<string, number | string | boolean>>;
/** A design's params by name, values as the chase declares them. */
export type Params = Readonly<Record<string, unknown>>;
