import { buildFields, handleResults, isEmpty, mapArray, metadata, params, query, queryOne, Statement } from 'cassandra-core';
import { Client , QueryOptions } from 'cassandra-driver';
import { CategoryClient, Channel, channelModel, ChannelSM, getLimit, Item, ItemSM, ListResult, Playlist, playlistModel, PlaylistSM, PlaylistVideo, StringMap, Video, VideoCategory, videoModel, VideoService } from 'video-service';

export interface CategoryCollection {
  id: string;
  data: VideoCategory[];
}

export class CassandraVideoService implements VideoService {
  private readonly client: Client;
  private readonly channelId = 'channelId';
  channelFields: string[];
  channelMap: StringMap;
  playlistFields: string[];
  playlistMap: StringMap;
  videoFields: string[];
  videoMap: StringMap;
  constructor(db: Client, private categoryClient: CategoryClient) {
    this.client = db;
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
  getChannel(channelId: string , fields?: string[]): Promise<Channel> {
    const sql = `select ${buildFields(fields, this.channelFields)} from channel where id = ?`;
    return queryOne(this.client, sql, [channelId], this.channelMap);
  }
  getChannels(channelIds: string[], fields?: string[]): Promise<Channel[]> {
    if (!channelIds || channelIds.length <= 0) {
      return Promise.resolve([]);
    } else {
      const ps = params(channelIds.length);
      const s = `select ${buildFields(fields, this.channelFields)} from channel where id in (${ps.join(',')})`;
      return query<Channel>(this.client, s, channelIds).then(r => {
        return mapArray(r, this.channelMap);
      });
    }
  }
  getPlaylists(ids: string[], fields?: string[]): Promise<Playlist[]> {
    if (!ids || ids.length <= 0) {
      return Promise.resolve([]);
    } else {
      const ps = params(ids.length);
      const s = `select ${buildFields(fields, this.playlistFields)} from playlist where id in (${ps.join(',')})`;
      return query<Playlist>(this.client, s, ids).then(r => {
        return mapArray(r, this.playlistMap);
      });
    }
  }
  getPlaylist(id: string, fields?: string[]): Promise<Playlist> {
    const sql = `select ${buildFields(fields, this.playlistFields)} from playlist where id = ?`;
    return queryOne(this.client, sql, [id], this.playlistMap);
  }
  getChannelPlaylists(channelId: string, max?: number, nextPageToken?: string, fields?: string[]): Promise<ListResult<Playlist>> {
    max = getLimit(max);
    const options = getOption(nextPageToken, max);
    const sort = [{field: `publishedat`, reverse: true}];
    const must = [{type: 'match', field: `${this.channelId.toLowerCase()}`, value: `${channelId}`}];
    const a = {
      filter: {
        must,
      },
      sort
    };
    const queryObj = JSON.stringify(a);
    const sql = `select ${buildFields(fields, this.videoFields)} from playlist where expr(playlist_index, '${queryObj}')`;
    return this.client.execute(sql, undefined, options ).then(result => {
      const res: ListResult<Playlist> = {
        list: mapArray(result.rows as any, this.playlistMap),
      };
      if (result.pageState) {
        res.nextPageToken = result.pageState;
      }
      return res;
    });
  }
  getVideo(id: string, fields?: string[]): Promise<Video> {
    const sql = `select ${buildFields(fields, this.videoFields)} from video where id = ?`;
    return queryOne(this.client, sql, [id], this.videoMap);
  }
  getVideos(ids: string[], fields?: string[]): Promise<Video[]> {
    if (!ids || ids.length <= 0) {
      return Promise.resolve([]);
    } else {
      const ps = params(ids.length);
      const s = `select ${buildFields(fields, this.videoFields)} from video where id in (${ps.join(',')})`;
      return query<Video>(this.client, s, ids).then(r => {
        return mapArray(r, this.videoMap);
      });
    }
  }
  getPlaylistVideos(playlistId: string, max?: number, nextPageToken?: string, fields?: string[]): Promise<ListResult<PlaylistVideo>> {
    const options = getOption(nextPageToken, max);
    const query0 = `select videos from playlistVideo where id = ? `;
    return this.client.execute(query0, [playlistId], { prepare: true }).then(playlist => {
      const ids = playlist.rows[0].videos;
      const queryQuestion = [];
      ids.forEach(() => {
        queryQuestion.push('?');
      });
      const query1 = `select ${buildFields(fields, this.videoFields)} from video where id in (${queryQuestion.join()})`;
      return this.client.execute(query1, ids, options).then(result => {
        const res: ListResult<PlaylistVideo> = {
          list: handleResults(result.rows as any, this.videoMap),
          total :  playlist.rows[0].videos.length,
        };
        if (result.pageState) {
          res.nextPageToken = result.pageState;
        }
        return res;
      });
    });
  }
  getChannelVideos(channelId: string, max: number, nextPageToken?: string, fields?: string[]): Promise<ListResult<PlaylistVideo>> {
    max = getLimit(max);
    const options = getOption(nextPageToken, max);
    const should = [{type: 'match', field: 'channelid', value: channelId}];
    const sort = [{field: `publishedat`, reverse: true}];
    const queryObj = `{filter: [{should:${JSON.stringify(should)}}] ${sort.length > 0 ? `,sort: ${JSON.stringify(sort)}` : ''}}`;
    const sql = `select ${buildFields(fields, this.videoFields)} from video where expr(video_index, '${queryObj}')`;
    return this.client.execute(sql, undefined, options ).then(result => {
      const res: ListResult<PlaylistVideo> = {
        list: mapArray<PlaylistVideo>(result.rows as any, this.videoMap),
        nextPageToken: result.pageState,
      };
      return res;
    });
  }
  getCagetories(regionCode: string): Promise<VideoCategory[]> {
    const query0 = `select * from category where id = ?`;
    return this.client.execute(query0, [regionCode], {prepare: true}).then(category => {
      if (category.rows[0]) {
        return Promise.resolve([]);
      } else {
        return this.categoryClient.getCagetories(regionCode).then(async (r) => {
          const categoryToSave: VideoCategory[] = r.filter((item) => item.assignable === true);
          const newCategoryCollection: CategoryCollection = {
            id: regionCode,
            data: categoryToSave,
          };
          const query1 = `insert into category (id,data) values (?,?)`;
          const queries = {
            query: query1,
            params: newCategoryCollection
          };
          return this.client.batch([queries], { prepare: true }).then(() => {
            return categoryToSave;
          });
        });
      }
    });
  }
  search(sm: ItemSM, max?: number, nextPageToken?: string, fields?: string[]): Promise<ListResult<Item>> {
    const limit = getLimit(max);
    const options = getOption(nextPageToken, limit);
    const objQuery = buildVideoQuery(sm, 'video', 'video_index', fields, this.videoFields);
    return this.client.execute(objQuery, undefined, options ).then(result => {
      const res: ListResult<Item> = {
        list: handleResults(result.rows as any, this.videoMap),
      };
      if (result.pageState) {
        res.nextPageToken = result.pageState;
      }
      return res;
    });
  }
  searchVideos(sm: ItemSM, max?: number, nextPageToken?: string, fields?: string[]): Promise<ListResult<Item>> {
    const limit = getLimit(max);
    const options = getOption(nextPageToken, limit);
    const objQuery = buildVideoQuery(sm, 'video', 'video_index', fields, this.videoFields);
    return this.client.execute(objQuery, undefined, options ).then(result => {
      const res: ListResult<Item> = {
        list: handleResults(result.rows as any, this.videoMap),
      };
      if (result.pageState) {
        res.nextPageToken = result.pageState;
      }
      return res;
    });
  }
  searchPlaylists(sm: PlaylistSM, max?: number, nextPageToken?: string , fields?: string[]): Promise<ListResult<Playlist>> {
    max = getLimit(max);
    const options = getOption(nextPageToken, max);
    const objQuery = buildPlaylistQuery(sm, ' playlist', fields, this.playlistFields);
    return this.client.execute(objQuery, undefined, options ).then(result => {
      const res: ListResult<Playlist> = {
        list: mapArray(result.rows as any, this.playlistMap),
      };
      if (result.pageState) {
        res.nextPageToken = result.pageState;
      }
      return res;
    });
  }
  searchChannels(sm: ChannelSM, max?: number, nextPageToken?: string , fields?: string[]): Promise<ListResult<Channel>> {
    max = getLimit(max);
    const options = getOption(nextPageToken, max);
    const objQuery = buildChannelQuery(sm, 'channel', fields, this.channelFields);
    return this.client.execute(objQuery, undefined, options ).then(result => {
      const res: ListResult<Channel> = {
        list: mapArray(result.rows as any, this.playlistMap),
      };
      if (result.pageState) {
        res.nextPageToken = result.pageState;
      }
      return res;
    });
  }
  getRelatedVideos(videoId: string, max?: number, nextPageToken?: string, fields?: string[]): Promise<ListResult<Item>> {
    max = getLimit(max);
    const options = getOption(nextPageToken, max);
    return this.getVideo(videoId).then(video => {
      if (!video) {
        const r: ListResult<Item> = { list: [] };
        return Promise.resolve(r);
      } else {
        const should = video.tags.map(item => ({type: 'contains', field: 'tags', values: item}));
        const not = [{type: 'match', field: 'id', value: videoId}];
        const sort = [{field: `publishedat`, reverse: true}];
        const queryObj = `{filter: [{should:${JSON.stringify(should)}} ${not.length > 0 ? `,{not:${JSON.stringify(not)}}` : ''}] ${sort.length > 0 ? `,sort: ${JSON.stringify(sort)}` : ''}}`;
        const sql = `select ${buildFields(fields, this.videoFields)} from video where expr(video_index, '${queryObj}')`;
        return this.client.execute(sql, undefined, options ).then(result => {
          const res: ListResult<Item> = {
            list: handleResults(result.rows as any, this.videoMap),
          };
          if (result.pageState) {
            res.nextPageToken = result.pageState;
          }
          return res;
        });
      }
    });
  }
  getPopularVideos(regionCode?: string, categoryId?: string, max?: number, nextPageToken?: string, fields?: string[]): Promise<ListResult<Video>> {
    max = getLimit(max);
    const options = getOption(nextPageToken, max);
    const not = [];
    const query1 = [];
    if (regionCode && regionCode.length > 0) {
      not.push({type: 'contains', field: 'blockedregions', values: [regionCode]});
    }
    if (categoryId && categoryId.length > 0) {
      query1.push({type: 'match', field: 'categoryId', values: categoryId});
    }
    const sort = [{field: `publishedat`, reverse: true}];
    const queryObj = {filter: { not }, query: query1, sort};
    if (not.length <= 0) { delete queryObj.filter; }
    if (query1.length <= 0) { delete queryObj.filter; }
    const query2 = `select ${buildFields(fields, this.videoFields)} from video where expr(video_index, '${queryObj}')`;
    return this.client.execute(query2, undefined, options ).then(result => {
      const res: ListResult<Video> = {
        list: handleResults(result.rows as any, this.videoMap),
      };
      if (result.pageState) {
        res.nextPageToken = result.pageState;
      }
      return res;
    });
  }
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
export function buildPlaylistQuery(s: PlaylistSM, tableName: string, fields?: string[], mapFields?: string[]): string {
  const should = [];
  const must = [];
  const not = [];
  const sort = [];
  if (!isEmpty(s.q)) {
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
  }
  if (s.publishedBefore && s.publishedAfter) {
    must.push({type: 'range', field: 'publishedat', lower: s.publishedBefore.toISOString().replace('T', ' '), upper: s.publishedAfter.toISOString().replace('T', ' ')});
  } else if ( s.publishedAfter) {
    must.push({type: 'range', field: 'publishedat', upper: s.publishedAfter.toISOString().replace('T', ' ')});
  } else if (s.publishedBefore) {
    must.push({type: 'range', field: 'publishedat', lower: s.publishedBefore.toISOString().replace('T', ' ')});
  }
  if (!isEmpty(s.channelId)) {
    must.push({type: 'match', field: `channelid`, value: `${s.channelId}`});
  }
  if (!isEmpty(s.channelType)) {
    must.push({type: 'match', field: `channeltype`, value: `${s.channelType}`});
  }
  if (!isEmpty(s.regionCode)) {
    must.push({type: 'match', field: `country`, value: `${s.regionCode}`});

  }
  if (!isEmpty(s.relevanceLanguage)) {
    must.push({type: 'match', field: `relevancelanguage`, value: `${s.relevanceLanguage}`});
  }

  if (!isEmpty(s.sort)) {
    sort.push({field: `${s.sort.toLowerCase()}`, reverse: true});
  }
  const a = {
    filter: {
      should,
      not,
    },
    query: {must},
    sort
  };
  if (should.length === 0 && not.length === 0) {
    delete a.filter;
  } else {
    if (should.length === 0) {
      delete a.filter.should;
    }
    if (not.length === 0) {
      delete a.filter.not;
    }
  }
  if (must.length === 0) {
    delete a.query;
  }
  if (sort.length === 0) {
    delete a.sort;
  }
  const queryObj = JSON.stringify(a);
  const sql = `select ${buildFields(fields, mapFields)} from ${tableName} where expr(playlist_index,'${queryObj}')`;
  return sql;
}
export function buildChannelQuery(s: ChannelSM, tableName: string, fields?: string[], mapFields?: string[]): string {
  const should = [];
  const must = [];
  const not = [];
  const sort = [];
  if (!isEmpty(s.q)) {
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
  }
  if (s.publishedBefore && s.publishedAfter) {
    must.push({type: 'range', field: 'publishedat', lower: s.publishedBefore.toISOString().replace('T', ' '), upper: s.publishedAfter.toISOString().replace('T', ' ')});
  } else if ( s.publishedAfter) {
    must.push({type: 'range', field: 'publishedat', upper: s.publishedAfter.toISOString().replace('T', ' ')});
  } else if (s.publishedBefore) {
    must.push({type: 'range', field: 'publishedat', lower: s.publishedBefore.toISOString().replace('T', ' ')});
  }
  if (!isEmpty(s.channelId)) {
    must.push({type: 'match', field: `id`, value: `${s.channelId}`});
  }
  if (!isEmpty(s.channelType)) {
    must.push({type: 'match', field: `channeltype`, value: `${s.channelType}`});
  }
  if (!isEmpty(s.topicId)) {
    must.push({type: 'match', field: `topicid`, value: `${s.topicId}`});
  }
  if (!isEmpty(s.regionCode)) {
    must.push({type: 'match', field: `country`, value: `${s.regionCode}`});

  }
  if (!isEmpty(s.relevanceLanguage)) {
    must.push({type: 'match', field: `relevancelanguage`, value: `${s.relevanceLanguage}`});
  }
  if (!isEmpty(s.sort)) {
    sort.push({field: `${s.sort.toLowerCase()}`, reverse: true});
  }
  const a = {
    filter: {
      should,
      not,
    },
    query: {must},
    sort
  };
  if (should.length === 0 && not.length === 0) {
    delete a.filter;
  } else {
    if (should.length === 0) {
      delete a.filter.should;
    }
    if (not.length === 0) {
      delete a.filter.not;
    }
  }
  if (must.length === 0) {
    delete a.query;
  }
  if (sort.length === 0) {
    delete a.sort;
  }
  const queryObj = JSON.stringify(a);
  const sql = `select ${buildFields(fields, mapFields)} from ${tableName} where expr(channel_index,'${queryObj}')`;
  return sql;
}
export function buildVideoQuery(s: ItemSM , tableName: string, index: string, fields?: string[], mapFields?: string[]): string {
  const should = [];
  const must = [];
  const not = [];
  const sort = [];
  if (!isEmpty(s.duration)) {
    switch (s.duration) {
      case 'short':
        must.push({type: 'range', field: 'duration', upper: '240'});
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
  }
  if (!isEmpty(s.q)) {
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
  }
  if (s.publishedBefore && s.publishedAfter) {
    must.push({type: 'range', field: 'publishedat', lower: s.publishedBefore.toISOString().replace('T', ' '), upper: s.publishedAfter.toISOString().replace('T', ' ')});
  } else if ( s.publishedAfter) {
    must.push({type: 'range', field: 'publishedat', upper: s.publishedAfter.toISOString().replace('T', ' ')});
  } else if (s.publishedBefore) {
    must.push({type: 'range', field: 'publishedat', lower: s.publishedBefore.toISOString().replace('T', ' ')});
  }
  if (!isEmpty(s.regionCode)) {
    not.push({type: 'contains', field: 'blockedregions', values: [s.regionCode]});
  }
  if (!isEmpty(s.sort)) {
    sort.push({field: `${s.sort.toLowerCase()}`, reverse: true});
  }
  const a = {
    filter: {
      should,
      not,
    },
    query: must,
    sort
  };
  if (should.length === 0 && not.length === 0) {
    delete a.filter;
  } else {
    if (should.length === 0) {
      delete a.filter.should;
    }
    if (not.length === 0) {
      delete a.filter.not;
    }
  }
  if (must.length === 0) {
    delete a.query;
  }
  if (sort.length === 0) {
    delete a.sort;
  }
  const queryObj = JSON.stringify(a);
  const sql = `select ${buildFields(fields, mapFields)} from ${tableName} where expr(${index}, '${queryObj}')`;
  return  sql;
}
