//todo migrate all to models

import {Player} from "../models/Player";

/**
 * Map tile data from backend
 */
export interface MapTile {
  x: number;
  y: number;
  tileType: string;
  buildingId?: string;
}

/**
 * Isometric map data from backend
 */
export interface IsometricMapData {
  width: number;
  height: number;
  tiles: MapTile[];
}

/**
 * Game configuration interface
 */
export interface GameConfig {
  player: Player;
  authCookie: string;
  backendUrl?: string;
}
