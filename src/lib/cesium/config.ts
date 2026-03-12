/**
 * Cesium + Google 3D Tiles Configuration
 * 
 * All tokens are read from VITE_ environment variables.
 * If absent, the globe renders a graceful fallback.
 */

export function getCesiumIonToken(): string | null {
  const token = import.meta.env.VITE_CESIUM_ION_TOKEN;
  return typeof token === "string" && token.trim().length > 0 ? token.trim() : null;
}

export function getGoogleMapsApiKey(): string | null {
  const key = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
  return typeof key === "string" && key.trim().length > 0 ? key.trim() : null;
}

export interface CesiumConfigStatus {
  cesiumReady: boolean;
  googleReady: boolean;
  allReady: boolean;
  missingKeys: string[];
}

export function checkCesiumConfig(): CesiumConfigStatus {
  const cesiumReady = getCesiumIonToken() !== null;
  const googleReady = getGoogleMapsApiKey() !== null;
  const missingKeys: string[] = [];
  if (!cesiumReady) missingKeys.push("VITE_CESIUM_ION_TOKEN");
  if (!googleReady) missingKeys.push("VITE_GOOGLE_MAPS_API_KEY");
  return {
    cesiumReady,
    googleReady,
    allReady: cesiumReady && googleReady,
    missingKeys,
  };
}
