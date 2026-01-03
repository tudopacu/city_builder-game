import Phaser from 'phaser';

// Button styling constants
export const BUTTON_COLORS = {
  DEFAULT: 0x3b82f6,      // Medium blue button
  HOVER: 0x60a5fa,        // Light blue on hover
  BORDER: 0x60a5fa,       // Border color
  TEXT: '#ffffff',        // White text
};

export const BUTTON_ALPHA = {
  DEFAULT: 0.3,           // 30% opaque
  HOVER: 0.5,             // 50% opaque
};

export const BUTTON_TEXT_STYLE = {
  fontSize: '16px',
  color: BUTTON_COLORS.TEXT,
  fontStyle: 'bold' as const,
};

/**
 * Interactive button component for menus
 */
export class MenuButton {
  private container: Phaser.GameObjects.Container;
  private background: Phaser.GameObjects.Rectangle;

  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    width: number,
    height: number,
    text: string,
    onClick: () => void,
    onHoverStart?: () => void,
    onHoverEnd?: () => void
  ) {
    this.container = scene.add.container(x, y);

    // Button background
    this.background = scene.add.rectangle(
      0,
      0,
      width,
      height,
      BUTTON_COLORS.DEFAULT,
      BUTTON_ALPHA.DEFAULT
    );
    this.background.setOrigin(0, 0);
    this.background.setStrokeStyle(2, BUTTON_COLORS.BORDER);
    this.background.setInteractive({ useHandCursor: true });

    // Button text
    const buttonText = scene.add.text(width / 2, height / 2, text, BUTTON_TEXT_STYLE);
    buttonText.setOrigin(0.5, 0.5);

    // Hover effects
    this.background.on('pointerover', () => {
      this.background.setFillStyle(BUTTON_COLORS.HOVER, BUTTON_ALPHA.HOVER);
      if (onHoverStart) {
        onHoverStart();
      }
    });

    this.background.on('pointerout', () => {
      this.background.setFillStyle(BUTTON_COLORS.DEFAULT, BUTTON_ALPHA.DEFAULT);
      if (onHoverEnd) {
        onHoverEnd();
      }
    });

    // Click handler
    this.background.on('pointerup', () => {
      onClick();
    });

    this.container.add([this.background, buttonText]);
  }

  /**
   * Get the button container
   */
  public getContainer(): Phaser.GameObjects.Container {
    return this.container;
  }

  /**
   * Destroy the button
   */
  public destroy(): void {
    this.container.destroy();
  }
}
