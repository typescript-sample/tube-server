import { Request, Response } from 'express';
import { PlaylistVideoCollection } from 'models/ChannelSync';
import { VideoService } from 'video-plus';
import { youtubeService } from '../init';
import { TubeService } from '../services/TubeService';

export class TubeController {
  constructor(private tubeService: TubeService) {
    this.syncChannel = this.syncChannel.bind(this);
    this.syncPlaylist = this.syncPlaylist.bind(this);
    this.allChannels = this.allChannels.bind(this);
    this.allVideos = this.allVideos.bind(this);
    this.loadChannel = this.loadChannel.bind(this);
    this.loadPlaylistVideo = this.loadPlaylistVideo.bind(this);
    this.loadChannelsSync = this.loadChannelsSync.bind(this);
  }
  private youtubeService = youtubeService('AIzaSyDVRw8jjqyJWijg57zXSOMpUArlZGpC7bE');
  allChannels(req: Request, res: Response) {
    this.tubeService.allChannels()
      .then(channels => res.status(200).json(channels), err => res.status(500).send(err));
  }
  allVideos(req: Request, res: Response) {
    this.tubeService.allVideos()
      .then(videos => res.status(200).json(videos), err => res.status(500).send(err));
  }
  loadChannel(req: Request, res: Response) {
    const { id } = req.params;
    if (!id || id.length === 0) {
      return res.status(400).send('Id cannot be empty');
    }
    this.tubeService.loadChannel(id)
      .then(channel => {
        if (channel) {
          res.status(200).json(channel);
        } else {
          res.status(404).json(null);
        }
      }).catch(err => res.status(500).send(err));
  }
  loadChannelsSync(req: Request, res: Response) {
    const { id } = req.params;
    if (!id || id.length === 0) {
      return res.status(400).send('Id cannot be empty');
    }
    this.tubeService.loadChannelsSync(id)
      .then(channel => {
        if (channel) {
          res.status(200).json(channel);
        } else {
          res.status(404).json(null);
        }
      }).catch(err => res.status(500).send(err));
  }
  loadPlaylistVideo(req: Request, res: Response) {
    const { id } = req.params;
    if (!id || id.length === 0) {
      return res.status(400).send('Id cannot be empty');
    }
    this.tubeService.loadVideo(id)
      .then(video => {
        if (video) {
          res.status(200).json(video);
        } else {
          res.status(404).json(null);
        }
      }).catch(err => res.status(500).send(err));
  }
  async syncChannel(req: Request, res: Response) {
    const { channelId } = req.body;
    const date = new Date();
    const channelSync = await this.tubeService.loadChannelsSync(channelId);
    if (!channelSync) {
      const result = await this.youtubeService.getChannel(channelId);
      if (result.id !== result.uploads) {
        this.tubeService.upsertChannel(result)
          .then(async () => {
            this.tubeService.upsertChannelsSync({ id: result.id, timestamp: date, uploads: result.uploads });
            this.tubeService.upsertChannel(result)
              .then(async () => {
                let ids = [];
                await this.youtubeService.getChannelPlaylists(result.id).then((playlistChannel) => {
                  ids = playlistChannel.list.map(item => item.id);
                });
                const promises = ids.map(item => item !== result.uploads && syncPlaylists(item, this.youtubeService, this.tubeService));
                Promise.all(promises).then(() => {
                  syncPlaylists(result.uploads, this.youtubeService, this.tubeService);
                }).then(() => {
                  return res.status(200).json('Sync Channel Success ful');
                }).catch(err => res.status(500).json(err));
              }).catch(err => res.status(500).send(err));
          }).catch(err => res.status(500).send(err));
      } else {
        return res.status(200).json('Channel not valid to sync').end();
      }
    } else {
      channelSync.timestamp = date;
      await this.tubeService.updateChannelSync(channelSync);
      let ids = [];
      await this.youtubeService.getChannelPlaylists(channelSync.id).then((playlistChannel) => {
        ids = playlistChannel.list.map(item => item.id);
      });
      const promises = ids.map(item => syncPlaylists(item, this.youtubeService, this.tubeService));
      Promise.all(promises).then(() => {
        syncPlaylists(channelSync.uploads, this.youtubeService, this.tubeService);
      }).then(() => {
        return res.status(200).json('Newest Synced!');
      }).catch(err => res.status(500).json(err));
    }
  }
  async syncPlaylist(req: Request, res: Response) {
    const { playlistId } = req.body;
    const playlistSynced = await this.tubeService.loadPlaylist(playlistId);
    let nextPageToken = '';
    let playlistVideoCollection: PlaylistVideoCollection = {
      id: '',
      videos: []
    };
    if (!playlistSynced) {
      let newPLaylistIds = [];
      const playlistSync = await this.youtubeService.getPlaylist(playlistId);
      this.tubeService.upsertPlaylist(playlistSync).then(async () => {
        while (nextPageToken !== undefined) {
          await this.youtubeService.getPlaylistVideos(playlistSync.id, 50, nextPageToken).then((resultVideos) => {
            const videoIds = resultVideos.list.map(item => item.id);
            newPLaylistIds = newPLaylistIds.concat(videoIds);
            this.youtubeService.getVideos(videoIds).then(videos => {
              this.tubeService.upsertVideos(videos);
            });
            nextPageToken = resultVideos.nextPageToken;
          });
        }
        if (!nextPageToken) {
          playlistVideoCollection.id = playlistSync.id;
          playlistVideoCollection.videos = newPLaylistIds;
          await this.tubeService.upsertPlaylistVideo(playlistVideoCollection);
          return res.status(200).json('Sync PLaylist Successful!').end();
        }
      }).catch(err => res.status(500).send(err));
    } else {
      let newPLaylistIds = [];
      await this.tubeService.loadPlaylistVideo(playlistSynced.id).then(result => {
        playlistVideoCollection = result;
      });
      while (nextPageToken !== undefined) {
        await this.youtubeService.getPlaylistVideos(playlistSynced.id, 50, nextPageToken).then((resultVideos) => {
          if (playlistSynced.itemCount < resultVideos.total) {
            const videoIds = resultVideos.list.map(item => item.id);
            newPLaylistIds = newPLaylistIds.concat(videoIds);
            this.youtubeService.getVideos(videoIds).then(videos => {
              this.tubeService.upsertVideos(videos);
            });
            nextPageToken = resultVideos.nextPageToken;
          } else {
            nextPageToken = undefined;
          }
        });
      }
      if (!nextPageToken) {
        playlistVideoCollection.videos = newPLaylistIds;
        await this.tubeService.updatePlaylistVideo(playlistVideoCollection);
        return res.status(200).json('Newest Synced!').end();
      }
    }
  }
}

export async function syncPlaylists(playlistId: string, videoService: VideoService, tubeService: TubeService): Promise<number> {
  const playlistSynced = await tubeService.loadPlaylist(playlistId);
  let nextPageToken = '';
  if (!playlistSynced) {
    const playlistVideoCollection: PlaylistVideoCollection = {
      id: '',
      videos: []
    };
    let newPLaylistIds = [];
    const playlistSync = await videoService.getPlaylist(playlistId);
    tubeService.upsertPlaylist(playlistSync).then(async () => {
      while (nextPageToken !== undefined) {
        await videoService.getPlaylistVideos(playlistSync.id, 50, nextPageToken).then((resultVideos) => {
          const videoIds = resultVideos.list.map(item => item.id);
          newPLaylistIds = newPLaylistIds.concat(videoIds);
          videoService.getVideos(videoIds).then(videos => {
            tubeService.upsertVideos(videos);
          });
          nextPageToken = resultVideos.nextPageToken;
        });
      }
      if (!nextPageToken) {
        playlistVideoCollection.id = playlistSync.id;
        playlistVideoCollection.videos = newPLaylistIds;
        await tubeService.upsertPlaylistVideo(playlistVideoCollection);
        return newPLaylistIds.length;
      } else {
        return newPLaylistIds.length;
      }
    }).catch(err => console.log(err));
  } else {
    let newPLaylistIds = [];
    const playlistVideoCollection = await tubeService.loadPlaylistVideo(playlistSynced.id);
    while (nextPageToken !== undefined) {
      await videoService.getPlaylistVideos(playlistSynced.id, 50, nextPageToken).then((resultVideos) => {
        if (playlistSynced.itemCount < resultVideos.total) {
          const videoIds = resultVideos.list.map(item => item.id);
          newPLaylistIds = newPLaylistIds.concat(videoIds);
          videoService.getVideos(videoIds).then(videos => {
            tubeService.upsertVideos(videos);
          });
          nextPageToken = resultVideos.nextPageToken;
        } else {
          nextPageToken = undefined;
        }
      });
    }
    if (!nextPageToken) {
      playlistVideoCollection.videos = newPLaylistIds;
      await tubeService.updatePlaylistVideo(playlistVideoCollection);
    }
    return newPLaylistIds.length;
  }
}
