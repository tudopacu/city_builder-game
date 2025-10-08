import Phaser from 'phaser';
import { GameScene } from './scenes/GameScene';
import { GameConfig } from './types';
import { ApiService } from './services/ApiService';

/**
 * Initialize and start the city builder game
 * @param config Game configuration including player info and auth cookie
 */
export function startGame(config: GameConfig): Phaser.Game {
  const { player, authCookie, backendUrl = '/api' } = config;

  console.log('Starting City Builder Game...');
  console.log(`Player: ${player.username} (ID: ${player.id})`);
  console.log(`Backend URL: ${backendUrl}`);

  // Initialize API service with authentication cookie
  const apiService = new ApiService(authCookie, backendUrl);

  // Create game scene
  const gameScene = new GameScene(player, apiService);

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
      mode: Phaser.Scale.FIT,
      autoCenter: Phaser.Scale.CENTER_BOTH,
    },
  };

  // Create and return the game instance
  const game = new Phaser.Game(phaserConfig);

  return game;
}

// Export for use in other modules
export { GameConfig, Player } from './types';
export { ApiService } from './services/ApiService';

// Example usage - this can be called from external code
// For demonstration purposes, we'll expose it on window
declare global {
  interface Window {
    startCityBuilderGame: typeof startGame;
  }
}

window.startCityBuilderGame = startGame;

// Auto-start with example configuration if in development
if (process.env.NODE_ENV !== 'production') {
  // Example: automatically start with demo player
  // In production, this should be called from parent application
  const demoConfig: GameConfig = {
    player: {
      id: 'demo-player-123',
      username: 'DemoPlayer',
    },
    authCookie: 'demo-auth-cookie-token',
    backendUrl: '/api', // This will use default map data since backend is not available
  };

  console.log('Development mode: Auto-starting with demo configuration');
  startGame(demoConfig);
}
