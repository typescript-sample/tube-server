import { Request, Response } from 'express';
import { SyncService } from '../../video-services';
import { handleError } from './util';

export class SyncController {
  constructor(private service: SyncService, private log?: (msg: any, ctx?: any) => void) {
    this.syncChannel = this.syncChannel.bind(this);
    this.syncChannels = this.syncChannels.bind(this);
    this.syncPlaylist = this.syncPlaylist.bind(this);
  }
  async syncChannel(req: Request, res: Response) {
    const { channelId } = req.body;
    this.service.syncChannel(channelId).then(r => {
        if (r < 0) {
          res.status(200).json('Invalid channel to sync').end();
        } else {
          res.status(200).json(`Sync successfully ${r} records`).end();
        }
      }).catch(err => handleError(err, res, this.log));
  }
  async syncChannels(req: Request, res: Response) {
    if (!Array.isArray(req.body)) {
      res.status(400).json('body must be an array').end();
    } else if (req.body.length === 0) {
      res.status(400).json('array cannot be empty').end();
    } else {
      const ids: string[] = [];
      for (const obj of req.body) {
        if (typeof obj === 'string') {
          if (obj.length > 0) {
            ids.push(obj);
          }
        } else if (typeof obj === 'object') {
          let id = obj['channelId'];
          if (!id || id.length === 0) {
            id = obj['id'];
          }
          if (id && id.length > 0) {
            ids.push(id);
          }
        }
      }
      if (ids.length === 0) {
        res.status(400).json('array is not valid').end();
      } else {
        this.service.syncChannels(ids).then(r => {
          if (r < 0) {
            res.status(200).json('Invalid channel to sync').end();
          } else {
            res.status(200).json(`Sync successfully ${r} records`).end();
          }
        }).catch(err => handleError(err, res, this.log));
      }
    }
  }
  async syncPlaylist(req: Request, res: Response) {
    const { playlistId, level } = req.body;
    this.service.syncPlaylist(playlistId, level)
      .then(r => res.status(200).end(`Sync successfully ${r} records`))
      .catch(err => handleError(err, res, this.log));
  }
}
