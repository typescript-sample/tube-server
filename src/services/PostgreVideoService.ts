import { Pool, PoolClient } from 'pg';
import { buildFields, exec, getMapField, isEmpty, metadata, params, query, queryOne, Statement } from 'postgre';
import { Channel, channelModel, ChannelSM, getLimit, Item, ItemSM, ListResult, Playlist, playlistModel, PlaylistSM, PlaylistVideo, StringMap, Video, VideoCategory, videoModel, VideoService } from '../../video-services';

export interface CategoryCollection {
  id: string;
  data: VideoCategory[];
}
export class PostgreTubeService implements VideoService {
  protected client: PoolClient;
  channelFields: string[];
  channelMap: StringMap;
  playlistFields: string[];
  playlistMap: StringMap;
  videoFields: string[];
  videoMap: StringMap;
  constructor(pool: Pool, private clientCagetories: (regionCode?: string) => Promise<VideoCategory[]>) {
    pool.connect().then(client => this.client = client);
    const channelMeta = metadata(channelModel.attributes);
    this.channelFields = channelMeta.fields;
    this.channelMap = channelMeta.map;
    const playlistMeta = metadata(playlistModel.attributes);
    this.playlistFields = playlistMeta.fields;
    this.playlistMap = playlistMeta.map;
    const videoMeta = metadata(videoModel.attributes);
    this.videoFields = videoMeta.fields;
    this.videoMap = videoMeta.map;
  }
  getChannel(id: string, fields?: string[]): Promise<Channel> {
    if (!id || id.length === 0) {
      return Promise.resolve(null);
    }
    const q = `select ${buildFields(fields, this.channelFields)} from channel where id = $1`;
    return queryOne<Channel>(this.client, q, [id], this.channelMap).then((r) => {
      const ids = r.channels;
      if (!ids || ids.length === 0) {
        delete r['channels'];
        return r;
      } else {
        return this.getChannels(ids as any).then((r2) => {
          if (!r2 || r2.length === 0) {
            delete r['channels'];
            return r;
          } else {
            r.channels = r2;
            return r;
          }
        });
      }
    });
  }
  getChannels(ids: string[], fields?: string[]): Promise<Channel[]> {
    if (!ids || ids.length === 0) {
      return Promise.resolve([]);
    }
    const ps = params(ids.length);
    const q = `select ${buildFields(fields, this.channelFields)} from channel where id in (${ps.join(',')})`;
    return query<Channel>(this.client, q, ids, this.channelMap);
  }
  getPlaylist(id: string, fields?: string[]): Promise<Playlist> {
    if (!id || id.length === 0) {
      return Promise.resolve(null);
    }
    const q = `select ${buildFields(fields, this.playlistFields)} from playlist where id = $1`;
    return queryOne<Playlist>(this.client, q, [id], this.playlistMap);
  }
  getPlaylists(ids: string[], fields?: string[]): Promise<Playlist[]> {
    if (!ids || ids.length === 0) {
      return Promise.resolve([]);
    }
    const ps = params(ids.length);
    const q = `select ${buildFields(fields, this.playlistFields)} from playlist where id in (${ps.join(',')})`;
    return query<Playlist>(this.client, q, ids, this.playlistMap);
  }
  getVideo(videoId: string, fields?: string[]): Promise<Video> {
    const q = `select ${buildFields(fields, this.videoFields)} from video where id = $1`;
    return queryOne<Video>(this.client, q, [videoId], this.videoMap);
  }
  getVideos(ids: string[], fields?: string[]): Promise<Video[]> {
    if (!ids || ids.length === 0) {
      return Promise.resolve([]);
    }
    const ps = params(ids.length);
    const q = `select ${buildFields(fields, this.videoFields)} from video where id in (${ps.join(',')})`;
    return query<Video>(this.client, q, ids, this.videoMap);
  }
  getChannelPlaylists(channelId: string, limit?: number, nextPageToken?: string, fields?: string[]): Promise<ListResult<Playlist>> {
    const skip = getSkip(nextPageToken);
    limit = getLimit(limit);
    const q = `select ${buildFields(fields, this.playlistFields)} from playlist where channelId=$1 order by publishedAt desc limit ${limit} offset ${skip}`;
    return query<Playlist>(this.client, q, [channelId], this.playlistMap).then(results => {
      return { list : results, nextPageToken: getNextPageToken(results, limit, skip) };
    });
  }
  getPlaylistVideos(playlistId: string, limit?: number, nextPageToken?: string, fields?: string[]): Promise<ListResult<PlaylistVideo>> {
    const skip = getSkip(nextPageToken);
    limit = getLimit(limit);
    const queryFilter = `select videos from playlistvideo where id = $1`;
    return queryOne(this.client, queryFilter, [playlistId]).then(results => {
      const listVideoIds = results['videos'].map(video => `'${video}'`).toString();
      const q = `select ${buildFields(fields, this.videoFields)} from video where id in (${listVideoIds}) order by publishedAt desc limit ${limit} offset ${skip}`;
      return query<Playlist>(this.client, q, [], this.videoMap).then(videos => {
        return { list: videos, nextPageToken: getNextPageToken(videos, limit, skip) };
      });
    });
  }
  getChannelVideos(channelId: string, limit?: number, nextPageToken?: string, fields?: string[]): Promise<ListResult<PlaylistVideo>> {
    const skip = getSkip(nextPageToken);
    limit = getLimit(limit);
    const q = `select ${buildFields(fields, this.videoFields)} from video where channelId=$1 order by publishedAt desc limit ${limit} offset ${skip}`;
    return query<PlaylistVideo>(this.client, q, [channelId], this.videoMap).then(results => {
      return { list : results, nextPageToken: getNextPageToken(results, limit, skip) };
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
          const newCategoryCollection: CategoryCollection = { id: regionCode, data: categoryToSave };
          const fields = Object.keys(newCategoryCollection);
          const values = Object.values(newCategoryCollection);
          const sql = `insert into category(${fields.join()}) values ($1, $2) on conflict (id) do update set data = $2`;
          await exec(this.client, sql, values);
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
    return query<Item>(this.client, q.query, q.params.concat([limit, skip]), this.videoMap).then(results => {
      return { list : results, nextPageToken: getNextPageToken(results, limit, skip)};
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
    const q = buildVideoQuery(itemSM, fields, this.videoFields);
    q.query = q.query + ` limit ${limit} offset ${skip}`;
    return query<Item>(this.client, q.query, q.params, this.videoMap).then(results => {
      return { list : results, nextPageToken: getNextPageToken(results, limit, skip) };
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
    const q = buildPlaylistQuery(playlistSM, fields, this.playlistFields);
    q.query = q.query + ` limit ${limit} offset ${skip}`;
    return query<Playlist>(this.client, q.query, q.params, this.playlistMap).then(results => {
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
    const q = buildChannelQuery(channelSM, fields, this.channelFields);
    q.query = q.query + ` limit ${limit} offset ${skip}`;
    return query<Channel>(this.client, q.query, q.params, this.channelMap).then(results => {
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
        const q = `select ${buildFields(fields, this.videoFields)} from video where id not in ($1) and $2 && tags limit ${limit} offset ${skip}`;
        return query<Item>(this.client, q, [videoId, video.tags], this.videoMap).then(list => {
          return { list, nextPageToken: getNextPageToken(list, limit, skip) };
        });
      }
    });
  }
  getPopularVideos(regionCode: string, videoCategoryId: string, limit?: number, nextPageToken?: string, fields?: string[]): Promise<ListResult<Video>> {
    limit = getLimit(limit);
    const skip = getSkip(nextPageToken);
    let q = `select ${buildFields(fields, this.videoFields)} from video`;
    let condition = [];
    let args = []
    let i = 0;
    if(regionCode){
      condition.push(`(blockedRegions is null or $${++i} != all(blockedRegions))`);
      args.push(regionCode);
    }
    if(videoCategoryId){
      condition.push(`(categoryId = $${++i})`);
      args.push(videoCategoryId);
    }
    if(condition && condition.length > 0){
      q += ` where ${condition.join(' and ')}`
    }
    q += ` order by publishedAt desc limit ${limit} offset ${skip}`;
    return query<Video>(this.client, q, args, this.videoMap ).then(list => {
      return { list, nextPageToken: getNextPageToken(list, limit, skip) };
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
export function buildVideoQuery(s: ItemSM, fields?: string[], videoFields?: string[]): Statement {
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
  return { query: sql, params: args };
}
export function buildPlaylistQuery(s: PlaylistSM, fields?: string[], playlistFields?: string[]): Statement {
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
  //   params.push(s.channelId);
  //   condition.push(`(channeld = $${params.length})`)
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
  return { query: sql, params: args };
}
export function buildChannelQuery(s: ChannelSM, fields?: string[], channelFields?: string[]): Statement {
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
  return { query: sql, params: args };
}
