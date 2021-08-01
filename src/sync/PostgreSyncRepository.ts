import { Pool, PoolClient } from 'pg';
import { params, query, queryOne, save, saveBatchWithClient } from 'postgre';
import { Channel, channelModel, ChannelSync, channelSyncModel, Playlist, PlaylistCollection, playlistModel, playlistVideoModel, SyncRepository, Video, videoModel } from 'video-service';

export class PostgreVideoRepository implements SyncRepository {
  protected client: PoolClient;
  constructor(pool: Pool) {
    pool.connect().then(client => this.client = client);
    this.saveVideos = this.saveVideos.bind(this);
    this.savePlaylists = this.savePlaylists.bind(this);
  }
  getChannelSync(channelId: string): Promise<ChannelSync> {
    return getChannelSync(this.client, channelId);
  }
  saveChannelSync(channelSync: ChannelSync): Promise<number> {
    return saveChannelSync(this.client, channelSync);
  }
  saveChannel(channel: Channel): Promise<number> {
    return saveChannel(this.client, channel);
  }
  savePlaylist(playlist: Playlist): Promise<number> {
    return savePlaylist(this.client, playlist);
  }
  savePlaylists(playlists: Playlist[]): Promise<number> {
    return savePlaylists(this.client, playlists);
  }
  saveVideos(videos: Video[]): Promise<number> {
    return saveVideos(this.client, videos);
  }
  savePlaylistVideos(id: string, videos: string[]): Promise<number> {
    return savePlaylistVideos(this.client, id, videos);
  }
  getVideoIds(ids: string[]): Promise<string[]> {
    return getVideoIds(this.client, ids);
  }
}
export function getChannelSync(client: PoolClient, channelId: string): Promise<ChannelSync> {
  return queryOne<ChannelSync>(client, 'select * from channelSync where id = $1', [channelId]);
}
export function saveChannelSync(client: PoolClient, channelSync: ChannelSync): Promise<number> {
  return save(client, channelSync, 'channelSync', channelSyncModel.attributes);
}
export function saveChannel(client: PoolClient, channel: Channel): Promise<number> {
  return save(client, channel, 'channel', channelModel.attributes);
}
export function savePlaylist(client: PoolClient, playlist: Playlist): Promise<number> {
  return save(client, playlist, 'playlist', playlistModel.attributes);
}
export function savePlaylists(client: PoolClient, playlists: Playlist[]): Promise<number> {
  return saveBatchWithClient(client, playlists, 'playlist', playlistModel.attributes);
}
export function saveVideos(client: PoolClient, videos: Video[]): Promise<number> {
  return saveBatchWithClient(client, videos, 'video', videoModel.attributes);
}
export function savePlaylistVideos(client: PoolClient, id: string, videos: string[]): Promise<number> {
  const playlistVideo: PlaylistCollection = { id, videos};
  return save(client, playlistVideo, 'playlistVideo', playlistVideoModel.attributes);
}
export function getVideoIds(client: PoolClient, ids: string[]): Promise<string[]> {
  if (!ids || ids.length === 0) {
    return Promise.resolve([]);
  } else {
    const ps = params(ids.length);
    const s = `select id from video where id in (${ps.join(',')})`;
    return query<Video>(client, s, ps).then(r => {
      return r.map(i => i.id);
    });
  }
}
