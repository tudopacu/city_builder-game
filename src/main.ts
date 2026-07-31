import Phaser from 'phaser';
import { GameScene } from './scenes/GameScene';
import { GameConfig } from './types';
import {Player} from "./models/Player";

/**
 * Initialize and start the city builder game
 * @param config Game configuration including player info and auth cookie
 */
export function startGame(config: GameConfig): Phaser.Game {

  const gameScene = new GameScene(config.player);

  const phaserConfig: Phaser.Types.Core.GameConfig = {
    type: Phaser.AUTO,
    width: 3840,
    height: 2160,
    parent: 'game-container',
    backgroundColor: '#2d2d2d',
    scene: gameScene,
    physics: {
      default: 'arcade',
      arcade: {
        gravity: {x: 0, y: 0},
        debug: false,
      },
    },
    scale: {
      mode: Phaser.Scale.RESIZE,
      autoCenter: Phaser.Scale.CENTER_BOTH,
    },
  };

  return new Phaser.Game(phaserConfig);
}

export { GameConfig } from './types';
export { ApiService } from './services/ApiService';

declare global {
  interface Window {
    startCityBuilderGame: typeof startGame;
  }
}

(async () => {
  const token = new URLSearchParams(window.location.search).get('token');
  let player: Player;

  try {
    player = await Player.getPlayer();
  } catch (error) {
    console.warn('Failed to fetch player from backend, using demo player:', error);
    //todo: remove fallback
    // Fallback to demo player for development
    player = new Player(123, 'DemoPlayer');
  }

  window.startCityBuilderGame = startGame;

  const config: GameConfig = {
    player: player,
    authCookie: token as string,
  };

  startGame(config);
})();
