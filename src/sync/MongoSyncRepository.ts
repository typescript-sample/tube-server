import { Collection, Db, FilterQuery } from 'mongodb';
import { Channel, ChannelSync, Playlist, PlaylistCollection, PlaylistVideo, Video } from '../video-plus';
import { findOne, update, upsert, upsertMany } from './mongo';

export class MongoVideoRepository {
  private readonly id = 'id';
  private readonly channelsCollection: Collection;
  private readonly videosCollection: Collection;
  private readonly channelSyncCollection: Collection;
  private readonly playlistsCollection: Collection;
  private readonly playlistVideoCollection: Collection;
  constructor(db: Db) {
    this.channelsCollection = db.collection('channel');
    this.channelSyncCollection = db.collection('channelSync');
    this.videosCollection = db.collection('video');
    this.playlistsCollection = db.collection('playlist');
    this.playlistVideoCollection = db.collection('playlistVideo');
  }
  getChannelSync(channelId: string): Promise<ChannelSync> {
    const query: FilterQuery<any> = { _id:  channelId};
    return findOne<ChannelSync>(this.channelSyncCollection, query, this.id);
  }
  saveChannel(channel: Channel): Promise<number> {
    return upsert(this.channelsCollection, channel, this.id);
  }
  savePlaylist(playlist: Playlist): Promise<number> {
    return upsert(this.playlistsCollection, playlist, this.id);
  }
  saveChannelSync(channel: ChannelSync): Promise<number> {
    return upsert(this.channelSyncCollection, channel, this.id);
  }
  saveVideos(videos: Video[]): Promise<number> {
    return upsertMany(this.videosCollection, videos, this.id);
  }
  savePlaylistVideo(playlistVideo: PlaylistCollection): Promise<number> {
    return upsert(this.playlistVideoCollection, playlistVideo, this.id);
  }
  getPlaylist(playlistId: string): Promise<Channel> {
    const query: FilterQuery<any> = { _id:  playlistId};
    return findOne<Channel>(this.playlistsCollection, query, this.id);
  }
  getPlaylistVideo(playlistId: string): Promise<PlaylistCollection> {
    const query: FilterQuery<any> = { _id:  playlistId};
    return findOne<PlaylistCollection>(this.playlistVideoCollection, query, this.id);
  }
  updateChannelSync(channel: ChannelSync): Promise<number> {
    return update(this.channelSyncCollection, channel, this.id);
  }
  updatePlaylistVideo(playlistVideo: PlaylistCollection): Promise<number> {
    return update(this.playlistVideoCollection, playlistVideo, this.id);
  }
}
