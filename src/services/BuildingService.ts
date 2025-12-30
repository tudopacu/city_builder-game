import { CONFIG } from '../configuration';
import { GetPlayerBuildingsResponse } from '../dto/getPlayerBuildingsResponse';
import { Building } from '../models/Building';

export class BuildingService {
    static async getPlayerBuildings(): Promise<Building[]> {
        try {
            const response = await fetch(`${CONFIG.backendUrl}/game/player_buildings`, {
                method: 'GET',
                credentials: 'include',
                headers: { 'Content-Type': 'application/json' },
            });

            if (!response.ok) {
                throw new Error(`Failed to fetch player buildings: ${response.statusText}`);
            }

            const data = await response.json() as GetPlayerBuildingsResponse;
            return data.buildings || [];
        } catch (error) {
            console.error('Error fetching player buildings:', error);
            return [];
        }
    }
}
