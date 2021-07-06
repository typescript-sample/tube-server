import { Channel, ChannelSync, Video } from '../video-plus';

export interface TubeService {
  getChannelSync(channelId: string): Promise<ChannelSync>;
  getAllChannels(): Promise<Channel[]>;
  getAllVideos(): Promise<Video[]>;
  getChannel(channelId: string): Promise<Channel>;
  getVideo(videoId: string): Promise<Video>;
}
