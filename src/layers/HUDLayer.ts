import Phaser from 'phaser';
import { Player } from '../models/Player';
import {MenuService} from "../services/MenuService";
import Layer = Phaser.GameObjects.Layer;
import {WorldLayer} from "./WorldLayer";
import Camera = Phaser.Cameras.Scene2D.Camera;

export class HUDLayer {
  private layer!: Layer;
  public menuService: MenuService | null = null;

  constructor(
      private scene: Phaser.Scene,
      private player: Player,
      private worldLayer: WorldLayer,
      private worldCamera: Camera
  ) {}

  public getLayer(): Layer {
    return this.layer;
  }

  public create(): void {
    this.layer = this.scene.add.layer();
    this.menuService = new MenuService(this.scene, this.layer, this.player, this.worldLayer, this.worldCamera);
    this.menuService.createMenu();
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
  }
}
