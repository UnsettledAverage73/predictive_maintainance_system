let accessToken: string | null = null;

/**
 * Returns the current access token stored in memory.
 * Never stores the token in localStorage to prevent XSS theft.
 */
export const getAccessToken = (): string | null => {
  return accessToken;
};

/**
 * Sets the access token in memory.
 */
export const setAccessToken = (token: string): void => {
  accessToken = token;
};

/**
 * Clears the stored access token from memory.
 * Note: the refresh token is stored in an httpOnly cookie and must be cleared
 * via a backend API request (e.g., /auth/logout).
 */
export const clearTokens = (): void => {
  accessToken = null;
};
