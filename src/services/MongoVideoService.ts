import { Collection, FilterQuery } from 'mongodb';
import { buildProject, findAllWithMap, findOne, findWithMap, isEmpty, StringMap, upsert } from 'mongodb-extension';
import { CategoryCollection, Channel, ChannelSM, getLimit, Item, ItemSM, ListResult, Playlist, PlaylistCollection, PlaylistSM, PlaylistVideo, Video, VideoCategory, VideoService } from 'video-service';

export class MongoVideoService implements VideoService {
  private readonly id = 'id';
  private readonly playlistVideoFields: string[];
  private readonly idMap: StringMap;
  constructor(private categoryCollection: Collection, private channelCollection: Collection, private playlistCollection: Collection, private playlistVideoCollection: Collection, private videoCollection: Collection, private clientCagetories: (regionCode?: string) => Promise<VideoCategory[]>) {
    this.getVideo = this.getVideo.bind(this);
    this.getVideos = this.getVideos.bind(this);
    this.getPlaylists = this.getPlaylists.bind(this);
    this.playlistVideoFields = ['_id', 'title', 'description', 'publishedAt', 'channelId', 'channelTitle', 'localizedTitle', 'localizedDescription', 'thumbnail', 'mediumThumbnail', 'highThumbnail', 'standardThumbnail', 'maxresThumbnail', 'definition', 'duration'];
    this.idMap = { id: '_id' };
  }
  getChannel(channelId: string, fields?: string[]): Promise<Channel> {
    const query: FilterQuery<any> = { _id: channelId };
    return findOne<Channel>(this.channelCollection, query, this.id).then(c => {
      if (c) {
        return Promise.resolve(c);
      } else {
        const q: FilterQuery<Channel> = { customUrl: channelId };
        return findOne<Channel>(this.channelCollection, q, this.id);
      }
    });
  }
  getChannels(channelIds: string[], fields?: string[]): Promise<Channel[]> {
    const project = buildProject(fields, undefined, this.idMap, true);
    const query: FilterQuery<any> = { _id: { $in: channelIds } };
    return findAllWithMap<Channel>(this.channelCollection, query, this.id, undefined, undefined, project);
  }
  getPlaylists(playlistIds: string[], fields?: string[]): Promise<Playlist[]> {
    const project = buildProject(fields, undefined, this.idMap, true);
    const query: FilterQuery<any> = { _id: { $in: playlistIds } };
    return findAllWithMap<Playlist>(this.playlistCollection, query, this.id, undefined, undefined, project);
  }
  getPlaylist(playlistId: string, fields?: string[]): Promise<Playlist> {
    return this.getPlaylists([playlistId], fields).then((playlists) => playlists[0]);
  }
  getChannelPlaylists(channelId: string, limit?: number, nextPageToken?: string, fields?: string[]): Promise<ListResult<Playlist>> {
    const project = buildProject(fields);
    const query: FilterQuery<Playlist> = { channelId, count: { $gt: 0 }};
    const sort = { publishedAt: -1 };
    limit = getLimit(limit);
    const skip = getSkip(nextPageToken);
    return findWithMap<any>(this.playlistCollection, query, this.id, undefined, sort, limit, skip, project).then(list => {
      return { list, nextPageToken: getNextPageToken(list, limit, skip) };
    });
  }
  getVideos(videoIds: string[], fields?: string[]): Promise<Video[]> {
    const project = buildProject(fields, undefined, this.idMap, true);
    const query: FilterQuery<any> = { _id: { $in: videoIds } };
    return findAllWithMap<Video>(this.videoCollection, query, this.id, undefined, undefined, project);
  }
  getVideo(videoId: string, fields?: string[]): Promise<Video> {
    return this.getVideos([videoId], fields).then((videos) => (videos && videos.length > 0 ? videos[0] : null));
  }
  getPlaylistVideos(playlistId: string, limit?: number, nextPageToken?: string, fields?: string[]): Promise<ListResult<PlaylistVideo>> {
    limit = getLimit(limit);
    const skip = getSkip(nextPageToken);
    const filter: FilterQuery<any> = { _id: playlistId };
    return findOne<PlaylistCollection>(this.playlistVideoCollection, filter, this.id).then(playlist => {
      const ids = playlist.videos.slice(skip, skip + limit);
      const query: FilterQuery<any> = { _id: { $in: ids } };
      const map: StringMap = {
        id: 'id',
        videoOwnerChannelId: 'channelId',
        videoOwnerChannelTitle: 'channelTitle',
      };
      const project = buildProject(fields, this.playlistVideoFields, map);
      return findAllWithMap<PlaylistVideo>(this.videoCollection, query, this.id, map, undefined, project).then(list => {
        const result: ListResult<PlaylistVideo> = { list };
        result.nextPageToken = getNextPageToken(list, limit, skip);
        result.total = playlist.videos.length;
        result.limit = playlist.videos.length;
        return result;
      });
    });
  }
  getChannelVideos(channelId: string, limit?: number, nextPageToken?: string, fields?: string[]): Promise<ListResult<PlaylistVideo>> {
    const query: FilterQuery<PlaylistVideo> = { channelId };
    limit = getLimit(limit);
    const skip = getSkip(nextPageToken);
    const map: StringMap = {
      id: 'id',
      videoOwnerChannelId: 'channelId',
      videoOwnerChannelTitle: 'channelTitle',
    };
    const sort = { publishedAt: -1 };
    const project = buildProject(fields, this.playlistVideoFields, map);
    return findWithMap<PlaylistVideo>(this.videoCollection, query, this.id, map, sort, limit, skip, project).then(list => {
      return { list, nextPageToken: getNextPageToken(list, limit, skip) };
    });
  }
  getCagetories(regionCode: string): Promise<VideoCategory[]> {
    const query: FilterQuery<any> = { _id: regionCode };
    return findOne<CategoryCollection>(this.categoryCollection, query).then((category) => {
      if (category) {
        return category.data;
      } else {
        return this.clientCagetories(regionCode).then(r => {
          const categoryToSave: VideoCategory[] = r.filter((item) => item.assignable === true);
          const newCategoryCollection: CategoryCollection = {
            id: regionCode,
            data: categoryToSave,
          };
          return upsert(this.categoryCollection, newCategoryCollection, this.id).then(r2 => categoryToSave);
        });
      }
    });
  }
  searchVideos(itemSM: ItemSM, limit?: number, nextPageToken?: string, fields?: string[]): Promise<ListResult<Item>> {
    const project = buildProject(fields, undefined, this.idMap, true);
    limit = getLimit(limit);
    const skip = getSkip(nextPageToken);
    const map: StringMap = {
      date: 'publishedAt',
      relevance: 'publishedAt',
      rating: 'publishedAt',
    };
    const sort = itemSM.sort ? { [getMapField(itemSM.sort, map)]: -1 } : undefined;
    const query = buildVideoQuery(itemSM);
    return findWithMap<Item>(this.videoCollection, query, this.id, undefined, sort, limit, skip, project).then(list => {
      return { list, nextPageToken: getNextPageToken(list, limit, skip) };
    });
  }
  search(itemSM: ItemSM, limit?: number, nextPageToken?: string, fields?: string[]): Promise<ListResult<Item>> {
    const project = buildProject(fields, undefined, this.idMap, true);
    limit = getLimit(limit);
    const skip = getSkip(nextPageToken);
    const map: StringMap = {
      date: 'publishedAt',
      relevance: 'publishedAt',
      rating: 'publishedAt',
    };
    const sort = itemSM.sort ? { [getMapField(itemSM.sort, map)]: -1 } : undefined;
    const query = buildItemQuery(itemSM);
    return findWithMap<any>(this.videoCollection, query, this.id, undefined, sort, limit, skip, project).then(list => {
      return { list, nextPageToken: getNextPageToken(list, limit, skip) };
    });
  }
  searchPlaylists(playlistSM: PlaylistSM, limit?: number, nextPageToken?: string, fields?: string[]): Promise<ListResult<Playlist>> {
    const project = buildProject(fields, undefined, this.idMap, true);
    limit = getLimit(limit);
    const skip = getSkip(nextPageToken);
    const map: StringMap = {
      date: 'publishedAt',
      relevance: 'publishedAt',
      rating: 'publishedAt',
    };
    const sort = playlistSM.sort ? { [getMapField(playlistSM.sort, map)]: -1 } : undefined;
    const query = buildPlaylistQuery(playlistSM);
    return findWithMap<any>(this.playlistCollection, query, this.id, undefined, sort, limit, skip, project).then(list => {
      return { list, nextPageToken: getNextPageToken(list, limit, skip) };
    });
  }
  searchChannels(channelSM: ChannelSM, limit?: number, nextPageToken?: string, fields?: string[]): Promise<ListResult<Channel>> {
    const project = buildProject(fields, undefined, this.idMap, true);
    limit = getLimit(limit);
    const skip = getSkip(nextPageToken);
    const map: StringMap = {
      date: 'publishedAt',
      relevance: 'publishedAt',
      rating: 'publishedAt',
      viewCount: 'playlistVideoItemCount',
    };
    const sort = channelSM.sort ? { [getMapField(channelSM.sort, map)]: -1 } : undefined;
    const query = buildChannelQuery(channelSM);
    return findWithMap<any>(this.channelCollection, query, this.id, undefined, sort, limit, skip, project).then(list => {
      return { list, nextPageToken: getNextPageToken(list, limit, skip) };
    });
  }
  getRelatedVideos(videoId: string, limit?: number, nextPageToken?: string, fields?: string[]): Promise<ListResult<Item>> {
    const project = buildProject(fields, undefined, this.idMap, true);
    limit = getLimit(limit);
    const skip = getSkip(nextPageToken);
    return this.getVideo(videoId).then((video) => {
      if (!video) {
        const r: ListResult<Item> = { list: [] };
        return Promise.resolve(r);
      } else {
        const query: FilterQuery<any> = {
          tags: { $in: video.tags },
          _id: { $nin: [videoId] },
        };
        const sort = { publishedAt: -1 };
        return findWithMap<Item>(this.videoCollection, query, this.id, undefined, sort, limit, skip, project).then(list => {
          return { list, nextPageToken: getNextPageToken(list, limit, skip) };
        });
      }
    });
  }
  getPopularVideos(regionCode: string, categoryId: string, limit?: number, nextPageToken?: string, fields?: string[]): Promise<ListResult<Video>> {
    const project = buildProject(fields, undefined, this.idMap, true);
    limit = getLimit(limit);
    const query: FilterQuery<Video> = {};
    if (regionCode && regionCode.length > 0) {
      query.regionCode = regionCode;
    }
    if (categoryId && categoryId.length > 0) {
      query.categoryId = categoryId;
    }
    const skip = getSkip(nextPageToken);
    const sort = { publishedAt: -1 };
    return findWithMap<Video>(this.videoCollection, query, this.id, undefined, sort, limit, skip, project).then(list => {
      return { list, nextPageToken: getNextPageToken(list, limit, skip) };
    });
  }
}

export function buildPlaylistQuery(s: PlaylistSM): FilterQuery<Playlist> {
  const query: FilterQuery<Playlist> = {};
  if (!isEmpty(s.q)) {
    query.$or = [
      {
        title: {
          $regex: `.*${s.q}.*`,
          $options: 'i',
        },
      },
      {
        description: {
          $regex: `.*${s.q}.*`,
          $options: 'i',
        },
      },
    ];
  }
  if (s.publishedBefore && s.publishedAfter) {
    query.publishedAt = { $gt: s.publishedBefore, $lte: s.publishedAfter };
  } else if (s.publishedAfter) {
    query.publishedAt = { $lte: s.publishedAfter };
  } else if (s.publishedBefore) {
    query.publishedAt = { $gt: s.publishedBefore };
  }
  if (!isEmpty(s.channelId)) {
    query.channelId = s.channelId;
  }
  if (!isEmpty(s.channelType)) {
    query.channelType = s.channelType;
  }
  if (!isEmpty(s.regionCode)) {
    query.country = s.regionCode;
  }
  if (!isEmpty(s.relevanceLanguage)) {
    query.relevanceLanguage = s.relevanceLanguage;
  }
  query.count = { $gt: 0 };
  return query;
}
export function buildChannelQuery(s: ChannelSM): FilterQuery<Channel> {
  const query: FilterQuery<Channel> = {};
  if (!isEmpty(s.q)) {
    query.$or = [
      {
        title: {
          $regex: `.*${s.q}.*`,
          $options: 'i',
        },
      },
      {
        description: {
          $regex: `.*${s.q}.*`,
          $options: 'i',
        },
      },
    ];
  }
  if (s.publishedBefore && s.publishedAfter) {
    query.publishedAt = { $gt: s.publishedBefore, $lte: s.publishedAfter };
  } else if (s.publishedAfter) {
    query.publishedAt = { $lte: s.publishedAfter };
  } else if (s.publishedBefore) {
    query.publishedAt = { $gt: s.publishedBefore };
  }
  if (!isEmpty(s.channelId)) {
    query.channelId = s.channelId;
  }
  if (!isEmpty(s.channelType)) {
    query.channelType = s.channelType;
  }
  if (!isEmpty(s.topicId)) {
    query.topicId = s.topicId;
  }
  if (!isEmpty(s.regionCode)) {
    query.country = s.regionCode;
  }
  if (!isEmpty(s.relevanceLanguage)) {
    query.relevanceLanguage = s.relevanceLanguage;
  }
  return query;
}
export function buildItemQuery(s: ItemSM): FilterQuery<Item> {
  return buildVideoQuery(s);
}
export function buildVideoQuery(s: ItemSM): FilterQuery<Item> {
  const query: FilterQuery<Item> = {};
  if (!isEmpty(s.duration)) {
    switch (s.duration) {
      case 'short':
        query['duration'] = { $lte: 240 };
        break;
      case 'medium':
        query['duration'] = { $gt: 240, $lte: 1200 };
        break;
      case 'long':
        query['duration'] = { $gt: 1200 };
        break;
      default:
        break;
    }
  }
  if (s.publishedBefore && s.publishedAfter) {
    query.publishedAt = { $gt: s.publishedBefore, $lte: s.publishedAfter };
  } else if (s.publishedAfter) {
    query.publishedAt = { $lte: s.publishedAfter };
  } else if (s.publishedBefore) {
    query.publishedAt = { $gt: s.publishedBefore };
  }
  if (!isEmpty(s.regionCode)) {
    query['blockedRegions'] = {
      $ne: s.regionCode,
    };
  }
  if (!isEmpty(s.q)) {
    query.$or = [
      {
        title: {
          $regex: `.*${s.q}.*`,
          $options: 'i',
        },
      },
      {
        description: {
          $regex: `.*${s.q}.*`,
          $options: 'i',
        },
      },
    ];
  }
  return query;
}

export function getMapField(name: string, map?: StringMap): string {
  if (!map) {
    return name;
  }
  const x = map[name];
  if (!x) {
    return name;
  }
  if (typeof x === 'string') {
    return x;
  }
  return name;
}

export function getNextPageToken<T>(list: T[], limit: number, skip: number, name?: string): string {
  if (!name || name.length === 0) {
    name = 'id';
  }
  if (list && list.length < limit) {
    return undefined;
  } else {
    return list && list.length > 0 ? `${list[list.length - 1][name]}|${skip + limit}` : undefined;
  }
}
export function getSkip(nextPageToken: string): number {
  if (nextPageToken) {
    const arr = nextPageToken.toString().split('|');
    if (arr.length < 2) {
      return undefined;
    }
    if (isNaN(arr[1] as any)) {
      return 0;
    }
    const n = parseFloat(arr[1]);
    const s = n.toFixed(0);
    return parseFloat(s);
  }
  return 0;
}
