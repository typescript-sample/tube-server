import axios from 'axios';
import { HttpRequest } from 'axios-core';
import { Db } from 'mongodb';
import { ApplicationContext } from './context';
import { TubeController } from './controllers/TubeController';
import { MongoTubeService } from './services/mongo/MongoTubeService';
import { DefaultSyncService } from './sync/DefaultSyncService';
import { MongoVideoRepository } from './sync/MongoSyncRepository';
import { SyncController } from './sync/SyncController';
import { YoutubeClient } from './video-plus';

export function createContext(db: Db, key: string): ApplicationContext {
  const httpRequest = new HttpRequest(axios);
  const client = new YoutubeClient(key, httpRequest);
  const tubeService = new MongoTubeService(db);
  const tubeController = new TubeController(tubeService);
  const videoRepository = new MongoVideoRepository(db);
  const syncService = new DefaultSyncService(client, videoRepository);
  const syncController = new SyncController(syncService);
  const ctx: ApplicationContext = { syncController, tubeController };
  return ctx;
}
