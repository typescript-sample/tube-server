import { Request, Response } from 'express';
import { Channel } from '../../video-services';
import { handleError, param, queryParams } from './util';

export class SubscriptionsController {
  constructor(private getSubscriptionFromYoutube:(channelId: string) => Promise<Channel[]>, private log: (msg: any, ctx?: any) => void) {
    this.getSubscriptions = this.getSubscriptions.bind(this);
  }
  getSubscriptions(req: Request, res: Response) {
    const id = param(req, res, 'id');
    if (id) {
      const fields = queryParams(req, 'fields');
      this.getSubscriptionFromYoutube(id)
        .then(channels => res.status(200).json(channels))
        .catch(err => handleError(err, res, this.log));
    }
  }
}

