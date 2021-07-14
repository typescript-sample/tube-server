import axios from 'axios';
import { HttpRequest } from 'axios-core';
import { Db } from 'mongodb';
import { ApplicationContext } from './context';
import { SyncController } from './controllers/SyncController';
import { TubeController } from './controllers/TubeController';
import { log } from './controllers/util';
import { MongoTubeService } from './services/mongo/MongoTubeService';
import { MongoVideoRepository } from './sync/MongoSyncRepository';
import { DefaultSyncService, YoutubeClient } from './video-plus';

export function createContext(db: Db, key: string): ApplicationContext {
  const httpRequest = new HttpRequest(axios);
  const client = new YoutubeClient(key, httpRequest);
  const tubeService = new MongoTubeService(db);
  const tubeController = new TubeController(tubeService, client, log);
  const videoRepository = new MongoVideoRepository(db);
  const syncService = new DefaultSyncService(client, videoRepository);
  const syncController = new SyncController(syncService);
  const ctx: ApplicationContext = { syncController, tubeController };
  return ctx;
}
