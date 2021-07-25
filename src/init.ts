import axios from 'axios';
import { HttpRequest } from 'axios-core';
import { Db } from 'mongodb';
import { CategoryClient, DefaultSyncService, YoutubeSyncClient } from 'video-service';
import { ApplicationContext } from './context';
import { SyncController } from './controllers/SyncController';
import { TubeController } from './controllers/TubeController';
import { log } from './controllers/util';
import { MongoVideoService } from './services/MongoVideoService';
import { MongoVideoRepository } from './sync/MongoSyncRepository';

export function createContext(db: Db, key: string): ApplicationContext {
  const httpRequest = new HttpRequest(axios);
  const client = new YoutubeSyncClient(key, httpRequest);
  const categoryClient = new CategoryClient(key, httpRequest);

  const categoryCollection = db.collection('category');
  const channelCollection = db.collection('channel');
  const channelSyncCollection = db.collection('channelSync');
  const playlistCollection = db.collection('playlist');
  const playlistVideoCollection = db.collection('playlistVideo');
  const videoCollection = db.collection('video');
  const tubeService = new MongoVideoService(categoryCollection, channelCollection, playlistCollection, playlistVideoCollection, videoCollection, categoryClient.getCagetories);
  const tubeController = new TubeController(tubeService, log, true);
  const videoRepository = new MongoVideoRepository(channelCollection, channelSyncCollection, playlistCollection, playlistVideoCollection, videoCollection);
  const syncService = new DefaultSyncService(client, videoRepository);
  const syncController = new SyncController(syncService);
  const ctx: ApplicationContext = { syncController, tubeController };
  return ctx;
}
