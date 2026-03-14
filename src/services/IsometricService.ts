import { HALF_W, HALF_H } from '../constants/constants';
export class IsometricService {
    public static toIsometricCoordinates(x: number, y: number): { isoX: number; isoY: number } {
        const isoX = (x - y) * HALF_W;
        const isoY = (x + y) * HALF_H / 2;
        return { isoX, isoY };
    }
}