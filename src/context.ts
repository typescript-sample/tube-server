import { TubeController } from './controllers/TubeController';
import { SyncController } from './sync/SyncController';

export interface ApplicationContext {
  syncController?: SyncController;
  tubeController: TubeController;
}
