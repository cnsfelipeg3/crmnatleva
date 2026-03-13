import { Loader } from "@googlemaps/js-api-loader";

const API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;

let loader: Loader | null = null;

function getLoader(): Loader {
  if (!loader) {
    loader = new Loader({
      apiKey: API_KEY,
      version: "weekly",
    });
  }
  return loader;
}

export async function loadGoogleMapsCore() {
  const l = getLoader();
  const { Map } = await l.importLibrary("maps") as google.maps.MapsLibrary;
  return { Map };
}

export async function loadGoogleMapsMarker() {
  const l = getLoader();
  const lib = await l.importLibrary("marker") as google.maps.MarkerLibrary;
  return lib;
}
