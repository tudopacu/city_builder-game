import Phaser from "phaser";
import {BuildingData} from "../../dto/getBuildingsResponse";
import {HUDLayer} from "../../layers/HUDLayer";

export class BuildingsMenuService {
    private buildingListPanel: Phaser.GameObjects.GameObject[] = [];
    constructor(
        private scene: Phaser.Scene,
        private hudLayer: HUDLayer
    ) {
        this.scene.events.on('buildButtonClicked', () => {
            this.showBuildingList();
        });
    }

    private async showBuildingList(): Promise<void> {
        this.closeBuildingList();

        const buildings: BuildingData[] = this.scene.registry.get("buildings") || [];

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

        if (buildings.length === 0) {
            const errorText = this.scene.add.text(panelX + padding, rowsStartY + padding, 'Failed to load buildings.', {
                fontSize: '14px',
                color: '#ff6666',
            });
            this.buildingListPanel.push(errorText);
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
                    this.scene.events.emit('startBuildingPlacementEvent', building);
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

        this.hudLayer.getLayer().add(this.buildingListPanel);
    }

    private closeBuildingList(): void {
        this.buildingListPanel.forEach(obj => obj.destroy());
        this.buildingListPanel = [];
    }
}