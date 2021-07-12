import { Collection, Db, FilterQuery } from "mongodb";
import {
  Channel,
  ChannelSync,
  ItemSM,
  Playlist,
  PlaylistCollection,
  PlaylistVideo,
  Video,
} from "../../video-plus";
import { TubeService } from "../TubeService";
import { findOne, findWithMap, upsert } from "./mongo";
import { buildQuery } from "./query";
import { SearchBuilder } from "./SearchBuilder";

export interface CategoryCollection {
  id: string;
  data: string[];
}
export class MongoTubeService implements TubeService {
  private readonly id = "id";
  private readonly channelsCollection: Collection;
  private readonly videosCollection: Collection;
  private readonly channelSyncCollection: Collection;
  private readonly playlistCollection: Collection;
  private readonly playlistVideoCollection: Collection;
  private readonly categoryCollection: Collection;
  constructor(db: Db) {
    this.channelsCollection = db.collection("channel");
    this.channelSyncCollection = db.collection("channelSync");
    this.playlistCollection = db.collection("playlist");
    this.videosCollection = db.collection("video");
    this.playlistVideoCollection = db.collection("playlistVideo");
    this.categoryCollection = db.collection("category");
  }
  getChannel(channelId: string): Promise<Channel> {
    const query: FilterQuery<any> = { _id: channelId };
    return findOne<Channel>(this.channelsCollection, query, this.id);
  }
  getChannels(channelIds: string[]): Promise<Channel[]> {
    const query: FilterQuery<any> = { _id: { $in: channelIds } };
    return findWithMap<Channel>(this.channelsCollection, query, this.id);
  }
  getChannelSync(channelId: string): Promise<ChannelSync> {
    const query: FilterQuery<any> = { _id: channelId };
    return findOne<ChannelSync>(this.channelSyncCollection, query, this.id);
  }
  getChannelPlaylists(
    channelId: string,
    playlistId: string,
    maxResults: number,
    publishedAt: Date
  ): Promise<Playlist[]> {
    const query: FilterQuery<any> = {
      channelId: channelId,
      publishedAt: { $lte: publishedAt },
    };
    const sort = { publishedAt: -1 };
    return findWithMap<any>(
      this.playlistCollection,
      query,
      this.id,
      undefined,
      sort,
      maxResults,
      playlistId !== "" ? 1 : undefined
    );
  }
  getVideos(videoIds: string[]): Promise<Video[]> {
    const query: FilterQuery<any> = { _id: { $in: videoIds } };
    return findWithMap<Video>(this.videosCollection, query, this.id);
  }
  getPlaylistVideo(id: string): Promise<PlaylistCollection> {
    const query: FilterQuery<any> = { _id: id };
    return findOne<PlaylistCollection>(
      this.playlistVideoCollection,
      query,
      this.id
    );
  }
  async getPlaylistVideos(ids: string[]): Promise<PlaylistVideo[]> {
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
    const r = await findWithMap<PlaylistVideo>(
      this.videosCollection,
      query,
      this.id,
      undefined,
      undefined,
      undefined,
      undefined,
      projection
    );
    return r.map((item) => {
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
  }
  async getChannelVideos(
    channelId: string,
    videoId: string,
    maxResults: number,
    publishedAt: Date
  ): Promise<PlaylistVideo[]> {
    const query: FilterQuery<any> = {
      channelId: channelId,
      publishedAt: { $lte: publishedAt },
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
    const r = await findWithMap<PlaylistVideo>(
      this.videosCollection,
      query,
      this.id,
      undefined,
      undefined,
      maxResults,
      videoId !== "" ? 1 : undefined,
      projection
    );
    return r.map((item) => {
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
  }
  getVideoByPlaylistId(videoIds: string[]): Promise<Video[]> {
    const query: FilterQuery<any> = { _id: videoIds };
    return findWithMap<Video>(this.videosCollection, query, this.id);
  }
  getCategory(regionCode: string): Promise<CategoryCollection> {
    const query: FilterQuery<any> = { _id: regionCode };
    return findOne<CategoryCollection>(this.categoryCollection, query);
  }
  saveCategory(category: CategoryCollection): Promise<number> {
    return upsert(this.categoryCollection, category, this.id);
  }
  // searchVideos(itemSM: ItemSM, maxResults: number): Promise<any> {
  //   const builder = new SearchBuilder<Video, ItemSM>(
  //     this.videosCollection,
  //     buildQuery,
  //     undefined
  //   );
  //   return builder.search(itemSM, maxResults);
  // }
  searchVideos(itemSM: ItemSM, maxResults: number): Promise<Video[]> {
    const query: FilterQuery<any> = {
      title: { $text: { $search: itemSM.keyword } },
    };
    console.log(query);
    return findWithMap<Video>(
      this.videosCollection,
      query,
      undefined,
      undefined,
      undefined,
      undefined,
      maxResults
    );
  }
}
