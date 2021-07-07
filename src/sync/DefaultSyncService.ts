import {
  Channel,
  ChannelSync,
  ListResult,
  Playlist,
  PlaylistCollection,
  PlaylistVideo,
  Video,
} from "video-plus";
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
  savePlaylistVideos?(playlistId: string, videos: string[]): Promise<number>;
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
  const date = new Date();
  let count = 0;
  const channelSync = await repo.getChannelSync(channelId);
  if (!channelSync) {
    const result = await client.getChannel(channelId);
    if (result.id !== result.uploads && result.uploads !== "") {
      repo.saveChannel(result).then(async () => {
        const r = await syncUploads(result.uploads, client, repo);
        if (r > 0) {
          count += r;
          client.getChannelPlaylists(result.id).then(async (playlists) => {
            const ids = playlists.list.map(
              (item) => item.id !== result.uploads && item.id
            );
            const promises = ids.map(
              async (item) =>
                item !== result.uploads &&
                (await syncChannelPlaylist(item, client, repo))
            );
            Promise.all(promises).then(() =>
              repo
                .saveChannelSync({
                  id: result.id,
                  timestamp: date,
                  uploads: result.uploads,
                })
                .then(() => count)
            );
            return count;
          });
        } else {
          if (r !== undefined) {
            return count;
          }
        }
      });
    } else {
      return -1;
    }
  } else {
    syncUploads(channelSync.uploads, client, repo, channelSync).then((r) => {
      if (r > 0) {
        count += r;
        client.getChannelPlaylists(channelId).then((playlists) => {
          const ids = playlists.list.map(
            (item) => item.id !== channelSync.uploads && item.id
          );
          const promises = ids.map((item) =>
            syncChannelPlaylist(item, client, repo)
          );
          Promise.all(promises).then(() => {
            channelSync.timestamp = date;
            repo.saveChannelSync(channelSync).then(() => count);
          });
        });
      } else {
        return count;
      }
    });
  }
}
export async function syncChannelPlaylist(
  playlistId: string,
  client: VideoClient,
  repo: VideoRepository
): Promise<number> {
  const playlistSynced = await repo.getPlaylist(playlistId);
  let nextPageToken = "";
  let newVideoIds = [];
  if (!playlistSynced) {
    const playlistSync = await client.getPlaylist(playlistId);
    repo
      .savePlaylist(playlistSync)
      .then(async () => {
        while (nextPageToken !== undefined) {
          await client
            .getPlaylistVideos(playlistSync.id, 50, nextPageToken)
            .then((playlistVideos) => {
              const videoIds = playlistVideos.list.map((item) => item.id);
              newVideoIds = newVideoIds.concat(videoIds);
              nextPageToken = playlistVideos.nextPageToken;
            });
        }
        if (!nextPageToken) {
          const ids = await repo.getVideoIds(newVideoIds);
          const newIds = notIn(newVideoIds, ids);
          if (newIds.length > 0) {
            const videos = await client.getVideos(newIds);
            const count = await repo.saveVideos(videos);
            const l = await repo.savePlaylistVideos(
              playlistSynced.id,
              newVideoIds
            );
            return count + l;
          } else {
            await repo.savePlaylistVideos(playlistSynced.id, newVideoIds);
            return newVideoIds.length;
          }
        } else {
          return newVideoIds.length;
        }
      })
      .catch((err) => console.log(err));
  } else {
    while (nextPageToken !== undefined) {
      await client
        .getPlaylistVideos(playlistSynced.id, 50, nextPageToken)
        .then((playlistVideos) => {
          if (playlistSynced.itemCount < playlistVideos.total) {
            const videoIds = playlistVideos.list.map((item) => item.id);
            newVideoIds = newVideoIds.concat(videoIds);
            nextPageToken = playlistVideos.nextPageToken;
          } else {
            nextPageToken = undefined;
          }
        });
    }
    if (!nextPageToken) {
      const ids = await repo.getVideoIds(newVideoIds);
      const newIds = notIn(newVideoIds, ids);
      if (newIds.length > 0) {
        const videos = await client.getVideos(newIds);
        const count = await repo.saveVideos(videos);
        const l = await repo.savePlaylistVideos(playlistSynced.id, newVideoIds);
        return count + l;
      } else {
        await repo.savePlaylistVideos(playlistSynced.id, newVideoIds);
        return newVideoIds.length;
      }
    } else {
      return newVideoIds.length;
    }
  }
}

export async function syncUploads(
  uploads: string,
  client: VideoClient,
  repo: VideoRepository,
  channelSync?: ChannelSync
) {
  const uploadsSynced = await repo.getPlaylistVideo(uploads);
  let nextPageToken = "";
  const playlistVideoCollection: PlaylistCollection = {
    id: "",
    videos: [],
  };
  if (!uploadsSynced) {
    let newVideoIds = [];
    const uploadSync = await client.getPlaylist(uploads);
    if (uploadSync) {
      repo.savePlaylist(uploadSync).then(async () => {
        while (nextPageToken !== undefined) {
          await client
            .getPlaylistVideos(uploadSync.id, 50, nextPageToken)
            .then((resultVideos) => {
              const videoIds = resultVideos.list.map((item) => item.id);
              newVideoIds = newVideoIds.concat(videoIds);
              client.getVideos(videoIds).then(async (videos) => {
                await repo.saveVideos(videos);
              });
              nextPageToken = resultVideos.nextPageToken;
            });
        }
        if (!nextPageToken) {
          return newVideoIds.length;
        }
      });
    } else {
      return 0;
    }
  } else {
    const oldVideoIds = uploadsSynced.videos;
    let newVideoIds = uploadsSynced.videos;
    while (nextPageToken !== undefined) {
      await client
        .getPlaylistVideos(uploadsSynced.id, 50, nextPageToken)
        .then((resultVideos) => {
          resultVideos.list.forEach((item) => {
            if (
              Date.parse(channelSync.timestamp.toString()) <
              Date.parse(item.publishedAt.toString())
            ) {
              const videoIds = resultVideos.list.map((i) => i.id);
              newVideoIds = newVideoIds.concat(videoIds);
              client.getVideos(videoIds).then(async (videos) => {
                await repo.saveVideos(videos);
              });
              nextPageToken = resultVideos.nextPageToken;
            } else {
              nextPageToken = undefined;
            }
          });
        });
    }
    if (!nextPageToken) {
      await repo.savePlaylistVideos(uploadsSynced.id, newVideoIds);
      if (newVideoIds.length === oldVideoIds.length) {
        return 0;
      } else {
        return newVideoIds.length;
      }
    }
  }
}

export async function syncPlaylist(
  playlistId: string,
  client: VideoClient,
  repo: VideoRepository
): Promise<number> {
  const playlistSynced = await repo.getPlaylist(playlistId);
  let nextPageToken = "";
  if (!playlistSynced) {
    let newVideoIds = [];
    const playlistSync = await client.getPlaylist(playlistId);
    repo.savePlaylist(playlistSync).then(async () => {
      while (nextPageToken !== undefined) {
        await client
          .getPlaylistVideos(playlistSync.id, 50, nextPageToken)
          .then((resultVideos) => {
            const videoIds = resultVideos.list.map((item) => item.id);
            newVideoIds = newVideoIds.concat(videoIds);
            client.getVideos(videoIds).then((videos) => {
              repo.saveVideos(videos);
            });
            nextPageToken = resultVideos.nextPageToken;
          });
      }
      if (!nextPageToken) {
        await repo.savePlaylistVideos(playlistSync.id, newVideoIds);
        return newVideoIds.length;
      }
    });
  } else {
    let newVideoIds = [];
    while (nextPageToken !== undefined) {
      await client
        .getPlaylistVideos(playlistSynced.id, 50, nextPageToken)
        .then((resultVideos) => {
          if (playlistSynced.itemCount < resultVideos.total) {
            const videoIds = resultVideos.list.map((item) => item.id);
            newVideoIds = newVideoIds.concat(videoIds);
            client.getVideos(videoIds).then((videos) => {
              repo.saveVideos(videos);
            });
            nextPageToken = resultVideos.nextPageToken;
          } else {
            nextPageToken = undefined;
          }
        });
    }
    if (!nextPageToken) {
      await repo.savePlaylistVideos(playlistSynced.id, newVideoIds);
      return newVideoIds.length;
    }
  }
}

export function notIn(ids: string[], subIds: string[]) {
  const newIds: string[] = [];
  for (const id of ids) {
    const i = binarySearch(subIds, id);
    if (i < 0) {
      newIds.push(id);
    }
  }
  return newIds;
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
  return items[middle] !== value ? -1 : middle;
}
