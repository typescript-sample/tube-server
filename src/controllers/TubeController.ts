import { Request, Response } from 'express';
import { TubeService } from '../services/TubeService';
import { Channel, PlaylistVideo } from '../video-plus/models';
import { youtubeService } from '../init'
import { PlaylistVideoCollection } from 'models/ChannelSync';
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
    private youtubeServices = youtubeService('AIzaSyDVRw8jjqyJWijg57zXSOMpUArlZGpC7bE');
    allChannels(req: Request, res: Response) {
        this.tubeService.allChannels()
          .then(channels => res.status(200).json(channels), err => res.status(500).send(err));
      }
    allVideos(req: Request, res: Response) {
        this.tubeService.allVideos()
          .then(videos => res.status(200).json(videos), err => res.status(500).send(err));
    }
    loadChannel(req: Request, res: Response) {
      const {id} = req.params;
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
      const {id} = req.params;
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
      const {id} = req.params;
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
        const date = new Date()
        const channelSync = await this.tubeService.loadChannelsSync(channelId);
        if(!channelSync) {
          const result = await this.youtubeServices.getChannel(channelId);
          if(result.id !== result.uploads) {
          this.tubeService.upsertChannel(result)
              .then(async() => {
                  this.tubeService.upsertChannelsSync({id: result.id, timestamp: date, uploads: result.uploads});
                  this.tubeService.upsertChannel(result)
                  .then(async() => {
                    let ids = [];
                    await this.youtubeServices.getChannelPlaylists(result.id).then((playlistChannel) => {
                      ids = playlistChannel.list.map(item => item.id);
                    });
                    const promises = ids.map(item => item !== result.uploads && this.syncPlaylists(item));
                    Promise.all(promises).then(() => {
                      this.syncPlaylists(result.uploads);
                    }).then(() => {
                      return res.status(200).json('Sync Channel Success ful');
                    }).catch(err => res.status(500).json(err));
                  }).catch(err => res.status(500).send(err));
              }).catch(err => res.status(500).send(err));
            } else {
              return res.status(200).json('Channel not valid to sync').end();
            }
        }
        else {
          channelSync.timestamp = date
          await this.tubeService.updateChannelSync(channelSync);
          let ids = [];
          await this.youtubeServices.getChannelPlaylists(channelSync.id).then((playlistChannel) => {
            ids = playlistChannel.list.map(item => item.id);
          });
          const promises = ids.map(item => this.syncPlaylists(item));
          Promise.all(promises).then(() => {
            this.syncPlaylists(channelSync.uploads);
          }).then(() => {
            return res.status(200).json('Newest Synced!');
          }).catch(err => res.status(500).json(err));
        }
    }
    async syncPlaylist(req: Request, res: Response) {
      const {playlistId} = req.body;
      const playlistSynced = await this.tubeService.loadPlaylist(playlistId);
      let nextPageToken = '';
      let playlistVideoCollection: PlaylistVideoCollection = {
        id: '',
        videos: []
      };
      if(!playlistSynced) {
        let newPLaylistIds = [];
        const playlistSync = await this.youtubeServices.getPlaylist(playlistId);
        this.tubeService.upsertPlaylist(playlistSync).then(async() => {
          while (nextPageToken !== undefined) {
            await this.youtubeServices.getPlaylistVideos(playlistSync.id, 50, nextPageToken).then((resultVideos) => {
              const videoIds = resultVideos.list.map(item => item.id);
              newPLaylistIds = newPLaylistIds.concat(videoIds);
              this.youtubeServices.getVideos(videoIds).then(resultVideos => {
                this.tubeService.upsertVideos(resultVideos);
              });
             nextPageToken = resultVideos.nextPageToken;
           });
         }
         if(!nextPageToken) {
          playlistVideoCollection.id = playlistSync.id;
          playlistVideoCollection.videos = newPLaylistIds;
          await this.tubeService.upsertPlaylistVideo(playlistVideoCollection);
          return res.status(200).json('Sync PLaylist Successful!').end();
         }
        }).catch(err => res.status(500).send(err));
      }
      else {
        let newPLaylistIds = [];
        await this.tubeService.loadPlaylistVideo(playlistSynced.id).then(result => {
          playlistVideoCollection = result;
        });
        while (nextPageToken !== undefined) {
          await this.youtubeServices.getPlaylistVideos(playlistSynced.id, 50, nextPageToken).then((resultVideos) => {
            if(playlistSynced.itemCount < resultVideos.total) {
              const videoIds = resultVideos.list.map(item => item.id);
              newPLaylistIds = newPLaylistIds.concat(videoIds);
              this.youtubeServices.getVideos(videoIds).then(resultVideos => {
                this.tubeService.upsertVideos(resultVideos);
              });
              nextPageToken = resultVideos.nextPageToken;
            } else {
              nextPageToken = undefined;
            }
          });
        }
        if(!nextPageToken) {
          playlistVideoCollection.videos = newPLaylistIds;
          await this.tubeService.updatePlaylistVideo(playlistVideoCollection);
            return res.status(200).json('Newest Synced!').end();
        }
      }
    }
    async syncPlaylists(playlistId: string) {
      const playlistSynced = await this.tubeService.loadPlaylist(playlistId);
      let nextPageToken = '';
      let playlistVideoCollection: PlaylistVideoCollection = {
        id: '',
        videos: []
      };
      if(!playlistSynced) {
        let newPLaylistIds = [];
        const playlistSync = await this.youtubeServices.getPlaylist(playlistId);
        this.tubeService.upsertPlaylist(playlistSync).then(async() => {
          while (nextPageToken !== undefined) {
            await this.youtubeServices.getPlaylistVideos(playlistSync.id, 50, nextPageToken).then((resultVideos) => {
              const videoIds = resultVideos.list.map(item => item.id);
              newPLaylistIds = newPLaylistIds.concat(videoIds);
              this.youtubeServices.getVideos(videoIds).then(resultVideos => {
                this.tubeService.upsertVideos(resultVideos);
              });
             nextPageToken = resultVideos.nextPageToken;
           });
         }
         if(!nextPageToken) {
          playlistVideoCollection.id = playlistSync.id;
          playlistVideoCollection.videos = newPLaylistIds;
          await this.tubeService.upsertPlaylistVideo(playlistVideoCollection);
         }
        }).catch(err => console.log(err));
      }
      else {
        let newPLaylistIds = [];
        await this.tubeService.loadPlaylistVideo(playlistSynced.id).then(result => {
          playlistVideoCollection = result;
        });
        while (nextPageToken !== undefined) {
          await this.youtubeServices.getPlaylistVideos(playlistSynced.id, 50, nextPageToken).then((resultVideos) => {
            if(playlistSynced.itemCount < resultVideos.total) {
              const videoIds = resultVideos.list.map(item => item.id);
              newPLaylistIds = newPLaylistIds.concat(videoIds);
              this.youtubeServices.getVideos(videoIds).then(resultVideos => {
                this.tubeService.upsertVideos(resultVideos);
              });
              nextPageToken = resultVideos.nextPageToken;
            } else {
              nextPageToken = undefined;
            }
          });
        }
        if(!nextPageToken) {
          playlistVideoCollection.videos = newPLaylistIds;
          await this.tubeService.updatePlaylistVideo(playlistVideoCollection);
        }
      }
    }
}