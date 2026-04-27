export interface Intersection {
    id: number;
    x: number;
    y: number;
}

export interface RoadType {
    id: number;
    type: string;
    image_url: string;
}

export interface Road {
    id: number;
    start_intersection: Intersection;
    end_intersection: Intersection;
    road_type: RoadType;
}
