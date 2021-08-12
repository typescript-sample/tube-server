import { Request, Response } from 'express';
import { Channel } from 'video-service';
import { handleError, param, queryParams } from './util';

export class SubscriptionsController {
  constructor(private getChannels: (channelId: string, fields?: string[]) => Promise<Channel[]>, private log: (msg: any, ctx?: any) => void) {
  }
  getSubscriptions(req: Request, res: Response) {
    const id = param(req, res, 'id');
    if (id) {
      const fields = queryParams(req, 'fields');
      this.getChannels(id, fields)
        .then(channels => res.status(200).json(channels))
        .catch(err => handleError(err, res, this.log));
    }
  }
}
// SubscriptionClient to Index
