/**
 * Cesium Viewer factory — premium rendering pipeline.
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
    msaaSamples: 4,
    useBrowserRecommendedResolution: true,
    contextOptions: {
      webgl: {
        alpha: true,
        antialias: true,
        powerPreference: "high-performance",
        stencil: true,
      },
    },
  });

  // ── Atmosphere ──
  viewer.scene.skyAtmosphere.show = true;
  viewer.scene.skyAtmosphere.brightnessShift = 0.02;
  viewer.scene.skyAtmosphere.saturationShift = 0.1;
  viewer.scene.backgroundColor = Cesium.Color.fromCssColorString("rgba(2,4,12,1)");

  // ── Rendering quality ──
  viewer.scene.fog.enabled = true;
  viewer.scene.fog.density = 0.0002;
  viewer.scene.highDynamicRange = false;
  viewer.scene.postProcessStages.fxaa.enabled = true;
  viewer.resolutionScale = Math.min(window.devicePixelRatio, 2);

  // ── Camera controller ──
  const cam = viewer.scene.screenSpaceCameraController;
  cam.enableCollisionDetection = true;
  cam.enableTilt = true;
  cam.enableLook = true;
  cam.minimumZoomDistance = 15;
  cam.maximumZoomDistance = 35_000_000;
  cam.inertiaSpin = 0.9;
  cam.inertiaTranslate = 0.9;
  cam.inertiaZoom = 0.85;

  // ── Credits ──
  if (minimal) {
    const cc = viewer.cesiumWidget.creditContainer as HTMLElement | null;
    if (cc) cc.style.display = "none";
  }

  return viewer;
}

/** Smooth camera fly-to */
export function flyTo(
  viewer: Cesium.Viewer,
  lat: number,
  lng: number,
  height = 800,
  duration = 3,
) {
  viewer.camera.flyTo({
    destination: Cesium.Cartesian3.fromDegrees(lng, lat, height),
    orientation: {
      heading: Cesium.Math.toRadians(0),
      pitch: Cesium.Math.toRadians(-38),
      roll: 0,
    },
    duration,
    easingFunction: Cesium.EasingFunction.QUINTIC_IN_OUT,
  });
}

/** Orbit overview */
export function orbitView(viewer: Cesium.Viewer, duration = 4) {
  viewer.camera.flyTo({
    destination: Cesium.Cartesian3.fromDegrees(-46.63, -23.55, 15_000_000),
    orientation: {
      heading: 0,
      pitch: Cesium.Math.toRadians(-86),
      roll: 0,
    },
    duration,
    easingFunction: Cesium.EasingFunction.QUINTIC_IN_OUT,
  });
}
