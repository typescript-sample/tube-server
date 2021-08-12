export type DataType = 'ObjectId' | 'date' | 'datetime' | 'time'
    | 'boolean' | 'number' | 'integer' | 'string' | 'text'
    | 'object' | 'array' | 'primitives' | 'binary';
export type FormatType = 'currency' | 'percentage' | 'email' | 'url' | 'phone' | 'fax' | 'ipv4' | 'ipv6';
export type MatchType = 'equal' | 'prefix' | 'contain' | 'max' | 'min'; // contain: default for string, min: default for Date, number

export interface Model {
  name?: string;
  attributes: Attributes;
  source?: string;
}
export interface Attribute {
  name?: string;
  type?: DataType;
  match?: MatchType;
  default?: string|number|Date;
  key?: boolean;
  typeof?: Attributes;
}
export interface Attributes {
  [key: string]: Attribute;
}
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
    },
    channels: {
      type: 'primitives'
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
