import Phaser from 'phaser';
import { GameScene } from './scenes/GameScene';
import { GameConfig } from './types';
import {Player} from "./models/Player";
import {MapService} from "./services/MapService";

/**
 * Initialize and start the city builder game
 * @param config Game configuration including player info and auth cookie
 */
export function startGame(config: GameConfig): Phaser.Game {
  const { player, backendUrl = 'http://localhost:5000/game' } = config;

  console.log('Starting City Builder Game...');
  console.log(`Player: ${player.username} (ID: ${player.id})`);
  console.log(`Backend URL: ${backendUrl}`);

  // Initialize API service with authentication cookie
  const mapService = new MapService();

  // Create game scene
  const gameScene = new GameScene(player, mapService);

  // Phaser game configuration
  const phaserConfig: Phaser.Types.Core.GameConfig = {
    type: Phaser.AUTO,
    width: 1024,
    height: 768,
    parent: 'game-container',
    backgroundColor: '#2d2d2d',
    scene: gameScene,
    physics: {
      default: 'arcade',
      arcade: {
        gravity: { x: 0, y: 0 },
        debug: false,
      },
    },
    scale: {
      mode: Phaser.Scale.RESIZE,
      autoCenter: Phaser.Scale.CENTER_BOTH,
    },
  };

  // Create and return the game instance
  return new Phaser.Game(phaserConfig);
}

// Export for use in other modules
export { GameConfig } from './types';
export { ApiService } from './services/ApiService';

// Example usage - this can be called from external code
// For demonstration purposes, we'll expose it on window
declare global {
  interface Window {
    startCityBuilderGame: typeof startGame;
  }
}

(async () => {
  const token = new URLSearchParams(window.location.search).get('token');
  const player: Player = await Player.getPlayer();

  window.startCityBuilderGame = startGame;

  if (process.env.NODE_ENV !== 'production') {
    const demoConfig: GameConfig = {
      player: player,
      authCookie: token as string,
      backendUrl: 'http://localhost:5000/game',
    };

    startGame(demoConfig);
  }
})();
