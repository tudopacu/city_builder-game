import Phaser from 'phaser';
import { MapService } from '../services/MapService';
import {Player} from "../models/Player";
import {Map} from "../models/Map";
import { BuildingService } from '../services/BuildingService';
import { Building } from '../models/Building';

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

/**
 * Main game scene with isometric map rendering
 */
export class GameScene extends Phaser.Scene {
  private player: Player;
  private mapService: MapService;
  private map: Map | null = null;
  private cameraDragStartX = 0;
  private cameraDragStartY = 0;

  constructor(player: Player, mapService: MapService) {
    super({ key: 'GameScene' });
    this.player = player;
    this.mapService = mapService;
  }

  preload() {
    this.load.spritesheet(TILE_SET_KEY, "assets/grass_and_water.png", {
      frameWidth: TILE_WIDTH,
      frameHeight: TILE_HEIGHT,
    });
  }


  async create() {

    this.map = (await this.mapService.fetchMap()) || null;

    console.log("Map data loaded:", this.map);

    // Display player info
    this.add.text(10, 10, `Player: ${this.player.username}`, {
      fontSize: '16px',
      color: '#ffffff',
      backgroundColor: '#000000',
      padding: { x: 5, y: 5 },
    });

    const terrains = this.map?.terrains;

    if (!terrains) {
      console.error("No terrain data available to render the map.");
      return;
    }

    terrains.forEach(tile => {
      const isoX = (tile.x - tile.y) * HALF_W;
      const isoY = (tile.x + tile.y) * HALF_H / 2;

      // Fix: Use the correct texture key + integer tilesPerRow
      const sourceImage = this.textures.get(TILE_SET_KEY).getSourceImage();
      const tilesPerRow = Math.floor(sourceImage.width / RAW_W);

      // Fix: Integer frame index
      const frameIndex = tile.set_y * tilesPerRow + tile.set_x;

      const img = this.add.image(isoX, isoY, TILE_SET_KEY, frameIndex);

      img.setCrop(CROP_X, CROP_Y, CROP_W, CROP_H);
      img.setOrigin(0.5, 1);
    });

    // Load and render player buildings
    await this.loadPlayerBuildings();

    this.setupCameraControls();
  }

  /**
   * Load and render player buildings on the map
   */
  private async loadPlayerBuildings(): Promise<void> {
    const buildings = await BuildingService.getPlayerBuildings();
    
    console.log("Player buildings loaded:", buildings);

    if (!buildings || buildings.length === 0) {
      console.log("No buildings to render");
      return;
    }

    buildings.forEach(building => {
      this.renderBuilding(building);
    });
  }

  /**
   * Render a single building on the map
   * Takes into account the tile size and isometric coordinates
   */
  private renderBuilding(building: Building): void {
    // Calculate isometric position based on building coordinates
    const isoX = (building.x - building.y) * HALF_W;
    const isoY = (building.x + building.y) * HALF_H / 2;

    // Create a rectangle to represent the building
    // Size is based on the building.size property (e.g., 1 for 1x1, 2 for 2x2)
    const buildingWidth = building.size * CROP_W;
    const buildingHeight = building.size * CROP_H / 2;

    // Create a graphics object for the building
    const graphics = this.add.graphics();
    graphics.fillStyle(0x8B4513, 1); // Brown color for buildings
    graphics.fillRect(-buildingWidth / 2, -buildingHeight, buildingWidth, buildingHeight);
    graphics.setPosition(isoX, isoY);

    // Add building name label
    const text = this.add.text(isoX, isoY - buildingHeight - 10, building.name, {
      fontSize: '12px',
      color: '#ffffff',
      backgroundColor: '#000000',
      padding: { x: 3, y: 2 },
    });
    text.setOrigin(0.5, 1);
  }

  /**
   * Setup camera controls for panning
   */
  private setupCameraControls(): void {
    // Enable camera drag with mouse
    this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      this.cameraDragStartX = pointer.x;
      this.cameraDragStartY = pointer.y;
    });

    this.input.on('pointermove', (pointer: Phaser.Input.Pointer) => {
      if (pointer.isDown) {
        const deltaX = pointer.x - this.cameraDragStartX;
        const deltaY = pointer.y - this.cameraDragStartY;
        
        this.cameras.main.scrollX -= deltaX;
        this.cameras.main.scrollY -= deltaY;
        
        this.cameraDragStartX = pointer.x;
        this.cameraDragStartY = pointer.y;
      }
    });

    // Zoom with mouse wheel
    this.input.on('wheel', (_pointer: Phaser.Input.Pointer, _gameObjects: unknown, _deltaX: number, deltaY: number) => {
      const zoomDelta = deltaY > 0 ? -0.1 : 0.1;
      const newZoom = Phaser.Math.Clamp(this.cameras.main.zoom + zoomDelta, 0.5, 2);
      this.cameras.main.setZoom(newZoom);
    });
  }

  update(): void {
    // Game update loop
  }
}
