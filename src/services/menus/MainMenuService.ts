import Phaser from "phaser";
import {HUDLayer} from "../../layers/HUDLayer";

const ERROR_MESSAGE_DURATION_MS = 3000;

export class MainMenuService {
    private errorMessageText: Phaser.GameObjects.Text | null = null;
    private errorMessageTimer: Phaser.Time.TimerEvent | null = null;

        constructor(
            private scene: Phaser.Scene,
            private hudLayer: HUDLayer,
        ) {
            this.scene.events.on('showErrorMessage', (message: string) => {
                this.showErrorMessage(message);
            });
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
                this.scene.events.emit('buildButtonClicked');
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

        // Remove button
        const removeButtonX = worldMapButtonX + buttonWidth + buttonSpacing;
        const removeButton = this.createButton(
            removeButtonX,
            bottomY,
            buttonWidth,
            buttonHeight,
            'Remove',
            buttonColor,
            buttonHoverColor,
            () => {
                this.scene.events.emit('removeButtonClicked');
            }
        );

        this.hudLayer.getLayer().add([...buildButton, ...worldMapButton, ...removeButton]);
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

    private showErrorMessage(message: string): void {
        if (this.errorMessageText) {
            this.errorMessageText.destroy();
            this.errorMessageText = null;
        }

        if (this.errorMessageTimer) {
            this.errorMessageTimer.destroy();
            this.errorMessageTimer = null;
        }

        this.errorMessageText = this.scene.add.text(
            this.scene.scale.width / 2,
            this.scene.scale.height - 130,
            message,
            {
                fontSize: '14px',
                color: '#ff6666',
                backgroundColor: '#000000',
                padding: { x: 8, y: 6 },
            }
        ).setOrigin(0.5, 0.5);

        this.hudLayer.getLayer().add(this.errorMessageText);

        this.errorMessageTimer = this.scene.time.delayedCall(ERROR_MESSAGE_DURATION_MS, () => {
            this.errorMessageText?.destroy();
            this.errorMessageText = null;
            this.errorMessageTimer = null;
        });
    }
}
