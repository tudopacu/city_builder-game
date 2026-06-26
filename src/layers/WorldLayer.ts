import Phaser from 'phaser';
import { MapService } from '../services/MapService';
import { BuildingService } from '../services/BuildingService';
import { ItemService } from '../services/ItemService';
import { RoadService } from '../services/RoadService';
import Layer = Phaser.GameObjects.Layer;
import {TILE_SET_KEY} from "../constants/constants";
import {Item} from "../models/Item";
import {MapRenderer} from "../renders/MapRenderer";
import {BuildingRenderer} from "../renders/BuildingRenderer";
import {PlayerBuilding} from "../models/PlayerBuilding";
import {GameMap} from "../models/GameMap";
import {Player} from "../models/Player";

const TILE_WIDTH = 64;
const TILE_HEIGHT = 64;

export class WorldLayer {
  private layer!: Layer;
  public items: Item[] = [];
  public mapService: MapService | null = null;
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
  }

  public async initialize(): Promise<void> {
    await this.loadMap();
    await this.loadBuildings();
    await this.loadItems();

    const map: GameMap =  this.scene.registry.get("map");
    await this.loadPlayerBuildings(this.player.id, map.id);
    await this.loadRoads();

    this.enrichMap();

    this.mapRenderer?.renderMap();
    this.buildingRenderer?.renderPlayerBuildings();
  }

  public preload(): void {
    //todo load tile set dynamically based on map data from backend
    this.scene.load.spritesheet(TILE_SET_KEY, "assets/grass_and_water.png", {
      frameWidth: TILE_WIDTH,
      frameHeight: TILE_HEIGHT,
    });
    //todo load building images dynamically based on building data from backend
    this.scene.load.image('casa', 'assets/casa.png');
  }

  private async loadMap(): Promise<void> {
    this.scene.registry.set("map",  await MapService.getMap());
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

  private enrichMap() {
    const map: GameMap = this.scene.registry.get("map") || [];
    const playerBuildings: PlayerBuilding[] = this.scene.registry.get("playerBuildings") || [];

    playerBuildings.forEach(playerBuilding => {
      const tileIndex = map.terrains.findIndex(t => t.x === playerBuilding.x && t.y === playerBuilding.y);
      if (tileIndex !== -1) {
        map.terrains[tileIndex] = { ...map.terrains[tileIndex], player_building_id: playerBuilding.id };
      }
    });

    this.scene.registry.set("map", map);
  }
}
