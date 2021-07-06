import { Channel, ChannelSync, Playlist, PlaylistCollection, PlaylistVideo, Video } from '../video-plus';

export interface TubeService {
  upsertChannel(channel: Channel): Promise<number>;
  upsertPlaylist(playlist: Playlist): Promise<number>;
  upsertChannelsSync(channel: ChannelSync): Promise<number>;
  upsertVideos(videos: Video[]): Promise<number>;
  upsertPlaylistVideo(playlistVideo: PlaylistVideo): Promise<number>;
  allChannels(): Promise<Channel[]>;
  allVideos(): Promise<Video[]>;
  allPlaylists(): Promise<Playlist[]>;
  loadChannel(channelId: string): Promise<Channel>;
  loadPlaylist(playlistId: string): Promise<Playlist>;
  loadVideo(videoId: string): Promise<Video>;
  loadChannelsSync(channelId: string): Promise<ChannelSync>;
  loadPlaylistVideo(playlistId: string): Promise<PlaylistCollection>;
  updateChannelSync(channel: ChannelSync): Promise<number>;
  updatePlaylistVideo(playlistVideo: PlaylistCollection): Promise<number>;
}
