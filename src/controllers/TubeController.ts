import { Request, Response } from 'express';
import { CategoryCollection, ChannelSM, ItemSM, PlaylistSM, VideoCategory, VideoService, YoutubeClient } from '../video-plus';
import { handleError, query, queryNumber, queryParam, queryParams, queryRequiredParams, respondModel } from './util';

export class TubeController {
  constructor(private videoService: VideoService, private log: (msg: any, ctx?: any) => void) {
    this.getCategory = this.getCategory.bind(this);
    this.getChannel = this.getChannel.bind(this);
    this.getChannels = this.getChannels.bind(this);
    this.getPlaylist = this.getPlaylist.bind(this);
    this.getPlaylists = this.getPlaylists.bind(this);
    this.getVideo = this.getVideo.bind(this);
    this.getVideos = this.getVideos.bind(this);
    this.getChannelPlaylists = this.getChannelPlaylists.bind(this);
    this.getPlaylistVideos = this.getPlaylistVideos.bind(this);
    this.getChannelVideos = this.getChannelVideos.bind(this);
    this.searchVideos = this.searchVideos.bind(this);
    this.searchPlaylists = this.searchPlaylists.bind(this);
    this.searchChannels = this.searchChannels.bind(this);
    this.getRelatedVideos = this.getRelatedVideos.bind(this);
    this.getPopularVideos = this.getPopularVideos.bind(this);
    this.getPopularVideosByCategory = this.getPopularVideosByCategory.bind(this);
    this.getPopularVideosByRegion = this.getPopularVideosByRegion.bind(this);
  }
  async getCategory(req: Request, res: Response) {
    const regionCode = queryParam(req, res, 'regionCode');
    if (regionCode) {
      this.videoService
        .getCagetories(regionCode)
        .then((r) => {
          console.log(r);
          return res.status(200).json(r);
        })
        .catch((err) => handleError(err, res, this.log));
    }
  }
  getChannel(req: Request, res: Response) {
    const id = queryParam(req, res, 'id');
    const fields = queryParams(req, 'fields');
    this.videoService
      .getChannel(id, fields)
      .then((channel) => respondModel(channel, res))
      .catch((err) => handleError(err, res, this.log));
  }
  getChannels(req: Request, res: Response) {
    const ids = queryRequiredParams(req, res, 'id', ',');
    if (ids) {
      const fields = queryParams(req, 'fields');
      return this.videoService
        .getChannels(ids, fields)
        .then((channels) => res.status(200).json(channels))
        .catch((err) => handleError(err, res, this.log));
    }
  }
  getPlaylist(req: Request, res: Response) {
    const id = queryParam(req, res, 'id');
    if (id) {
      const fields = queryParams(req, 'fields');
      return this.videoService
        .getPlaylist(id, fields)
        .then((playlist) => respondModel(playlist, res))
        .catch((err) => handleError(err, res, this.log));
    }
  }
  getPlaylists(req: Request, res: Response) {
    const ids = queryRequiredParams(req, res, 'id', ',');
    if (ids) {
      const fields = queryParams(req, 'fields');
      return this.videoService
        .getPlaylists(ids, fields)
        .then((playlists) => res.status(200).json(playlists))
        .catch((err) => handleError(err, res, this.log));
    }
  }
  getChannelPlaylists(req: Request, res: Response) {
    const id = queryParam(req, res, 'id');
    if (id) {
      const limit = queryNumber(req, 'limit');
      const nextPageToken = query(req, 'nextPageToken');
      const fields = queryParams(req, 'fields');
      this.videoService
        .getChannelPlaylists(id.toString(), limit, nextPageToken, fields)
        .then((result) => res.status(200).json(result))
        .catch((err) => handleError(err, res, this.log));
    }
  }
  getPlaylistVideos(req: Request, res: Response) {
    const playlistId = queryParam(req, res, 'playlistId');
    if (playlistId) {
      const limit = queryNumber(req, 'limit');
      const nextPageToken = query(req, 'nextPageToken');
      const fields = queryParams(req, 'fields');
      this.videoService
        .getPlaylistVideos(playlistId, limit, nextPageToken, fields)
        .then((result) => res.status(200).json(result))
        .catch((err) => handleError(err, res, this.log));
    }
  }
  getChannelVideos(req: Request, res: Response) {
    const channelId = queryParam(req, res, 'channelId');
    if (channelId) {
      const limit = queryNumber(req, 'limit');
      const nextPageToken = query(req, 'nextPageToken');
      const fields = queryParams(req, 'fields');
      this.videoService
        .getChannelVideos(channelId, limit, nextPageToken, fields)
        .then((result) => res.status(200).json(result))
        .catch((err) => handleError(err, res, this.log));
    }
  }
  getVideo(req: Request, res: Response) {
    const id = queryParam(req, res, 'id');
    if (id) {
      const fields = queryParams(req, 'fields');
      this.videoService
        .getVideo(id, fields)
        .then((video) => respondModel(video, res))
        .catch((err) => handleError(err, res, this.log));
    }
  }
  getVideos(req: Request, res: Response) {
    const ids = queryRequiredParams(req, res, 'id');
    if (ids) {
      const fields = queryParams(req, 'fields');
      this.videoService
        .getVideos(ids, fields)
        .then((videos) => res.status(200).json(videos))
        .catch((err) => handleError(err, res, this.log));
    }
  }
  searchVideos(req: Request, res: Response) {
    const { duration } = req.query;
    const limit = queryNumber(req, 'limit');
    const nextPageToken = query(req, 'nextPageToken');
    const fields = queryParams(req, 'fields');
    const channelId = query(req, 'channelId');
    const q = query(req, 'q', '');
    const order = query(req, 'order');
    const videoDuration = duration ? duration.toString() : 'any';
    const itemSM: ItemSM = { channelId, q, videoDuration, order };
    this.videoService
      .searchVideos(itemSM, limit, nextPageToken, fields)
      .then((results) => res.status(200).json(results))
      .catch((err) => handleError(err, res, this.log));
  }
  searchPlaylists(req: Request, res: Response) {
    const limit = queryNumber(req, 'limit');
    const nextPageToken = query(req, 'nextPageToken');
    const fields = queryParams(req, 'fields');
    const channelId = query(req, 'channelId');
    const order = query(req, 'order');
    const q = query(req, 'q', '');
    const playlistSM: PlaylistSM = { channelId, q, order };
    this.videoService
      .searchPlaylists(playlistSM, limit, nextPageToken, fields)
      .then((results) => res.status(200).json(results))
      .catch((err) => handleError(err, res, this.log));
  }
  searchChannels(req: Request, res: Response) {
    const limit = queryNumber(req, 'limit');
    const nextPageToken = query(req, 'nextPageToken');
    const fields = queryParams(req, 'fields');
    const channelId = query(req, 'channelId');
    const order = query(req, 'order');
    const q = query(req, 'q', '');
    const channelSM: ChannelSM = { channelId, q, order };
    this.videoService
      .searchChannels(channelSM, limit, nextPageToken, fields)
      .then((results) => res.status(200).json(results))
      .catch((err) => handleError(err, res, this.log));
  }
  getRelatedVideos(req: Request, res: Response) {
    const id = queryParam(req, res, 'id');
    if (id) {
      const limit = queryNumber(req, 'limit');
      const nextPageToken = query(req, 'nextPageToken');
      const fields = queryParams(req, 'fields');
      this.videoService
        .getRelatedVideos(id, limit, nextPageToken, fields)
        .then((results) => res.status(200).json(results))
        .catch((err) => handleError(err, res, this.log));
    }
  }
  getPopularVideos(req: Request, res: Response) {
    const limit = queryNumber(req, 'limit');
    const nextPageToken = query(req, 'nextPageToken');
    const fields = queryParams(req, 'fields');
    this.videoService
      .getPopularVideos(undefined, undefined, limit, nextPageToken, fields)
      .then((results) => res.status(200).json(results))
      .catch((err) => handleError(err, res, this.log));
  }
  getPopularVideosByCategory(req: Request, res: Response) {
    const categoryId = queryParam(req, res, 'categoryId');
    if (categoryId) {
      const limit = queryNumber(req, 'limit');
      const nextPageToken = query(req, 'nextPageToken');
      const fields = queryParams(req, 'fields');
      this.videoService
        .getPopularVideosByCategory(categoryId, limit, nextPageToken, fields)
        .then((results) => res.status(200).json(results))
        .catch((err) => handleError(err, res, this.log));
    }
  }
  getPopularVideosByRegion(req: Request, res: Response) {
    const limit = queryNumber(req, 'limit');
    const nextPageToken = query(req, 'nextPageToken');
    const fields = queryParams(req, 'fields');
    this.videoService
      .getPopularVideosByRegion(undefined, limit, nextPageToken, fields)
      .then((results) => res.status(200).json(results))
      .catch((err) => handleError(err, res, this.log));
  }
}
