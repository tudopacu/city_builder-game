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

  constructor(scene: Phaser.Scene, mapService: MapService) {
    this.scene = scene;
    this.mapService = mapService;
  }

  public getLayer(): Layer {
    return this.layer;
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

    console.log("Map data loaded:", this.map);

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
    const playerBuildings = await BuildingService.getPlayerBuildings();

    if (playerBuildings.length === 0) {
      return;
    }

    playerBuildings.forEach(playerBuilding => {
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
}
