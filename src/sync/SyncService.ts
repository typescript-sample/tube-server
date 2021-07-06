export interface SyncService {
  syncChannel(channelId: string): Promise<number>;
  syncPlaylist(playlistId: string): Promise<number>;
}
