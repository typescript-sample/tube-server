import { Request, Response } from 'express';
import { MongoTubeService } from 'services/mongo/MongoTubeService';
import { CategoryCollection, ChannelSM, ItemSM, PlaylistSM, VideoCategory, YoutubeClient } from 'video-plus';
import { handleError, queryNumber, queryParam, queryParams, queryRequiredParams } from './util';

export class TubeController {
  constructor(private videoService: MongoTubeService, private client: YoutubeClient, private log: (msg: any, ctx?: any) => void) {
    this.getChannel = this.getChannel.bind(this);
    this.getChannels = this.getChannels.bind(this);
    this.getPlaylist = this.getPlaylist.bind(this);
    this.getPlaylists = this.getPlaylists.bind(this);
    this.getVideo = this.getVideo.bind(this);
    this.getVideos = this.getVideos.bind(this);
    this.getChannelPlaylists = this.getChannelPlaylists.bind(this);
    this.getPlaylistVideos = this.getPlaylistVideos.bind(this);
    this.getChannelVideos = this.getChannelVideos.bind(this);
    this.getCategory = this.getCategory.bind(this);
    this.searchVideos = this.searchVideos.bind(this);
    this.searchPlaylists = this.searchPlaylists.bind(this);
    this.searchChannels = this.searchChannels.bind(this);
    this.getRelatedVideos = this.getRelatedVideos.bind(this);
    this.getPopularVideos = this.getPopularVideos.bind(this);
    this.getPopularVideosByCategory = this.getPopularVideosByCategory.bind(this);
    this.getPopularVideosByRegion = this.getPopularVideosByRegion.bind(this);
  }
  getChannel(req: Request, res: Response) {
    const id = queryParam(req, res, 'id');
    this.videoService
      .getChannel(id)
      .then((channel) => {
        if (channel) {
          res.status(200).json(channel);
        } else {
          res.status(404).json(null);
        }
      })
      .catch((err) => handleError(err, res));
  }
  getChannels(req: Request, res: Response) {
    const id = queryParam(req, res, 'id');
    if (id) {
      const channelIdsArray = id.split(',');
      return this.videoService
        .getChannels(channelIdsArray)
        .then((channels) => {
          return res.status(200).json(channels);
        })
        .catch((err) => handleError(err, res));
    }
  }
  getPlaylist(req: Request, res: Response) {
    const id = queryParam(req, res, 'id');
    if (id) {
      return this.videoService
        .getPlaylists([id])
        .then((playlist) => {
          return res.status(200).json(playlist);
        })
        .catch((err) => handleError(err, res));
    }
  }
  getPlaylists(req: Request, res: Response) {
    const id = queryParam(req, res, 'id');
    if (id) {
      const playlistIdArray = id.split(',');
      return this.videoService
        .getPlaylists(playlistIdArray)
        .then((playlists) => {
          return res.status(200).json(playlists);
        })
        .catch((err) => handleError(err, res));
    }
  }
  getChannelPlaylists(req: Request, res: Response) {
    const id = queryParam(req, res, 'id');
    if (id) {
      const limit = queryNumber(req, res, 'limit', 10);
      const { nextPageToken } = req.query;
      const token = handleToken(res, nextPageToken);
      this.videoService.getChannelPlaylists(id.toString(), limit, token.oldTotal.toString()).then((result) => {
        return res.status(200).json(result);
      });
    }
  }
  getPlaylistVideos(req: Request, res: Response) {
    const playlistId = queryParam(req, res, 'playlistId');
    if (playlistId) {
      const limit = queryNumber(req, res, 'limit', 10);
      const { nextPageToken } = req.query;
      this.videoService
        .getPlaylistVideos(playlistId, limit, nextPageToken && nextPageToken.toString())
        .then((result) => {
          return res.status(200).json(result);
        })
        .catch((err) => handleError(err, res));
    }
  }
  getChannelVideos(req: Request, res: Response) {
    const channelId = queryParam(req, res, 'channelId');
    if (channelId) {
      const limit = queryNumber(req, res, 'limit', 10);
      const { nextPageToken } = req.query;
      const token = handleToken(res, nextPageToken);
      this.videoService.getChannelVideos(channelId.toString(), limit, token.oldTotal.toString()).then((result) => {
        return res.status(200).json(result);
      });
    }
  }
  async getCategory(req: Request, res: Response) {
    const regionCode = queryParam(req, res, 'regionCode');
    if (regionCode) {
      const categoryCollection = await this.videoService.getCagetories(regionCode.toString());
      if (categoryCollection) {
        return res.status(200).json(categoryCollection);
      } else {
        const category = await this.client.getCagetories(regionCode.toString());
        if (category) {
          const categoryToSave: VideoCategory[] = category.filter((item) => item.assignable === true);
          const newCategoryCollection: CategoryCollection = {
            id: regionCode.toString(),
            data: categoryToSave,
          };
          await this.videoService.saveCategory(newCategoryCollection);
          return res.status(200).json(categoryToSave);
        } else {
          return res.status(400).send('regionCode is not valid');
        }
      }
    }
  }
  getVideo(req: Request, res: Response) {
    const id = queryParam(req, res, 'id');
    if (id) {
      const fields = queryParams(req, 'fields');
      this.videoService
        .getVideo(id, fields)
        .then((video) => res.status(200).json(video))
        .catch((err) => handleError(err, res));
    }
  }
  getVideos(req: Request, res: Response) {
    const ids = queryRequiredParams(req, res, 'id');
    if (ids) {
      const fields = queryParams(req, 'fields');
      this.videoService
        .getVideos(ids, fields)
        .then((videos) => res.status(200).json(videos))
        .catch((err) => handleError(err, res));
    }
  }
  searchVideos(req: Request, res: Response) {
    const { q, channelId, nextPageToken, duration } = req.query;
    const limit = queryNumber(req, res, 'limit', 10);
    const durationVideo = duration ? duration.toString() : 'any';
    const token = handleToken(res, nextPageToken);
    const itemSM: ItemSM = {
      q: q ? q.toString() : '',
      channelId: channelId ? channelId.toString() : undefined,
      videoDuration: durationVideo,
    };
    this.videoService
      .searchVideos(itemSM, limit, token.oldTotal.toString())
      .then((results) => {
        return res.status(200).json(results);
      })
      .catch((err) => {
        console.log(err);
        return handleError(err, res);
      });
  }
  searchPlaylists(req: Request, res: Response) {
    const { q, channelId, nextPageToken } = req.query;
    const limit = queryNumber(req, res, 'limit', 10);
    const playlistSM: PlaylistSM = {
      q: q ? q.toString() : '',
      channelId: channelId ? channelId.toString() : undefined,
    };
    const token = handleToken(res, nextPageToken);
    this.videoService
      .searchPlaylists(playlistSM, limit, token.oldTotal.toString())
      .then((results) => {
        return res.status(200).json(results);
      })
      .catch((err) => handleError(err, res));
  }
  searchChannels(req: Request, res: Response) {
    const { q, channelId, nextPageToken } = req.query;
    const limit = queryNumber(req, res, 'limit', 10);
    const channelSM: ChannelSM = {
      q: q ? q.toString() : '',
      channelId: channelId ? channelId.toString() : undefined,
    };
    const token = handleToken(res, nextPageToken);
    this.videoService
      .searchChannels(channelSM, limit, token.oldTotal.toString())
      .then((results) => {
        return res.status(200).json(results);
      })
      .catch((err) => handleError(err, res));
  }
  getRelatedVideos(req: Request, res: Response) {
    const id = queryParam(req, res, 'id');
    if (id) {
      const limit = queryNumber(req, res, 'limit', 10);
      const { nextPageToken } = req.query;
      const token = handleToken(res, nextPageToken);
      this.videoService
        .getRelatedVideos(id, limit, token.oldTotal.toString())
        .then((results) => res.status(200).json(results))
        .catch((err) => handleError(err, res));
    }
  }
  getPopularVideos(req: Request, res: Response) {
    const limit = queryNumber(req, res, 'limit', 10);
    const { nextPageToken } = req.query;
    const token = handleToken(res, nextPageToken);
    this.videoService
      .getPopularVideos(undefined, undefined, limit, token.oldTotal.toString())
      .then((results) => {
        return res.status(200).json(results);
      })
      .catch((err) => handleError(err, res));
  }
  getPopularVideosByCategory(req: Request, res: Response) {
    const categoryId = queryParam(req, res, 'categoryId');
    if (categoryId) {
      const limit = queryNumber(req, res, 'limit', 10);
      const { nextPageToken } = req.query;
      const token = handleToken(res, nextPageToken);
      this.videoService
        .getPopularVideosByCategory(categoryId, limit, token.oldTotal.toString())
        .then((results) => res.status(200).json(results))
        .catch((err) => handleError(err, res));
    }
  }
  getPopularVideosByRegion(req: Request, res: Response) {
    const limit = queryNumber(req, res, 'limit', 10);
    const { nextPageToken } = req.query;
    const token = handleToken(res, nextPageToken);
    this.videoService
      .getPopularVideosByRegion(undefined, limit, token.oldTotal.toString())
      .then((results) => {
        return res.status(200).json(results);
      })
      .catch((err) => handleError(err, res));
  }
}

export const handleToken = (res: Response, nextPageToken) => {
  let oldTotal = 0;
  let id = '';
  if (nextPageToken) {
    const arr = nextPageToken.toString().split('|');
    if (arr.length < 2) {
      res.status(400).send('Next Page Token is not valid').end();
    }
    id = arr[0];
    oldTotal = Number(arr[1]);
  }
  return { id, oldTotal };
};
