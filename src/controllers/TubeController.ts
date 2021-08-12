import { Request, Response } from 'express';
import { BigThumbnail, ChannelSM, Duration, ItemSM, ListResult, PlaylistSM, SortType, Thumbnail, VideoService } from '../../video-services';
import { handleError, param, query, queryDate, queryNumber, queryParam, queryParams, queryRequiredParams, respondModel } from './util';

export class TubeController {
  private compress?: boolean;
  constructor(private videoService: VideoService, private log: (msg: any, ctx?: any) => void, press?: boolean) {
    this.compress = press;
    this.getCategories = this.getCategories.bind(this);
    this.getChannel = this.getChannel.bind(this);
    this.getChannels = this.getChannels.bind(this);
    this.getPlaylist = this.getPlaylist.bind(this);
    this.getPlaylists = this.getPlaylists.bind(this);
    this.getVideo = this.getVideo.bind(this);
    this.getVideos = this.getVideos.bind(this);
    this.getChannelPlaylists = this.getChannelPlaylists.bind(this);
    this.getVideos = this.getVideos.bind(this);
    this.getVideoList = this.getVideoList.bind(this);
    this.searchVideos = this.searchVideos.bind(this);
    this.searchPlaylists = this.searchPlaylists.bind(this);
    this.searchChannels = this.searchChannels.bind(this);
    this.getRelatedVideos = this.getRelatedVideos.bind(this);
    this.getPopularVideos = this.getPopularVideos.bind(this);
    this.getSubscriptions = this.getSubscriptions.bind(this);
  }
  getCategories(req: Request, res: Response) {
    const regionCode = queryParam(req, res, 'regionCode');
    if (regionCode) {
      this.videoService
        .getCagetories(regionCode)
        .then(results => res.status(200).json(results))
        .catch(err => handleError(err, res, this.log));
    }
  }
  async getSubscriptions(req: Request, res: Response) {
    const channelId = param(req, res, 'id');
    if (channelId) {
      this.videoService
        .getSubscriptions(channelId)
        .then(results => res.status(200).json(results))
        .catch(err => handleError(err, res, this.log));
    }
  }
  getChannel(req: Request, res: Response) {
    const id = param(req, res, 'id');
    if (id) {
      const fields = queryParams(req, 'fields');
      this.videoService
        .getChannel(id, fields)
        .then(channel => respondModel(channel, res))
        .catch(err => handleError(err, res, this.log));
    }
  }
  getChannels(req: Request, res: Response) {
    const ids = queryRequiredParams(req, res, 'id', ',');
    if (ids) {
      const fields = queryParams(req, 'fields');
      return this.videoService
        .getChannels(ids, fields)
        .then(results => respondArray(res, results, this.compress))
        .catch(err => handleError(err, res, this.log));
    }
  }
  getPlaylist(req: Request, res: Response) {
    const id = param(req, res, 'id');
    if (id) {
      const fields = queryParams(req, 'fields');
      return this.videoService
        .getPlaylist(id, fields)
        .then(playlist => respondModel(playlist, res))
        .catch(err => handleError(err, res, this.log));
    }
  }
  getPlaylists(req: Request, res: Response) {
    const ids = queryRequiredParams(req, res, 'id', ',');
    if (ids) {
      const fields = queryParams(req, 'fields');
      return this.videoService
        .getPlaylists(ids, fields)
        .then(results => respondArray(res, results, this.compress))
        .catch(err => handleError(err, res, this.log));
    }
  }
  getChannelPlaylists(req: Request, res: Response) {
    const channelId = queryParam(req, res, 'channelId');
    if (channelId) {
      const limit = queryNumber(req, 'limit', 10);
      const nextPageToken = query(req, 'nextPageToken');
      const fields = queryParams(req, 'fields');
      this.videoService
        .getChannelPlaylists(channelId, limit, nextPageToken, fields)
        .then(results => respondItems(res, results, this.compress))
        .catch(err => handleError(err, res, this.log));
    }
  }
  getVideoList(req: Request, res: Response) {
    const playlistId = query(req, 'playlistId');
    if (playlistId && playlistId.length > 0) {
      const limit = queryNumber(req, 'limit', 10);
      const nextPageToken = query(req, 'nextPageToken');
      const fields = queryParams(req, 'fields');
      this.videoService
        .getPlaylistVideos(playlistId, limit, nextPageToken, fields)
        .then(results => respond(res, results, this.compress))
        .catch(err => handleError(err, res, this.log));
    } else {
      const channelId = query(req, 'channelId');
      if (!channelId) {
        return res.status(400).end(`requires channelId or playlistId`);
      } else {
        const limit = queryNumber(req, 'limit', 10);
        const nextPageToken = query(req, 'nextPageToken');
        const fields = queryParams(req, 'fields');
        this.videoService
          .getChannelVideos(channelId, limit, nextPageToken, fields)
          .then(results => respond(res, results, this.compress))
          .catch(err => handleError(err, res, this.log));
      }
    }
  }
  getVideo(req: Request, res: Response) {
    const id = param(req, res, 'id');
    if (id) {
      const fields = queryParams(req, 'fields');
      this.videoService
        .getVideo(id, fields)
        .then(video => respondModel(video, res))
        .catch(err => handleError(err, res, this.log));
    }
  }
  getVideos(req: Request, res: Response) {
    const ids = queryRequiredParams(req, res, 'id');
    if (ids) {
      const fields = queryParams(req, 'fields');
      this.videoService
        .getVideos(ids, fields)
        .then(results => respondArray(res, results, this.compress))
        .catch(err => handleError(err, res, this.log));
    }
  }
  searchVideos(req: Request, res: Response) {
    const { duration } = req.query;
    const limit = queryNumber(req, 'limit', 10);
    const nextPageToken = query(req, 'nextPageToken');
    const fields = queryParams(req, 'fields');
    const channelId = query(req, 'channelId');
    const q = query(req, 'q', '');
    const sort = query(req, 'sort') as SortType;
    const regionCode = query(req, 'regionCode');
    const videoDuration = (duration ? duration.toString() : 'any') as Duration;
    const publishedBefore = queryDate(req, 'publishedBefore');
    const publishedAfter = queryDate(req, 'publishedAfter');
    const itemSM: ItemSM = { channelId, q, duration: videoDuration, sort, publishedAfter, publishedBefore, regionCode };
    this.videoService
      .searchVideos(itemSM, limit, nextPageToken, fields)
      .then(results => respond(res, results, this.compress))
      .catch(err => handleError(err, res, this.log));
  }
  searchPlaylists(req: Request, res: Response) {
    const limit = queryNumber(req, 'limit', 10);
    const nextPageToken = query(req, 'nextPageToken');
    const fields = queryParams(req, 'fields');
    const channelId = query(req, 'channelId');
    const sort = query(req, 'sort') as SortType;
    const publishedBefore = queryDate(req, 'publishedBefore');
    const publishedAfter = queryDate(req, 'publishedAfter');
    const q = query(req, 'q', '');
    const playlistSM: PlaylistSM = { channelId, q, sort, publishedAfter, publishedBefore };
    this.videoService
      .searchPlaylists(playlistSM, limit, nextPageToken, fields)
      .then(results => respondItems(res, results, this.compress))
      .catch(err => handleError(err, res, this.log));
  }
  searchChannels(req: Request, res: Response) {

    const limit = queryNumber(req, 'limit', 10);
    const nextPageToken = query(req, 'nextPageToken');
    const fields = queryParams(req, 'fields');
    const channelId = query(req, 'channelId');
    const sort = query(req, 'sort') as SortType;
    const regionCode = query(req, 'regionCode', '');
    const q = query(req, 'q', '');
    const publishedBefore = queryDate(req, 'publishedBefore');
    const publishedAfter = queryDate(req, 'publishedAfter');
    const channelSM: ChannelSM = { channelId, q, sort, publishedAfter, publishedBefore, regionCode };
    this.videoService
      .searchChannels(channelSM, limit, nextPageToken, fields)
      .then(results => res.status(200).json(results))
      .catch(err => handleError(err, res, this.log));
  }
  getRelatedVideos(req: Request, res: Response) {
    const id = param(req, res, 'id');
    if (id) {
      const limit = queryNumber(req, 'limit', 10);
      const nextPageToken = query(req, 'nextPageToken');
      const fields = queryParams(req, 'fields');
      this.videoService
        .getRelatedVideos(id, limit, nextPageToken, fields)
        .then(results => respond(res, results, this.compress))
        .catch(err => handleError(err, res, this.log));
    }
  }
  getPopularVideos(req: Request, res: Response) {
    const regionCode = query(req, 'regionCode');
    const categoryId = query(req, 'categoryId');
    const limit = queryNumber(req, 'limit', 10);
    const nextPageToken = query(req, 'nextPageToken');
    const fields = queryParams(req, 'fields');
    this.videoService
      .getPopularVideos(regionCode, categoryId, limit, nextPageToken, fields)
      .then(results => respond(res, results, this.compress))
      .catch(err => handleError(err, res, this.log));
  }
}

export function respondArr<T>(res: Response, results: T[], com?: boolean): void {
  if (results && results.length > 0) {
    res.status(200).json(results).end();
  } else {
    if (com) {
      results = compressItems(results);
    }
    res.status(200).json(results).end();
  }
}
export function respondArray<T extends ((Thumbnail & BigThumbnail) | Thumbnail)>(res: Response, results: T[], com?: boolean): void {
  if (results && results.length > 0) {
    res.status(200).json(results).end();
  } else {
    if (com) {
      results = compress(results);
    }
    res.status(200).json(results).end();
  }
}
export function respond<T extends ((Thumbnail & BigThumbnail) | Thumbnail)>(res: Response, results: ListResult<T>, com?: boolean): void {
  if (!results.list || results.list.length === 0) {
    res.status(200).json(results).end();
  } else {
    if (com) {
      results.list = compress(results.list);
    }
    res.status(200).json(results).end();
  }
}
export function respondItems<T>(res: Response, results: ListResult<T>, com?: boolean): void {
  if (!results.list || results.list.length === 0) {
    res.status(200).json(results).end();
  } else {
    if (com) {
      results.list = compressItems(results.list);
    }
    res.status(200).json(results).end();
  }
}
export function compress<T extends (Thumbnail & BigThumbnail) | Thumbnail>(items: T[]): T[] {
  for (const i of items) {
    delete i.thumbnail;
    delete i.highThumbnail;
    delete i.mediumThumbnail;
    delete i['standardThumbnail'];
    delete i['maxresThumbnail'];
  }
  return items;
}
export const thumbnails = ['thumbnail', 'mediumThumbnail', 'highThumbnail', 'maxresThumbnail', 'standardThumbnail'];
export function compressItems<T>(items: T[]): T[] {
  for (const playlist of items) {
    for (const a of thumbnails) {
      if (playlist[a] && playlist[a].length > 42) {
        playlist[a] = extractId(playlist[a]);
      }
    }
  }
  return items;
}
export function extractId(url: string): string {
  const a = url.split('/');
  if (a.length > 4) {
    return a[4];
  } else {
    return url;
  }
}
