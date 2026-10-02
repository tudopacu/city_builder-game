import Phaser from 'phaser';
import { HUDLayer } from '../../layers/HUDLayer';
import { Item } from '../../models/Item';
import { PlayerBuilding } from '../../models/PlayerBuilding';
import { PlayerInventory } from '../../models/PlayerInventory';

export class StorageMenuService {
    private menu: Phaser.GameObjects.GameObject[] = [];

    constructor(
        private scene: Phaser.Scene,
        private hudLayer: HUDLayer,
    ) {
        this.scene.events.on('buildingStorageClicked', (playerBuildingId: number) => {
            this.showStorageMenu(playerBuildingId);
        });
    }

    private showStorageMenu(playerBuildingId: number): void {
        this.closeMenu();

        const playerBuildings: PlayerBuilding[] = this.scene.registry.get('playerBuildings') || [];
        const building = playerBuildings.find(candidate => candidate.id === playerBuildingId);
        if (!building) return;

        const inventories: PlayerInventory[] = this.scene.registry.get('playerInventories') || [];
        const items: Item[] = this.scene.registry.get('items') || [];
        const storedItems = inventories
            .filter(inventory => inventory.player_building_id === playerBuildingId)
            .flatMap(inventory => inventory.items || [])
            .filter(item => item.quantity > 0);

        const panelX = 50;
        const panelY = 80;
        const panelWidth = 420;
        const headerHeight = 48;
        const rowHeight = 32;
        const padding = 16;
        const rowsHeight = Math.max(rowHeight, storedItems.length * rowHeight);
        const panelHeight = headerHeight + rowsHeight + padding * 2;

        const panelBg = this.scene.add.rectangle(panelX, panelY, panelWidth, panelHeight, 0x1a1a2e, 0.97)
            .setOrigin(0, 0)
            .setInteractive();
        panelBg.on('pointerdown', (_pointer: Phaser.Input.Pointer, _localX: number, _localY: number, event: Phaser.Types.Input.EventData) => {
            event.stopPropagation();
        });
        this.menu.push(panelBg);

        const title = this.scene.add.text(panelX + padding, panelY + padding, `${building.building.name} Storage`, {
            fontSize: '18px', color: '#ffffff', fontStyle: 'bold',
        });
        this.menu.push(title);

        const closeButton = this.scene.add.text(panelX + panelWidth - padding - 18, panelY + padding, '✕', {
            fontSize: '16px', color: '#ff6666',
        }).setInteractive({ useHandCursor: true }).on('pointerdown', (
            _pointer: Phaser.Input.Pointer,
            _localX: number,
            _localY: number,
            event: Phaser.Types.Input.EventData,
        ) => {
            event.stopPropagation();
            this.closeMenu();
        });
        this.menu.push(closeButton);

        const divider = this.scene.add.rectangle(panelX, panelY + headerHeight - 2, panelWidth, 2, 0x444466)
            .setOrigin(0, 0);
        this.menu.push(divider);

        if (storedItems.length === 0) {
            this.menu.push(this.scene.add.text(
                panelX + padding,
                panelY + headerHeight + padding,
                'No items stored.',
                { fontSize: '14px', color: '#aaaacc' },
            ));
        } else {
            storedItems.forEach((storedItem, index) => {
                const itemName = items.find(item => item.id === storedItem.item_id)?.name ?? `Item ${storedItem.item_id}`;
                const rowY = panelY + headerHeight + padding + index * rowHeight;
                this.menu.push(this.scene.add.text(
                    panelX + padding,
                    rowY,
                    itemName,
                    { fontSize: '14px', color: '#ffffff' },
                ));
                this.menu.push(this.scene.add.text(
                    panelX + panelWidth - padding,
                    rowY,
                    String(storedItem.quantity),
                    { fontSize: '14px', color: '#ffffff' },
                ).setOrigin(1, 0));
            });
        }

        this.hudLayer.getLayer().add(this.menu);
    }

    private closeMenu(): void {
        this.menu.forEach(object => object.destroy());
        this.menu = [];
    }
}
