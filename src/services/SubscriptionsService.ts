import { Channel, SyncService, VideoService } from "../../video-services";

export class SubscriptionsClient {
  constructor(private syncService: SyncService, private videoService: VideoService) {
    this.getSubscriptions = this.getSubscriptions.bind(this);
  }
  getSubscriptions(channelId: string, fields?: string[]): Promise<Channel[]> {
    return this.videoService.getSubscriptions(channelId).then(r => {
      return this.syncService.syncChannels(r).then(() => {
        return this.videoService.getChannels(r, fields).then(res => {
          return res;
        });
      });
    });
  }
}