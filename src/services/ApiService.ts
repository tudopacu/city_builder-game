/**
 * API Service for backend communication
 */
export class ApiService {
  private authCookie: string;

  constructor(authCookie: string) {
    this.authCookie = authCookie;
    this.setCookie();
  }

  /**
   * Set the authentication cookie
   */
  private setCookie(): void {
    // Set the cookie with proper attributes
    document.cookie = `auth=${this.authCookie}; path=/; SameSite=Strict`;
  }
}
