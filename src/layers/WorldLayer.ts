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

    await this.loadBuildings();
    await this.loadItems();

    await this.loadPlayerBuildings(this.player.id, 1);
    await this.loadRoads();

    await this.loadMap();

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
    this.scene.load.image('house', 'assets/casa.png');
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

    console.log ("Enriching map with player buildings:", playerBuildings);

    playerBuildings.forEach(playerBuilding => {
      if (!playerBuilding.id) {
        console.warn(`PlayerBuilding ID is undefined for building at (${playerBuilding.x}, ${playerBuilding.y})`);
        return;
      }

      for (let dx = 0; dx < playerBuilding.building.width; dx++) {
        console.log (`Enriching map with playerBuilding ID ${playerBuilding.id} at (${playerBuilding.x}, ${playerBuilding.y}) with width ${playerBuilding.building.width} and length ${playerBuilding.building.length}`);
        for (let dy = 0; dy < playerBuilding.building.length; dy++) {
          const tileX = playerBuilding.x - dx;
          const tileY = playerBuilding.y - dy;

          if (tileX < 0 || tileY < 0) {
            throw new Error(`Building at position (${playerBuilding.x}, ${playerBuilding.y}) extends into negative coordinates at (${tileX}, ${tileY})`);
          }

          const tileIndex = map.terrains.findIndex(t => t.x === tileX && t.y === tileY);

          console.log ("aci");


          if (tileIndex !== -1) {
            console.log(`Enriching terrain at (${tileX}, ${tileY}) with playerBuilding ID ${playerBuilding.id}`);
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

    console.log("Enriched map with player buildings:", map);

    this.scene.registry.set("map", map);
  }
}
