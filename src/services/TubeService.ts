import {
  Channel,
  ChannelSync,
  ItemSM,
  ListResult,
  Playlist,
  PlaylistCollection,
  PlaylistVideo,
  Video,
} from "../video-plus";
import { CategoryCollection } from "./mongo/MongoTubeService";

export interface TubeService {
  getChannelSync(channelId: string): Promise<ChannelSync>;
  getChannel(channelId: string): Promise<Channel>;
  getChannels(channelIds: string[]): Promise<Channel[]>;
  getChannelPlaylists(
    channelId: string,
    playlistId: string,
    maxResults: number,
    publishedAt: Date
  ): Promise<Playlist[]>;
  getVideos(videoId: string[]): Promise<Video[]>;
  getPlaylistVideo(id: string): Promise<PlaylistCollection>;
  getVideoByPlaylistId(videoIds: string[]): Promise<Video[]>;
  getPlaylistVideos(ids: string[]): Promise<PlaylistVideo[]>;
  getChannelVideos(
    channelId: string,
    videoId: string,
    maxResults: number,
    publishedAt: Date
  ): Promise<PlaylistVideo[]>;
  getCategory(regionCode: string): Promise<CategoryCollection>;
  saveCategory(category: CategoryCollection): Promise<number>;
  searchVideos(itemSM: ItemSM, maxResults: number): Promise<Video[]>;
  // searchVideos(itemSM: ItemSM, maxResults: number): Promise<Video[]>;
}
