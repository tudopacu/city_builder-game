import Phaser from 'phaser';
import { CONFIG } from '../configuration';
import { BuildingData } from '../dto/getBuildingsResponse';
import { GetPopulationResponse } from '../dto/getPopulationResponse';
import { Population } from '../models/Population';

export const POPULATION_CHANGED_EVENT = 'populationChanged';
export const SHOW_MESSAGE_EVENT = 'showMessage';

const EMPTY_POPULATION: Population = { total: 0, used: 0, available: 0 };

export class PopulationService {
    static async getPopulation(playerId: number, mapId: number): Promise<Population | null> {
        try {
            const response = await fetch(`${CONFIG.backendUrl}/game/get_player_population/${playerId}/${mapId}`, {
                method: 'GET',
                credentials: 'include',
                headers: { 'Content-Type': 'application/json' },
            });

            if (!response.ok) {
                throw new Error(`Failed to fetch population: ${response.statusText}`);
            }

            const data = await response.json() as GetPopulationResponse;
            return data.population || null;
        } catch (error) {
            console.error('Error fetching population:', error);
            return null;
        }
    }

    // Reloads the population from the backend, stores it and tells the HUD.
    // The backend is the source of truth, so this runs after every build or removal.
    static async refresh(scene: Phaser.Scene, playerId: number, mapId: number): Promise<void> {
        const population = await PopulationService.getPopulation(playerId, mapId);
        if (!population) {
            return;
        }

        scene.registry.set('population', population);
        scene.events.emit(POPULATION_CHANGED_EVENT, population);
    }

    static getCurrent(scene: Phaser.Scene): Population {
        return scene.registry.get('population') || EMPTY_POPULATION;
    }

    // Population a building uses while it exists. Missing means none.
    static getCost(building: BuildingData): number {
        return building.population_cost ?? 0;
    }

    // Population a housing building adds while it exists. Missing means none.
    static getCapacity(building: BuildingData): number {
        return building.population_capacity ?? 0;
    }

    static hasEnoughFor(building: BuildingData, population: Population): boolean {
        const cost = PopulationService.getCost(building);
        return cost <= 0 || population.available >= cost;
    }
}
