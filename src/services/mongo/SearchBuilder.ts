import {Collection, FilterQuery, SortOptionObject} from 'mongodb';
import {Attributes} from './metadata';
import {StringMap} from './mongo';
import {buildSearchResult, buildSort as bs, SearchResult} from './search';

export class SearchBuilder<T, S> {
  metadata?: Attributes;
  buildSort?: (s: string, m?: Attributes|StringMap) => SortOptionObject<T>;
  constructor(public collection: Collection,
    public buildQuery: (s: S, m?: Attributes) => FilterQuery<T>,
    metadata: Attributes,
    public sort?: string,
    buildSort?: (s: string, m?: Attributes|StringMap) => SortOptionObject<T>) {
      this.metadata = metadata;
      this.buildSort = (buildSort ? buildSort : bs);
      this.search = this.search.bind(this);
    }
  search(s: S, limit?: number, skip?: number, ctx?: any): Promise<SearchResult<T>> {
    const st = (this.sort ? this.sort : 'sort');
    const sn = s[st] as string;
    const so = this.buildSort(sn, this.metadata);
    delete s[st];
    const query = this.buildQuery(s, this.metadata);
    return buildSearchResult(this.collection, query, so, limit, skip);
  }
}
