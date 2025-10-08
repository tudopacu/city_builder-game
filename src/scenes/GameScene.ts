import Phaser from 'phaser';
import { Player, IsometricMapData } from '../types';
import { ApiService } from '../services/ApiService';

/**
 * Main game scene with isometric map rendering
 */
export class GameScene extends Phaser.Scene {
  private player: Player;
  private apiService: ApiService;
  private mapData: IsometricMapData | null = null;
  private tileWidth = 64;
  private tileHeight = 32;
  private cameraDragStartX = 0;
  private cameraDragStartY = 0;

  constructor(player: Player, apiService: ApiService) {
    super({ key: 'GameScene' });
    this.player = player;
    this.apiService = apiService;
  }

  preload(): void {
    // Load assets here
    // For now, we'll use simple graphics
    console.log(`Game loaded for player: ${this.player.username} (ID: ${this.player.id})`);
  }

  async create(): Promise<void> {
    // Fetch map data from backend
    console.log('Fetching map data from backend...');
    this.mapData = await this.apiService.fetchMapData();
    console.log('Map data loaded:', this.mapData);

    // Display player info
    this.add.text(10, 10, `Player: ${this.player.username}`, {
      fontSize: '16px',
      color: '#ffffff',
      backgroundColor: '#000000',
      padding: { x: 5, y: 5 },
    });

    // Create the isometric map
    this.createIsometricMap();

    // Setup camera controls
    this.setupCameraControls();
  }

  /**
   * Create and render the isometric map
   */
  private createIsometricMap(): void {
    if (!this.mapData) return;

    const graphics = this.add.graphics();
    
    // Center the map in the view
    const offsetX = this.cameras.main.width / 2;
    const offsetY = 100;

    this.mapData.tiles.forEach((tile) => {
      const isoX = (tile.x - tile.y) * (this.tileWidth / 2);
      const isoY = (tile.x + tile.y) * (this.tileHeight / 2);

      // Draw tile diamond shape
      const tileColor = this.getTileColor(tile.tileType);
      graphics.fillStyle(tileColor, 1);
      graphics.lineStyle(1, 0x000000, 1);

      // Draw isometric tile
      const x = offsetX + isoX;
      const y = offsetY + isoY;

      graphics.beginPath();
      graphics.moveTo(x, y);
      graphics.lineTo(x + this.tileWidth / 2, y + this.tileHeight / 2);
      graphics.lineTo(x, y + this.tileHeight);
      graphics.lineTo(x - this.tileWidth / 2, y + this.tileHeight / 2);
      graphics.closePath();
      graphics.fillPath();
      graphics.strokePath();

      // Add building if exists
      if (tile.buildingId) {
        this.drawBuilding(graphics, x, y, tile.buildingId);
      }
    });
  }

  /**
   * Get color based on tile type
   */
  private getTileColor(tileType: string): number {
    const colors: { [key: string]: number } = {
      grass: 0x4a9b4a,
      water: 0x4a7ba7,
      dirt: 0x8b7355,
      road: 0x5a5a5a,
    };
    return colors[tileType] || 0x808080;
  }

  /**
   * Draw a simple building representation
   */
  private drawBuilding(graphics: Phaser.GameObjects.Graphics, x: number, y: number, _buildingId: string): void {
    graphics.fillStyle(0xa0522d, 1);
    graphics.fillRect(x - 15, y - 30, 30, 30);
    graphics.fillStyle(0x8b4513, 1);
    graphics.fillTriangle(
      x - 20, y - 30,
      x, y - 45,
      x + 20, y - 30
    );
  }

  /**
   * Setup camera controls for panning
   */
  private setupCameraControls(): void {
    // Enable camera drag with mouse
    this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      this.cameraDragStartX = pointer.x;
      this.cameraDragStartY = pointer.y;
    });

    this.input.on('pointermove', (pointer: Phaser.Input.Pointer) => {
      if (pointer.isDown) {
        const deltaX = pointer.x - this.cameraDragStartX;
        const deltaY = pointer.y - this.cameraDragStartY;
        
        this.cameras.main.scrollX -= deltaX;
        this.cameras.main.scrollY -= deltaY;
        
        this.cameraDragStartX = pointer.x;
        this.cameraDragStartY = pointer.y;
      }
    });

    // Zoom with mouse wheel
    this.input.on('wheel', (_pointer: Phaser.Input.Pointer, _gameObjects: unknown, _deltaX: number, deltaY: number) => {
      const zoomDelta = deltaY > 0 ? -0.1 : 0.1;
      const newZoom = Phaser.Math.Clamp(this.cameras.main.zoom + zoomDelta, 0.5, 2);
      this.cameras.main.setZoom(newZoom);
    });
  }

  update(): void {
    // Game update loop
  }
}
