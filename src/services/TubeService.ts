import {
  Channel,
  ChannelSync,
  ListResult,
  PlaylistCollection,
  PlaylistVideo,
  Video,
} from "../video-plus";
import { CategoryCollection } from "./mongo/MongoTubeService";

export interface TubeService {
  getChannelSync(channelId: string): Promise<ChannelSync>;
  getAllChannels(): Promise<Channel[]>;
  getAllVideos(): Promise<Video[]>;
  getChannel(channelId: string): Promise<Channel>;
  getVideo(videoId: string): Promise<Video>;
  getPlaylistVideo(id: string): Promise<PlaylistCollection>;
  getVideoByPlaylistId(videoIds: string[]): Promise<Video[]>;
  getPlaylistVideos(ids: string[]): Promise<PlaylistVideo[]>;
  getChannelVideos(
    channelId: string,
    videoId: string,
    maxResults: number,
    publishedAt: Date
  ): Promise<PlaylistVideo[]>;
}
