import {CategorySnippet, Channel, ChannelDetail, ChannelSnippet, ChannelSubscriptions, ListDetail, ListItem, ListResult, Playlist, PlaylistSnippet, PlaylistVideo, PlaylistVideoSnippet, StringMap, SubscriptionSnippet, Thumbnail, Title, Video, VideoCategory, VideoItemDetail, VideoSnippet, YoutubeListResult, YoutubeVideoDetail} from './models';
import {HttpRequest} from './service';
import {ChannelSync, getNewVideos, notIn, SyncClient, SyncRepository, SyncService} from './sync';
import {fromYoutubeCategories, fromYoutubeChannels, fromYoutubePlaylist, fromYoutubePlaylists, fromYoutubeSubscriptions, fromYoutubeVideos} from './youtube';
export * from './metadata';
export * from './models';
export * from './comment';
export * from './service';
export * from './youtube';
export * from './sync';

export function getLimit(limit?: number, d?: number): number {
  if (limit) {
    return limit;
  }
  if (d && d > 0) {
    return d;
  }
  return 48;
}
export class CategoryClient {
  constructor(private key: string, private httpRequest: HttpRequest) {
    this.getCagetories = this.getCagetories.bind(this);
  }
  getCagetories(regionCode?: string): Promise<VideoCategory[]> {
    if (!regionCode) {
      regionCode = 'US';
    }
    const url = `https://www.googleapis.com/youtube/v3/videoCategories?key=${this.key}&regionCode=${regionCode}`;
    return this.httpRequest.get<YoutubeListResult<ListItem<string, CategorySnippet, any>>>(url).then(res => fromYoutubeCategories(res));
  }
}
export class YoutubeSyncClient implements SyncClient {
  constructor(private key: string, private httpRequest: HttpRequest, private compress?: boolean) {
    this.getChannels = this.getChannels.bind(this);
    this.getChannel = this.getChannel.bind(this);
    this.getChannelPlaylists = this.getChannelPlaylists.bind(this);
    this.getPlaylists = this.getPlaylists.bind(this);
    this.getPlaylist = this.getPlaylist.bind(this);
    this.getPlaylistVideos = this.getPlaylistVideos.bind(this);
    this.getVideos = this.getVideos.bind(this);
    this.getSubscriptions = this.getSubscriptions.bind(this);
  }
  private getChannels(ids: string[]): Promise<Channel[]> {
    const url = `https://www.googleapis.com/youtube/v3/channels?key=${this.key}&id=${ids.join(',')}&part=snippet,contentDetails`;
    return this.httpRequest.get<YoutubeListResult<ListItem<string, ChannelSnippet, ChannelDetail>>>(url).then(res => formatThumbnail(fromYoutubeChannels(res)));
  }
  getSubscriptions(channelId: string): Promise<ChannelSubscriptions> {
    return getSubcriptionsFromYoutube(this.httpRequest, this.key, channelId);
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
    const part = '&part=contentDetails'; // compress ? '&part=contentDetails' : '&part=snippet,contentDetails';
    const url = `https://youtube.googleapis.com/youtube/v3/playlistItems?key=${this.key}&playlistId=${playlistId}&maxResults=${maxResults}${pageToken}${part}`;
    return this.httpRequest.get<YoutubeListResult<ListItem<string, PlaylistVideoSnippet, VideoItemDetail>>>(url).then(res => {
      const r = fromYoutubePlaylist(res, true);
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
      const r = fromYoutubeVideos(res, this.compress);
      if (!r || !r.list) {
        return [];
      }
      return r.list;
    });
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
        return client.getSubscriptions(channel.id).then(sub => {
          if (sub) {
            channel.channels = sub.data;
          }
          return repo.saveChannel(channel).then(c => {
            return repo.saveChannelSync({ id: channel.id, syncTime: date, uploads: channel.uploads });
          });
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
export function saveVideos(newVideos: PlaylistVideo[], getVideos?: (ids: string[], fields?: string[]) => Promise<Video[]>, repo?: SyncRepository): Promise<number> {
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
export function getSubcriptions(httpRequest: HttpRequest, key: string, channelId?: string, mine?: boolean, max?: number, nextPageToken?: string | number): Promise<ListResult<Channel>> {
  const maxResults = (max && max > 0 ? max : 4);
  const pageToken = (nextPageToken ? `&pageToken=${nextPageToken}` : '');
  const mineStr = (mine ? `&mine=${mine}` : '');
  const channel = (channelId && channelId.length > 0) ? `&channelId=${channelId}` : '';
  const url = `https://youtube.googleapis.com/youtube/v3/subscriptions?key=${key}${mineStr}${channel}&maxResults=${maxResults}${pageToken}&part=snippet`;
  return httpRequest.get<YoutubeListResult<ListItem<string, SubscriptionSnippet, ChannelDetail>>>(url).then(res => {
    const r: ListResult<Channel> = {
      list:  fromYoutubeSubscriptions(res),
      nextPageToken: res.nextPageToken,
    };
    return r;
  });
}
export async function getSubcriptionsFromYoutube(httpRequest: HttpRequest, key: string, channelId: string): Promise<ChannelSubscriptions> {
  const channelIds: string[] = [];
  let nextPageToken = '';
  let count = 0;
  let allChannelCount = 0;
  try {
    while (nextPageToken !== undefined) {
      const subscriptions = await getSubcriptions(httpRequest, key, channelId, undefined, 2, nextPageToken);
      count = count + subscriptions.list.length;
      for (const p of subscriptions.list) {
        channelIds.push(p.id);
        allChannelCount = allChannelCount + p.count;
      }
      nextPageToken = subscriptions.nextPageToken;
    }
    const channelSubscriptions: ChannelSubscriptions = {
      id: channelId,
      data: channelIds
    };
    return channelSubscriptions;
  } catch (err) {
    if (err) {
      const channelSubscriptions: ChannelSubscriptions = {
        id: channelId,
        data: []
      };
      return channelSubscriptions;
    }
  }
}
