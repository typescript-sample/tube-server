import axios from 'axios';
import { HttpRequest } from 'axios-core';
import { Db } from 'mongodb';
import { ApplicationContext } from './context';
import { SyncController } from './controllers/SyncController';
import { TubeController } from './controllers/TubeController';
import { MongoTubeService } from './services/mongo/MongoTubeService';
import { YoutubeClient } from './video-plus';

export function createContext(db: Db, key: string): ApplicationContext {
  const httpRequest = new HttpRequest(axios);
  const client = new YoutubeClient(key, httpRequest);
  const tubeService = new MongoTubeService(db);
  const tubeController = new TubeController(tubeService);
  const syncController = new SyncController(client, tubeService);
  const ctx: ApplicationContext = { syncController, tubeController };
  return ctx;
}
