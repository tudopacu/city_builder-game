import { GameMap } from '../models/GameMap';
import { CONFIG } from '../configuration';
import Phaser from "phaser";
import {Tile} from "../models/Tile";

export class MapService {

    constructor(
        private scene: Phaser.Scene,
    ) {
        this.scene.events.on('tileClicked', (tile: Tile) => {
            console.log("Tile clicked:");
            console.log(tile);
        });
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
                throw new Error(`Failed to fetch map data: ${response.statusText}`);
            }

            const data = await response.json();
            return data.map as GameMap;
        } catch (error) {
            console.error('Error fetching map data:', error);
            return undefined;
        }
    }
}