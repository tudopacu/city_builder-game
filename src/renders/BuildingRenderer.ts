import {IsometricService} from "../services/IsometricService";
import {PlayerBuilding} from "../models/PlayerBuilding";

const BUILDING_LABEL_OFFSET_Y = 10;

interface BuildingObjects {
    image: Phaser.GameObjects.Image;
    label: Phaser.GameObjects.Text;
}

export class BuildingRenderer {

    private buildingObjects: Map<number, BuildingObjects> = new Map();

    constructor(
        private scene: Phaser.Scene,
        private layer: Phaser.GameObjects.Layer
    ) {}

    public renderPlayerBuildings(): void {
        const playerBuildings: PlayerBuilding[] = this.scene.registry.get("playerBuildings") || [];
        playerBuildings.forEach(playerBuilding => {
            this.renderBuilding(playerBuilding);
        });
    }

    public renderBuilding(playerBuilding: PlayerBuilding): void {
        const { isoX, isoY } = IsometricService.toIsometricCoordinates(playerBuilding.x, playerBuilding.y);

        const buildingImage = this.scene.add.image(isoX, isoY, 'casa');
        buildingImage.setOrigin(0.5, 1);
        buildingImage.setDepth(isoY); // Set depth based on isoY for proper layering

        const text = this.scene.add.text(isoX, isoY - BUILDING_LABEL_OFFSET_Y, playerBuilding.building.name, {
            fontSize: '12px',
            color: '#ffffff',
            backgroundColor: '#000000',
            padding: { x: 3, y: 2 },
        });
        text.setOrigin(0.5, 1);
        text.setDepth(isoY + 1);

        this.layer.add([buildingImage, text]);
        this.buildingObjects.set(playerBuilding.id, { image: buildingImage, label: text });
    }

    public removeBuildingObjects(id: number): void {
        const objects = this.buildingObjects.get(id);
        if (objects) {
            objects.image.destroy();
            objects.label.destroy();
            this.buildingObjects.delete(id);
        }
    }
}