import {Comment, CommentSnippet, CommentThead, TopLevelCommentSnippet} from './comment';
import {CategorySnippet, Channel, ChannelDetail, ChannelSM, ChannelSnippet, Item, ItemSM, ListDetail, ListItem, ListResult, Playlist, PlaylistSM, PlaylistSnippet, PlaylistVideo, PlaylistVideoSnippet, SearchId, SearchSnippet, Title, Video, VideoCategory, VideoItemDetail, VideoSnippet, YoutubeListResult, YoutubeVideoDetail} from './models';
export * from './models';
export * from './comment';

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

export interface ChannelSync {
  id: string;
  uploads?: string;
  timestamp?: Date;
  level?: number;
}
export interface PlaylistCollection {
  id: string;
  videos: string[];
}
export interface SyncRepository {
  getChannelSync(channelId: string): Promise<ChannelSync>;
  saveChannel(channel: Channel): Promise<number>;
  savePlaylist(playlist: Playlist): Promise<number>;
  savePlaylists(playlist: Playlist[]): Promise<number>;
  saveChannelSync(channel: ChannelSync): Promise<number>;
  saveVideos(videos: Video[]): Promise<number>;
  savePlaylistVideos(playlistId: string, videos: string[]): Promise<number>;
  getVideoIds(id: string[]): Promise<string[]>;
}
export interface SyncClient {
  getChannel(id: string): Promise<Channel>;
  getPlaylist(id: string): Promise<Playlist>;
  getChannelPlaylists(channelId: string, max?: number, nextPageToken?: string): Promise<ListResult<Playlist>>;
  getPlaylistVideos(playlistId: string, max?: number, nextPageToken?: string): Promise<ListResult<PlaylistVideo>>;
  getVideos(ids: string[], noSnippet?: boolean): Promise<Video[]>;
}
export interface SyncService {
  syncChannel(channelId: string): Promise<number>;
  syncChannels(channelIds: string[]): Promise<number>;
  syncPlaylist(playlistId: string, level?: number): Promise<number>;
  syncPlaylists(playlistIds: string[], level?: number): Promise<number>;
}

export interface VideoService {
  getCagetories(regionCode?: string): Promise<VideoCategory[]>;
  getChannels(ids: string[]): Promise<Channel[]>;
  getChannel(id: string): Promise<Channel>;
  getChannelPlaylists(channelId: string, max?: number, nextPageToken?: string): Promise<ListResult<Playlist>>;
  getPlaylists(ids: string[]): Promise<Playlist[]>;
  getPlaylist(id: string): Promise<Playlist>;
  getChannelVideos(channelId: string, max?: number, nextPageToken?: string): Promise<ListResult<PlaylistVideo>>;
  getPlaylistVideos(playlistId: string, max?: number, nextPageToken?: string): Promise<ListResult<PlaylistVideo>>;
  getPopularVideos(regionCode?: string, videoCategoryId?: string, max?: number, nextPageToken?: string): Promise<ListResult<Video>>;
  getPopularVideosByRegion(regionCode?: string, max?: number, nextPageToken?: string): Promise<ListResult<Video>>;
  getPopularVideosByCategory(videoCategoryId?: string, max?: number, nextPageToken?: string): Promise<ListResult<Video>>;
  getVideos(ids: string[], noSnippet?: boolean): Promise<Video[]>;
  getVideo(id: string, noSnippet?: boolean): Promise<Video>;
  search(sm: ItemSM, max?: number, nextPageToken?: string|number): Promise<ListResult<Item>>;
  getRelatedVideos?(videoId: string, max?: number, nextPageToken?: string): Promise<ListResult<Item>>;
  searchVideos?(sm: ItemSM, max?: number, nextPageToken?: string|number): Promise<ListResult<Item>>;
  searchPlaylists?(sm: PlaylistSM, max?: number, nextPageToken?: string|number): Promise<ListResult<Playlist>>;
  searchChannels?(sm: ChannelSM, max?: number, nextPageToken?: string|number): Promise<ListResult<Channel>>;
  /**
   * @param videoId
   * @param order relevance, time (default)
   * @param nextPageToken
   */
  getCommentThreads?(videoId: string, order?: string, max?: number, nextPageToken?: string): Promise<ListResult<CommentThead>>;
  getComments?(id: string, max?: number, nextPageToken?: string): Promise<ListResult<Comment>>;
}
export interface CacheItem<T> {
  item: T;
  timestamp: Date;
}
export interface Cache<T> {
  [key: string]: CacheItem<T>;
}
export interface Headers {
  [key: string]: any;
}
export interface HttpRequest {
  get<T>(url: string, options?: {headers?: Headers}): Promise<T>;
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
    return this.httpRequest.get<YoutubeListResult<ListItem<string, ChannelSnippet, ChannelDetail>>>(url).then(res => fromYoutubeChannels(res));
  }
  getChannel(id: string): Promise<Channel> {
    const c = this.channelCache[id];
    if (c) {
      return Promise.resolve(c.item);
    } else {
      return this.getChannels([id]).then(res => {
        const channel = res && res.length > 0 ? res[0] : null;
        if (channel) {
          this.channelCache[id] = {item: channel, timestamp: new Date()};
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
          this.playlistCache[id] = {item: playlist, timestamp: new Date()};
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
    return this.httpRequest.get<YoutubeListResult<ListItem<string, PlaylistVideoSnippet, VideoItemDetail>>>(url).then(res => fromYoutubePlaylist(res));
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
    return this.httpRequest.get<YoutubeListResult<ListItem<string, VideoSnippet, YoutubeVideoDetail>>>(url).then(res => fromYoutubeVideos(res));
  }
  getPopularVideosByRegion(regionCode?: string, max?: number, nextPageToken?: string): Promise<ListResult<Video>> {
    return this.getPopularVideos(regionCode, undefined, max, nextPageToken);
  }
  getPopularVideosByCategory(videoCategoryId?: string, max?: number, nextPageToken?: string): Promise<ListResult<Video>> {
    return this.getPopularVideos(undefined, videoCategoryId, max, nextPageToken);
  }
  getVideos(ids: string[], noSnippet?: boolean): Promise<Video[]> {
    if (!ids || ids.length === 0) {
      return Promise.resolve([]);
    }
    const strSnippet = (noSnippet ? '' : 'snippet,');
    const url = `https://www.googleapis.com/youtube/v3/videos?key=${this.key}&part=${strSnippet}contentDetails&id=${ids.join(',')}`;
    return this.httpRequest.get<YoutubeListResult<ListItem<string, VideoSnippet, YoutubeVideoDetail>>>(url).then(res => {
      const r = fromYoutubeVideos(res);
      if (!r || !r.list) {
        return[];
      }
      return r.list;
    });
  }
  getVideo(id: string, noSnippet?: boolean): Promise<Video> {
    return this.getVideos([id], noSnippet).then(res => res && res.length > 0 ? res[0] : null);
  }
  getCommentThreads(videoId: string, sort?: string, max?: number, nextPageToken?: string): Promise<ListResult<CommentThead>> {
    const orderParam = (sort === 'relevance' ? `&order=${sort}` : '');
    const maxResults = (max && max > 0 ? max : 20); // maximum is 50
    const pageToken = (nextPageToken ? `&pageToken=${nextPageToken}` : '');
    const url = `https://www.googleapis.com/youtube/v3/commentThreads?key=${this.key}&videoId=${videoId}${orderParam}&maxResults=${maxResults}${pageToken}&part=snippet`;
    return this.httpRequest.get<YoutubeListResult<ListItem<string, TopLevelCommentSnippet, any>>>(url).then(res => fromYoutubeCommentThreads(res));
  }
  getComments(id: string, max?: number, nextPageToken?: string): Promise<ListResult<Comment>> {
    const maxResults = (max && max > 0 ? max : 20); // maximum is 50
    const pageToken = (nextPageToken ? `&pageToken=${nextPageToken}` : '');
    const url = `https://www.googleapis.com/youtube/v3/comments?key=${this.key}&parentId=${id}&maxResults=${maxResults}${pageToken}&part=snippet`;
    return this.httpRequest.get<YoutubeListResult<ListItem<string, CommentSnippet, any>>>(url).then(res => fromYoutubeComments(res));
  }
  search(sm: ItemSM, max?: number, nextPageToken?: string|number): Promise<ListResult<Item>> {
    const searchType = sm.type ? `&type=${sm.type}` : '';
    const searchDuration = sm.type === 'video' && (sm.videoDuration === 'long' || sm.videoDuration === 'medium' || sm.videoDuration === 'short') ? `&videoDuration=${sm.videoDuration}` : '';
    const searchOrder = (sm.order === 'date' || sm.order === 'rating' || sm.order === 'title' || sm.order === 'videoCount' || sm.order === 'viewCount' ) ? `&order=${sm.order}` : '';
    const regionParam = (sm.regionCode && sm.regionCode.length > 0 ? `&regionCode=${sm.regionCode}` : '');
    const pageToken = (nextPageToken ? `&pageToken=${nextPageToken}` : '');
    const maxResults = (max && max > 0 ? max : 50); // maximum is 50
    const url = `https://www.googleapis.com/youtube/v3/search?key=${this.key}&part=snippet${regionParam}&q=${sm.keyword}&maxResults=${maxResults}${searchType}${searchDuration}${searchOrder}${pageToken}`;
    return this.httpRequest.get<YoutubeListResult<ListItem<SearchId, SearchSnippet, any>>>(url).then(res => fromYoutubeSearch(res));
  }
  searchVideos(sm: ItemSM, max?: number, nextPageToken?: string|number): Promise<ListResult<Item>> {
    sm.type = 'video';
    return this.search(sm, max, nextPageToken);
  }
  searchPlaylists?(sm: PlaylistSM, max?: number, nextPageToken?: string|number): Promise<ListResult<Playlist>> {
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
      return {list, total: res.total, limit: res.limit, nextPageToken: res.nextPageToken};
    });
  }
  searchChannels?(sm: ChannelSM, max?: number, nextPageToken?: string|number): Promise<ListResult<Channel>> {
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
      return {list, total: res.total, limit: res.limit, nextPageToken: res.nextPageToken};
    });
  }
  getRelatedVideos(videoId: string, max?: number, nextPageToken?: string): Promise<ListResult<Item>> {
    const maxResults = (max && max > 0 ? max : 12);
    const pageToken = (nextPageToken ? `&pageToken=${nextPageToken}` : '');
    const url = `https://youtube.googleapis.com/youtube/v3/search?key=${this.key}&relatedToVideoId=${videoId}&type=video&maxResults=${maxResults}${pageToken}&part=snippet`;
    return this.httpRequest.get<YoutubeListResult<ListItem<SearchId, SearchSnippet, any>>>(url).then(res => fromYoutubeSearch(res));
  }
}
export function fromYoutubeCategories(res: YoutubeListResult<ListItem<string, CategorySnippet, any>>): VideoCategory[] {
  return res.items.filter(i => i.snippet).map(item => {
    const snippet = item.snippet;
    const i: VideoCategory = {
      id: item.id,
      title: snippet.title,
      assignable: snippet.assignable,
      channelId: snippet.channelId
    };
    return i;
  });
}
export function fromYoutubeChannels(res: YoutubeListResult<ListItem<string, ChannelSnippet, ChannelDetail>>): Channel[] {
  return res.items.filter(i => i.snippet).map(item => {
    const snippet = item.snippet;
    const thumbnails = snippet.thumbnails;
    const i: Channel = {
      id: item.id,
      title: snippet.title,
      description: snippet.description,
      publishedAt: new Date(snippet.publishedAt),
      customUrl: snippet.customUrl,
      country: snippet.country,
      localizedTitle: snippet.localized ? snippet.localized.title : '',
      localizedDescription: snippet.localized ? snippet.localized.description : '',
      thumbnail: thumbnails.default ? thumbnails.default.url : '',
      mediumThumbnail: thumbnails.medium ? thumbnails.medium.url : '',
      highThumbnail: thumbnails.high ? thumbnails.high.url : '',
    };
    if (item.contentDetails && item.contentDetails.relatedPlaylists) {
      const r = item.contentDetails.relatedPlaylists;
      i.likes =  r.likes;
      i.favorites = r.favorites;
      i.uploads = r.uploads;
    }
    return i;
  });
}
export function fromYoutubePlaylists(res: YoutubeListResult<ListItem<string, PlaylistSnippet, ListDetail>>): ListResult<Playlist> {
  const list = res.items.filter(i => i.snippet).map(item => {
    const snippet = item.snippet;
    const thumbnails = snippet.thumbnails;
    const i: Playlist = {
      id: item.id,
      title: snippet.title,
      localizedTitle: snippet.localized ? snippet.localized.title : '',
      localizedDescription: snippet.localized ? snippet.localized.description : '',
      description: snippet.description,
      publishedAt: new Date(snippet.publishedAt),
      channelId: snippet.channelId,
      channelTitle: snippet.channelTitle,
      thumbnail: thumbnails.default ? thumbnails.default.url : '',
      mediumThumbnail: thumbnails.medium ? thumbnails.medium.url : '',
      highThumbnail: thumbnails.high ? thumbnails.high.url : '',
      standardThumbnail: thumbnails.standard ? thumbnails.standard.url : '',
      maxresThumbnail: thumbnails.maxres ? thumbnails.maxres.url : '',
      count: item.contentDetails ? item.contentDetails.itemCount : 0
    };
    return i;
  });
  return {list, total: res.pageInfo.totalResults, limit: res.pageInfo.resultsPerPage, nextPageToken: res.nextPageToken};
}
export function fromYoutubePlaylist(res: YoutubeListResult<ListItem<string, PlaylistVideoSnippet, VideoItemDetail>>): ListResult<PlaylistVideo> {
  const list = res.items.filter(i => i.snippet).map(item => {
    const snippet = item.snippet;
    const thumbnails = snippet.thumbnails;
    const content = item.contentDetails;
    const i: PlaylistVideo = {
      title: snippet.title ? snippet.title : '',
      description: snippet.description ? snippet.description : '',
      localizedTitle: snippet.localized ? snippet.localized.title : '',
      localizedDescription: snippet.localized ? snippet.localized.description : '',
      channelId: snippet.channelId ? snippet.channelId : '',
      channelTitle: snippet.channelTitle ? snippet.channelTitle : '',
      thumbnail: thumbnails.default ? thumbnails.default.url : '',
      mediumThumbnail: thumbnails.medium ? thumbnails.medium.url : '',
      highThumbnail: thumbnails.high ? thumbnails.high.url : '',
      standardThumbnail: thumbnails.standard ? thumbnails.standard.url : '',
      maxresThumbnail: thumbnails.maxres ? thumbnails.maxres.url : '',
      id: content ? content.videoId : '',
      publishedAt: content ? new Date(content.videoPublishedAt) : undefined,
      playlistId: snippet.playlistId ? snippet.playlistId : '',
      position: snippet.position ? snippet.position : 0,
      videoOwnerChannelId: snippet.videoOwnerChannelId ? snippet.videoOwnerChannelId : '',
      videoOwnerChannelTitle: snippet.videoOwnerChannelTitle ? snippet.videoOwnerChannelTitle : ''
    };
    return i;
  });
  return {list, total: res.pageInfo.totalResults, limit: res.pageInfo.resultsPerPage, nextPageToken: res.nextPageToken};
}
export function fromYoutubeSearch(res: YoutubeListResult<ListItem<SearchId, SearchSnippet, any>>): ListResult<Item> {
  const list = res.items.filter(i => i.snippet).map(item => {
    const snippet = item.snippet;
    const thumbnails = snippet.thumbnails;
    const i: Item = {
      title: snippet.title ? snippet.title : '',
      description: snippet.description ? snippet.description : '',
      publishedAt: new Date(snippet.publishedAt),
      channelId: snippet.channelId ? snippet.channelId : '',
      channelTitle: snippet.channelTitle ? snippet.channelTitle : '',
      thumbnail: thumbnails.default ? thumbnails.default.url : '',
      mediumThumbnail: thumbnails.medium ? thumbnails.medium.url : '',
      highThumbnail: thumbnails.high ? thumbnails.high.url : '',
      liveBroadcastContent: snippet.liveBroadcastContent,
      publishTime: new Date(snippet.publishTime),
    };
    const id = item.id;
    if (id) {
      if (id.videoId) {
        i.id = id.videoId;
        i.kind = 'video';
      } else if (id.channelId) {
        i.id = id.channelId;
        i.kind = 'channel';
      } else if (id.playlistId) {
        i.id = id.playlistId;
        i.kind = 'playlist';
      }
    }
    return i;
  });
  return {list, total: res.pageInfo.totalResults, limit: res.pageInfo.resultsPerPage, nextPageToken: res.nextPageToken};
}
export function fromYoutubeVideos(res: YoutubeListResult<ListItem<string, VideoSnippet, YoutubeVideoDetail>>): ListResult<Video> {
  const list = res.items.map(item => {
    const snippet = item.snippet;
    const content = item.contentDetails;
    if (snippet) {
      const thumbnails = snippet.thumbnails;
      const i: Video = {
        id: item.id,
        title: snippet.title,
        publishedAt: new Date(snippet.publishedAt),
        description: snippet.description,
        localizedTitle: snippet.localized ? snippet.localized.title : '',
        localizedDescription: snippet.localized ? snippet.localized.description : '',
        channelId: snippet.channelId,
        channelTitle: snippet.channelTitle,
        thumbnail: thumbnails.default ? thumbnails.default.url : '',
        mediumThumbnail: thumbnails.medium ? thumbnails.medium.url : '',
        highThumbnail: thumbnails.high ? thumbnails.high.url : '',
        standardThumbnail: thumbnails.standard ? thumbnails.standard.url : '',
        maxresThumbnail: thumbnails.maxres ? thumbnails.maxres.url : '',
        tags: snippet.tags,
        categoryId: snippet.categoryId,
        liveBroadcastContent: snippet.liveBroadcastContent,
        defaultLanguage: snippet.defaultLanguage,
        defaultAudioLanguage: snippet.defaultAudioLanguage,
        duration: calculateDuration(content.duration),
        dimension: content.dimension,
        definition: content.definition === 'hd' ? 5 : 4,
        caption: content.caption === 'true' ? true : undefined,
        licensedContent: content.licensedContent,
        projection: content.projection === 'rectangular' ? undefined : 'p'
      };
      return i;
    } else {
      const i: Video = {
        id: item.id,
        duration: calculateDuration(content.duration),
        dimension: content.dimension,
        definition: content.definition === 'hd' ? 5 : 4,
        caption: content.caption === 'true' ? true : undefined,
        licensedContent: content.licensedContent,
        projection: content.projection === 'rectangular' ? undefined : 'p'
      };
      return i;
    }
  });
  return {list, total: res.pageInfo.totalResults, limit: res.pageInfo.resultsPerPage, nextPageToken: res.nextPageToken};
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
  return {list, total: res.pageInfo.totalResults, limit: res.pageInfo.resultsPerPage, nextPageToken: res.nextPageToken};
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
  return {list, total: res.pageInfo.totalResults, limit: res.pageInfo.resultsPerPage, nextPageToken: res.nextPageToken};
}

export function calculateDuration(d: string): number {
  if (!d) {
    return 0;
  }
  const k = d.split('M');
  if (k.length < 2) {
    return 0;
  }
  const a = k[1].substr(0, k[1].length - 1);
  const x = k[0].split('H');
  const b = (x.length === 1 ? k[0].substr(2) : x[1]);
  if (!isNaN(a as any) && !isNaN(b as any)) {
    const a1 = parseFloat(a);
    const a2 = parseFloat(b);
    if (x.length === 1) {
      return a2 * 60 + a1;
    } else {
      const c = x[0].substr(2);
      if (!isNaN(c as any)) {
        const a3 = parseFloat(c);
        return a3 * 3600 + a2 * 60 + a1;
      } else {
        return 0;
      }
    }
  }
  return 0;
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

export class DefaultSyncService implements SyncService {
  constructor(private client: SyncClient, private repo: SyncRepository) {
    this.syncChannel = this.syncChannel.bind(this);
    this.syncChannels = this.syncChannel.bind(this);
    this.syncPlaylist = this.syncPlaylist.bind(this);
    this.syncPlaylists = this.syncPlaylists.bind(this);
  }
  syncChannel(channelId: string): Promise<number> {
    return syncChannel(channelId, this.client, this.repo);
  }
  syncChannels(channelIds: string[]): Promise<number> {
    return syncChannels(channelIds, this.client, this.repo);
  }
  syncPlaylist(playlistId: string, level?: number): Promise<number> {
    const syncVideos = level && level < 2 ? false : true;
    return syncPlaylist(playlistId, syncVideos, this.client, this.repo);
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
export async function syncChannel(channelId: string, client: SyncClient, repo: SyncRepository): Promise<number> {
  return repo.getChannelSync(channelId).then(channelSync => {
    const res = client.getChannel(channelId).then(channel => {
      if (!channel) {
        return Promise.resolve(0);
      } else {
        return checkAndSyncUploads(channel, channelSync, client, repo);
      }
    });
    return res;
  });
}
export function checkAndSyncUploads(channel: Channel, channelSync: ChannelSync, client: SyncClient, repo: SyncRepository): Promise<number> {
  if (!channel.uploads || channel.uploads.length === 0) {
    return Promise.resolve(0);
  } else {
    const date = new Date();
    const timestamp = channelSync ? channelSync.timestamp : undefined;
    const syncVideos = (!channelSync || (channelSync && channelSync.level && channelSync.level >= 2)) ? true : false;
    const syncCollection = (!channelSync || (channelSync && channelSync.level && channelSync.level >= 1)) ? true : false;
    syncUploads(channel.uploads, client, repo, timestamp).then(r => {
      channel.timestamp = r.timestamp;
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
          return repo.saveChannelSync({id: channel.id, timestamp: date, uploads: channel.uploads});
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
export async function syncPlaylist(playlistId: string, syncVideos: boolean, client: SyncClient, repo: SyncRepository): Promise<number> {
  const res = await syncPlaylistVideos(playlistId, syncVideos, client, repo);
  const playlist = await client.getPlaylist(playlistId);
  playlist.itemCount = playlist.count;
  playlist.count = res.count;
  await repo.savePlaylist(playlist);
  await repo.savePlaylistVideos(playlistId, res.videos);
  return res.success;
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
export function saveVideos(newVideos: PlaylistVideo[], getVideos?: (ids: string[], noSnippet?: boolean) => Promise<Video[]>, repo?: SyncRepository): Promise<number> {
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
export function getNewVideos(videos: PlaylistVideo[], lastSynchronizedTime?: Date): PlaylistVideo[] {
  if (!lastSynchronizedTime) {
    return videos;
  }
  const timestamp = addSeconds(lastSynchronizedTime, -1800);
  const time = timestamp.getTime();
  const newVideos: PlaylistVideo[] = [];
  for (const i of videos) {
    if (i.publishedAt.getTime() >= time) {
      newVideos.push(i);
    } else {
      return newVideos;
    }
  }
  return newVideos;
}
export function addSeconds(date: Date, number: number): Date {
  const newDate = new Date(date);
  newDate.setSeconds(newDate.getSeconds() + number);
  return newDate;
}
export function notIn(ids: string[], subIds: string[], nosort?: boolean) {
  if (nosort) {
    const newIds: string[] = [];
    for (const id of ids) {
      if (!subIds.includes(id)) {
        newIds.push(id);
      }
    }
    return newIds;
  } else {
    const newIds: string[] = [];
    for (const id of ids) {
      const i = binarySearch(subIds, id);
      if (i < 0) {
        newIds.push(id);
      }
    }
    return newIds;
  }
}
export function binarySearch<T>(items: T[], value: T) {
  let startIndex = 0;
  let stopIndex = items.length - 1;
  let middle = Math.floor((stopIndex + startIndex) / 2);

  while (items[middle] !== value && startIndex < stopIndex) {
    // adjust search area
    if (value < items[middle]) {
      stopIndex = middle - 1;
    } else if (value > items[middle]) {
      startIndex = middle + 1;
    }
    // recalculate middle
    middle = Math.floor((stopIndex + startIndex) / 2);
  }
  // make sure it's the right value
  return (items[middle] !== value) ? -1 : middle;
}
