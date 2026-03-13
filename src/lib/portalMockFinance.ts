import { getMockTripDetail } from "./portalMockTrips";

const today = new Date();
const future = (days: number) => {
  const d = new Date(today); d.setDate(d.getDate() + days);
  return d.toISOString().split("T")[0];
};
const past = (days: number) => {
  const d = new Date(today); d.setDate(d.getDate() - days);
  return d.toISOString().split("T")[0];
};

const CATEGORY_COLORS: Record<string, string> = {
  alimentacao: "hsl(var(--chart-1))",
  transporte: "hsl(var(--chart-2))",
  compras: "hsl(var(--chart-3))",
  passeios: "hsl(var(--chart-4))",
  hospedagem: "hsl(var(--chart-5))",
  emergencias: "hsl(var(--destructive))",
  outros: "hsl(var(--muted-foreground))",
};

interface MockFinanceData {
  sale: any;
  receivables: any[];
  budget: any;
  categories: any[];
  expenses: any[];
  cashItems: any[];
  cards: any[];
}

const mockBudgetsByTrip: Record<string, Omit<MockFinanceData, "sale" | "receivables">> = {
  "mock-orlando": {
    budget: { id: "mock-budget-orlando", sale_id: "mock-orlando", client_id: "mock-client", total_budget: 8000, currency: "USD" },
    categories: [
      { id: "cat-1", budget_id: "mock-budget-orlando", name: "Alimentação", icon: "alimentacao", color: CATEGORY_COLORS.alimentacao, planned_amount: 3000, sort_order: 0 },
      { id: "cat-2", budget_id: "mock-budget-orlando", name: "Transporte", icon: "transporte", color: CATEGORY_COLORS.transporte, planned_amount: 800, sort_order: 1 },
      { id: "cat-3", budget_id: "mock-budget-orlando", name: "Compras", icon: "compras", color: CATEGORY_COLORS.compras, planned_amount: 2500, sort_order: 2 },
      { id: "cat-4", budget_id: "mock-budget-orlando", name: "Passeios", icon: "passeios", color: CATEGORY_COLORS.passeios, planned_amount: 1200, sort_order: 3 },
      { id: "cat-5", budget_id: "mock-budget-orlando", name: "Hospedagem Extra", icon: "hospedagem", color: CATEGORY_COLORS.hospedagem, planned_amount: 0, sort_order: 4 },
      { id: "cat-6", budget_id: "mock-budget-orlando", name: "Emergências", icon: "emergencias", color: CATEGORY_COLORS.emergencias, planned_amount: 500, sort_order: 5 },
      { id: "cat-7", budget_id: "mock-budget-orlando", name: "Outros", icon: "outros", color: CATEGORY_COLORS.outros, planned_amount: 0, sort_order: 6 },
    ],
    expenses: [
      { id: "exp-1", budget_id: "mock-budget-orlando", category_id: "cat-1", description: "Jantar no Olive Garden", amount: 185, expense_date: past(5), payment_method: "cartao_credito", card_id: "card-1", notes: "Família toda, kids menu" },
      { id: "exp-2", budget_id: "mock-budget-orlando", category_id: "cat-1", description: "Café da manhã Waffle House", amount: 62, expense_date: past(5), payment_method: "dinheiro" },
      { id: "exp-3", budget_id: "mock-budget-orlando", category_id: "cat-3", description: "Disney Springs — Souvenirs", amount: 340, expense_date: past(4), payment_method: "cartao_credito", card_id: "card-1" },
      { id: "exp-4", budget_id: "mock-budget-orlando", category_id: "cat-1", description: "Almoço no Magic Kingdom", amount: 220, expense_date: past(4), payment_method: "cartao_debito", card_id: "card-2" },
      { id: "exp-5", budget_id: "mock-budget-orlando", category_id: "cat-2", description: "Pedágio SunPass (3 dias)", amount: 28, expense_date: past(4), payment_method: "cartao_debito", card_id: "card-2" },
      { id: "exp-6", budget_id: "mock-budget-orlando", category_id: "cat-4", description: "Ingresso Legoland (extra)", amount: 380, expense_date: past(3), payment_method: "cartao_credito", card_id: "card-1" },
      { id: "exp-7", budget_id: "mock-budget-orlando", category_id: "cat-1", description: "Jantar Outback Steakhouse", amount: 195, expense_date: past(3), payment_method: "cartao_credito", card_id: "card-1" },
      { id: "exp-8", budget_id: "mock-budget-orlando", category_id: "cat-3", description: "Orlando Premium Outlets", amount: 890, expense_date: past(2), payment_method: "cartao_credito", card_id: "card-1" },
      { id: "exp-9", budget_id: "mock-budget-orlando", category_id: "cat-2", description: "Uber para Downtown", amount: 35, expense_date: past(2), payment_method: "pix" },
      { id: "exp-10", budget_id: "mock-budget-orlando", category_id: "cat-1", description: "Supermercado Publix", amount: 145, expense_date: past(1), payment_method: "dinheiro" },
      { id: "exp-11", budget_id: "mock-budget-orlando", category_id: "cat-4", description: "Fun Spot (família)", amount: 160, expense_date: past(1), payment_method: "cartao_debito", card_id: "card-2" },
      { id: "exp-12", budget_id: "mock-budget-orlando", category_id: "cat-1", description: "Starbucks + snacks", amount: 48, expense_date: past(0), payment_method: "dinheiro" },
      { id: "exp-13", budget_id: "mock-budget-orlando", category_id: "cat-3", description: "Apple Store — AirPods", amount: 249, expense_date: past(0), payment_method: "cartao_credito", card_id: "card-1" },
    ],
    cashItems: [
      { id: "cash-1", budget_id: "mock-budget-orlando", description: "Dólares comprados na Treviso", initial_amount: 1200, currency: "USD", exchange_rate: 5.15, created_at: past(10) },
      { id: "cash-2", budget_id: "mock-budget-orlando", description: "Dólares sacados no ATM", initial_amount: 300, currency: "USD", exchange_rate: 5.25, created_at: past(3) },
    ],
    cards: [
      { id: "card-1", budget_id: "mock-budget-orlando", nickname: "Nubank Platinum", last_digits: "4829", card_type: "credito", brand: "Mastercard", credit_limit: 15000, color: "#7B1FA2" },
      { id: "card-2", budget_id: "mock-budget-orlando", nickname: "C6 Débito", last_digits: "1133", card_type: "debito", brand: "Visa", credit_limit: 0, color: "#212121" },
    ],
  },

  "mock-europa": {
    budget: { id: "mock-budget-europa", sale_id: "mock-europa", client_id: "mock-client", total_budget: 12000, currency: "EUR" },
    categories: [
      { id: "cat-e1", budget_id: "mock-budget-europa", name: "Alimentação", icon: "alimentacao", color: CATEGORY_COLORS.alimentacao, planned_amount: 4000, sort_order: 0 },
      { id: "cat-e2", budget_id: "mock-budget-europa", name: "Transporte", icon: "transporte", color: CATEGORY_COLORS.transporte, planned_amount: 1500, sort_order: 1 },
      { id: "cat-e3", budget_id: "mock-budget-europa", name: "Compras", icon: "compras", color: CATEGORY_COLORS.compras, planned_amount: 3500, sort_order: 2 },
      { id: "cat-e4", budget_id: "mock-budget-europa", name: "Passeios", icon: "passeios", color: CATEGORY_COLORS.passeios, planned_amount: 2000, sort_order: 3 },
      { id: "cat-e5", budget_id: "mock-budget-europa", name: "Hospedagem Extra", icon: "hospedagem", color: CATEGORY_COLORS.hospedagem, planned_amount: 0, sort_order: 4 },
      { id: "cat-e6", budget_id: "mock-budget-europa", name: "Emergências", icon: "emergencias", color: CATEGORY_COLORS.emergencias, planned_amount: 1000, sort_order: 5 },
      { id: "cat-e7", budget_id: "mock-budget-europa", name: "Outros", icon: "outros", color: CATEGORY_COLORS.outros, planned_amount: 0, sort_order: 6 },
    ],
    expenses: [
      { id: "exp-e1", budget_id: "mock-budget-europa", category_id: "cat-e1", description: "Brasserie La Fontaine, Paris", amount: 180, expense_date: past(10), payment_method: "cartao_credito", card_id: "card-e1" },
      { id: "exp-e2", budget_id: "mock-budget-europa", category_id: "cat-e3", description: "Galeries Lafayette — Perfumes", amount: 420, expense_date: past(10), payment_method: "cartao_credito", card_id: "card-e1" },
      { id: "exp-e3", budget_id: "mock-budget-europa", category_id: "cat-e2", description: "Metrô Paris (Navigo Semaine)", amount: 30, expense_date: past(9), payment_method: "dinheiro" },
      { id: "exp-e4", budget_id: "mock-budget-europa", category_id: "cat-e1", description: "Café e croissant, Montmartre", amount: 25, expense_date: past(9), payment_method: "dinheiro" },
      { id: "exp-e5", budget_id: "mock-budget-europa", category_id: "cat-e4", description: "Tour de barco no Sena", amount: 90, expense_date: past(8), payment_method: "cartao_credito", card_id: "card-e1" },
      { id: "exp-e6", budget_id: "mock-budget-europa", category_id: "cat-e1", description: "Trattoria em Trastevere, Roma", amount: 145, expense_date: past(6), payment_method: "cartao_credito", card_id: "card-e1" },
      { id: "exp-e7", budget_id: "mock-budget-europa", category_id: "cat-e3", description: "Couro italiano — Bolsa artesanal", amount: 350, expense_date: past(5), payment_method: "cartao_credito", card_id: "card-e1" },
      { id: "exp-e8", budget_id: "mock-budget-europa", category_id: "cat-e1", description: "Gelato Giolitti (x5)", amount: 35, expense_date: past(5), payment_method: "dinheiro" },
      { id: "exp-e9", budget_id: "mock-budget-europa", category_id: "cat-e2", description: "Táxi FCO → Hotel De Russie", amount: 55, expense_date: past(6), payment_method: "dinheiro" },
      { id: "exp-e10", budget_id: "mock-budget-europa", category_id: "cat-e1", description: "Jantar rooftop Santorini", amount: 280, expense_date: past(2), payment_method: "cartao_credito", card_id: "card-e1" },
      { id: "exp-e11", budget_id: "mock-budget-europa", category_id: "cat-e4", description: "Wine tasting Santorini", amount: 120, expense_date: past(2), payment_method: "cartao_credito", card_id: "card-e1" },
      { id: "exp-e12", budget_id: "mock-budget-europa", category_id: "cat-e3", description: "Joias Santorini — Anel prata", amount: 195, expense_date: past(1), payment_method: "cartao_credito", card_id: "card-e1" },
      { id: "exp-e13", budget_id: "mock-budget-europa", category_id: "cat-e2", description: "Transfer Fira → Oia", amount: 40, expense_date: past(1), payment_method: "dinheiro" },
      { id: "exp-e14", budget_id: "mock-budget-europa", category_id: "cat-e1", description: "Supermercado em Paris", amount: 95, expense_date: past(9), payment_method: "dinheiro" },
    ],
    cashItems: [
      { id: "cash-e1", budget_id: "mock-budget-europa", description: "Euros comprados (Confidence)", initial_amount: 2000, currency: "EUR", exchange_rate: 5.45, created_at: past(15) },
      { id: "cash-e2", budget_id: "mock-budget-europa", description: "Saque ATM Roma", initial_amount: 500, currency: "EUR", exchange_rate: 5.50, created_at: past(6) },
    ],
    cards: [
      { id: "card-e1", budget_id: "mock-budget-europa", nickname: "Itaú Personnalité Black", last_digits: "7741", card_type: "credito", brand: "Visa", credit_limit: 35000, color: "#1A237E" },
    ],
  },

  "mock-patagonia": {
    budget: { id: "mock-budget-patagonia", sale_id: "mock-patagonia", client_id: "mock-client", total_budget: 3500, currency: "ARS" },
    categories: [
      { id: "cat-p1", budget_id: "mock-budget-patagonia", name: "Alimentação", icon: "alimentacao", color: CATEGORY_COLORS.alimentacao, planned_amount: 1500, sort_order: 0 },
      { id: "cat-p2", budget_id: "mock-budget-patagonia", name: "Transporte", icon: "transporte", color: CATEGORY_COLORS.transporte, planned_amount: 600, sort_order: 1 },
      { id: "cat-p3", budget_id: "mock-budget-patagonia", name: "Compras", icon: "compras", color: CATEGORY_COLORS.compras, planned_amount: 400, sort_order: 2 },
      { id: "cat-p4", budget_id: "mock-budget-patagonia", name: "Passeios", icon: "passeios", color: CATEGORY_COLORS.passeios, planned_amount: 800, sort_order: 3 },
      { id: "cat-p5", budget_id: "mock-budget-patagonia", name: "Hospedagem Extra", icon: "hospedagem", color: CATEGORY_COLORS.hospedagem, planned_amount: 0, sort_order: 4 },
      { id: "cat-p6", budget_id: "mock-budget-patagonia", name: "Emergências", icon: "emergencias", color: CATEGORY_COLORS.emergencias, planned_amount: 200, sort_order: 5 },
      { id: "cat-p7", budget_id: "mock-budget-patagonia", name: "Outros", icon: "outros", color: CATEGORY_COLORS.outros, planned_amount: 0, sort_order: 6 },
    ],
    expenses: [
      { id: "exp-p1", budget_id: "mock-budget-patagonia", category_id: "cat-p1", description: "Parrilla Don Pichón", amount: 120, expense_date: past(1), payment_method: "dinheiro" },
      { id: "exp-p2", budget_id: "mock-budget-patagonia", category_id: "cat-p1", description: "Café da manhã padaria local", amount: 35, expense_date: past(1), payment_method: "dinheiro" },
      { id: "exp-p3", budget_id: "mock-budget-patagonia", category_id: "cat-p2", description: "Combustível SUV (tanque cheio)", amount: 85, expense_date: past(1), payment_method: "cartao_debito", card_id: "card-p1" },
      { id: "exp-p4", budget_id: "mock-budget-patagonia", category_id: "cat-p4", description: "Ingresso Perito Moreno (extra)", amount: 50, expense_date: past(0), payment_method: "dinheiro" },
      { id: "exp-p5", budget_id: "mock-budget-patagonia", category_id: "cat-p1", description: "Almoço Ramos Generales", amount: 95, expense_date: past(0), payment_method: "cartao_credito", card_id: "card-p1" },
      { id: "exp-p6", budget_id: "mock-budget-patagonia", category_id: "cat-p3", description: "Chocolates Patagônicos", amount: 60, expense_date: past(0), payment_method: "dinheiro" },
    ],
    cashItems: [
      { id: "cash-p1", budget_id: "mock-budget-patagonia", description: "Pesos argentinos", initial_amount: 800, currency: "ARS", exchange_rate: 0.006, created_at: past(3) },
      { id: "cash-p2", budget_id: "mock-budget-patagonia", description: "Dólares (emergência)", initial_amount: 500, currency: "USD", exchange_rate: 5.20, created_at: past(3) },
    ],
    cards: [
      { id: "card-p1", budget_id: "mock-budget-patagonia", nickname: "Nubank", last_digits: "4829", card_type: "credito", brand: "Mastercard", credit_limit: 15000, color: "#7B1FA2" },
    ],
  },

  "mock-maldivas": {
    budget: { id: "mock-budget-maldivas", sale_id: "mock-maldivas", client_id: "mock-client", total_budget: 6000, currency: "USD" },
    categories: [
      { id: "cat-m1", budget_id: "mock-budget-maldivas", name: "Alimentação", icon: "alimentacao", color: CATEGORY_COLORS.alimentacao, planned_amount: 1500, sort_order: 0 },
      { id: "cat-m2", budget_id: "mock-budget-maldivas", name: "Transporte", icon: "transporte", color: CATEGORY_COLORS.transporte, planned_amount: 500, sort_order: 1 },
      { id: "cat-m3", budget_id: "mock-budget-maldivas", name: "Compras", icon: "compras", color: CATEGORY_COLORS.compras, planned_amount: 1000, sort_order: 2 },
      { id: "cat-m4", budget_id: "mock-budget-maldivas", name: "Passeios", icon: "passeios", color: CATEGORY_COLORS.passeios, planned_amount: 2000, sort_order: 3 },
      { id: "cat-m5", budget_id: "mock-budget-maldivas", name: "Hospedagem Extra", icon: "hospedagem", color: CATEGORY_COLORS.hospedagem, planned_amount: 0, sort_order: 4 },
      { id: "cat-m6", budget_id: "mock-budget-maldivas", name: "Emergências", icon: "emergencias", color: CATEGORY_COLORS.emergencias, planned_amount: 1000, sort_order: 5 },
      { id: "cat-m7", budget_id: "mock-budget-maldivas", name: "Outros", icon: "outros", color: CATEGORY_COLORS.outros, planned_amount: 0, sort_order: 6 },
    ],
    expenses: [
      { id: "exp-m1", budget_id: "mock-budget-maldivas", category_id: "cat-m1", description: "Jantar romântico na praia", amount: 450, expense_date: past(42), payment_method: "cartao_credito", card_id: "card-m1" },
      { id: "exp-m2", budget_id: "mock-budget-maldivas", category_id: "cat-m4", description: "Mergulho com golfinhos (extra)", amount: 380, expense_date: past(41), payment_method: "cartao_credito", card_id: "card-m1" },
      { id: "exp-m3", budget_id: "mock-budget-maldivas", category_id: "cat-m1", description: "Bar do resort — coquetéis", amount: 190, expense_date: past(41), payment_method: "cartao_credito", card_id: "card-m1" },
      { id: "exp-m4", budget_id: "mock-budget-maldivas", category_id: "cat-m4", description: "Spa — Massagem casal", amount: 320, expense_date: past(40), payment_method: "cartao_credito", card_id: "card-m1" },
      { id: "exp-m5", budget_id: "mock-budget-maldivas", category_id: "cat-m3", description: "Artesanato maldiviano", amount: 120, expense_date: past(39), payment_method: "dinheiro" },
      { id: "exp-m6", budget_id: "mock-budget-maldivas", category_id: "cat-m1", description: "Almoço no restaurante submarino", amount: 580, expense_date: past(38), payment_method: "cartao_credito", card_id: "card-m1" },
      { id: "exp-m7", budget_id: "mock-budget-maldivas", category_id: "cat-m4", description: "Passeio de caiaque ao pôr do sol", amount: 95, expense_date: past(37), payment_method: "dinheiro" },
      { id: "exp-m8", budget_id: "mock-budget-maldivas", category_id: "cat-m2", description: "Speedboat excursão ilhas", amount: 250, expense_date: past(37), payment_method: "cartao_credito", card_id: "card-m1" },
      { id: "exp-m9", budget_id: "mock-budget-maldivas", category_id: "cat-m1", description: "Minibar + room service", amount: 310, expense_date: past(36), payment_method: "cartao_credito", card_id: "card-m1" },
    ],
    cashItems: [
      { id: "cash-m1", budget_id: "mock-budget-maldivas", description: "Dólares para gorjetas", initial_amount: 500, currency: "USD", exchange_rate: 5.10, created_at: past(50) },
    ],
    cards: [
      { id: "card-m1", budget_id: "mock-budget-maldivas", nickname: "Amex Platinum", last_digits: "9001", card_type: "credito", brand: "Amex", credit_limit: 50000, color: "#B0BEC5" },
    ],
  },
};

export function getMockFinanceData(saleId: string): MockFinanceData | null {
  if (!saleId.startsWith("mock-")) return null;
  const trip = getMockTripDetail(saleId);
  if (!trip) return null;
  const finData = mockBudgetsByTrip[saleId];
  if (!finData) return null;

  return {
    sale: {
      id: trip.sale.id,
      locator: "MOCK",
      destination: trip.sale.destination_iata,
      total_received: trip.sale.total_sale_value,
      total_cost: 0,
      sale_date: trip.sale.departure_date,
    },
    receivables: trip.financial.receivables,
    ...finData,
  };
}
