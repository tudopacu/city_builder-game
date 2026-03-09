import Phaser from 'phaser';
import { MapService } from '../services/MapService';
import { Player } from "../models/Player";
import { BuildingData } from '../dto/getBuildingsResponse';
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
  private buildingPlacementReady = false; // True after first click in placement mode
  private buildingPreview: Phaser.GameObjects.Image | null = null;
  private buildingOverlay: Phaser.GameObjects.Rectangle | null = null;
  private currentBuildingId = 1;
  private currentBuildingWidth = 1;
  private currentBuildingHeight = 1;
  private isValidPlacement = false;

  // Building overlay constants
  private static readonly OVERLAY_OFFSET_Y = 16;
  private static readonly OVERLAY_WIDTH = 48;
  private static readonly OVERLAY_HEIGHT = 24;
  private static readonly OVERLAY_ALPHA = 0.4;
  private static readonly PREVIEW_ALPHA = 0.7;

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
      if (this.buildingPlacementMode) {
        if (pointer.leftButtonDown()) {
          // Only start counting clicks after preview is created (on first mouse move)
          if (!this.buildingPreview) {
            return;
          }
          
          // First click: just mark as ready for placement
          if (!this.buildingPlacementReady) {
            this.buildingPlacementReady = true;
            return;
          }
          // Second click: actually place the building
          this.placeBuildingAtMouse();
        } else if (pointer.rightButtonDown()) {
          // Right-click cancels building placement
          this.exitBuildingPlacementMode();
        }
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

    // ESC key to cancel building placement
    this.input.keyboard?.on('keydown-ESC', () => {
      if (this.buildingPlacementMode) {
        this.exitBuildingPlacementMode();
      }
    });

    this.hudCamera.setScroll(0, 0);

    this.worldCamera.ignore(this.hudLayer.getLayer());
    this.hudCamera.ignore(this.worldLayer.getLayer());
  }

  update(): void {
    // Game update loop
  }

  private startBuildingPlacement(building: BuildingData): void {
    this.buildingPlacementMode = true;
    this.buildingPlacementReady = false; // Reset ready flag when starting new placement
    this.currentBuildingId = building.id;
    this.currentBuildingWidth = building.width;
    this.currentBuildingHeight = building.length;
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
      this.buildingPreview.setAlpha(GameScene.PREVIEW_ALPHA);
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
        isoCoords.isoY - GameScene.OVERLAY_OFFSET_Y, 
        GameScene.OVERLAY_WIDTH, 
        GameScene.OVERLAY_HEIGHT, 
        overlayColor, 
        GameScene.OVERLAY_ALPHA
      );
      this.buildingOverlay.setOrigin(0.5, 0.5);
      this.buildingOverlay.setDepth(9999); // Just below building preview
      this.worldLayer.getLayer().add(this.buildingOverlay);
    } else {
      const overlayColor = this.isValidPlacement ? 0x00ff00 : 0xff0000;
      this.buildingOverlay.setPosition(isoCoords.isoX, isoCoords.isoY - GameScene.OVERLAY_OFFSET_Y);
      this.buildingOverlay.setFillStyle(overlayColor, GameScene.OVERLAY_ALPHA);
    }
  }

  private async placeBuildingAtMouse(): Promise<void> {
    // Update the preview one more time to ensure we have the latest state
    this.updateBuildingPreview(this.input.activePointer);
    
    if (!this.isValidPlacement || !this.buildingPreview) {
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
      placedBuilding.destroy();
    } else {
      // Add the building to the WorldLayer's playerBuildings list
      // This prevents overlap checking from allowing placement on the same spot
      const newPlayerBuilding = {
        id: Date.now(), // Temporary ID
        building: {
          id: this.currentBuildingId,
          name: 'Building',
          image_url: '',
          description: '',
          width: this.currentBuildingWidth,
          length: this.currentBuildingHeight,
          building_category: '',
        },
        level: 1,
        x: tilePos.x,
        y: tilePos.y,
      };
      this.worldLayer.addPlayerBuilding(newPlayerBuilding);
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
    this.buildingPlacementReady = false; // Reset ready flag when exiting
    
    // Clean up preview and overlay
    if (this.buildingPreview) {
      this.buildingPreview.destroy();
      this.buildingPreview = null;
    }
    
    if (this.buildingOverlay) {
      this.buildingOverlay.destroy();
      this.buildingOverlay = null;
    }
  }
}
