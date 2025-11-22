//todo migrate all to models

import {Player} from "../models/Player";

/**
 * Game configuration interface
 */
export interface GameConfig {
  player: Player;
  authCookie: string;
  backendUrl?: string;
}
