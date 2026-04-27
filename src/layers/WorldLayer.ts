import Phaser from 'phaser';
import { MapService } from '../services/MapService';
import { BuildingService } from '../services/BuildingService';
import { ItemService } from '../services/ItemService';
import { RoadService } from '../services/RoadService';
import Layer = Phaser.GameObjects.Layer;
import {TILE_SET_KEY} from "../constants/constants";
import {Item} from "../models/Item";
import {RenderService} from "../services/RenderService";

const TILE_WIDTH = 64;
const TILE_HEIGHT = 64;

export class WorldLayer {
  private layer!: Layer;
  public items: Item[] = [];
  public mapService: MapService | null = null;
  public renderService: RenderService | null = null;

  constructor(
      private scene: Phaser.Scene
  ) {}

  public getLayer(): Layer {
    return this.layer;
  }

  public create(): void {
    this.layer = this.scene.add.layer();
    this.mapService = new MapService(this.scene, this.layer)
    this.renderService = new RenderService(this.scene, this.layer)
    this.mapService.drawMap()
  }

  public async initialize(): Promise<void> {
    await this.loadBuildings();
    await this.loadItems();
    await this.loadPlayerBuildings();
    await this.loadRoads();

    this.renderService?.renderPlayerBuildings();
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

  private async loadBuildings(): Promise<void> {
      this.scene.registry.set("buildings",  await BuildingService.getBuildings());
  }

  private async loadItems(): Promise<void> {
    this.scene.registry.set("items",  await ItemService.getItems());
  }

  private async loadPlayerBuildings(): Promise<void> {
    this.scene.registry.set("playerBuildings",  await BuildingService.getPlayerBuildings());
  }

  private async loadRoads(): Promise<void> {
    this.scene.registry.set("roads", await RoadService.getRoads(2, 1));
  }
}
