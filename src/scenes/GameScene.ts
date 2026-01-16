import Phaser from 'phaser';
import { MapService } from '../services/MapService';
import { Player } from "../models/Player";
import { WorldLayer } from '../layers/WorldLayer';
import { HUDLayer } from '../layers/HUDLayer';
import { CONFIG } from '../configuration';
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
  private buildingPlacementMode = false;
  private buildingPreview: Phaser.GameObjects.Image | null = null;
  private buildingOverlay: Phaser.GameObjects.Rectangle | null = null;
  private currentBuildingId = 1;
  private currentBuildingWidth = 1;
  private currentBuildingHeight = 1;
  private isValidPlacement = false;

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
    this.hudLayer = new HUDLayer(this, this.player, this.startBuildingPlacement.bind(this));
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
      if (this.buildingPlacementMode && pointer.leftButtonDown()) {
        this.placeBuildingAtMouse();
        return;
      }
      
      this.cameraDragStartX = pointer.x;
      this.cameraDragStartY = pointer.y;
    });

    this.input.on('pointermove', (pointer: Phaser.Input.Pointer) => {
      if (this.buildingPlacementMode) {
        this.updateBuildingPreview(pointer);
        return;
      }
      
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

  private startBuildingPlacement(): void {
    this.buildingPlacementMode = true;
    this.currentBuildingId = 1;
    // For building ID 1, assume it's a 1x1 building (can be fetched from backend in future)
    this.currentBuildingWidth = 1;
    this.currentBuildingHeight = 1;
    
    console.log('Building placement mode activated for building ID:', this.currentBuildingId);
  }

  private updateBuildingPreview(pointer: Phaser.Input.Pointer): void {
    // Convert screen coordinates to world coordinates
    const worldPoint = this.worldCamera.getWorldPoint(pointer.x, pointer.y);
    
    // Convert world coordinates to tile coordinates
    const tilePos = this.worldLayer.worldToTile(worldPoint.x, worldPoint.y);
    
    // Snap to isometric grid
    const isoCoords = this.worldLayer.tileToIsometric(tilePos.x, tilePos.y);
    
    // Create or update building preview
    if (!this.buildingPreview) {
      this.buildingPreview = this.add.image(isoCoords.isoX, isoCoords.isoY, 'casa');
      this.buildingPreview.setOrigin(0.5, 1);
      this.buildingPreview.setAlpha(0.7);
      this.buildingPreview.setDepth(10000); // High depth to always be on top
      this.worldLayer.getLayer().add(this.buildingPreview);
    } else {
      this.buildingPreview.setPosition(isoCoords.isoX, isoCoords.isoY);
    }
    
    // Check if placement is valid
    this.isValidPlacement = this.worldLayer.areTilesValid(
      tilePos.x, 
      tilePos.y, 
      this.currentBuildingWidth, 
      this.currentBuildingHeight
    );
    
    // Create or update overlay
    if (!this.buildingOverlay) {
      const overlayColor = this.isValidPlacement ? 0x00ff00 : 0xff0000;
      this.buildingOverlay = this.add.rectangle(
        isoCoords.isoX, 
        isoCoords.isoY - 16, 
        48, 
        24, 
        overlayColor, 
        0.4
      );
      this.buildingOverlay.setOrigin(0.5, 0.5);
      this.buildingOverlay.setDepth(9999); // Just below building preview
      this.worldLayer.getLayer().add(this.buildingOverlay);
    } else {
      const overlayColor = this.isValidPlacement ? 0x00ff00 : 0xff0000;
      this.buildingOverlay.setPosition(isoCoords.isoX, isoCoords.isoY - 16);
      this.buildingOverlay.setFillStyle(overlayColor, 0.4);
    }
  }

  private async placeBuildingAtMouse(): Promise<void> {
    if (!this.isValidPlacement || !this.buildingPreview) {
      console.log('Invalid placement - cannot place building');
      return;
    }
    
    // Get the current tile position
    const worldPoint = this.worldCamera.getWorldPoint(
      this.input.activePointer.x, 
      this.input.activePointer.y
    );
    const tilePos = this.worldLayer.worldToTile(worldPoint.x, worldPoint.y);
    
    // Create the building sprite at the placement position
    const isoCoords = this.worldLayer.tileToIsometric(tilePos.x, tilePos.y);
    const placedBuilding = this.add.image(isoCoords.isoX, isoCoords.isoY, 'casa');
    placedBuilding.setOrigin(0.5, 1);
    placedBuilding.setDepth(isoCoords.isoY);
    this.worldLayer.getLayer().add(placedBuilding);
    
    // Send POST request to backend
    const success = await this.sendBuildingToBackend(tilePos.x, tilePos.y);
    
    if (!success) {
      // Remove the building if backend rejected it
      console.log('Backend rejected building placement - removing building');
      placedBuilding.destroy();
    } else {
      console.log('Building placed successfully at', tilePos.x, tilePos.y);
    }
    
    // Exit placement mode
    this.exitBuildingPlacementMode();
  }

  private async sendBuildingToBackend(x: number, y: number): Promise<boolean> {
    try {
      const mapId = this.worldLayer.getMapId();
      const response = await fetch(`${this.getBackendUrl()}/game/add_building`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          player_id: this.player.id,
          map_id: mapId,
          building_id: this.currentBuildingId,
          x: x,
          y: y,
        }),
      });
      
      return response.ok;
    } catch (error) {
      console.error('Error sending building to backend:', error);
      return false;
    }
  }

  private getBackendUrl(): string {
    return CONFIG.backendUrl;
  }

  private exitBuildingPlacementMode(): void {
    this.buildingPlacementMode = false;
    
    // Clean up preview and overlay
    if (this.buildingPreview) {
      this.buildingPreview.destroy();
      this.buildingPreview = null;
    }
    
    if (this.buildingOverlay) {
      this.buildingOverlay.destroy();
      this.buildingOverlay = null;
    }
    
    console.log('Exited building placement mode');
  }
}
