import { Request, Response } from "express";
import { CategoryCollection } from "services/mongo/MongoTubeService";
import { ListResult, PlaylistVideo, Video, YoutubeClient } from "video-plus";
import { TubeService } from "../services/TubeService";

export class TubeController {
  constructor(private tubeService: TubeService, private client: YoutubeClient) {
    this.getAllChannels = this.getAllChannels.bind(this);
    this.getAllVideos = this.getAllVideos.bind(this);
    this.getChannel = this.getChannel.bind(this);
    this.getPlaylistVideo = this.getPlaylistVideo.bind(this);
    this.getChannelsSync = this.getChannelsSync.bind(this);
    this.getPlaylistVideos = this.getPlaylistVideos.bind(this);
    this.getChannelVideos = this.getChannelVideos.bind(this);
  }
  getAllChannels(req: Request, res: Response) {
    this.tubeService.getAllChannels().then(
      (channels) => res.status(200).json(channels),
      (err) => res.status(500).send(err)
    );
  }
  getAllVideos(req: Request, res: Response) {
    this.tubeService.getAllVideos().then(
      (videos) => res.status(200).json(videos),
      (err) => res.status(500).send(err)
    );
  }
  getChannel(req: Request, res: Response) {
    const { id } = req.params;
    if (!id || id.length === 0) {
      return res.status(400).send("Id cannot be empty");
    }
    this.tubeService
      .getChannel(id)
      .then((channel) => {
        if (channel) {
          res.status(200).json(channel);
        } else {
          res.status(404).json(null);
        }
      })
      .catch((err) => res.status(500).send(err));
  }
  getChannelsSync(req: Request, res: Response) {
    const { id } = req.params;
    if (!id || id.length === 0) {
      return res.status(400).send("Id cannot be empty");
    }
    this.tubeService
      .getChannelSync(id)
      .then((channel) => {
        if (channel) {
          res.status(200).json(channel);
        } else {
          res.status(404).json(null);
        }
      })
      .catch((err) => res.status(500).send(err));
  }
  getPlaylistVideo(req: Request, res: Response) {
    const { id } = req.params;
    if (!id || id.length === 0) {
      return res.status(400).send("Id cannot be empty");
    }
    this.tubeService.getPlaylistVideo(id).then((playlistVideo) => {
      this.tubeService
        .getVideoByPlaylistId(playlistVideo.videos)
        .then((videos) => {
          return res.status(200).json(videos);
        })
        .catch((err) => res.status(500).send(err));
    });
  }
  getPlaylistVideos(req: Request, res: Response) {
    const { playlistId, maxResults, nextPageToken } = req.query;
    const max = maxResults ? Number(maxResults) : 10;
    this.tubeService
      .getPlaylistVideo(playlistId.toString())
      .then((item) => {
        const next = nextPageToken
          ? item.videos.indexOf(nextPageToken.toString())
          : 0;
        const ids = item.videos.slice(next, max + next);
        this.tubeService
          .getPlaylistVideos(ids)
          .then((playlistVideo) => {
            const result: ListResult<PlaylistVideo> = {
              list: playlistVideo,
              nextPageToken: ids[ids.length - 1],
              total: item.videos.length,
              limit: item.videos.length,
            };
            res.status(200).json(result);
          })
          .catch((err) => res.status(500).json(err));
      })
      .catch(() => res.status(500).send("Id is not invalid"));
  }
  async getChannelVideos(req: Request, res: Response) {
    const { channelId, maxResults, nextPageToken } = req.query;
    let next = new Date();
    let videoId = "";
    if (nextPageToken) {
      const arr = nextPageToken.toString().split("|");
      videoId = arr[0];
      next = new Date(arr[1]);
      if (arr.length < 2 || new Date(arr[1]).toString() === "Invalid Date") {
        return res.status(500).send("Next Page Token is not valid");
      }
    }
    const max = maxResults ? Number(maxResults) : 10;
    this.tubeService
      .getChannelVideos(channelId.toString(), videoId, max, next)
      .then((playlistVideo) => {
        if (playlistVideo.length > 0) {
          const result: ListResult<PlaylistVideo> = {
            list: playlistVideo,
            nextPageToken: `${
              playlistVideo[playlistVideo.length - 1].id
            }|${playlistVideo[
              playlistVideo.length - 1
            ].publishedAt.toISOString()}`,
          };
          return res.status(200).json(result);
        } else {
          return res.status(200).json([]);
        }
      });
  }
}
