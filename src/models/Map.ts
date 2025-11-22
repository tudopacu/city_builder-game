import {Tile} from "./Tile";

export interface Map {
    id: number;
    width: number;
    length: number;
    terrains: Tile[];
}