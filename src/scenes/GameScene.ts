import Phaser from 'phaser';
import { MapService } from '../services/MapService';
import {Player} from "../models/Player";
import {Map} from "../models/Map";
import { BuildingService } from '../services/BuildingService';
import {PlayerBuilding} from "../models/PlayerBuilding";
import Layer = Phaser.GameObjects.Layer;
import Camera = Phaser.Cameras.Scene2D.Camera;

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

export class GameScene extends Phaser.Scene {
  private player: Player;
  private mapService: MapService;
  private map: Map | null = null;
  private cameraDragStartX = 0;
  private cameraDragStartY = 0;
  private worldLayer!: Layer;
  private hudLayer!: Layer;
  private worldCamera!: Camera;
  private hudCamera!: Camera;

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
    this.load.image('casa', 'assets/casa.png');
  }

  create() {
    this.worldLayer = this.add.layer();
    this.hudLayer = this.add.layer();

    this.worldCamera = this.cameras.main;
    this.hudCamera = this.cameras.add(0, 0, this.scale.width, this.scale.height, false, 'HUDCamera');

    this.drawMap();
    this.loadPlayerBuildings();

    const text = this.add.text(10, 10, `Player: ${this.player.username}`, {
      fontSize: '16px',
      color: '#ffffff',
      backgroundColor: '#000000',
      padding: { x: 5, y: 5 },
    });

    const hudBg = this.add.rectangle(0, 0, 60, 60, 0x000000, 0.6)
        .setOrigin(0);

    this.hudLayer.add([hudBg, text]);

    this.setupCameraControls();
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
      const sourceImage = this.textures.get(TILE_SET_KEY).getSourceImage();
      const tilesPerRow = Math.floor(sourceImage.width / RAW_W);

      // Fix: Integer frame index
      const frameIndex = tile.set_y * tilesPerRow + tile.set_x;

      const img = this.add.image(isoX, isoY, TILE_SET_KEY, frameIndex);

      img.setCrop(CROP_X, CROP_Y, CROP_W, CROP_H);
      img.setOrigin(0.5, 1);

      this.worldLayer.add([img]);
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
    const buildingImage = this.add.image(isoX, isoY, 'casa');
    buildingImage.setOrigin(0.5, 1);
    buildingImage.setDepth(isoY); // Set depth based on isoY for proper layering

    // Add building name label
    const text = this.add.text(isoX, isoY - BUILDING_LABEL_OFFSET_Y, playerBuilding.building.name, {
      fontSize: '12px',
      color: '#ffffff',
      backgroundColor: '#000000',
      padding: { x: 3, y: 2 },
    });
    text.setOrigin(0.5, 1);
    text.setDepth(isoY + 1); // Ensure the label is above the building

    this.worldLayer.add([buildingImage, text]);
  }

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

        this.worldCamera.scrollX -= deltaX;
        this.worldCamera.scrollY -= deltaY;

        this.cameraDragStartX = pointer.x;
        this.cameraDragStartY = pointer.y;
      }
    });

    // Zoom with mouse wheel
    this.input.on('wheel', (_pointer: Phaser.Input.Pointer, _gameObjects: unknown, _deltaX: number, deltaY: number) => {
      const zoomDelta = deltaY > 0 ? -0.1 : 0.1;
      const newZoom = Phaser.Math.Clamp(this.worldCamera.zoom + zoomDelta, 0.5, 2);
      this.worldCamera.setZoom(newZoom);
    });

    this.hudCamera.setScroll(0, 0);

    this.worldCamera.ignore(this.hudLayer);
    this.hudCamera.ignore(this.worldLayer);
  }

  update(): void {
    // Game update loop
  }
}
