import axios from 'axios';
import { HttpRequest } from 'axios-core';
import { Client } from 'cassandra-driver';
import { Db } from 'mongodb';
import { CassandraVideoService } from './services/CassandraVideoService';
import { CassandraVideoRepository } from './sync/CassandraSyncRepository';
import { CategoryClient, DefaultSyncService, SyncRepository, VideoService, YoutubeSyncClient } from 'video-service';
import { ApplicationContext } from './context';
import { SyncController } from './controllers/SyncController';
import { TubeController } from './controllers/TubeController';
import { log } from './controllers/util';
import { MongoVideoService } from './services/MongoVideoService';
import { PostgreTubeService } from './services/PostgreVideoService';
import { MongoVideoRepository } from './sync/MongoSyncRepository';
import { PostgreVideoRepository } from './sync/PostgreSyncRepository';

export function createContext(key?: string, db?: Client): ApplicationContext {
  const httpRequest = new HttpRequest(axios);
  const client = new YoutubeSyncClient(key, httpRequest);
  const categoryClient = new CategoryClient(key, httpRequest);
  let tubeService: VideoService;
  let videoRepository: SyncRepository;
  // if (db) {
  //   const categoryCollection = db.collection('category');
  //   const channelCollection = db.collection('channel');
  //   const channelSyncCollection = db.collection('channelSync');
  //   const playlistCollection = db.collection('playlist');
  //   const playlistVideoCollection = db.collection('playlistVideo');
  //   const videoCollection = db.collection('video');
  //   videoRepository = new MongoVideoRepository(channelCollection, channelSyncCollection, playlistCollection, playlistVideoCollection, videoCollection);
  //   tubeService = new MongoVideoService(categoryCollection, channelCollection, playlistCollection, playlistVideoCollection, videoCollection, categoryClient.getCagetories);
  // } else {
  //   const pool = new Pool ({
  //     host: 'localhost',
  //     port: 5432,
  //     user: 'postgres',
  //     password: '123',
  //     database: 'test'
  //   });
  //   videoRepository = new PostgreVideoRepository(pool);
  //   tubeService = new PostgreTubeService(pool, categoryClient.getCagetories);
  // }
  tubeService = new CassandraVideoService(db,categoryClient);
  videoRepository = new CassandraVideoRepository(db);
  const syncService = new DefaultSyncService(client, videoRepository);
  const syncController = new SyncController(syncService);
  const videoController = new TubeController(tubeService, log, true);
  const ctx: ApplicationContext = { syncController, tubeController: videoController };
  return ctx;
}
