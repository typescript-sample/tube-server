import axios from 'axios';
import dotenv from 'dotenv';
import { Request, Response } from 'express';
import { Channel, ChannelDetail, ChannelSnippet, fromYoutubeChannels, ListItem, ListResult, SyncService, YoutubeListResult } from 'video-service';
import { param } from './util';
import { Pool, PoolClient } from 'pg';
import { exec, queryOne } from 'postgre';

dotenv.config();
const apiKey = process.env.API_KEY;

export interface ChannelSubscriptions {
  id: string;
  data: string[];
}

export class SyncController {
  protected client: PoolClient;
  constructor(private service: SyncService, pool?: Pool) {
    // pool.connect().then(client => this.client = client);
    this.syncChannel = this.syncChannel.bind(this);
    this.syncPlaylist = this.syncPlaylist.bind(this);
    this.getSubscriptions = this.getSubscriptions.bind(this);
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
      }).catch(err => res.status(500).json(err).end());
  }
  async syncPlaylist(req: Request, res: Response) {
    const { playlistId, level } = req.body;
    this.service.syncPlaylist(playlistId, level)
      .then(result => res.status(200).end('Sync PLaylist Successful!'))
      .catch(err => res.status(500).json(err).end());
  }
  async getSubscriptions(req: Request, res: Response) {
    const channelId = param(req, res, 'id');
    return getChannelSubscription(this.client, channelId)
    .then(async (results) =>{
      if(results){
        return res.status(200).send(results.data)
      }
      else {
        let channelIds: string[] = [];
        let nextPageToken = '';
        let count = 0;
        let all = 0;
        let allChannelCount = 0;
        while (nextPageToken !== undefined) {
          const subscriptions = await getSubcriptions(apiKey, channelId, undefined, 2, nextPageToken);
          all = subscriptions.total;
          count = count + subscriptions.list.length;
          for (const p of subscriptions.list) {
            channelIds.push(p.id);
            allChannelCount = allChannelCount + p.count;
          }
          nextPageToken = subscriptions.nextPageToken;
        };
        const channelSubscriptions: ChannelSubscriptions = {
          id: channelId, 
          data: channelIds
        };
        return saveChannelSubscription(this.client, channelSubscriptions)
        .then(results => res.status(200).send(channelIds))
        .catch(err => {
          console.log(err);
          res.status(500).json(err).send(err)
        })
      }
    })
    .catch(err =>{
      console.log(err);
      res.status(500).json(err).send(err)
    })
  }
}

export function getSubcriptions(key: string, channelId?: string, mine?: boolean, max?: number, nextPageToken?: string | number): Promise<ListResult<Channel>> {
  const maxResults = (max && max > 0 ? max : 4);
  const pageToken = (nextPageToken ? `&pageToken=${nextPageToken}` : '');
  const mineStr = (mine ? `&mine=${mine}` : '');
  const channel = (channelId && channelId.length > 0) ? `&channelId=${channelId}` : '';
  const url = `https://youtube.googleapis.com/youtube/v3/subscriptions?key=${key}${mineStr}${channel}&maxResults=${maxResults}${pageToken}&part=snippet`;
  return axios.get<YoutubeListResult<ListItem<string, ChannelSnippet, ChannelDetail>>>(url).then(res => {
    const r: ListResult<Channel> = {
      list:  fromYoutubeChannels(res.data),
      nextPageToken: res.data.nextPageToken,
    };
    return r;
  });
}

export function saveChannelSubscription(client: PoolClient, channelSubscriptions: ChannelSubscriptions): Promise<number> {
  const query = `INSERT INTO channelsubscription(id, data) VALUES ($1, $2)`;
  const values = Object.values(channelSubscriptions);
  return exec(client, query, values);
}

export function getChannelSubscription(client: PoolClient, channelId: string): Promise<ChannelSubscriptions>{
  return queryOne(client, 'select * from channelsubscription where id = $1', [channelId]);
}