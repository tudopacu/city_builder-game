import Phaser from 'phaser';
import { MenuButton } from './MenuButton';

// Menu styling constants
export const MENU_COLORS = {
  BACKGROUND: 0x1e3a8a,      // Dark blue background
  BORDER: 0x3b82f6,          // Medium blue border
};

export const MENU_ALPHA = {
  BACKGROUND: 0.2,           // 20% opaque (80% transparent)
};

const MENU_Z_INDEX = 10000;  // Z-index to ensure menu is on top

// Menu dimensions
const MENU_WIDTH = 150;
const MENU_HEIGHT = 110;
const BUTTON_HEIGHT = 40;
const BUTTON_SPACING = 10;
const MENU_PADDING = 10;

/**
 * Context menu that appears on click with action buttons
 */
export class ContextMenu {
  private scene: Phaser.Scene;
  private container: Phaser.GameObjects.Container | null = null;
  private clickHandler: ((pointer: Phaser.Input.Pointer) => void) | null = null;
  private buttons: MenuButton[] = [];
  private isPointerOverMenu = false;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
  }

  /**
   * Open the menu at the specified screen coordinates
   * The menu is positioned to be fully visible within screen bounds
   */
  public open(x: number, y: number, onBuildingsClick: () => void, onRoadsClick: () => void): void {
    // Close existing menu if any
    this.close();

    // Adjust position to keep menu within screen bounds
    const adjustedX = this.adjustMenuPosition(x, MENU_WIDTH, this.scene.cameras.main.width);
    const adjustedY = this.adjustMenuPosition(y, MENU_HEIGHT, this.scene.cameras.main.height);

    // Create container for menu
    this.container = this.scene.add.container(adjustedX, adjustedY);
    this.container.setDepth(MENU_Z_INDEX); // Ensure menu is on top
    this.container.setScrollFactor(0); // Fix bug #1: Menu should not zoom/scroll with camera

    // Menu background with 80% transparency (alpha = 0.2 means 20% opaque)
    const menuBg = this.scene.add.rectangle(
      0,
      0,
      MENU_WIDTH,
      MENU_HEIGHT,
      MENU_COLORS.BACKGROUND,
      MENU_ALPHA.BACKGROUND
    );
    menuBg.setOrigin(0, 0);
    menuBg.setStrokeStyle(2, MENU_COLORS.BORDER);
    this.container.add(menuBg);

    // Buildings button
    const buildingsButton = new MenuButton(
      this.scene,
      MENU_PADDING,
      MENU_PADDING,
      MENU_WIDTH - 2 * MENU_PADDING,
      BUTTON_HEIGHT,
      'Buildings',
      () => {
        onBuildingsClick();
        this.close();
      },
      () => { this.isPointerOverMenu = true; },  // onHoverStart
      () => { this.isPointerOverMenu = false; }  // onHoverEnd
    );
    this.container.add(buildingsButton.getContainer());
    this.buttons.push(buildingsButton);

    // Roads button
    const roadsButton = new MenuButton(
      this.scene,
      MENU_PADDING,
      MENU_PADDING + BUTTON_HEIGHT + BUTTON_SPACING,
      MENU_WIDTH - 2 * MENU_PADDING,
      BUTTON_HEIGHT,
      'Roads',
      () => {
        onRoadsClick();
        this.close();
      },
      () => { this.isPointerOverMenu = true; },  // onHoverStart
      () => { this.isPointerOverMenu = false; }  // onHoverEnd
    );
    this.container.add(roadsButton.getContainer());
    this.buttons.push(roadsButton);

    // Make menu interactive to prevent clicks from passing through
    menuBg.setInteractive();

    // Track when pointer is over the menu (Fix bug #3)
    // We track both background and buttons to ensure the flag stays true
    // when moving between them
    menuBg.on('pointerover', () => {
      this.isPointerOverMenu = true;
    });

    menuBg.on('pointerout', () => {
      this.isPointerOverMenu = false;
    });

    // Add click handler to close menu when clicking outside
    this.clickHandler = (pointer: Phaser.Input.Pointer) => {
      if (this.container && pointer.leftButtonReleased()) {
        // Check if click is outside the menu bounds
        const menuBounds = new Phaser.Geom.Rectangle(
          adjustedX,
          adjustedY,
          MENU_WIDTH,
          MENU_HEIGHT
        );
        
        if (!Phaser.Geom.Rectangle.Contains(menuBounds, pointer.x, pointer.y)) {
          this.close();
        }
      }
    };

    // Listen for clicks on the scene
    this.scene.input.on('pointerup', this.clickHandler);
  }

  /**
   * Close the menu
   */
  public close(): void {
    if (this.container) {
      this.container.destroy();
      this.container = null;
    }

    // Clear button references (they're automatically destroyed with container)
    this.buttons = [];
    
    // Reset pointer over menu flag
    this.isPointerOverMenu = false;
    
    // Remove the click handler
    if (this.clickHandler) {
      this.scene.input.off('pointerup', this.clickHandler);
      this.clickHandler = null;
    }
  }

  /**
   * Check if the menu is currently open
   */
  public isOpen(): boolean {
    return this.container !== null;
  }

  /**
   * Check if the pointer is currently over the menu
   */
  public isPointerOver(): boolean {
    return this.isPointerOverMenu;
  }

  /**
   * Adjust menu position to keep it within screen bounds
   */
  private adjustMenuPosition(position: number, menuSize: number, screenSize: number): number {
    // If menu would go off the right/bottom edge, position it to the left/top of the cursor
    if (position + menuSize > screenSize) {
      return Math.max(0, screenSize - menuSize);
    }
    return position;
  }
}
