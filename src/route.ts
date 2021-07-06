import { Application } from 'express';
import { ApplicationContext } from './context';

export function route(app: Application, ctx: ApplicationContext): void {
  const tube = ctx.tubeController;
  const sync = ctx.syncController;

  app.post('/tube/channels', sync.syncChannel);
  app.post('/tube/playlists', sync.syncPlaylist);

  app.get('/tube/channels', tube.allChannels);
  app.get('/tube/videos', tube.allVideos);
  app.get('/tube/channels/:id', tube.loadChannel);
  app.get('/tube/videos/:id', tube.loadPlaylistVideo);
}
