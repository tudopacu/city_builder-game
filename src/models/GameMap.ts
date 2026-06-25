import {Tile} from "./Tile";

export interface GameMap {
    id: number;
    width: number;
    length: number;
    terrains: Tile[];
}