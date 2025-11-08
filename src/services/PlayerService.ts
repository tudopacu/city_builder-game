import { CONFIG } from '../configuration';
import {GetPlayerResponse} from "../dto/getPlayerResponse";

export class PlayerService {
    static async getPlayer(): Promise<GetPlayerResponse | undefined> {
        try {
            const response = await fetch(`${CONFIG.backendUrl}/game/get_player`, {
                method: 'GET',
                credentials: 'include',
                headers: { 'Content-Type': 'application/json' },
            });

            if (!response.ok) throw new Error(`Failed to fetch player data: ${response.statusText}`);

            return await response.json() as GetPlayerResponse;
        } catch (error) {
            console.error('Error fetching player data:', error);
            return undefined;
        }
    }
}