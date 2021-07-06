import { Request, Response } from 'express';
import { PlaylistCollection, VideoService } from 'video-plus';
import { TubeService } from '../services/TubeService';

export class SyncController {
  constructor(private youtubeService: VideoService, private tubeService: TubeService) {
    this.syncChannel = this.syncChannel.bind(this);
    this.syncPlaylist = this.syncPlaylist.bind(this);
  }
  async syncChannel(req: Request, res: Response) {
    const { channelId } = req.body;
    syncChannel(channelId, this.youtubeService, this.tubeService)
      .then(r => {
        if (r < 0) {
          res.status(200).json('Invalid channel to sync').end();
        } else {
          res.status(200).json('Sync channel successfully').end();
        }
      }).catch(err => res.status(500).json(err));
  }
  async syncPlaylist(req: Request, res: Response) {
    const { playlistId } = req.body;
    syncPlaylist(playlistId, this.youtubeService, this.tubeService)
      .then(result => res.status(200).end('Sync PLaylist Successful!'))
      .catch(err => res.status(500).json(err));
  }
}

export async function syncChannel(channelId: string, client: VideoService, repo: TubeService): Promise<number> {
  const date = new Date();
    const channelSync = await repo.loadChannelsSync(channelId);
    if (!channelSync) {
      const result = await client.getChannel(channelId);
      if (result.id !== result.uploads) {
        repo.upsertChannel(result)
          .then(() => {
            repo.upsertChannel(result)
              .then(async () => {
                const playlists = await client.getChannelPlaylists(result.id);
                const ids = playlists.list.map(item => item.id);
                const promises = ids.map(item => item !== result.uploads && syncPlaylists(item, client, repo));
                let count = 0;
                Promise.all(promises).then(() => {
                  syncPlaylists(result.uploads, client, repo).then(r => count = count + r);
                }).then(() => repo.upsertChannelsSync({ id: result.id, timestamp: date, uploads: result.uploads }).then(() => count));
              });
          });
      } else {
        return -1;
      }
    } else {
      const playlists = await client.getChannelPlaylists(channelId);
      const ids = playlists.list.map(item => item.id);
      const promises = ids.map(item => syncPlaylists(item, client, repo));
      let count = 0;
      Promise.all(promises).then(() => {
        syncPlaylists(channelSync.uploads, client, repo).then(r => count = count + r);
      }).then(() => {
        channelSync.timestamp = date;
        repo.updateChannelSync(channelSync).then(() => count);
      });
    }
}

export async function syncPlaylists(playlistId: string, client: VideoService, repo: TubeService): Promise<number> {
  const playlistSynced = await repo.loadPlaylist(playlistId);
  let nextPageToken = '';
  if (!playlistSynced) {
    const playlistVideoCollection: PlaylistCollection = {
      id: '',
      videos: []
    };
    let newVideoIds = [];
    const playlistSync = await client.getPlaylist(playlistId);
    repo.upsertPlaylist(playlistSync).then(async () => {
      while (nextPageToken !== undefined) {
        await client.getPlaylistVideos(playlistSync.id, 50, nextPageToken).then(playlistVideos => {
          const videoIds = playlistVideos.list.map(item => item.id);
          newVideoIds = newVideoIds.concat(videoIds);
          client.getVideos(videoIds).then(videos => {
            repo.upsertVideos(videos);
          });
          nextPageToken = playlistVideos.nextPageToken;
        });
      }
      if (!nextPageToken) {
        playlistVideoCollection.id = playlistSync.id;
        playlistVideoCollection.videos = newVideoIds;
        await repo.upsertPlaylistVideo(playlistVideoCollection);
        return newVideoIds.length;
      } else {
        return newVideoIds.length;
      }
    }).catch(err => console.log(err));
  } else {
    let newVideoIds = [];
    const playlistVideoCollection = await repo.loadPlaylistVideo(playlistSynced.id);
    while (nextPageToken !== undefined) {
      await client.getPlaylistVideos(playlistSynced.id, 50, nextPageToken).then((playlistVideos) => {
        if (playlistSynced.itemCount < playlistVideos.total) {
          const videoIds = playlistVideos.list.map(item => item.id);
          newVideoIds = newVideoIds.concat(videoIds);
          client.getVideos(videoIds).then(videos => {
            repo.upsertVideos(videos);
          });
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

export async function syncPlaylist(playlistId: string, client: VideoService, repo: TubeService): Promise<number> {
  const playlistSynced = await repo.loadPlaylist(playlistId);
  let nextPageToken = '';
  let playlistVideoCollection: PlaylistCollection = {
    id: '',
    videos: []
  };
  if (!playlistSynced) {
    let newVideoIds = [];
    const playlistSync = await client.getPlaylist(playlistId);
    repo.upsertPlaylist(playlistSync).then(async () => {
      while (nextPageToken !== undefined) {
        await client.getPlaylistVideos(playlistSync.id, 50, nextPageToken).then((resultVideos) => {
          const videoIds = resultVideos.list.map(item => item.id);
          newVideoIds = newVideoIds.concat(videoIds);
          client.getVideos(videoIds).then(videos => {
            repo.upsertVideos(videos);
          });
          nextPageToken = resultVideos.nextPageToken;
        });
      }
      if (!nextPageToken) {
        playlistVideoCollection.id = playlistSync.id;
        playlistVideoCollection.videos = newVideoIds;
        await repo.upsertPlaylistVideo(playlistVideoCollection);
        return newVideoIds.length;
      }
    });
  } else {
    let newVideoIds = [];
    await repo.loadPlaylistVideo(playlistSynced.id).then(result => {
      playlistVideoCollection = result;
    });
    while (nextPageToken !== undefined) {
      await client.getPlaylistVideos(playlistSynced.id, 50, nextPageToken).then((resultVideos) => {
        if (playlistSynced.itemCount < resultVideos.total) {
          const videoIds = resultVideos.list.map(item => item.id);
          newVideoIds = newVideoIds.concat(videoIds);
          client.getVideos(videoIds).then(videos => {
            repo.upsertVideos(videos);
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
