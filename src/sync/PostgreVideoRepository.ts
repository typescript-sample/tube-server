import { Collection, Db, FilterQuery } from "mongodb";
import { Pool } from "pg";
import {
  Channel,
  ChannelSync,
  Playlist,
  PlaylistCollection,
  PlaylistVideo,
  SyncRepository,
  Video,
} from "../video-plus";
import { findOne, findWithMap, update, upsert, upsertMany } from "./mongo";

export const pool = new Pool ({
  user:'postgres',
  host: 'localhost',
  password: '123',
  database: 'youtube',
  port: 5432
});

export class PostgreVideoRepository implements SyncRepository {
  private readonly id = "id";
  private readonly channelsCollection: Collection;
  private readonly videosCollection: Collection;
  private readonly channelSyncCollection: Collection;
  private readonly playlistsCollection: Collection;
  private readonly playlistVideoCollection: Collection;

  constructor(db: Db) {
    this.channelsCollection = db.collection("channel");
    this.channelSyncCollection = db.collection("channelSync");
    this.videosCollection = db.collection("video");
    this.playlistsCollection = db.collection("playlist");
    this.playlistVideoCollection = db.collection("playlistVideo");
    this.saveVideos = this.saveVideos.bind(this);
    this.savePlaylists = this.savePlaylists.bind(this);

  }
  getChannelSync(channelId: string): Promise<ChannelSync>{
    return new Promise<ChannelSync>((resolve, reject) => {
      pool.query('SELECT * FROM channel_sync WHERE id = $1',[channelId]
      ,(err, results) => {
        if (err) {
          return reject(err);
        }
        else{
          return resolve(results.rows as any);
        }
      })
    })
  }
  saveChannelSync(channelSync: ChannelSync): Promise<number>{
    return new Promise<number>((resolve, reject) => {
      pool.query('INSERT INTO channel_sync(id, time_stamp, uploads) VALUES ($1, $2, $3)', 
      [channelSync.id, channelSync.timestamp, channelSync.uploads],  (err, results) => {
        if (err) {
          return reject(err);
        }
        else{
          return resolve(results.rowCount);
        }
      })
    });
  }
  saveChannel(channel: Channel): Promise<number>{
    return new Promise<number>((resolve, reject) => {
      pool.query('INSERT INTO channel(id, country, customurl, description, favorites, highthumbnail, likes, localizeddescription, localizedtitle, mediumthumbnail, publishedat, thumbnail, title, uploads, count, itemcount, playlistcount, playlistitemcount, playlistvideocount, playlistvideoitemcount) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20)', 
      [channel.id, channel.country, channel.customUrl, channel.description, channel.favorites, channel.highThumbnail, channel.likes, channel.localizedDescription, channel.localizedTitle, channel.mediumThumbnail, channel.publishedAt, channel.thumbnail, channel.title, channel.uploads, channel.count, channel.itemCount, channel.playlistCount, channel.playlistItemCount, channel.playlistVideoCount, channel.playlistVideoItemCount],  (err, results) => {
        if (err) {
          return reject(err);
        }
        else{
          return resolve(results.rowCount);
        }
      })
    });
  }
  savePlaylist(playlist: Playlist): Promise<number> {
    return upsert(this.playlistsCollection, playlist, this.id);
  }
  savePlaylists(playlists: Playlist[]): Promise<number> {
    return upsertMany(this.playlistsCollection, playlists, this.id);
  }
  saveVideos(videos: Video[]): Promise<number> {
    return upsertMany(this.videosCollection, videos, this.id);
  }
  savePlaylistVideos(id: string, videos: string[]): Promise<number> {
    const playlistVideo: PlaylistCollection = {
      id,
      videos,
    };
    return upsert(this.playlistVideoCollection, playlistVideo, this.id);
  }
  getVideoIds(ids: string[]): Promise<string[]> {
    const query: FilterQuery<any> = { _id: { $in: ids } };
    const project = {
      _id: 1,
    };
    return findWithMap<any>(
      this.videosCollection,
      query,
      this.id,
      undefined,
      undefined,
      undefined,
      undefined,
      project
    ).then((result) => {
      return result.map((item) => item._id);
    });
  }
}
