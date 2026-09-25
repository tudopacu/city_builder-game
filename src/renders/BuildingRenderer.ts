import {IsometricService} from "../services/IsometricService";
import {PlayerBuilding} from "../models/PlayerBuilding";

const BUILDING_LABEL_OFFSET_Y = 10;

interface BuildingObjects {
    image: Phaser.GameObjects.Image;
    label: Phaser.GameObjects.Text;
    productionMarker: Phaser.GameObjects.Text;
}

export class BuildingRenderer {

    private buildingObjects: Map<number, BuildingObjects> = new Map();
    private productionStatusTimer: Phaser.Time.TimerEvent | null = null;

    constructor(
        private scene: Phaser.Scene,
        private layer: Phaser.GameObjects.Layer
    ) {
        this.scene.events.on('productionCollected', () => this.refreshProductionMarkers());
        this.scene.events.on('productionUpdated', () => this.refreshProductionMarkers());
    }

    public renderPlayerBuildings(): void {
        const playerBuildings: PlayerBuilding[] = this.scene.registry.get("playerBuildings") || [];
        playerBuildings.forEach(playerBuilding => {
            this.renderBuilding(playerBuilding);
        });

        if (!this.productionStatusTimer) {
            this.productionStatusTimer = this.scene.time.addEvent({
                delay: 1000,
                loop: true,
                callback: () => this.updateExpiredProductions(),
            });
        }
    }

    public renderBuilding(playerBuilding: PlayerBuilding): void {
        const { isoX, isoY } = IsometricService.toIsometricCoordinates(playerBuilding.x, playerBuilding.y);

        const buildingImage = this.scene.add.image(isoX, isoY, 'building_' + playerBuilding.building.id);
        buildingImage.setOrigin(0.5, 1);
        buildingImage.setDepth(isoY);
        buildingImage.setInteractive();
        buildingImage.on('pointerdown', () => {
            this.scene.events.emit('buildingClicked', playerBuilding.id);
        });

        const text = this.scene.add.text(isoX, isoY - BUILDING_LABEL_OFFSET_Y, playerBuilding.building.name, {
            fontSize: '12px',
            color: '#ffffff',
            backgroundColor: '#000000',
            padding: { x: 3, y: 2 },
        });
        text.setOrigin(0.5, 1);
        text.setDepth(isoY + 1);

        const productionMarker = this.scene.add.text(isoX, isoY - buildingImage.height, '!', {
            fontSize: '28px',
            color: '#ff0000',
            fontStyle: 'bold',
        });
        productionMarker.setOrigin(0.5, 1);
        productionMarker.setDepth(isoY + 2);
        productionMarker.setVisible(this.hasDoneProduction(playerBuilding));

        this.layer.add([buildingImage, text, productionMarker]);
        this.buildingObjects.set(playerBuilding.id, { image: buildingImage, label: text, productionMarker });
    }

    public removeBuildingObjects(id: number): void {
        const objects = this.buildingObjects.get(id);
        if (objects) {
            objects.image.destroy();
            objects.label.destroy();
            objects.productionMarker.destroy();
            this.buildingObjects.delete(id);
        }
    }

    public refreshProductionMarkers(): void {
        const playerBuildings: PlayerBuilding[] = this.scene.registry.get('playerBuildings') || [];
        playerBuildings.forEach(playerBuilding => {
            this.buildingObjects.get(playerBuilding.id)?.productionMarker.setVisible(
                this.hasDoneProduction(playerBuilding),
            );
        });
    }

    private hasDoneProduction(playerBuilding: PlayerBuilding): boolean {
        return playerBuilding.building_current_production?.status?.toLowerCase() === 'done';
    }

    private updateExpiredProductions(): void {
        const playerBuildings: PlayerBuilding[] = this.scene.registry.get('playerBuildings') || [];
        const now = Date.now();
        let changed = false;

        const updatedPlayerBuildings = playerBuildings.map(playerBuilding => {
            const production = playerBuilding.building_current_production;
            if (!production || production.status.toLowerCase() === 'done' || !production.end_time) {
                return playerBuilding;
            }

            if (Date.parse(production.end_time) > now) {
                return playerBuilding;
            }

            changed = true;
            return {
                ...playerBuilding,
                building_current_production: {
                    ...production,
                    status: 'DONE',
                },
            };
        });

        if (changed) {
            this.scene.registry.set('playerBuildings', updatedPlayerBuildings);
            this.refreshProductionMarkers();
            this.scene.events.emit('productionUpdated');
        }
    }
}
