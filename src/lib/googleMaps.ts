import { Loader } from "@googlemaps/js-api-loader";

const API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;

let loaderInstance: Loader | null = null;
let loadPromise: Promise<typeof google> | null = null;

export function loadGoogleMaps(): Promise<typeof google> {
  if (loadPromise) return loadPromise;

  loaderInstance = new Loader({
    apiKey: API_KEY,
    version: "weekly",
    libraries: ["marker"],
  });

  loadPromise = loaderInstance.load();
  return loadPromise;
}
