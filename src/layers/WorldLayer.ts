import Phaser from 'phaser';
import { MapService } from '../services/MapService';
import { BuildingService } from '../services/BuildingService';
import { Map } from '../models/Map';
import { PlayerBuilding } from '../models/PlayerBuilding';
import Layer = Phaser.GameObjects.Layer;

const TILE_WIDTH = 64;      // width of a tile in your PNG
const TILE_HEIGHT = 64;     // height of a tile in your PNG
const TILE_SET_KEY = "terrain_tiles";

const RAW_W = 256;

const CROP_X = 0; //taie stanga
const CROP_Y = 0; //taie sus
const CROP_W = 64; //taie dreapta
const CROP_H = 64; //taie jos

const HALF_W = CROP_W / 2;
const HALF_H = CROP_H / 2;

// Building rendering constants
const BUILDING_LABEL_OFFSET_Y = 10; // Offset for building name label

export class WorldLayer {
  private scene: Phaser.Scene;
  private mapService: MapService;
  private map: Map | null = null;
  private layer!: Layer;
  private playerBuildings: PlayerBuilding[] = [];

  constructor(scene: Phaser.Scene, mapService: MapService) {
    this.scene = scene;
    this.mapService = mapService;
  }

  public getLayer(): Layer {
    return this.layer;
  }

  public getMapId(): number {
    return this.map?.id || 1;
  }

  public worldToTile(worldX: number, worldY: number): { x: number; y: number } {
    // Inverse isometric transformation
    const tileX = Math.floor((worldX / HALF_W + worldY / (HALF_H / 2)) / 2);
    const tileY = Math.floor((worldY / (HALF_H / 2) - worldX / HALF_W) / 2);
    return { x: tileX, y: tileY };
  }

  public tileToIsometric(x: number, y: number): { isoX: number; isoY: number } {
    return this.toIsometricCoordinates(x, y);
  }

  public addPlayerBuilding(playerBuilding: PlayerBuilding): void {
    this.playerBuildings.push(playerBuilding);
  }

  public areTilesValid(startX: number, startY: number, width: number, height: number): boolean {
    if (!this.map || !this.map.terrains) {
      return false;
    }

    // Check all tiles that the building would occupy
    for (let dx = 0; dx < width; dx++) {
      for (let dy = 0; dy < height; dy++) {
        const tileX = startX + dx;
        const tileY = startY + dy;
        
        // Find the tile at this position
        const tile = this.map.terrains.find(t => t.x === tileX && t.y === tileY);
        
        if (!tile) {
          // Tile doesn't exist (out of bounds)
          return false;
        }
        
        // Check if tile type is grass or dirt
        if (tile.type !== 'grass' && tile.type !== 'dirt') {
          return false;
        }
      }
    }
    
    // Check if the building overlaps with any existing buildings
    if (this.checkBuildingOverlap(startX, startY, width, height)) {
      return false;
    }
    
    return true;
  }

  private checkBuildingOverlap(startX: number, startY: number, width: number, height: number): boolean {
    // Check if any tile of the new building overlaps with existing buildings
    for (const existingBuilding of this.playerBuildings) {
      const existingWidth = existingBuilding.building.width;
      const existingHeight = existingBuilding.building.length;
      const existingX = existingBuilding.x;
      const existingY = existingBuilding.y;
      
      // Check if the rectangles overlap
      // Two rectangles overlap if they intersect in both X and Y dimensions
      const overlapX = startX < existingX + existingWidth && startX + width > existingX;
      const overlapY = startY < existingY + existingHeight && startY + height > existingY;
      
      if (overlapX && overlapY) {
        return true; // Overlap detected
      }
    }
    
    return false; // No overlap
  }

  public preload(): void {
    this.scene.load.spritesheet(TILE_SET_KEY, "assets/grass_and_water.png", {
      frameWidth: TILE_WIDTH,
      frameHeight: TILE_HEIGHT,
    });
    this.scene.load.image('casa', 'assets/casa.png');
  }

  public create(): void {
    this.layer = this.scene.add.layer();
  }

  public async initialize(): Promise<void> {
    await this.drawMap();
    await this.loadPlayerBuildings();
  }

  private async drawMap(): Promise<void> {
    this.map = (await this.mapService.fetchMap()) || null;

    // If no map data from backend, create a default map for testing
    if (!this.map) {
      this.map = this.createDefaultMap();
    }

    const terrains = this.map?.terrains;

    if (!terrains) {
      console.error("No terrain data available to render the map.");
      return;
    }

    terrains.forEach(tile => {
      const { isoX, isoY } = this.toIsometricCoordinates(tile.x, tile.y);

      // Fix: Use the correct texture key + integer tilesPerRow
      const sourceImage = this.scene.textures.get(TILE_SET_KEY).getSourceImage();
      const tilesPerRow = Math.floor(sourceImage.width / RAW_W);

      // Fix: Integer frame index
      const frameIndex = tile.set_y * tilesPerRow + tile.set_x;

      const img = this.scene.add.image(isoX, isoY, TILE_SET_KEY, frameIndex);

      img.setCrop(CROP_X, CROP_Y, CROP_W, CROP_H);
      img.setOrigin(0.5, 1);

      this.layer.add([img]);
    });
  }

  private toIsometricCoordinates(x: number, y: number): { isoX: number; isoY: number } {
    const isoX = (x - y) * HALF_W;
    const isoY = (x + y) * HALF_H / 2;
    return { isoX, isoY };
  }

  private async loadPlayerBuildings(): Promise<void> {
    this.playerBuildings = await BuildingService.getPlayerBuildings();

    if (this.playerBuildings.length === 0) {
      return;
    }

    this.playerBuildings.forEach(playerBuilding => {
      this.renderBuilding(playerBuilding);
    });
  }

  private renderBuilding(playerBuilding: PlayerBuilding): void {
    // Calculate isometric position based on building coordinates
    const { isoX, isoY } = this.toIsometricCoordinates(playerBuilding.x, playerBuilding.y);

    // Add the building image
    const buildingImage = this.scene.add.image(isoX, isoY, 'casa');
    buildingImage.setOrigin(0.5, 1);
    buildingImage.setDepth(isoY); // Set depth based on isoY for proper layering

    // Add building name label
    const text = this.scene.add.text(isoX, isoY - BUILDING_LABEL_OFFSET_Y, playerBuilding.building.name, {
      fontSize: '12px',
      color: '#ffffff',
      backgroundColor: '#000000',
      padding: { x: 3, y: 2 },
    });
    text.setOrigin(0.5, 1);
    text.setDepth(isoY + 1); // Ensure the label is above the building

    this.layer.add([buildingImage, text]);
  }

  private createDefaultMap(): Map {
    // Create a 10x10 grass map for testing
    const terrains = [];
    for (let y = 0; y < 10; y++) {
      for (let x = 0; x < 10; x++) {
        terrains.push({
          tile_id: y * 10 + x,
          x: x,
          y: y,
          type: 'grass',
          walkable: true,
          set_x: 0,
          set_y: 0,
        });
      }
    }
    return {
      id: 1,
      width: 10,
      length: 10,
      terrains: terrains,
    };
  }
}
