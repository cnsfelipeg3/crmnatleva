const API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;

let loadPromise: Promise<void> | null = null;
let authFailed = false;
const CALLBACK_NAME = "__lovableGoogleMapsInit";

declare global {
  interface Window {
    gm_authFailure?: () => void;
    __lovableGoogleMapsInit?: () => void;
  }
}

function ensureApiKey() {
  if (!API_KEY || API_KEY.trim().length === 0) {
    throw new Error("VITE_GOOGLE_MAPS_API_KEY não configurada");
  }
}

export function hasGoogleMapsAuthFailure() {
  return authFailed;
}

export async function loadGoogleMapsScript(): Promise<void> {
  if (typeof window === "undefined") {
    throw new Error("Google Maps está disponível apenas no navegador");
  }

  if (window.google?.maps) return;
  if (loadPromise) return loadPromise;

  ensureApiKey();

  loadPromise = new Promise<void>((resolve, reject) => {
    const existingScript = document.querySelector<HTMLScriptElement>("script[data-google-maps-loader='true']");

    let timeoutId: number | null = window.setTimeout(() => {
      cleanup();
      reject(new Error("Timeout ao carregar Google Maps"));
    }, 15000);

    const cleanup = () => {
      if (timeoutId) {
        window.clearTimeout(timeoutId);
        timeoutId = null;
      }
      window[CALLBACK_NAME] = undefined;
    };

    window.gm_authFailure = () => {
      authFailed = true;
    };

    window[CALLBACK_NAME] = () => {
      cleanup();
      if (authFailed) {
        reject(new Error("Falha de autenticação da Google Maps API"));
        return;
      }
      resolve();
    };

    if (existingScript) {
      const checkLoaded = () => {
        if (window.google?.maps) {
          cleanup();
          resolve();
          return true;
        }
        return false;
      };

      if (checkLoaded()) return;

      const pollId = window.setInterval(() => {
        if (checkLoaded()) window.clearInterval(pollId);
      }, 120);

      existingScript.addEventListener("error", () => {
        window.clearInterval(pollId);
        cleanup();
        reject(new Error("Erro ao carregar script do Google Maps"));
      });
      return;
    }

    const script = document.createElement("script");
    script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(API_KEY)}&libraries=places,marker&language=pt-BR&v=weekly&callback=${CALLBACK_NAME}`;
    script.async = true;
    script.defer = true;
    script.setAttribute("data-google-maps-loader", "true");

    script.onerror = () => {
      cleanup();
      reject(new Error("Erro ao carregar script do Google Maps"));
    };

    document.head.appendChild(script);
  });

  return loadPromise;
}

export async function loadGoogleMapsCore() {
  await loadGoogleMapsScript();
  if (!window.google?.maps?.Map) {
    throw new Error("Google Maps Core indisponível");
  }
  return { Map: window.google.maps.Map };
}

export async function loadGoogleMapsMarker() {
  await loadGoogleMapsScript();
  const markerLib = (window.google.maps as any).marker;
  if (!markerLib) throw new Error("Google Maps Marker library indisponível");
  return markerLib as google.maps.MarkerLibrary;
}

export async function loadGoogleMapsPlaces() {
  await loadGoogleMapsScript();
  if (!window.google?.maps?.places) {
    throw new Error("Google Places library indisponível");
  }
  return window.google.maps.places as google.maps.PlacesLibrary;
}
