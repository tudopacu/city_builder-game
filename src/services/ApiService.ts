import { IsometricMapData } from '../types';

/**
 * API Service for backend communication
 */
export class ApiService {
  private authCookie: string;
  private backendUrl: string;

  constructor(authCookie: string, backendUrl: string = '/api') {
    this.authCookie = authCookie;
    this.backendUrl = backendUrl;
    this.setCookie();
  }

  /**
   * Set the authentication cookie
   */
  private setCookie(): void {
    // Set the cookie with proper attributes
    document.cookie = `auth=${this.authCookie}; path=/; SameSite=Strict`;
  }

  /**
   * Fetch isometric map data from the backend
   */
  async fetchMapData(): Promise<IsometricMapData> {
    try {
      const response = await fetch(`${this.backendUrl}/map`, {
        method: 'GET',
        credentials: 'include', // Include cookies in the request
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch map data: ${response.statusText}`);
      }

      const data = await response.json();
      return data as IsometricMapData;
    } catch (error) {
      console.error('Error fetching map data:', error);
      // Return a default map if the backend is not available
      return this.getDefaultMapData();
    }
  }

  /**
   * Get default map data for testing/fallback
   */
  private getDefaultMapData(): IsometricMapData {
    const tiles = [];
    const width = 10;
    const height = 10;

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        tiles.push({
          x,
          y,
          tileType: 'grass',
        });
      }
    }

    return {
      width,
      height,
      tiles,
    };
  }
}
