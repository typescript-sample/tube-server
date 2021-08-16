import { Pool, PoolClient } from 'pg';
import { params, query, queryOne, save, saveBatchWithClient } from 'postgre';
import { Channel, channelModel, ChannelSync, channelSyncModel, Playlist, PlaylistCollection, playlistModel, playlistVideoModel, SyncRepository, Video, videoModel } from '../../video-services';

export class PostgreVideoRepository implements SyncRepository {
  protected client: PoolClient;
  constructor(pool: Pool) {
    pool.connect().then(client => this.client = client);
    this.saveVideos = this.saveVideos.bind(this);
    this.savePlaylists = this.savePlaylists.bind(this);
  }
  getChannelSync(channelId: string): Promise<ChannelSync> {
    return queryOne<ChannelSync>(this.client, 'select * from channelSync where id = $1', [channelId]);
  }
  saveChannelSync(channelSync: ChannelSync): Promise<number> {
    return save(this.client, channelSync, 'channelSync', channelSyncModel.attributes);
  }
  saveChannel(channel: Channel): Promise<number> {
    return save(this.client, channel, 'channel', channelModel.attributes);
  }
  savePlaylist(playlist: Playlist): Promise<number> {
    return save(this.client, playlist, 'playlist', playlistModel.attributes);
  }
  savePlaylists(playlists: Playlist[]): Promise<number> {
    return saveBatchWithClient(this.client, playlists, 'playlist', playlistModel.attributes);
  }
  saveVideos(videos: Video[]): Promise<number> {
    return saveBatchWithClient(this.client, videos, 'video', videoModel.attributes);
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
      const q = `select id from video where id in (${ps.join(',')})`;
      return query<Video>(this.client, q, ps).then(r => {
        return r.map(i => i.id);
      });
    }
  }
}
