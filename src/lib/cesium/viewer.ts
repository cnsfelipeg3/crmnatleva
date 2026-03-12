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
    scene3DOnly: true,
    globe: false,
    skyAtmosphere: new Cesium.SkyAtmosphere(),
    orderIndependentTranslucency: true,
    requestRenderMode: false,
    contextOptions: {
      webgl: {
        alpha: true,
        antialias: true,
        powerPreference: "high-performance",
      },
    },
  });

  // Enable atmosphere and transparent background for smooth compositing
  viewer.scene.skyAtmosphere.show = true;
  viewer.scene.backgroundColor = Cesium.Color.TRANSPARENT;

  // Performance and camera tuning for Google-Earth-like navigation
  viewer.scene.fog.enabled = true;
  viewer.scene.highDynamicRange = false;
  viewer.scene.postProcessStages.fxaa.enabled = true;

  const cameraController = viewer.scene.screenSpaceCameraController;
  cameraController.enableCollisionDetection = true;
  cameraController.enableTilt = true;
  cameraController.enableLook = true;
  cameraController.minimumZoomDistance = 15;
  cameraController.maximumZoomDistance = 35_000_000;
  cameraController.inertiaSpin = 0.9;
  cameraController.inertiaTranslate = 0.9;
  cameraController.inertiaZoom = 0.82;

  if (minimal) {
    const creditContainer = viewer.cesiumWidget.creditContainer as HTMLElement | null;
    if (creditContainer) {
      creditContainer.style.display = "none";
    }
  }

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
      pitch: Cesium.Math.toRadians(-38),
      roll: 0,
    },
    duration,
  });
}

/** Orbit overview — planet view */
export function orbitView(viewer: Cesium.Viewer, duration = 4) {
  viewer.camera.flyTo({
    destination: Cesium.Cartesian3.fromDegrees(-46.63, -23.55, 15_000_000),
    orientation: {
      heading: 0,
      pitch: Cesium.Math.toRadians(-86),
      roll: 0,
    },
    duration,
  });
}
