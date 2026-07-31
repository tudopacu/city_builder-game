import Phaser from 'phaser';
import { MapService } from '../services/MapService';
import { ImagePreloadingService } from '../services/ImagePreloadingService';
import { BuildingService } from '../services/BuildingService';
import { ItemService } from '../services/ItemService';
import { RoadService } from '../services/RoadService';
import Layer = Phaser.GameObjects.Layer;
import {Item} from "../models/Item";
import {MapRenderer} from "../renders/MapRenderer";
import {BuildingRenderer} from "../renders/BuildingRenderer";
import {PlayerBuilding} from "../models/PlayerBuilding";
import {GameMap} from "../models/GameMap";
import {Player} from "../models/Player";

export class WorldLayer {
  private layer!: Layer;
  public items: Item[] = [];
  public mapService: MapService | null = null;
  public imagePreloadingService: ImagePreloadingService | null = null;
  public mapRenderer: MapRenderer | null = null;
  public buildingRenderer: BuildingRenderer | null = null;

  constructor(
      private scene: Phaser.Scene,
      private player: Player,
  ) {}

  public getLayer(): Layer {
    return this.layer;
  }

  public create(): void {
    this.layer = this.scene.add.layer();
    this.mapService = new MapService(this.scene)
    this.mapRenderer = new MapRenderer(this.scene, this.layer)
    this.buildingRenderer = new BuildingRenderer(this.scene, this.layer)
    this.imagePreloadingService = new ImagePreloadingService(this.scene);
  }

  public async initialize(): Promise<void> {

    //todo: add loading screen
    //load game data
    await this.loadBuildings();
    await this.loadItems();
    await this.loadMap();

    //load player data
    await this.loadRoads();
    await this.loadPlayerBuildings(this.player.id, 1);

    //loading assets
    this.imagePreloadingService?.loadMap();
    this.imagePreloadingService?.load();

    //render game
    this.scene.load.once('complete', () => {
      this.mapRenderer?.renderMap();
      this.buildingRenderer?.renderPlayerBuildings();
    });
  }

  private async loadMap(): Promise<void> {
    let map: GameMap | undefined = await MapService.getMap();

    if (!map) {
      throw new Error("Map data is undefined");
    }

    this.enrichMap(map);
  }

  private async loadBuildings(): Promise<void> {
      this.scene.registry.set("buildings",  await BuildingService.getBuildings());
  }

  private async loadItems(): Promise<void> {
    this.scene.registry.set("items",  await ItemService.getItems());
  }

  private async loadPlayerBuildings(playerId: number, mapId: number): Promise<void> {
    this.scene.registry.set("playerBuildings",  await BuildingService.getPlayerBuildings(playerId, mapId));
  }

  private async loadRoads(): Promise<void> {
    this.scene.registry.set("roads", await RoadService.getRoads(2, 1));
  }

  private enrichMap(map: GameMap) {
    const playerBuildings: PlayerBuilding[] = this.scene.registry.get("playerBuildings") || [];

    playerBuildings.forEach(playerBuilding => {
      if (!playerBuilding.id) {
        console.warn(`PlayerBuilding ID is undefined for building at (${playerBuilding.x}, ${playerBuilding.y})`);
        return;
      }

      for (let dx = 0; dx < playerBuilding.building.width; dx++) {
         for (let dy = 0; dy < playerBuilding.building.length; dy++) {
          const tileX = playerBuilding.x - dx;
          const tileY = playerBuilding.y - dy;

          if (tileX < 0 || tileY < 0) {
            throw new Error(`Building at position (${playerBuilding.x}, ${playerBuilding.y}) extends into negative coordinates at (${tileX}, ${tileY})`);
          }

          const tileIndex = map.terrains.findIndex(t => t.x === tileX && t.y === tileY);

          if (tileIndex !== -1) {
            map.terrains[tileIndex] = {
              ...map.terrains[tileIndex],
              player_building_id: playerBuilding.id
            };
          } else {
            console.warn(`No terrain found at (${tileX}, ${tileY}) to enrich with playerBuilding ID ${playerBuilding.id}`);
          }
        }
      }
    });

    this.scene.registry.set("map", map);
  }

  public preload(): void {}
}
