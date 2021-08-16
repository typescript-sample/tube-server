import { params, query, queryOne, save, saveBatch } from 'cassandra-core';
import { ArrayOrObject, Client, QueryOptions, types } from 'cassandra-driver';
import { Channel, channelModel, ChannelSync, channelSyncModel, Playlist, PlaylistCollection, playlistModel, playlistVideoModel, SyncRepository, Video, videoModel } from '../../video-services';

export interface Statement {
  query: string;
  params?: ArrayOrObject;
}

export class CassandraVideoRepository implements SyncRepository {
  private readonly client: Client;
  constructor(db: Client) {
    this.client = db;
  }
  getChannelSync(channelId: string): Promise<ChannelSync> {
    const sql = `select * from channelSync where id = ?`;
    return queryOne(this.client, sql, [channelId]);
  }
  saveChannel(channel: Channel): Promise<number> {
    return save(this.client, channel, 'channel', channelModel.attributes);
  }
  saveChannelSync(channel: ChannelSync): Promise<number> {
    return save(this.client, channel, 'channelSync', channelSyncModel.attributes);
  }
  savePlaylist(playlist: Playlist): Promise<number> {
    return save(this.client, playlist, 'playlist', playlistModel.attributes);
  }
  savePlaylists(playlists: Playlist[]): Promise<number> {
    return saveBatch(this.client, playlists, 'playlist', playlistModel.attributes, 5);
  }
  saveVideos(videos: Video[]): Promise<number> {
    return saveBatch(this.client, videos, 'video', videoModel.attributes, 5);
  }
  savePlaylistVideos(id: string, videos: string[]): Promise<number> {
    const playlistVideo: PlaylistCollection = { id, videos};
    return save(this.client, playlistVideo, 'playlistVideo', playlistVideoModel.attributes);
  }
  getVideoIds(ids: string[]): Promise<string[]> {
    if (!ids || ids.length === 0) {
      return Promise.resolve([]);
    } else {
      const ps = params(ids.length);
      const s = `select id from video where id in (${ps.join(',')})`;
      return query<Video>(this.client, s, ids).then(r => {
        return r.map(i => i.id);
      });
    }
  }
}
