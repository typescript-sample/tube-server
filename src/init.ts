import axios from 'axios';
import { HttpRequest } from 'axios-core';
import { Db } from 'mongodb';
import { ApplicationContext } from './context';
import { TubeController } from './controllers/TubeController';
import { MongoTubeService } from './services/mongo/MongoTubeService';
import { VideoService, YoutubeClient } from './video-plus';

export function createContext(db: Db): ApplicationContext {
  const tubeService = new MongoTubeService(db);
  const tubeController = new TubeController(tubeService);
  const ctx: ApplicationContext = { tubeController };
  return ctx;
}

export function youtubeService(key: string): VideoService {
  const httpRequest = new HttpRequest(axios);
  const videoService = new YoutubeClient(key, httpRequest);
  return videoService;
}
