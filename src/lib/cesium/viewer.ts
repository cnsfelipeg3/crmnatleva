/**
 * Cesium Viewer factory — initialises Ion + creates a Viewer instance.
 * Kept separate so the heavy Cesium import is only pulled when needed.
 */
import * as Cesium from "cesium";
import { getCesiumIonToken } from "./config";

export function initIon(): boolean {
  const token = getCesiumIonToken();
  if (!token) return false;
  Cesium.Ion.defaultAccessToken = token;
  return true;
}

export interface ViewerOptions {
  container: HTMLElement;
  /** Hide default Cesium UI chrome for a clean look */
  minimal?: boolean;
}

export function createViewer({ container, minimal = true }: ViewerOptions): Cesium.Viewer {
  const viewer = new Cesium.Viewer(container, {
    timeline: false,
    animation: false,
    homeButton: false,
    geocoder: false,
    sceneModePicker: false,
    baseLayerPicker: false,
    navigationHelpButton: false,
    fullscreenButton: false,
    vrButton: false,
    infoBox: false,
    selectionIndicator: false,
    creditContainer: document.createElement("div"), // hide credits overlay
    globe: false, // we'll use 3D Tiles instead
    skyAtmosphere: new Cesium.SkyAtmosphere(),
    orderIndependentTranslucency: true,
    contextOptions: {
      webgl: { alpha: true },
    },
  });

  // Enable atmosphere
  viewer.scene.skyAtmosphere.show = true;
  viewer.scene.backgroundColor = Cesium.Color.TRANSPARENT;

  // Performance tweaks
  viewer.scene.fog.enabled = true;
  viewer.scene.globe && (viewer.scene.globe.enableLighting = true);
  viewer.scene.highDynamicRange = false;
  viewer.scene.postProcessStages.fxaa.enabled = true;

  return viewer;
}

/** Smooth camera fly-to a lat/lng/height */
export function flyTo(
  viewer: Cesium.Viewer,
  lat: number,
  lng: number,
  height = 800,
  duration = 3
) {
  viewer.camera.flyTo({
    destination: Cesium.Cartesian3.fromDegrees(lng, lat, height),
    orientation: {
      heading: Cesium.Math.toRadians(0),
      pitch: Cesium.Math.toRadians(-45),
      roll: 0,
    },
    duration,
  });
}

/** Orbit overview — planet view */
export function orbitView(viewer: Cesium.Viewer, duration = 4) {
  viewer.camera.flyTo({
    destination: Cesium.Cartesian3.fromDegrees(-46.63, -23.55, 25_000_000),
    orientation: {
      heading: 0,
      pitch: Cesium.Math.toRadians(-90),
      roll: 0,
    },
    duration,
  });
}
