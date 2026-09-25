import Phaser from 'phaser';
import { Player } from '../../models/Player';
import { BuildingCurrentProduction, PlayerBuilding } from '../../models/PlayerBuilding';
import { BuildingData, BuildingProduction } from '../../dto/getBuildingsResponse';
import { HUDLayer } from '../../layers/HUDLayer';
import { BuildingService } from '../BuildingService';

export class ProductionMenuService {
    private productionMenu: Phaser.GameObjects.GameObject[] = [];
    private productionTimer: Phaser.Time.TimerEvent | null = null;

    constructor(
        private scene: Phaser.Scene,
        private hudLayer: HUDLayer,
        private player: Player,
    ) {
        this.scene.events.on('buildingProductionClicked', (playerBuildingId: number) => {
            void this.showProductionMenu(playerBuildingId);
        });
    }

    private async showProductionMenu(playerBuildingId: number): Promise<void> {
        this.closeProductionMenu();

        const playerBuildings: PlayerBuilding[] = this.scene.registry.get('playerBuildings') || [];
        const buildings: BuildingData[] = this.scene.registry.get('buildings') || [];
        const playerBuilding = playerBuildings.find(building => building.id === playerBuildingId);
        const currentProduction = playerBuilding?.building_current_production;
        if (currentProduction) {
            this.showCurrentProduction(currentProduction, playerBuildingId);
            return;
        }

        const buildingId = playerBuilding?.building?.id;
        const building = buildings.find(candidate => candidate.id === buildingId);
        const productions = building?.productions || [];

        const panelX = 50;
        const panelY = 80;
        const panelWidth = 500;
        const headerHeight = 44;
        const rowHeight = 58;
        const rowSpacing = 8;
        const padding = 12;
        const contentRows = productions.length > 0 ? productions.length : 1;
        const singleRowHeight = productions.length > 0 ? rowHeight : 36;
        const panelHeight = headerHeight + contentRows * (singleRowHeight + rowSpacing) + padding;

        const panelBg = this.scene.add.rectangle(panelX, panelY, panelWidth, panelHeight, 0x1a1a2e, 0.97)
            .setOrigin(0, 0).setInteractive();
        this.productionMenu.push(panelBg);

        const title = this.scene.add.text(panelX + padding, panelY + padding, 'Building Production', {
            fontSize: '18px', color: '#ffffff', fontStyle: 'bold',
        });
        this.productionMenu.push(title);

        const closeBtn = this.scene.add.text(panelX + panelWidth - padding - 16, panelY + padding, '✕', {
            fontSize: '16px', color: '#ff6666',
        }).setInteractive({ useHandCursor: true }).on('pointerdown', () => this.closeProductionMenu());
        this.productionMenu.push(closeBtn);

        const divider = this.scene.add.rectangle(panelX, panelY + headerHeight - 2, panelWidth, 2, 0x444466)
            .setOrigin(0, 0);
        this.productionMenu.push(divider);

        if (productions.length === 0) {
            const empty = this.scene.add.text(panelX + padding, panelY + headerHeight + padding, 'No productions available.', {
                fontSize: '14px', color: '#aaaacc',
            });
            this.productionMenu.push(empty);
        }

        productions.forEach((production, index) => this.addProductionRow(
            production,
            panelX,
            panelY + headerHeight + index * (rowHeight + rowSpacing) + rowSpacing,
            panelWidth,
            rowHeight,
            padding,
            playerBuildingId,
        ));

        this.hudLayer.getLayer().add(this.productionMenu);
    }

    private showCurrentProduction(production: BuildingCurrentProduction, playerBuildingId: number): void {
        const panelX = 50;
        const panelY = 80;
        const panelWidth = 500;
        const panelHeight = 190;
        const padding = 12;
        const done = production.status.toLowerCase() === 'done';

        const panelBg = this.scene.add.rectangle(panelX, panelY, panelWidth, panelHeight, 0x1a1a2e, 0.97)
            .setOrigin(0, 0);
        this.productionMenu.push(panelBg);

        const title = this.scene.add.text(panelX + padding, panelY + padding, 'Current Production', {
            fontSize: '18px', color: '#ffffff', fontStyle: 'bold',
        });
        this.productionMenu.push(title);

        const closeBtn = this.scene.add.text(panelX + panelWidth - padding - 16, panelY + padding, '✕', {
            fontSize: '16px', color: '#ff6666',
        }).setInteractive({ useHandCursor: true }).on('pointerdown', () => this.closeProductionMenu());
        this.productionMenu.push(closeBtn);

        const divider = this.scene.add.rectangle(panelX, panelY + 44, panelWidth, 2, 0x444466).setOrigin(0, 0);
        this.productionMenu.push(divider);

        const infoBg = this.scene.add.rectangle(panelX + padding, panelY + 56, panelWidth - padding * 2, 88, 0x2a2a4a)
            .setOrigin(0, 0);
        if (done) {
            infoBg.setInteractive({ useHandCursor: true })
                .on('pointerover', () => infoBg.setFillStyle(0x3a3a6a))
                .on('pointerout', () => infoBg.setFillStyle(0x2a2a4a))
                .on('pointerdown', () => void this.collectProduction(production, playerBuildingId));
        }
        this.productionMenu.push(infoBg);

        const info = this.scene.add.text(
            panelX + padding,
            panelY + 62,
            `${this.getItemName(production)} × ${this.getQuantity(production)}\nStatus: ${production.status}`,
            { fontSize: '15px', color: '#ffffff', lineSpacing: 8 },
        );
        this.productionMenu.push(info);

        if (done) {
            const collect = this.scene.add.text(panelX + padding, panelY + 138, 'Click to collect', {
                fontSize: '14px', color: '#66dd88', fontStyle: 'bold',
            }).setInteractive({ useHandCursor: true });
            collect.on('pointerdown', () => void this.collectProduction(production, playerBuildingId));
            this.productionMenu.push(collect);
            return;
        }

        const timer = this.scene.add.text(panelX + padding, panelY + 138, '', {
            fontSize: '14px', color: '#cccccc',
        });
        this.productionMenu.push(timer);

        let timeLeft = this.getTimeLeftSeconds(production);
        if (timeLeft <= 0) {
            this.markProductionDone(production, playerBuildingId);
            return;
        }

        const updateTimer = (): void => {
            timer.setText(`Time left: ${this.formatTime(timeLeft)}`);
        };
        updateTimer();
        this.productionTimer = this.scene.time.addEvent({
            delay: 1000,
            loop: true,
            callback: () => {
                timeLeft = Math.max(0, timeLeft - 1);
                if (timeLeft === 0) {
                    this.markProductionDone(production, playerBuildingId);
                    return;
                }
                updateTimer();
            },
        });
    }

    private markProductionDone(production: BuildingCurrentProduction, playerBuildingId: number): void {
        const completedProduction: BuildingCurrentProduction = {
            ...production,
            status: 'DONE',
        };
        const playerBuildings: PlayerBuilding[] = this.scene.registry.get('playerBuildings') || [];
        this.scene.registry.set('playerBuildings', playerBuildings.map(playerBuilding =>
            playerBuilding.id === playerBuildingId
                ? { ...playerBuilding, building_current_production: completedProduction }
                : playerBuilding,
        ));
        this.scene.events.emit('productionUpdated', playerBuildingId);

        this.closeProductionMenu();
        this.showCurrentProduction(completedProduction, playerBuildingId);
    }

    private addProductionRow(
        production: BuildingProduction,
        panelX: number,
        rowY: number,
        panelWidth: number,
        rowHeight: number,
        padding: number,
        playerBuildingId: number,
    ): void {
        const rowBg = this.scene.add.rectangle(panelX + padding, rowY, panelWidth - padding * 2, rowHeight, 0x2a2a4a)
            .setOrigin(0, 0).setInteractive({ useHandCursor: true });
        rowBg.on('pointerover', () => rowBg.setFillStyle(0x3a3a6a));
        rowBg.on('pointerout', () => rowBg.setFillStyle(0x2a2a4a));
        rowBg.on('pointerdown', async () => {
            const productionId = this.getProductionId(production);
            if (productionId === undefined) {
                console.error('Production is missing its ID:', production);
                return;
            }

            const currentProduction = await BuildingService.startProduction(
                this.player.id,
                playerBuildingId,
                productionId,
            );
            if (currentProduction) {
                const playerBuildings: PlayerBuilding[] = this.scene.registry.get('playerBuildings') || [];
                this.scene.registry.set('playerBuildings', playerBuildings.map(playerBuilding =>
                    playerBuilding.id === playerBuildingId
                        ? { ...playerBuilding, building_current_production: currentProduction }
                        : playerBuilding,
                ));
                this.scene.events.emit('productionUpdated', playerBuildingId);
                this.closeProductionMenu();
            }
        });
        this.productionMenu.push(rowBg);

        const item = this.scene.add.text(panelX + padding * 2, rowY + 8, `${production.item_name} × ${production.quantity}`, {
            fontSize: '15px', color: '#ffffff', fontStyle: 'bold',
        });
        this.productionMenu.push(item);

        const time = this.scene.add.text(panelX + padding * 2, rowY + 32, `Production time: ${production.production_time_seconds}s`, {
            fontSize: '11px', color: '#cccccc',
        });
        this.productionMenu.push(time);
    }

    private async collectProduction(production: BuildingCurrentProduction, playerBuildingId: number): Promise<void> {
        const success = await BuildingService.collectProduction(
            this.player.id,
            playerBuildingId,
            production.building_production_id,
        );
        if (success) {
            const playerBuildings: PlayerBuilding[] = this.scene.registry.get('playerBuildings') || [];
            this.scene.registry.set('playerBuildings', playerBuildings.map(playerBuilding =>
                playerBuilding.id === playerBuildingId
                    ? { ...playerBuilding, building_current_production: null }
                    : playerBuilding,
            ));
            this.scene.events.emit('productionCollected', playerBuildingId);
            this.closeProductionMenu();
        }
    }

    private getProductionId(production: BuildingProduction): number | undefined {
        return production.building_production_id
            ?? production.id
            ?? production.production_id
            ?? production.buildingProductionId
            ?? production.building_production?.id
            ?? production.production?.id;
    }

    private closeProductionMenu(): void {
        this.productionTimer?.remove(false);
        this.productionTimer = null;
        this.productionMenu.forEach(object => object.destroy());
        this.productionMenu = [];
    }

    private getTimeLeftSeconds(production: BuildingCurrentProduction): number {
        const directTime = production.time_left_seconds
            ?? production.time_left
            ?? production.remaining_time_seconds
            ?? production.remaining_time;
        if (directTime !== undefined) {
            return Math.max(0, Math.ceil(directTime));
        }

        if (production.ends_at) {
            return Math.max(0, Math.ceil((Date.parse(production.ends_at) - Date.now()) / 1000));
        }

        if (production.end_time) {
            return Math.max(0, Math.ceil((Date.parse(production.end_time) - Date.now()) / 1000));
        }

        return Math.max(0, production.production_time_seconds ?? 0);
    }

    private formatTime(totalSeconds: number): string {
        const hours = Math.floor(totalSeconds / 3600);
        const minutes = Math.floor((totalSeconds % 3600) / 60);
        const seconds = totalSeconds % 60;
        return [hours, minutes, seconds].map(value => value.toString().padStart(2, '0')).join(':');
    }

    private getItemName(production: BuildingCurrentProduction): string {
        return production.item_name ?? production.item?.name ?? 'Unknown item';
    }

    private getQuantity(production: BuildingCurrentProduction): number | string {
        return production.quantity ?? production.item?.quantity ?? '—';
    }
}
