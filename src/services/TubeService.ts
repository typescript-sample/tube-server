import {
  Channel,
  ChannelSM,
  ChannelSync,
  ItemSM,
  ListResult,
  Playlist,
  PlaylistCollection,
  PlaylistSM,
  PlaylistVideo,
  Video,
} from "../video-plus";
import { CategoryCollection } from "./mongo/MongoTubeService";

export interface TubeService {
  getChannel(channelId: string): Promise<Channel>;
  getChannels(channelIds: string[]): Promise<Channel[]>;
  getPlaylists(playlistIds: string[]): Promise<Playlist[]>;
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
  searchVideos(
    itemSM: ItemSM,
    maxResults: number,
    videoId: string,
    publishedAt: Date,
    duration: string
  ): Promise<Video[]>;
  searchPlaylists(
    playlistSM: PlaylistSM,
    maxResults: number,
    playlistId: string,
    publishedAt: Date
  ): Promise<Playlist[]>;
  searchChannels(
    channelSM: ChannelSM,
    maxResults: number,
    channelId: string,
    publishedAt: Date
  ): Promise<Playlist[]>;
}
