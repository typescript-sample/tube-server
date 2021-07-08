import {
  Channel,
  ChannelSync,
  notIn,
  PlaylistVideo,
  SyncClient,
  SyncRepository,
  SyncService,
  Video,
} from '../video-plus';

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

export function syncChannels(
  channelIds: string[],
  client: SyncClient,
  repo: SyncRepository
): Promise<number> {
  const promises = channelIds.map((channelId) =>
    syncChannel(channelId, client, repo)
  );
  let sum = 0;
  return Promise.all(promises).then((res) => {
    for (const num of res) {
      sum = sum + num;
    }
    return sum;
  });
}

export async function syncChannel(
  channelId: string,
  client: SyncClient,
  repo: SyncRepository
): Promise<number> {
  return repo.getChannelSync(channelId).then((channelSync) => {
    const res = client.getChannel(channelId).then((channel) => {
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
    const syncVideos = channelSync && channelSync.level && channelSync.level >= 2 ? true : false;
    const syncCollection = ((!channelSync || (channelSync && channelSync.level && channelSync.level >= 1)) ? true : false);
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
        return repo.saveChannel(channel).then(() => {
          return repo.saveChannelSync({id: channel.id, timestamp: date, uploads: channel.uploads});
        });
      });
    });
  }
}

export function syncPlaylists(playlistIds: string[], syncVideos: boolean, client: SyncClient, repo: SyncRepository): Promise<number> {
  const promises = playlistIds.map(playlistId => syncPlaylist(playlistId, syncVideos, client, repo));
  let sum = 0;
  return Promise.all(promises).then((res) => {
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
    const promises = playlistIds.map(id => syncPlaylistVideos(id, syncVideos, client, repo).then((r) => repo.savePlaylistVideos(id, r.videos)));
    return Promise.all(promises).then((res) => {
      for (const num of res) {
        sum = sum + num;
      }
      return sum;
    });
  } else {
    const promises = playlistIds.map(id => syncPlaylistVideos(id, syncVideos, client, repo));
    return Promise.all(promises).then((res) => {
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
export async function syncChannelPlaylists(
  channelId: string,
  syncVideos: boolean,
  saveCollection: boolean,
  client: SyncClient,
  repo: SyncRepository
): Promise<PlaylistResult> {
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
export async function syncPlaylistVideos(
  playlistId: string,
  syncVideos: boolean,
  client: SyncClient,
  repo: SyncRepository
): Promise<VideoResult> {
  let nextPageToken = '';
  let success = 0;
  let count = 0;
  let all = 0;
  let newVideoIds: string[] = [];
  while (nextPageToken !== undefined) {
    const playlistVideos = await client.getPlaylistVideos(
      playlistId,
      50,
      nextPageToken
    );
    all = playlistVideos.total;
    count = count + playlistVideos.list.length;
    const videoIds = playlistVideos.list.map((item) => item.id);
    newVideoIds = newVideoIds.concat(videoIds);
    const getVideos = syncVideos ? client.getVideos : undefined;
    const r = await saveVideos(playlistVideos.list, getVideos, repo);
    success = success + r;
    nextPageToken = playlistVideos.nextPageToken;
  }
  return { success, count, all, videos: newVideoIds };
}
export async function syncUploads(
  uploads: string,
  client: SyncClient,
  repo: SyncRepository,
  timestamp?: Date
): Promise<VideoResult> {
  let nextPageToken = '';
  let success = 0;
  let count = 0;
  let all = 0;
  let last: Date;
  while (nextPageToken !== undefined) {
    const playlistVideos = await client.getPlaylistVideos(
      uploads,
      50,
      nextPageToken
    );
    all = playlistVideos.total;
    count = count + playlistVideos.list.length;
    if (!last && playlistVideos.list.length > 0) {
      last = playlistVideos.list[0].publishedAt;
    }
    const newVideos = getNewVideos(playlistVideos.list, timestamp);
    nextPageToken =
      playlistVideos.list.length > newVideos.length
        ? undefined
        : playlistVideos.nextPageToken;
    const r = await saveVideos(newVideos, client.getVideos, repo);
    success = success + r;
  }
  return { count: success, all, timestamp: last };
}
export function saveVideos(
  newVideos: PlaylistVideo[],
  getVideos?: (ids: string[], noSnippet?: boolean) => Promise<Video[]>,
  repo?: SyncRepository
): Promise<number> {
  if (!newVideos || newVideos.length === 0) {
    return Promise.resolve(0);
  } else {
    if (!repo || !getVideos) {
      return Promise.resolve(newVideos.length);
    } else {
      const videoIds = newVideos.map((item) => item.id);
      const res = repo.getVideoIds(videoIds).then((ids) => {
        const newIds = notIn(videoIds, ids);
        if (newIds.length === 0) {
          return Promise.resolve(0);
        } else {
          return getVideos(newIds).then((videos) => {
            if (videos && videos.length > 0) {
              return repo.saveVideos(videos).then((r) => videos.length);
            } else {
              return Promise.resolve(0);
            }
          });
        }
      });
      return res;
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
