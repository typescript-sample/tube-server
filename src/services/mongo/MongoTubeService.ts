import { Collection, Db, FilterQuery } from "mongodb";
import {
  Channel,
  ChannelSync,
  ListResult,
  Playlist,
  PlaylistCollection,
  PlaylistVideo,
  Video,
} from "../../video-plus";
import { TubeService } from "../TubeService";
import { findOne, findWithMap, find } from "./mongo";

export class MongoTubeService implements TubeService {
  private readonly id = "id";
  private readonly channelsCollection: Collection;
  private readonly videosCollection: Collection;
  private readonly channelSyncCollection: Collection;
  private readonly playlistVideoCollection: Collection;
  constructor(db: Db) {
    this.channelsCollection = db.collection("channel");
    this.channelSyncCollection = db.collection("channelSync");
    this.videosCollection = db.collection("video");
    this.playlistVideoCollection = db.collection("playlistVideo");
  }

  getAllChannels(): Promise<Channel[]> {
    return findWithMap<Channel>(this.channelsCollection, {}, this.id);
  }
  getAllVideos(): Promise<Video[]> {
    return findWithMap<Video>(this.videosCollection, {}, this.id);
  }
  getChannel(channelId: string): Promise<Channel> {
    const query: FilterQuery<any> = { _id: channelId };
    return findOne<Channel>(this.channelsCollection, query, this.id);
  }
  getChannelSync(channelId: string): Promise<ChannelSync> {
    const query: FilterQuery<any> = { _id: channelId };
    return findOne<ChannelSync>(this.channelSyncCollection, query, this.id);
  }
  getVideo(videoId: string): Promise<Video> {
    const query: FilterQuery<any> = { _id: videoId };
    return findOne<Video>(this.videosCollection, query, this.id);
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
    maxResults: number,
    publishedAt: Date
  ): Promise<PlaylistVideo[]> {
    const query: FilterQuery<any> = {
      channelId: channelId,
      publishedAt: { $lt: publishedAt },
    };
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
      maxResults,
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
  getVideoByPlaylistId(videoIds: string[]): Promise<Video[]> {
    const query: FilterQuery<any> = { _id: videoIds };
    return findWithMap<Video>(this.videosCollection, query, this.id);
  }
}
