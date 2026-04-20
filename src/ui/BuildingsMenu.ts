import Phaser from 'phaser';
import { BuildingData } from '../dto/getBuildingsResponse';
import { HUDLayer } from '../layers/HUDLayer';
import { Menu, MenuSize } from './Menu';

export class BuildingsMenu extends Menu {
    constructor(
        scene: Phaser.Scene,
        hudLayer: HUDLayer,
        private buildingData: BuildingData[],
        private onBuildingSelect: (building: BuildingData) => void,
    ) {
        super(scene, hudLayer);
    }

    protected get position(): { x: number; y: number } {
        return { x: 50, y: 80 };
    }

    protected get size(): MenuSize {
        return {
            width: 500,
            headerHeight: 44,
            rowHeight: 70,
            rowSpacing: 8,
            padding: 12,
            emptyRowHeight: 36,
        };
    }

    protected get title(): string {
        return 'Select a Building';
    }

    protected get buildings(): BuildingData[] {
        return this.buildingData;
    }

    protected onItemAction(building: BuildingData): void {
        this.onBuildingSelect(building);
    }
}
