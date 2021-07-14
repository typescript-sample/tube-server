import { Collection, Db, FilterQuery } from "mongodb";
import { CategoryCollection, Channel, ChannelSM, ChannelSync, Item, ItemSM, ListResult, Playlist, PlaylistCollection, PlaylistSM, PlaylistVideo, Video, VideoCategory, VideoService } from "../../video-plus";
import { buildProject, findOne, findWithMap, upsert } from "./mongo";
export class MongoTubeService implements VideoService {
  private readonly id = "id";
  private readonly channelsCollection: Collection;
  private readonly videosCollection: Collection;
  private readonly playlistCollection: Collection;
  private readonly playlistVideoCollection: Collection;
  private readonly categoryCollection: Collection;
  constructor(db: Db) {
    this.channelsCollection = db.collection("channel");
    this.playlistCollection = db.collection("playlist");
    this.videosCollection = db.collection("video");
    this.playlistVideoCollection = db.collection("playlistVideo");
    this.categoryCollection = db.collection("category");
    this.saveCategory = this.saveCategory.bind(this);
  }
  getChannel(channelId: string): Promise<Channel> {
    const query: FilterQuery<any> = { _id: channelId };
    return findOne<Channel>(this.channelsCollection, query, this.id);
  }
  getChannels(channelIds: string[]): Promise<Channel[]> {
    const query: FilterQuery<any> = { _id: { $in: channelIds } };
    return findWithMap<Channel>(this.channelsCollection, query, this.id);
  }
  getPlaylists(playlistIds: string[]): Promise<Playlist[]> {
    const query: FilterQuery<any> = { _id: { $in: playlistIds } };
    return findWithMap<Playlist>(this.playlistCollection, query, this.id);
  }
  getPlaylist(playlistId: string): Promise<Playlist> {
    return this.getPlaylists([playlistId]).then((playlists) => playlists[0]);
  }
  getChannelPlaylists(channelId: string, limit: number, oldTotal: string): Promise<ListResult<Playlist>> {
    const query: FilterQuery<any> = {
      channelId: channelId,
    };
    const sort = { publishedAt: -1 };
    return findWithMap<any>(this.playlistCollection, query, this.id, undefined, sort, limit, Number(oldTotal)).then((r) => {
      const result: ListResult<Playlist> = {
        list: r,
        nextPageToken: `${r[r.length - 1].id}|${Number(oldTotal) + limit}`,
      };
      return result;
    });
  }
  getVideos(videoIds: string[], fields?: string[]): Promise<Video[]> {
    const projection = buildProject(fields);
    const query: FilterQuery<any> = { _id: { $in: videoIds } };
    return findWithMap<Video>(this.videosCollection, query, this.id, undefined, undefined, undefined, undefined, projection);
  }
  getVideo(videoId: string, fields?: string[]): Promise<Video> {
    return this.getVideos([videoId], fields).then((videos) => videos[0]);
  }
  getPlaylistVideo(id: string): Promise<PlaylistCollection> {
    const query: FilterQuery<any> = { _id: id };
    return findOne<PlaylistCollection>(this.playlistVideoCollection, query, this.id);
  }
  getPlaylistVideos(playlistId: string, max: number, nextPageToken: string): Promise<ListResult<PlaylistVideo>> {
    const queryPlaylist: FilterQuery<any> = { _id: playlistId };
    return findOne<PlaylistCollection>(this.playlistVideoCollection, queryPlaylist, this.id).then((playlist) => {
      let next: number = 0;
      let checkNext: boolean = false;
      if (nextPageToken) {
        next = playlist.videos.indexOf(nextPageToken.toString()) + 1;
        if (playlist.videos.indexOf(nextPageToken.toString()) !== playlist.videos.length - 1) {
          checkNext = true;
        }
      }
      const ids = playlist.videos.slice(next, max + next);
      const query: FilterQuery<any> = { _id: { $in: ids } };
      const projection = {
        _id: 1,
        title: 1,
        description: 1,
        publishedAt: 1,
        standardThumbnail: 1,
        maxresThumbnail: 1,
        channelId: 1,
        channelTitle: 1,
        localizedTitle: 1,
        localizedDescription: 1,
      };
      return findWithMap<PlaylistVideo>(this.videosCollection, query, this.id, undefined, undefined, undefined, undefined, projection).then((r) => {
        const list = formatPlaylistVideo(r);
        const result: ListResult<PlaylistVideo> = { list };
        result.nextPageToken = checkNext ? undefined : ids[ids.length - 1];
        result.total = playlist.videos.length;
        result.limit = playlist.videos.length;
        return result;
      });
    });
  }
  getChannelVideos(channelId: string, limit: number, oldTotal: string): Promise<ListResult<PlaylistVideo>> {
    const query: FilterQuery<any> = {
      channelId: channelId,
    };
    const projection = {
      _id: 1,
      title: 1,
      description: 1,
      publishedAt: -1,
      standardThumbnail: 1,
      maxresThumbnail: 1,
      channelId: 1,
      channelTitle: 1,
      localizedTitle: 1,
      localizedDescription: 1,
    };
    return findWithMap<PlaylistVideo>(this.videosCollection, query, this.id, undefined, undefined, limit, Number(oldTotal), projection).then((r) => {
      const list = formatPlaylistVideo(r);
      const result: ListResult<PlaylistVideo> = {
        list,
        nextPageToken: `${r[r.length - 1].id}|${Number(oldTotal) + limit}`,
      };
      return result;
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
  searchVideos(itemSM: ItemSM, limit: number, oldTotal: string): Promise<ListResult<Item>> {
    const newQuery: any = {};
    const arrayKeys = Object.keys(itemSM);
    const arrayValues = Object.values(itemSM);
    arrayKeys.forEach((key, index) => {
      if (key === "q") {
        newQuery["title"] = { $regex: `.*${itemSM.q}.*`, $options: "i" };
      } else if (key === "videoDuration") {
        switch (itemSM.videoDuration) {
          case "any":
            newQuery["duration"] = { $gt: 0 };
            break;
          case "short":
            newQuery["duration"] = { $gt: 0, $lte: 240 };
            break;
          case "medium":
            newQuery["duration"] = { $gt: 240, $lte: 1200 };
            break;
          case "long":
            newQuery["duration"] = { $gt: 1200 };
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
    return findWithMap<Item>(this.videosCollection, query, this.id, undefined, sort, limit, Number(oldTotal)).then((r) => {
      const result: ListResult<Item> = {
        list: r,
        nextPageToken: `${r[r.length - 1].id}|${Number(oldTotal) + limit}`,
      };
      return result;
    });
  }
  search(itemSM: ItemSM, limit: number, oldTotal: string): Promise<ListResult<Item>> {
    const newQuery: any = {};
    const arrayKeys = Object.keys(itemSM);
    const arrayValues = Object.values(itemSM);
    arrayKeys.forEach((key, index) => {
      if (key === "q") {
        newQuery["title"] = { $regex: `.*${itemSM.q}.*`, $options: "i" };
      } else {
        if (arrayValues[index] !== undefined) {
          newQuery[key] = arrayValues[index];
        }
      }
    });
    switch (itemSM.videoDuration) {
      case "any":
        newQuery["duration"] = { $gt: 0 };
        break;
      case "short":
        newQuery["duration"] = { $gt: 0, $lte: 240 };
        break;
      case "medium":
        newQuery["duration"] = { $gt: 240, $lte: 1200 };
        break;
      case "long":
        newQuery["duration"] = { $gt: 1200 };
        break;
      default:
        break;
    }
    const sort = { publishedAt: -1 };
    const query: FilterQuery<any> = newQuery;
    return findWithMap<any>(this.videosCollection, query, this.id, undefined, sort, limit, Number(oldTotal)).then((r) => {
      const result: ListResult<Item> = {
        list: r,
        nextPageToken: `${r[r.length - 1].id}|${Number(oldTotal) + limit}`,
      };
      return result;
    });
  }
  searchPlaylists(playlistSM: PlaylistSM, limit: number, oldTotal: string): Promise<ListResult<Playlist>> {
    const newQuery: any = {};
    const arrayKeys = Object.keys(playlistSM);
    const arrayValues = Object.values(playlistSM);
    arrayKeys.forEach((key, index) => {
      if (key === "q") {
        newQuery["title"] = {
          $regex: `.*${playlistSM.q}.*`,
          $options: "i",
        };
      } else {
        if (arrayValues[index] !== undefined) {
          newQuery[key] = arrayValues[index];
        }
      }
    });
    const sort = { publishedAt: -1 };
    const query: FilterQuery<any> = newQuery;
    return findWithMap<any>(this.playlistCollection, query, this.id, undefined, sort, limit, Number(oldTotal)).then((r) => {
      const result: ListResult<Playlist> = {
        list: r,
        nextPageToken: `${r[r.length - 1].id}|${Number(oldTotal) + limit}`,
      };
      return result;
    });
  }
  searchChannels(channelSM: ChannelSM, limit: number, oldTotal: string): Promise<ListResult<Channel>> {
    const newQuery: any = {};
    const arrayKeys = Object.keys(channelSM);
    const arrayValues = Object.values(channelSM);
    arrayKeys.forEach((key, index) => {
      if (key === "q") {
        newQuery["title"] = {
          $regex: `.*${channelSM.q}.*`,
          $options: "i",
        };
      } else {
        if (arrayValues[index] !== undefined) {
          newQuery[key] = arrayValues[index];
        }
      }
    });
    const sort = { publishedAt: -1 };
    const query: FilterQuery<any> = newQuery;
    return findWithMap<any>(this.channelsCollection, query, this.id, undefined, sort, limit, Number(oldTotal)).then((r) => {
      const result: ListResult<Channel> = {
        list: r,
        nextPageToken: `${r[r.length - 1].id}|${Number(oldTotal) + limit}`,
      };
      return result;
    });
  }
  getRelatedVideos(videoId: string, limit: number, oldTotal: string): Promise<ListResult<Item>> {
    return this.getVideos([videoId]).then((video) => {
      const query: FilterQuery<any> = {
        tags: { $in: video[0].tags },
        _id: { $nin: [videoId] },
      };
      const sort = { publishedAt: -1 };
      return findWithMap<Item>(this.videosCollection, query, this.id, undefined, sort, limit, Number(oldTotal)).then((r) => {
        const result: ListResult<Item> = {
          list: r,
          nextPageToken: `${r[r.length - 1].id}|${oldTotal + limit}`,
        };
        return result;
      });
    });
  }
  getPopularVideos(regionCode: string, videoCategoryId: string, limit: number, oldTotal: string): Promise<ListResult<Video>> {
    const sort = { publishedAt: -1 };
    return findWithMap<Video>(this.videosCollection, undefined, this.id, undefined, sort, limit, Number(oldTotal)).then((r) => {
      const result: ListResult<Video> = {
        list: r,
        nextPageToken: `${r[r.length - 1].id}|${Number(oldTotal) + limit}`,
      };
      return result;
    });
  }
  getPopularVideosByCategory(categoryId: string, limit: number, oldTotal: string): Promise<ListResult<Video>> {
    const query: FilterQuery<any> = {
      categoryId: categoryId,
    };
    const sort = { publishedAt: -1 };
    return findWithMap<Video>(this.videosCollection, query, this.id, undefined, sort, limit, Number(oldTotal)).then((r) => {
      const result: ListResult<Video> = {
        list: r,
        nextPageToken: `${r[r.length - 1].id}|${oldTotal + limit}`,
      };
      return result;
    });
  }
  getPopularVideosByRegion(regionCode: string, limit: number, oldTotal: string): Promise<ListResult<Video>> {
    const sort = { publishedAt: -1 };
    return findWithMap<Video>(this.videosCollection, undefined, this.id, undefined, sort, limit, Number(oldTotal)).then((r) => {
      const result: ListResult<Video> = {
        list: r,
        nextPageToken: `${r[r.length - 1].id}|${oldTotal + limit}`,
      };
      return result;
    });
  }
}
export const formatPlaylistVideo = (r: PlaylistVideo[]) => {
  const list = r.map((item) => {
    return {
      id: item.id,
      title: item.title,
      description: item.description,
      publishedAt: item.publishedAt,
      standardThumbnail: item.standardThumbnail,
      maxresThumbnail: item.maxresThumbnail,
      channelId: item.channelId,
      channelTitle: item.channelTitle,
      localizedTitle: item.localizedTitle,
      localizedDescription: item.localizedDescription,
      videoOwnerChannelId: item.channelId,
      videoOwnerChannelTitle: item.channelTitle,
    };
  });
  return list;
};
