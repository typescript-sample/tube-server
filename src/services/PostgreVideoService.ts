import { PoolClient } from "pg";
import { pool } from "../sync/PostgreSyncRepository";
import {
  Channel,
  channelFields,
  channelMap,
  ChannelSM,
  Item,
  ItemSM,
  ListResult,
  Playlist,
  playlistFields,
  playlistMap,
  PlaylistSM,
  PlaylistVideo,
  StringMap,
  Video,
  VideoCategory,
  videoFields,
  videoMap,
  VideoService,
} from "video-service";
import { buildQueryUpsert, CategoryCollection, execWithClient, queryOneWithClient, queryWithClient, Statement } from "./postgresql";

export class PostgreTubeService implements VideoService {
  protected client : PoolClient;
  constructor(private clientCagetories: (regionCode?: string) => Promise<VideoCategory[]>) {
    pool.connect().then(client => this.client = client);
  }
  getChannel(channelId: string, fields?: string[]): Promise<Channel> {
    const query = `SELECT ${buildFields(fields,channelFields)} FROM channel WHERE id = $1`;
    return queryOneWithClient<Channel>(this.client, query, [channelId], channelMap);
  }
  getChannels(channelIds: string[], fields?: string[]): Promise<Channel[]> {
    const strChannelIds = channelIds.map(id => `'${id}'`).join();
    const query = `SELECT ${buildFields(fields,channelFields)} FROM channel WHERE id IN (${strChannelIds})`;
    return queryWithClient<Channel>(this.client, query, undefined, channelMap);
  }
  getPlaylist(playlistId: string, fields?: string[]): Promise<Playlist> {
    const query = `SELECT ${buildFields(fields,playlistFields)} FROM playlist WHERE id = $1`;
    return queryOneWithClient<Playlist>(this.client, query, [playlistId], playlistMap);
  }
  getPlaylists(playlistIds: string[], fields?: string[]): Promise<Playlist[]> {
    const strPlaylistIds = playlistIds.map(id => `'${id}'`).join();
    const query = `SELECT ${buildFields(fields,playlistFields)} FROM playlist WHERE id IN (${strPlaylistIds})`;
    return queryWithClient<Playlist>(this.client, query, undefined, playlistMap);
  }
  getVideo(videoId: string, fields?: string[]): Promise<Video> {
    const query = `SELECT ${buildFields(fields,videoFields)} FROM video WHERE id = $1`;
    return queryOneWithClient<Video>(this.client, query, [videoId], videoMap);
  }
  getVideos(videoIds: string[], fields?: string[]): Promise<Video[]>{
    const strVideoIds = videoIds.map(id => `'${id}'`).join();
    const query = `SELECT ${buildFields(fields,videoFields)} FROM video WHERE id IN (${strVideoIds})`;
    return queryWithClient<Video>(this.client, query, undefined, videoMap);
  }
  getChannelPlaylists(channelId: string, limit?: number, nextPageToken?: string, fields?: string[]): Promise<ListResult<Playlist>> {
    const skip = getSkip(nextPageToken);
    limit = getLimit(limit); 
    const query = `SELECT ${buildFields(fields,playlistFields)} FROM playlist WHERE channelid=$1ORDER BY publishedat DESC LIMIT $2 OFFSET $3`;
    return queryWithClient<Playlist>(this.client, query, [channelId, limit, skip], playlistMap).then(results => {
      return {
        list : results,
        nextPageToken: getNextPageToken(results, limit, skip),
      }
    });
  }
  getPlaylistVideos(playlistId: string, limit?: number, nextPageToken?: string, fields?: string[]): Promise<ListResult<PlaylistVideo>>{
    const skip = getSkip(nextPageToken);
    limit = getLimit(limit); 
    const queryFilter = `SELECT videos FROM playlist_video WHERE id = $1`;
    return queryOneWithClient(this.client, queryFilter, [playlistId]).then(results => {
      const listVideoIds = results["videos"].map(video => `'${video}'`).toString();
      const query = `SELECT ${buildFields(fields,videoFields)} FROM video WHERE id IN (${listVideoIds}) ORDER BY publishedat DESC LIMIT $1 OFFSET $2`;
      return queryWithClient<Playlist>(this.client, query, [limit, skip], videoMap).then(results => {
        return {
          list: results,
          nextPageToken: getNextPageToken(results, limit, skip),
        };
      });
    });
  }
  getChannelVideos(channelId: string, limit?: number, nextPageToken?: string, fields?: string[]): Promise<ListResult<PlaylistVideo>>{
    const skip = getSkip(nextPageToken);
    limit = getLimit(limit); 
    const query = `SELECT ${buildFields(fields,videoFields)} FROM video WHERE channelid=$1 ORDER BY publishedat DESC LIMIT $2 OFFSET $3`;
    return queryWithClient<PlaylistVideo>(this.client, query, [channelId, limit, skip], videoMap).then(results => {
      return {
        list : results,
        nextPageToken: getNextPageToken(results, limit, skip),
      }
    });
  }
  getCagetories(regionCode: string): Promise<VideoCategory[]> {
    const query = `SELECT * FROM category WHERE id = $1`;
    return queryOneWithClient<CategoryCollection>(this.client, query, [regionCode]).then(category => {
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
          await execWithClient(this.client, querySaveCategory, values);
          return categoryToSave;
        });
      }
    })
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
    const query = buildVideoQuery(itemSM, fields);
    return queryWithClient<Item>(this.client, query.query, query.args.concat([limit,skip]), videoMap).then(results => {
      return {
        list : results,
        nextPageToken: getNextPageToken(results, limit, skip),
      }
    })
    .catch(e =>{
      console.log(e);
      return e;
    });
  }
  searchVideos(itemSM: ItemSM, limit?: number, nextPageToken?: string, fields?: string[]): Promise<ListResult<Item>>{
    limit = getLimit(limit);
    const skip = getSkip(nextPageToken);
    const map: StringMap = {
      date: 'publishedAt',
      relevance: 'publishedAt',
      rating: 'publishedAt',
    };
    itemSM.sort = itemSM.sort ? getMapField(itemSM.sort, map) as any : undefined;
    const query = buildVideoQuery(itemSM, fields);
    return queryWithClient<Item>(this.client, query.query, query.args.concat([limit,skip]), videoMap).then(results => {
      return {
        list : results,
        nextPageToken: getNextPageToken(results, limit, skip),
      }
    })
    .catch(e =>{
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
    playlistSM.sort = playlistSM.sort ? getMapField(playlistSM.sort, map) as any: undefined;
    const query = buildPlaylistQuery(playlistSM, fields);
    return queryWithClient<Playlist>(this.client, query.query, query.args.concat([limit,skip]), playlistMap).then(results => {
      return {
        list : results,
        nextPageToken: getNextPageToken(results, limit, skip),
      }
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
    const query = buildChannelQuery(channelSM, fields);
    return queryWithClient<Channel>(this.client, query.query, query.args.concat([limit,skip]), channelMap).then(results => {
      return {
        list : results,
        nextPageToken: getNextPageToken(results, limit, skip),
      }
    });
  }
  getRelatedVideos(videoId: string, limit?: number, nextPageToken?: string, fields?: string[]): Promise<ListResult<Item>>{
    limit = getLimit(limit);
    const skip = getSkip(nextPageToken);
    return this.getVideo(videoId).then(video => {
      if (!video) {
        const r: ListResult<Item> = { list: [] };
        return Promise.resolve(r);
      }
      else{
        const query = `SELECT ${buildFields(fields,videoFields)} FROM video WHERE id NOT IN ($1) AND $2 && tags LIMIT $3 OFFSET $4`;
        return queryWithClient<Item>(this.client, query, [videoId,video.tags, limit, skip], videoMap).then(list =>{
          return {
            list,
            nextPageToken: getNextPageToken(list, limit, skip)
          }
        })
      }
    })
  }
  getPopularVideos(regionCode: string, videoCategoryId: string, limit?: number, nextPageToken?: string, fields?: string[]): Promise<ListResult<Video>> {
    limit = getLimit(limit);
    const skip = getSkip(nextPageToken);
    const query = `SELECT ${buildFields(fields,videoFields)} FROM video ORDER BY publishedat DESC LIMIT $1 OFFSET $2`
    return queryWithClient<Video>(this.client, query, [limit, skip], videoMap ).then(list => {
      return {
        list,
        nextPageToken: getNextPageToken(list, limit, skip)
      };
    });
  }
  getPopularVideosByCategory(categoryId: string, limit?: number, nextPageToken?: string, fields?: string[]): Promise<ListResult<Video>> {
    limit = getLimit(limit);
    const skip = getSkip(nextPageToken);
    const query = `SELECT ${buildFields(fields,videoFields)} FROM video WHERE categoryid = $1 ORDER BY publishedat DESC LIMIT $2 OFFSET $3`
    return queryWithClient<Video>(this.client, query, [categoryId, limit, skip], videoMap ).then(list => {
      return {
        list,
        nextPageToken: getNextPageToken(list, limit, skip)
      };
    });
  }
  getPopularVideosByRegion(regionCode: string, limit?: number, nextPageToken?: string, fields?: string[]): Promise<ListResult<Video>> {
    limit = getLimit(limit);
    const skip = getSkip(nextPageToken);
    const query = `SELECT ${buildFields(fields,videoFields)} FROM WHERE video (blockedregions is null OR $1 != ALL(blockedregions)) ORDER BY publishedat DESC LIMIT $2 OFFSET $3`
    return queryWithClient<Video>(this.client, query, [regionCode ,limit, skip], videoMap ).then(list => {
      return {
        list,
        nextPageToken: getNextPageToken(list, limit, skip)
      };
    });
  }
}
export function getNextPageToken<T>(list: T[], limit: number, skip: number, name?: string): string {
  if (!name || name.length === 0) {
    name = "id";
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
    const arr = nextPageToken.toString().split("|");
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
export function getFields<T>(fields: string[], all?: string[]): string[] {
  if (!fields || fields.length === 0) {
    return undefined;
  }
  const existFields : string [] = []; 
  if (all) {
    for (const s of fields) {
      if (all.includes(s)) {
        existFields.push(s);
      }
    }
    if(existFields.length === 0){
      return undefined;
    }else{
      return existFields;
    }
  } 
  else {
    return fields;
  }
}
export function buildFields<T>(fields: string[], all?: string[]): string {
  const s = getFields(fields,all);
  if(!s || s.length === 0){
    return '*';
  }else{
    return s.join();
  }
}
export function mapArray<T>(results: T[], m?: StringMap): T[] {
  if (!m) {
    return results;
  }
  const objs = [];
  const length = results.length;
  for (let i = 0; i < length; i++) {
    const obj = results[i];
    const obj2: any = {};
    const keys = Object.keys(obj);
    for (const key of keys) {
      let k0 = m[key];
      if (!k0) {
        k0 = key;
      }
      obj2[k0] = obj[key];
    }
    objs.push(obj2);
  }
  return objs;
}
export function getMapField(name: string, map?: StringMap): string {
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
  return name;
}
export function isEmpty(s: string): boolean {
  return !(s && s.length > 0);
}
export function buildVideoQuery(s: ItemSM, fields?: string[]): Statement{
  let query = `SELECT ${buildFields(fields, videoFields)} FROM video`; 
  let condition = [];
  let args = [];
  s.sort
  if (!isEmpty(s.duration)) {
    switch (s.duration) {
      case 'short':
        condition.push(`(duration > 0 AND duration <=240 )`);
        break;
      case 'medium':
        condition.push(`(duration > 240 AND duration <= 1200)`);
        break;
      case 'long':
        condition.push(`(duration > 1200)`);
        break;
      default:
        break;
    }
  }
  if (s.publishedBefore && s.publishedAfter) {
    args.push(s.publishedBefore, s.publishedAfter);
    condition.push(`(publishedat > $${args.length-1} AND publishedat <= $${args.length})`);
  } else if (s.publishedAfter) {
    args.push(s.publishedAfter);
    condition.push(`(publishedat <= $${args.length})`);
  } else if (s.publishedBefore) {
    args.push(s.publishedBefore);
    condition.push(`(publishedat > $${args.length})`);
  }
  if (!isEmpty(s.regionCode)) {
    args.push(s.regionCode);
    condition.push(`(blockedregions is null OR $${args.length} != ALL(blockedregions))`)
  }
  if (!isEmpty(s.q)) {
    condition.push(`(title ilike '%${s.q}%' OR description ilike '%${s.q}%')`);
  }
  if(condition.length > 0){
    let cond = condition.join(' AND ');
    query += ` WHERE ${cond}`;
  }
  if(s.sort && s.sort.length > 0){
    query += ` ORDER BY ${s.sort} DESC`;
  }
  query += ` LIMIT $${args.length+1} OFFSET $${args.length+2}`
  return {
    query,
    args
  };
}
export function buildPlaylistQuery(s: PlaylistSM, fields?: string[]): Statement{
  let query = `SELECT ${buildFields(fields, playlistFields)} FROM playlist`; 
  let condition = [];
  let args = [];
  if (!isEmpty(s.q)) {
    condition.push(`(title ilike '%${s.q}%' OR description ilike '%${s.q}%')`);
  }
  if (s.publishedBefore && s.publishedAfter) {
    args.push(s.publishedBefore, s.publishedAfter);
    condition.push(`(publishedat > $${args.length-1} AND publishedat <= $${args.length})`);
  } else if (s.publishedAfter) {
    args.push(s.publishedAfter);
    condition.push(`(publishedat <= $${args.length})`);
  } else if (s.publishedBefore) {
    args.push(s.publishedBefore);
    condition.push(`(publishedat > $${args.length})`);
  }
  if (!isEmpty(s.channelId)) {
    args.push(s.channelId);
    condition.push(`(channelid = $${args.length})`)
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
  if(condition.length > 0){
    let cond = condition.join(' AND ');
    query += ` WHERE ${cond}`;
  }
  if(s.sort && s.sort.length > 0){
    query += ` ORDER BY ${s.sort} DESC`;
  }
  query += ` LIMIT $${args.length+1} OFFSET $${args.length+2}`
  return {
    query,
    args
  };
}
export function buildChannelQuery(s: ChannelSM, fields?: string[]): Statement{
  let query = `SELECT ${buildFields(fields, channelFields)} FROM channel`; 
  let condition = [];
  let args = [];
  if (!isEmpty(s.q)) {
    condition.push(`(title ilike '%${s.q}%' OR description ilike '%${s.q}%')`);
  }
  if (s.publishedBefore && s.publishedAfter) {
    args.push(s.publishedBefore, s.publishedAfter);
    condition.push(`(publishedat > $${args.length-1} AND publishedat <= $${args.length})`);
  } else if (s.publishedAfter) {
    args.push(s.publishedAfter);
    condition.push(`(publishedat <= $${args.length})`);
  } else if (s.publishedBefore) {
    args.push(s.publishedBefore);
    condition.push(`(publishedat > $${args.length})`);
  }
  if (!isEmpty(s.channelId)) {
    args.push(s.channelId);
    condition.push(`(id = $${args.length})`)
  }
  if (!isEmpty(s.regionCode)) {
    args.push(s.regionCode);
    condition.push(`(country = $${args.length})`)
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
  if(condition.length > 0){
    let cond = condition.join(' AND ');
    query += ` WHERE ${cond}`;
  }
  if(s.sort && s.sort.length > 0){
    query += ` ORDER BY ${s.sort} DESC`;
  }
  query += ` LIMIT $${args.length+1} OFFSET $${args.length+2}`
  return {
    query,
    args
  };
}
