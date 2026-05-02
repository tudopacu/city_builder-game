import Phaser from "phaser";
import {HUDLayer} from "../../layers/HUDLayer";

export class MainMenuService {

        constructor(
            private scene: Phaser.Scene,
            private hudLayer: HUDLayer,
        ) {
        }

    public createMenu(): void {
        const centerX = this.scene.scale.width / 2;
        const bottomY = this.scene.scale.height - 80;

        // Button styling constants
        const buttonWidth = 120;
        const buttonHeight = 40;
        const buttonSpacing = 20;
        const buttonColor = 0x4a4a4a;
        const buttonHoverColor = 0x666666;

        // Center all three buttons together
        const totalWidth = 3 * buttonWidth + 2 * buttonSpacing;
        const startX = centerX - totalWidth / 2;

        // Build button
        const buildButton = this.createButton(
            startX,
            bottomY,
            buttonWidth,
            buttonHeight,
            'Build',
            buttonColor,
            buttonHoverColor,
            () => {
                this.scene.events.emit('buildButtonClicked');
            }
        );

        // Roads button
        const roadsButton = this.createButton(
            startX + buttonWidth + buttonSpacing,
            bottomY,
            buttonWidth,
            buttonHeight,
            'Roads',
            buttonColor,
            buttonHoverColor,
            () => {
                this.scene.events.emit('roadsButtonClicked');
            }
        );

        // World Map button
        const worldMapButton = this.createButton(
            startX + 2 * (buttonWidth + buttonSpacing),
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

        this.hudLayer.getLayer().add([...buildButton, ...roadsButton, ...worldMapButton]);
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