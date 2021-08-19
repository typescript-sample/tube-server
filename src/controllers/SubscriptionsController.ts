import { Request, Response } from 'express';
import { Channel } from 'video-service';
import { handleError, param, queryParams } from './util';

export class SubscriptionsController {
  constructor(private getChannels: (channelId: string) => Promise<Channel[]>, private log: (msg: any, ctx?: any) => void) {
    this.getSubscriptions = this.getSubscriptions.bind(this);
  }
  getSubscriptions(req: Request, res: Response) {
    const id = param(req, res, 'id');
    if (id) {
      this.getChannels(id)
        .then(channels => {
          const fields = queryParams(req, 'fields');
          if (fields && fields.length > 0) {
            const objs: Channel[] = [];
            for (const channel of channels) {
              const obj: Channel = {};
              for (const f of fields) {
                obj[f] = channel[f];
              }
              objs.push(obj);
            }
            res.status(200).json(objs);
          } else {
            res.status(200).json(channels);
          }
        })
        .catch(err => handleError(err, res, this.log));
    }
  }
}

