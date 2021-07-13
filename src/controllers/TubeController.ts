import e, { Request, Response } from "express";
import { CategoryCollection } from "services/mongo/MongoTubeService";
import {
  Channel,
  ChannelSM,
  ItemSM,
  ListResult,
  Playlist,
  PlaylistSM,
  PlaylistVideo,
  Video,
  YoutubeClient,
} from "video-plus";
import { TubeService } from "../services/TubeService";

export class TubeController {
  constructor(private tubeService: TubeService, private client: YoutubeClient) {
    this.getChannel = this.getChannel.bind(this);
    this.getChannels = this.getChannels.bind(this);
    this.getPlaylists = this.getPlaylists.bind(this);
    this.getChannelPlaylists = this.getChannelPlaylists.bind(this);
    this.getPlaylistVideos = this.getPlaylistVideos.bind(this);
    this.getChannelVideos = this.getChannelVideos.bind(this);
    this.getCategory = this.getCategory.bind(this);
    this.getVideos = this.getVideos.bind(this);
    this.searchVideos = this.searchVideos.bind(this);
    this.searchPlaylists = this.searchPlaylists.bind(this);
    this.searchChannels = this.searchChannels.bind(this);
    this.getRelatedVideos = this.getRelatedVideos.bind(this);
    this.getPopularVideos = this.getPopularVideos.bind(this);
  }
  getChannel(req: Request, res: Response) {
    const { id } = req.params;
    if (!id.toString()) {
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
  getChannels(req: Request, res: Response) {
    const { id } = req.query;
    if (!id.toString()) {
      return res.status(500).send("require id");
    } else {
      const channelIdsArray = id.toString().split(",");
      return this.tubeService
        .getChannels(channelIdsArray)
        .then((channels) => {
          const result: ListResult<Channel> = {
            list: channels,
            total: channels.length,
            limit: channels.length,
          };
          return res.status(200).json(result);
        })
        .catch((err) => res.status(500).json(err));
    }
  }
  getPlaylists(req: Request, res: Response) {
    const { id } = req.query;
    if (!id.toString()) {
      return res.status(500).send("require id");
    } else {
      const playlistIdArray = id.toString().split(",");
      return this.tubeService
        .getPlaylists(playlistIdArray)
        .then((playlists) => {
          const results: ListResult<Playlist> = {
            list: playlists,
            total: playlists.length,
            limit: playlists.length,
          };
          return res.status(200).json(results);
        })
        .catch((err) => res.status(500).json(err));
    }
  }
  getChannelPlaylists(req: Request, res: Response) {
    const { id, limit, nextPageToken } = req.query;
    let oldTotal = 0;
    if (!id.toString()) {
      return res.status(500).send("require id");
    } else {
      const max = limit ? Number(limit) : 10;
      if (nextPageToken) {
        const arr = nextPageToken.toString().split("|");
        if (arr.length < 2 || new Date(arr[2]).toString() === "Invalid Date") {
          return res.status(500).send("Next Page Token is not valid");
        }
        oldTotal = Number(arr[1]);
      }
      this.tubeService
        .getChannelPlaylists(id.toString(), max, oldTotal)
        .then((playlists) => {
          if (playlists.length > 0) {
            const result: ListResult<Playlist> = {
              list: playlists,
              nextPageToken: `${playlists[playlists.length - 1].id}|${
                oldTotal + max
              }`,
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
    let oldTotal = 0;
    if (nextPageToken) {
      const arr = nextPageToken.toString().split("|");
      if (arr.length < 2 || new Date(arr[1]).toString() === "Invalid Date") {
        return res.status(500).send("Next Page Token is not valid");
      }
      oldTotal = Number(arr[1]);
    }
    const max = maxResults ? Number(maxResults) : 10;
    this.tubeService
      .getChannelVideos(channelId.toString(), max, oldTotal)
      .then((playlistVideo) => {
        if (playlistVideo.length > 0) {
          const result: ListResult<PlaylistVideo> = {
            list: playlistVideo,
            nextPageToken: `${playlistVideo[playlistVideo.length - 1].id}|${
              oldTotal + max
            }`,
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
    const { id } = req.query;
    if (!id.toString()) {
      return res.status(500).send("require videoId");
    } else {
      const arrayVideoId = id.toString().split(",");
      this.tubeService
        .getVideos(arrayVideoId)
        .then((videos) => res.status(200).json(videos))
        .catch(() => res.status(500).send([]));
    }
  }
  searchVideos(req: Request, res: Response) {
    const { q, channelId, limit, nextPageToken, duration } = req.query;
    const itemSM: ItemSM = {
      q: q ? q.toString() : "",
      channelId: channelId ? channelId.toString() : undefined,
    };
    let oldTotal = 0;
    let durationVideo = duration ? duration.toString() : "any";
    if (nextPageToken) {
      const arr = nextPageToken.toString().split("|");
      if (arr.length < 2) {
        return res.status(500).send("Next Page Token is not valid");
      }
      oldTotal = Number(arr[1]);
    }
    const max = limit ? Number(limit) : 10;
    this.tubeService
      .searchVideos(itemSM, max, oldTotal, durationVideo)
      .then((results) => {
        if (results.length > 0) {
          const listResult: ListResult<Playlist> = {
            list: results,
            nextPageToken: `${results[results.length - 1].id}|${
              oldTotal + max
            }`,
            limit: results.length,
          };
          return res.status(200).json(listResult);
        } else {
          return res.status(200).json([]);
        }
      })
      .catch((err) => res.status(500).json(err));
  }
  searchPlaylists(req: Request, res: Response) {
    const { q, channelId, limit, nextPageToken } = req.query;
    const playlistSM: PlaylistSM = {
      q: q ? q.toString() : "",
      channelId: channelId ? channelId.toString() : undefined,
    };
    let oldTotal = 0;
    if (nextPageToken) {
      const arr = nextPageToken.toString().split("|");
      if (arr.length < 2) {
        return res.status(500).send("Next Page Token is not valid");
      }
      oldTotal = Number(arr[1]);
    }
    const max = limit ? Number(limit) : 10;
    this.tubeService
      .searchPlaylists(playlistSM, max, oldTotal)
      .then((results) => {
        if (results.length > 0) {
          const listResult: ListResult<Playlist> = {
            list: results,
            nextPageToken: `${results[results.length - 1].id}|${
              oldTotal + max
            }`,
            limit: results.length,
          };
          return res.status(200).json(listResult);
        } else {
          return res.status(200).json([]);
        }
      })
      .catch((err) => {
        console.log(err);
        return res.status(500).json(err);
      });
  }
  searchChannels(req: Request, res: Response) {
    const { q, channelId, limit, nextPageToken } = req.query;
    const channelSM: ChannelSM = {
      q: q ? q.toString() : "",
      channelId: channelId ? channelId.toString() : undefined,
    };
    let oldTotal = 0;
    if (nextPageToken) {
      const arr = nextPageToken.toString().split("|");
      if (arr.length < 2) {
        return res.status(500).send("Next Page Token is not valid");
      }
      oldTotal = Number(arr[1]);
    }
    const max = limit ? Number(limit) : 10;
    this.tubeService
      .searchChannels(channelSM, max, oldTotal)
      .then((results) => {
        if (results.length > 0) {
          const listResult: ListResult<Channel> = {
            list: results,
            nextPageToken: `${results[results.length - 1].id}|${
              oldTotal + max
            }`,
            limit: results.length,
          };
          return res.status(200).json(listResult);
        } else {
          return res.status(200).json([]);
        }
      })
      .catch((err) => res.status(500).json(err));
  }
  getRelatedVideos(req: Request, res: Response) {
    const { id, limit, nextPageToken } = req.query;
    if (!id) {
      return res.status(500).send("require id");
    } else {
      let oldTotal = 0;
      if (nextPageToken) {
        const arr = nextPageToken.toString().split("|");
        if (arr.length < 2) {
          return res.status(500).send("Next Page Token is not valid");
        }
        oldTotal = Number(arr[1]);
      }
      const max = limit ? Number(limit) : 10;
      this.tubeService
        .getVideos([id.toString()])
        .then((video) => {
          this.tubeService
            .getRelatedVideo(video[0].tags, max, oldTotal, video[0].id)
            .then((videos) => {
              const result: ListResult<Video> = {
                list: videos,
                nextPageToken: `${videos[videos.length - 1].id}|${
                  oldTotal + max
                }`,
                limit: videos.length,
              };
              return res.status(200).json(result);
            })
            .catch((err) => res.status(500).json(err));
        })
        .catch((err) => res.status(500).json(err));
    }
  }
  getPopularVideos(req: Request, res: Response) {
    const { limit, nextPageToken } = req.query;
    let oldTotal = 0;
    const max = limit ? Number(limit) : 10;
    if (nextPageToken) {
      const arr = nextPageToken.toString().split("|");
      if (arr.length < 2) {
        return res.status(500).send("Next Page Token is not valid");
      }
      oldTotal = Number(arr[1]);
      this.tubeService
        .getPopularVideos(max, oldTotal)
        .then((videos) => {
          const result: ListResult<Video> = {
            list: videos,
            nextPageToken: `${videos[videos.length - 1].id}|${oldTotal + max}`,
            limit: videos.length,
          };
          return res.status(200).json(result);
        })
        .catch((err) => res.status(500).json(err));
    }
  }
}
