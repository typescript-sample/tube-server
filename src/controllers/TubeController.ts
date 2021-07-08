import { Request, Response } from 'express';
import { TubeService } from '../services/TubeService';

export class TubeController {
  constructor(private tubeService: TubeService) {
    this.getAllChannels = this.getAllChannels.bind(this);
    this.getAllVideos = this.getAllVideos.bind(this);
    this.getChannel = this.getChannel.bind(this);
    this.getPlaylistVideo = this.getPlaylistVideo.bind(this);
    this.getChannelsSync = this.getChannelsSync.bind(this);
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
      return res.status(400).send('Id cannot be empty');
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
      return res.status(400).send('Id cannot be empty');
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
      return res.status(400).send('Id cannot be empty');
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
}
