import Phaser from 'phaser';
import { CONFIG } from '../configuration';
import { BuildingData } from '../dto/getBuildingsResponse';
import { GetPopulationResponse } from '../dto/getPopulationResponse';
import { Population } from '../models/Population';

export const POPULATION_CHANGED_EVENT = 'populationChanged';
export const SHOW_MESSAGE_EVENT = 'showMessage';

// After a failed read the population is unknown, so we try again a few times.
const RETRY_DELAY_MS = 2000;
const MAX_RETRIES = 5;

interface RefreshState {
    playerId: number;
    mapId: number;
    // Id of the newest refresh. A response for an older id is out of date and ignored.
    latestRequestId: number;
    retries: number;
    inFlight: boolean;
}

const refreshStates = new WeakMap<Phaser.Scene, RefreshState>();

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

    // Reloads the population from the backend, stores it and tells the HUD and menus.
    // The backend is the source of truth, so this runs after every build or removal.
    //
    // - Overlapping refreshes are safe: only the newest one may change the stored value,
    //   so a slow earlier response cannot bring back an older balance.
    // - A failed read makes the population unknown (null) instead of leaving a zero or an
    //   old value behind, and retries a few times. While it is unknown the client does not
    //   block building, and the backend decides.
    static async refresh(scene: Phaser.Scene, playerId: number, mapId: number): Promise<void> {
        const state = refreshStates.get(scene) ?? {
            playerId, mapId, latestRequestId: 0, retries: 0, inFlight: false,
        };
        state.playerId = playerId;
        state.mapId = mapId;
        const requestId = ++state.latestRequestId;
        state.inFlight = true;
        refreshStates.set(scene, state);

        const population = await PopulationService.getPopulation(playerId, mapId);

        if (requestId !== state.latestRequestId) {
            // A newer refresh started while this one was running. It decides the result.
            return;
        }
        state.inFlight = false;

        if (population) {
            state.retries = 0;
            PopulationService.publish(scene, population);
            return;
        }

        // The balance can no longer be trusted, so do not show or enforce an old one.
        PopulationService.publish(scene, null);
        PopulationService.scheduleRetry(scene, state);
    }

    // Starts a refresh when the population is unknown and none is running. The build menu
    // calls this when it opens, so a player can always recover without reloading.
    static ensureLoaded(scene: Phaser.Scene): void {
        const state = refreshStates.get(scene);
        if (!state || state.inFlight || PopulationService.getCurrent(scene) !== null) {
            return;
        }
        state.retries = 0;
        void PopulationService.refresh(scene, state.playerId, state.mapId);
    }

    // Null means unknown: not loaded yet, or the last read failed.
    static getCurrent(scene: Phaser.Scene): Population | null {
        return scene.registry.get('population') ?? null;
    }

    // Population a building uses while it exists. Missing means none.
    static getCost(building: BuildingData): number {
        return building.population_cost ?? 0;
    }

    // Population a housing building adds while it exists. Missing means none.
    static getCapacity(building: BuildingData): number {
        return building.population_capacity ?? 0;
    }

    // Unknown population does not block building. The backend checks it again anyway.
    static hasEnoughFor(building: BuildingData, population: Population | null): boolean {
        const cost = PopulationService.getCost(building);
        return cost <= 0 || population === null || population.available >= cost;
    }

    private static publish(scene: Phaser.Scene, population: Population | null): void {
        scene.registry.set('population', population);
        scene.events.emit(POPULATION_CHANGED_EVENT, population);
    }

    private static scheduleRetry(scene: Phaser.Scene, state: RefreshState): void {
        if (state.retries >= MAX_RETRIES) {
            return;
        }
        state.retries++;
        const expectedRequestId = state.latestRequestId;

        scene.time.delayedCall(RETRY_DELAY_MS * state.retries, () => {
            // Skip if something else refreshed in the meantime.
            if (state.latestRequestId !== expectedRequestId) {
                return;
            }
            void PopulationService.refresh(scene, state.playerId, state.mapId);
        });
    }
}
