import {Comment, CommentSnippet, CommentThead, TopLevelCommentSnippet} from './comment';
import {CategorySnippet, Channel, ChannelDetail, ChannelSnippet, Item, ItemSM, ListDetail, ListItem, ListResult, Playlist, PlaylistSnippet, PlaylistVideo, PlaylistVideoSnippet, SearchId, SearchSnippet, Video, VideoCategory, VideoItemDetail, VideoSnippet, YoutubeListResult, YoutubeVideoDetail} from './models';
export * from './models';
export * from './comment';

export interface ChannelSync {
  id: string;
  uploads?: string;
  timestamp?: Date;
}
export interface PlaylistCollection {
  id: string;
  videos: string[];
}
export interface SyncService {
  sync(id: string): Promise<Date>;
  syncPlaylistVideo(id: string, timestamp?: Date): Promise<number>;
  syncPlaylists(ids: string[], timestamp?: Date): Promise<number>;
}
export interface VideoService {
  getCagetories(regionCode?: string): Promise<VideoCategory[]>;
  getChannels(ids: string[]): Promise<Channel[]>;
  getChannel(id: string): Promise<Channel>;
  getPlaylists(ids: string[]): Promise<ListResult<Playlist>>;
  getPlaylist(id: string): Promise<Playlist>;
  getChannelPlaylists(channelId: string, max?: number, nextPageToken?: string): Promise<ListResult<Playlist>>;
  getChannelVideos(channelId: string, max?: number, nextPageToken?: string): Promise<ListResult<PlaylistVideo>>;
  getPlaylistVideos(playlistId: string, max?: number, nextPageToken?: string): Promise<ListResult<PlaylistVideo>>;
  getPopularVideos(regionCode?: string, videoCategoryId?: string, max?: number, nextPageToken?: string): Promise<ListResult<Video>>;
  getPopularVideosByRegion(regionCode?: string, max?: number, nextPageToken?: string): Promise<ListResult<Video>>;
  getPopularVideosByCategory(videoCategoryId?: string, max?: number, nextPageToken?: string): Promise<ListResult<Video>>;
  getVideos(ids: string[], noSnippet?: boolean): Promise<Video[]>;
  getVideo(id: string, noSnippet?: boolean): Promise<Video>;
  /**
   * @param videoId
   * @param order relevance, time (default)
   * @param nextPageToken
   */
  getCommentThreads(videoId: string, order?: string, max?: number, nextPageToken?: string): Promise<ListResult<CommentThead>>;
  getComments(id: string, max?: number, nextPageToken?: string): Promise<ListResult<Comment>>;
  search(sm: ItemSM, max?: number, nextPageToken?: string): Promise<ListResult<Item>>;
  getRelatedVideos(videoId: string, max?: number, nextPageToken?: string): Promise<ListResult<Item>>;
}

export interface Headers {
  [key: string]: any;
}
export interface HttpRequest {
  get<T>(url: string, options?: {headers?: Headers}): Promise<T>;
}
export class YoutubeClient implements VideoService {
  constructor(private key: string, private httpRequest: HttpRequest) {
    this.getCagetories = this.getCagetories.bind(this);
    this.getChannels = this.getChannels.bind(this);
    this.getChannel = this.getChannel.bind(this);
    this.getPlaylists = this.getPlaylists.bind(this);
    this.getPlaylist = this.getPlaylist.bind(this);
    this.getChannelPlaylists = this.getChannelPlaylists.bind(this);
    this.getPlaylistVideos = this.getPlaylistVideos.bind(this);
    this.getChannelVideos = this.getChannelVideos.bind(this);
    this.getPopularVideos = this.getPopularVideos.bind(this);
    this.getPopularVideosByRegion = this.getPopularVideosByRegion.bind(this);
    this.getPopularVideosByCategory = this.getPopularVideosByCategory.bind(this);
    this.getVideos = this.getVideos.bind(this);
    this.getVideo = this.getVideo.bind(this);
    this.getCommentThreads = this.getCommentThreads.bind(this);
    this.getComments = this.getComments.bind(this);
    this.search = this.search.bind(this);
    this.getRelatedVideos = this.getRelatedVideos.bind(this);
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
    return this.getChannels([id]).then(res => res && res.length > 0 ? res[0] : null);
  }
  getPlaylists(ids: string[]): Promise<ListResult<Playlist>> {
    const url = `https://youtube.googleapis.com/youtube/v3/playlists?key=${this.key}&id=${ids.toString()}&part=snippet,contentDetails`;
    return this.httpRequest.get<YoutubeListResult<ListItem<string, PlaylistSnippet, ListDetail>>>(url).then(res => fromYoutubePlaylists(res));
  }
  getPlaylist(id: string): Promise<Playlist> {
    return this.getPlaylists([id]).then(res => res && res.total > 0 ? res.list[0] : null);
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
    /*
    const maxResults = (max && max > 0 ? max : 10);
    const pageToken = (nextPageToken ? `&pageToken=${nextPageToken}` : '');
    const url = `https://youtube.googleapis.com/youtube/v3/search?key=${this.key}&channelId=${channelId}&type=video&regionCode=VN&maxResults=${maxResults}${pageToken}&part=snippet`;
    return this.httpRequest.get<YoutubeListResult<ListItem<PlaylistVideoSnippet, VideoItemDetail>>>(url).then(res => fromYoutubePlaylist(res));
    */
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
    return this.httpRequest.get<YoutubeListResult<ListItem<string, VideoSnippet, YoutubeVideoDetail>>>(url)
      .then(res => {
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
  search(sm: ItemSM, max?: number, nextPageToken?: string): Promise<ListResult<Item>> {
    const searchType = sm.type ? `&type=${sm.type}` : '';
    const searchDuration = sm.type === 'video' && (sm.videoDuration === 'long' || sm.videoDuration === 'medium' || sm.videoDuration === 'short') ? `&videoDuration=${sm.videoDuration}` : '';
    const searchOrder = (sm.order === 'date' || sm.order === 'rating' || sm.order === 'title' || sm.order === 'videoCount' || sm.order === 'viewCount' ) ? `&order=${sm.order}` : '';
    const regionParam = (sm.regionCode && sm.regionCode.length > 0 ? `&regionCode=${sm.regionCode}` : '');
    const pageToken = (nextPageToken ? `&pageToken=${nextPageToken}` : '');
    const maxResults = (max && max > 0 ? max : 50); // maximum is 50
    const url = `https://www.googleapis.com/youtube/v3/search?key=${this.key}&part=snippet${regionParam}&q=${sm.keyword}&maxResults=${maxResults}${searchType}${searchDuration}${searchOrder}${pageToken}`;
    return this.httpRequest.get<YoutubeListResult<ListItem<SearchId, SearchSnippet, any>>>(url).then(res => fromYoutubeSearch(res));
  }
  getRelatedVideos(videoId: string, max?: number, nextPageToken?: string): Promise<ListResult<Item>> {
    const maxResults = (max && max > 0 ? max : 10);
    const pageToken = (nextPageToken ? `&pageToken=${nextPageToken}` : '');
    const url = `https://youtube.googleapis.com/youtube/v3/search?key=${this.key}&relatedToVideoId=${videoId}&type=video&regionCode=VN&maxResults=${maxResults}${pageToken}&part=snippet`;
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
      itemCount: item.contentDetails ? item.contentDetails.itemCount : 0
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
