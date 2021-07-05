import { Application } from 'express';
import { ApplicationContext } from './context';

export function route(app: Application, ctx: ApplicationContext): void {
  const tube = ctx.tubeController;
  app.post('/tube/channels', tube.syncChannel);
  app.post('/tube/playlists', tube.syncPlaylist);
  app.get('/tube/channels', tube.allChannels);
  app.get('/tube/videos', tube.allVideos);
  app.get('/tube/channels/:id', tube.loadChannel);
  app.get('/tube/videos/:id', tube.loadPlaylistVideo);
}
