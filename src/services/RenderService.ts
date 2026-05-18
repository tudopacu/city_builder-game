import {PlayerBuilding} from "../models/PlayerBuilding";
import {IsometricService} from "./IsometricService";

const BUILDING_LABEL_OFFSET_Y = 10;

export class RenderService {


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
    private renderBuilding(playerBuilding: PlayerBuilding): void {
        // Calculate isometric position based on building coordinates
        const { isoX, isoY } = IsometricService.toIsometricCoordinates(playerBuilding.x, playerBuilding.y);

        // Add the building image
        const buildingImage = this.scene.add.image(isoX, isoY, 'casa');
        buildingImage.setOrigin(0.5, 1);
        buildingImage.setDepth(isoY); // Set depth based on isoY for proper layering

        // Add building name label
        const text = this.scene.add.text(isoX, isoY - BUILDING_LABEL_OFFSET_Y, playerBuilding.building.name, {
            fontSize: '12px',
            color: '#ffffff',
            backgroundColor: '#000000',
            padding: { x: 3, y: 2 },
        });
        text.setOrigin(0.5, 1);
        text.setDepth(isoY + 1); // Ensure the label is above the building

        playerBuilding.renderedBuildingImage = buildingImage;
        playerBuilding.renderedBuildingLabel = text;
        this.layer.add([buildingImage, text]);
    }
}
