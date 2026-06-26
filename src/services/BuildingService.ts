import { CONFIG } from '../configuration';
import { GetPlayerBuildingsResponse } from '../dto/getPlayerBuildingsResponse';
import { GetBuildingsResponse, BuildingData } from '../dto/getBuildingsResponse';
import {PlayerBuilding} from "../models/PlayerBuilding";

export class BuildingService {
    static async getBuildings(): Promise<BuildingData[]> {
        try {
            const response = await fetch(`${CONFIG.backendUrl}/game/buildings`, {
                method: 'GET',
                credentials: 'include',
                headers: { 'Content-Type': 'application/json' },
            });

            if (!response.ok) {
                throw new Error(`Failed to fetch buildings: ${response.statusText}`);
            }

            const data = await response.json() as GetBuildingsResponse;
            return data.buildings || [];
        } catch (error) {
            console.error('Error fetching buildings:', error);
            return [];
        }
    }

    static async getPlayerBuildings(playerId: number, mapId: number): Promise<PlayerBuilding[]> {
        try {
            const response = await fetch(`${CONFIG.backendUrl}/game/get_player_buildings/${playerId}/${mapId}`, {
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

    static async removePlayerBuilding(playerBuildingId: number): Promise<boolean> {
        try {
            const response = await fetch(`${CONFIG.backendUrl}/game/remove_player_building/${playerBuildingId}`, {
                method: 'DELETE',
                credentials: 'include',
                headers: { 'Content-Type': 'application/json' },
            });

            return response.ok;
        } catch (error) {
            console.error('Error removing player building:', error);
            return false;
        }
    }
}
