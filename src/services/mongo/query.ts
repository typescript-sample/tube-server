import {FilterQuery} from 'mongodb';
import {Attribute, Attributes} from './metadata';

export function buildQuery<T, S>(s: S, attrs?: Attributes): FilterQuery<T> {
  const a = new Array<[string, [any, any][]]>();
  const b = new Array<[any, any]>();
  const keys = Object.keys(s);
  for (const key of keys) {
    const v = s[key];
    let field = key;
    if (v) {
      if (attrs) {
        const attr: Attribute = attrs[key];
        if (attr) {
          field = (attr.field ? attr.field : key);
          if (typeof v === 'object') {
            if (attr.type === 'date' && isDateRange(v) ) {
              if (v['endDate'] && v['startDate']) {
                b['$lte'] = new Date(v['endDate']);
                b['$gte'] = new Date(v['startDate']);
              } else if (v['endDate']) {
                b['$lte'] = new Date(v['endDate']);
              } else if (v['startDate']) {
                b['$gte'] = new Date(v['startDate']);
              }
              const json1 = Object.assign({}, b);
              a[field] = json1;
            } else if (attr.type === 'ObjectId') {
              a[field] = v;
            }
          } else if (typeof v === 'string' && v.length > 0) {
            a[field] = buildMatch(v, attr.match);
          }
        } else if (typeof v === 'string' && v.length > 0) {
          a[field] = buildMatch(v, '');
        }
      } else if (typeof v === 'string' && v.length > 0) {
        a[field] = buildMatch(v, '');
      }
    }
  }
  const json: any = Object.assign({}, a);
  return json;
}
export function buildMatch(v: string, match: string): string|RegExp {
  if (match === 'equal') {
    return v;
  } else if (match === 'prefix') {
    return new RegExp(`^${v}`);
  } else {
    return new RegExp(`\\w*${v}\\w*`);
  }
}
export function isDateRange(obj: any): boolean {
  if (!obj.startDate && !obj.endDate) {
    return false;
  } else {
    return true;
  }
}
