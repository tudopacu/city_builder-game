export interface Population {
    // Provided by housing buildings
    total: number;
    // Used by buildings that exist
    used: number;
    // Left over for new buildings
    available: number;
}
