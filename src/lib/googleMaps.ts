import { importLibrary, setOptions } from "@googlemaps/js-api-loader";

const API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;

let initialized = false;

function ensureInit() {
  if (!API_KEY || API_KEY.trim().length === 0) {
    throw new Error("VITE_GOOGLE_MAPS_API_KEY não configurada");
  }

  if (!initialized) {
    setOptions({ key: API_KEY });
    initialized = true;
  }
}

export async function loadGoogleMapsCore() {
  ensureInit();
  const { Map } = (await importLibrary("maps")) as google.maps.MapsLibrary;
  return { Map };
}

export async function loadGoogleMapsMarker() {
  ensureInit();
  const lib = (await importLibrary("marker")) as google.maps.MarkerLibrary;
  return lib;
}

export async function loadGoogleMapsPlaces() {
  ensureInit();
  const lib = (await importLibrary("places")) as google.maps.PlacesLibrary;
  return lib;
}
