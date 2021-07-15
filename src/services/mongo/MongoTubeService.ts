import { Collection, Db, FilterQuery } from 'mongodb';
import { CategoryCollection, Channel, ChannelSM, Item, ItemSM, ListResult, Playlist, PlaylistCollection, PlaylistSM, PlaylistVideo, Video, VideoCategory, VideoService } from '../../video-plus';
import { buildProject, findAllWithMap, findOne, findWithMap, StringMap, upsert } from './mongo';

export class MongoTubeService implements VideoService {
  private readonly id = 'id';
  private readonly channelsCollection: Collection;
  private readonly videosCollection: Collection;
  private readonly playlistCollection: Collection;
  private readonly playlistVideoCollection: Collection;
  private readonly categoryCollection: Collection;
  private readonly playlistVideoFields: string[];
  private readonly idMap: StringMap;
  constructor(db: Db) {
    this.channelsCollection = db.collection('channel');
    this.playlistCollection = db.collection('playlist');
    this.videosCollection = db.collection('video');
    this.playlistVideoCollection = db.collection('playlistVideo');
    this.categoryCollection = db.collection('category');
    this.saveCategory = this.saveCategory.bind(this);
    this.playlistVideoFields = ['_id', 'title', 'description', 'publishedAt', 'channelId', 'channelTitle', 'localizedTitle', 'localizedDescription', 'thumbnail', 'mediumThumbnail', 'highThumbnail', 'standardThumbnail', 'maxresThumbnail'];
    this.idMap = { id: '_id' };
  }
  getChannel(channelId: string, fields?: string[]): Promise<Channel> {
    const query: FilterQuery<any> = { _id: channelId };
    return findOne<Channel>(this.channelsCollection, query, this.id);
  }
  getChannels(channelIds: string[], fields?: string[]): Promise<Channel[]> {
    const project = buildProject(fields, undefined, this.idMap, true);
    const query: FilterQuery<any> = { _id: { $in: channelIds } };
    return findAllWithMap<Channel>(this.channelsCollection, query, this.id, undefined, undefined, project);
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
    const query: FilterQuery<Playlist> = { channelId };
    const sort = { publishedAt: -1 };
    limit = getLimit(limit);
    const skip = getSkip(nextPageToken);
    return findWithMap<any>(this.playlistCollection, query, this.id, undefined, sort, limit, skip, project).then((list) => {
      return { list, nextPageToken: getNextPageToken(list, limit, skip) };
    });
  }
  getVideos(videoIds: string[], fields?: string[]): Promise<Video[]> {
    const project = buildProject(fields, undefined, this.idMap, true);
    const query: FilterQuery<any> = { _id: { $in: videoIds } };
    return findAllWithMap<Video>(this.videosCollection, query, this.id, undefined, undefined, project);
  }
  getVideo(videoId: string, fields?: string[]): Promise<Video> {
    return this.getVideos([videoId], fields).then((videos) => (videos && videos.length > 0 ? videos[0] : null));
  }
  getPlaylistVideo(id: string, fields?: string[]): Promise<PlaylistCollection> {
    const query: FilterQuery<any> = { _id: id };
    return findOne<PlaylistCollection>(this.playlistVideoCollection, query, this.id);
  }
  getPlaylistVideos(playlistId: string, limit?: number, nextPageToken?: string, fields?: string[]): Promise<ListResult<PlaylistVideo>> {
    limit = getLimit(limit);
    const skip = getSkip(nextPageToken);
    const filter: FilterQuery<any> = { _id: playlistId };
    return findOne<PlaylistCollection>(this.playlistVideoCollection, filter, this.id).then((playlist) => {
      let checkNext = false;
      if (skip + limit === playlist.videos.length) {
        checkNext = true;
      }
      const ids = playlist.videos.slice(skip, skip + limit);
      const query: FilterQuery<any> = { _id: { $in: ids } };
      const map: StringMap = {
        id: 'id',
        videoOwnerChannelId: 'channelId',
        videoOwnerChannelTitle: 'channelTitle',
      };
      const project = buildProject(fields, this.playlistVideoFields, map);
      return findAllWithMap<PlaylistVideo>(this.videosCollection, query, this.id, map, undefined, project).then((list) => {
        const result: ListResult<PlaylistVideo> = { list };
        result.nextPageToken = checkNext ? undefined : `${ids[ids.length - 1]}|${skip + ids.length}`;
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
    return findWithMap<PlaylistVideo>(this.videosCollection, query, this.id, map, sort, limit, skip, project).then((list) => {
      return { list, nextPageToken: getNextPageToken(list, limit, skip) };
    });
  }
  getVideoByPlaylistId(videoIds: string[]): Promise<Video[]> {
    const query: FilterQuery<any> = { _id: videoIds };
    return findWithMap<Video>(this.videosCollection, query, this.id);
  }
  getCagetories(regionCode: string): Promise<VideoCategory[]> {
    const query: FilterQuery<any> = { _id: regionCode };
    return findOne<CategoryCollection>(this.categoryCollection, query).then((r) => r.data);
  }
  saveCategory(category: CategoryCollection): Promise<number> {
    return upsert(this.categoryCollection, category, this.id);
  }
  searchVideos(itemSM: ItemSM, limit?: number, nextPageToken?: string, fields?: string[]): Promise<ListResult<Item>> {
    const project = buildProject(fields, undefined, this.idMap, true);
    limit = getLimit(limit);
    const skip = getSkip(nextPageToken);
    const newQuery: any = {};
    const arrayKeys = Object.keys(itemSM);
    const arrayValues = Object.values(itemSM);
    arrayKeys.forEach((key, index) => {
      if (key === 'q') {
        newQuery['title'] = { $regex: `.*${itemSM.q}.*`, $options: 'i' };
      } else if (key === 'videoDuration') {
        switch (itemSM.videoDuration) {
          case 'any':
            newQuery['duration'] = { $gt: 0 };
            break;
          case 'short':
            newQuery['duration'] = { $gt: 0, $lte: 240 };
            break;
          case 'medium':
            newQuery['duration'] = { $gt: 240, $lte: 1200 };
            break;
          case 'long':
            newQuery['duration'] = { $gt: 1200 };
            break;
          default:
            break;
        }
      } else {
        if (arrayValues[index] !== undefined) {
          newQuery[key] = arrayValues[index];
        }
      }
    });
    const sort = { publishedAt: -1 };
    const query: FilterQuery<any> = newQuery;
    return findWithMap<Item>(this.videosCollection, query, this.id, undefined, sort, limit, skip, project).then((list) => {
      return { list, nextPageToken: getNextPageToken(list, limit, skip) };
    });
  }
  search(itemSM: ItemSM, limit?: number, nextPageToken?: string, fields?: string[]): Promise<ListResult<Item>> {
    const project = buildProject(fields, undefined, this.idMap, true);
    limit = getLimit(limit);
    const skip = getSkip(nextPageToken);
    const newQuery: any = {};
    const arrayKeys = Object.keys(itemSM);
    const arrayValues = Object.values(itemSM);
    arrayKeys.forEach((key, index) => {
      if (key === 'q') {
        newQuery['title'] = { $regex: `.*${itemSM.q}.*`, $options: 'i' };
      } else {
        if (arrayValues[index] !== undefined) {
          newQuery[key] = arrayValues[index];
        }
      }
    });
    switch (itemSM.videoDuration) {
      case 'any':
        newQuery['duration'] = { $gt: 0 };
        break;
      case 'short':
        newQuery['duration'] = { $gt: 0, $lte: 240 };
        break;
      case 'medium':
        newQuery['duration'] = { $gt: 240, $lte: 1200 };
        break;
      case 'long':
        newQuery['duration'] = { $gt: 1200 };
        break;
      default:
        break;
    }
    const sort = { publishedAt: -1 };
    const query: FilterQuery<any> = newQuery;
    return findWithMap<any>(this.videosCollection, query, this.id, undefined, sort, limit, skip, project).then((list) => {
      return { list, nextPageToken: getNextPageToken(list, limit, skip) };
    });
  }
  searchPlaylists(playlistSM: PlaylistSM, limit?: number, nextPageToken?: string, fields?: string[]): Promise<ListResult<Playlist>> {
    const project = buildProject(fields, undefined, this.idMap, true);
    limit = getLimit(limit);
    const skip = getSkip(nextPageToken);
    const newQuery: any = {};
    const arrayKeys = Object.keys(playlistSM);
    const arrayValues = Object.values(playlistSM);
    arrayKeys.forEach((key, index) => {
      if (key === 'q') {
        newQuery['title'] = {
          $regex: `.*${playlistSM.q}.*`,
          $options: 'i',
        };
      } else {
        if (arrayValues[index] !== undefined) {
          newQuery[key] = arrayValues[index];
        }
      }
    });
    const sort = { publishedAt: -1 };
    const query: FilterQuery<Playlist> = newQuery;
    return findWithMap<any>(this.playlistCollection, query, this.id, undefined, sort, limit, skip, project).then((list) => {
      return { list, nextPageToken: getNextPageToken(list, limit, skip) };
    });
  }
  searchChannels(channelSM: ChannelSM, limit?: number, nextPageToken?: string, fields?: string[]): Promise<ListResult<Channel>> {
    const project = buildProject(fields, undefined, this.idMap, true);
    limit = getLimit(limit);
    const skip = getSkip(nextPageToken);
    const newQuery: any = {};
    const arrayKeys = Object.keys(channelSM);
    const arrayValues = Object.values(channelSM);
    arrayKeys.forEach((key, index) => {
      if (key === 'q') {
        newQuery['title'] = {
          $regex: `.*${channelSM.q}.*`,
          $options: 'i',
        };
      } else {
        if (arrayValues[index] !== undefined) {
          newQuery[key] = arrayValues[index];
        }
      }
    });
    const sort = { publishedAt: -1 };
    const query: FilterQuery<Channel> = newQuery;
    return findWithMap<any>(this.channelsCollection, query, this.id, undefined, sort, limit, skip, project).then((list) => {
      return { list, nextPageToken: getNextPageToken(list, limit, skip) };
    });
  }
  getRelatedVideos(videoId: string, limit?: number, nextPageToken?: string, fields?: string[]): Promise<ListResult<Item>> {
    const project = buildProject(fields, undefined, this.idMap, true);
    limit = getLimit(limit);
    const skip = getSkip(nextPageToken);
    return this.getVideos([videoId]).then((video) => {
      const query: FilterQuery<any> = {
        tags: { $in: video[0].tags },
        _id: { $nin: [videoId] },
      };
      const sort = { publishedAt: -1 };
      return findWithMap<Item>(this.videosCollection, query, this.id, undefined, sort, limit, skip, project).then((list) => {
        return { list, nextPageToken: getNextPageToken(list, limit, skip) };
      });
    });
  }
  getPopularVideos(regionCode: string, videoCategoryId: string, limit?: number, nextPageToken?: string, fields?: string[]): Promise<ListResult<Video>> {
    const project = buildProject(fields, undefined, this.idMap, true);
    limit = getLimit(limit);
    const skip = getSkip(nextPageToken);
    const sort = { publishedAt: -1 };
    return findWithMap<Video>(this.videosCollection, undefined, this.id, undefined, sort, limit, skip, project).then((list) => {
      return { list, nextPageToken: getNextPageToken(list, limit, skip) };
    });
  }
  getPopularVideosByCategory(categoryId: string, limit?: number, nextPageToken?: string, fields?: string[]): Promise<ListResult<Video>> {
    const project = buildProject(fields, undefined, this.idMap, true);
    limit = getLimit(limit);
    const skip = getSkip(nextPageToken);
    const query: FilterQuery<Video> = { categoryId };
    const sort = { publishedAt: -1 };
    return findWithMap<Video>(this.videosCollection, query, this.id, undefined, sort, limit, skip, project).then((list) => {
      return { list, nextPageToken: getNextPageToken(list, limit, skip) };
    });
  }
  getPopularVideosByRegion(regionCode: string, limit?: number, nextPageToken?: string, fields?: string[]): Promise<ListResult<Video>> {
    const project = buildProject(fields, undefined, this.idMap, true);
    limit = getLimit(limit);
    const skip = getSkip(nextPageToken);
    const sort = { publishedAt: -1 };
    return findWithMap<Video>(this.videosCollection, undefined, this.id, undefined, sort, limit, skip, project).then((list) => {
      return { list, nextPageToken: getNextPageToken(list, limit, skip) };
    });
  }
}

export function getNextPageToken<T>(list: T[], limit: number, skip: number, name?: string): string {
  if (!name || name.length === 0) {
    name = 'id';
  }
  if (list && list.length < limit) {
    return undefined;
  } else {
    return list && list.length > 1 ? `${list[list.length - 1][name]}|${skip + limit}` : undefined;
  }
}
export function getLimit(limit?: number, d?: number): number {
  if (limit) {
    return limit;
  }
  if (d && d > 0) {
    return d;
  }
  return 12;
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
