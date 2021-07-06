import { Request, Response } from 'express';
import { TubeService } from '../services/TubeService';

export class TubeController {
  constructor(private tubeService: TubeService) {
    this.allChannels = this.allChannels.bind(this);
    this.allVideos = this.allVideos.bind(this);
    this.loadChannel = this.loadChannel.bind(this);
    this.loadPlaylistVideo = this.loadPlaylistVideo.bind(this);
    this.loadChannelsSync = this.loadChannelsSync.bind(this);
  }
  allChannels(req: Request, res: Response) {
    this.tubeService.allChannels()
      .then(channels => res.status(200).json(channels), err => res.status(500).send(err));
  }
  allVideos(req: Request, res: Response) {
    this.tubeService.allVideos()
      .then(videos => res.status(200).json(videos), err => res.status(500).send(err));
  }
  loadChannel(req: Request, res: Response) {
    const { id } = req.params;
    if (!id || id.length === 0) {
      return res.status(400).send('Id cannot be empty');
    }
    this.tubeService.loadChannel(id)
      .then(channel => {
        if (channel) {
          res.status(200).json(channel);
        } else {
          res.status(404).json(null);
        }
      }).catch(err => res.status(500).send(err));
  }
  loadChannelsSync(req: Request, res: Response) {
    const { id } = req.params;
    if (!id || id.length === 0) {
      return res.status(400).send('Id cannot be empty');
    }
    this.tubeService.loadChannelsSync(id)
      .then(channel => {
        if (channel) {
          res.status(200).json(channel);
        } else {
          res.status(404).json(null);
        }
      }).catch(err => res.status(500).send(err));
  }
  loadPlaylistVideo(req: Request, res: Response) {
    const { id } = req.params;
    if (!id || id.length === 0) {
      return res.status(400).send('Id cannot be empty');
    }
    this.tubeService.loadVideo(id)
      .then(video => {
        if (video) {
          res.status(200).json(video);
        } else {
          res.status(404).json(null);
        }
      }).catch(err => res.status(500).send(err));
  }
}
