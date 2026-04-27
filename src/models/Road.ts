import { Intersection } from './Intersection';
import { RoadType } from './RoadType';

export interface Road {
    id: number;
    start_intersection: Intersection;
    end_intersection: Intersection;
    road_type: RoadType;
}
