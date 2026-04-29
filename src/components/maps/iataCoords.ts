/**
 * Mapa simples IATA → coordenadas para uso no TravelMap2D.
 * Lista curada dos destinos mais comuns. Outros caem em null e
 * o mapa apenas não renderiza o pin.
 */
export const IATA_COORDS: Record<string, { lat: number; lng: number }> = {
  // Brasil
  GRU: { lat: -23.43, lng: -46.47 },
  CGH: { lat: -23.62, lng: -46.65 },
  GIG: { lat: -22.81, lng: -43.25 },
  SDU: { lat: -22.91, lng: -43.16 },
  BSB: { lat: -15.87, lng: -47.92 },
  CNF: { lat: -19.63, lng: -43.97 },
  SSA: { lat: -12.91, lng: -38.33 },
  REC: { lat: -8.13, lng: -34.92 },
  FOR: { lat: -3.78, lng: -38.53 },
  POA: { lat: -29.99, lng: -51.17 },
  CWB: { lat: -25.53, lng: -49.17 },
  FLN: { lat: -27.67, lng: -48.55 },
  MCZ: { lat: -9.51, lng: -35.79 },
  NAT: { lat: -5.91, lng: -35.25 },
  IGU: { lat: -25.6, lng: -54.49 },
  MAO: { lat: -3.04, lng: -60.05 },
  BEL: { lat: -1.38, lng: -48.48 },
  // EUA
  MIA: { lat: 25.79, lng: -80.29 },
  MCO: { lat: 28.43, lng: -81.31 },
  JFK: { lat: 40.64, lng: -73.78 },
  LAX: { lat: 33.94, lng: -118.41 },
  LAS: { lat: 36.08, lng: -115.15 },
  // Europa
  LIS: { lat: 38.77, lng: -9.13 },
  OPO: { lat: 41.24, lng: -8.68 },
  MAD: { lat: 40.49, lng: -3.57 },
  BCN: { lat: 41.3, lng: 2.08 },
  CDG: { lat: 49.01, lng: 2.55 },
  LHR: { lat: 51.47, lng: -0.45 },
  FCO: { lat: 41.8, lng: 12.25 },
  AMS: { lat: 52.31, lng: 4.76 },
  // América do Sul
  EZE: { lat: -34.82, lng: -58.54 },
  SCL: { lat: -33.39, lng: -70.79 },
  LIM: { lat: -12.02, lng: -77.11 },
  BOG: { lat: 4.7, lng: -74.14 },
  // Caribe / México
  CUN: { lat: 21.04, lng: -86.87 },
  MEX: { lat: 19.44, lng: -99.07 },
  PUJ: { lat: 18.57, lng: -68.36 },
  // Ásia / Oceania
  DXB: { lat: 25.25, lng: 55.36 },
  NRT: { lat: 35.77, lng: 140.39 },
  SYD: { lat: -33.95, lng: 151.18 },
};

export function getIataCoords(iata?: string | null): { lat: number; lng: number } | null {
  if (!iata) return null;
  return IATA_COORDS[iata.toUpperCase()] ?? null;
}
