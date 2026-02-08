export interface BuildingCost {
    item_id: number;
    item_name: string;
    quantity: number;
}

export interface BuildingProduction {
    item_id: number;
    item_name: string;
    quantity: number;
    production_time_seconds: number;
}

export interface BuildingData {
    id: number;
    name: string;
    image_url: string;
    description: string;
    width: number;
    length: number;
    building_category: string;
    costs: BuildingCost[];
    productions: BuildingProduction[];
}

export interface GetBuildingsResponse {
    buildings: BuildingData[];
}
