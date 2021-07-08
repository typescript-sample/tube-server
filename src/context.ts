import { TubeController } from "./controllers/TubeController";
import { SyncController } from "./controllers/SyncController";

export interface ApplicationContext {
  syncController?: SyncController;
  tubeController: TubeController;
}
