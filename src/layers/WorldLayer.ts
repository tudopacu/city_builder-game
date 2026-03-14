import Phaser from 'phaser';
import { MapService } from '../services/MapService';
import { BuildingService } from '../services/BuildingService';
import { PlayerBuilding } from '../models/PlayerBuilding';
import Layer = Phaser.GameObjects.Layer;
import {IsometricService} from "../services/IsometricService";
import {TILE_SET_KEY} from "../constants/constants";

const BUILDING_LABEL_OFFSET_Y = 10;

const TILE_WIDTH = 64;
const TILE_HEIGHT = 64;

export class WorldLayer {
  private layer!: Layer;
  public playerBuildings: PlayerBuilding[] = [];
  public mapService: MapService | null = null;

  constructor(
      private scene: Phaser.Scene
  ) {}

  public create(): void {
    this.layer = this.scene.add.layer();
    this.mapService = new MapService(this.scene, this.layer)
    this.mapService.drawMap()
  }

  public async initialize(): Promise<void> {
    await this.loadPlayerBuildings();
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

  private async loadPlayerBuildings(): Promise<void> {
    // First, fetch available buildings (for caching/pre-loading purposes)
    await BuildingService.getBuildings();
    
    // Then, fetch player buildings
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
    const { isoX, isoY } = IsometricService.toIsometricCoordinates(playerBuilding.x, playerBuilding.y);

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
