import Phaser from 'phaser';
import { MapService } from '../services/MapService';
import {Player} from "../models/Player";
import {Map} from "../models/Map";
import { BuildingService } from '../services/BuildingService';
import {PlayerBuilding} from "../models/PlayerBuilding";

const TILE_WIDTH = 64;      // width of a tile in your PNG
const TILE_HEIGHT = 64;     // height of a tile in your PNG
const TILE_SET_KEY = "terrain_tiles";

const RAW_W = 256;

const CROP_X = 0; //taie stanga
const CROP_Y = 0; //taie sus
const CROP_W = 64; //taie dreapta
const CROP_H = 64; //taie jos

const HALF_W = CROP_W / 2;
const HALF_H = CROP_H / 2;

// Building rendering constants
const BUILDING_LABEL_OFFSET_Y = 10; // Offset for building name label

/**
 * Main game scene with isometric map rendering
 */
export class GameScene extends Phaser.Scene {
  private player: Player;
  private mapService: MapService;
  private map: Map | null = null;
  private cameraDragStartX = 0;
  private cameraDragStartY = 0;
  private isDragging = false;
  private menuContainer: Phaser.GameObjects.Container | null = null;

  constructor(player: Player, mapService: MapService) {
    super({ key: 'GameScene' });
    this.player = player;
    this.mapService = mapService;
  }

  preload() {
    this.load.spritesheet(TILE_SET_KEY, "assets/grass_and_water.png", {
      frameWidth: TILE_WIDTH,
      frameHeight: TILE_HEIGHT,
    });
    this.load.image('casa', 'assets/casa.png');
  }


  create() {


    this.drawMap();
    this.loadPlayerBuildings();

    // Display player info
    this.add.text(10, 10, `Player: ${this.player.username}`, {
      fontSize: '16px',
      color: '#ffffff',
      backgroundColor: '#000000',
      padding: { x: 5, y: 5 },
    });


    this.setupCameraControls();
  }

   private async drawMap(): Promise<void> {
    this.map = (await this.mapService.fetchMap()) || null;

    console.log("Map data loaded:", this.map);

    const terrains = this.map?.terrains;

    if (!terrains) {
      console.error("No terrain data available to render the map.");
      return;
    }

    terrains.forEach(tile => {
      const { isoX, isoY } = this.toIsometricCoordinates(tile.x, tile.y);

      // Fix: Use the correct texture key + integer tilesPerRow
      const sourceImage = this.textures.get(TILE_SET_KEY).getSourceImage();
      const tilesPerRow = Math.floor(sourceImage.width / RAW_W);

      // Fix: Integer frame index
      const frameIndex = tile.set_y * tilesPerRow + tile.set_x;

      const img = this.add.image(isoX, isoY, TILE_SET_KEY, frameIndex);

      img.setCrop(CROP_X, CROP_Y, CROP_W, CROP_H);
      img.setOrigin(0.5, 1);
    });
  }

  /**
   * Convert grid coordinates to isometric screen coordinates
   */
  private toIsometricCoordinates(x: number, y: number): { isoX: number; isoY: number } {
    const isoX = (x - y) * HALF_W;
    const isoY = (x + y) * HALF_H / 2;
    return { isoX, isoY };
  }

  /**
   * Load and render player buildings on the map
   */
  private async loadPlayerBuildings(): Promise<void> {
    const playerBuildings = await BuildingService.getPlayerBuildings();

    if (playerBuildings.length === 0) {
      return;
    }

    playerBuildings.forEach(playerBuilding => {
      this.renderBuilding(playerBuilding);
    });
  }

  /**
   * Render a single building on the map
   * Takes into account the tile size and isometric coordinates
   */
  private renderBuilding(playerBuilding: PlayerBuilding): void {
    // Calculate isometric position based on building coordinates
    const { isoX, isoY } = this.toIsometricCoordinates(playerBuilding.x, playerBuilding.y);

    // Add the building image
    const buildingImage = this.add.image(isoX, isoY, 'casa');
    buildingImage.setOrigin(0.5, 1);
    buildingImage.setDepth(isoY); // Set depth based on isoY for proper layering

    // Add building name label
    const text = this.add.text(isoX, isoY - BUILDING_LABEL_OFFSET_Y, playerBuilding.building.name, {
      fontSize: '12px',
      color: '#ffffff',
      backgroundColor: '#000000',
      padding: { x: 3, y: 2 },
    });
    text.setOrigin(0.5, 1);
    text.setDepth(isoY + 1); // Ensure the label is above the building
  }

  /**
   * Setup camera controls for panning
   */
  private setupCameraControls(): void {
    // Enable camera drag with mouse
    this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      this.cameraDragStartX = pointer.x;
      this.cameraDragStartY = pointer.y;
      this.isDragging = false;
    });

    this.input.on('pointermove', (pointer: Phaser.Input.Pointer) => {
      if (pointer.isDown) {
        const deltaX = pointer.x - this.cameraDragStartX;
        const deltaY = pointer.y - this.cameraDragStartY;

        // Consider it dragging if moved more than 5 pixels
        if (Math.abs(deltaX) > 5 || Math.abs(deltaY) > 5) {
          this.isDragging = true;
        }

        this.cameras.main.scrollX -= deltaX;
        this.cameras.main.scrollY -= deltaY;

        this.cameraDragStartX = pointer.x;
        this.cameraDragStartY = pointer.y;
      }
    });

    this.input.on('pointerup', (pointer: Phaser.Input.Pointer) => {
      // Only open menu if it was a click (not a drag)
      if (!this.isDragging) {
        this.openMenu(pointer.x, pointer.y);
      }
      this.isDragging = false;
    });

    // Zoom with mouse wheel
    this.input.on('wheel', (_pointer: Phaser.Input.Pointer, _gameObjects: unknown, _deltaX: number, deltaY: number) => {
      const zoomDelta = deltaY > 0 ? -0.1 : 0.1;
      const newZoom = Phaser.Math.Clamp(this.cameras.main.zoom + zoomDelta, 0.5, 2);
      this.cameras.main.setZoom(newZoom);
    });
  }

  /**
   * Open a menu at the specified screen coordinates
   * The menu is positioned to be fully visible within screen bounds
   */
  private openMenu(x: number, y: number): void {
    // Close existing menu if any
    if (this.menuContainer) {
      this.menuContainer.destroy();
      this.menuContainer = null;
    }

    // Menu dimensions
    const menuWidth = 150;
    const menuHeight = 110;
    const buttonHeight = 40;
    const buttonSpacing = 10;
    const menuPadding = 10;

    // Adjust position to keep menu within screen bounds
    const adjustedX = this.adjustMenuPosition(x, menuWidth, this.cameras.main.width);
    const adjustedY = this.adjustMenuPosition(y, menuHeight, this.cameras.main.height);

    // Create container for menu
    this.menuContainer = this.add.container(adjustedX, adjustedY);
    this.menuContainer.setDepth(10000); // Ensure menu is on top

    // Menu background with 80% transparency (alpha = 0.2 means 80% transparent)
    const menuBg = this.add.rectangle(0, 0, menuWidth, menuHeight, 0x1e3a8a, 0.2);
    menuBg.setOrigin(0, 0);
    menuBg.setStrokeStyle(2, 0x3b82f6);
    this.menuContainer.add(menuBg);

    // Buildings button
    const buildingsButton = this.createMenuButton(
      menuPadding,
      menuPadding,
      menuWidth - 2 * menuPadding,
      buttonHeight,
      'Buildings',
      () => {
        console.log('Buildings button clicked');
        this.closeMenu();
      }
    );
    this.menuContainer.add(buildingsButton);

    // Roads button
    const roadsButton = this.createMenuButton(
      menuPadding,
      menuPadding + buttonHeight + buttonSpacing,
      menuWidth - 2 * menuPadding,
      buttonHeight,
      'Roads',
      () => {
        console.log('Roads button clicked');
        this.closeMenu();
      }
    );
    this.menuContainer.add(roadsButton);

    // Make menu interactive to prevent clicks from passing through
    menuBg.setInteractive();
  }

  /**
   * Create a menu button with text
   */
  private createMenuButton(
    x: number,
    y: number,
    width: number,
    height: number,
    text: string,
    onClick: () => void
  ): Phaser.GameObjects.Container {
    const buttonContainer = this.add.container(x, y);

    // Button background
    const buttonBg = this.add.rectangle(0, 0, width, height, 0x3b82f6, 0.3);
    buttonBg.setOrigin(0, 0);
    buttonBg.setStrokeStyle(2, 0x60a5fa);
    buttonBg.setInteractive({ useHandCursor: true });

    // Button text
    const buttonText = this.add.text(width / 2, height / 2, text, {
      fontSize: '16px',
      color: '#ffffff',
      fontStyle: 'bold',
    });
    buttonText.setOrigin(0.5, 0.5);

    // Hover effects
    buttonBg.on('pointerover', () => {
      buttonBg.setFillStyle(0x60a5fa, 0.5);
    });

    buttonBg.on('pointerout', () => {
      buttonBg.setFillStyle(0x3b82f6, 0.3);
    });

    // Click handler
    buttonBg.on('pointerdown', () => {
      onClick();
    });

    buttonContainer.add([buttonBg, buttonText]);
    return buttonContainer;
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

  /**
   * Close the menu
   */
  private closeMenu(): void {
    if (this.menuContainer) {
      this.menuContainer.destroy();
      this.menuContainer = null;
    }
  }

  update(): void {
    // Game update loop
  }
}
