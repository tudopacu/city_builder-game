import { GameMap } from '../models/GameMap';
import { CONFIG } from '../configuration';
import Phaser from "phaser";
import {Tile} from "../models/Tile";

export class MapService {

    constructor(
        private scene: Phaser.Scene,
    ) {
        this.scene.events.on('tileClicked', (tile: Tile) => {
            this.tileClicked(tile);
        });
    }

    tileClicked(tile: Tile) {
        if (tile.player_building_id !== null) {
            this.scene.events.emit('buildingClicked', tile.player_building_id);
        }
    }

    static async getMap(): Promise<GameMap | undefined> {
        try {
            const response = await fetch(`${CONFIG.backendUrl}/game/map/1`, {
                method: 'GET',
                credentials: 'include',
                headers: {
                    'Content-Type': 'application/json',
                },
            });

            if (!response.ok) {
                console.error('Error fetching map data:', new Error(`Failed to fetch map data: ${response.statusText}`));
                return undefined;
            }

            const data = await response.json();
            return data.map as GameMap;
        } catch (error) {
            console.error('Error fetching map data:', error);
            return undefined;
        }
    }
}