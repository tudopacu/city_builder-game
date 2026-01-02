import { CONFIG } from '../configuration';
import { GetPlayerBuildingsResponse } from '../dto/getPlayerBuildingsResponse';
import {PlayerBuilding} from "../models/PlayerBuilding";

export class BuildingService {
    static async getPlayerBuildings(): Promise<PlayerBuilding[]> {
        try {
            const response = await fetch(`${CONFIG.backendUrl}/game/get_player_buildings/2/1`, {
                method: 'GET',
                credentials: 'include',
                headers: { 'Content-Type': 'application/json' },
            });

            if (!response.ok) {
                throw new Error(`Failed to fetch player buildings: ${response.statusText}`);
            }

            const data = await response.json() as GetPlayerBuildingsResponse;
            return data.player_buildings || [];
        } catch (error) {
            console.error('Error fetching player buildings:', error);
            return [];
        }
    }
}
