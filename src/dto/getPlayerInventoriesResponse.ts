import { PlayerInventory } from '../models/PlayerInventory';

export interface GetPlayerInventoriesResponse {
    player_inventory: {
        player_inventories: PlayerInventory[];
        total_quantity: number;
        total_capacity: number;
    };
}
