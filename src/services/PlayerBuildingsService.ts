import Phaser from "phaser";
import {CONFIG} from "../configuration";
import {IsometricService} from "./IsometricService";
import {Player} from "../models/Player";
import {HALF_H, HALF_W} from "../constants/constants";
import {GameMap} from "../models/GameMap";
import {WorldLayer} from "../layers/WorldLayer";
import Camera = Phaser.Cameras.Scene2D.Camera;
import {BuildingData} from "../dto/getBuildingsResponse";
import {PlayerBuilding} from "../models/PlayerBuilding";
import {BuildingService} from "./BuildingService";

// SVG data URL for a red X cursor (32x32, hotspot at center 16,16)
const REMOVE_CURSOR =
    `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='32' height='32'%3E` +
    `%3Cline x1='4' y1='4' x2='28' y2='28' stroke='%23ff0000' stroke-width='3' stroke-linecap='round'/%3E` +
    `%3Cline x1='28' y1='4' x2='4' y2='28' stroke='%23ff0000' stroke-width='3' stroke-linecap='round'/%3E` +
    `%3C/svg%3E") 16 16, crosshair`;

export class PlayerBuildingsService {

    private buildingPreview: Phaser.GameObjects.Image | null = null;
    private buildingOverlay: Phaser.GameObjects.Rectangle | null = null;
    private isValidPlacement = false;
    private currentBuildingId = 1;
    private currentBuildingName = '';
    private currentBuildingWidth = 1;
    private currentBuildingHeight = 1;
    public buildingPlacementMode = false;
    public buildingRemoveMode = false;

    // Counter for assigning unique temporary IDs to locally-placed buildings
    // whose backend response did not include a real ID.
    // These IDs are replaced by real backend IDs after a page reload.
    private static nextTempId = -1;

    // Building overlay constants
    private OVERLAY_OFFSET_Y = 16;
    private OVERLAY_WIDTH = 48;
    private OVERLAY_HEIGHT = 24;
    private OVERLAY_ALPHA = 0.4;
    private PREVIEW_ALPHA = 0.7;

    private get map(): GameMap | null {
        return this.scene.registry.get("map") || [];
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
            if (this.buildingRemoveMode) {
                this.exitBuildingRemoveMode();
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
            this.enterBuildingRemoveMode();
        });

        this.scene.events.on('buildingClicked', (playerBuilding: PlayerBuilding) => {
            if (this.buildingRemoveMode) {
                void this.removeBuilding(playerBuilding);
            }
        });
    }

    private placeBuilding(pointer: Phaser.Input.Pointer, input: Phaser.Input.InputPlugin): void {
        if (pointer.leftButtonDown()) {
            // Only start counting clicks after preview is created (on first mouse move)
            if (!this.buildingPreview) {
                return;
            }
            void this.placeBuildingAtMouse(input);
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

    private enterBuildingRemoveMode(): void {
        this.buildingRemoveMode = true;
        this.scene.input.setDefaultCursor(REMOVE_CURSOR);
    }

    private exitBuildingRemoveMode(): void {
        this.buildingRemoveMode = false;
        this.scene.input.setDefaultCursor('default');
    }

    private async removeBuilding(playerBuilding: PlayerBuilding): Promise<void> {
        if (!Number.isFinite(playerBuilding.id) || playerBuilding.id <= 0) {
            // Building has a temporary local ID — the real backend ID is not yet known.
            // Reload the page to sync with the backend before trying to remove.
            console.error(`Cannot remove building with temporary ID ${playerBuilding.id}. Reload the page to sync.`);
            this.exitBuildingRemoveMode();
            return;
        }

        // Transactional: call backend first; only update local state on success
        const success = await BuildingService.removePlayerBuilding(playerBuilding.id);

        if (success) {
            // Remove from the layer
            this.worldLayer.buildingRenderer?.removeBuildingObjects(playerBuilding.id);

            // Remove from the playerBuildings registry
            const playerBuildings: PlayerBuilding[] = this.scene.registry.get("playerBuildings") || [];
            const updated = playerBuildings.filter(b => b.id !== playerBuilding.id);
            this.scene.registry.set("playerBuildings", updated);
        } else {
            console.error(`Failed to remove building ${playerBuilding.id} from backend.`);
        }

        this.exitBuildingRemoveMode();
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
            this.buildingPreview = this.scene.add.image(isoCoords.isoX, isoCoords.isoY, 'house');
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

    private async sendBuildingToBackend(x: number, y: number): Promise<number | null> {
        try {
            const mapId = this.map?.id;
            if (!mapId) {
                console.error('Map ID is null or undefined.');
                return null;
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

            if (!response.ok) {
                return null;
            }

            // Support both `id` and `player_building_id` field names from the backend.
            const data = await response.json() as { id?: number; player_building_id?: number };
            const id = data.id ?? data.player_building_id;
            if (id === undefined || id === null) {
                // Backend saved the building but didn't return an ID; assign a local
                // temporary ID so the building is rendered immediately. The real ID will
                // be available after a page reload.
                return PlayerBuildingsService.nextTempId--;
            }
            return id;
        } catch (error) {
            console.error('Error sending building to backend:', error);
            return null;
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

        // Send POST request to backend
        const newBuildingId = await this.sendBuildingToBackend(tilePos.x, tilePos.y);

        if (newBuildingId !== null) {
            // Build the new player building record using the real ID from the backend
            const newPlayerBuilding: PlayerBuilding = {
                id: newBuildingId,
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
            };

            // Register in registry so overlap checking is aware of the new building
            this.scene.registry.get("playerBuildings")?.push(newPlayerBuilding);

            // Render via RenderService so the building is tracked and interactive
            this.worldLayer.buildingRenderer?.renderBuilding(newPlayerBuilding);
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
}