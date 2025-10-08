# city_builder-game

An isometric city builder game built with Phaser 3 and TypeScript.

## Features

- **Isometric Map Rendering**: Displays a grid-based isometric map with tile-based graphics
- **Backend Integration**: Fetches map data from a backend API with cookie-based authentication
- **Player Authentication**: Receives player information (ID, username) and authentication cookie at startup
- **Interactive Camera**: Pan and zoom controls for navigating the map
- **TypeScript**: Fully typed codebase for better developer experience
- **Modular Architecture**: Clean separation of concerns with services, scenes, and types

## Project Structure

```
city_builder-game/
├── src/
│   ├── scenes/           # Phaser game scenes
│   │   └── GameScene.ts  # Main game scene with isometric map
│   ├── services/         # Service layer
│   │   └── ApiService.ts # Backend API communication
│   ├── types/            # TypeScript type definitions
│   │   └── index.ts      # Shared interfaces
│   ├── index.html        # HTML template
│   └── main.ts           # Game entry point
├── dist/                 # Build output (generated)
├── package.json          # Project dependencies
├── tsconfig.json         # TypeScript configuration
├── webpack.config.js     # Webpack build configuration
└── .eslintrc.json        # ESLint configuration
```

## Setup

1. Install dependencies:
```bash
npm install
```

2. Build the project:
```bash
npm run build
```

3. For development with hot reload:
```bash
npm run dev
```

## Usage

### Basic Usage

The game can be started by calling the `startCityBuilderGame` function with the required configuration:

```typescript
import { startGame } from './src/main';

// Start the game with player info and auth cookie
startGame({
  player: {
    id: 'user-123',
    username: 'PlayerName'
  },
  authCookie: 'your-auth-cookie-token',
  backendUrl: 'https://your-backend.com/api' // optional, defaults to '/api'
});
```

### Integration Example

When embedding in a web application:

```html
<!DOCTYPE html>
<html>
<head>
    <title>City Builder</title>
</head>
<body>
    <div id="game-container"></div>
    <script src="bundle.js"></script>
    <script>
        // Call from your application
        window.startCityBuilderGame({
            player: {
                id: getCurrentUserId(),
                username: getCurrentUsername()
            },
            authCookie: getAuthToken(),
            backendUrl: '/api'
        });
    </script>
</body>
</html>
```

## Backend API

The game expects the backend to provide the following endpoint:

### GET /api/map

Returns isometric map data with the following structure:

```typescript
{
  width: number,      // Map width in tiles
  height: number,     // Map height in tiles
  tiles: [
    {
      x: number,           // Tile X coordinate
      y: number,           // Tile Y coordinate
      tileType: string,    // Type: 'grass', 'water', 'dirt', 'road'
      buildingId?: string  // Optional building ID if tile has a building
    }
  ]
}
```

**Authentication**: The request includes the authentication cookie set during game initialization.

**Fallback**: If the backend is unavailable, the game will use a default 10x10 grass map for testing.

## Game Controls

- **Mouse Drag**: Pan the camera around the map
- **Mouse Wheel**: Zoom in/out
- **Click**: Interact with tiles (future feature)

## Development

### Available Scripts

- `npm run build` - Build for production
- `npm run dev` - Start development server with hot reload
- `npm run watch` - Build in watch mode
- `npm run lint` - Run ESLint
- `npm run type-check` - Run TypeScript type checking

### Development Mode

In development mode, the game auto-starts with demo player configuration for testing:

```typescript
{
  player: { id: 'demo-player-123', username: 'DemoPlayer' },
  authCookie: 'demo-auth-cookie-token',
  backendUrl: '/api'
}
```

## Technical Details

### Cookie Management

The `ApiService` automatically sets the authentication cookie when initialized:

```typescript
document.cookie = `auth=${authCookie}; path=/; SameSite=Strict`;
```

All subsequent API requests include this cookie via `credentials: 'include'`.

### Isometric Rendering

The game uses diamond-shaped isometric tiles with the following dimensions:
- Tile Width: 64 pixels
- Tile Height: 32 pixels

Tiles are rendered using coordinate transformation:
```typescript
isoX = (x - y) * (tileWidth / 2)
isoY = (x + y) * (tileHeight / 2)
```

## License

MIT