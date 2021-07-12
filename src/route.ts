import { Application } from "express";
import { ApplicationContext } from "./context";

export function route(app: Application, ctx: ApplicationContext): void {
  const tube = ctx.tubeController;
  const sync = ctx.syncController;

  app.post("/tube/channels", sync.syncChannel);
  app.post("/tube/playlists", sync.syncPlaylist);

  app.get("/tube/channel", tube.getChannel);
  app.get("/tube/channels", tube.getChannels);
  app.get("/tube/playlists", tube.getChannelPlaylists);
  app.get("/tube/videos", tube.getVideos);

  app.get("/tube/playlistVideos", tube.getPlaylistVideos);
  app.get("/tube/channelVideos", tube.getChannelVideos);
  app.get("/tube/category/", tube.getCategory);
  app.get("/tube/search", tube.searchVideos);
}
