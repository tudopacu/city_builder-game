import Phaser from 'phaser';
import { Player } from '../models/Player';
import { BuildingData } from '../dto/getBuildingsResponse';
import { BuildingService } from '../services/BuildingService';
import Layer = Phaser.GameObjects.Layer;

export class HUDLayer {
  private scene: Phaser.Scene;
  private player: Player;
  private layer!: Layer;
  private onBuildingSelect: (building: BuildingData) => void;
  private buildingListPanel: Phaser.GameObjects.GameObject[] = [];

  constructor(scene: Phaser.Scene, player: Player, onBuildingSelect: (building: BuildingData) => void) {
    this.scene = scene;
    this.player = player;
    this.onBuildingSelect = onBuildingSelect;
  }

  public getLayer(): Layer {
    return this.layer;
  }

  public create(): void {
    this.layer = this.scene.add.layer();
    
    // Create player info text at top-left
    this.createPlayerInfo();
    
    // Create menu buttons at center-bottom
    this.createMenu();
  }

  private createPlayerInfo(): void {
    const text = this.scene.add.text(10, 10, `Player: ${this.player.username}`, {
      fontSize: '16px',
      color: '#ffffff',
      backgroundColor: '#000000',
      padding: { x: 5, y: 5 },
    });

    const hudBg = this.scene.add.rectangle(0, 0, 60, 60, 0x000000, 0.6)
      .setOrigin(0);

    this.layer.add([hudBg, text]);
  }

  private createMenu(): void {
    const centerX = this.scene.scale.width / 2;
    const bottomY = this.scene.scale.height - 80;

    // Button styling constants
    const buttonWidth = 120;
    const buttonHeight = 40;
    const buttonSpacing = 20;
    const buttonColor = 0x4a4a4a;
    const buttonHoverColor = 0x666666;

    // Build button
    const buildButtonX = centerX - (buttonWidth + buttonSpacing / 2);
    const buildButton = this.createButton(
      buildButtonX,
      bottomY,
      buttonWidth,
      buttonHeight,
      'Build',
      buttonColor,
      buttonHoverColor,
      () => {
        this.showBuildingList();
      }
    );

    // World Map button
    const worldMapButtonX = centerX + (buttonSpacing / 2);
    const worldMapButton = this.createButton(
      worldMapButtonX,
      bottomY,
      buttonWidth,
      buttonHeight,
      'World Map',
      buttonColor,
      buttonHoverColor,
      () => {
        console.log('World Map button clicked');
        // TODO: Implement world map view
      }
    );

    this.layer.add([...buildButton, ...worldMapButton]);
  }

  private isLoadingBuildingList = false;

  private async showBuildingList(): Promise<void> {
    if (this.isLoadingBuildingList) {
      return;
    }
    this.isLoadingBuildingList = true;
    this.closeBuildingList();

    let buildings: BuildingData[] = [];
    let loadError = false;
    try {
      buildings = await BuildingService.getBuildings();
    } catch {
      loadError = true;
    } finally {
      this.isLoadingBuildingList = false;
    }

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

    if (loadError) {
      const errorText = this.scene.add.text(panelX + padding, rowsStartY + padding, 'Failed to load buildings.', {
        fontSize: '14px',
        color: '#ff6666',
      });
      this.buildingListPanel.push(errorText);
    } else if (buildings.length === 0) {
      const noBuildings = this.scene.add.text(panelX + padding, rowsStartY + padding, 'No buildings available.', {
        fontSize: '14px',
        color: '#aaaaaa',
      });
      this.buildingListPanel.push(noBuildings);
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
          this.onBuildingSelect(building);
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

    this.layer.add(this.buildingListPanel);
  }

  public closeBuildingList(): void {
    this.buildingListPanel.forEach(obj => obj.destroy());
    this.buildingListPanel = [];
  }

  private createButton(
    x: number,
    y: number,
    width: number,
    height: number,
    text: string,
    color: number,
    hoverColor: number,
    onClick: () => void
  ): Phaser.GameObjects.GameObject[] {
    // Button background
    const buttonBg = this.scene.add.rectangle(x, y, width, height, color)
      .setOrigin(0, 0);

    // Button text
    const buttonText = this.scene.add.text(
      x + width / 2,
      y + height / 2,
      text,
      {
        fontSize: '16px',
        color: '#ffffff',
      }
    ).setOrigin(0.5, 0.5);

    // Make button interactive
    buttonBg.setInteractive({ useHandCursor: true })
      .on('pointerover', () => {
        buttonBg.setFillStyle(hoverColor);
      })
      .on('pointerout', () => {
        buttonBg.setFillStyle(color);
      })
      .on('pointerdown', () => {
        onClick();
      });

    return [buttonBg, buttonText];
  }
}
