import { Request, Response } from "express";
import { CategoryCollection } from "services/mongo/MongoTubeService";
import {
  ItemSM,
  ListResult,
  Playlist,
  PlaylistVideo,
  Video,
  YoutubeClient,
} from "video-plus";
import { TubeService } from "../services/TubeService";

export class TubeController {
  constructor(private tubeService: TubeService, private client: YoutubeClient) {
    this.getChannel = this.getChannel.bind(this);
    this.getChannels = this.getChannels.bind(this);
    this.getChannelPlaylists = this.getChannelPlaylists.bind(this);
    this.getChannelsSync = this.getChannelsSync.bind(this);
    this.getPlaylistVideos = this.getPlaylistVideos.bind(this);
    this.getChannelVideos = this.getChannelVideos.bind(this);
    this.getCategory = this.getCategory.bind(this);
    this.getVideos = this.getVideos.bind(this);
    this.searchVideos = this.searchVideos.bind(this);
  }
  getChannel(req: Request, res: Response) {
    const { channelId } = req.params;
    if (!channelId.toString()) {
      return res.status(400).send("Id cannot be empty");
    }
    this.tubeService
      .getChannel(channelId)
      .then((channel) => {
        if (channel) {
          res.status(200).json(channel);
        } else {
          res.status(404).json(null);
        }
      })
      .catch((err) => res.status(500).send(err));
  }
  getChannels(req: Request, res: Response) {
    const { channelId } = req.query;
    if (!channelId.toString()) {
      return res.status(500).send("require channelId");
    } else {
      const channelIdsArray = channelId.toString().split(",");
      this.tubeService
        .getChannels(channelIdsArray)
        .then((channels) => res.status(200).json(channels))
        .catch((err) => res.status(500).json(err));
    }
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
  getChannelPlaylists(req: Request, res: Response) {
    const { channelId, maxResults, nextPageToken } = req.query;
    let next = new Date();
    let playlistId = "";
    if (!channelId.toString()) {
      return res.status(500).send("require channelId");
    } else {
      if (nextPageToken) {
        const arr = nextPageToken.toString().split("|");
        playlistId = arr[0];
        next = new Date(arr[1]);
        if (arr.length < 2 || new Date(arr[1]).toString() === "Invalid Date") {
          return res.status(500).send("Next Page Token is not valid");
        }
      }
      const max = maxResults ? Number(maxResults) : 10;
      this.tubeService
        .getChannelPlaylists(channelId.toString(), playlistId, max, next)
        .then((playlists) => {
          if (playlists.length > 0) {
            const result: ListResult<Playlist> = {
              list: playlists,
              nextPageToken: `${playlists[playlists.length - 1].id}|${playlists[
                playlists.length - 1
              ].publishedAt.toISOString()}`,
            };
            return res.status(200).json(result);
          } else {
            return res.status(200).json([]);
          }
        });
    }
  }
  getPlaylistVideos(req: Request, res: Response) {
    const { playlistId, maxResults, nextPageToken } = req.query;
    const max = maxResults ? Number(maxResults) : 10;
    this.tubeService
      .getPlaylistVideo(playlistId.toString())
      .then((item) => {
        let next: number = 0;
        let checkNext: boolean = false;
        if (nextPageToken) {
          next = item.videos.indexOf(nextPageToken.toString()) + 1;
          if (
            item.videos.indexOf(nextPageToken.toString()) !==
            item.videos.length - 1
          ) {
            checkNext = true;
          }
        }
        const ids = item.videos.slice(next, max + next);
        this.tubeService
          .getPlaylistVideos(ids)
          .then((playlistVideo) => {
            const result: ListResult<PlaylistVideo> = {
              list: playlistVideo,
              nextPageToken: checkNext ? undefined : ids[ids.length - 1],
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
  async getCategory(req: Request, res: Response) {
    const { regionCode } = req.query;
    const categoryCollection = await this.tubeService.getCategory(
      regionCode.toString()
    );
    if (categoryCollection) {
      return res.status(200).json(categoryCollection);
    } else {
      const category = await this.client.getCagetories(regionCode.toString());
      if (category) {
        const titleCategoryToSave = category
          .filter((item) => item.assignable === true)
          .map((item) => item.title);
        const newCategoryCollection: CategoryCollection = {
          id: regionCode.toString(),
          data: titleCategoryToSave,
        };
        await this.tubeService.saveCategory(newCategoryCollection);
        return res.status(200).json(newCategoryCollection);
      } else {
        return res.status(500).send("regionCode is not valid");
      }
    }
  }
  getVideos(req: Request, res: Response) {
    const { videoId } = req.query;
    if (!videoId.toString()) {
      return res.status(500).send("require videoId");
    } else {
      const arrayVideoId = videoId.toString().split(",");
      this.tubeService
        .getVideos(arrayVideoId)
        .then((videos) => res.status(200).json(videos))
        .catch(() => res.status(500).send([]));
    }
  }
  searchVideos(req: Request, res: Response) {
    const { keyword, channelId, maxResults } = req.query;
    const itemSM: ItemSM = {
      keyword: keyword ? keyword.toString() : "",
      channelId: channelId ? channelId.toString() : undefined,
    };
    this.tubeService
      .searchVideos(itemSM, Number(maxResults))
      .then((results) => res.status(200).json(results))
      .catch((err) => res.status(500).json(err));
  }
}
