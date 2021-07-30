import { Pool, PoolClient } from 'pg';
import { buildFields, exec, getMapField, isEmpty, params, query, queryOne, Statement } from 'postgre';
import { Channel, channelFields, channelMap, ChannelSM, Item, ItemSM, ListResult, Playlist, playlistFields, playlistMap, PlaylistSM, PlaylistVideo, StringMap, Video, VideoCategory, videoFields, videoMap, VideoService} from 'video-service';

export function buildQueryUpsert(tableName: string, listFields: string[]): string {
  const listValues = listFields.map((item, index) => `$${index + 1}`);
  const queryUpdate = listFields.map((item, index) => `${item} = $${index + 1}`);
  return `INSERT INTO ${tableName}(${listFields.join()})VALUES (${listValues.join()}) ON CONFLICT (id) DO UPDATE SET ${queryUpdate.slice(1, queryUpdate.length).join()}`;
}
export interface CategoryCollection {
  id: string;
  data: VideoCategory[];
}
export class PostgreTubeService implements VideoService {
  protected client: PoolClient;
  constructor(pool: Pool, private clientCagetories: (regionCode?: string) => Promise<VideoCategory[]>) {
    pool.connect().then(client => this.client = client);
  }
  getChannel(id: string, fields?: string[]): Promise<Channel> {
    if (!id || id.length === 0) {
      return Promise.resolve(null);
    }
    const q = `select ${buildFields(fields, channelFields)} from channel where id = $1`;
    return queryOne<Channel>(this.client, q, [id], channelMap);
  }
  getChannels(ids: string[], fields?: string[]): Promise<Channel[]> {
    if (!ids || ids.length === 0) {
      return Promise.resolve([]);
    }
    const ps = params(ids.length);
    const q = `select ${buildFields(fields, channelFields)} from channel where id in (${ps.join(',')})`;
    return query<Channel>(this.client, q, ids, channelMap);
  }
  getPlaylist(id: string, fields?: string[]): Promise<Playlist> {
    if (!id || id.length === 0) {
      return Promise.resolve(null);
    }
    const q = `select ${buildFields(fields, playlistFields)} from playlist where id = $1`;
    return queryOne<Playlist>(this.client, q, [id], playlistMap);
  }
  getPlaylists(ids: string[], fields?: string[]): Promise<Playlist[]> {
    if (!ids || ids.length === 0) {
      return Promise.resolve([]);
    }
    const ps = params(ids.length);
    const q = `select ${buildFields(fields, playlistFields)} from playlist where id in (${ps.join(',')})`;
    return query<Playlist>(this.client, q, ids, playlistMap);
  }
  getVideo(videoId: string, fields?: string[]): Promise<Video> {
    const q = `select ${buildFields(fields, videoFields)} from video where id = $1`;
    return queryOne<Video>(this.client, q, [videoId], videoMap);
  }
  getVideos(videoIds: string[], fields?: string[]): Promise<Video[]> {
    const strVideoIds = videoIds.map(id => `'${id}'`).join();
    const q = `select ${buildFields(fields, videoFields)} from video where id in (${strVideoIds})`;
    return query<Video>(this.client, q, undefined, videoMap);
  }
  getChannelPlaylists(channelId: string, limit?: number, nextPageToken?: string, fields?: string[]): Promise<ListResult<Playlist>> {
    const skip = getSkip(nextPageToken);
    limit = getLimit(limit);
    const q = `select ${buildFields(fields, playlistFields)} from playlist where channelId=$1 order by publishedAt desc ${limit} offset ${skip}`;
    return query<Playlist>(this.client, q, [channelId], playlistMap).then(results => {
      return {
        list : results,
        nextPageToken: getNextPageToken(results, limit, skip),
      };
    });
  }
  getPlaylistVideos(playlistId: string, limit?: number, nextPageToken?: string, fields?: string[]): Promise<ListResult<PlaylistVideo>> {
    const skip = getSkip(nextPageToken);
    limit = getLimit(limit);
    const queryFilter = `select videos from playlistvideo where id = $1`;
    return queryOne(this.client, queryFilter, [playlistId]).then(results => {
      const listVideoIds = results['videos'].map(video => `'${video}'`).toString();
      const q = `select ${buildFields(fields, videoFields)} from video where id in (${listVideoIds}) order by publishedAt desc ${limit} offset ${skip}`;
      return query<Playlist>(this.client, q, [], videoMap).then(videos => {
        return {
          list: videos,
          nextPageToken: getNextPageToken(videos, limit, skip),
        };
      });
    });
  }
  getChannelVideos(channelId: string, limit?: number, nextPageToken?: string, fields?: string[]): Promise<ListResult<PlaylistVideo>> {
    const skip = getSkip(nextPageToken);
    limit = getLimit(limit);
    const q = `select ${buildFields(fields, videoFields)} from video where channelId=$1 order by publishedAt desc ${limit} offset ${skip}`;
    return query<PlaylistVideo>(this.client, q, [channelId], videoMap).then(results => {
      return {
        list : results,
        nextPageToken: getNextPageToken(results, limit, skip),
      };
    });
  }
  getCagetories(regionCode: string): Promise<VideoCategory[]> {
    const q = `select * from category where id = $1`;
    return queryOne<CategoryCollection>(this.client, q, [regionCode]).then(category => {
      if (category) {
        return category.data;
      } else {
        return this.clientCagetories(regionCode).then(async (r) => {
          const categoryToSave: VideoCategory[] = r.filter((item) => item.assignable === true);
          const newCategoryCollection: CategoryCollection = {
            id: regionCode,
            data: categoryToSave,
          };
          const fields = Object.keys(newCategoryCollection);
          const values = Object.values(newCategoryCollection);
          const querySaveCategory = buildQueryUpsert('category', fields);
          await exec(this.client, querySaveCategory, values);
          return categoryToSave;
        });
      }
    });
  }
  search(itemSM: ItemSM, limit?: number, nextPageToken?: string, fields?: string[]): Promise<ListResult<Item>> {
    limit = getLimit(limit);
    const skip = getSkip(nextPageToken);
    const map: StringMap = {
      date: 'publishedAt',
      relevance: 'publishedAt',
      rating: 'publishedAt',
    };
    itemSM.sort = itemSM.sort ? getMapField(itemSM.sort, map) as any : undefined;
    const q = buildVideoQuery(itemSM, fields);
    return query<Item>(this.client, q.query, q.args.concat([limit, skip]), videoMap).then(results => {
      return { list : results, nextPageToken: getNextPageToken(results, limit, skip)};
    }).catch(e => {
      console.log(e);
      return e;
    });
  }
  searchVideos(itemSM: ItemSM, limit?: number, nextPageToken?: string, fields?: string[]): Promise<ListResult<Item>> {
    limit = getLimit(limit);
    const skip = getSkip(nextPageToken);
    const map: StringMap = {
      date: 'publishedAt',
      relevance: 'publishedAt',
      rating: 'publishedAt',
    };
    itemSM.sort = itemSM.sort ? getMapField(itemSM.sort, map) as any : undefined;
    const sql = buildVideoQuery(itemSM, fields);
    sql.query = sql.query + ` limit ${limit} offset ${skip}`;
    return query<Item>(this.client, sql.query, sql.args, videoMap).then(results => {
      return { list : results, nextPageToken: getNextPageToken(results, limit, skip) };
    })
    .catch(e => {
      console.log(e);
      return e;
    });
  }
  searchPlaylists(playlistSM: PlaylistSM, limit?: number, nextPageToken?: string, fields?: string[]): Promise<ListResult<Playlist>> {
    limit = getLimit(limit);
    const skip = getSkip(nextPageToken);
    const map: StringMap = {
      date: 'publishedAt',
      relevance: 'publishedAt',
      rating: 'publishedAt',
    };
    playlistSM.sort = playlistSM.sort ? getMapField(playlistSM.sort, map) as any : undefined;
    const sql = buildPlaylistQuery(playlistSM, fields);
    sql.query = sql.query + ` limit ${limit} offset ${skip}`;
    console.log(sql.query);
    return query<Playlist>(this.client, sql.query, sql.args, playlistMap).then(results => {
      return { list : results, nextPageToken: getNextPageToken(results, limit, skip) };
    });
  }
  searchChannels(channelSM: ChannelSM, limit?: number, nextPageToken?: string, fields?: string[]): Promise<ListResult<Channel>> {
    limit = getLimit(limit);
    const skip = getSkip(nextPageToken);
    const map: StringMap = {
      date: 'publishedAt',
      relevance: 'publishedAt',
      rating: 'publishedAt',
      viewCount: 'playlistVideoItemCount',
    };
    channelSM.sort = channelSM.sort ? getMapField(channelSM.sort, map) as any : undefined;
    const sql = buildChannelQuery(channelSM, fields);
    sql.query = sql.query + ` limit ${limit} offset ${skip}`;
    return query<Channel>(this.client, sql.query, sql.args, channelMap).then(results => {
      return { list : results, nextPageToken: getNextPageToken(results, limit, skip) };
    });
  }
  getRelatedVideos(videoId: string, limit?: number, nextPageToken?: string, fields?: string[]): Promise<ListResult<Item>> {
    limit = getLimit(limit);
    const skip = getSkip(nextPageToken);
    return this.getVideo(videoId).then(video => {
      if (!video) {
        const r: ListResult<Item> = { list: [] };
        return Promise.resolve(r);
      } else {
        const sql = `select ${buildFields(fields, videoFields)} from video where id not in ($1) and $2 && tags ${limit} offset ${skip}`;
        return query<Item>(this.client, sql, [videoId, video.tags], videoMap).then(list => {
          return { list, nextPageToken: getNextPageToken(list, limit, skip) };
        });
      }
    });
  }
  getPopularVideos(regionCode: string, videoCategoryId: string, limit?: number, nextPageToken?: string, fields?: string[]): Promise<ListResult<Video>> {
    limit = getLimit(limit);
    const skip = getSkip(nextPageToken);
    const sql = `select ${buildFields(fields, videoFields)} from video order by publishedat desc ${limit} offset ${skip}`;
    return query<Video>(this.client, sql, [], videoMap ).then(list => {
      return { list, nextPageToken: getNextPageToken(list, limit, skip) };
    });
  }
  getPopularVideosByCategory(categoryId: string, limit?: number, nextPageToken?: string, fields?: string[]): Promise<ListResult<Video>> {
    limit = getLimit(limit);
    const skip = getSkip(nextPageToken);
    const sql = `select ${buildFields(fields, videoFields)} from video where categoryId = $1 order by publishedAt desc ${limit} offset ${skip}`;
    return query<Video>(this.client, sql, [categoryId], videoMap ).then(list => {
      return {
        list,
        nextPageToken: getNextPageToken(list, limit, skip)
      };
    });
  }
  getPopularVideosByRegion(regionCode: string, limit?: number, nextPageToken?: string, fields?: string[]): Promise<ListResult<Video>> {
    limit = getLimit(limit);
    const skip = getSkip(nextPageToken);
    const sql = `select ${buildFields(fields, videoFields)} from where video (blockedRegions is null or $1 != all(blockedRegions)) order by publishedAt desc ${limit} offset ${skip}`;
    return query<Video>(this.client, sql, [regionCode], videoMap ).then(list => {
      return { list, nextPageToken: getNextPageToken(list, limit, skip)};
    });
  }
}
export function getNextPageToken<T>(list: T[], limit: number, skip: number, name?: string): string {
  if (!name || name.length === 0) {
    name = 'id';
  }
  if (list && list.length < limit) {
    return undefined;
  } else {
    return list && list.length > 0 ? `${list[list.length - 1][name]}|${skip + limit}` : undefined;
  }
}
export function getLimit(limit?: number, d?: number): number {
  if (limit) {
    return limit;
  }
  if (d && d > 0) {
    return d;
  }
  return 12;
}
export function getSkip(nextPageToken: string): number {
  if (nextPageToken) {
    const arr = nextPageToken.toString().split('|');
    if (arr.length < 2) {
      return undefined;
    }
    if (isNaN(arr[1] as any)) {
      return 0;
    }
    const n = parseFloat(arr[1]);
    const s = n.toFixed(0);
    return parseFloat(s);
  }
  return 0;
}
export function buildVideoQuery(s: ItemSM, fields?: string[]): Statement {
  let sql = `select ${buildFields(fields, videoFields)} from video`;
  const condition = [];
  const args = [];
  let i = 1;
  if (s.publishedAfter) {
    args.push(s.publishedAfter);
    condition.push(`(publishedAt <= $${i++})`);
  }
  if (s.publishedBefore) {
    args.push(s.publishedBefore);
    condition.push(`(publishedAt > $${i++})`);
  }
  if (!isEmpty(s.regionCode)) {
    args.push(s.regionCode);
    condition.push(`(blockedRegions is null or $${i++} != all(blockedRegions))`);
  }
  if (!isEmpty(s.duration)) {
    switch (s.duration) {
      case 'short':
        condition.push(`duration <= 240`);
        break;
      case 'medium':
        condition.push(`(duration > 240 and duration <= 1200)`);
        break;
      case 'long':
        condition.push(`(duration > 1200)`);
        break;
      default:
        break;
    }
  }
  if (!isEmpty(s.q)) {
    const q = `%${s.q}%`;
    condition.push(`(title ilike $${i++} or description ilike $${i++})`);
    args.push(q);
    args.push(q);
  }
  if (condition.length > 0) {
    const cond = condition.join(' and ');
    sql += ` where ${cond}`;
  }
  if (s.sort && s.sort.length > 0) {
    sql += ` order by ${s.sort} desc`;
  }
  return { query: sql, args };
}
export function buildPlaylistQuery(s: PlaylistSM, fields?: string[]): Statement {
  let sql = `select ${buildFields(fields, playlistFields)} from playlist`;
  const condition = [];
  const args = [];
  let i = 1;
  if (!isEmpty(s.channelId)) {
    args.push(s.channelId);
    condition.push(`channelId = $${i++}`);
  }
  if (s.publishedAfter) {
    args.push(s.publishedAfter);
    condition.push(`publishedAt <= $${i++}`);
  }
  if (s.publishedBefore) {
    args.push(s.publishedBefore);
    condition.push(`publishedAt > $${i++}`);
  }
  if (!isEmpty(s.q)) {
    const q = `%${s.q}%`;
    condition.push(`(title ilike $${i++} or description ilike $${i++})`);
    args.push(q);
    args.push(q);
  }
  // if (!isEmpty(s.channelType)) {
  //   // query.channelType = s.channelType;
  //   args.push(s.channelId);
  //   condition.push(`(channeld = $${args.length})`)
  // }
  // if (!isEmpty(s.regionCode)) {
  //   query.country = s.regionCode;
  // }
  // if (!isEmpty(s.relevanceLanguage)) {
  //   query.relevanceLanguage = s.relevanceLanguage;
  // }
  if (condition.length > 0) {
    const cond = condition.join(' and ');
    sql += ` where ${cond}`;
  }
  if (s.sort && s.sort.length > 0) {
    sql += ` order by ${s.sort} desc`;
  }
  return { query: sql, args };
}
export function buildChannelQuery(s: ChannelSM, fields?: string[]): Statement {
  let sql = `select ${buildFields(fields, channelFields)} from channel`;
  const condition = [];
  const args = [];
  let i = 1;
  if (!isEmpty(s.channelId)) {
    args.push(s.channelId);
    condition.push(`id = $${i++}`);
  }
  if (!isEmpty(s.regionCode)) {
    args.push(s.regionCode);
    condition.push(`country = $${i++}`);
  }
  if (s.publishedAfter) {
    args.push(s.publishedAfter);
    condition.push(`publishedAt <= $${i++}`);
  }
  if (s.publishedBefore) {
    args.push(s.publishedBefore);
    condition.push(`publishedAt > $${i++}`);
  }
  if (!isEmpty(s.q)) {
    const q = `%${s.q}%`;
    condition.push(`(title ilike $${i++} or description ilike $${i++})`);
    args.push(q);
    args.push(q);
  }
  // if (!isEmpty(s.channelType)) {
  //   query.channelType = s.channelType;
  // }
  // if (!isEmpty(s.topicId)) {
  //   query.topicId = s.topicId;
  // }
  // if (!isEmpty(s.relevanceLanguage)) {
  //   query.relevanceLanguage = s.relevanceLanguage;
  // }
  if (condition.length > 0) {
    const cond = condition.join(' and ');
    sql += ` where ${cond}`;
  }
  if (s.sort && s.sort.length > 0) {
    sql += ` order by ${s.sort} desc`;
  }
  return { query: sql, args };
}
