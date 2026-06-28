import {IsometricService} from "../services/IsometricService";
import {TILE_SET_KEY} from "../constants/constants";
import {GameMap} from "../models/GameMap";

const RAW_W = 256;
const CROP_X = 0;
const CROP_Y = 0;
const CROP_W = 64;
const CROP_H = 64;

export class MapRenderer {
    constructor(
        private scene: Phaser.Scene,
        private layer: Phaser.GameObjects.Layer
    ) {}

    public async renderMap(): Promise<void> {
        const map: GameMap = this.scene.registry.get("map") || [];

        if (!map) {
            console.error("No map data available to render the map.");
            return;
        }

        const terrains = map?.terrains;

        if (!terrains) {
            console.error("No terrain data available to render the map.");
            return;
        }

        const centerTileX = (map.width - 1) / 2;
        const centerTileY = (map.length - 1) / 2;
        const { isoX: centerIsoX, isoY: centerIsoY } = IsometricService.toIsometricCoordinates(centerTileX, centerTileY);
        this.scene.cameras.main.centerOn(centerIsoX, centerIsoY);

        terrains.forEach(tile => {
            const { isoX, isoY } = IsometricService.toIsometricCoordinates(tile.x, tile.y);

            // Fix: Use the correct texture key + integer tilesPerRow
            const sourceImage = this.scene.textures.get(TILE_SET_KEY).getSourceImage();
            const tilesPerRow = Math.floor(sourceImage.width / RAW_W);

            // Fix: Integer frame index
            const frameIndex = tile.set_y * tilesPerRow + tile.set_x;

            const tileImg = this.scene.add.image(isoX, isoY, TILE_SET_KEY, frameIndex);
            tileImg.setData('tile', tile);

            tileImg.setCrop(CROP_X, CROP_Y, CROP_W, CROP_H);
            tileImg.setOrigin(0.5, 1);

            const label = this.scene.add.text(isoX, isoY - CROP_H / 2, `${tile.x}/${tile.y}`, {
                fontSize: '8px',
                color: '#ffffff',
                stroke: '#000000',
                strokeThickness: 2,
            });
            label.setOrigin(0.5, 0.5);

            tileImg.setInteractive();
            tileImg.on('pointerdown', () => {
                this.scene.events.emit('tileClicked', tileImg.getData('tile'));
            });

            this.layer.add([tileImg, label]);
        });
    }
}