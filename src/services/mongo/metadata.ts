interface StringMap {
  [key: string]: string;
}
export type DataType = 'ObjectId' | 'date' | 'datetime' | 'time'
    | 'boolean' | 'number' | 'integer' | 'string' | 'text'
    | 'object' | 'array' | 'primitives' | 'binary';
export type FormatType = 'currency' | 'percentage' | 'email' | 'url' | 'phone' | 'fax' | 'ipv4' | 'ipv6';

export interface Model {
  name?: string;
  attributes: Attributes;
  source?: string;
  collection?: string;
  model?: any;
  schema?: any;
}
export interface Attribute {
  name?: string;
  field?: string;
  type?: DataType;
  format?: FormatType;
  required?: boolean;
  match?: string;
  defaultValue?: any;
  key?: boolean;
  unique?: boolean;
  noinsert?: boolean;
  noupdate?: boolean;
  nopatch?: boolean;
  version?: boolean;
  length?: number;
  min?: number;
  max?: number;
  gt?: number;
  lt?: number;
  precision?: number;
  scale?: number;
  exp?: RegExp|string;
  code?: string;
  noformat?: boolean;
  ignored?: boolean;
  jsonField?: string;
  link?: string;
  typeof?: Model;
}
export interface Attributes {
  [key: string]: Attribute;
}

export interface Metadata {
  id?: string;
  objectId?: boolean;
  map?: StringMap;
}
export function build(model?: Model): Metadata {
  const sub: Metadata = {id: 'id'};
  if (!model) {
    return sub;
  }
  const keys: string[] = Object.keys(model.attributes);
  for (const key of keys) {
    const attr: Attribute = model.attributes[key];
    if (attr) {
      if (attr.key === true) {
        const meta: Metadata = {id: key};
        meta.objectId = (attr.type === 'ObjectId' ? true : false);
        meta.map = buildMap(model);
        return meta;
      }
    }
  }
  return sub;
}
export function buildMap(model: Model): StringMap {
  const map: any = {};
  const keys: string[] = Object.keys(model.attributes);
  let c = 0;
  for (const key of keys) {
    const attr: Attribute = model.attributes[key];
    if (attr) {
      attr.name = key;
      if (attr.field && attr.field.length > 0 && attr.field !== key) {
        map[attr.field] = key;
        c = c + 1;
      }
    }
  }
  return (c > 0 ? map : undefined);
}
