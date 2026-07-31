import {Tile} from "./Tile";

export interface GameMap {
    id: number;
    image_url: string;
    width: number;
    length: number;
    terrains: Tile[];
}