import { Pool, PoolClient } from 'pg';
import { executeWithClient, execWithClient, queryOneWithClient, queryWithClient } from 'postgre';
import { Channel, ChannelSync, Playlist, PlaylistCollection, SyncRepository, Video } from 'video-service';

export function buildQueryUpsert(tableName: string, listFields: string[]): string {
  const listValues = listFields.map((item, index) => `$${index + 1}`);
  const queryUpdate = listFields.map((item, index) => `${item} = $${index + 1}`);
  return `INSERT INTO ${tableName}(${listFields.join()})VALUES (${listValues.join()}) ON CONFLICT (id) DO UPDATE SET ${queryUpdate.slice(1, queryUpdate.length).join()}`;
}
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
  return queryOneWithClient<ChannelSync>(client, 'SELECT * FROM channel_sync WHERE id = $1', [channelId]);
}
export function saveChannelSync(client: PoolClient, channelSync: ChannelSync): Promise<number> {
  const fields = Object.keys(channelSync);
  const values = Object.values(channelSync);
  const queryChannelSync = buildQueryUpsert('channel_sync', fields);
  return execWithClient(client, queryChannelSync, values);
}
export function saveChannel(client: PoolClient, channel: Channel): Promise<number> {
  const fields = Object.keys(channel);
  const values = Object.values(channel);
  const queryChannel = buildQueryUpsert('channel', fields);
  return execWithClient(client, queryChannel, values);
}
export function savePlaylist(client: PoolClient, playlist: Playlist): Promise<number> {
  const fields = Object.keys(playlist);
  const values = Object.values(playlist);
  const queryPlaylist = buildQueryUpsert('playlist', fields);
  return execWithClient(client, queryPlaylist, values);
}
export function savePlaylists(client: PoolClient, playlists: Playlist[]): Promise<number> {
  const statements = playlists.map((playlist, index) => {
    const fields = Object.keys(playlists[index]);
    const queryPlaylist = buildQueryUpsert('playlist', fields);
    return {
      query : queryPlaylist,
      args: Object.values(playlist)
      };
    }) ;
    return executeWithClient(client, statements);
}
export function saveVideos(client: PoolClient, videos: Video[]): Promise<number> {
  const statements = videos.map((video, index ) => {
    const fields = Object.keys(videos[index]);
    const queryVideo = buildQueryUpsert('video', fields);
    return {
      query: queryVideo,
      args: Object.values(video)
    };
  });
  return executeWithClient(client, statements);
}
export function savePlaylistVideos(client: PoolClient, id: string, videos: string[]): Promise<number> {
  const playlistVideo: PlaylistCollection = {
    id,
    videos,
  };
  const fields = Object.keys(playlistVideo);
  const values = Object.values(playlistVideo);
  const queryPlaylistVideo = buildQueryUpsert('playlist_video', fields);
  return execWithClient(client, queryPlaylistVideo, values);
}
export function getVideoIds(client: PoolClient, ids: string[]): Promise<string[]> {
  const stringIds = ids.map(id => '\'' + id + '\'').join();
  return queryWithClient<string>(client, `SELECT * FROM video WHERE id IN (${stringIds})`);
}
