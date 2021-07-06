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
  savePlaylistVideo(playlistVideo: PlaylistVideo): Promise<number>;
  getPlaylist(playlistId: string): Promise<Playlist>;
  getPlaylistVideo(playlistId: string): Promise<PlaylistCollection>;
  updateChannelSync(channel: ChannelSync): Promise<number>;
  updatePlaylistVideo(playlistVideo: PlaylistCollection): Promise<number>;
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
        syncUploads(result.uploads, client, repo)
          .then((r) => {
            if (r > 0) {
              count += r;
              client.getChannelPlaylists(result.id).then((playlists) => {
                const ids = playlists.list.map(
                  (item) => item.id !== result.uploads && item.id
                );
                const promises = ids.map(
                  (item) =>
                    item !== result.uploads &&
                    syncChannelPlaylist(item, client, repo)
                );
                return Promise.all(promises).then(() => count);
              });
            } else {
              return count;
            }
          })
          .then(() =>
            repo
              .saveChannelSync({
                id: result.id,
                timestamp: date,
                uploads: result.uploads,
              })
              .then(() => count)
          );
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
            repo.updateChannelSync(channelSync).then(() => count);
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
  if (!playlistSynced) {
    const playlistVideoCollection: PlaylistCollection = {
      id: "",
      videos: [],
    };
    let newVideoIds = [];
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
          playlistVideoCollection.id = playlistSync.id;
          playlistVideoCollection.videos = newVideoIds;
          await repo.savePlaylistVideo(playlistVideoCollection);
          return newVideoIds.length;
        } else {
          return newVideoIds.length;
        }
      })
      .catch((err) => console.log(err));
  } else {
    let newVideoIds = [];
    const playlistVideoCollection = await repo.getPlaylistVideo(
      playlistSynced.id
    );
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
      playlistVideoCollection.videos = newVideoIds;
      await repo.updatePlaylistVideo(playlistVideoCollection);
    }
    return newVideoIds.length;
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
          playlistVideoCollection.id = uploadSync.id;
          playlistVideoCollection.videos = newVideoIds;
          await repo.savePlaylistVideo(playlistVideoCollection);
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
      playlistVideoCollection.id = uploadsSynced.id;
      playlistVideoCollection.videos = newVideoIds;
      await repo.updatePlaylistVideo(playlistVideoCollection);
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
  let playlistVideoCollection: PlaylistCollection = {
    id: "",
    videos: [],
  };
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
        playlistVideoCollection.id = playlistSync.id;
        playlistVideoCollection.videos = newVideoIds;
        await repo.savePlaylistVideo(playlistVideoCollection);
        return newVideoIds.length;
      }
    });
  } else {
    let newVideoIds = [];
    await repo.getPlaylistVideo(playlistSynced.id).then((result) => {
      playlistVideoCollection = result;
    });
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
      playlistVideoCollection.videos = newVideoIds;
      await repo.updatePlaylistVideo(playlistVideoCollection);
      return newVideoIds.length;
    }
  }
}
