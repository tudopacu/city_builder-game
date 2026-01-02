import {Building} from "./Building";

export interface PlayerBuilding {
    id: number;
    building: Building;
    level: number;
    x: number;
    y: number;
}