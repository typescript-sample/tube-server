import {Collection, FilterQuery, SortOptionObject} from 'mongodb';
import {Attributes} from './metadata';
import {count, find, StringMap} from './mongo';

export interface SearchResult<T> {
  list: T[];
  total?: number;
  last?: boolean;
}
export function buildSearchResult<T>(collection: Collection, query: FilterQuery<T>, sort?: SortOptionObject<T>, limit?: number, skip?: number): Promise<SearchResult<T>> {
  if (limit) {
    if (!skip) {
      skip = 0;
    }
    const p1 = find(collection, query, sort, limit, skip);
    const p2 = count(collection, query);
    return Promise.all([p1, p2]).then(values => {
      const [list, total] = values;
      const r: SearchResult<T> = { list, total, last: skip + list.length >= total};
      return r;
    });
  } else {
    return find(collection, query, sort).then(list => {
      const r = {list};
      return r;
    });
  }
}
export function buildSort<T>(sort: string, map?: Attributes|StringMap): SortOptionObject<T> {
  const sort2 = {};
  if (sort && sort.length > 0) {
    const sorts = sort.split(',');
    for (const st of sorts) {
      if (st.length > 0) {
        let field = st;
        const tp = st.charAt(0);
        if (tp === '-' || tp === '+') {
          field = st.substr(1);
        }
        const sortType = (tp === '-' ? -1 : 1);
        sort2[getField(field.trim())] = sortType;
      }
    }
  }
  return sort2;
}
export function getField(name: string, map?: Attributes|StringMap): string {
  if (!map) {
    return name;
  }
  const x = map[name];
  if (!x) {
    return name;
  }
  if (typeof x === 'string') {
    return x;
  }
  if (x.field) {
    return x.field;
  }
  return name;
}
