import { CONFIG } from '../configuration';
import { Road } from '../models/Road';
import { GetRoadsResponse } from '../dto/getRoadsResponse';

export class RoadService {
    static async getRoads(playerId: number, mapId: number): Promise<Road[]> {
        try {
            const response = await fetch(`${CONFIG.backendUrl}/game/roads/${playerId}/${mapId}`, {
                method: 'GET',
                credentials: 'include',
                headers: { 'Content-Type': 'application/json' },
            });

            if (!response.ok) {
                throw new Error(`Failed to fetch roads: ${response.statusText}`);
            }

            const data = await response.json() as GetRoadsResponse;
            return data.roads || [];
        } catch (error) {
            console.error('Error fetching roads:', error);
            return [];
        }
    }
}
