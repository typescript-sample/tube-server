import {Comment, CommentSnippet, CommentThead, TopLevelCommentSnippet} from './comment';
import {BigThumbnail, CategorySnippet, Channel, ChannelDetail, ChannelSM, ChannelSnippet, Item, ItemSM, ListDetail, ListItem, ListResult, Playlist, PlaylistSM, PlaylistSnippet, PlaylistVideo, PlaylistVideoSnippet, SearchId, SearchSnippet, StringMap, Thumbnail, Title, Video, VideoCategory, VideoItemDetail, VideoSnippet, YoutubeListResult, YoutubeVideoDetail} from './models';
import {CommentOrder, HttpRequest, VideoService} from './service';
import {ChannelSync, getNewVideos, notIn, SyncClient, SyncRepository, SyncService} from './sync';
import {fromYoutubeCategories, fromYoutubeChannels, fromYoutubePlaylist, fromYoutubePlaylists, fromYoutubeSearch, fromYoutubeVideos, getYoutubeSort} from './youtube';
export * from './models';
export * from './comment';
export * from './service';
export * from './youtube';
export * from './sync';

export const channelMap: StringMap = {
  publishedat: 'publishedAt',
  customurl: 'customUrl',
  localizedtitle: 'localizedTitle',
  localizeddescription: 'localizedDescription',
  mediumthumbnail: 'mediumThumbnail',
  highthumbnail: 'highThumbnail',
  lastupload: 'lastUpload',
  itemcount: 'itemCount',
  playlistcount: 'playlistCount',
  playlistitemcount: 'playlistItemCount',
  playlistvideocount: 'playlistVideoCount',
  playlistvideoitemcount: 'playlistVideoItemCount',
};
export const playlistMap: StringMap = {
  publishedat: 'publishedAt',
  channelid: 'channelId',
  channeltitle: 'channelTitle',
  localizedtitle: 'localizedTitle',
  localizeddescription: 'localizedDescription',
  mediumthumbnail: 'mediumThumbnail',
  highthumbnail: 'highThumbnail',
  standardthumbnail: 'standardThumbnail',
  maxresthumbnail: 'maxresThumbnail',
};
export const videoMap: StringMap = {
  publishedat: 'publishedAt',
  categoryid: 'categoryId',
  channelid: 'channelId',
  channeltitle: 'channelTitle',
  localizedtitle: 'localizedTitle',
  localizeddescription: 'localizedDescription',
  mediumthumbnail: 'mediumThumbnail',
  highthumbnail: 'highThumbnail',
  standardthumbnail: 'standardThumbnail',
  maxresthumbnail: 'maxresThumbnail',
  defaultaudiolanguage: 'defaultAudioLanguage',
  defaultlanguage: 'defaultLanguage',
  licensedcontent: 'licensedContent',
  livebroadcastcontent: 'liveBroadcastContent',
  blockedregions: 'blockedRegions',
  allowedregions: 'allowedRegions'
};
export const playlistFields = ['id', 'channelId', 'channelTitle', 'description',
  'highThumbnail', 'localizedDescription', 'localizedTitle',
  'maxresThumbnail', 'mediumThumbnail', 'publishedAt', 'standardThumbnail',
  'thumbnail', 'title', 'count', 'itemCount'];
export const channelFields = ['id', 'count', 'country', 'lastUpload', 'customUrl', 'description',
  'favorites', 'highThumbnail', 'itemCount', 'likes', 'localizedDescription', 'localizedTitle',
  'mediumThumbnail', 'publishedat', 'thumbnail', 'title', 'uploads',
  'count', 'itemCount', 'playlistCount', 'playlistItemCount', 'playlistVideoCount', 'playlistVideoItemCount'
];
export const videoFields = [
  'id', 'caption', 'categoryId', 'channelId', 'channelTitle', 'defaultAudioLanguage',
  'defaultLanguage', 'definition', 'description', 'dimension', 'duration', 'highThumbnail',
  'licensedContent', 'liveBroadcastContent', 'localizedDescription', 'localizedTitle', 'maxresThumbnail',
  'mediumThumbnail', 'projection', 'publishedAt', 'standardThumbnail', 'tags', 'thumbnail', 'title', 'blockedRegions', 'allowedRegions'
];
export function isEmpty(s: string): boolean {
  return !(s && s.length > 0);
}
export function getFields(fields: string[], all?: string[]): string[] {
  if (!fields || fields.length === 0) {
    return undefined;
  }
  const existFields: string[] = [];
  if (all) {
    for (const s of fields) {
      if (all.includes(s)) {
        existFields.push(s);
      }
    }
    if (existFields.length === 0) {
      return undefined;
    } else {
      return existFields;
    }
  } else {
    return fields;
  }
}
export function getLimit(limit?: number, d?: number): number {
  if (limit) {
    return limit;
  }
  if (d && d > 0) {
    return d;
  }
  return 48;
}
export function map<T>(obj: T, m?: StringMap): any {
  if (!m) {
    return obj;
  }
  const mkeys = Object.keys(m);
  if (mkeys.length === 0) {
    return obj;
  }
  const obj2: any = {};
  const keys = Object.keys(obj);
  for (const key of keys) {
    let k0 = m[key];
    if (!k0) {
      k0 = key;
    }
    obj2[k0] = obj[key];
  }
  return obj2;
}
export function mapArray<T>(results: T[], m?: StringMap): T[] {
  if (!m) {
    return results;
  }
  const mkeys = Object.keys(m);
  if (mkeys.length === 0) {
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
      obj2[k0] = (obj as any)[key];
    }
    objs.push(obj2);
  }
  return objs;
}

export function buildShownItems<T extends Title>(keyword: string, all: T[], includeDescription?: boolean): T[] {
  if (!all) {
    return [];
  }
  if (!keyword || keyword === '') {
    return all;
  }
  const w = keyword.toLowerCase();
  if (includeDescription) {
    return all.filter(i => i.title && i.title.toLowerCase().includes(w) || i.description && i.description.toLocaleLowerCase().includes(w));
  } else {
    return all.filter(i => i.title && i.title.toLowerCase().includes(w));
  }
}

export class VideoClient implements VideoService {
  private channelCache: Cache<Channel>;
  private playlistCache: Cache<Playlist>;
  getCommentThreads?: (videoId: string, sort?: CommentOrder, max?: number, nextPageToken?: string) => Promise<ListResult<CommentThead>>;
  getComments?: (id: string, max?: number, nextPageToken?: string) => Promise<ListResult<Comment>>;
  constructor(private url: string, private httpRequest: HttpRequest, private maxChannel: number = 40, private maxPlaylist: number = 200, private key?: string) {
    this.channelCache = {};
    this.playlistCache = {};
    this.getCagetories = this.getCagetories.bind(this);
    this.getChannels = this.getChannels.bind(this);
    this.getChannel = this.getChannel.bind(this);
    this.getChannelPlaylists = this.getChannelPlaylists.bind(this);
    this.getPlaylists = this.getPlaylists.bind(this);
    this.getPlaylist = this.getPlaylist.bind(this);
    this.getPlaylistVideos = this.getPlaylistVideos.bind(this);
    this.getChannelVideos = this.getChannelVideos.bind(this);
    this.getPopularVideos = this.getPopularVideos.bind(this);
    this.getPopularVideosByRegion = this.getPopularVideosByRegion.bind(this);
    this.getPopularVideosByCategory = this.getPopularVideosByCategory.bind(this);
    this.getVideos = this.getVideos.bind(this);
    this.getVideo = this.getVideo.bind(this);
    this.search = this.search.bind(this);
    this.getRelatedVideos = this.getRelatedVideos.bind(this);
    this.searchVideos = this.searchVideos.bind(this);
    this.searchPlaylists = this.searchPlaylists.bind(this);
    this.searchChannels = this.searchChannels.bind(this);
    if (key && key.length > 0) {
      this.getCommentThreads = (videoId: string, sort?: CommentOrder, max?: number, nextPageToken?: string): Promise<ListResult<CommentThead>> => {
        return getCommentThreads(httpRequest, key, videoId, sort, max, nextPageToken);
      };
      this.getComments = (id: string, max?: number, nextPageToken?: string): Promise<ListResult<Comment>> => {
        return getComments(httpRequest, key, id, max, nextPageToken);
      };
    }
  }
  getCagetories(regionCode?: string): Promise<VideoCategory[]> {
    if (!regionCode) {
      regionCode = 'US';
    }
    const url = `${this.url}/category?regionCode=${regionCode}`;
    return this.httpRequest.get<VideoCategory[]>(url);
  }
  getChannels(ids: string[], fields?: string[]): Promise<Channel[]> {
    const url = `${this.url}/channels/list?id=${ids.join(',')}&fields=${fields}`;
    return this.httpRequest.get<Channel[]>(url).then(res => formatPublishedAt(res));
  }
  getChannel(id: string, fields?: string[]): Promise<Channel> {
    const c = this.channelCache[id];
    if (c) {
      return Promise.resolve(c.item);
    } else {
      const field = fields ? `?fields=${fields}` : '';
      const url = `${this.url}/channels/${id}${field}`;
      return this.httpRequest.get<Channel>(url).then(channel => {
        if (channel) {
          if (channel.publishedAt) {
            channel.publishedAt = new Date(channel.publishedAt);
          }
          this.channelCache[id] = {item: channel, timestamp: new Date()};
          removeCache(this.channelCache, this.maxChannel);
        }
        return channel;
      }).catch(err => {
        const data = (err &&  err.response) ? err.response : err;
        if (data && (data.status === 404 || data.status === 410)) {
          return null;
        }
        throw err;
      });
    }
  }
  getChannelPlaylists(channelId: string, max?: number, nextPageToken?: string, fields?: string[]): Promise<ListResult<Playlist>> {
    const maxResults = (max && max > 0 ? max : 50);
    const pageToken = (nextPageToken ? `&nextPageToken=${nextPageToken}` : '');
    const field = fields ? `&fields=${fields}` : '';
    const url = `${this.url}/playlists?channelId=${channelId}&limit=${maxResults}${pageToken}${field}`;
    return this.httpRequest.get<ListResult<Playlist>>(url).then(res => {
      formatPublishedAt<Playlist>(res.list);
      const r: ListResult<Playlist> = {
        list: decompressItems(res.list),
        nextPageToken: res.nextPageToken,
      };
      return r;
    });
  }
  getPlaylists(ids: string[], fields?: string[]): Promise<Playlist[]> {
    const field = fields ? `&fields=${fields}` : '';
    const url = `${this.url}/playlists/list?id=${ids.join(',')}${field}`;
    return this.httpRequest.get<Playlist[]>(url).then(res => formatPublishedAt(res));
  }
  getPlaylist(id: string, fields?: string[]): Promise<Playlist> {
    const c = this.playlistCache[id];
    if (c) {
      return Promise.resolve(c.item);
    } else {
      const field = fields ? `?fields=${fields}` : '';
      const url = `${this.url}/playlists/${id}${field}`;
      return this.httpRequest.get<Playlist>(url).then(playlist => {
        if (playlist) {
          if (playlist.publishedAt) {
            playlist.publishedAt = new Date(playlist.publishedAt);
          }
          this.playlistCache[id] = {item: playlist, timestamp: new Date()};
          removeCache(this.playlistCache, this.maxPlaylist);
        }
        return playlist;
      }).catch(err => {
        const data = (err &&  err.response) ? err.response : err;
        if (data && (data.status === 404 || data.status === 410)) {
          return null;
        }
        throw err;
      });
    }
  }
  getPlaylistVideos(playlistId: string, max?: number, nextPageToken?: string, fields?: string[]): Promise<ListResult<PlaylistVideo>> {
    const maxResults = (max && max > 0 ? max : 50);
    const pageToken = (nextPageToken ? `&nextPageToken=${nextPageToken}` : '');
    const field = fields ? `&fields=${fields}` : '';
    const url = `${this.url}/videos?playlistId=${playlistId}&limit=${maxResults}${pageToken}${field}`;
    return this.httpRequest.get<ListResult<PlaylistVideo>>(url).then(res => {
      formatPublishedAt<PlaylistVideo>(res.list);
      const r: ListResult<PlaylistVideo> = {
        list: decompress(res.list),
        nextPageToken: res.nextPageToken,
      };
      return r;
    });
  }
  getChannelVideos(channelId: string, max?: number, nextPageToken?: string, fields?: string[]): Promise<ListResult<PlaylistVideo>> {
    const maxResults = (max && max > 0 ? max : 50);
    const pageToken = (nextPageToken ? `&nextPageToken=${nextPageToken}` : '');
    const field = fields ? `&fields=${fields}` : '';
    const url = `${this.url}/videos?channelId=${channelId}&limit=${maxResults}${pageToken}${field}`;
    return this.httpRequest.get<ListResult<PlaylistVideo>>(url).then(res => {
      formatPublishedAt<PlaylistVideo>(res.list);
      const r: ListResult<PlaylistVideo> = {
        list: decompress(res.list),
        nextPageToken: res.nextPageToken,
      };
      return r;
    });
  }
  getPopularVideos(regionCode?: string, videoCategoryId?: string, max?: number, nextPageToken?: string, fields?: string[]): Promise<ListResult<Video>> {
    if ((!regionCode || regionCode.length === 0) && (!videoCategoryId || videoCategoryId.length === 0)) {
      regionCode = 'US';
    }
    const regionParam = regionCode && regionCode.length > 0 ? `&regionCode=${regionCode}` : '';
    const categoryParam = videoCategoryId && videoCategoryId.length > 0 ? `&categoryId=${videoCategoryId}` : '';
    const maxResults = (max && max > 0 ? max : 50);
    const pageToken = (nextPageToken ? `&nextPageToken=${nextPageToken}` : '');
    const field = fields ? `&fields=${fields}` : '';
    const url = `${this.url}/videos/popular?limit=${maxResults}${pageToken}${regionParam}${categoryParam}${field}`;
    return this.httpRequest.get<ListResult<Video>>(url).then(res => {
      formatPublishedAt<Video>(res.list);
      const r: ListResult<Video> = {
        list: decompress(res.list),
        nextPageToken: res.nextPageToken,
      };
      return r;
    });
  }
  getPopularVideosByRegion(regionCode?: string, max?: number, nextPageToken?: string, fields?: string[]): Promise<ListResult<Video>> {
    return this.getPopularVideos(regionCode, undefined, max, nextPageToken, fields);
  }
  getPopularVideosByCategory(videoCategoryId?: string, max?: number, nextPageToken?: string, fields?: string[]): Promise<ListResult<Video>> {
    return this.getPopularVideos(undefined, videoCategoryId, max, nextPageToken, fields);
  }
  getVideos(ids: string[], fields?: string[], noSnippet?: boolean): Promise<Video[]> {
    if (!ids || ids.length === 0) {
      return Promise.resolve([]);
    }
    const field = fields ? `&fields=${fields}` : '';
    const url = `${this.url}/videos/list?id=${ids.join(',')}${field}`;
    return this.httpRequest.get<Video[]>(url).then(res => formatPublishedAt(res));
  }
  getRelatedVideos(videoId: string, max?: number, nextPageToken?: string, fields?: string[]): Promise<ListResult<Item>> {
    if (!videoId || videoId.length === 0) {
      const r: ListResult<Item> = {list: []};
      return Promise.resolve(r);
    }
    const maxResults = (max && max > 0 ? max : 50);
    const pageToken = (nextPageToken ? `&nextPageToken=${nextPageToken}` : '');
    const field = fields ? `&fields=${fields}` : '';
    const url = `${this.url}/videos/${videoId}/related?limit=${maxResults}${pageToken}${field}`;
    return this.httpRequest.get<ListResult<Item>>(url).then(res => {
      formatPublishedAt<Item>(res.list);
      const r: ListResult<Item> = {
        list: decompress(res.list),
        nextPageToken: res.nextPageToken,
      };
      return r;
    });
  }
  getVideo(id: string, fields?: string[], noSnippet?: boolean): Promise<Video> {
    const field = fields ? `?fields=${fields}` : '';
    const url = `${this.url}/videos/${id}${field}`;
    return this.httpRequest.get<Video>(url).then(video => {
      if (video && video.publishedAt) {
        video.publishedAt = new Date(video.publishedAt);
      }
      return video;
    }).catch(err => {
      const data = (err &&  err.response) ? err.response : err;
      if (data && (data.status === 404 || data.status === 410)) {
        return null;
      }
      throw err;
    });
  }
  search(sm: ItemSM, max?: number, nextPageToken?: string|number): Promise<ListResult<Item>> {
    const searchType = sm.type ? `&type=${sm.type}` : '';
    const searchDuration = sm.type === 'video' && (sm.duration === 'long' || sm.duration === 'medium' || sm.duration === 'short') ? `&videoDuration=${sm.duration}` : '';
    const searchOrder = (sm.sort === 'date' || sm.sort === 'rating' || sm.sort === 'title' || sm.sort === 'count' || sm.sort === 'viewCount' ) ? `&sort=${sm.sort}` : '';
    const regionParam = (sm.regionCode && sm.regionCode.length > 0 ? `&regionCode=${sm.regionCode}` : '');
    const pageToken = (nextPageToken ? `&pageToken=${nextPageToken}` : '');
    const maxResults = (max && max > 0 ? max : 50); // maximum is 50
    const url = `https://www.googleapis.com/youtube/v3/search?key=${this.key}&part=snippet${regionParam}&q=${sm.q}&maxResults=${maxResults}${searchType}${searchDuration}${searchOrder}${pageToken}`;
    return this.httpRequest.get<YoutubeListResult<ListItem<SearchId, SearchSnippet, any>>>(url).then(res => {
      const r = fromYoutubeSearch(res);
      r.list = formatThumbnail(r.list);
      return r;
    });
  }
  searchVideos(sm: ItemSM, max?: number, nextPageToken?: string|number, fields?: string[]): Promise<ListResult<Item>> {
    const searchDuration = sm.type === 'video' && (sm.duration === 'long' || sm.duration === 'medium' || sm.duration === 'short') ? `&videoDuration=${sm.duration}` : '';
    const searchOrder = (sm.sort === 'date' || sm.sort === 'rating' || sm.sort === 'title' || sm.sort === 'count' || sm.sort === 'viewCount' ) ? `&sort=${sm.sort}` : '';
    const regionParam = (sm.regionCode && sm.regionCode.length > 0 ? `&regionCode=${sm.regionCode}` : '');
    const pageToken = (nextPageToken ? `&nextPageToken=${nextPageToken}` : '');
    const maxResults = (max && max > 0 ? max : 50); // maximum is 50
    const field = fields ? `&fields=${fields}` : '';
    const url = `${this.url}/videos/search?q=${sm.q}${searchDuration}${regionParam}${searchOrder}${pageToken}${field}&limit=${maxResults}`;
    return this.httpRequest.get<ListResult<Item>>(url).then(res => {
      formatPublishedAt<Item>(res.list);
      const r: ListResult<Item> = {
        list: decompress(res.list),
        nextPageToken: res.nextPageToken,
      };
      return r;
    });
  }
  searchPlaylists?(sm: PlaylistSM, max?: number, nextPageToken?: string|number, fields?: string[]): Promise<ListResult<Playlist>> {
    const searchOrder = (sm.sort === 'date' || sm.sort === 'rating' || sm.sort === 'title' || sm.sort === 'count' || sm.sort === 'viewCount' ) ? `&sort=${sm.sort}` : '';
    const pageToken = (nextPageToken ? `&nextPageToken=${nextPageToken}` : '');
    const maxResults = (max && max > 0 ? max : 50); // maximum is 50
    const field = fields ? `&fields=${fields}` : '';
    const url = `${this.url}/playlists/search?q=${sm.q}${searchOrder}${pageToken}${field}&limit=${maxResults}`;
    return this.httpRequest.get<ListResult<Playlist>>(url).then(res => {
      formatPublishedAt<Playlist>(res.list);
      const r: ListResult<Playlist> = {
        list: decompress(res.list),
        nextPageToken: res.nextPageToken,
      };
      return r;
    });
  }
  searchChannels?(sm: ChannelSM, max?: number, nextPageToken?: string|number, fields?: string[]): Promise<ListResult<Channel>> {
    const searchOrder = (sm.sort === 'date' || sm.sort === 'rating' || sm.sort === 'title' || sm.sort === 'count' || sm.sort === 'viewCount' ) ? `&sort=${sm.sort}` : '';
    const pageToken = (nextPageToken ? `&nextPageToken=${nextPageToken}` : '');
    const maxResults = (max && max > 0 ? max : 50); // maximum is 50
    const field = fields ? `&fields=${fields}` : '';
    const url = `${this.url}/channels/search?q=${sm.q}${searchOrder}${pageToken}${field}&limit=${maxResults}`;
    return this.httpRequest.get<ListResult<Channel>>(url).then(res => {
      formatPublishedAt<Channel>(res.list);
      const r: ListResult<Channel> = {
        list: decompress(res.list),
        nextPageToken: res.nextPageToken,
      };
      return r;
    });
  }
}

export class YoutubeSyncClient implements SyncClient {
  constructor(private key: string, private httpRequest: HttpRequest) {
    this.getChannels = this.getChannels.bind(this);
    this.getChannel = this.getChannel.bind(this);
    this.getChannelPlaylists = this.getChannelPlaylists.bind(this);
    this.getPlaylists = this.getPlaylists.bind(this);
    this.getPlaylist = this.getPlaylist.bind(this);
    this.getPlaylistVideos = this.getPlaylistVideos.bind(this);
    this.getVideos = this.getVideos.bind(this);
  }
  private getChannels(ids: string[]): Promise<Channel[]> {
    const url = `https://www.googleapis.com/youtube/v3/channels?key=${this.key}&id=${ids.join(',')}&part=snippet,contentDetails`;
    return this.httpRequest.get<YoutubeListResult<ListItem<string, ChannelSnippet, ChannelDetail>>>(url).then(res => formatThumbnail(fromYoutubeChannels(res)));
  }
  getChannel(id: string): Promise<Channel> {
    return this.getChannels([id]).then(res => {
      const channel = res && res.length > 0 ? res[0] : null;
      return channel;
    });
  }
  private getPlaylists(ids: string[]): Promise<Playlist[]> {
    const url = `https://youtube.googleapis.com/youtube/v3/playlists?key=${this.key}&id=${ids.join(',')}&part=snippet,contentDetails`;
    return this.httpRequest.get<YoutubeListResult<ListItem<string, PlaylistSnippet, ListDetail>>>(url).then(res => {
      const r = fromYoutubePlaylists(res);
      return r.list;
    });
  }
  getPlaylist(id: string): Promise<Playlist> {
    return this.getPlaylists([id]).then(res => {
      const playlist = res && res.length > 0 ? res[0] : null;
      return playlist;
    });
  }
  getChannelPlaylists(channelId: string, max?: number, nextPageToken?: string): Promise<ListResult<Playlist>> {
    const maxResults = (max && max > 0 ? max : 50);
    const pageToken = (nextPageToken ? `&pageToken=${nextPageToken}` : '');
    const url = `https://youtube.googleapis.com/youtube/v3/playlists?key=${this.key}&channelId=${channelId}&maxResults=${maxResults}${pageToken}&part=snippet,contentDetails`;
    return this.httpRequest.get<YoutubeListResult<ListItem<string, PlaylistSnippet, ListDetail>>>(url).then(res => fromYoutubePlaylists(res));
  }
  getPlaylistVideos(playlistId: string, max?: number, nextPageToken?: string): Promise<ListResult<PlaylistVideo>> {
    const maxResults = (max && max > 0 ? max : 50);
    const pageToken = (nextPageToken ? `&pageToken=${nextPageToken}` : '');
    const url = `https://youtube.googleapis.com/youtube/v3/playlistItems?key=${this.key}&playlistId=${playlistId}&maxResults=${maxResults}${pageToken}&part=snippet,contentDetails`;
    return this.httpRequest.get<YoutubeListResult<ListItem<string, PlaylistVideoSnippet, VideoItemDetail>>>(url).then(res => {
      const r = fromYoutubePlaylist(res);
      if (r.list) {
        r.list = r.list.filter(i => i.thumbnail);
      }
      return r;
    });
  }
  getVideos(ids: string[]): Promise<Video[]> {
    if (!ids || ids.length === 0) {
      return Promise.resolve([]);
    }
    const strSnippet = 'snippet,';
    const url = `https://www.googleapis.com/youtube/v3/videos?key=${this.key}&part=${strSnippet}contentDetails&id=${ids.join(',')}`;
    return this.httpRequest.get<YoutubeListResult<ListItem<string, VideoSnippet, YoutubeVideoDetail>>>(url).then(res => {
      const r = fromYoutubeVideos(res);
      if (!r || !r.list) {
        return [];
      }
      return r.list;
    });
  }
}
export class YoutubeClient implements VideoService {
  private channelCache: Cache<Channel>;
  private playlistCache: Cache<Playlist>;
  constructor(private key: string, private httpRequest: HttpRequest, private maxChannel: number = 40, private maxPlaylist: number = 200) {
    this.channelCache = {};
    this.playlistCache = {};
    this.getCagetories = this.getCagetories.bind(this);
    this.getChannels = this.getChannels.bind(this);
    this.getChannel = this.getChannel.bind(this);
    this.getChannelPlaylists = this.getChannelPlaylists.bind(this);
    this.getPlaylists = this.getPlaylists.bind(this);
    this.getPlaylist = this.getPlaylist.bind(this);
    this.getPlaylistVideos = this.getPlaylistVideos.bind(this);
    this.getChannelVideos = this.getChannelVideos.bind(this);
    this.getPopularVideos = this.getPopularVideos.bind(this);
    this.getPopularVideosByRegion = this.getPopularVideosByRegion.bind(this);
    this.getPopularVideosByCategory = this.getPopularVideosByCategory.bind(this);
    this.getVideos = this.getVideos.bind(this);
    this.getVideo = this.getVideo.bind(this);
    this.search = this.search.bind(this);
    this.getRelatedVideos = this.getRelatedVideos.bind(this);
    this.searchVideos = this.searchVideos.bind(this);
    this.searchPlaylists = this.searchPlaylists.bind(this);
    this.searchChannels = this.searchChannels.bind(this);
    this.getCommentThreads = this.getCommentThreads.bind(this);
    this.getComments = this.getComments.bind(this);
  }
  getCagetories(regionCode?: string): Promise<VideoCategory[]> {
    if (!regionCode) {
      regionCode = 'US';
    }
    const url = `https://www.googleapis.com/youtube/v3/videoCategories?key=AIzaSyDVRw8jjqyJWijg57zXSOMpUArlZGpC7bE&regionCode=${regionCode}`;
    return this.httpRequest.get<YoutubeListResult<ListItem<string, CategorySnippet, any>>>(url).then(res => fromYoutubeCategories(res));
  }
  getChannels(ids: string[]): Promise<Channel[]> {
    const url = `https://www.googleapis.com/youtube/v3/channels?key=${this.key}&id=${ids.join(',')}&part=snippet,contentDetails`;
    return this.httpRequest.get<YoutubeListResult<ListItem<string, ChannelSnippet, ChannelDetail>>>(url).then(res => formatThumbnail(fromYoutubeChannels(res)));
  }
  getChannel(id: string): Promise<Channel> {
    const c = this.channelCache[id];
    if (c) {
      return Promise.resolve(c.item);
    } else {
      return this.getChannels([id]).then(res => {
        const channel = res && res.length > 0 ? res[0] : null;
        if (channel) {
          const d = new Date();
          this.channelCache[id] = { item: channel, timestamp: d};
          if (channel.customUrl && channel.customUrl.length > 0) {
            this.channelCache[channel.customUrl] = { item: channel, timestamp: d};
          }
          removeCache(this.channelCache, this.maxChannel);
        }
        return channel;
      });
    }
  }
  getChannelPlaylists(channelId: string, max?: number, nextPageToken?: string): Promise<ListResult<Playlist>> {
    const maxResults = (max && max > 0 ? max : 50);
    const pageToken = (nextPageToken ? `&pageToken=${nextPageToken}` : '');
    const url = `https://youtube.googleapis.com/youtube/v3/playlists?key=${this.key}&channelId=${channelId}&maxResults=${maxResults}${pageToken}&part=snippet,contentDetails`;
    return this.httpRequest.get<YoutubeListResult<ListItem<string, PlaylistSnippet, ListDetail>>>(url).then(res => fromYoutubePlaylists(res));
  }
  getPlaylists(ids: string[]): Promise<Playlist[]> {
    const url = `https://youtube.googleapis.com/youtube/v3/playlists?key=${this.key}&id=${ids.join(',')}&part=snippet,contentDetails`;
    return this.httpRequest.get<YoutubeListResult<ListItem<string, PlaylistSnippet, ListDetail>>>(url).then(res => {
      const r = fromYoutubePlaylists(res);
      r.list = formatBigThumbnail(r.list);
      return r.list;
    });
  }
  getPlaylist(id: string): Promise<Playlist> {
    const c = this.playlistCache[id];
    if (c) {
      return Promise.resolve(c.item);
    } else {
      return this.getPlaylists([id]).then(res => {
        const playlist = res && res.length > 0 ? res[0] : null;
        if (playlist) {
          this.playlistCache[id] = { item: playlist, timestamp: new Date() };
          removeCache(this.playlistCache, this.maxPlaylist);
        }
        return playlist;
      });
    }
  }
  getPlaylistVideos(playlistId: string, max?: number, nextPageToken?: string): Promise<ListResult<PlaylistVideo>> {
    const maxResults = (max && max > 0 ? max : 50);
    const pageToken = (nextPageToken ? `&pageToken=${nextPageToken}` : '');
    const url = `https://youtube.googleapis.com/youtube/v3/playlistItems?key=${this.key}&playlistId=${playlistId}&maxResults=${maxResults}${pageToken}&part=snippet,contentDetails`;
    return this.httpRequest.get<YoutubeListResult<ListItem<string, PlaylistVideoSnippet, VideoItemDetail>>>(url).then(res => {
      const r = fromYoutubePlaylist(res);
      r.list = formatThumbnail(r.list);
      return r;
    });
  }
  getChannelVideos(channelId: string, max?: number, nextPageToken?: string): Promise<ListResult<PlaylistVideo>> {
    return this.getChannel(channelId).then(channel => {
      if (!channel) {
        const result = {
          list: []
        };
        return result;
      }
      return this.getPlaylistVideos(channel.uploads, max, nextPageToken);
    });
  }
  getPopularVideos(regionCode?: string, videoCategoryId?: string, max?: number, nextPageToken?: string): Promise<ListResult<Video>> {
    if ((!regionCode || regionCode.length === 0) && (!videoCategoryId || videoCategoryId.length === 0)) {
      regionCode = 'US';
    }
    const regionParam = regionCode && regionCode.length > 0 ? `&regionCode=${regionCode}` : '';
    const categoryParam = videoCategoryId && videoCategoryId.length > 0 ? `&videoCategoryId=${videoCategoryId}` : '';
    const maxResults = (max && max > 0 ? max : 50);
    const pageToken = (nextPageToken ? `&pageToken=${nextPageToken}` : '');
    const url = `https://youtube.googleapis.com/youtube/v3/videos?key=${this.key}&chart=mostPopular${regionParam}${categoryParam}&maxResults=${maxResults}${pageToken}&part=snippet,contentDetails`;
    return this.httpRequest.get<YoutubeListResult<ListItem<string, VideoSnippet, YoutubeVideoDetail>>>(url).then(res => {
      const r = fromYoutubeVideos(res);
      r.list = formatBigThumbnail(r.list);
      return r;
    });
  }
  getPopularVideosByRegion(regionCode?: string, max?: number, nextPageToken?: string): Promise<ListResult<Video>> {
    return this.getPopularVideos(regionCode, undefined, max, nextPageToken);
  }
  getPopularVideosByCategory(videoCategoryId?: string, max?: number, nextPageToken?: string): Promise<ListResult<Video>> {
    return this.getPopularVideos(undefined, videoCategoryId, max, nextPageToken);
  }
  getVideos(ids: string[], fields?: string[], noSnippet?: boolean): Promise<Video[]> {
    if (!ids || ids.length === 0) {
      return Promise.resolve([]);
    }
    const strSnippet = (noSnippet ? '' : 'snippet,');
    const url = `https://www.googleapis.com/youtube/v3/videos?key=${this.key}&part=${strSnippet}contentDetails&id=${ids.join(',')}`;
    return this.httpRequest.get<YoutubeListResult<ListItem<string, VideoSnippet, YoutubeVideoDetail>>>(url).then(res => {
      const r = fromYoutubeVideos(res);
      if (!r || !r.list) {
        return [];
      }
      return formatBigThumbnail(r.list);
    });
  }
  getVideo(id: string, fields?: string[], noSnippet?: boolean): Promise<Video> {
    return this.getVideos([id], fields, noSnippet).then(res => res && res.length > 0 ? res[0] : null);
  }
  getCommentThreads(videoId: string, sort?: CommentOrder, max?: number, nextPageToken?: string): Promise<ListResult<CommentThead>> {
    return getCommentThreads(this.httpRequest, this.key, videoId, sort, max, nextPageToken);
  }
  getComments(id: string, max?: number, nextPageToken?: string): Promise<ListResult<Comment>> {
    return getComments(this.httpRequest, this.key, id, max, nextPageToken);
  }
  search(sm: ItemSM, max?: number, nextPageToken?: string | number): Promise<ListResult<Item>> {
    const searchType = sm.type ? `&type=${sm.type}` : '';
    const searchDuration = (sm.duration === 'long' || sm.duration === 'medium' || sm.duration === 'short') ? `&videoDuration=${sm.duration}` : '';
    const s = getYoutubeSort(sm.sort);
    const searchOrder = (s ? `&order=${s}` : '');
    const regionParam = (sm.regionCode && sm.regionCode.length > 0 ? `&regionCode=${sm.regionCode}` : '');
    const pageToken = (nextPageToken ? `&pageToken=${nextPageToken}` : '');
    const maxResults = (max && max > 0 ? max : 50); // maximum is 50
    const url = `https://www.googleapis.com/youtube/v3/search?key=${this.key}&part=snippet${regionParam}&q=${sm.q}&maxResults=${maxResults}${searchType}${searchDuration}${searchOrder}${pageToken}`;
    return this.httpRequest.get<YoutubeListResult<ListItem<SearchId, SearchSnippet, any>>>(url).then(res => fromYoutubeSearch(res));
  }
  searchVideos(sm: ItemSM, max?: number, nextPageToken?: string | number): Promise<ListResult<Item>> {
    sm.type = 'video';
    return this.search(sm, max, nextPageToken);
  }
  searchPlaylists?(sm: PlaylistSM, max?: number, nextPageToken?: string | number): Promise<ListResult<Playlist>> {
    const s: any = sm;
    s.type = 'playlist';
    return this.search(s, max, nextPageToken).then(res => {
      const list = res.list.map(i => {
        const p: Playlist = {
          id: i.id,
          title: i.title,
          description: i.description,
          publishedAt: i.publishedAt,
          thumbnail: i.thumbnail,
          mediumThumbnail: i.mediumThumbnail,
          highThumbnail: i.highThumbnail,
          channelId: i.channelId,
          channelTitle: i.channelTitle
        };
        return p;
      });
      return { list, total: res.total, limit: res.limit, nextPageToken: res.nextPageToken };
    });
  }
  searchChannels?(sm: ChannelSM, max?: number, nextPageToken?: string | number): Promise<ListResult<Channel>> {
    const s: any = sm;
    s.type = 'channel';
    return this.search(s, max, nextPageToken).then(res => {
      const list = res.list.map(i => {
        const p: Channel = {
          id: i.id,
          title: i.title,
          description: i.description,
          publishedAt: i.publishedAt,
          thumbnail: i.thumbnail,
          mediumThumbnail: i.mediumThumbnail,
          highThumbnail: i.highThumbnail,
          channelId: i.channelId,
          channelTitle: i.channelTitle
        };
        return p;
      });
      return { list, total: res.total, limit: res.limit, nextPageToken: res.nextPageToken };
    });
  }
  getRelatedVideos(videoId: string, max?: number, nextPageToken?: string): Promise<ListResult<Item>> {
    return this.getPopularVideos('US').then(list => list as any);
    /*
    const maxResults = (max && max > 0 ? max : 24);
    const pageToken = (nextPageToken ? `&pageToken=${nextPageToken}` : '');
    const url = `https://youtube.googleapis.com/youtube/v3/search?key=${this.key}&relatedToVideoId=${videoId}&type=video&regionCode=VN&maxResults=${maxResults}${pageToken}&part=snippet`;
    return this.httpRequest.get<YoutubeListResult<ListItem<SearchId, SearchSnippet, any>>>(url).then(res => fromYoutubeSearch(res));
    */
  }
}

export class DefaultSyncService implements SyncService {
  constructor(private client: SyncClient, private repo: SyncRepository, private log?: (msg: any, ctx?: any) => void) {
    this.syncChannel = this.syncChannel.bind(this);
    this.syncChannels = this.syncChannel.bind(this);
    this.syncPlaylist = this.syncPlaylist.bind(this);
    this.syncPlaylists = this.syncPlaylists.bind(this);
  }
  syncChannel(channelId: string): Promise<number> {
    return syncChannel(channelId, this.client, this.repo, this.log);
  }
  syncChannels(channelIds: string[]): Promise<number> {
    return syncChannels(channelIds, this.client, this.repo);
  }
  syncPlaylist(playlistId: string, level?: number): Promise<number> {
    const syncVideos = level && level < 2 ? false : true;
    return syncPlaylist(playlistId, syncVideos, this.client, this.repo, this.log);
  }
  syncPlaylists(playlistIds: string[], level?: number): Promise<number> {
    const syncVideos = level && level < 2 ? false : true;
    return syncPlaylists(playlistIds, syncVideos, this.client, this.repo);
  }
}

export function syncChannels(channelIds: string[], client: SyncClient, repo: SyncRepository): Promise<number> {
  const promises = channelIds.map(channelId => syncChannel(channelId, client, repo));
  let sum = 0;
  return Promise.all(promises).then(res => {
    for (const num of res) {
      sum = sum + num;
    }
    return sum;
  });
}
export async function syncChannel(channelId: string, client: SyncClient, repo: SyncRepository, log?: (msg: any, ctx?: any) => void): Promise<number> {
  return repo.getChannelSync(channelId).then(channelSync => {
    const res = client.getChannel(channelId).then(channel => {
      if (!channel) {
        return Promise.resolve(0);
      } else {
        return checkAndSyncUploads(channel, channelSync, client, repo);
      }
    });
    return res;
  }).catch(err => {
    if (log) {
      log(err);
    }
    throw err;
  });
}
export function checkAndSyncUploads(channel: Channel, channelSync: ChannelSync, client: SyncClient, repo: SyncRepository): Promise<number> {
  if (!channel.uploads || channel.uploads.length === 0) {
    return Promise.resolve(0);
  } else {
    const date = new Date();
    const timestamp = channelSync ? channelSync.syncTime : undefined;
    const syncVideos = (!channelSync || (channelSync && channelSync.level && channelSync.level >= 2)) ? true : false;
    const syncCollection = (!channelSync || (channelSync && channelSync.level && channelSync.level >= 1)) ? true : false;
    syncUploads(channel.uploads, client, repo, timestamp).then(r => {
      channel.lastUpload = r.timestamp;
      channel.count = r.count;
      channel.itemCount = r.all;
      syncChannelPlaylists(channel.id, syncVideos, syncCollection, client, repo).then(res => {
        if (syncCollection) {
          channel.playlistCount = res.count;
          channel.playlistItemCount = res.all;
          channel.playlistVideoCount = res.videoCount;
          channel.playlistVideoItemCount = res.allVideoCount;
        }
        return repo.saveChannel(channel).then(c => {
          return repo.saveChannelSync({ id: channel.id, syncTime: date, uploads: channel.uploads });
        });
      });
    });
  }
}

export function syncPlaylists(playlistIds: string[], syncVideos: boolean, client: SyncClient, repo: SyncRepository): Promise<number> {
  const promises = playlistIds.map(playlistId => syncPlaylist(playlistId, syncVideos, client, repo));
  let sum = 0;
  return Promise.all(promises).then(res => {
    for (const num of res) {
      sum = sum + num;
    }
    return sum;
  });
}
export async function syncPlaylist(playlistId: string, syncVideos: boolean, client: SyncClient, repo: SyncRepository, log?: (msg: any, ctx?: any) => void): Promise<number> {
  try {
    const res = await syncPlaylistVideos(playlistId, syncVideos, client, repo);
    const playlist = await client.getPlaylist(playlistId);
    playlist.itemCount = playlist.count;
    playlist.count = res.count;
    await repo.savePlaylist(playlist);
    await repo.savePlaylistVideos(playlistId, res.videos);
    return res.success;
  } catch (err) {
    if (log) {
      log(err);
    }
    throw err;
  }
}

export interface VideoResult {
  success?: number;
  count?: number;
  all?: number;
  videos?: string[];
  timestamp?: Date;
}
export function syncVideosOfPlaylists(playlistIds: string[], syncVideos: boolean, saveCollection: boolean, client: SyncClient, repo: SyncRepository): Promise<number> {
  let sum = 0;
  if (saveCollection) {
    const promises = playlistIds.map(id => syncPlaylistVideos(id, syncVideos, client, repo).then(r => repo.savePlaylistVideos(id, r.videos)));
    return Promise.all(promises).then(res => {
      for (const num of res) {
        sum = sum + num;
      }
      return sum;
    });
  } else {
    const promises = playlistIds.map(id => syncPlaylistVideos(id, syncVideos, client, repo));
    return Promise.all(promises).then(res => {
      for (const num of res) {
        sum = sum + num.success;
      }
      return sum;
    });
  }
}
export interface PlaylistResult {
  count?: number;
  all?: number;
  videoCount?: number;
  allVideoCount?: number;
}
export async function syncChannelPlaylists(channelId: string, syncVideos: boolean, saveCollection: boolean, client: SyncClient, repo: SyncRepository): Promise<PlaylistResult> {
  let nextPageToken = '';
  let count = 0;
  let all = 0;
  let allVideoCount = 0;
  while (nextPageToken !== undefined) {
    const channelPlaylists = await client.getChannelPlaylists(channelId, 50, nextPageToken);
    all = channelPlaylists.total;
    count = count + channelPlaylists.list.length;
    const playlistIds: string[] = [];
    for (const p of channelPlaylists.list) {
      playlistIds.push(p.id);
      allVideoCount = allVideoCount + p.count;
    }
    nextPageToken = channelPlaylists.nextPageToken;
    await repo.savePlaylists(channelPlaylists.list);
    await syncVideosOfPlaylists(playlistIds, syncVideos, saveCollection, client, repo);
  }
  return { count, all, allVideoCount };
}
export async function syncPlaylistVideos(playlistId: string, syncVideos: boolean, client: SyncClient, repo: SyncRepository): Promise<VideoResult> {
  let nextPageToken = '';
  let success = 0;
  let count = 0;
  let all = 0;
  let newVideoIds: string[] = [];
  while (nextPageToken !== undefined) {
    const playlistVideos = await client.getPlaylistVideos(playlistId, 50, nextPageToken);
    all = playlistVideos.total;
    count = count + playlistVideos.list.length;
    const videoIds = playlistVideos.list.map(item => item.id);
    newVideoIds = newVideoIds.concat(videoIds);
    const getVideos = syncVideos ? client.getVideos : undefined;
    const r = await saveVideos(playlistVideos.list, getVideos, repo);
    success = success + r;
    nextPageToken = playlistVideos.nextPageToken;
  }
  return { success, count, all, videos: newVideoIds };
}
export async function syncUploads(uploads: string, client: SyncClient, repo: SyncRepository, timestamp?: Date): Promise<VideoResult> {
  let nextPageToken = '';
  let success = 0;
  let count = 0;
  let all = 0;
  let last: Date;
  while (nextPageToken !== undefined) {
    const playlistVideos = await client.getPlaylistVideos(uploads, 50, nextPageToken);
    all = playlistVideos.total;
    count = count + playlistVideos.list.length;
    if (!last && playlistVideos.list.length > 0) {
      last = playlistVideos.list[0].publishedAt;
    }
    const newVideos = getNewVideos(playlistVideos.list, timestamp);
    nextPageToken = playlistVideos.list.length > newVideos.length ? undefined : playlistVideos.nextPageToken;
    const r = await saveVideos(newVideos, client.getVideos, repo);
    success = success + r;
  }
  return { count: success, all, timestamp: last };
}
export function saveVideos(newVideos: PlaylistVideo[], getVideos?: (ids: string[], fields?: string[], noSnippet?: boolean) => Promise<Video[]>, repo?: SyncRepository): Promise<number> {
  if (!newVideos || newVideos.length === 0) {
    return Promise.resolve(0);
  } else {
    if (!repo || !getVideos) {
      return Promise.resolve(newVideos.length);
    } else {
      const videoIds = newVideos.map(item => item.id);
      return repo.getVideoIds(videoIds).then(ids => {
        const newIds = notIn(videoIds, ids);
        if (newIds.length === 0) {
          return Promise.resolve(0);
        } else {
          return getVideos(newIds).then(videos => {
            if (videos && videos.length > 0) {
              return repo.saveVideos(videos).then(r => videos.length);
            } else {
              return Promise.resolve(0);
            }
          });
        }
      });
    }
  }
}

export interface CacheItem<T> {
  item: T;
  timestamp: Date;
}
export interface Cache<T> {
  [key: string]: CacheItem<T>;
}
export function removeCache<T>(cache: Cache<T>, max: number): number {
  let keys = Object.keys(cache);
  if (keys.length <= max) {
    return 0;
  }
  let lastKey = '';
  let count = 0;
  while (true) {
    let last = new Date();
    for (const key of keys) {
      const obj = cache[key];
      if (obj.timestamp.getTime() > last.getTime()) {
        lastKey = key;
        last = obj.timestamp;
      }
    }
    delete cache[lastKey];
    count = count + 1;
    keys = Object.keys(cache);
    if (keys.length <= max) {
      return count;
    }
  }
}

export const nothumbnail = 'https://i.ytimg.com/img/no_thumbnail.jpg';
export function formatThumbnail<T extends Thumbnail>(t: T[]): T[] {
  if (!t) {
    return t;
  }
  for (const obj of t) {
    if (!obj.thumbnail) {
      obj.thumbnail = nothumbnail;
    }
    if (!obj.mediumThumbnail) {
      obj.mediumThumbnail = nothumbnail;
    }
    if (!obj.highThumbnail) {
      obj.highThumbnail = nothumbnail;
    }
  }
  return t;
}
export function formatBigThumbnail<T extends Thumbnail & BigThumbnail>(t: T[]): T[] {
  if (!t) {
    return t;
  }
  for (const obj of t) {
    if (!obj.thumbnail) {
      obj.thumbnail = nothumbnail;
    }
    if (!obj.mediumThumbnail) {
      obj.mediumThumbnail = nothumbnail;
    }
    if (!obj.highThumbnail) {
      obj.highThumbnail = nothumbnail;
    }
    if (!obj.standardThumbnail) {
      obj.standardThumbnail = nothumbnail;
    }
    if (!obj.maxresThumbnail) {
      obj.maxresThumbnail = nothumbnail;
    }
  }
  return t;
}
interface Id {
  id?: string;
}
export function decompress<T extends Id & Thumbnail>(items: T[]): T[] {
  for (const i of items) {
    i.mediumThumbnail = `https://i.ytimg.com/vi/${i.id}/mqdefault.jpg`;
    i.highThumbnail = `https://i.ytimg.com/vi/${i.id}/hqdefault.jpg`;
    i.thumbnail = `https://i.ytimg.com/vi/${i.id}/default.jpg`;
    i['standardThumbnail'] = `https://i.ytimg.com/vi/${i.id}/sddefault.jpg`;
    i['maxresThumbnail'] = `https://i.ytimg.com/vi/${i.id}/maxresdefault.jpg`;
  }
  return items;
}
export const thumbnails = ['thumbnail', 'mediumThumbnail', 'highThumbnail', 'maxresThumbnail', 'standardThumbnail'];
export const thumbnailNames = ['default', 'mqdefault', 'hqdefault', 'sddefault', 'maxresdefault'];
export function decompressItems<T>(items: T[]): T[] {
  for (const item of items) {
    // tslint:disable-next-line:prefer-for-of
    for (let i = 0; i < thumbnails.length; i++) {
      const a = thumbnails[i];
      if (item[a] && item[a].length > 0 && item[a].length < 36) {
        const u = `https://i.ytimg.com/vi/${item[a]}/${thumbnailNames[i]}.jpg`;
        item[a] = u;
      }
    }
  }
  return items;
}
interface PublishedAt {
  publishedAt?: Date;
}
export function formatPublishedAt<T extends PublishedAt>(li: T[]): T[] {
  if (li && li.length > 0) {
    for (const i of li) {
      if (i.publishedAt) {
        i.publishedAt = new Date(i.publishedAt);
      }
    }
  }
  return li;
}

export function getCommentThreads(request: HttpRequest, key: string, videoId: string, sort?: CommentOrder, max?: number, nextPageToken?: string): Promise<ListResult<CommentThead>> {
  const orderParam = (sort === 'relevance' ? `&order=${sort}` : '');
  const maxResults = (max && max > 0 ? max : 20); // maximum is 50
  const pageToken = (nextPageToken ? `&pageToken=${nextPageToken}` : '');
  const url = `https://www.googleapis.com/youtube/v3/commentThreads?key=${key}&videoId=${videoId}${orderParam}&maxResults=${maxResults}${pageToken}&part=snippet`;
  return request.get<YoutubeListResult<ListItem<string, TopLevelCommentSnippet, any>>>(url).then(res => fromYoutubeCommentThreads(res));
}
export function getComments(request: HttpRequest, key: string, id: string, max?: number, nextPageToken?: string): Promise<ListResult<Comment>> {
  const maxResults = (max && max > 0 ? max : 20); // maximum is 50
  const pageToken = (nextPageToken ? `&pageToken=${nextPageToken}` : '');
  const url = `https://www.googleapis.com/youtube/v3/comments?key=${key}&parentId=${id}&maxResults=${maxResults}${pageToken}&part=snippet`;
  return request.get<YoutubeListResult<ListItem<string, CommentSnippet, any>>>(url).then(res => fromYoutubeComments(res));
}
export function fromYoutubeCommentThreads(res: YoutubeListResult<ListItem<string, TopLevelCommentSnippet, any>>): ListResult<CommentThead> {
  const list = res.items.filter(i => i.snippet).map(item => {
    const snippet = item.snippet;
    const c = snippet.topLevelComment;
    const sn = c.snippet;
    const i: CommentThead = {
      id: item.id,
      videoId: snippet.videoId,
      textDisplay: sn.textDisplay,
      textOriginal: sn.textOriginal,
      authorDisplayName: sn.authorDisplayName,
      authorProfileImageUrl: sn.authorProfileImageUrl,
      authorChannelUrl: sn.authorProfileImageUrl,
      authorChannelId: sn.authorChannelId.value,
      canRate: sn.canRate,
      viewerRating: sn.viewerRating,
      likeCount: sn.likeCount,
      publishedAt: sn.publishedAt,
      updatedAt: sn.updatedAt,
      canReply: snippet.canReply,
      totalReplyCount: snippet.totalReplyCount,
      isPublic: snippet.isPublic
    };
    return i;
  });
  return { list, total: res.pageInfo.totalResults, limit: res.pageInfo.resultsPerPage, nextPageToken: res.nextPageToken };
}
export function fromYoutubeComments(res: YoutubeListResult<ListItem<string, CommentSnippet, any>>): ListResult<Comment> {
  const list = res.items.filter(i => i.snippet).map(item => {
    const snippet = item.snippet;
    const i: Comment = {
      id: item.id,
      parentId: snippet.parentId,
      textDisplay: snippet.textDisplay,
      textOriginal: snippet.textOriginal,
      authorDisplayName: snippet.authorDisplayName,
      authorProfileImageUrl: snippet.authorProfileImageUrl,
      authorChannelUrl: snippet.authorProfileImageUrl,
      authorChannelId: snippet.authorChannelId.value,
      canRate: snippet.canRate,
      viewerRating: snippet.viewerRating,
      likeCount: snippet.likeCount,
      publishedAt: snippet.publishedAt,
      updatedAt: snippet.updatedAt
    };
    return i;
  });
  return { list, total: res.pageInfo.totalResults, limit: res.pageInfo.resultsPerPage, nextPageToken: res.nextPageToken };
}
