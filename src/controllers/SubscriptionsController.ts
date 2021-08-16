import { Request, Response } from 'express';
import { Channel, SyncService } from '../../video-services';
import { handleError, param, queryParams } from './util';

export class SubscriptionsController {
  constructor(private clientSubcriptions: (channelId: string, fields?: string[]) => Promise<Channel[]>, private log: (msg: any, ctx?: any) => void) {
    this.getSubscriptions = this.getSubscriptions.bind(this);
  }
  getSubscriptions(req: Request, res: Response) {
    const id = param(req, res, 'id');
    if (id) {
      const fields = queryParams(req, 'fields');
      this.clientSubcriptions(id, fields)
      .then(r => res.status(200).json(r))
      .catch(err => res.status(500).send(err))
    }
  }
}

