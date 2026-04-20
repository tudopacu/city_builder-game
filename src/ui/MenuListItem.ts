import Phaser from 'phaser';
import { BuildingData } from '../dto/getBuildingsResponse';

export class MenuListItem {
    constructor(
        private scene: Phaser.Scene,
        private building: BuildingData,
        private x: number,
        private y: number,
        private width: number,
        private height: number,
        private padding: number,
        private onAction: (building: BuildingData) => void,
    ) {}

    public create(): Phaser.GameObjects.GameObject[] {
        const objects: Phaser.GameObjects.GameObject[] = [];
        const { scene, building, x, y, width, height, padding } = this;

        const rowBg = scene.add.rectangle(x, y, width, height, 0x2a2a4a)
            .setOrigin(0, 0)
            .setInteractive({ useHandCursor: true })
            .on('pointerover', () => rowBg.setFillStyle(0x3a3a6a))
            .on('pointerout', () => rowBg.setFillStyle(0x2a2a4a))
            .on('pointerdown', () => this.onAction(building));
        objects.push(rowBg);

        const nameText = scene.add.text(x + padding, y + 6, building.name, {
            fontSize: '15px',
            color: '#ffffff',
            fontStyle: 'bold',
        });
        objects.push(nameText);

        if (building.costs && building.costs.length > 0) {
            const costsHeader = scene.add.text(x + padding, y + 28, 'Costs:', {
                fontSize: '11px',
                color: '#aaaacc',
            });
            objects.push(costsHeader);

            building.costs.forEach((cost, costIndex) => {
                const costText = scene.add.text(
                    x + padding + 50 + costIndex * 140,
                    y + 28,
                    `${cost.item_name}: ${cost.quantity}`,
                    { fontSize: '11px', color: '#cccccc' },
                );
                objects.push(costText);
            });
        } else {
            const noCosts = scene.add.text(x + padding, y + 28, 'Costs: —', {
                fontSize: '11px',
                color: '#666688',
            });
            objects.push(noCosts);
        }

        return objects;
    }
}
