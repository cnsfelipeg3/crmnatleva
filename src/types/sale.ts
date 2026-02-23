export interface Airport {
  city: string;
  iata: string;
}

export interface SaleAlert {
  type: "danger" | "warning" | "info";
  message: string;
}

export interface Sale {
  id: string;
  name: string;
  seller: { id: string; name: string };
  closeDate: string;
  status: string;
  origin: Airport;
  destination: Airport;
  departureDate: string;
  returnDate: string;
  pax: { adults: number; children: number; childrenAges: number[] };
  airline: string;
  hotel: string;
  receivedValue: number;
  totalCost: number;
  profit: number;
  margin: number;
  paymentMethod: string;
  products: string[];
  locator: string;
  milesProgram: string | null;
  alerts: SaleAlert[];
  score: number;
}
