import { SubscriptionsController } from './controllers/SubscriptionsController';
import { SyncController } from './controllers/SyncController';
import { TubeController } from './controllers/TubeController';

export interface ApplicationContext {
  syncController?: SyncController;
  tubeController: TubeController;
  subscriptionController: SubscriptionsController;
}
