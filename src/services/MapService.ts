import { Map } from '../models/Map';
import { CONFIG } from '../configuration';
import Phaser from "phaser";
import {IsometricService} from "./IsometricService";
import {TILE_SET_KEY} from "../constants/constants";

const RAW_W = 256;

const CROP_X = 0;
const CROP_Y = 0;
const CROP_W = 64;
const CROP_H = 64;

export class MapService {

    private map: Map | null = null;

    constructor(
        private scene: Phaser.Scene,
        private layer: Phaser.GameObjects.Layer,
    ) {}

    public getMapId(): number {
        return this.map?.id || 1;
    }

    public getMap(): Map {
        return <Map>this.map;
    }

    async fetchMap(): Promise<Map | undefined> {
        try {
            const response = await fetch(`${CONFIG.backendUrl}/game/map/1`, {
                method: 'GET',
                credentials: 'include', // Include cookies in the request
                headers: {
                    'Content-Type': 'application/json',
                },
            });

            if (!response.ok) {
                throw new Error(`Failed to fetch map data: ${response.statusText}`);
            }

            const data = await response.json();
            return data.map as Map;
        } catch (error) {
            console.error('Error fetching map data:', error);
            return undefined;
        }
    }

    public async drawMap(): Promise<void> {
        this.map = (await this.fetchMap()) || null;

        // If no map data from backend, create a default map for testing
        if (!this.map) {
            this.map = this.createDefaultMap();
        }

        const terrains = this.map?.terrains;

        if (!terrains) {
            console.error("No terrain data available to render the map.");
            return;
        }

        terrains.forEach(tile => {
            const { isoX, isoY } = IsometricService.toIsometricCoordinates(tile.x, tile.y);

            // Fix: Use the correct texture key + integer tilesPerRow
            const sourceImage = this.scene.textures.get(TILE_SET_KEY).getSourceImage();
            const tilesPerRow = Math.floor(sourceImage.width / RAW_W);

            // Fix: Integer frame index
            const frameIndex = tile.set_y * tilesPerRow + tile.set_x;

            const img = this.scene.add.image(isoX, isoY, TILE_SET_KEY, frameIndex);

            img.setCrop(CROP_X, CROP_Y, CROP_W, CROP_H);
            img.setOrigin(0.5, 1);

            const label = this.scene.add.text(isoX, isoY - CROP_H / 2, `${tile.x}/${tile.y}`, {
                fontSize: '8px',
                color: '#ffffff',
                stroke: '#000000',
                strokeThickness: 2,
            });
            label.setOrigin(0.5, 0.5);

            this.layer.add([img, label]);
        });
    }

    private createDefaultMap(): Map {
        // Create a 10x10 grass map for testing
        const terrains = [];
        for (let y = 0; y < 10; y++) {
            for (let x = 0; x < 10; x++) {
                terrains.push({
                    tile_id: y * 10 + x,
                    x: x,
                    y: y,
                    type: 'grass',
                    walkable: true,
                    set_x: 0,
                    set_y: 0,
                });
            }
        }
        return {
            id: 1,
            width: 10,
            length: 10,
            terrains: terrains,
        };
    }
}