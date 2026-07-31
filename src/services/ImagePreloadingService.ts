import Phaser from 'phaser';
import {CONFIG} from "../configuration";

const TILE_WIDTH = 64;
const TILE_HEIGHT = 64;

export class ImagePreloadingService {
  private scene: Phaser.Scene;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
  }

  public load(): void {
    console.log('Loading assets...');
    const buildings = this.scene.registry.get('buildings') || [];
    const items = this.scene.registry.get('items') || [];
    const roads = this.scene.registry.get('roads') || [];

    const assets = [
      ...this.parseAssets(buildings, 'building'),
      ...this.parseAssets(items, 'item'),
      ...this.parseAssets(roads, 'road'),
    ];

    assets.forEach(asset => {
      this.scene.load.image(`${asset.type}_${asset.id}`, CONFIG.cdnUrl + asset.image_url);
    });

    this.scene.load.start();
  }

  public loadMap(): void {
    const map = this.scene.registry.get('map') || [];

    this.scene.load.spritesheet(`map_${map.id}`, CONFIG.cdnUrl + map.image_url, {
      frameWidth: TILE_WIDTH,
      frameHeight: TILE_HEIGHT,
    });
  }

  private parseAssets(data: any[], type: string): { type: string; id: number; image_url: string }[] {
    return data
      .filter(item => item.id && item.image_url)
      .map(item => ({
        type,
        id: item.id,
        image_url: item.image_url,
      }));
  }
}