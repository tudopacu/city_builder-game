import { CONFIG } from '../configuration';
import { Item } from '../models/Item';
import { GetItemsResponse } from '../dto/getItemsResponse';

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
}
