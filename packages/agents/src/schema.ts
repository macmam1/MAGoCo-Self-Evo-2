/**
 * Minimal JSON-Schema validation.
 *
 * `ajv` would be the standard choice, but it pulls a large dependency tree into a
 * package whose whole point is to stay light — and the framework's own schemas are
 * hand-written and simple. This implements the subset the framework actually uses:
 * type, required, properties, items, enum, plus a few constraints. If a later phase
 * needs the full spec, this is one capability provider to swap, not a rewrite.
 *
 * It validates AND reports where a value went wrong, because that message is what
 * the model sees to fix its own tool call on the next turn (see tools.ts).
 */

export interface SchemaError {
  /** Dot path into the validated value, e.g. `args.name`. */
  readonly path: string;
  readonly message: string;
}

export interface ValidationResult {
  readonly ok: boolean;
  /** Present and non-empty only when `ok` is false. */
  readonly errors: readonly SchemaError[];
}

/**
 * Validate `value` against `schema`.
 *
 * `prefix` names the value for error paths — the tools seam calls it `args` so a bad
 * tool call comes back as `args.query: expected string` which the model can act on.
 */
/** A JSON Schema, or the boolean form of one (`true` = accept, `false` = reject). */
export type SchemaInput = object | boolean;

export function validate(value: unknown, schema: SchemaInput, prefix = ''): ValidationResult {
  const errors: SchemaError[] = [];
  walk(value, schema, prefix, errors);
  return { ok: errors.length === 0, errors };
}

type AnySchema = {
  type?: string | readonly string[];
  properties?: Record<string, object>;
  required?: readonly string[];
  items?: object;
  enum?: readonly unknown[];
  minimum?: number;
  maximum?: number;
  minLength?: number;
  maxLength?: number;
  additionalProperties?: boolean | object;
  oneOf?: readonly object[];
  anyOf?: readonly object[];
};

function walk(value: unknown, schemaRaw: SchemaInput, path: string, errors: SchemaError[]): void {
  const schema = schemaRaw as AnySchema;
  if (typeof schemaRaw !== 'object' || schemaRaw === null) {
    // A boolean schema: `true` accepts anything, `false` rejects it.
    const asBool = schemaRaw as boolean;
    if (asBool === false) errors.push({ path, message: 'value is not allowed here' });
    return;
  }
  if ((schemaRaw as unknown as boolean) === true) return;

  if (schema.oneOf) {
    const matched = schema.oneOf.filter((s) => validate(value, s).ok);
    if (matched.length !== 1) {
      errors.push({ path, message: `matched ${matched.length} of oneOf alternatives, expected exactly 1` });
    }
    return;
  }
  if (schema.anyOf) {
    if (!schema.anyOf.some((s) => validate(value, s).ok)) {
      errors.push({ path, message: 'matched none of anyOf alternatives' });
    }
    return;
  }

  if (schema.type !== undefined) {
    const types = Array.isArray(schema.type) ? schema.type : [schema.type];
    if (!types.some((t) => matchesType(value, t))) {
      errors.push({ path, message: `expected ${types.join(' or ')}, got ${typeName(value)}` });
      return; // nothing else to check once the type is wrong
    }
  }

  if (schema.enum !== undefined && !schema.enum.includes(value)) {
    errors.push({ path, message: `expected one of [${schema.enum.map(String).join(', ')}]` });
  }

  if (typeof value === 'number') {
    if (schema.minimum !== undefined && value < schema.minimum) {
      errors.push({ path, message: `expected >= ${schema.minimum}` });
    }
    if (schema.maximum !== undefined && value > schema.maximum) {
      errors.push({ path, message: `expected <= ${schema.maximum}` });
    }
  }

  if (typeof value === 'string') {
    if (schema.minLength !== undefined && value.length < schema.minLength) {
      errors.push({ path, message: `expected length >= ${schema.minLength}` });
    }
    if (schema.maxLength !== undefined && value.length > schema.maxLength) {
      errors.push({ path, message: `expected length <= ${schema.maxLength}` });
    }
  }

  if (schema.properties && typeof value === 'object' && value !== null) {
    const obj = value as Record<string, unknown>;
    for (const [key, sub] of Object.entries(schema.properties)) {
      const childPath = path ? `${path}.${key}` : key;
      if (key in obj) {
        walk(obj[key], sub, childPath, errors);
      } else if (Array.isArray(schema.required) && schema.required.includes(key)) {
        errors.push({ path: childPath, message: 'required property is missing' });
      }
    }
    // Report required-but-missing for keys that have no declared property too.
    if (Array.isArray(schema.required)) {
      for (const key of schema.required) {
        const childPath = path ? `${path}.${key}` : key;
        if (!(key in obj) && !(key in schema.properties)) {
          errors.push({ path: childPath, message: 'required property is missing' });
        }
      }
    }
    if (schema.additionalProperties === false) {
      for (const key of Object.keys(obj)) {
        if (!(key in schema.properties)) {
          errors.push({ path: path ? `${path}.${key}` : key, message: 'additional property is not allowed' });
        }
      }
    }
  }

  if (schema.items && Array.isArray(value)) {
    const itemPath = path ? `${path}[]` : '[]';
    for (const item of value) walk(item, schema.items, itemPath, errors);
  }
}

function matchesType(value: unknown, type: string): boolean {
  switch (type) {
    case 'string':
      return typeof value === 'string';
    case 'number':
    case 'integer':
      return typeof value === 'number' && (type !== 'integer' || Number.isInteger(value));
    case 'boolean':
      return typeof value === 'boolean';
    case 'array':
      return Array.isArray(value);
    case 'object':
      return typeof value === 'object' && value !== null && !Array.isArray(value);
    case 'null':
      return value === null;
    default:
      return true; // unknown type names are not our business to reject
  }
}

function typeName(value: unknown): string {
  if (value === null) return 'null';
  if (Array.isArray(value)) return 'array';
  return typeof value;
}
