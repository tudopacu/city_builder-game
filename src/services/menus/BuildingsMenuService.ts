import Phaser from "phaser";
import {BuildingData} from "../../dto/getBuildingsResponse";
import {HUDLayer} from "../../layers/HUDLayer";
import {PlayerInventory} from "../../models/PlayerInventory";
import {ItemService} from "../ItemService";

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
        const inventories: PlayerInventory[] = this.scene.registry.get("playerInventories") || [];

        const panelX = 50;
        const panelY = 80;
        const panelWidth = 500;
        const headerHeight = 44;
        const rowHeight = 82;
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
            const affordable = this.canAfford(building, inventories);

            // Row background (interactive)
            const rowBg = this.scene.add.rectangle(
                panelX + padding,
                rowY,
                panelWidth - padding * 2,
                rowHeight,
                0x2a2a4a,
            ).setOrigin(0, 0);
            if (affordable) {
                rowBg.setInteractive({ useHandCursor: true })
                    .on('pointerover', () => rowBg.setFillStyle(0x3a3a6a))
                    .on('pointerout', () => rowBg.setFillStyle(0x2a2a4a))
                    .on('pointerdown', () => {
                        this.closeBuildingList();
                        this.scene.events.emit('startBuildingPlacementEvent', building);
                    });
            } else {
                rowBg.setFillStyle(0x321f2a);
            }
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
                    const available = ItemService.getAvailableQuantity(cost.item_id, inventories);
                    const missing = Math.max(0, cost.quantity - available);
                    const costX = panelX + padding * 2 + 50 + costIndex * 140;
                    const costSection = this.scene.add.rectangle(
                        costX - 4,
                        rowY + 25,
                        132,
                        48,
                        missing > 0 ? 0x7a2630 : 0x39405c,
                        0.75,
                    ).setOrigin(0, 0);
                    this.buildingListPanel.push(costSection);
                    const costText = this.scene.add.text(
                        costX,
                        rowY + 28,
                        `${cost.item_name}: ${cost.quantity}\nAvailable: ${available}${missing > 0 ? ` (Missing: ${missing})` : ''}`,
                        { fontSize: '10px', color: missing > 0 ? '#ff8b8b' : '#cccccc' },
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

    private canAfford(building: BuildingData, inventories: PlayerInventory[]): boolean {
        return (building.costs || []).every(cost =>
            ItemService.getAvailableQuantity(cost.item_id, inventories) >= cost.quantity,
        );
    }

    private closeBuildingList(): void {
        this.buildingListPanel.forEach(obj => obj.destroy());
        this.buildingListPanel = [];
    }
}
