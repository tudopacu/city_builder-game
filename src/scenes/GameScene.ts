import Phaser from 'phaser';
import { MapService } from '../services/MapService';
import { Player } from "../models/Player";
import { WorldLayer } from '../layers/WorldLayer';
import { HUDLayer } from '../layers/HUDLayer';
import Camera = Phaser.Cameras.Scene2D.Camera;

export class GameScene extends Phaser.Scene {
  private player: Player;
  private mapService: MapService;
  private cameraDragStartX = 0;
  private cameraDragStartY = 0;
  private worldLayer!: WorldLayer;
  private hudLayer!: HUDLayer;
  private worldCamera!: Camera;
  private hudCamera!: Camera;

  constructor(player: Player, mapService: MapService) {
    super({ key: 'GameScene' });
    this.player = player;
    this.mapService = mapService;
  }

  preload() {
    this.worldLayer = new WorldLayer(this, this.mapService);
    this.worldLayer.preload();
  }

  create() {
    // Initialize layers
    this.worldLayer.create();
    this.hudLayer = new HUDLayer(this, this.player);
    this.hudLayer.create();

    // Setup cameras
    this.worldCamera = this.cameras.main;
    this.hudCamera = this.cameras.add(0, 0, this.scale.width, this.scale.height, false, 'HUDCamera');

    // Initialize world layer asynchronously
    this.worldLayer.initialize();

    this.setupCameraControls();
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

    this.worldCamera.ignore(this.hudLayer.getLayer());
    this.hudCamera.ignore(this.worldLayer.getLayer());
  }

  update(): void {
    // Game update loop
  }
}
