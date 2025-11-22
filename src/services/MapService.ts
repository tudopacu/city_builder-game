import { Map } from '../models/Map';
import { CONFIG } from '../configuration';
export class MapService {
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
}