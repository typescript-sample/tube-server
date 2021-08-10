import {Client , QueryOptions } from 'cassandra-driver';
import { handleResults, isEmpty, mapArray, metadata } from 'postgre';
import { CategoryClient, Channel, channelModel, ChannelSM, Item, ItemSM, ListResult, Playlist, playlistModel, PlaylistSM, PlaylistVideo, StringMap, Video, VideoCategory, videoModel, VideoService} from 'video-service';
import { buildFields } from '../sync/CassandraSyncRepository';

export interface CategoryCollection {
  id: string;
  data: VideoCategory[];
}

export class CassandraVideoService implements VideoService {
  private readonly client: Client;
  private readonly channelId = 'channelId';
  private readonly channelsTable: string;
  private readonly videosTable: string;
  private readonly playlistsTable: string;
  private readonly playlistVideoTable: string;
  private readonly categorisTable: string;
  channelFields: string[];
  channelMap: StringMap;
  playlistFields: string[];
  playlistMap: StringMap;
  videoFields: string[];
  videoMap: StringMap;
  constructor(db: Client, private categoryClient: CategoryClient, channelTable: string, channelSyncTable: string, playlistTable: string, playlistVideoTable: string, videoTable: string, categoryTable: string) {
    this.client = db;
    this.channelsTable = channelTable;
    this.videosTable = videoTable;
    this.playlistsTable = playlistTable;
    this.playlistVideoTable = playlistVideoTable;
    this.categorisTable = categoryTable;
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
  async getChannel(channelId: string , fields?: string[]): Promise<Channel> {
    const query = `select ${buildFields(fields, this.channelFields)} from ${this.channelsTable} where id = ?`;
    return this.client.execute(query, [channelId], { prepare: true }).then(result => {
      return handleResults(result.rows, this.channelMap)[0];
    }).catch(err => {
      return err;
    });
  }
  async getChannels(channelIds: string[], fields?: string[]): Promise<Channel[]> {
    const queryQuestion = [];
    channelIds.forEach(() => {
      queryQuestion.push('?');
    });
    const query = `select ${buildFields(fields, this.channelFields)} from ${this.channelsTable} where id in (${queryQuestion.join()})`;
    return this.client.execute(query , channelIds , { prepare: true }).then((result) => {
      return handleResults(result.rows, this.channelMap);
    }).catch(err => {
      console.log(err);
      return err;
    });
  }
  getPlaylist(id: string, fields?: string[]): Promise<Playlist> {
    const query = `select ${buildFields(fields, this.playlistFields)} from ${this.playlistsTable} where id = ?`;
    return this.client.execute(query, [id], { prepare: true }).then(result => {
      return handleResults(result.rows, this.playlistMap)[0];
    }).catch(err => {
      return err;
    });
  }
  async getPlaylists(ids: string[], fields?: string[]): Promise<Playlist[]> {
    const queryQuestion = [];
    ids.forEach(() => {
      queryQuestion.push('?');
    });
    const query = `select ${buildFields(fields, this.playlistFields)} from ${this.playlistsTable} where id in (${queryQuestion.join()})`;
    return this.client.execute(query , ids , { prepare: true }).then((result) => {
      return handleResults(result.rows, this.playlistMap);
    }).catch(err => {
      console.log(err);
      return err;
    });
  }
  async getVideo(id: string, fields?: string[], noSnippet?: boolean): Promise<Video> {
    const query = `select ${buildFields(fields, this.videoFields)} from ${this.videosTable} where id = ?`;
    return this.client.execute(query, [id], { prepare: true }).then(result => {
      return handleResults(result.rows, this.videoMap)[0];
    }).catch(err => {
      return err;
    });
  }
  async getVideos(ids: string[], fields?: string[], noSnippet?: boolean): Promise<Video[]> {
    const queryQuestion = [];
    ids.forEach(() => {
      queryQuestion.push('?');
    });
    const query = `select ${buildFields(fields, this.videoFields)} from ${this.videosTable} where id in (${queryQuestion.join()})`;
    return this.client.execute(query, ids, { prepare: true }).then(result => {
      return handleResults(result.rows, this.videoMap);
    }).catch(err => {
      return err;
    });
  }
  async getChannelPlaylists(channelId: string, max?: number, nextPageToken?: string, fields?: string[]): Promise<ListResult<Playlist>> {
    max = getLimit(max);
    const next = getSkipString(nextPageToken);
    const options = getOption(next, max);
    const sort = [{field: `publishedat`, reverse: true}];
    const must = [{type: 'match', field: `${this.channelId.toLowerCase()}`, value: `${channelId}`}];
    const a = {
      filter: {
        must,
      },
      sort
    };
    const queryObj = JSON.stringify(a);
    const query = `select ${buildFields(fields, this.videoFields)} from ${this.playlistsTable} where expr(playlist_index, '${queryObj}')`;
    return this.client.execute(query, undefined, options ).then((result) => {
      return {
        list: mapArray(result.rows, this.playlistMap),
        nextPageToken: getNextPageTokenString(result.rows, max, result.pageState),
      };
    }).catch((err) => {
      console.log(err);
      return err;
    });
  }
  async getPlaylistVideos(playlistId: string, max?: number, nextPageToken?: string, fields?: string[]): Promise<ListResult<PlaylistVideo>> {
    const limit = getLimit(max);
    const skip = getSkipNumber(nextPageToken);
    const query = `select videos from ${this.playlistVideoTable} where id = ? `;
    return this.client.execute(query, [playlistId], { prepare: true }).then((playlist) => {
      let checkNext = false;
      if (skip + limit === playlist.rows[0].videos.length) {
        checkNext = true;
      }
      const ids = playlist.rows[0].videos.slice(skip, skip + limit);
      const queryQuestion = [];
      ids.forEach(() => {
        queryQuestion.push('?');
      });
      const sql = `select ${buildFields(fields, this.videoFields)} from ${this.videosTable} where id in (${queryQuestion.join()})`;
      return this.client.execute(sql, ids, { prepare: true }).then(result => {
        return handleResults(result.rows, this.videoMap);
      });
    }).catch(err => {
      return err;
    });
  }
  search(sm: ItemSM, max?: number, nextPageToken?: string, fields?: string[]): Promise<ListResult<Item>> {
    const limit = getLimit(max);
    const next = getSkipString(nextPageToken);
    const options = getOption(next, limit);
    const objQuery = buildSearchQuery(sm, this.videosTable, 'video_index', fields, this.videoFields);
    return this.client.execute(objQuery.query, undefined, options ).then((result) => {
      return {
        list: mapArray(result.rows, this.videoMap),
        nextPageToken: getNextPageTokenString(result.rows, max, result.pageState),
      };
    }).catch((err) => {
      console.log(err);
      return err;
    });
  }
  searchVideos(sm: ItemSM, max?: number, nextPageToken?: string, fields?: string[]): Promise<ListResult<Item>> {
    const limit = getLimit(max);
    const next = getSkipString(nextPageToken);
    const options = getOption(next, limit);
    const objQuery = buildSearchQuery(sm, this.videosTable, 'video_index', fields, this.videoFields);
    return this.client.execute(objQuery.query, undefined, options ).then((result) => {
      return {
        list: mapArray(result.rows, this.videoMap),
        nextPageToken: getNextPageTokenString(result.rows, max, result.pageState),
      };
    }).catch((err) => {
      console.log(err);
      return err;
    });
  }
  searchPlaylists(sm: PlaylistSM, max?: number, nextPageToken?: string , fields?: string[]): Promise<ListResult<Playlist>> {
    max = getLimit(max);
    const next = getSkipString(nextPageToken);
    const options = getOption(next, max);
    const objQuery = buildSearchQuery(sm, this.playlistsTable, 'playlist_index', fields, this.playlistFields);
    return this.client.execute(objQuery.query, undefined, options ).then((result) => {
      return {
        list: mapArray(result.rows, this.playlistMap),
        nextPageToken: getNextPageTokenString(result.rows, max, result.pageState),
      };
    }).catch((err) => {
      console.log(err);
      return err;
    });
  }
  searchChannels(sm: ChannelSM, max?: number, nextPageToken?: string , fields?: string[]): Promise<ListResult<Channel>> {
    max = getLimit(max);
    const next = getSkipString(nextPageToken);
    const options = getOption(next, max);
    const objQuery = buildSearchQuery(sm, this.channelsTable, 'channel_index', fields, this.channelFields);
    return this.client.execute(objQuery.query, undefined, options ).then((result) => {
      return {
        list: mapArray(result.rows, this.channelMap),
        nextPageToken: getNextPageTokenString(result.rows, max, result.pageState),
      };
    }).catch((err) => {
      console.log(err);
      return err;
    });
  }
  getRelatedVideos(videoId: string, max?: number, nextPageToken?: string, fields?: string[]): Promise<ListResult<Item>> {
    max = getLimit(max);
    const next = getSkipString(nextPageToken);
    const options = getOption(next, max);
    return this.getVideo(videoId).then((video) => {
      if (!video) {
        const r: ListResult<Item> = { list: [] };
        return Promise.resolve(r);
      } else {
        const should = video.tags.map(item => ({type: 'contains', field: 'tags', values: item}));
        const not = [{type: 'match', field: 'id', value: videoId}];
        const sort = [{field: `publishedat`, reverse: true}];
        const queryObj = `{filter: [{should:${JSON.stringify(should)}} ${not.length > 0 ? `,{not:${JSON.stringify(not)}}` : ''}] ${sort.length > 0 ? `,sort: ${JSON.stringify(sort)}` : ''}}`;
        const query = `select ${buildFields(fields, this.videoFields)} from ${this.videosTable} where expr(video_index, '${queryObj}')`;
        return this.client.execute(query, undefined, options ).then((result) => {
          return {
            list: mapArray(result.rows, this.videoMap),
            nextPageToken: getNextPageTokenString(result.rows, max, result.pageState),
          };
        }).catch((err) => {
          console.log(err);
          return err;
        });
      }
    });
  }
  getPopularVideos(regionCode?: string, videoCategoryId?: string, max?: number, nextPageToken?: string, fields?: string[]): Promise<ListResult<Video>> {
    max = getLimit(max);
    const next = getSkipString(nextPageToken);
    const options = getOption(next, max);
    const sort = [{field: `publishedat`, reverse: true}];
    const queryObj = `{${sort.length > 0 ? `sort: ${JSON.stringify(sort)}` : ''}}`;
    const query = `select ${buildFields(fields, this.videoFields)} from ${this.videosTable} where expr(video_index, '${queryObj}')`;
    return this.client.execute(query, undefined, options ).then((result) => {
      return {
        list: mapArray(result.rows, this.videoMap),
        nextPageToken: getNextPageTokenString(result.rows, max, result.pageState),
      };
    }).catch((err) => {
        console.log(err);
        return err;
    });
  }
  getPopularVideosByCategory(videoCategoryId?: string, max?: number, nextPageToken?: string, fields?: string[]): Promise<ListResult<Video>> {
    max = getLimit(max);
    const next = getSkipString(nextPageToken);
    const options = getOption(next, max);
    const should = [{type: 'match', field: 'categoryid', value: videoCategoryId}];
    const sort = [{field: `publishedat`, reverse: true}];
    const queryObj = `{filter: [{should:${JSON.stringify(should)}}] ${sort.length > 0 ? `,sort: ${JSON.stringify(sort)}` : ''}}`;
    const query = `select ${buildFields(fields, this.videoFields)} from ${this.videosTable} where expr(video_index, '${queryObj}')`;
    return this.client.execute(query, undefined, options ).then((result) => {
      return {
        list: mapArray(result.rows, this.videoMap),
        nextPageToken: getNextPageTokenString(result.rows, max, result.pageState),
      };
    }).catch((err) => {
      console.log(err);
      return err;
    });
  }
  getPopularVideosByRegion(regionCode?: string, max?: number, nextPageToken?: string, fields?: string[]): Promise<ListResult<Video>> {
    max = getLimit(max);
    const next = getSkipString(nextPageToken);
    const options = getOption(next, max);
    const sort = [{field: `publishedat`, reverse: true}];
    const not = [{type: 'contains', field: 'blockedregions', values: [regionCode]}];
    let a: any;
    if (regionCode) {
      a = {
        filter: {
          not,
        },
        sort
      };
    } else {
      a = {
        sort
      };
    }
    const queryObj = JSON.stringify(a);
    const query = `select ${buildFields(fields, this.videoFields)} from ${this.videosTable} where expr(video_index, '${queryObj}')`;
    return this.client.execute(query, undefined, options ).then((result) => {
      return {
        list: mapArray(result.rows, this.videoMap),
        nextPageToken: getNextPageTokenString(result.rows, max, result.pageState),
      };
    }).catch((err) => {
      console.log(err);
      return err;
    });
  }
  getCagetories(regionCode: string): Promise<VideoCategory[]> {
    const query = `select * from ${this.categorisTable} where id = ?`;
    return this.client.execute(query, [regionCode], {prepare: true}).then((category) => {
      if (category.rows[0]) {
        return category.rows[0];
      } else {
        return this.categoryClient.getCagetories(regionCode).then((r) => {
          const categoryToSave: VideoCategory[] = r.filter((item) => item.assignable === true);
          const newCategoryCollection: CategoryCollection = {
            id: regionCode,
            data: categoryToSave,
          };
          const sql = `INSERT INTO ${this.categorisTable} (id,data) VALUES (?,?)`;
          const queries = {
            query: sql,
            params: newCategoryCollection
          };
          return this.client.batch([queries], { prepare: true }).then(() => {
            return newCategoryCollection;
          }).catch((err) => {
            console.log(err);
            return err;
          });
        });
      }
    }).catch(err => {
      console.log(err);
      return err;
    });
  }
  async getChannelVideos(channelId: string, max: number, nextPageToken?: string, fields?: string[]): Promise<ListResult<PlaylistVideo>> {
    max = getLimit(max);
    const next = getSkipString(nextPageToken);
    const options = getOption(next, max);
    const should = [{type: 'match', field: 'channelid', value: channelId}];
    const sort = [{field: `publishedat`, reverse: true}];
    const queryObj = `{filter: [{should:${JSON.stringify(should)}}] ${sort.length > 0 ? `,sort: ${JSON.stringify(sort)}` : ''}}`;
    const query = `select ${buildFields(fields, this.videoFields)} from ${this.videosTable} where expr(video_index, '${queryObj}')`;
    return this.client.execute(query, undefined, options ).then((result) => {
      return {
        list: mapArray(result.rows, this.videoMap),
        nextPageToken: getNextPageTokenString(result.rows, max, result.pageState),
      };
    }).catch((err) => {
      console.log(err);
      return err;
    });
  }
}

export function getNextPageTokenNumber<T>(list: T[], limit: number, skip: number, name?: string): string {
  if (!name || name.length === 0) {
    name = 'id';
  }
  if (list && list.length < limit) {
    return undefined;
  } else {
    return list && list.length > 1 ? `${list[list.length - 1][name]}|${skip + limit}` : undefined;
  }
}
export function getNextPageTokenString<T>(list: T[], limit: number, next: string, name?: string): string {
  if (!name || name.length === 0) {
    name = 'id';
  }
  if (list && list.length < limit) {
    return undefined;
  } else {
    return list && list.length > 0 ? `${list[list.length - 1][name]}|${next}` : undefined;
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
export function getSkipNumber(nextPageToken: string): number {
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
export function getSkipString(nextPageToken: string): string {
  if (nextPageToken) {
    const arr = nextPageToken.toString().split('|');
    if (arr.length < 2) {
      return undefined;
    }
    return arr[1];
  }
  return '';
}
export function getOption(nextPageToken: string, max?: number): QueryOptions {
  let options: QueryOptions ;
  if (!nextPageToken) {
    options = { prepare: true , fetchSize: Number(max) };
  } else {
    options = { pageState: nextPageToken , prepare: true , fetchSize: Number(max) };
  }
  return options;
}
export function buildSearchQuery(s: any , tableName: string, index: string, fields?: string[], mapFields?: string[]): any {
  const arrayKeys = Object.keys(s);
  const arrayValues = Object.values(s);
  const should = [];
  const must = [];
  const not = [];
  const sort = [];
  arrayKeys.forEach((key, i) => {
    if (key === 'q') {
      should.push({type: 'phrase', field: 'title', value: `${s.q}`});
      should.push({type: 'prefix', field: 'title', value: `${s.q}`});
      should.push({type: 'wildcard', field: 'title', value: `*${s.q}`});
      should.push({type: 'wildcard', field: 'title', value: `${s.q}*`});
      should.push({type: 'wildcard', field: 'title', value: `*${s.q}*`});
      should.push({type: 'phrase', field: 'description', value: `${s.q}`});
      should.push({type: 'prefix', field: 'description', value: `${s.q}`});
      should.push({type: 'wildcard', field: 'description', value: `*${s.q}`});
      should.push({type: 'wildcard', field: 'description', value: `${s.q}*`});
      should.push({type: 'wildcard', field: 'description', value: `*${s.q}*`});
    } else if (key === 'duration') {
      switch (s.videoDuration) {
        case 'short':
          must.push({type: 'range', field: 'duration', lower: '0', upper: '240'});
          break;
        case 'medium':
          must.push({type: 'range', field: 'duration', lower: '240', upper: '1200'});
          break;
        case 'long':
          must.push({type: 'range', field: 'duration', lower: '1200'});
          break;
        default:
          break;
      }
    } else if (key === 'publishedAfter' || key === 'publishedBefore') {
      if (s.publishedBefore && s.publishedAfter) {
        must.push({type: 'range', field: 'publishedat', lower: s.publishedBefore.toISOString().replace('T', ' '), upper: s.publishedAfter.toISOString().replace('T', ' ')});
      } else if ( s.publishedAfter) {
        must.push({type: 'range', field: 'publishedat', upper: s.publishedAfter.toISOString().replace('T', ' ')});
      } else if (s.publishedBefore) {
        must.push({type: 'range', field: 'publishedat', lower: s.publishedAfter.toISOString().replace('T', ' ')});
      }
    } else if (key === 'regionCode') {
      if (!isEmpty(s.regionCode)) {
        not.push({type: 'contains', field: 'blockedregions', values: [s.regionCode]});
      }
    } else if (key === 'sort') {
      if ( s.sort) {
        sort.push({field: `${s.sort.toLowerCase()}`, reverse: true});
      }
    } else if (key === 'channelId') {
      if ( arrayValues[i]) {
        tableName === 'channel' ? must.push({type: 'match', field: 'id', value: `${arrayValues[i]}`}) : must.push({type: 'match', field: `${key.toLowerCase()}`, value: `${arrayValues[i]}`});
      }
    } else {
      if (arrayValues[i]) {
       must.push({type: 'match', field: `${key.toLowerCase()}`, value: `${arrayValues[i]}`});
      }
    }
  });
  const a = {
    filter: {
      should,
      must,
      not,
    },
    sort
  };
  if (should.length === 0) {
    delete a.filter.should;
  }
  if (must.length === 0) {
    delete a.filter.must;
  }
  if (not.length === 0) {
    delete a.filter.not;
  }
  if (sort.length === 0) {
    delete a.sort;
  }
  const queryObj = JSON.stringify(a);
  const query = `select ${buildFields(fields, mapFields)} from ${tableName} where expr(${index}, '${queryObj}')`;
  return {
    query,
    params: queryObj,
  };
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
