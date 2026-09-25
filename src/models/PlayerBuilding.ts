import {Building} from "./Building";

export interface BuildingCurrentProduction {
    building_production_id: number;
    item_name: string;
    quantity: number;
    status: string;
    item?: { name?: string; quantity?: number };
    time_left?: number;
    time_left_seconds?: number;
    remaining_time?: number;
    remaining_time_seconds?: number;
    production_time_seconds?: number;
    ends_at?: string;
    end_time?: string;
}

export interface PlayerBuilding {
    id: number;
    building: Building;
    level: number;
    x: number;
    y: number;
    building_current_production?: BuildingCurrentProduction | null;
}
