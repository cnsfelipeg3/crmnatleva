/**
 * Google Photorealistic 3D Tiles loader for CesiumJS.
 * Requires both Cesium Ion token and Google Maps API key.
 */
import * as Cesium from "cesium";
import { getGoogleMapsApiKey } from "./config";

/**
 * Adds Google Photorealistic 3D Tiles to the viewer scene.
 * Returns the tileset or null if the API key is missing.
 */
export async function addGooglePhotorealistic3DTiles(
  viewer: Cesium.Viewer
): Promise<Cesium.Cesium3DTileset | null> {
  const apiKey = getGoogleMapsApiKey();
  if (!apiKey) {
    console.warn("[TravelGlobe] Google Maps API key not configured — skipping 3D Tiles");
    return null;
  }

  try {
    // Use Cesium's built-in helper with Google API key
    const tileset = await Cesium.createGooglePhotorealistic3DTileset({ key: apiKey });
    viewer.scene.primitives.add(tileset);
    return tileset;
  } catch (err) {
    console.error("[TravelGlobe] Failed to load Google 3D Tiles:", err);
    return null;
  }
}
