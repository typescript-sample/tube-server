import {
  Channel,
  ChannelSync,
  ListResult,
  notIn,
  Playlist,
  PlaylistCollection,
  PlaylistVideo,
  Video,
} from "../video-plus";
import { SyncService } from "./SyncService";

export interface VideoRepository {
  getChannelSync(channelId: string): Promise<ChannelSync>;
  saveChannel(channel: Channel): Promise<number>;
  savePlaylist(playlist: Playlist): Promise<number>;
  saveChannelSync(channel: ChannelSync): Promise<number>;
  saveVideos(videos: Video[]): Promise<number>;
  getPlaylist(playlistId: string): Promise<Playlist>;
  getPlaylistVideo(playlistId: string): Promise<PlaylistCollection>; // used in sync Uploads
  getPlaylistVideos(playlistId: string): Promise<string[]>;
  savePlaylistVideos(playlistId: string, videos: string[]): Promise<number>;
  getVideoIds(id: string[]): Promise<string[]>;
}

export interface VideoClient {
  getChannel(id: string): Promise<Channel>;
  getPlaylist(id: string): Promise<Playlist>;
  getChannelPlaylists(
    channelId: string,
    max?: number,
    nextPageToken?: string
  ): Promise<ListResult<Playlist>>;
  getPlaylistVideos(
    playlistId: string,
    max?: number,
    nextPageToken?: string
  ): Promise<ListResult<PlaylistVideo>>;
  getVideos(ids: string[], noSnippet?: boolean): Promise<Video[]>;
}

export class DefaultSyncService implements SyncService {
  constructor(private client: VideoClient, private repo: VideoRepository) {
    this.syncChannel = this.syncChannel.bind(this);
    this.syncPlaylist = this.syncPlaylist.bind(this);
  }
  syncChannel(channelId: string): Promise<number> {
    return syncChannel(channelId, this.client, this.repo);
  }
  syncPlaylist(playlistId: string): Promise<number> {
    return syncPlaylist(playlistId, this.client, this.repo);
  }
}

export async function syncChannel(
  channelId: string,
  client: VideoClient,
  repo: VideoRepository
): Promise<number> {
  return repo.getChannelSync(channelId).then((channelSync) => {
    const timestamp = channelSync ? channelSync.timestamp : undefined;
    const res = client.getChannel(channelId).then((channel) => {
      if (!channel) {
        return Promise.resolve(0);
      } else {
        return checkAndSyncUploads(channel, timestamp, client, repo);
      }
    });
    return res;
  });
}
export function checkAndSyncUploads(
  channel: Channel,
  timestamp: Date,
  client: VideoClient,
  repo: VideoRepository
): Promise<number> {
  if (!channel.uploads || channel.uploads.length === 0) {
    return Promise.resolve(0);
  } else {
    const date = new Date();
    syncUploads(channel.uploads, client, repo.saveVideos, timestamp).then(
      (r) => {
        channel.count = r.count;
        channel.itemCount = r.all;
        syncChannelPlaylists(channel.id, client, repo).then(() => {
          return repo.saveChannel(channel).then(() => {
            return repo.saveChannelSync({
              id: channel.id,
              timestamp: date,
              uploads: channel.uploads,
            });
          });
        });
      }
    );
  }
}

export async function syncPlaylist(
  playlistId: string,
  client: VideoClient,
  repo: VideoRepository
): Promise<number> {
  const res = await syncPlaylistVideos(playlistId, client, repo.saveVideos);
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
}
export function syncVideosOfPlaylists(
  playlistIds: string[],
  client: VideoClient,
  repo: VideoRepository
): Promise<number> {
  const promises = playlistIds.map((id) =>
    syncPlaylistVideos(id, client, repo.saveVideos, repo.savePlaylistVideos)
  );
  return Promise.all(promises).then((res) => {
    let sum = 0;
    for (const num of res) {
      sum = sum + num.success;
    }
    return sum;
  });
}
export interface PlaylistResult {
  count?: number;
  all?: number;
}
export async function syncChannelPlaylists(
  channelId: string,
  client: VideoClient,
  repo: VideoRepository
): Promise<PlaylistResult> {
  let nextPageToken = "";
  let count = 0;
  let all = 0;
  while (nextPageToken !== undefined) {
    console.log(channelId);
    const channelPlaylists = await client.getChannelPlaylists(
      channelId,
      50,
      nextPageToken
    );
    all = channelPlaylists.total;
    count = count + channelPlaylists.list.length;
    const playlistIds = channelPlaylists.list.map((item) => item.id);
    nextPageToken = channelPlaylists.nextPageToken;
    await syncVideosOfPlaylists(playlistIds, client, repo);
    // const promise = channelPlaylists.list.map((item) =>
    //   repo.savePlaylist(item)
    // );
    // Promise.all(promise).then((res) => console.log(res));
  }
  return { count, all };
}
export async function syncPlaylistVideos(
  playlistId: string,
  client: VideoClient,
  save: (videos: Video[]) => Promise<number>,
  savePlaylistVideos?: (
    playlistId: string,
    videos: string[]
  ) => Promise<number>,
  timestamp?: Date
): Promise<VideoResult> {
  let nextPageToken = "";
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
    const allVideoIds = playlistVideos.list.map((item) => item.id);
    newVideoIds = newVideoIds.concat(allVideoIds);
    const newVideos = getNewVideos(playlistVideos.list, timestamp);
    const r = await saveVideos(newVideos, client.getVideos, save);
    success = success + r;
    nextPageToken = playlistVideos.nextPageToken;
  }
  return { success, count, all, videos: newVideoIds };
}
export async function syncUploads(
  uploads: string,
  client: VideoClient,
  save: (videos: Video[]) => Promise<number>,
  timestamp?: Date
): Promise<VideoResult> {
  let nextPageToken = "";
  let success = 0;
  let count = 0;
  let all = 0;
  while (nextPageToken !== undefined) {
    const playlistVideos = await client.getPlaylistVideos(
      uploads,
      50,
      nextPageToken
    );
    all = playlistVideos.total;
    count = count + playlistVideos.list.length;
    const newVideos = getNewVideos(playlistVideos.list, timestamp);
    if (playlistVideos.list.length > newVideos.length) {
      nextPageToken = undefined;
    } else {
      nextPageToken = playlistVideos.nextPageToken;
    }
    const r = await saveVideos(newVideos, client.getVideos, save);
    success = success + r;
  }
  return { count: success, all };
}
export function saveVideos(
  newVideos: PlaylistVideo[],
  getVideos: (ids: string[], noSnippet?: boolean) => Promise<Video[]>,
  save: (v: Video[]) => Promise<number>
): Promise<number> {
  if (!newVideos || newVideos.length === 0) {
    return Promise.resolve(0);
  } else {
    const videoIds = newVideos.map((item) => item.id);
    return getVideos(videoIds).then((videos) => {
      if (videos && videos.length > 0) {
        return save(videos).then((r) => videos.length);
      } else {
        return Promise.resolve(0);
      }
    });
  }
}
export function getNewVideos(videos: PlaylistVideo[], channelTimestamp?: Date) {
  if (!channelTimestamp) {
    return videos;
  }
  const timestamp = addSeconds(channelTimestamp, -3600);
  const t = timestamp.getTime();
  const newVideos: PlaylistVideo[] = [];
  for (const i of videos) {
    if (i.publishedAt.getTime() > t) {
      newVideos.push(i);
    } else {
      return newVideos;
    }
  }
  return newVideos;
}
export function addSeconds(date: Date, number: number) {
  const newDate = new Date(date);
  newDate.setSeconds(newDate.getSeconds() + number);
  return newDate;
}
