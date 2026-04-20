import Phaser from 'phaser';
import { BuildingData } from '../dto/getBuildingsResponse';
import { HUDLayer } from '../layers/HUDLayer';
import { CloseButton } from './CloseButton';
import { MenuListItem } from './MenuListItem';

export interface MenuSize {
    width: number;
    headerHeight: number;
    rowHeight: number;
    rowSpacing: number;
    padding: number;
    emptyRowHeight: number;
}

export abstract class Menu {
    protected objects: Phaser.GameObjects.GameObject[] = [];

    constructor(
        protected scene: Phaser.Scene,
        protected hudLayer: HUDLayer,
    ) {}

    protected abstract get position(): { x: number; y: number };
    protected abstract get size(): MenuSize;
    protected abstract get title(): string;
    protected abstract get buildings(): BuildingData[];
    protected abstract onItemAction(building: BuildingData): void;

    public show(): void {
        this.close();

        const { x: panelX, y: panelY } = this.position;
        const { width: panelWidth, headerHeight, rowHeight, rowSpacing, padding, emptyRowHeight } = this.size;
        const data = this.buildings;

        const contentRows = data.length > 0 ? data.length : 1;
        const singleRowHeight = data.length > 0 ? rowHeight : emptyRowHeight;
        const panelHeight = headerHeight + contentRows * (singleRowHeight + rowSpacing) + padding;

        const panelBg = this.scene.add.rectangle(panelX, panelY, panelWidth, panelHeight, 0x1a1a2e, 0.97)
            .setOrigin(0, 0);
        this.objects.push(panelBg);

        const titleText = this.scene.add.text(panelX + padding, panelY + padding, this.title, {
            fontSize: '18px',
            color: '#ffffff',
            fontStyle: 'bold',
        });
        this.objects.push(titleText);

        const closeBtn = new CloseButton(
            this.scene,
            panelX + panelWidth - padding - 16,
            panelY + padding,
            () => this.close(),
        ).create();
        this.objects.push(closeBtn);

        const divider = this.scene.add.rectangle(panelX, panelY + headerHeight - 2, panelWidth, 2, 0x444466)
            .setOrigin(0, 0);
        this.objects.push(divider);

        const rowsStartY = panelY + headerHeight;

        if (data.length === 0) {
            const noBuildings = this.scene.add.text(panelX + padding, rowsStartY + padding, 'No buildings available.', {
                fontSize: '14px',
                color: '#aaaaaa',
            });
            this.objects.push(noBuildings);
        }

        data.forEach((building, index) => {
            const rowY = rowsStartY + index * (rowHeight + rowSpacing) + rowSpacing;
            const itemObjects = new MenuListItem(
                this.scene,
                building,
                panelX + padding,
                rowY,
                panelWidth - padding * 2,
                rowHeight,
                padding,
                (b) => {
                    this.close();
                    this.onItemAction(b);
                },
            ).create();
            this.objects.push(...itemObjects);
        });

        this.hudLayer.getLayer().add(this.objects);
    }

    public close(): void {
        this.objects.forEach(obj => obj.destroy());
        this.objects = [];
    }
}
