import { Application } from 'express';
import { ApplicationContext } from './context';

export function route(app: Application, ctx: ApplicationContext): void {
  const tube = ctx.tubeController;
  const sync = ctx.syncController;
  const subs = ctx.subscriptionController;

  app.post('/tube/channels', sync.syncChannel);
  app.post('/tube/channelss', sync.syncChannels);
  app.post('/tube/playlists', sync.syncPlaylist);
  
  app.get('/tube/category', tube.getCategories);
  app.get('/tube/channels/subscriptions/:id', subs.getSubscriptions);
  app.get('/tube/channels/search', tube.searchChannels);
  app.get('/tube/channels/list', tube.getChannels);
  app.get('/tube/channels/:id', tube.getChannel);
  app.get('/tube/playlists/search', tube.searchPlaylists);
  app.get('/tube/playlists/list', tube.getPlaylists);
  app.get('/tube/playlists', tube.getChannelPlaylists);
  app.get('/tube/playlists/:id', tube.getPlaylist);
  app.get('/tube/videos/popular', tube.getPopularVideos);
  app.get('/tube/videos/search', tube.searchVideos);
  app.get('/tube/videos/list', tube.getVideos);
  app.get('/tube/videos/:id', tube.getVideo);
  app.get('/tube/videos/:id/related', tube.getRelatedVideos);
  app.get('/tube/videos', tube.getVideoList); // to get channel videos or playlist videos
}
