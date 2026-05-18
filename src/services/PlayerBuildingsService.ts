import Phaser from "phaser";
import {CONFIG} from "../configuration";
import {IsometricService} from "./IsometricService";
import {Player} from "../models/Player";
import {HALF_H, HALF_W} from "../constants/constants";
import {Map} from "../models/Map";
import {WorldLayer} from "../layers/WorldLayer";
import Camera = Phaser.Cameras.Scene2D.Camera;
import {BuildingData} from "../dto/getBuildingsResponse";
import {BuildingService} from "./BuildingService";
import {PlayerBuilding} from "../models/PlayerBuilding";

export class PlayerBuildingsService {

    private buildingPreview: Phaser.GameObjects.Image | null = null;
    private buildingOverlay: Phaser.GameObjects.Rectangle | null = null;
    private isValidPlacement = false;
    private currentBuildingId = 1;
    private currentBuildingName = 'Building';
    private currentBuildingWidth = 1;
    private currentBuildingHeight = 1;
    private nextTemporaryBuildingId = -1;
    public buildingPlacementMode = false;

    // Building overlay constants
    private OVERLAY_OFFSET_Y = 16;
    private OVERLAY_WIDTH = 48;
    private OVERLAY_HEIGHT = 24;
    private OVERLAY_ALPHA = 0.4;
    private PREVIEW_ALPHA = 0.7;
    private BUILDING_LABEL_OFFSET_Y = 10;

    private get map(): Map | null {
        return this.worldLayer.mapService?.getMap() || null;
    }

    constructor(
        private scene: Phaser.Scene,
        private player: Player,
        private worldLayer: WorldLayer,
        private worldCamera: Camera
    ) {
        this.scene.input.keyboard?.on('keydown-ESC', () => {
            if (this.buildingPlacementMode) {
                this.exitBuildingPlacementMode();
            }
        });

        this.scene.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
            if (this.buildingPlacementMode) {
                this.placeBuilding(pointer, this.scene.input);
            }
        });

        this.scene.input.on('pointermove', (pointer: Phaser.Input.Pointer) => {
            if (this.buildingPlacementMode) {
                this.updateBuildingPreview(pointer);
                return;
            }
        });

        this.scene.events.on('startBuildingPlacementEvent', (building: BuildingData) => {
            this.startBuildingPlacement(building);
        });

        this.scene.events.on('removeButtonClicked', () => {
            this.removeBuildingAtMouse();
        });
    }

    private placeBuilding(pointer: Phaser.Input.Pointer, input: Phaser.Input.InputPlugin): void {
        if (pointer.leftButtonDown()) {
            // Only start counting clicks after preview is created (on first mouse move)
            if (!this.buildingPreview) {
                return;
            }
            this.placeBuildingAtMouse(input);
        } else if (pointer.rightButtonDown()) {
            // Right-click cancels building placement
            this.exitBuildingPlacementMode();
        }
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
    }

    private updateBuildingPreview(pointer: Phaser.Input.Pointer): void {
        // Convert screen coordinates to world coordinates
        const worldPoint = this.worldCamera.getWorldPoint(pointer.x, pointer.y);

        // Convert world coordinates to tile coordinates
        const tilePos = this.worldToTile(worldPoint.x, worldPoint.y);

        // Snap to isometric grid
        const isoCoords = IsometricService.toIsometricCoordinates(tilePos.x, tilePos.y);

        // Create or update building preview
        if (!this.buildingPreview) {
            this.buildingPreview = this.scene.add.image(isoCoords.isoX, isoCoords.isoY, 'casa');
            this.buildingPreview.setOrigin(0.5, 1);
            this.buildingPreview.setAlpha(this.PREVIEW_ALPHA);
            this.buildingPreview.setDepth(10000); // High depth to always be on top
            this.worldLayer.getLayer().add(this.buildingPreview);
        } else {
            this.buildingPreview.setPosition(isoCoords.isoX, isoCoords.isoY);
        }

        // Check if placement is valid
        this.isValidPlacement = this.areTilesValid(
            tilePos.x,
            tilePos.y,
            this.currentBuildingWidth,
            this.currentBuildingHeight
        );

        // Create or update overlay
        if (!this.buildingOverlay) {
            const overlayColor = this.isValidPlacement ? 0x00ff00 : 0xff0000;
            this.buildingOverlay = this.scene.add.rectangle(
                isoCoords.isoX,
                isoCoords.isoY - this.OVERLAY_OFFSET_Y,
                this.OVERLAY_WIDTH,
                this.OVERLAY_HEIGHT,
                overlayColor,
                this.OVERLAY_ALPHA
            );
            this.buildingOverlay.setOrigin(0.5, 0.5);
            this.buildingOverlay.setDepth(9999); // Just below building preview
            this.worldLayer.getLayer().add(this.buildingOverlay);
        } else {
            const overlayColor = this.isValidPlacement ? 0x00ff00 : 0xff0000;
            this.buildingOverlay.setPosition(isoCoords.isoX, isoCoords.isoY - this.OVERLAY_OFFSET_Y);
            this.buildingOverlay.setFillStyle(overlayColor, this.OVERLAY_ALPHA);
        }
    }

    private async sendBuildingToBackend(x: number, y: number): Promise<boolean> {
        try {
            const mapId = this.worldLayer.mapService?.getMapId();
            if (!mapId) {
                console.error('Map ID is null or undefined.');
                return false;
            }

            const response = await fetch(`${CONFIG.backendUrl}/game/add_building`, {
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

    private areTilesValid(startX: number, startY: number, width: number, height: number): boolean {
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
        return !this.checkBuildingOverlap(startX, startY, width, height);
    }

    private checkBuildingOverlap(startX: number, startY: number, width: number, height: number): boolean {
        // Check if any tile of the new building overlaps with existing buildings
        for (const existingBuilding of this.scene.registry.get("playerBuildings") || []) {
            const existingX = existingBuilding.x;
            const existingY = existingBuilding.y;
            const existingWidth = existingBuilding.building.width;
            const existingHeight = existingBuilding.building.length;

            // Check each tile of the new building to see if it overlaps with the existing building
            for (let dx = 0; dx < width; dx++) {
                for (let dy = 0; dy < height; dy++) {
                    const newTileX = startX + dx;
                    const newTileY = startY + dy;

                    // Check if this tile is within the existing building's area
                    if (newTileX >= existingX && newTileX < existingX + existingWidth &&
                        newTileY >= existingY && newTileY < existingY + existingHeight) {
                        return true; // Tile overlap detected
                    }
                }
            }
        }

        return false; // No overlap
    }

    private worldToTile(worldX: number, worldY: number): { x: number; y: number } {
        // Inverse isometric transformation
        const tileX = Math.floor((worldX / HALF_W + worldY / (HALF_H / 2)) / 2);
        const tileY = Math.floor((worldY / (HALF_H / 2) - worldX / HALF_W) / 2);
        return { x: tileX, y: tileY };
    }

    private async placeBuildingAtMouse(input: Phaser.Input.InputPlugin): Promise<void> {
        // Update the preview one more time to ensure we have the latest state
        this.updateBuildingPreview(input.activePointer);

        if (!this.isValidPlacement || !this.buildingPreview) {
            return;
        }

        // Get the current tile position
        const worldPoint = this.worldCamera.getWorldPoint(
            input.activePointer.x,
            input.activePointer.y
        );
        const tilePos = this.worldToTile(worldPoint.x, worldPoint.y);

        // Create the building sprite at the placement position
        const isoCoords = IsometricService.toIsometricCoordinates(tilePos.x, tilePos.y);
        const placedBuilding = this.scene.add.image(isoCoords.isoX, isoCoords.isoY, 'casa');
        placedBuilding.setOrigin(0.5, 1);
        placedBuilding.setDepth(isoCoords.isoY);
        const placedBuildingLabel = this.scene.add.text(isoCoords.isoX, isoCoords.isoY - this.BUILDING_LABEL_OFFSET_Y, this.currentBuildingName, {
            fontSize: '12px',
            color: '#ffffff',
            backgroundColor: '#000000',
            padding: { x: 3, y: 2 },
        });
        placedBuildingLabel.setOrigin(0.5, 1);
        placedBuildingLabel.setDepth(isoCoords.isoY + 1);
        this.worldLayer.getLayer().add(placedBuilding);
        this.worldLayer.getLayer().add(placedBuildingLabel);

        // Send POST request to backend
        const success = await this.sendBuildingToBackend(tilePos.x, tilePos.y);

        if (!success) {
            // Remove the building if backend rejected it
            placedBuilding.destroy();
            placedBuildingLabel.destroy();
        } else {
            // Add the building to the WorldLayer's playerBuildings list
            // This prevents overlap checking from allowing placement on the same spot
            const newPlayerBuilding: PlayerBuilding = {
                id: this.nextTemporaryBuildingId--,
                building: {
                    id: this.currentBuildingId,
                    name: this.currentBuildingName,
                    image_url: '',
                    description: '',
                    width: this.currentBuildingWidth,
                    length: this.currentBuildingHeight,
                    building_category: '',
                },
                level: 1,
                x: tilePos.x,
                y: tilePos.y,
                renderedBuildingImage: placedBuilding,
                renderedBuildingLabel: placedBuildingLabel,
            };

            this.scene.registry.get("playerBuildings")?.push(newPlayerBuilding);
        }

        // Exit placement mode
        this.exitBuildingPlacementMode();
    }

    private startBuildingPlacement(building: BuildingData): void {
        this.buildingPlacementMode = true;
        this.currentBuildingId = building.id;
        this.currentBuildingName = building.name;
        this.currentBuildingWidth = building.width;
        this.currentBuildingHeight = building.length;
    }

    private async removeBuildingAtMouse(): Promise<void> {
        const worldPoint = this.worldCamera.getWorldPoint(
            this.scene.input.activePointer.x,
            this.scene.input.activePointer.y
        );
        const tilePos = this.worldToTile(worldPoint.x, worldPoint.y);

        const playerBuildings: PlayerBuilding[] = this.scene.registry.get("playerBuildings") || [];
        const targetBuilding = playerBuildings.find((building) => this.isPointerOverBuilding(tilePos.x, tilePos.y, building));

        if (!targetBuilding) {
            return;
        }

        const deleted = await BuildingService.deletePlayerBuilding(targetBuilding.id);
        if (!deleted) {
            this.scene.events.emit('showErrorMessage', 'Failed to delete building.');
            return;
        }

        targetBuilding.renderedBuildingImage?.destroy();
        targetBuilding.renderedBuildingLabel?.destroy();

        const updatedPlayerBuildings = playerBuildings.filter((building) => building.id !== targetBuilding.id);
        this.scene.registry.set("playerBuildings", updatedPlayerBuildings);
    }

    private isPointerOverBuilding(tileX: number, tileY: number, building: PlayerBuilding): boolean {
        return tileX >= building.x &&
            tileX < building.x + building.building.width &&
            tileY >= building.y &&
            tileY < building.y + building.building.length;
    }
}
