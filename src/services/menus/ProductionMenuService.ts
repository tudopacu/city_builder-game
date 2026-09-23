import Phaser from "phaser";
import { HUDLayer } from "../../layers/HUDLayer";
import { BuildingProduction } from "../../dto/getBuildingsResponse";
import { PlayerBuilding } from "../../models/PlayerBuilding";
import { BuildingService } from "../BuildingService";
import { Player } from "../../models/Player";

export class ProductionMenuService {
    private productionMenuPanel: Phaser.GameObjects.GameObject[] = [];
    private productionRows: Phaser.GameObjects.Rectangle[] = [];
    private isStartingProduction = false;
    private menuGeneration = 0;

    constructor(
        private scene: Phaser.Scene,
        private hudLayer: HUDLayer,
        private player: Player,
    ) {
        this.scene.events.on('showProductionMenu', (playerBuilding: PlayerBuilding, productions: BuildingProduction[]) => {
            this.showProductionMenu(playerBuilding, productions);
        });
    }

    private showProductionMenu(playerBuilding: PlayerBuilding, productions: BuildingProduction[]): void {
        this.closeProductionMenu();
        this.isStartingProduction = false;
        const currentGeneration = ++this.menuGeneration;

        const panelX = 50;
        const panelY = 80;
        const panelWidth = 500;
        const headerHeight = 44;
        const rowHeight = 60;
        const rowSpacing = 8;
        const padding = 12;

        const panelHeight = headerHeight + productions.length * (rowHeight + rowSpacing) + padding;

        // Panel background
        const panelBg = this.scene.add.rectangle(panelX, panelY, panelWidth, panelHeight, 0x1a2e1a, 0.97)
            .setOrigin(0, 0);
        this.productionMenuPanel.push(panelBg);

        // Panel title
        const title = this.scene.add.text(panelX + padding, panelY + padding, `Productions: ${playerBuilding.building.name}`, {
            fontSize: '18px',
            color: '#ffffff',
            fontStyle: 'bold',
        });
        this.productionMenuPanel.push(title);

        // Close button
        const closeBtn = this.scene.add.text(panelX + panelWidth - padding - 16, panelY + padding, '✕', {
            fontSize: '16px',
            color: '#ff6666',
        }).setInteractive({ useHandCursor: true })
            .on('pointerdown', () => this.closeProductionMenu());
        this.productionMenuPanel.push(closeBtn);

        // Divider line
        const divider = this.scene.add.rectangle(panelX, panelY + headerHeight - 2, panelWidth, 2, 0x446644)
            .setOrigin(0, 0);
        this.productionMenuPanel.push(divider);

        const rowsStartY = panelY + headerHeight;

        productions.forEach((production, index) => {
            const rowY = rowsStartY + index * (rowHeight + rowSpacing) + rowSpacing;

            // Row background (interactive)
            const rowBg = this.scene.add.rectangle(
                panelX + padding,
                rowY,
                panelWidth - padding * 2,
                rowHeight,
                0x2a4a2a,
            ).setOrigin(0, 0)
                .setInteractive({ useHandCursor: true })
                .on('pointerover', () => rowBg.setFillStyle(0x3a6a3a))
                .on('pointerout', () => rowBg.setFillStyle(0x2a4a2a))
                .on('pointerdown', () => {
                    if (this.isStartingProduction) {
                        return;
                    }
                    void this.startProduction(playerBuilding.id, production.id, currentGeneration);
                });
            this.productionMenuPanel.push(rowBg);
            this.productionRows.push(rowBg);

            // Production item name
            const nameText = this.scene.add.text(panelX + padding * 2, rowY + 6, production.item_name, {
                fontSize: '15px',
                color: '#ffffff',
                fontStyle: 'bold',
            });
            this.productionMenuPanel.push(nameText);

            // Production details
            const detailsText = this.scene.add.text(
                panelX + padding * 2,
                rowY + 28,
                `Quantity: ${production.quantity}  |  Time: ${production.production_time_seconds}s`,
                { fontSize: '11px', color: '#aaccaa' },
            );
            this.productionMenuPanel.push(detailsText);
        });

        this.hudLayer.getLayer().add(this.productionMenuPanel);
    }

    private async startProduction(playerBuildingId: number, buildingProductionId: number, menuGeneration: number): Promise<void> {
        this.isStartingProduction = true;
        this.setProductionRowsEnabled(false);

        const success = await BuildingService.startProduction(this.player.id, playerBuildingId, buildingProductionId);

        if (success) {
            if (menuGeneration === this.menuGeneration) {
                this.closeProductionMenu();
            }
        } else {
            console.error(`Failed to start production ${buildingProductionId} for building ${playerBuildingId}.`);
            this.isStartingProduction = false;
            this.setProductionRowsEnabled(true);
        }
    }

    private setProductionRowsEnabled(enabled: boolean): void {
        this.productionRows.forEach(row => {
            if (enabled) {
                row.setInteractive({ useHandCursor: true });
            } else {
                row.disableInteractive();
            }
        });
    }

    private closeProductionMenu(): void {
        this.productionMenuPanel.forEach(obj => obj.destroy());
        this.productionMenuPanel = [];
        this.productionRows = [];
    }
}
