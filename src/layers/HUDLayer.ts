import Phaser from 'phaser';
import { Player } from '../models/Player';
import {MainMenuService} from "../services/menus/MainMenuService";
import Layer = Phaser.GameObjects.Layer;
import {BuildingsMenuService} from "../services/menus/BuildingsMenuService";
import {ProductionMenuService} from "../services/menus/ProductionMenuService";
import {StorageMenuService} from "../services/menus/StorageMenuService";
import {POPULATION_CHANGED_EVENT, PopulationService, SHOW_MESSAGE_EVENT} from "../services/PopulationService";
import {Population} from "../models/Population";

export class HUDLayer {
  private layer!: Layer;
  private populationText: Phaser.GameObjects.Text | null = null;
  private messageText: Phaser.GameObjects.Text | null = null;
  public mainMenuService: MainMenuService | null = null;
  public buildingsMenuService: BuildingsMenuService | null = null;
  public productionMenuService: ProductionMenuService | null = null;
  public storageMenuService: StorageMenuService | null = null;

  constructor(
      private scene: Phaser.Scene,
      private player: Player,
  ) {}

  public getLayer(): Layer {
    return this.layer;
  }

  public create(): void {
    this.layer = this.scene.add.layer();
    this.mainMenuService = new MainMenuService(this.scene, this);
    this.buildingsMenuService = new BuildingsMenuService(this.scene, this);
    this.productionMenuService = new ProductionMenuService(this.scene, this, this.player);
    this.storageMenuService = new StorageMenuService(this.scene, this);
    this.mainMenuService.createMenu();
    this.createPlayerInfo();
  }

  private createPlayerInfo(): void {
    const text = this.scene.add.text(10, 10, `Player: ${this.player.username}`, {
      fontSize: '16px',
      color: '#ffffff',
      backgroundColor: '#000000',
      padding: { x: 5, y: 5 },
    });

    this.layer.add([text]);

    this.populationText = this.scene.add.text(10, 44, '', {
      fontSize: '16px',
      color: '#ffffff',
      backgroundColor: '#000000',
      padding: { x: 5, y: 5 },
    });
    this.layer.add([this.populationText]);
    this.updatePopulationText(PopulationService.getCurrent(this.scene));

    this.scene.events.on(POPULATION_CHANGED_EVENT, (population: Population | null) => {
      this.updatePopulationText(population);
    });
    this.scene.events.on(SHOW_MESSAGE_EVENT, (message: string) => {
      this.showMessage(message);
    });
  }

  private updatePopulationText(population: Population | null): void {
    if (!this.populationText) {
      return;
    }

    // Unknown, for example while loading or after a failed read. Do not show a made-up zero.
    if (population === null) {
      this.populationText.setText('Population: unavailable');
      this.populationText.setColor('#cccccc');
      return;
    }

    this.populationText.setText(
      `Population: ${population.used}/${population.total} (${population.available} free)`,
    );
    // Red when nothing is free, so it is clear why a building cannot be placed.
    this.populationText.setColor(population.available > 0 ? '#ffffff' : '#ff8b8b');
  }

  private showMessage(message: string): void {
    this.messageText?.destroy();

    this.messageText = this.scene.add.text(this.scene.scale.width / 2, 20, message, {
      fontSize: '16px',
      color: '#ffffff',
      backgroundColor: '#7a2630',
      padding: { x: 10, y: 6 },
    }).setOrigin(0.5, 0);
    this.layer.add([this.messageText]);

    const shown = this.messageText;
    this.scene.time.delayedCall(4000, () => {
      shown.destroy();
      if (this.messageText === shown) {
        this.messageText = null;
      }
    });
  }
}
