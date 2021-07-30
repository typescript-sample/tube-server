import { Pool, PoolClient } from 'pg';
import { exec, Model, query, queryOne, save, saveBatchWithClient } from 'postgre';
import { Channel, ChannelSync, Playlist, PlaylistCollection, SyncRepository, Video } from 'video-service';

export const channelModel: Model = {
  name: 'channel',
  attributes: {
    id: {
      key: true,
      match: 'equal'
    },
    country: {},
    customUrl: {},
    publishedAt: {
      type: 'datetime'
    },
    title: {},
    description: {},
    localizedTitle: {},
    localizedDescription: {},
    thumbnail: {},
    mediumThumbnail: {},
    highThumbnail: {},
    uploads: {},
    favorites: {},
    likes: {},
    lastUpload: {
      type: 'datetime'
    },
    count: {
      type: 'integer'
    },
    itemCount: {
      type: 'integer'
    },
    playlistCount: {
      type: 'integer'
    },
    playlistItemCount: {
      type: 'integer'
    },
    playlistVideoCount: {
      type: 'integer'
    },
    playlistVideoItemCount: {
      type: 'integer'
    }
  }
};
export const channelSyncModel: Model = {
  name: 'channelSync',
  attributes: {
    id: {
      key: true,
      match: 'equal'
    },
    syncTime: {
      type: 'datetime'
    },
    uploads: {}
  }
};
export const playlistModel: Model = {
  name: 'playlist',
  attributes: {
    id: {
      key: true,
      match: 'equal'
    },
    channelId: {
      match: 'equal'
    },
    channelTitle: {},
    publishedAt: {
      type: 'datetime'
    },
    title: {},
    description: {},
    localizedTitle: {},
    localizedDescription: {},
    thumbnail: {},
    mediumThumbnail: {},
    highThumbnail: {},
    standardThumbnail: {},
    maxresThumbnail: {},
    count: {
      type: 'integer'
    },
    itemCount: {
      type: 'integer'
    }
  }
};
export const playlistVideoModel: Model = {
  name: 'video',
  attributes: {
    id: {
      key: true,
      match: 'equal'
    },
    videos: {
      type: 'primitives'
    }
  }
};
export const videoModel: Model = {
  name: 'video',
  attributes: {
    id: {
      key: true,
      match: 'equal'
    },
    categoryId: {
      match: 'equal'
    },
    channelId: {
      match: 'equal'
    },
    channelTitle: {},
    publishedAt: {
      type: 'datetime'
    },
    title: {},
    description: {},
    localizedTitle: {},
    localizedDescription: {},
    thumbnail: {},
    mediumThumbnail: {},
    highThumbnail: {},
    standardThumbnail: {},
    maxresThumbnail: {},
    tags: {
      type: 'primitives'
    },
    rank: {
      type: 'integer'
    },
    caption: {},
    duration: {
      type: 'integer'
    },
    definition: {
      type: 'integer'
    },
    dimension: {},
    projection: {},
    defaultLanguage: {},
    defaultAudioLanguage: {},
    allowedRegions: {
      type: 'primitives'
    },
    blockedRegions: {
      type: 'primitives'
    },
    licensedContent: {
      type: 'boolean'
    },
    livebroadcastcontent: {}
  }
};

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
  const stringIds = ids.map(id => '\'' + id + '\'').join();
  const s = `select id from video where id in (${stringIds})`;
  return query<Video>(client, s).then(r => {
    return r.map(i => i.id);
  });
}
