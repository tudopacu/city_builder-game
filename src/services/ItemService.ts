import { CONFIG } from '../configuration';
import { Item } from '../models/Item';
import { GetItemsResponse } from '../dto/getItemsResponse';
import { GetPlayerInventoriesResponse } from '../dto/getPlayerInventoriesResponse';
import { PlayerInventory } from '../models/PlayerInventory';

export class ItemService {
    static async getItems(): Promise<Item[]> {
        try {
            const response = await fetch(`${CONFIG.backendUrl}/game/items`, {
                method: 'GET',
                credentials: 'include',
                headers: { 'Content-Type': 'application/json' },
            });

            if (!response.ok) {
                throw new Error(`Failed to fetch items: ${response.statusText}`);
            }

            const data = await response.json() as GetItemsResponse;
            return data.items || [];
        } catch (error) {
            console.error('Error fetching items:', error);
            return [];
        }
    }

    static async getPlayerInventories(playerId: number, mapId: number): Promise<PlayerInventory[]> {
        try {
            const response = await fetch(`${CONFIG.backendUrl}/game/get_player_inventories/${playerId}/${mapId}`, {
                method: 'GET',
                credentials: 'include',
                headers: { 'Content-Type': 'application/json' },
            });

            if (!response.ok) {
                throw new Error(`Failed to fetch player inventories: ${response.statusText}`);
            }

            const data = await response.json() as GetPlayerInventoriesResponse;
            return data.player_inventory?.player_inventories || [];
        } catch (error) {
            console.error('Error fetching player inventories:', error);
            return [];
        }
    }

    static getAvailableQuantity(itemId: number, inventories: PlayerInventory[]): number {
        let quantity = 0;
        for (const inventory of inventories) {
            for (const item of inventory.items || []) {
                if (item.item_id === itemId) {
                    quantity += item.quantity;
                }
            }
        }
        return quantity;
    }

    static getAvailableCapacity(inventories: PlayerInventory[]): number {
        let capacity = 0;
        let quantity = 0;
        for (const inventory of inventories) {
            capacity += inventory.capacity;
            for (const item of inventory.items || []) {
                quantity += item.quantity;
            }
        }
        return Math.max(0, capacity - quantity);
    }
}
