import axios from 'axios';
import { HttpRequest } from 'axios-core';
import { Client } from 'cassandra-driver';
import { Db } from 'mongodb';
import { CassandraVideoService } from './services/CassandraVideoService';
import { CassandraVideoRepository } from './sync/CassandraSyncRepository';
import { CategoryClient, DefaultSyncService, SyncRepository, VideoService, YoutubeSyncClient } from '../video-services';
import { ApplicationContext } from './context';
import { SyncController } from './controllers/SyncController';
import { TubeController } from './controllers/TubeController';
import { log } from './controllers/util';
import { MongoVideoService } from './services/MongoVideoService';
import { PostgreTubeService } from './services/PostgreVideoService';
import { MongoVideoRepository } from './sync/MongoSyncRepository';
import { PostgreVideoRepository } from './sync/PostgreSyncRepository';
import { Pool } from 'pg';
import { SubscriptionsController } from './controllers/SubscriptionsController';
import { SubscriptionsClient } from './services/SubscriptionsService';

export function createContext(key?: string, db?: Db): ApplicationContext {
  const httpRequest = new HttpRequest(axios);
  const client = new YoutubeSyncClient(key, httpRequest);
  const categoryClient = new CategoryClient(key, httpRequest);
  let tubeService: VideoService;
  let videoRepository: SyncRepository;
  if (db) {
    const categoryCollection = db.collection('category');
    const channelCollection = db.collection('channel');
    const channelSyncCollection = db.collection('channelSync');
    const playlistCollection = db.collection('playlist');
    const playlistVideoCollection = db.collection('playlistVideo');
    const videoCollection = db.collection('video');
    videoRepository = new MongoVideoRepository(channelCollection, channelSyncCollection, playlistCollection, playlistVideoCollection, videoCollection);
    tubeService = new MongoVideoService(categoryCollection, channelCollection, playlistCollection, playlistVideoCollection, videoCollection, categoryClient.getCagetories);
  } else {
    const pool = new Pool ({
      host: 'localhost',
      port: 5432,
      user: 'postgres',
      password: '123',
      database: 'test'
    });
    videoRepository = new PostgreVideoRepository(pool);
    tubeService = new PostgreTubeService(pool, categoryClient.getCagetories);
  }
  // tubeService = new CassandraVideoService(db,categoryClient);
  // videoRepository = new CassandraVideoRepository(db);
  const syncService = new DefaultSyncService(client, videoRepository);
  const syncController = new SyncController(syncService);
  const videoController = new TubeController(tubeService, log, true);
  const subscriptionsClient = new SubscriptionsClient(syncService, tubeService);
  const subscriptionController = new SubscriptionsController(subscriptionsClient.getSubscriptions, log);
  const ctx: ApplicationContext = { syncController, tubeController: videoController, subscriptionController };
  return ctx;
}
