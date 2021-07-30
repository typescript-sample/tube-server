import { Pool, PoolClient } from 'pg';
import { buildFields, execWithClient, getMapField, isEmpty, queryOneWithClient, queryWithClient, Statement } from 'postgre';
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
  getChannel(channelId: string, fields?: string[]): Promise<Channel> {
    const query = `select ${buildFields(fields, channelFields)} from channel where id = $1`;
    return queryOneWithClient<Channel>(this.client, query, [channelId], channelMap);
  }
  getChannels(channelIds: string[], fields?: string[]): Promise<Channel[]> {
    const strChannelIds = channelIds.map(id => `'${id}'`).join();
    const query = `select ${buildFields(fields, channelFields)} from channel where id in (${strChannelIds})`;
    return queryWithClient<Channel>(this.client, query, undefined, channelMap);
  }
  getPlaylist(playlistId: string, fields?: string[]): Promise<Playlist> {
    const query = `select ${buildFields(fields, playlistFields)} from playlist where id = $1`;
    return queryOneWithClient<Playlist>(this.client, query, [playlistId], playlistMap);
  }
  getPlaylists(playlistIds: string[], fields?: string[]): Promise<Playlist[]> {
    const strPlaylistIds = playlistIds.map(id => `'${id}'`).join();
    const query = `select ${buildFields(fields, playlistFields)} from playlist where id in (${strPlaylistIds})`;
    return queryWithClient<Playlist>(this.client, query, undefined, playlistMap);
  }
  getVideo(videoId: string, fields?: string[]): Promise<Video> {
    const query = `select ${buildFields(fields, videoFields)} from video where id = $1`;
    return queryOneWithClient<Video>(this.client, query, [videoId], videoMap);
  }
  getVideos(videoIds: string[], fields?: string[]): Promise<Video[]> {
    const strVideoIds = videoIds.map(id => `'${id}'`).join();
    const query = `select ${buildFields(fields, videoFields)} from video where id in (${strVideoIds})`;
    return queryWithClient<Video>(this.client, query, undefined, videoMap);
  }
  getChannelPlaylists(channelId: string, limit?: number, nextPageToken?: string, fields?: string[]): Promise<ListResult<Playlist>> {
    const skip = getSkip(nextPageToken);
    limit = getLimit(limit);
    const query = `select ${buildFields(fields, playlistFields)} from playlist where channelId=$1 order by publishedAt desc limit $2 offset $3`;
    return queryWithClient<Playlist>(this.client, query, [channelId, limit, skip], playlistMap).then(results => {
      return {
        list : results,
        nextPageToken: getNextPageToken(results, limit, skip),
      };
    });
  }
  getPlaylistVideos(playlistId: string, limit?: number, nextPageToken?: string, fields?: string[]): Promise<ListResult<PlaylistVideo>> {
    const skip = getSkip(nextPageToken);
    limit = getLimit(limit);
    const queryFilter = `select videos from playlist_video where id = $1`;
    return queryOneWithClient(this.client, queryFilter, [playlistId]).then(results => {
      const listVideoIds = results['videos'].map(video => `'${video}'`).toString();
      const query = `select ${buildFields(fields, videoFields)} from video where id in (${listVideoIds}) order by publishedAt desc limit $1 offset $2`;
      return queryWithClient<Playlist>(this.client, query, [limit, skip], videoMap).then(videos => {
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
    const query = `select ${buildFields(fields, videoFields)} from video where channelId=$1 order by publishedAt desc limit $2 offset $3`;
    return queryWithClient<PlaylistVideo>(this.client, query, [channelId, limit, skip], videoMap).then(results => {
      return {
        list : results,
        nextPageToken: getNextPageToken(results, limit, skip),
      };
    });
  }
  getCagetories(regionCode: string): Promise<VideoCategory[]> {
    const query = `select * from category where id = $1`;
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
    const query = buildVideoQuery(itemSM, fields);
    return queryWithClient<Item>(this.client, query.query, query.args.concat([limit, skip]), videoMap).then(results => {
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
    const query = buildVideoQuery(itemSM, fields);
    query.query = query.query + ` limit ${limit} offset ${skip}`;
    console.log(query.query);
    return queryWithClient<Item>(this.client, query.query, query.args, videoMap).then(results => {
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
    const query = buildPlaylistQuery(playlistSM, fields);
    query.query = query.query + ` limit ${limit} offset ${skip}`;
    console.log(query.query);
    return queryWithClient<Playlist>(this.client, query.query, query.args, playlistMap).then(results => {
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
    const query = buildChannelQuery(channelSM, fields);
    query.query = query.query + ` limit ${limit} offset ${skip}`;
    console.log(query.query);
    return queryWithClient<Channel>(this.client, query.query, query.args, channelMap).then(results => {
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
        const query = `select ${buildFields(fields, videoFields)} from video where id not in ($1) and $2 && tags limit $3 offset $4`;
        return queryWithClient<Item>(this.client, query, [videoId, video.tags, limit, skip], videoMap).then(list => {
          return { list, nextPageToken: getNextPageToken(list, limit, skip) };
        });
      }
    });
  }
  getPopularVideos(regionCode: string, videoCategoryId: string, limit?: number, nextPageToken?: string, fields?: string[]): Promise<ListResult<Video>> {
    limit = getLimit(limit);
    const skip = getSkip(nextPageToken);
    const query = `select ${buildFields(fields, videoFields)} from video order by publishedat desc limit $1 offset $2`;
    return queryWithClient<Video>(this.client, query, [limit, skip], videoMap ).then(list => {
      return { list, nextPageToken: getNextPageToken(list, limit, skip) };
    });
  }
  getPopularVideosByCategory(categoryId: string, limit?: number, nextPageToken?: string, fields?: string[]): Promise<ListResult<Video>> {
    limit = getLimit(limit);
    const skip = getSkip(nextPageToken);
    const query = `select ${buildFields(fields, videoFields)} from video where categoryId = $1 order by publishedAt desc limit $2 offset $3`;
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
    const query = `select ${buildFields(fields, videoFields)} from where video (blockedRegions is null or $1 != all(blockedRegions)) order by publishedAt desc limit $2 offset $3`;
    return queryWithClient<Video>(this.client, query, [regionCode , limit, skip], videoMap ).then(list => {
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
  let query = `select ${buildFields(fields, videoFields)} from video`;
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
    query += ` where ${cond}`;
  }
  if (s.sort && s.sort.length > 0) {
    query += ` order by ${s.sort} desc`;
  }
  return {
    query,
    args
  };
}
export function buildPlaylistQuery(s: PlaylistSM, fields?: string[]): Statement {
  let query = `select ${buildFields(fields, playlistFields)} from playlist`;
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
  if (!isEmpty(s.q)) {
    const q = `%${s.q}%`;
    condition.push(`(title ilike $${i++} OR description ilike $${i++})`);
    args.push(q);
    args.push(q);
  }
  if (!isEmpty(s.channelId)) {
    args.push(s.channelId);
    condition.push(`(channelId = $${i++})`);
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
    query += ` where ${cond}`;
  }
  if (s.sort && s.sort.length > 0) {
    query += ` order by ${s.sort} desc`;
  }
  return {
    query,
    args
  };
}
export function buildChannelQuery(s: ChannelSM, fields?: string[]): Statement {
  let query = `select ${buildFields(fields, channelFields)} from channel`;
  const condition = [];
  const args = [];
  let i = 1;
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
  if (!isEmpty(s.channelId)) {
    args.push(s.channelId);
    condition.push(`(id = $${i++})`);
  }
  console.log('Done', s.regionCode);
  if (!isEmpty(s.regionCode)) {
    args.push(s.regionCode);
    condition.push(`country = $${i++}`);
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
    query += ` where ${cond}`;
  }
  if (s.sort && s.sort.length > 0) {
    query += ` order by ${s.sort} desc`;
  }
  return { query, args };
}
