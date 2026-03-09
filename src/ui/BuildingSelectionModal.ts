import Phaser from 'phaser';
import BuildingService from '../services/BuildingService';

export default class BuildingSelectionModal {
    constructor(scene) {
        this.scene = scene;
        this.modal = null;
        this.buildings = [];
    }
    create() {
        const width = 400;
        const height = 300;
        this.modal = this.scene.rexUI.add.dialog({
            x: this.scene.cameras.main.centerX,
            y: this.scene.cameras.main.centerY,
            width,
            height,
            title: this.scene.add.text(0, 0, 'Select a Building', { fontSize: '20px' }),
            content: this.scene.add.container(),
            actions: [
                { text: 'Close', fillColor: 0xe0e0e0 },
            ],
        }).layout();

        this.modal.on('action', (dialog, action) => {
            if (action.text === 'Close') {
                this.close();
            }
        });

        this.fetchBuildings();
    }
    async fetchBuildings() {
        const buildings = await BuildingService.getBuildings();
        this.buildings = buildings;
        this.populateBuildings();
    }
    populateBuildings() {
        const container = this.modal.getElement('content');
        this.buildings.forEach(building => {
            const text = this.scene.add.text(0, 0, `${building.name} - Cost: ${building.cost}`, { fontSize: '16px' });
            text.setInteractive();
            text.on('pointerdown', () => this.selectBuilding(building));
            container.add(text);
        });
        this.modal.layout();
    }
    selectBuilding(building) {
        this.close();
        // Start the building placement procedure
        this.scene.startBuildingPlacement(building.id, building.width, building.length);
    }
    close() {
        this.modal.destroy();
    }
}