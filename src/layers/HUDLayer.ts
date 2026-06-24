import Phaser from 'phaser';
import { Player } from '../models/Player';
import {MainMenuService} from "../services/menus/MainMenuService";
import Layer = Phaser.GameObjects.Layer;
import {BuildingsMenuService} from "../services/menus/BuildingsMenuService";

export class HUDLayer {
  private layer!: Layer;
  public mainMenuService: MainMenuService | null = null;
  public buildingsMenuService: BuildingsMenuService | null = null;

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
    this.mainMenuService.createMenu();
    this.createPlayerInfo();
  }

  private createPlayerInfo(): void {
    const text = this.scene.add.text(10, 10, `Player2: ${this.player.username}`, {
      fontSize: '16px',
      color: '#ffffff',
      backgroundColor: '#000000',
      padding: { x: 5, y: 5 },
    });

    this.layer.add([text]);
  }
}
