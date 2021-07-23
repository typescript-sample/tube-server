import {Channel, ListResult, Playlist, PlaylistVideo, Video, VideoCategory} from './models';

export interface ChannelSync {
  id: string;
  uploads?: string;
  syncTime?: Date;
  level?: number;
}
export interface PlaylistCollection {
  id: string;
  videos: string[];
}
export interface CategoryCollection {
  id: string;
  data: VideoCategory[];
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
  getVideos(ids: string[]): Promise<Video[]>;
}
export interface SyncService {
  syncChannel(channelId: string): Promise<number>;
  syncChannels(channelIds: string[]): Promise<number>;
  syncPlaylist(playlistId: string, level?: number): Promise<number>;
  syncPlaylists(playlistIds: string[], level?: number): Promise<number>;
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
