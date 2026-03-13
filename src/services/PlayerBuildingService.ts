import { CONFIG } from '../configuration';
import { PlayerBuilding } from '../models/PlayerBuilding';

export class PlayerBuildingService {
    private playerBuildings: PlayerBuilding[] = [];

    public addPlayerBuilding(playerBuilding: PlayerBuilding): void {
        this.playerBuildings.push(playerBuilding);
    }

    public getPlayerBuildings(): PlayerBuilding[] {
        return this.playerBuildings;
    }

    public setPlayerBuildings(playerBuildings: PlayerBuilding[]): void {
        this.playerBuildings = playerBuildings;
    }

    public async addBuilding(
        playerId: number,
        mapId: number,
        buildingId: number,
        x: number,
        y: number,
    ): Promise<boolean> {
        try {
            const response = await fetch(`${CONFIG.backendUrl}/game/add_building`, {
                method: 'POST',
                credentials: 'include',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    player_id: playerId,
                    map_id: mapId,
                    building_id: buildingId,
                    x,
                    y,
                }),
            });

            return response.ok;
        } catch (error) {
            console.error('Error adding building:', error);
            return false;
        }
    }
}
