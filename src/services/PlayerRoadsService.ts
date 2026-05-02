import Phaser from "phaser";
import { CONFIG } from "../configuration";
import { IsometricService } from "./IsometricService";
import { Player } from "../models/Player";
import { HALF_H, HALF_W } from "../constants/constants";
import { Map } from "../models/Map";
import { WorldLayer } from "../layers/WorldLayer";
import Camera = Phaser.Cameras.Scene2D.Camera;

export class PlayerRoadsService {

    private roadPreview: Phaser.GameObjects.Rectangle | null = null;
    private isValidPlacement = false;
    public roadPlacementMode = false;

    // Road overlay constants
    private OVERLAY_OFFSET_Y = 16;
    private OVERLAY_WIDTH = 48;
    private OVERLAY_HEIGHT = 24;
    private OVERLAY_ALPHA = 0.6;

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
            if (this.roadPlacementMode) {
                this.exitRoadPlacementMode();
            }
        });

        this.scene.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
            if (this.roadPlacementMode) {
                this.handlePointerDown(pointer);
            }
        });

        this.scene.input.on('pointermove', (pointer: Phaser.Input.Pointer) => {
            if (this.roadPlacementMode) {
                this.updateRoadPreview(pointer);
            }
        });

        this.scene.events.on('roadsButtonClicked', () => {
            this.startRoadPlacementMode();
        });
    }

    private handlePointerDown(pointer: Phaser.Input.Pointer): void {
        if (pointer.leftButtonDown()) {
            if (!this.roadPreview) {
                return;
            }
            this.placeRoadAtMouse(this.scene.input);
        } else if (pointer.rightButtonDown()) {
            this.exitRoadPlacementMode();
        }
    }

    public startRoadPlacementMode(): void {
        this.roadPlacementMode = true;
    }

    private exitRoadPlacementMode(): void {
        this.roadPlacementMode = false;
        if (this.roadPreview) {
            this.roadPreview.destroy();
            this.roadPreview = null;
        }
    }

    private updateRoadPreview(pointer: Phaser.Input.Pointer): void {
        const worldPoint = this.worldCamera.getWorldPoint(pointer.x, pointer.y);
        const tilePos = this.worldToTile(worldPoint.x, worldPoint.y);
        const isoCoords = IsometricService.toIsometricCoordinates(tilePos.x, tilePos.y);

        this.isValidPlacement = this.isTileValidForRoad(tilePos.x, tilePos.y);
        const overlayColor = this.isValidPlacement ? 0x888888 : 0xff0000;

        if (!this.roadPreview) {
            this.roadPreview = this.scene.add.rectangle(
                isoCoords.isoX,
                isoCoords.isoY - this.OVERLAY_OFFSET_Y,
                this.OVERLAY_WIDTH,
                this.OVERLAY_HEIGHT,
                overlayColor,
                this.OVERLAY_ALPHA
            );
            this.roadPreview.setOrigin(0.5, 0.5);
            this.roadPreview.setDepth(9999);
            this.worldLayer.getLayer().add(this.roadPreview);
        } else {
            this.roadPreview.setPosition(isoCoords.isoX, isoCoords.isoY - this.OVERLAY_OFFSET_Y);
            this.roadPreview.setFillStyle(overlayColor, this.OVERLAY_ALPHA);
        }
    }

    private isTileValidForRoad(x: number, y: number): boolean {
        if (!this.map || !this.map.terrains) {
            return false;
        }

        const tile = this.map.terrains.find(t => t.x === x && t.y === y);
        if (!tile) {
            return false;
        }

        // Tile must be walkable
        if (!tile.walkable) {
            return false;
        }

        // Tile must not be occupied by an existing building
        const playerBuildings = this.scene.registry.get("playerBuildings") || [];
        for (const building of playerBuildings) {
            const bx = building.x;
            const by = building.y;
            const bw = building.building.width;
            const bh = building.building.length;
            if (x >= bx && x < bx + bw && y >= by && y < by + bh) {
                return false;
            }
        }

        // Tile must not already have a road placed this session
        const placedRoads: { x: number; y: number }[] = this.scene.registry.get("placedRoads") || [];
        if (placedRoads.some(r => r.x === x && r.y === y)) {
            return false;
        }

        return true;
    }

    private worldToTile(worldX: number, worldY: number): { x: number; y: number } {
        const tileX = Math.floor((worldX / HALF_W + worldY / (HALF_H / 2)) / 2);
        const tileY = Math.floor((worldY / (HALF_H / 2) - worldX / HALF_W) / 2);
        return { x: tileX, y: tileY };
    }

    private async sendRoadToBackend(x: number, y: number): Promise<boolean> {
        try {
            const mapId = this.worldLayer.mapService?.getMapId();
            if (!mapId) {
                console.error('Map ID is null or undefined.');
                return false;
            }

            const response = await fetch(`${CONFIG.backendUrl}/game/add_road`, {
                method: 'POST',
                credentials: 'include',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    player_id: this.player.id,
                    map_id: mapId,
                    x: x,
                    y: y,
                }),
            });

            return response.ok;
        } catch (error) {
            console.error('Error sending road to backend:', error);
            return false;
        }
    }

    private async placeRoadAtMouse(input: Phaser.Input.InputPlugin): Promise<void> {
        this.updateRoadPreview(input.activePointer);

        if (!this.isValidPlacement || !this.roadPreview) {
            return;
        }

        const worldPoint = this.worldCamera.getWorldPoint(
            input.activePointer.x,
            input.activePointer.y
        );
        const tilePos = this.worldToTile(worldPoint.x, worldPoint.y);
        const isoCoords = IsometricService.toIsometricCoordinates(tilePos.x, tilePos.y);

        // Draw permanent road visual
        const roadVisual = this.scene.add.rectangle(
            isoCoords.isoX,
            isoCoords.isoY - this.OVERLAY_OFFSET_Y,
            this.OVERLAY_WIDTH,
            this.OVERLAY_HEIGHT,
            0x555555,
            0.8
        );
        roadVisual.setOrigin(0.5, 0.5);
        roadVisual.setDepth(100);
        this.worldLayer.getLayer().add(roadVisual);

        const success = await this.sendRoadToBackend(tilePos.x, tilePos.y);
        if (!success) {
            roadVisual.destroy();
        } else {
            // Track placed road to prevent duplicates
            const placedRoads: { x: number; y: number }[] = this.scene.registry.get("placedRoads") || [];
            placedRoads.push({ x: tilePos.x, y: tilePos.y });
            this.scene.registry.set("placedRoads", placedRoads);
        }
        // Stay in road placement mode to allow placing multiple road tiles
    }
}
