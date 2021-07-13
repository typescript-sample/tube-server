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
    max: number,
    oldTotal: number
  ): Promise<Playlist[]>;
  getVideos(videoId: string[]): Promise<Video[]>;
  getPlaylistVideo(id: string): Promise<PlaylistCollection>;
  getVideoByPlaylistId(videoIds: string[]): Promise<Video[]>;
  getPlaylistVideos(ids: string[]): Promise<PlaylistVideo[]>;
  getChannelVideos(
    channelId: string,
    maxResults: number,
    oldTotal: number
  ): Promise<PlaylistVideo[]>;
  getCategory(regionCode: string): Promise<CategoryCollection>;
  saveCategory(category: CategoryCollection): Promise<number>;
  searchVideos(
    itemSM: ItemSM,
    maxResults: number,
    oldTotal: number,
    duration: string
  ): Promise<Video[]>;
  searchPlaylists(
    playlistSM: PlaylistSM,
    maxResults: number,
    oldTotal: number
  ): Promise<Playlist[]>;
  searchChannels(
    channelSM: ChannelSM,
    maxResults: number,
    oldTotal: number
  ): Promise<Playlist[]>;
  getRelatedVideo(
    tags: string[],
    maxResults: number,
    oldTotal: number,
    videoId: string
  ): Promise<Video[]>;
  getPopularVideos(maxResults: number, oldTotal: number): Promise<Video[]>;
}
