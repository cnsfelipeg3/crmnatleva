// Fictional trips for portal demo / test environment
import patagoniaImg from "@/assets/destination-patagonia.jpg";

export interface MockTrip {
  id: string;
  sale_id: string;
  custom_title: string;
  subtitle?: string;
  cover_image_url: string;
  notes_for_client: string;
  sale: {
    id: string;
    name: string;
    status: string;
    origin_iata: string;
    destination_iata: string;
    departure_date: string;
    return_date: string;
    total_sale_value: number;
    seller_id: string | null;
  };
  segments: any[];
  hotels: any[];
  services: any[];
  lodging: any[];
  attachments: any[];
  financial: { receivables: any[] };
  passengers: any[];
  sellerName: string;
}

const today = new Date();
const future = (days: number) => {
  const d = new Date(today);
  d.setDate(d.getDate() + days);
  return d.toISOString().split("T")[0];
};
const past = (days: number) => {
  const d = new Date(today);
  d.setDate(d.getDate() - days);
  return d.toISOString().split("T")[0];
};

export const mockTrips: MockTrip[] = [
  // ===== TRIP 1: Orlando - Family Disney =====
  {
    id: "mock-orlando",
    sale_id: "mock-orlando",
    custom_title: "Orlando Mágica",
    subtitle: "Família Silva",
    cover_image_url: "https://images.unsplash.com/photo-1597466599360-3b9775841aec?w=1200&h=600&fit=crop",
    notes_for_client: "Olá Família Silva! 🎉\n\nSua viagem dos sonhos para Orlando está confirmada! Preparamos um roteiro completo com parques Disney, Universal e muito mais. Qualquer dúvida, estamos à disposição!\n\n✨ Equipe NatLeva Viagens",
    sale: {
      id: "mock-orlando",
      name: "Orlando Mágica",
      status: "confirmada",
      origin_iata: "GRU",
      destination_iata: "MCO",
      departure_date: future(25),
      return_date: future(37),
      total_sale_value: 42000,
      seller_id: null,
    },
    segments: [
      { id: "seg-1", sale_id: "mock-orlando", airline: "LA", airline_name: "LATAM Airlines", flight_number: "LA8070", origin_iata: "GRU", destination_iata: "MIA", departure_date: future(25), arrival_date: future(26), departure_time: "23:15", arrival_time: "06:30", direction: "ida", flight_class: "Econômica Premium", segment_order: 1, terminal: "3", arrival_terminal: "N", duration_minutes: 555, aircraft_type: "Boeing 777-300ER", baggage_allowance: "2x 23kg + 1 mão de 10kg", meal_info: "Jantar e café da manhã inclusos", booking_ref: "XKPT4R" },
      { id: "seg-2", sale_id: "mock-orlando", airline: "AA", airline_name: "American Airlines", flight_number: "AA1492", origin_iata: "MIA", destination_iata: "MCO", departure_date: future(26), departure_time: "09:45", arrival_time: "10:50", direction: "ida", flight_class: "Econômica", segment_order: 2, connection_time_minutes: 195, terminal: "N", arrival_terminal: "B", duration_minutes: 65, aircraft_type: "Airbus A321", baggage_allowance: "1x 23kg", booking_ref: "XKPT4R" },
      { id: "seg-3", sale_id: "mock-orlando", airline: "AA", airline_name: "American Airlines", flight_number: "AA2105", origin_iata: "MCO", destination_iata: "MIA", departure_date: future(37), departure_time: "12:00", arrival_time: "13:10", direction: "volta", flight_class: "Econômica", segment_order: 3, terminal: "B", arrival_terminal: "N", duration_minutes: 70, aircraft_type: "Airbus A319", baggage_allowance: "1x 23kg", booking_ref: "XKPT4R" },
      { id: "seg-4", sale_id: "mock-orlando", airline: "LA", airline_name: "LATAM Airlines", flight_number: "LA8071", origin_iata: "MIA", destination_iata: "GRU", departure_date: future(37), arrival_date: future(38), departure_time: "16:30", arrival_time: "05:45", direction: "volta", flight_class: "Econômica Premium", segment_order: 4, terminal: "N", arrival_terminal: "3", duration_minutes: 555, aircraft_type: "Boeing 777-300ER", connection_time_minutes: 200, baggage_allowance: "2x 23kg + 1 mão de 10kg", meal_info: "Almoço e café da manhã inclusos", booking_ref: "XKPT4R" },
    ],
    hotels: [
      { id: "h-1", hotel_name: "Disney's All-Star Movies Resort", description: "Disney's All-Star Movies Resort", category: "hotel", product_type: "hotel", reservation_code: "DIS-89421", status: "CONFIRMADO", hotel_checkin_datetime_utc: future(26), hotel_checkout_datetime_utc: future(37), checkin_time: "15:00", checkout_time: "11:00", room_type: "Quarto Família · 2 camas queen", city: "Orlando, FL", address: "1991 W Buena Vista Dr, Lake Buena Vista, FL 32830", phone: "+1 407-939-7000", website: "https://disneyworld.disney.go.com", meal_plan: "Sem refeições (apenas frigobar)", amenities: ["Piscina", "Wi-Fi grátis", "Disney MagicBand+", "Transporte para parques", "Estacionamento"], notes: "Inclui Disney MagicBand+ para todos os hóspedes • Transporte gratuito para todos os parques Disney", stars: 3 },
    ],
    services: [
      { id: "s-1", description: "Magic Kingdom · Park Hopper (4 dias)", category: "ingresso", product_type: "ingresso", reservation_code: "WDW-44821", date: future(27), time: "08:00", duration: "4 dias consecutivos", location: "Walt Disney World, Orlando", included: "Acesso ilimitado a Magic Kingdom, EPCOT, Hollywood Studios e Animal Kingdom", important_info: "Levar documento de identidade original para retirada dos ingressos no Guest Relations", participants: "4 pessoas (2 adultos + 2 crianças)" },
      { id: "s-2", description: "EPCOT + Hollywood Studios", category: "ingresso", product_type: "ingresso", reservation_code: "WDW-44822", date: future(31), time: "09:00", location: "Walt Disney World, Orlando", included: "Acesso Park Hopper entre EPCOT e Hollywood Studios" },
      { id: "s-3", description: "Universal Orlando · Park-to-Park (2 dias)", category: "ingresso", product_type: "ingresso", reservation_code: "UNI-77563", date: future(33), time: "08:30", duration: "2 dias consecutivos", location: "Universal Orlando Resort", included: "Acesso a Universal Studios e Islands of Adventure com Park-to-Park", important_info: "Express Pass não incluso. Recomendamos chegar antes da abertura para Harry Potter", participants: "4 pessoas" },
      { id: "s-4", description: "Aluguel Minivan Dodge Grand Caravan (12 dias)", category: "transfer", product_type: "transfer", reservation_code: "ALAMO-1198", date: future(26), time: "08:00", end_time: future(37), duration: "12 dias", location: "Alamo Rent A Car · Aeroporto MCO", meeting_point: "Balcão Alamo no Terminal B, nível 1", provider: "Alamo Rent A Car", provider_phone: "+1 844-354-6962", included: "Seguro CDW/LDW, 1 cadeirinha infantil, GPS, quilometragem ilimitada", not_included: "Combustível, pedágios (SunPass disponível por US$5/dia)", cancellation_policy: "Cancelamento gratuito até 24h antes" },
      { id: "s-5", description: "Seguro Viagem Assist Card · Família (4 pax)", category: "seguro", product_type: "seguro", reservation_code: "AC-2024-55123", duration: "Cobertura completa durante toda a viagem", provider: "Assist Card", provider_phone: "+55 11 2842-3420", included: "Cobertura médica US$ 150.000, bagagem US$ 2.000, cancelamento de viagem", important_info: "Em caso de emergência ligar para +1 866-283-0698 (EUA)" },
      { id: "s-6", description: "Chip Internacional T-Mobile (4 unidades)", category: "outros", product_type: "outros", duration: "15 dias de dados ilimitados", included: "4 chips com 15GB de dados 5G cada, ligações ilimitadas EUA + Brasil", important_info: "Chips serão enviados ao hotel no dia do check-in" },
    ],
    lodging: [],
    attachments: [],
    financial: {
      receivables: [
        { id: "r-1", gross_value: 14000, status: "recebido", due_date: past(30), payment_method: "PIX", description: "1ª parcela · Sinal", installment_number: 1, installment_total: 3 },
        { id: "r-2", gross_value: 14000, status: "recebido", due_date: past(0), payment_method: "Cartão de crédito", description: "2ª parcela", installment_number: 2, installment_total: 3 },
        { id: "r-3", gross_value: 14000, status: "pendente", due_date: future(15), payment_method: "PIX", description: "3ª parcela · Final", installment_number: 3, installment_total: 3 },
      ],
    },
    passengers: [
      { id: "p-1", full_name: "Tiago Silva", document_number: "AB123456", birth_date: "1988-05-15", role: "titular" },
      { id: "p-2", full_name: "Marina Silva", document_number: "CD789012", birth_date: "1990-08-22", role: "acompanhante" },
      { id: "p-3", full_name: "Lucas Silva", document_number: "EF345678", birth_date: "2015-03-10", role: "acompanhante" },
      { id: "p-4", full_name: "Sofia Silva", document_number: "GH901234", birth_date: "2018-11-28", role: "acompanhante" },
    ],
    sellerName: "Amanda NatLeva",
  },

  // ===== TRIP 2: Europa Romântica =====
  {
    id: "mock-europa",
    sale_id: "mock-europa",
    custom_title: "Europa Romântica",
    subtitle: "Paris, Roma & Santorini",
    cover_image_url: "https://images.unsplash.com/photo-1499856871958-5b9627545d1a?w=1200&h=600&fit=crop",
    notes_for_client: "Casal Silva, que viagem incrível vocês têm pela frente! 🗼🏛️🏝️\n\nUm roteiro romântico passando por Paris, Roma e finalizando em Santorini. Cada destino foi cuidadosamente planejado para proporcionar momentos inesquecíveis.\n\nBon voyage! 💕\nEquipe NatLeva",
    sale: {
      id: "mock-europa",
      name: "Europa Romântica",
      status: "confirmada",
      origin_iata: "GRU",
      destination_iata: "CDG",
      departure_date: future(60),
      return_date: future(78),
      total_sale_value: 58000,
      seller_id: null,
    },
    segments: [
      { id: "seg-e1", sale_id: "mock-europa", airline: "AF", airline_name: "Air France", flight_number: "AF457", origin_iata: "GRU", destination_iata: "CDG", departure_date: future(60), arrival_date: future(61), departure_time: "21:30", arrival_time: "13:15", direction: "ida", flight_class: "Executiva", segment_order: 1, terminal: "2", arrival_terminal: "2E", duration_minutes: 645, aircraft_type: "Boeing 777-300ER", baggage_allowance: "2x 32kg + 1 mão de 12kg", meal_info: "Jantar gourmet e café da manhã à la carte", booking_ref: "EURPAR" },
      { id: "seg-e2", sale_id: "mock-europa", airline: "AF", airline_name: "Air France", flight_number: "AF1204", origin_iata: "CDG", destination_iata: "FCO", departure_date: future(66), departure_time: "10:00", arrival_time: "12:15", direction: "ida", flight_class: "Econômica Premium", segment_order: 2, terminal: "2F", arrival_terminal: "1", duration_minutes: 135, aircraft_type: "Airbus A320", baggage_allowance: "1x 23kg", meal_info: "Snack leve", booking_ref: "EURPAR" },
      { id: "seg-e3", sale_id: "mock-europa", airline: "A3", airline_name: "Aegean Airlines", flight_number: "A3651", origin_iata: "FCO", destination_iata: "JTR", departure_date: future(72), departure_time: "14:00", arrival_time: "17:30", direction: "ida", flight_class: "Econômica", segment_order: 3, terminal: "1", duration_minutes: 150, aircraft_type: "Airbus A320neo", baggage_allowance: "1x 23kg", booking_ref: "EURPAR" },
      { id: "seg-e4", sale_id: "mock-europa", airline: "A3", airline_name: "Aegean Airlines", flight_number: "A3350", origin_iata: "JTR", destination_iata: "ATH", departure_date: future(77), departure_time: "09:00", arrival_time: "09:45", direction: "volta", flight_class: "Econômica", segment_order: 4, duration_minutes: 45, aircraft_type: "Airbus A320neo", booking_ref: "RETBR1" },
      { id: "seg-e5", sale_id: "mock-europa", airline: "TK", airline_name: "Turkish Airlines", flight_number: "TK1844", origin_iata: "ATH", destination_iata: "IST", departure_date: future(77), departure_time: "13:00", arrival_time: "14:30", direction: "volta", flight_class: "Executiva", segment_order: 5, arrival_terminal: "INT", duration_minutes: 90, connection_time_minutes: 195, aircraft_type: "Boeing 737-800", baggage_allowance: "2x 32kg", meal_info: "Almoço completo", booking_ref: "RETBR1" },
      { id: "seg-e6", sale_id: "mock-europa", airline: "TK", airline_name: "Turkish Airlines", flight_number: "TK15", origin_iata: "IST", destination_iata: "GRU", departure_date: future(77), arrival_date: future(78), departure_time: "19:30", arrival_time: "04:45", direction: "volta", flight_class: "Executiva", segment_order: 6, terminal: "INT", arrival_terminal: "3", duration_minutes: 735, connection_time_minutes: 300, aircraft_type: "Boeing 787-9 Dreamliner", baggage_allowance: "2x 32kg + 1 mão de 12kg", meal_info: "Jantar, snack noturno e café da manhã", booking_ref: "RETBR1" },
    ],
    hotels: [
      { id: "h-e1", hotel_name: "Le Marais Boutique Hotel", description: "Le Marais Boutique Hotel, Paris", category: "hotel", product_type: "hotel", reservation_code: "LMB-5521", status: "CONFIRMADO", hotel_checkin_datetime_utc: future(61), hotel_checkout_datetime_utc: future(66), checkin_time: "15:00", checkout_time: "11:00", room_type: "Suite Superior · Vista para a Rue de Rivoli", city: "Paris, França", address: "16 Rue de Rivoli, 75004 Paris", phone: "+33 1 42 72 14 15", meal_plan: "Café da manhã incluso", amenities: ["Wi-Fi grátis", "Concierge 24h", "Adega privativa", "Rooftop bar", "Room service"], notes: "Vista privilegiada para o Sena • Localização perfeita no Marais", stars: 4 },
      { id: "h-e2", hotel_name: "Hotel De Russie, A Rocco Forte", description: "Hotel De Russie, Roma", category: "hotel", product_type: "hotel", reservation_code: "HDR-9981", status: "CONFIRMADO", hotel_checkin_datetime_utc: future(66), hotel_checkout_datetime_utc: future(72), checkin_time: "14:00", checkout_time: "12:00", room_type: "Deluxe Room · Vista para o Jardim Secreto", city: "Roma, Itália", address: "Via del Babuino 9, 00187 Roma", phone: "+39 06 328881", website: "https://www.roccofortehotels.com/hotels-and-resorts/hotel-de-russie", meal_plan: "Café da manhã buffet incluso", amenities: ["Spa & Wellness", "Jardim secreto", "Restaurante Michelin", "Wi-Fi grátis", "Fitness center", "Concierge"], notes: "Próximo à Piazza del Popolo e Spanish Steps", stars: 5 },
      { id: "h-e3", hotel_name: "Canaves Oia Suites", description: "Canaves Oia Suites, Santorini", category: "hotel", product_type: "hotel", reservation_code: "CAN-3310", status: "CONFIRMADO", hotel_checkin_datetime_utc: future(72), hotel_checkout_datetime_utc: future(77), checkin_time: "15:00", checkout_time: "11:00", room_type: "Suite com Piscina Privativa · Vista Caldera", city: "Oia, Santorini, Grécia", address: "Oia 847 02, Santorini", phone: "+30 22860 71453", website: "https://canaves.com", meal_plan: "All-inclusive premium", amenities: ["Piscina privativa", "Vista para a Caldera", "Spa", "Restaurante gourmet", "Transfer de helicóptero", "Sommelier privativo"], notes: "Suite com vista espetacular para o pôr do sol na Caldera • Serviço de mordomo dedicado", stars: 5, special_requests: "Decoração romântica no quarto na chegada" },
    ],
    services: [
      { id: "s-e1", description: "Tour privado Museu do Louvre (3h)", category: "passeio", product_type: "passeio", reservation_code: "PAR-001", date: future(62), time: "09:30", duration: "3 horas", location: "Museu do Louvre, Paris", meeting_point: "Entrada Pirâmide, lado norte", provider: "Paris Private Tours", included: "Guia particular em português, acesso sem fila, fones de ouvido", participants: "2 pessoas" },
      { id: "s-e2", description: "Jantar no Jules Verne (Torre Eiffel)", category: "gastronomia", product_type: "passeio", reservation_code: "PAR-002", date: future(63), time: "20:00", duration: "2h30", location: "2º andar da Torre Eiffel, Paris", provider: "Le Jules Verne by Alain Ducasse", included: "Menu degustação 7 pratos com harmonização de vinhos, vista panorâmica", important_info: "Dress code: Smart casual. Reserva para 2 pessoas, mesa com vista", participants: "2 pessoas" },
      { id: "s-e3", description: "Cruzeiro pelo Sena ao pôr do sol", category: "passeio", product_type: "passeio", date: future(64), time: "18:30", duration: "1h30", location: "Porto de Alma, Paris", meeting_point: "Pier 3, próximo à Pont de l'Alma", included: "Champagne de boas-vindas, guia em português", provider: "Bateaux Parisiens" },
      { id: "s-e4", description: "Tour VIP Coliseu + Fórum Romano + Palatino", category: "passeio", product_type: "passeio", reservation_code: "ROM-001", date: future(67), time: "09:00", duration: "3h30", location: "Coliseu, Roma", meeting_point: "Arco de Constantino, lado sul", provider: "Rome Elite Tours", included: "Acesso subterrâneo do Coliseu, guia arqueólogo em português, sem fila", important_info: "Usar sapatos confortáveis. Levar água e protetor solar", participants: "2 pessoas" },
      { id: "s-e5", description: "Aula de culinária italiana, Trastevere", category: "experiencia", product_type: "passeio", date: future(69), time: "10:00", duration: "4 horas", location: "Trastevere, Roma", provider: "Cooking Class Rome", included: "Tour pelo mercado local, ingredientes, aula prática de pasta e tiramisù, almoço com vinho", participants: "2 pessoas" },
      { id: "s-e6", description: "Sunset Catamaran Cruise, Santorini", category: "passeio", product_type: "passeio", reservation_code: "SAN-001", date: future(74), time: "16:00", duration: "5 horas", location: "Porto de Ammoudi, Oia", meeting_point: "Pier principal, junto ao restaurante Sunset", provider: "Santorini Sailing", included: "Catamarã privativo, churrasco a bordo, vinhos locais, snorkeling em Red Beach e Hot Springs", participants: "2 pessoas", cancellation_policy: "Cancelamento gratuito até 48h antes" },
      { id: "s-e7", description: "Seguro Viagem April International · Premium", category: "seguro", product_type: "seguro", reservation_code: "APR-2024-887", provider: "April International", provider_phone: "+33 1 73 02 93 93", included: "Cobertura médica €300.000, bagagem €3.000, repatriação, cancelamento", important_info: "Em caso de emergência na Europa: +33 1 73 02 93 93" },
      { id: "s-e8", description: "Transfers privativos em todos os destinos", category: "transfer", product_type: "transfer", provider: "Blacklane Premium", included: "Transfers aeroporto-hotel em todos os destinos (CDG, FCO, JTR), veículos Mercedes Classe E ou superior", important_info: "Motorista aguardará na saída do desembarque com placa nominativa" },
    ],
    lodging: [],
    attachments: [],
    financial: {
      receivables: [
        { id: "r-e1", gross_value: 19333, status: "recebido", due_date: past(45), payment_method: "PIX", description: "1ª parcela · Sinal", installment_number: 1, installment_total: 3 },
        { id: "r-e2", gross_value: 19333, status: "recebido", due_date: past(15), payment_method: "Cartão de crédito", description: "2ª parcela", installment_number: 2, installment_total: 3 },
        { id: "r-e3", gross_value: 19334, status: "pendente", due_date: future(30), payment_method: "PIX", description: "3ª parcela · Final", installment_number: 3, installment_total: 3 },
      ],
    },
    passengers: [
      { id: "p-e1", full_name: "Tiago Silva", document_number: "AB123456", birth_date: "1988-05-15", role: "titular" },
      { id: "p-e2", full_name: "Marina Silva", document_number: "CD789012", birth_date: "1990-08-22", role: "acompanhante" },
    ],
    sellerName: "Amanda NatLeva",
  },

  // ===== TRIP 3: Maldivas (Concluída) =====
  {
    id: "mock-maldivas",
    sale_id: "mock-maldivas",
    custom_title: "Maldivas",
    subtitle: "Lua de Mel dos Sonhos",
    cover_image_url: "https://images.unsplash.com/photo-1514282401047-d79a71a590e8?w=1200&h=600&fit=crop",
    notes_for_client: "Tiago e Marina, esperamos que tenham vivido momentos inesquecíveis nas Maldivas! 🌊✨\n\nFoi uma honra fazer parte desse momento especial de vocês.\n\nAté a próxima aventura!\nEquipe NatLeva",
    sale: {
      id: "mock-maldivas",
      name: "Maldivas",
      status: "concluída",
      origin_iata: "GRU",
      destination_iata: "MLE",
      departure_date: past(45),
      return_date: past(35),
      total_sale_value: 68000,
      seller_id: null,
    },
    segments: [
      { id: "seg-m1", sale_id: "mock-maldivas", airline: "EK", flight_number: "EK262", origin_iata: "GRU", destination_iata: "DXB", departure_date: past(45), departure_time: "03:15", arrival_time: "22:30", direction: "ida", flight_class: "Executiva", segment_order: 1 },
      { id: "seg-m2", sale_id: "mock-maldivas", airline: "EK", flight_number: "EK652", origin_iata: "DXB", destination_iata: "MLE", departure_date: past(44), departure_time: "04:00", arrival_time: "09:15", direction: "ida", flight_class: "Executiva", segment_order: 2 },
      { id: "seg-m3", sale_id: "mock-maldivas", airline: "EK", flight_number: "EK653", origin_iata: "MLE", destination_iata: "DXB", departure_date: past(35), departure_time: "14:00", arrival_time: "17:30", direction: "volta", flight_class: "Executiva", segment_order: 3 },
      { id: "seg-m4", sale_id: "mock-maldivas", airline: "EK", flight_number: "EK261", origin_iata: "DXB", destination_iata: "GRU", departure_date: past(35), departure_time: "22:00", arrival_time: "06:30", direction: "volta", flight_class: "Executiva", segment_order: 4 },
    ],
    hotels: [
      { id: "h-m1", hotel_name: "Soneva Fushi, Baa Atoll", description: "Soneva Fushi, Maldivas", category: "hotel", product_type: "hotel", reservation_code: "SON-2200", hotel_checkin_datetime_utc: past(44), notes: "Villa sobre a água com piscina privativa • All-inclusive premium • Spa incluído" },
    ],
    services: [
      { id: "s-m1", description: "Speedboat transfer Malé → Soneva Fushi", category: "transfer", product_type: "transfer" },
      { id: "s-m2", description: "Mergulho com golfinhos · excursão privada", category: "passeio", product_type: "passeio" },
      { id: "s-m3", description: "Jantar privativo na praia ao pôr do sol", category: "gastronomia", product_type: "passeio" },
      { id: "s-m4", description: "Sessão de fotos profissional · Casal", category: "experiencia", product_type: "passeio" },
      { id: "s-m5", description: "Seguro Viagem GTA Full · Casal", category: "seguro", product_type: "seguro", reservation_code: "GTA-111234" },
    ],
    lodging: [],
    attachments: [],
    financial: {
      receivables: [
        { id: "r-m1", gross_value: 22666, status: "recebido", due_date: past(90), payment_method: "PIX", description: "1ª parcela", installment_number: 1, installment_total: 3 },
        { id: "r-m2", gross_value: 22666, status: "recebido", due_date: past(60), payment_method: "Cartão de crédito", description: "2ª parcela", installment_number: 2, installment_total: 3 },
        { id: "r-m3", gross_value: 22668, status: "recebido", due_date: past(30), payment_method: "PIX", description: "3ª parcela", installment_number: 3, installment_total: 3 },
      ],
    },
    passengers: [
      { id: "p-m1", full_name: "Tiago Silva", document_number: "AB123456", birth_date: "1988-05-15", role: "titular" },
      { id: "p-m2", full_name: "Marina Silva", document_number: "CD789012", birth_date: "1990-08-22", role: "acompanhante" },
    ],
    sellerName: "Amanda NatLeva",
  },

  // ===== TRIP 4: Patagônia (em andamento) =====
  {
    id: "mock-patagonia",
    sale_id: "mock-patagonia",
    custom_title: "Patagônia Argentina",
    subtitle: "Aventura & Natureza",
    cover_image_url: patagoniaImg,
    notes_for_client: "Tiago, aproveite cada segundo dessa aventura na Patagônia! 🏔️❄️\n\nO Perito Moreno é de tirar o fôlego. Não esqueça de levar roupas bem quentes!\n\nEquipe NatLeva",
    sale: {
      id: "mock-patagonia",
      name: "Patagônia Argentina",
      status: "confirmada",
      origin_iata: "GRU",
      destination_iata: "FTE",
      departure_date: past(2),
      return_date: future(6),
      total_sale_value: 18500,
      seller_id: null,
    },
    segments: [
      { id: "seg-p1", sale_id: "mock-patagonia", airline: "AR", flight_number: "AR1131", origin_iata: "GRU", destination_iata: "EZE", departure_date: past(2), departure_time: "08:00", arrival_time: "11:30", direction: "ida", flight_class: "Econômica", segment_order: 1 },
      { id: "seg-p2", sale_id: "mock-patagonia", airline: "AR", flight_number: "AR1872", origin_iata: "EZE", destination_iata: "FTE", departure_date: past(2), departure_time: "14:00", arrival_time: "17:30", direction: "ida", flight_class: "Econômica", segment_order: 2 },
      { id: "seg-p3", sale_id: "mock-patagonia", airline: "AR", flight_number: "AR1873", origin_iata: "FTE", destination_iata: "EZE", departure_date: future(6), departure_time: "10:00", arrival_time: "13:30", direction: "volta", flight_class: "Econômica", segment_order: 3 },
      { id: "seg-p4", sale_id: "mock-patagonia", airline: "AR", flight_number: "AR1130", origin_iata: "EZE", destination_iata: "GRU", departure_date: future(6), departure_time: "16:00", arrival_time: "19:00", direction: "volta", flight_class: "Econômica", segment_order: 4 },
    ],
    hotels: [
      { id: "h-p1", hotel_name: "Los Cerros del Chaltén Boutique Hotel", description: "Los Cerros, El Chaltén", category: "hotel", product_type: "hotel", reservation_code: "CER-4401", hotel_checkin_datetime_utc: past(2), notes: "Quarto com vista para o Fitz Roy • Café da manhã premium incluído" },
      { id: "h-p2", hotel_name: "Esplendor El Calafate", description: "Esplendor, El Calafate", category: "hotel", product_type: "hotel", reservation_code: "ESP-7712", hotel_checkin_datetime_utc: future(2), notes: "Suite executiva com vista lago • Transfer incluso ao Perito Moreno" },
    ],
    services: [
      { id: "s-p1", description: "Trekking Glaciar Perito Moreno · Mini Trek", category: "passeio", product_type: "passeio", reservation_code: "PM-3301" },
      { id: "s-p2", description: "Trekking Laguna de Los Tres (Fitz Roy)", category: "passeio", product_type: "passeio" },
      { id: "s-p3", description: "Navegação pelos Glaciares (Spegazzini + Upsala)", category: "passeio", product_type: "passeio", reservation_code: "NAV-5501" },
      { id: "s-p4", description: "Aluguel SUV · 8 dias", category: "transfer", product_type: "transfer", reservation_code: "HERTZ-8801" },
      { id: "s-p5", description: "Seguro Viagem Universal · 1 pax", category: "seguro", product_type: "seguro" },
    ],
    lodging: [],
    attachments: [],
    financial: {
      receivables: [
        { id: "r-p1", gross_value: 9250, status: "recebido", due_date: past(30), payment_method: "PIX", description: "1ª parcela", installment_number: 1, installment_total: 2 },
        { id: "r-p2", gross_value: 9250, status: "recebido", due_date: past(5), payment_method: "PIX", description: "2ª parcela", installment_number: 2, installment_total: 2 },
      ],
    },
    passengers: [
      { id: "p-p1", full_name: "Tiago Silva", document_number: "AB123456", birth_date: "1988-05-15", role: "titular" },
    ],
    sellerName: "Amanda NatLeva",
  },
];

export function getMockTripsForDashboard() {
  return mockTrips.map((t) => ({
    id: t.id,
    sale_id: t.sale_id,
    custom_title: t.custom_title,
    subtitle: t.subtitle,
    cover_image_url: t.cover_image_url,
    sale: t.sale,
    segments: t.segments,
  }));
}

export function getMockTripDetail(saleId: string): MockTrip | undefined {
  return mockTrips.find((t) => t.sale_id === saleId);
}
