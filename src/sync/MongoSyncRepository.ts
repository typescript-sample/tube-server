import { Collection, FilterQuery } from 'mongodb';
import { findAllWithMap, findOne, upsert, upsertMany } from 'mongodb-extension';
import { Channel, ChannelSync, Playlist, PlaylistCollection, SyncRepository, Video } from '../../video-services';

export class MongoVideoRepository implements SyncRepository {
  private readonly id = 'id';
  constructor(private channelCollection: Collection, private channelSyncCollection: Collection, private playlistCollection: Collection, private playlistVideoCollection: Collection, private videoCollection: Collection) {
    this.saveVideos = this.saveVideos.bind(this);
    this.savePlaylists = this.savePlaylists.bind(this);
  }
  getChannelSync(channelId: string): Promise<ChannelSync> {
    const query: FilterQuery<any> = { _id: channelId };
    return findOne<ChannelSync>(this.channelSyncCollection, query, this.id);
  }
  saveChannel(channel: Channel): Promise<number> {
    return upsert(this.channelCollection, channel, this.id);
  }
  saveChannelSync(channel: ChannelSync): Promise<number> {
    return upsert(this.channelSyncCollection, channel, this.id);
  }
  savePlaylist(playlist: Playlist): Promise<number> {
    return upsert(this.playlistCollection, playlist, this.id);
  }
  savePlaylists(playlists: Playlist[]): Promise<number> {
    return upsertMany(this.playlistCollection, playlists, this.id);
  }
  saveVideos(videos: Video[]): Promise<number> {
    return upsertMany(this.videoCollection, videos, this.id);
  }
  savePlaylistVideos(id: string, videos: string[]): Promise<number> {
    const playlistVideo: PlaylistCollection = { id, videos };
    return upsert(this.playlistVideoCollection, playlistVideo, this.id);
  }
  getVideoIds(ids: string[]): Promise<string[]> {
    if (!ids || ids.length === 0) {
      return Promise.resolve([]);
    } else {
      const query: FilterQuery<any> = { _id: { $in: ids } };
      const project = { _id: 1 };
      return findAllWithMap<any>(this.videoCollection, query, undefined, undefined, undefined, project).then(result => result.map(item => item._id));
    }
  }
}
