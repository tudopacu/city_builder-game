import {BuildingData} from "../dto/getBuildingsResponse";
import {BuildingService} from "./BuildingService";
import Phaser from "phaser";
import {CONFIG} from "../configuration";
import {IsometricService} from "./IsometricService";
import {PlayerBuilding} from "../models/PlayerBuilding";
import {Player} from "../models/Player";
import {HALF_H, HALF_W} from "../constants/constants";
import {Map} from "../models/Map";
import {WorldLayer} from "../layers/WorldLayer";
import Camera = Phaser.Cameras.Scene2D.Camera;

export class PlayerBuildingsService {
    private isLoadingBuildingList = false;
    private buildingListPanel: Phaser.GameObjects.GameObject[] = [];
    private buildingPreview: Phaser.GameObjects.Image | null = null;
    private buildingPlacementReady = false;
    private buildingOverlay: Phaser.GameObjects.Rectangle | null = null;
    private isValidPlacement = false;
    private currentBuildingId = 1;
    private currentBuildingWidth = 1;
    private currentBuildingHeight = 1;
    public buildingPlacementMode = false;

    // Building overlay constants
    private OVERLAY_OFFSET_Y = 16;
    private OVERLAY_WIDTH = 48;
    private OVERLAY_HEIGHT = 24;
    private OVERLAY_ALPHA = 0.4;
    private PREVIEW_ALPHA = 0.7;

    private readonly map: Map | null = null;

    //add constructor that receives the scene, layer and onBuildingSelect callback
    constructor(
        private scene: Phaser.Scene,
        private layer: Phaser.GameObjects.Layer,
        private player: Player,
        private worldLayer: WorldLayer,
        private worldCamera: Camera
    ) {
        this.map = worldLayer.mapService?.getMap() || null;
    }

    async showBuildingList(): Promise<void> {
        if (this.isLoadingBuildingList) {
            return;
        }
        this.isLoadingBuildingList = true;
        this.closeBuildingList();

        let buildings: BuildingData[] = [];
        let loadError = false;
        try {
            buildings = await BuildingService.getBuildings();
        } catch {
            loadError = true;
        } finally {
            this.isLoadingBuildingList = false;
        }

        const panelX = 50;
        const panelY = 80;
        const panelWidth = 500;
        const headerHeight = 44;
        const rowHeight = 70;
        const rowSpacing = 8;
        const padding = 12;
        const emptyRowHeight = 36;

        const contentRows = buildings.length > 0 ? buildings.length : 1;
        const singleRowHeight = buildings.length > 0 ? rowHeight : emptyRowHeight;
        const panelHeight = headerHeight + contentRows * (singleRowHeight + rowSpacing) + padding;

        // Panel background
        const panelBg = this.scene.add.rectangle(panelX, panelY, panelWidth, panelHeight, 0x1a1a2e, 0.97)
            .setOrigin(0, 0);
        this.buildingListPanel.push(panelBg);

        // Panel title
        const title = this.scene.add.text(panelX + padding, panelY + padding, 'Select a Building', {
            fontSize: '18px',
            color: '#ffffff',
            fontStyle: 'bold',
        });
        this.buildingListPanel.push(title);

        // Close button
        const closeBtn = this.scene.add.text(panelX + panelWidth - padding - 16, panelY + padding, '✕', {
            fontSize: '16px',
            color: '#ff6666',
        }).setInteractive({ useHandCursor: true })
            .on('pointerdown', () => this.closeBuildingList());
        this.buildingListPanel.push(closeBtn);

        // Divider line
        const divider = this.scene.add.rectangle(panelX, panelY + headerHeight - 2, panelWidth, 2, 0x444466)
            .setOrigin(0, 0);
        this.buildingListPanel.push(divider);

        const rowsStartY = panelY + headerHeight;

        if (loadError) {
            const errorText = this.scene.add.text(panelX + padding, rowsStartY + padding, 'Failed to load buildings.', {
                fontSize: '14px',
                color: '#ff6666',
            });
            this.buildingListPanel.push(errorText);
        } else if (buildings.length === 0) {
            const noBuildings = this.scene.add.text(panelX + padding, rowsStartY + padding, 'No buildings available.', {
                fontSize: '14px',
                color: '#aaaaaa',
            });
            this.buildingListPanel.push(noBuildings);
        }

        buildings.forEach((building, index) => {
            const rowY = rowsStartY + index * (rowHeight + rowSpacing) + rowSpacing;

            // Row background (interactive)
            const rowBg = this.scene.add.rectangle(
                panelX + padding,
                rowY,
                panelWidth - padding * 2,
                rowHeight,
                0x2a2a4a,
            ).setOrigin(0, 0)
                .setInteractive({ useHandCursor: true })
                .on('pointerover', () => rowBg.setFillStyle(0x3a3a6a))
                .on('pointerout', () => rowBg.setFillStyle(0x2a2a4a))
                .on('pointerdown', () => {
                    this.closeBuildingList();
                    this.startBuildingPlacement(building);
                });
            this.buildingListPanel.push(rowBg);

            // Building name
            const nameText = this.scene.add.text(panelX + padding * 2, rowY + 6, building.name, {
                fontSize: '15px',
                color: '#ffffff',
                fontStyle: 'bold',
            });
            this.buildingListPanel.push(nameText);

            // Costs table header
            if (building.costs && building.costs.length > 0) {
                const costsHeader = this.scene.add.text(panelX + padding * 2, rowY + 28, 'Costs:', {
                    fontSize: '11px',
                    color: '#aaaacc',
                });
                this.buildingListPanel.push(costsHeader);

                building.costs.forEach((cost, costIndex) => {
                    const costText = this.scene.add.text(
                        panelX + padding * 2 + 50 + costIndex * 140,
                        rowY + 28,
                        `${cost.item_name}: ${cost.quantity}`,
                        { fontSize: '11px', color: '#cccccc' },
                    );
                    this.buildingListPanel.push(costText);
                });
            } else {
                const noCosts = this.scene.add.text(panelX + padding * 2, rowY + 28, 'Costs: —', {
                    fontSize: '11px',
                    color: '#666688',
                });
                this.buildingListPanel.push(noCosts);
            }
        });

        this.layer.add(this.buildingListPanel);
    }

    public closeBuildingList(): void {
        this.buildingListPanel.forEach(obj => obj.destroy());
        this.buildingListPanel = [];
    }

    private startBuildingPlacement(building: BuildingData): void {
        this.buildingPlacementMode = true;
        this.buildingPlacementReady = false; // Reset ready flag when starting new placement
        this.currentBuildingId = building.id;
        this.currentBuildingWidth = building.width;
        this.currentBuildingHeight = building.length;
    }

    public placeBuilding(pointer: Phaser.Input.Pointer, input: Phaser.Input.InputPlugin): void {
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
            this.placeBuildingAtMouse(input);
        } else if (pointer.rightButtonDown()) {
            // Right-click cancels building placement
            this.exitBuildingPlacementMode();
        }
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
            this.addPlayerBuilding(newPlayerBuilding);
        }

        // Exit placement mode
        this.exitBuildingPlacementMode();
    }

    exitBuildingPlacementMode(): void {
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

    updateBuildingPreview(pointer: Phaser.Input.Pointer): void {
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

    public areTilesValid(startX: number, startY: number, width: number, height: number): boolean {

        debugger;

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
        for (const existingBuilding of this.worldLayer.playerBuildings) {
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

    public addPlayerBuilding(playerBuilding: PlayerBuilding): void {
        this.worldLayer.playerBuildings.push(playerBuilding);
    }

    public worldToTile(worldX: number, worldY: number): { x: number; y: number } {
        // Inverse isometric transformation
        const tileX = Math.floor((worldX / HALF_W + worldY / (HALF_H / 2)) / 2);
        const tileY = Math.floor((worldY / (HALF_H / 2) - worldX / HALF_W) / 2);
        return { x: tileX, y: tileY };
    }
}