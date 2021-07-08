import { Request, Response } from 'express';
import { SyncService } from '../video-plus';

export class SyncController {
  constructor(private service: SyncService) {
    this.syncChannel = this.syncChannel.bind(this);
    this.syncPlaylist = this.syncPlaylist.bind(this);
  }
  async syncChannel(req: Request, res: Response) {
    const { channelId } = req.body;
    this.service.syncChannel(channelId)
      .then(r => {
        if (r < 0) {
          res.status(200).json('Invalid channel to sync').end();
        } else {
          res.status(200).json('Sync channel successfully').end();
        }
      }).catch(err => res.status(500).json(err));
  }
  async syncPlaylist(req: Request, res: Response) {
    const { playlistId, level } = req.body;
    this.service.syncPlaylist(playlistId, level)
      .then(result => res.status(200).end('Sync PLaylist Successful!'))
      .catch(err => res.status(500).json(err));
  }
}
