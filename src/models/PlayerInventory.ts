export interface PlayerInventoryItem {
    id: number;
    item_id: number;
    quantity: number;
}

export interface PlayerInventory {
    id: number;
    player_building_id: number;
    items: PlayerInventoryItem[];
    capacity: number;
}
