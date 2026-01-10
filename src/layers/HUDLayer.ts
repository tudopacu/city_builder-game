import Phaser from 'phaser';
import { Player } from '../models/Player';
import Layer = Phaser.GameObjects.Layer;

export class HUDLayer {
  private scene: Phaser.Scene;
  private player: Player;
  private layer!: Layer;

  constructor(scene: Phaser.Scene, player: Player) {
    this.scene = scene;
    this.player = player;
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
        console.log('Build button clicked');
        // TODO: Implement build menu
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
