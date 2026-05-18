import {Building} from "./Building";
import Phaser from "phaser";

export interface PlayerBuilding {
    id: number;
    building: Building;
    level: number;
    x: number;
    y: number;
    renderedBuildingImage?: Phaser.GameObjects.Image;
    renderedBuildingLabel?: Phaser.GameObjects.Text;
}
