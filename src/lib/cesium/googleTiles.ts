/**
 * Google Photorealistic 3D Tiles loader for CesiumJS.
 * Tries Map Tiles API root dataset first, then Cesium helper, then Ion fallback.
 */
import * as Cesium from "cesium";
import { getGoogleMapsApiKey } from "./config";

const GOOGLE_PHOTOREALISTIC_ION_ASSET_ID = 2275207;

type GoogleTilesSource = "google-root-url" | "cesium-helper" | "ion-asset";

interface GoogleTilesLoadResult {
  tileset: Cesium.Cesium3DTileset | null;
  source: GoogleTilesSource | null;
  errorMessage?: string;
}

type Cesium3DTilesetConstructor = typeof Cesium.Cesium3DTileset & {
  fromUrl?: (
    url: string,
    options?: Cesium.Cesium3DTileset.ConstructorOptions
  ) => Promise<Cesium.Cesium3DTileset>;
  fromIonAssetId?: (
    assetId: number,
    options?: Cesium.Cesium3DTileset.ConstructorOptions
  ) => Promise<Cesium.Cesium3DTileset>;
};

type CesiumGoogleHelper = typeof Cesium & {
  createGooglePhotorealistic3DTileset?: (
    options?: Record<string, unknown>
  ) => Promise<Cesium.Cesium3DTileset>;
};

function tuneTilesetStreaming(tileset: Cesium.Cesium3DTileset) {
  tileset.maximumScreenSpaceError = 16;
  (tileset as unknown as { dynamicScreenSpaceError?: boolean }).dynamicScreenSpaceError = true;
  (tileset as unknown as { skipLevelOfDetail?: boolean }).skipLevelOfDetail = true;
  (tileset as unknown as { preferLeaves?: boolean }).preferLeaves = true;
}

function attachTileset(viewer: Cesium.Viewer, tileset: Cesium.Cesium3DTileset): Cesium.Cesium3DTileset {
  tuneTilesetStreaming(tileset);
  viewer.scene.primitives.add(tileset);
  if (viewer.scene.globe) {
    viewer.scene.globe.show = false;
  }
  viewer.scene.requestRenderMode = false;
  return tileset;
}

function buildGoogleRootUrl(apiKey: string): string {
  return `https://tile.googleapis.com/v1/3dtiles/root.json?key=${encodeURIComponent(apiKey)}`;
}

async function loadFromGoogleRootUrl(apiKey: string): Promise<Cesium.Cesium3DTileset> {
  const ctor = Cesium.Cesium3DTileset as Cesium3DTilesetConstructor;
  if (typeof ctor.fromUrl !== "function") {
    throw new Error("Cesium3DTileset.fromUrl não está disponível nesta versão do Cesium.");
  }

  return ctor.fromUrl(buildGoogleRootUrl(apiKey), {
    maximumScreenSpaceError: 18,
  });
}

async function loadFromCesiumGoogleHelper(apiKey: string): Promise<Cesium.Cesium3DTileset> {
  const helperApi = Cesium as CesiumGoogleHelper;
  if (typeof helperApi.createGooglePhotorealistic3DTileset !== "function") {
    throw new Error("createGooglePhotorealistic3DTileset não está disponível nesta versão do Cesium.");
  }

  try {
    return await helperApi.createGooglePhotorealistic3DTileset({ key: apiKey });
  } catch {
    return helperApi.createGooglePhotorealistic3DTileset();
  }
}

async function loadFromIonAsset(): Promise<Cesium.Cesium3DTileset> {
  const ctor = Cesium.Cesium3DTileset as Cesium3DTilesetConstructor;
  if (typeof ctor.fromIonAssetId !== "function") {
    throw new Error("Cesium3DTileset.fromIonAssetId não está disponível nesta versão do Cesium.");
  }

  return ctor.fromIonAssetId(GOOGLE_PHOTOREALISTIC_ION_ASSET_ID, {
    maximumScreenSpaceError: 18,
  });
}

function normalizeError(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (typeof error === "string") return error;
  return "Falha desconhecida ao carregar o Google Photorealistic 3D Tiles.";
}

/**
 * Adds Google Photorealistic 3D Tiles to the viewer scene.
 * Returns load metadata to make fallback behavior explicit in the UI.
 */
export async function addGooglePhotorealistic3DTiles(
  viewer: Cesium.Viewer
): Promise<GoogleTilesLoadResult> {
  const apiKey = getGoogleMapsApiKey();
  if (!apiKey) {
    return {
      tileset: null,
      source: null,
      errorMessage: "Google Maps API key não configurada.",
    };
  }

  const attempts: Array<{
    source: GoogleTilesSource;
    load: () => Promise<Cesium.Cesium3DTileset>;
  }> = [
    { source: "google-root-url", load: () => loadFromGoogleRootUrl(apiKey) },
    { source: "cesium-helper", load: () => loadFromCesiumGoogleHelper(apiKey) },
    { source: "ion-asset", load: loadFromIonAsset },
  ];

  const failures: string[] = [];

  for (const attempt of attempts) {
    try {
      const tileset = await attempt.load();
      return {
        tileset: attachTileset(viewer, tileset),
        source: attempt.source,
      };
    } catch (error) {
      const reason = normalizeError(error);
      failures.push(`${attempt.source}: ${reason}`);
      console.warn(`[TravelGlobe] Falha no carregamento ${attempt.source}`, error);
    }
  }

  return {
    tileset: null,
    source: null,
    errorMessage: failures.join(" | "),
  };
}

export type { GoogleTilesLoadResult, GoogleTilesSource };
