import { VideoService } from 'video-plus';
import { TubeController } from './controllers/TubeController';

export interface ApplicationContext {
  tubeController: TubeController;
}
