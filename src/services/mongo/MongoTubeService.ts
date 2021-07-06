import { Collection, Db, FilterQuery } from 'mongodb';
import { Channel, ChannelSync, Playlist, PlaylistCollection, Video } from '../../video-plus';
import { findOne, findWithMap, update, upsert, upsertMany } from './mongo';

export class MongoTubeService {
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

  allChannels(): Promise<Channel[]> {
    return findWithMap<Channel>(this.channelsCollection, {}, this.id);
  }
  allVideos(): Promise<Video[]> {
    return findWithMap<Video>(this.videosCollection, {}, this.id);
  }
  allPlaylists(): Promise<Playlist[]> {
    return findWithMap<Playlist>(this.playlistsCollection, {}, this.id);
  }
  loadChannel(channelId: string): Promise<Channel> {
    const query: FilterQuery<any> = { _id:  channelId};
    return findOne<Channel>(this.channelsCollection, query, this.id);
  }
  loadPlaylist(playlistId: string): Promise<Channel> {
    const query: FilterQuery<any> = { _id:  playlistId};
    return findOne<Channel>(this.playlistsCollection, query, this.id);
  }
  loadChannelsSync(channelId: string): Promise<ChannelSync> {
    const query: FilterQuery<any> = { _id:  channelId};
    return findOne<ChannelSync>(this.channelSyncCollection, query, this.id);
  }
  loadVideo(videoId: string): Promise<Video> {
    const query: FilterQuery<any> = { _id:  videoId};
    return findOne<Video>(this.videosCollection, query, this.id);
  }
  loadPlaylistVideo(playlistId: string): Promise<PlaylistCollection> {
    const query: FilterQuery<any> = { _id:  playlistId};
    return findOne<PlaylistCollection>(this.playlistVideoCollection, query, this.id);
  }
  upsertChannelsSync(channel: ChannelSync): Promise<number> {
    return upsert(this.channelSyncCollection, channel, this.id);
  }
  upsertChannel(channel: Channel): Promise<number> {
    return upsert(this.channelsCollection, channel, this.id);
  }
  upsertPlaylist(playlist: Playlist): Promise<number> {
    return upsert(this.playlistsCollection, playlist, this.id);
  }
  upsertVideos(videos: Video[]): Promise<number> {
    return upsertMany(this.videosCollection, videos, this.id);
  }
  updateChannelSync(channel: ChannelSync): Promise<number> {
    return update(this.channelSyncCollection, channel, this.id);
  }
  updatePlaylistVideo(playlistVideo: PlaylistCollection): Promise<number> {
    return update(this.playlistVideoCollection, playlistVideo, this.id);
  }
  upsertPlaylistVideo(playlistVideo: PlaylistCollection): Promise<number> {
    return upsert(this.playlistVideoCollection, playlistVideo, this.id);
  }
}
