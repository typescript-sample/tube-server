import { Application } from "express";
import { ApplicationContext } from "./context";

export function route(app: Application, ctx: ApplicationContext): void {
  const tube = ctx.tubeController;
  const sync = ctx.syncController;

  app.post("/tube/channels", sync.syncChannel);
  app.post("/tube/playlists", sync.syncPlaylist);

  app.get("/tube/channels", tube.getAllChannels);
  app.get("/tube/videos", tube.getAllVideos);
  app.get("/tube/channels/:id", tube.getChannel);
  app.get("/tube/videos/:id", tube.getPlaylistVideo);

  app.get("/tube/playlistVideos", tube.getPlaylistVideos);
  app.get("/tube/channelVideos", tube.getChannelVideos);
  app.get("/tube/category/", tube.getCategory);
}
