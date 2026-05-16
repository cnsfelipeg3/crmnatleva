// Edge function: extract-booking-data
// Extrai dados estruturados de voos / hotéis / experiências a partir de
// imagem ou PDF usando Lovable AI Gateway (Gemini 2.5 Flash com visão).
//
// IMPORTANTE: o schema de voo segue EXATAMENTE o shape esperado pelo
// componente ProposalFlightSearch (FlightSegmentData) para que o
// preenchimento no frontend seja 1-para-1, sem necessidade de
// transformações pesadas no cliente.

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

type ItemType =
  | "flight"
  | "hotel"
  | "experience"
  | "cruise"
  | "insurance"
  | "transfer"
  | "train"
  | "car"
  | "tour"
  | "ticket"
  | "itinerary"
  | "other";

const FLIGHT_SCHEMA = {
  name: "extract_flight",
  description:
    "Extrai TODOS os trechos de uma reserva ou cotação de VOO AÉREO. Cada conexão é um segmento separado em flight_segments.",
  parameters: {
    type: "object",
    properties: {
      title: {
        type: "string",
        description:
          "Título descritivo curto. Ex.: 'GRU → FCO via LIS · LATAM/TAP' ou 'Ida GRU → CDG · Air France direto'. Se for ida e volta, indique 'Ida e Volta'. Não use só códigos isolados.",
      },
      description: {
        type: "string",
        description:
          "Frase opcional com observações úteis: classe tarifária, programa, política de bagagem ou tipo de tarifa.",
      },
      data: {
        type: "object",
        properties: {
          cabin_class: {
            type: "string",
            description: "Econômica, Premium Economy, Executiva, Primeira",
          },
          fare_type: {
            type: "string",
            description: "Tipo da tarifa (ex.: Light, Plus, Top, Flex, Saver)",
          },
          locator: { type: "string", description: "Código localizador / PNR" },
          price: { type: "number", description: "Preço total se visível" },
          currency: { type: "string", description: "Moeda (BRL, USD, EUR...)" },
          itinerary_type: {
            type: "string",
            enum: ["ROUND_TRIP", "ONE_WAY", "OPEN_JAW", "MULTI_CITY"],
            description:
              "Classificação do itinerário: ROUND_TRIP (ida e volta no mesmo par origem-destino), ONE_WAY (somente ida, sem retorno), OPEN_JAW (volta parte ou chega em cidade diferente), MULTI_CITY (3+ trechos em cidades distintas).",
          },
          trip_direction_summary: {
            type: "string",
            description:
              "Resumo curto e humano do tipo de itinerário detectado. Ex.: 'Ida e Volta', 'Somente Ida', 'Open-Jaw GRU→FCO / VCE→GRU', 'Multi-trecho 4 cidades'.",
          },
          flight_segments: {
            type: "array",
            description:
              "Lista ORDENADA de TODOS os trechos. Conexões viram segmentos separados. NUNCA agrupe trechos em um só. Inclua TANTO os trechos de IDA quanto os de VOLTA quando houver retorno.",
            items: {
              type: "object",
              properties: {
                airline: {
                  type: "string",
                  description: "Código IATA da companhia (ex.: LA, AF, TP, AD)",
                },
                airline_name: {
                  type: "string",
                  description: "Nome completo da companhia (ex.: 'LATAM Airlines')",
                },
                flight_number: {
                  type: "string",
                  description: "Número do voo SEM o código IATA (ex.: '8084')",
                },
                origin_iata: {
                  type: "string",
                  description: "Código IATA do aeroporto de origem (3 letras)",
                },
                destination_iata: {
                  type: "string",
                  description: "Código IATA do aeroporto de destino (3 letras)",
                },
                departure_date: {
                  type: "string",
                  description: "Data de partida em YYYY-MM-DD",
                },
                departure_time: {
                  type: "string",
                  description: "Hora de partida em HH:MM (24h, fuso local da origem)",
                },
                arrival_time: {
                  type: "string",
                  description: "Hora de chegada em HH:MM (24h, fuso local do destino)",
                },
                arrival_date: {
                  type: "string",
                  description: "Data de chegada YYYY-MM-DD (preencher se diferente da partida)",
                },
                duration_minutes: {
                  type: "number",
                  description: "Duração total do trecho em minutos. Se ver '12h 01m', informe 721.",
                },
                terminal: { type: "string", description: "Terminal de embarque" },
                arrival_terminal: { type: "string", description: "Terminal de desembarque" },
                aircraft_type: { type: "string", description: "Modelo da aeronave" },
                is_connection: {
                  type: "boolean",
                  description:
                    "true para TODOS os trechos depois do primeiro de cada itinerário (ida ou volta). Primeiro trecho de cada perna é false.",
                },
                direction: {
                  type: "string",
                  enum: ["ida", "volta", "trecho"],
                  description:
                    "Marque 'ida' para trechos do itinerário de ida, 'volta' para os de retorno, 'trecho' para multi-city sem ida/volta clara.",
                },
                carry_on_included: { type: "boolean" },
                carry_on_weight_kg: { type: "number" },
                checked_bags_included: {
                  type: "number",
                  description: "Quantidade de malas despachadas inclusas (0 se não incluso)",
                },
                checked_bag_weight_kg: {
                  type: "number",
                  description: "Peso por mala despachada (geralmente 23 ou 32)",
                },
                baggage_notes: { type: "string", description: "Notas livres sobre bagagem" },
                notes: { type: "string", description: "Outras notas relevantes" },
              },
              required: ["origin_iata", "destination_iata"],
            },
          },
        },
        required: ["flight_segments"],
      },
    },
    required: ["title", "data"],
  },
};

const HOTEL_SCHEMA = {
  name: "extract_hotel",
  description: "Extrai dados de uma reserva ou cotação de HOTEL com inteligência de regime, política e categoria.",
  parameters: {
    type: "object",
    properties: {
      title: {
        type: "string",
        description:
          "Nome LIMPO e CURTO do hotel para uso como título visual. REGRAS RÍGIDAS: (a) Use APENAS o nome principal da propriedade (ex.: 'Siyam World Maldives', 'Belmond Hotel Splendido', 'Fasano São Paulo'). (b) Pode acrescentar o regime no final SOMENTE se for icônico/all-inclusive (ex.: 'Siyam World Maldives - All Inclusive'). (c) NUNCA inclua: descrições promocionais ('24-Hour Premium', 'Free Transfer', 'with Breakfast'), durações ('5 nights'), tipos de quarto, categorias por estrelas, cidade/país, códigos de reserva, preços ou textos de marketing do Booking/Decolar/Expedia. (d) Máximo ~60 caracteres. (e) Capitalize corretamente (Title Case)."
      },
      description: {
        type: "string",
        description:
          "Descrição curta humana com cidade, categoria e regime. Ex.: 'Hotel 5★ em Roma · Café da manhã · Quarto Deluxe Vista Cidade'.",
      },
      data: {
        type: "object",
        properties: {
          location: { type: "string", description: "Cidade, país ou endereço completo" },
          address: { type: "string", description: "Endereço completo se visível" },
          city: { type: "string" },
          country: { type: "string" },
          stars: { type: "number", description: "Categoria oficial em estrelas (1-5)" },
          rating: { type: "number", description: "Nota de avaliação dos hóspedes (0-10)" },
          rating_source: { type: "string", description: "Fonte da nota (Booking, Google, TripAdvisor, etc.)" },
          reviews_count: { type: "number" },
          room_type: {
            type: "string",
            description:
              "Nome ESSENCIAL da categoria do quarto/acomodação, somente o núcleo identificador (ex.: 'Lagoon Villa with Pool', 'Deluxe Double', 'Suite Vista Mar', 'Beach Bungalow'). PROIBIDO incluir: perks/cortesias ('Free seaplane', 'Free transfer', 'Welcome drink'), campanhas ('24h All Inclusive'), número de hóspedes, área em m², regime alimentar, vista (a menos que faça parte do nome oficial curto, ex.: 'Suite Vista Mar'), código tarifário, ou qualquer texto após hífen/'+' que descreva benefícios. Se o nome original tiver separadores como ' - ', ' + ', ' | ' ou ' / ', mantenha apenas o segmento principal antes deles. Máx. ~40 caracteres.",
          },
          bed_configuration: { type: "string", description: "Configuração de camas (1 King, 2 Twin, etc.)" },
          view: { type: "string", description: "Vista do quarto (mar, cidade, jardim, etc.)" },
          meal_plan: {
            type: "string",
            description:
              "Regime de refeição NORMALIZADO: 'Sem refeição', 'Café da manhã', 'Meia pensão', 'Pensão completa', 'All inclusive'.",
          },
          meal_plan_code: {
            type: "string",
            enum: ["RO", "BB", "HB", "FB", "AI"],
            description: "Código do regime: RO=Room Only, BB=Bed&Breakfast, HB=Half Board, FB=Full Board, AI=All Inclusive.",
          },
          phone: { type: "string" },
          email: { type: "string" },
          website: { type: "string" },
          checkin_date: { type: "string", description: "YYYY-MM-DD" },
          checkout_date: { type: "string", description: "YYYY-MM-DD" },
          checkin_time: { type: "string", description: "HH:MM" },
          checkout_time: { type: "string", description: "HH:MM" },
          nights: { type: "number", description: "Calcule a partir das datas se não vier explícito" },
          guests: { type: "number", description: "Total de hóspedes" },
          adults: { type: "number" },
          children: { type: "number" },
          rooms: { type: "number", description: "Quantidade de quartos reservados" },
          price_per_night: { type: "number" },
          total_price: { type: "number" },
          taxes_included: { type: "boolean" },
          currency: { type: "string" },
          cancellation_policy: { type: "string", description: "Política completa de cancelamento" },
          is_refundable: { type: "boolean", description: "true se a tarifa for reembolsável" },
          free_cancellation_until: { type: "string", description: "YYYY-MM-DD até quando o cancelamento é gratuito" },
          payment_policy: { type: "string", description: "Pagar agora, pagar no hotel, etc." },
          locator: { type: "string", description: "Localizador / código de reserva" },
          provider: { type: "string", description: "Booking, Decolar, Expedia, hotel direto, etc." },
          amenities: {
            type: "array",
            items: { type: "string" },
            description: "Lista de comodidades visíveis (Wi-Fi, piscina, spa, academia, etc.)",
          },
        },
      },
    },
    required: ["title", "data"],
  },
};

const EXPERIENCE_SCHEMA = {
  name: "extract_experience",
  description: "Extrai dados de uma EXPERIÊNCIA / passeio / ingresso.",
  parameters: {
    type: "object",
    properties: {
      title: { type: "string" },
      description: { type: "string" },
      data: {
        type: "object",
        properties: {
          location: { type: "string" },
          duration: { type: "string" },
          date: { type: "string", description: "YYYY-MM-DD se houver" },
          start_time: { type: "string", description: "HH:MM" },
          includes: { type: "string" },
          provider: { type: "string" },
          price: { type: "number" },
          currency: { type: "string" },
          guests: { type: "number" },
          locator: { type: "string" },
        },
      },
    },
    required: ["title", "data"],
  },
};

const CRUISE_SCHEMA = {
  name: "extract_cruise",
  description:
    "Extrai dados estruturados de uma reserva, cotação ou itinerário de CRUZEIRO marítimo/fluvial. Inclui navio, companhia, itinerário dia-a-dia (portos com horários), cabine e preços.",
  parameters: {
    type: "object",
    properties: {
      title: {
        type: "string",
        description:
          "Título curto e humano. Padrão: '<Navio> · <N> noites pelo <Região>'. Ex.: 'MSC Seaside · 7 noites pelo Caribe', 'Norwegian Epic · 11 noites Mediterrâneo'. Sem códigos isolados, sem marketing. Máx ~70 chars.",
      },
      description: {
        type: "string",
        description:
          "Frase opcional curta com regime, embarque/desembarque e tipo de cabine. Ex.: 'Embarque em Santos · Cabine Balcony · Pensão completa + bebidas'.",
      },
      data: {
        type: "object",
        properties: {
          cruise_line: { type: "string", description: "Companhia (MSC Cruzeiros, Costa, Norwegian, Royal Caribbean, Disney, Viking, etc.)" },
          ship_name: { type: "string", description: "Nome do navio (ex.: 'MSC Seaside', 'Costa Diadema')" },
          region: { type: "string", description: "Região do roteiro (Caribe, Mediterrâneo, Costa Brasileira, Fiordes Noruegueses, etc.)" },
          nights: { type: "number", description: "Número total de noites a bordo" },
          embark_port: { type: "string", description: "Porto de embarque (cidade)" },
          embark_country: { type: "string" },
          disembark_port: { type: "string", description: "Porto de desembarque (cidade)" },
          disembark_country: { type: "string" },
          embark_date: { type: "string", description: "Data de embarque YYYY-MM-DD" },
          disembark_date: { type: "string", description: "Data de desembarque YYYY-MM-DD" },
          embark_time: { type: "string", description: "Hora de embarque HH:MM (24h)" },
          all_aboard_time: { type: "string", description: "Horário limite a bordo HH:MM" },
          cabin_category: {
            type: "string",
            enum: ["Interna", "Externa", "Balcony", "Varanda", "Suíte", "Suíte Premium", "Yacht Club", "The Haven", "Concierge", "Outra"],
            description: "Categoria geral da cabine NORMALIZADA",
          },
          cabin_type: { type: "string", description: "Nome comercial da cabine (ex.: 'Balcony Aurea', 'Suite Yacht Club Deluxe', 'Cabine Externa Vista Mar')" },
          cabin_number: { type: "string", description: "Número da cabine se visível" },
          deck: { type: "string", description: "Deck/Andar (ex.: 'Deck 10', 'Deck 14')" },
          cabin_size_sqm: { type: "number" },
          balcony_size_sqm: { type: "number" },
          bed_configuration: { type: "string", description: "Configuração de camas (King, 2 Twin convertíveis, Beliche, etc.)" },
          guests: { type: "number", description: "Total de hóspedes" },
          adults: { type: "number" },
          children: { type: "number" },
          meal_plan: {
            type: "string",
            description:
              "Regime de alimentação NORMALIZADO: 'Pensão completa', 'All inclusive', 'Bebidas inclusas', 'Premium All Inclusive', 'Easy Package'. Use o que se aproximar mais do que está visível.",
          },
          drinks_package: { type: "string", description: "Pacote de bebidas, se houver (ex.: 'Easy Package', 'Premium Extra')" },
          wifi_included: { type: "boolean" },
          gratuities_included: { type: "boolean", description: "true se taxas de serviço/gorjetas estão inclusas" },
          port_taxes: { type: "number", description: "Valor das taxas portuárias se separado" },
          total_price: { type: "number" },
          price_per_person: { type: "number" },
          currency: { type: "string" },
          provider: { type: "string", description: "Operadora/loja (CVC, MSC direto, Costa direto, agência, etc.)" },
          locator: { type: "string", description: "Localizador/código da reserva" },
          amenities: {
            type: "array",
            items: { type: "string" },
            description: "Comodidades a bordo visíveis (piscinas, spa, teatro, casino, kids club, etc.)",
          },
          includes: {
            type: "array",
            items: { type: "string" },
            description: "O que está incluso no preço (refeições, bebidas, taxas, gorjetas, transfer, excursão x, etc.)",
          },
          excludes: {
            type: "array",
            items: { type: "string" },
            description: "O que NÃO está incluso (excursões, bebidas premium, spa, etc.)",
          },
          itinerary: {
            type: "array",
            description:
              "Roteiro DIA-A-DIA do cruzeiro, em ordem cronológica. UM item por dia. Inclua dias de navegação como is_sea_day=true (porto pode ser 'Dia no Mar' ou 'Navegação').",
            items: {
              type: "object",
              properties: {
                day: { type: "number", description: "Número do dia (1, 2, 3...)" },
                date: { type: "string", description: "Data YYYY-MM-DD" },
                port: { type: "string", description: "Nome do porto/cidade. Para dias de navegação use 'Dia no Mar'." },
                country: { type: "string", description: "País do porto (omita em dias no mar)" },
                arrival_time: { type: "string", description: "Hora de chegada no porto HH:MM (omita em dias no mar)" },
                departure_time: { type: "string", description: "Hora de saída do porto HH:MM (omita em dias no mar)" },
                is_sea_day: { type: "boolean", description: "true para dias inteiros de navegação sem parada em porto" },
                description: { type: "string", description: "Descrição opcional curta do dia (excursões sugeridas, destaques, atividades a bordo)" },
              },
              required: ["day", "port"],
            },
          },
          cancellation_policy: { type: "string" },
          payment_policy: { type: "string" },
          notes: { type: "string", description: "Observações livres relevantes" },
        },
        required: ["itinerary"],
      },
    },
    required: ["title", "data"],
  },
};

const INSURANCE_SCHEMA = {
  name: "extract_insurance",
  description:
    "Extrai dados estruturados de uma apólice/cotação de SEGURO VIAGEM (Assist Card, Affinity, Coris, GTA, Universal Assistance, Allianz, Travel Ace, AXA, etc.). Inclui plano, vigência, cobertura completa e preço.",
  parameters: {
    type: "object",
    properties: {
      title: {
        type: "string",
        description:
          "Título humano e curto. Padrão: '<Operadora> · <Plano> · <Destino/Região>'. Ex.: 'Assist Card AC 250 Mundo · Europa', 'Coris 60 Especial Brasil'. Sem códigos isolados nem marketing. Máx ~70 chars.",
      },
      description: {
        type: "string",
        description:
          "Frase curta com vigência, número de viajantes e principais coberturas. Ex.: 'Cobertura mundial · 12 dias · 2 viajantes · DMH USD 250 mil'.",
      },
      data: {
        type: "object",
        properties: {
          provider: { type: "string", description: "Operadora/seguradora (Assist Card, Coris, GTA, Universal, Allianz, Travel Ace, AXA, etc.)" },
          plan_name: { type: "string", description: "Nome comercial do plano (ex.: 'AC 250 Mundo Inclusive', 'GTA 60 Especial', 'Allianz Plus 100')" },
          coverage_region: {
            type: "string",
            enum: ["Brasil", "América do Sul", "Mercosul", "Europa", "América do Norte", "Mundo todo", "Mundo todo exceto EUA/Canadá", "Outra"],
            description: "Região coberta NORMALIZADA",
          },
          start_date: { type: "string", description: "Início da vigência YYYY-MM-DD" },
          end_date: { type: "string", description: "Fim da vigência YYYY-MM-DD" },
          days: { type: "number", description: "Dias totais de cobertura" },
          travelers: { type: "number", description: "Quantidade de viajantes cobertos" },
          ages: { type: "string", description: "Faixa etária dos viajantes (ex.: '0-70 anos', '2 adultos + 1 criança')" },
          currency: { type: "string", description: "Moeda do preço (BRL, USD, EUR)" },
          price_total: { type: "number", description: "Preço total da apólice" },
          price_per_person: { type: "number" },
          is_courtesy: { type: "boolean", description: "true se for cortesia / brinde da agência (omita se não houver indicação)" },
          locator: { type: "string", description: "Número da apólice ou código da cotação" },
          coverages: {
            type: "array",
            description:
              "Lista detalhada de coberturas com nome e valor. Capture TUDO que estiver visível: DMH, DMHO, traslado médico, traslado de corpo, regresso sanitário, bagagem extraviada, atraso de bagagem, cancelamento, interrupção, invalidez, morte acidental, gestante, esportes, COVID, telemedicina, assistência jurídica, etc.",
            items: {
              type: "object",
              properties: {
                name: { type: "string", description: "Nome da cobertura (ex.: 'Despesas Médicas e Hospitalares', 'Bagagem Extraviada')" },
                value: { type: "string", description: "Valor com moeda e formato original (ex.: 'USD 250.000', 'R$ 5.000', 'até USD 1.500')" },
                category: {
                  type: "string",
                  enum: ["Médico", "Bagagem", "Cancelamento", "Assistência", "Acidentes", "Esportes", "Outras"],
                  description: "Categoria NORMALIZADA",
                },
              },
              required: ["name", "value"],
            },
          },
          highlights: {
            type: "array",
            items: { type: "string" },
            description: "Diferenciais/destaques do plano (ex.: 'Cobertura COVID-19', 'Esportes radicais inclusos', 'Telemedicina 24h')",
          },
          excludes: {
            type: "array",
            items: { type: "string" },
            description: "Exclusões importantes da apólice",
          },
          notes: { type: "string", description: "Observações livres relevantes (carências, franquias, etc.)" },
        },
        required: ["coverages"],
      },
    },
    required: ["title", "data"],
  },
};

// Generic schema reused for transfer / train / car / tour / ticket / itinerary / other.
// Captures the most useful structured fields for any travel item without forcing
// a domain-specific shape.
const GENERIC_SCHEMA = {
  name: "extract_generic_item",
  description:
    "Extrai dados estruturados de um item genérico de viagem (transfer, trem, aluguel de carro, passeio, ingresso, roteiro personalizado ou outro). Use os campos disponíveis e omita o que não estiver claramente visível.",
  parameters: {
    type: "object",
    properties: {
      title: {
        type: "string",
        description:
          "Título humano e curto. Padrão sugerido: '<Tipo> · <Origem → Destino ou Local>'. Ex.: 'Transfer privativo · GRU → Hotel Fasano', 'Trem Roma → Florença · Frecciarossa', 'Aluguel Carro · Localiza Compacto · Salvador', 'Passeio · City Tour Lisboa', 'Ingresso · Disney Magic Kingdom 1 dia'. Sem marketing, sem códigos isolados. Máx ~70 chars.",
      },
      description: {
        type: "string",
        description:
          "Frase curta com os destaques principais (data, duração, fornecedor, o que está incluso). Ex.: '14/06 · 09h · 2 adultos · Inclui guia em português'.",
      },
      data: {
        type: "object",
        properties: {
          location: { type: "string", description: "Cidade/local principal do item" },
          country: { type: "string" },
          start_date: { type: "string", description: "Data inicial YYYY-MM-DD" },
          end_date: { type: "string", description: "Data final YYYY-MM-DD se houver" },
          start_time: { type: "string", description: "HH:MM (24h)" },
          end_time: { type: "string", description: "HH:MM (24h)" },
          duration: { type: "string", description: "Duração legível (ex.: '3h', '8 horas', '5 dias')" },

          // Transfer / car / train specifics
          pickup_location: { type: "string", description: "Local de retirada/embarque (aeroporto, hotel, estação)" },
          dropoff_location: { type: "string", description: "Local de entrega/desembarque" },
          origin: { type: "string", description: "Origem (cidade ou estação)" },
          destination: { type: "string", description: "Destino (cidade ou estação)" },
          vehicle_type: { type: "string", description: "Tipo de veículo / categoria (Sedan, SUV, Van, Compacto, etc.)" },
          vehicle_class: { type: "string", description: "Classe (Standard, Executivo, Luxo, Primeira Classe, etc.)" },
          seats: { type: "number", description: "Número de assentos / passageiros" },
          luggage_capacity: { type: "string", description: "Capacidade de bagagem (ex.: '3 malas grandes')" },
          transmission: { type: "string", description: "Câmbio (Automático, Manual)" },
          train_number: { type: "string", description: "Número do trem se houver" },
          train_operator: { type: "string", description: "Operadora ferroviária (Trenitalia, SNCF, Renfe, Eurostar)" },
          car_rental_company: { type: "string", description: "Locadora (Localiza, Hertz, Avis, Sixt, etc.)" },

          // Tour / ticket / itinerary specifics
          provider: { type: "string", description: "Fornecedor / operador (GetYourGuide, Civitatis, Disney, etc.)" },
          guide_language: { type: "string", description: "Idioma do guia (Português, Inglês, Espanhol)" },
          meeting_point: { type: "string", description: "Ponto de encontro" },
          attraction: { type: "string", description: "Atração / parque / venue (ex.: 'Magic Kingdom', 'Coliseu')" },
          ticket_type: { type: "string", description: "Tipo de ingresso (1 dia, Park Hopper, VIP, Skip the line)" },

          // Generic
          guests: { type: "number", description: "Número total de participantes" },
          adults: { type: "number" },
          children: { type: "number" },
          includes: {
            type: "array",
            items: { type: "string" },
            description: "Itens inclusos (guia, ingresso, transporte, refeição, seguro, taxas, etc.)",
          },
          excludes: {
            type: "array",
            items: { type: "string" },
            description: "Itens não inclusos",
          },
          amenities: {
            type: "array",
            items: { type: "string" },
            description: "Comodidades / diferenciais (Wi-Fi, ar-condicionado, água a bordo, etc.)",
          },
          price_total: { type: "number" },
          price_per_person: { type: "number" },
          currency: { type: "string", description: "BRL, USD, EUR, etc." },
          locator: { type: "string", description: "Código de reserva / voucher" },
          cancellation_policy: { type: "string" },
          notes: { type: "string", description: "Observações livres relevantes" },
        },
      },
    },
    required: ["title", "data"],
  },
};

const SCHEMAS: Record<ItemType, any> = {
  flight: FLIGHT_SCHEMA,
  hotel: HOTEL_SCHEMA,
  experience: EXPERIENCE_SCHEMA,
  cruise: CRUISE_SCHEMA,
  insurance: INSURANCE_SCHEMA,
  transfer: GENERIC_SCHEMA,
  train: GENERIC_SCHEMA,
  car: GENERIC_SCHEMA,
  tour: GENERIC_SCHEMA,
  ticket: GENERIC_SCHEMA,
  itinerary: GENERIC_SCHEMA,
  other: GENERIC_SCHEMA,
};

const GENERIC_PROMPT_BASE =
  "Você extrai dados estruturados de imagens/PDFs de itens de viagem para um sistema de propostas. Regras: (1) Datas SEMPRE em YYYY-MM-DD; horários em HH:MM 24h. (2) Capture origem, destino, datas, horários, fornecedor, valores e tudo que estiver visível. (3) Liste 'includes' e 'excludes' como arrays separados. (4) Construa um título curto, humano, sem marketing nem códigos. (5) Omita campos sem evidência clara em vez de inventar.";

const SYSTEM_PROMPTS: Record<ItemType, string> = {
  flight:
    "Você é um extrator preciso de dados de voos para um sistema de propostas de viagem. Sua MISSÃO é destrinchar a imagem/PDF e listar TODOS os trechos (ida + volta + conexões) como segmentos separados em flight_segments, na ordem cronológica. Regras: (1) Cada conexão é um segmento próprio; nunca agrupe origem-destino final ignorando paradas. (2) Sempre normalize horários para HH:MM 24h e datas para YYYY-MM-DD no fuso LOCAL de cada aeroporto exibido. (3) Para cada trecho posterior ao primeiro de cada perna marque is_connection=true. O PRIMEIRO trecho da volta deve ser is_connection=false. (4) Converta durações como '12h 01m' para minutos (721). (5) Códigos IATA SEMPRE em 3 letras maiúsculas. (6) flight_number sem o prefixo IATA (ex.: para 'LA8084' devolva '8084' e airline='LA'). (7) Se houver bagagem despachada, preencha checked_bags_included e checked_bag_weight_kg; se não, 0. (8) CLASSIFIQUE o itinerary_type: ROUND_TRIP se há ida E volta entre o mesmo par de cidades; ONE_WAY se só ida sem retorno; OPEN_JAW se a volta sai/chega em cidade diferente; MULTI_CITY se forem 3+ cidades distintas em sequência. (9) Marque cada segmento com direction='ida' ou 'volta' (ou 'trecho' em multi-city). (10) Construa title humano (ex.: 'GRU → FCO · LATAM · Ida e Volta' ou 'GRU → CDG · Air France · Somente Ida'). (11) ATENÇÃO ESPECIAL A CONEXÕES: uma conexão típica dura entre 1h e 12h (no máximo 24h). NUNCA gere uma conexão maior que 24h — se a diferença entre o desembarque do trecho anterior e o embarque do próximo ultrapassa 24h, isso normalmente NÃO é conexão e sim início de outra perna da viagem (geralmente a volta). Se o passageiro chegou ao destino, ficou hospedado alguns dias e só depois embarcou de novo, preserve a data real mostrada para a volta e NÃO puxe o próximo voo para o mesmo dia da chegada. Ex.: chegou em MLE em 13/05 e o próximo voo saindo de MLE está em 19/05; isso é volta, não conexão. (12) Se houver conexão curta no mesmo aeroporto, sempre escolha a data que gere a menor conexão plausível. (13) Omita campos sem evidência clara em vez de inventar.",
  hotel:
    "Você é um extrator preciso de reservas e cotações de HOTEL (Booking, Decolar, Expedia, sites de hotéis, e-mails de confirmação). MISSÃO: extrair TODOS os dados visíveis com normalização rigorosa. Regras: (1) Datas SEMPRE em YYYY-MM-DD; horários em HH:MM 24h. (2) Calcule nights a partir de checkin/checkout se não vier explícito. (3) NORMALIZE meal_plan para um destes valores: 'Sem refeição', 'Café da manhã', 'Meia pensão', 'Pensão completa', 'All inclusive'. Preencha também meal_plan_code (RO/BB/HB/FB/AI). (4) Detecte stars (categoria 1-5) e rating separadamente (nota dos hóspedes 0-10). (5) Identifique se a tarifa é reembolsável (is_refundable) e até quando o cancelamento é gratuito (free_cancellation_until em YYYY-MM-DD). (6) Liste amenities visíveis como array. (7) Construa um description curto e útil: 'Hotel 5★ em Roma · Café da manhã · Quarto Deluxe Vista Cidade'. (8) Identifique adults/children/rooms separadamente quando possível. (9) TÍTULO: o campo 'title' deve conter APENAS o nome principal do hotel (ex.: 'Siyam World Maldives'), opcionalmente seguido do regime se for all-inclusive (ex.: 'Siyam World Maldives - All Inclusive'). PROIBIDO incluir no title: textos promocionais do site ('24-Hour Premium All-inclusive with Free Transfer'), cidade/país, número de noites, tipo de quarto, estrelas, código da reserva ou qualquer copy de marketing. Esses dados ricos vão para 'description' e demais campos estruturados, NÃO no título. Máximo ~60 caracteres. Omita campos sem evidência em vez de inventar.",
  experience:
    "Você extrai dados estruturados de imagens/PDFs de experiências, passeios e ingressos turísticos. Normalize datas/horas (YYYY-MM-DD, HH:MM). Use null/omita quando não houver evidência clara.",
  cruise:
    "Você é um extrator preciso de reservas, cotações e itinerários de CRUZEIRO marítimo/fluvial (MSC, Costa, Norwegian, Royal Caribbean, Disney, Viking, CVC, agências). MISSÃO: extrair TUDO o que estiver visível e MONTAR o itinerário dia-a-dia COMPLETO. Regras CRÍTICAS: (1) Datas SEMPRE em YYYY-MM-DD; horários em HH:MM 24h. (2) Calcule nights a partir de embark_date/disembark_date se não vier explícito. (3) ITINERÁRIO: liste UM item por DIA da viagem, em ordem cronológica do dia 1 ao último. Para cada porto, capture nome da cidade/porto, país, hora de chegada e saída. Para dias inteiros de navegação use port='Dia no Mar' e is_sea_day=true (omita arrival/departure). (4) NORMALIZE cabin_category para um destes: 'Interna', 'Externa', 'Balcony', 'Varanda', 'Suíte', 'Suíte Premium', 'Yacht Club' (MSC), 'The Haven' (NCL), 'Concierge', 'Outra'. (5) Capture o NOME COMERCIAL da cabine em cabin_type (ex.: 'Balcony Aurea', 'Suite Yacht Club Deluxe'). (6) NORMALIZE meal_plan ('Pensão completa', 'All inclusive', 'Bebidas inclusas', 'Premium All Inclusive'). (7) Liste includes/excludes como arrays separados — refeições, bebidas, gorjetas, taxas, excursões, transfer. (8) Detecte gratuities_included, wifi_included como boolean. (9) TÍTULO: padrão '<Navio> · <N> noites pelo <Região>'. Ex.: 'MSC Seaside · 7 noites pelo Caribe'. PROIBIDO marketing, preços ou códigos no título. Máx ~70 chars. (10) Se a imagem mostrar apenas mapa/roteiro sem cabine, foque no itinerário e cruise_line/ship_name. (11) Omita campos sem evidência clara em vez de inventar.",
  insurance:
    "Você é um extrator preciso de apólices e cotações de SEGURO VIAGEM. MISSÃO: capturar TODAS as coberturas visíveis com seus valores exatos, normalizar provedor/plano/região, datas em YYYY-MM-DD. Regras CRÍTICAS: (1) Para cada cobertura crie UM item em coverages com name (texto amigável em pt-BR), value (preserve moeda e formato originais, ex.: 'USD 250.000', 'R$ 5.000', 'até USD 1.500') e category normalizada. (2) Liste TODAS as coberturas — não resuma. Inclua DMH, DMHO, traslado médico, traslado de corpo, regresso sanitário, bagagem extraviada/atraso, cancelamento, interrupção de viagem, invalidez/morte por acidente, gestante, esportes, COVID, telemedicina, assistência jurídica, fiança, regresso antecipado, etc. (3) NORMALIZE coverage_region para uma das opções do enum. (4) Se for cortesia/brinde da agência marque is_courtesy=true. (5) Se houver período visível, calcule days a partir de start_date/end_date. (6) TÍTULO padrão: '<Operadora> · <Plano> · <Região>'. PROIBIDO marketing ou códigos isolados no título. Máx ~70 chars. (7) Detecte highlights/diferenciais (cobertura COVID, esportes radicais, telemedicina). (8) Omita campos sem evidência em vez de inventar.",
  transfer:
    `${GENERIC_PROMPT_BASE} Foco: TRANSFER (aeroporto, hotel, privativo, compartilhado, executivo). Capture pickup_location, dropoff_location, vehicle_type, vehicle_class, seats, luggage_capacity, fornecedor, data, horário, idioma do motorista, total e moeda. Título sugerido: 'Transfer <privativo/compartilhado> · <origem> → <destino>'.`,
  train:
    `${GENERIC_PROMPT_BASE} Foco: TREM (Trenitalia, SNCF, Renfe, Eurostar, Eurail, JR Pass, AVE, ICE, Frecciarossa). Capture origin, destination, train_operator, train_number, vehicle_class (1ª/2ª classe, Business, Executive), data, horário de partida e chegada, duração, locator, preço total. Título sugerido: 'Trem <origem> → <destino> · <operadora>'.`,
  car:
    `${GENERIC_PROMPT_BASE} Foco: ALUGUEL DE CARRO (Localiza, Movida, Hertz, Avis, Sixt, Europcar, RentCars). Capture car_rental_company, vehicle_type/class, transmission, seats, pickup_location/dropoff_location, datas e horários, includes (proteções, seguro, GPS, motorista adicional), preço total e moeda. Título sugerido: 'Aluguel Carro · <locadora> · <categoria> · <cidade>'.`,
  tour:
    `${GENERIC_PROMPT_BASE} Foco: PASSEIO / EXCURSÃO / CITY TOUR (GetYourGuide, Civitatis, Viator, operadores locais). Capture provider, location, attraction, duration, guide_language, meeting_point, includes (guia, transporte, ingresso, refeição), data, horário, participantes (adults/children), preço. Título sugerido: 'Passeio · <atração/cidade>'.`,
  ticket:
    `${GENERIC_PROMPT_BASE} Foco: INGRESSO (parques temáticos, atrações, museus, shows, eventos esportivos). Capture attraction, ticket_type (1 dia, Park Hopper, VIP, Skip-the-Line, etc.), data válida, número de adultos e crianças, fornecedor, preço total e moeda, locator. Título sugerido: 'Ingresso · <atração> · <tipo>'.`,
  itinerary:
    `${GENERIC_PROMPT_BASE} Foco: ROTEIRO PERSONALIZADO dia a dia. Resuma o roteiro em description e capture start_date, end_date, duração total e principais inclusões em includes[]. Título sugerido: 'Roteiro · <região/cidade> · <N dias>'.`,
  other:
    `${GENERIC_PROMPT_BASE} Foco: ITEM GENÉRICO de viagem que não se encaixa em outra categoria. Preencha apenas os campos visíveis.`,
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json().catch(() => ({}));
    const item_type: ItemType = (body?.item_type as ItemType) || "flight";

    // Backwards-compat: aceita { image_base64, file_type } OU { images: [{base64, file_type}] }
    type ImgIn = { base64: string; file_type?: string };
    let images: ImgIn[] = [];
    if (Array.isArray(body?.images) && body.images.length > 0) {
      images = body.images
        .filter((it: any) => it && typeof it.base64 === "string" && it.base64.length > 0)
        .map((it: any) => ({ base64: it.base64, file_type: String(it.file_type || "png").toLowerCase() }));
    } else if (typeof body?.image_base64 === "string" && body.image_base64.length > 0) {
      images = [{ base64: body.image_base64, file_type: String(body?.file_type || "png").toLowerCase() }];
    }

    if (images.length === 0) {
      return json({ error: "Envie pelo menos uma imagem (image_base64 ou images[])." }, 400);
    }
    if (images.length > 20) {
      return json({ error: "Máximo de 20 arquivos por extração." }, 400);
    }
    if (!SCHEMAS[item_type]) {
      return json({ error: `item_type inválido: ${item_type}` }, 400);
    }
    const totalSize = images.reduce((acc, im) => acc + im.base64.length, 0);
    if (totalSize > 25 * 1024 * 1024 * 1.4) {
      return json({ error: "Arquivos muito grandes (máx ~25MB combinados)." }, 413);
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      return json({ error: "LOVABLE_API_KEY não configurada." }, 500);
    }

    const mimeFor = (ft: string) => {
      const f = (ft || "png").toLowerCase();
      if (f === "jpeg" || f === "jpg") return "image/jpeg";
      if (f === "webp") return "image/webp";
      if (f === "pdf") return "application/pdf";
      return "image/png";
    };

    const imageContents = images.map((im) => ({
      type: "image_url" as const,
      image_url: { url: `data:${mimeFor(im.file_type || "png")};base64,${im.base64}` },
    }));

    const schema = SCHEMAS[item_type];

    const today = new Date();
    const currentYear = today.getUTCFullYear();
    const todayISO = today.toISOString().slice(0, 10);
    const dateContext = `\n\nCONTEXTO TEMPORAL CRÍTICO: Hoje é ${todayISO}. O ano corrente é ${currentYear}. Quando a imagem mostrar apenas dia/mês sem ano explícito, ASSUMA SEMPRE o ano ${currentYear} (ou ${currentYear + 1} se a data já tiver passado neste ano). NUNCA use anos passados como ${currentYear - 1} ou anteriores — viagens são sempre futuras. Se enxergar um ano explícito na imagem (ex.: '2026', '/26'), use exatamente esse ano.`;

    const multiImageNote = images.length > 1
      ? `\n\nIMPORTANTE: Foram enviadas ${images.length} imagens/arquivos. CONSOLIDE TUDO em UMA única extração — use as imagens em conjunto para montar o itinerário completo (ex.: print da ida + print da volta = um único itinerário com todos os trechos em ordem cronológica). Não duplique trechos que aparecem em mais de uma imagem.`
      : "";

    const overnightContext = `\n\nVOOS OVERNIGHT / CHEGADA EM OUTRO DIA — REGRA CRÍTICA: muitos prints (Google Flights, Skyscanner, Decolar, e-tickets) mostram a chegada como "10:30 AM+1", "06:05+2", "+1 dia", "next day", "Overnight" ou similar — isso significa que a chegada é N DIAS DEPOIS da partida. SEMPRE que houver QUALQUER indicador de +1, +2, Overnight, próximo dia OU quando a hora de chegada for MENOR que a hora de partida (ex.: parte 20:30 e chega 16:50) OU a duração for >= 6h cruzando madrugada, você DEVE preencher arrival_date com a data CORRETA (departure_date + N dias). NUNCA copie arrival_date = departure_date sem checar. Para conexões: a partida do trecho seguinte usa a data REAL da chegada do trecho anterior (que pode ser o dia seguinte). Considere fusos horários ao calcular: GRU (UTC-3) -> DOH (UTC+3) tem +6h de diferença, então um voo que sai 20:30 GRU e dura 14h20 chega ~16:50 do dia SEGUINTE em DOH.`;

    const userText =
      item_type === "flight"
        ? `Extraia TODOS os trechos do voo destas imagens/PDFs como segmentos separados em flight_segments. Inclua conexões. Use a função fornecida e respeite o schema (IATA 3 letras, HH:MM 24h, YYYY-MM-DD, duration_minutes em minutos, is_connection true para trechos após o primeiro de cada itinerário).${multiImageNote}${dateContext}${overnightContext}`
        : `Extraia os dados desta(s) reserva(s)/cotação(ões) no formato estruturado da função. Se um campo não estiver claramente presente, omita-o.${multiImageNote}${dateContext}`;

    const aiResp = await fetch(
      "https://ai.gateway.lovable.dev/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash",
          messages: [
            { role: "system", content: SYSTEM_PROMPTS[item_type] },
            {
              role: "user",
              content: [
                { type: "text", text: userText },
                ...imageContents,
              ],
            },
          ],
          tools: [{ type: "function", function: schema }],
          tool_choice: { type: "function", function: { name: schema.name } },
        }),
      },
    );

    if (!aiResp.ok) {
      const errText = await aiResp.text();
      console.error("AI gateway error", aiResp.status, errText);
      if (aiResp.status === 429) {
        return json({ error: "Muitas requisições. Tente novamente em alguns segundos." }, 429);
      }
      if (aiResp.status === 402) {
        return json({ error: "Créditos do Lovable AI esgotados. Adicione créditos na Workspace." }, 402);
      }
      return json({ error: "Falha ao consultar a IA." }, 500);
    }

    const result = await aiResp.json();
    const toolCall = result?.choices?.[0]?.message?.tool_calls?.[0];
    const argsRaw = toolCall?.function?.arguments;

    if (!argsRaw) {
      console.error("No tool call in response", JSON.stringify(result).slice(0, 500));
      return json(
        { error: "A IA não conseguiu extrair dados desta imagem. Tente uma imagem mais nítida." },
        422,
      );
    }

    let extracted: any;
    try {
      extracted = typeof argsRaw === "string" ? JSON.parse(argsRaw) : argsRaw;
    } catch (e) {
      console.error("JSON parse fail", e, argsRaw);
      return json({ error: "Resposta da IA inválida." }, 422);
    }

    // Defensive post-processing: normalize hotel room_type to its essential core,
    // dropping marketing perks/promo suffixes the model may still emit.
    if (item_type === "hotel" && extracted?.data?.room_type) {
      const sanitizeRoomType = (raw: string): string => {
        let s = String(raw || "").trim();
        if (!s) return s;
        // Cut at first separator that typically introduces perks/promos
        const cutAt = (re: RegExp) => {
          const m = s.match(re);
          if (m && m.index !== undefined && m.index > 2) s = s.slice(0, m.index).trim();
        };
        cutAt(/\s[-–—|/]\s/);     // " - ", " | ", " / "
        cutAt(/\s\+\s/);           // " + "
        // Drop promo/perk tails even without a separator
        s = s.replace(
          /\b(free|gratis|grátis|complimentary|inclusive|incluso|24[- ]?h(our)?|all[- ]?inclusive|welcome|transfer|seaplane|speedboat|breakfast|spa|wifi|wi-?fi|champagne|massage|airport)\b.*$/i,
          "",
        ).trim();
        // Trim trailing punctuation
        s = s.replace(/[\s\-–—,;:.|/+]+$/g, "").trim();
        // Hard cap
        if (s.length > 60) s = s.slice(0, 60).trim();
        return s || raw;
      };
      const cleaned = sanitizeRoomType(extracted.data.room_type);
      if (cleaned && cleaned !== extracted.data.room_type) {
        console.log("[extract-booking-data] room_type sanitized:", extracted.data.room_type, "→", cleaned);
        extracted.data.room_type = cleaned;
      }
    }

    // Defensive post-processing: bump past dates to current/next year for flights
    if (item_type === "flight" && extracted?.data?.flight_segments) {
      const today = new Date();
      const todayISO = today.toISOString().slice(0, 10);
      const curYear = today.getUTCFullYear();
      const bumpYear = (iso: string | undefined): string | undefined => {
        if (!iso || typeof iso !== "string") return iso;
        const m = iso.match(/^(\d{4})-(\d{2})-(\d{2})$/);
        if (!m) return iso;
        if (iso >= todayISO) return iso;
        const candidate = `${curYear}-${m[2]}-${m[3]}`;
        if (candidate >= todayISO) return candidate;
        return `${curYear + 1}-${m[2]}-${m[3]}`;
      };
      for (const seg of extracted.data.flight_segments) {
        seg.departure_date = bumpYear(seg.departure_date);
        if (seg.arrival_date) seg.arrival_date = bumpYear(seg.arrival_date);
      }

      // Sanity-check connection layovers. If two consecutive segments share an airport
      // (prev.destination == next.origin) and the implied layover is > 24h or negative,
      // the AI likely mis-read the date. Snap next.departure_date so layover ∈ [0, 24h].
      const segs = extracted.data.flight_segments as any[];
      const toMin = (t: string): number => {
        if (!t || typeof t !== "string") return NaN;
        const [h, m] = t.split(":").map(Number);
        return Number.isFinite(h) && Number.isFinite(m) ? h * 60 + m : NaN;
      };
      const isoToDate = (iso: string | undefined): Date | null => {
        const m = iso?.match(/^(\d{4})-(\d{2})-(\d{2})$/);
        if (!m) return null;
        return new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3])));
      };
      const dateToISO = (d: Date): string => d.toISOString().slice(0, 10);
      const normalizeDirection = (value: unknown): "ida" | "volta" | "trecho" | "" => {
        const dir = String(value || "").trim().toLowerCase();
        return dir === "ida" || dir === "volta" || dir === "trecho" ? dir : "";
      };
      const isConnectionCandidate = (prev: any, next: any): boolean => {
        if (!prev || !next) return false;
        if (next.is_connection === true) return true;

        const prevDir = normalizeDirection(prev.direction);
        const nextDir = normalizeDirection(next.direction);

        if (prevDir && nextDir && prevDir !== nextDir) return false;
        if (prevDir && nextDir && prevDir === nextDir) return true;

        return false;
      };
      const MAX_LAYOVER_MIN = 24 * 60;

      for (let i = 1; i < segs.length; i++) {
        const prev = segs[i - 1];
        const next = segs[i];
        if (!prev || !next) continue;
        if (!isConnectionCandidate(prev, next)) continue;
        const prevDest = String(prev.destination_iata || "").toUpperCase();
        const nextOrig = String(next.origin_iata || "").toUpperCase();
        if (!prevDest || prevDest !== nextOrig) continue;

        const prevArrTime = toMin(prev.arrival_time);
        const nextDepTime = toMin(next.departure_time);
        if (!Number.isFinite(prevArrTime) || !Number.isFinite(nextDepTime)) continue;

        const prevDepDate = isoToDate(prev.departure_date);
        let prevArrDate = isoToDate(prev.arrival_date) || prevDepDate;
        if (!prev.arrival_date && prevDepDate && prev.departure_time) {
          const prevDepTime = toMin(prev.departure_time);
          if (Number.isFinite(prevDepTime) && prevArrTime < prevDepTime) {
            const d = new Date(prevDepDate);
            d.setUTCDate(d.getUTCDate() + 1);
            prevArrDate = d;
          }
        }
        const nextDepDate = isoToDate(next.departure_date);
        if (!prevArrDate || !nextDepDate) continue;

        const layoverMin =
          (nextDepDate.getTime() - prevArrDate.getTime()) / 60_000 +
          (nextDepTime - prevArrTime);

        if (layoverMin < 0 || layoverMin > MAX_LAYOVER_MIN) {
          // Snap to plausible window: same day as prev arrival, +1 day if depart time < arrival time
          const candidate = new Date(prevArrDate);
          let candidateLayover = nextDepTime - prevArrTime;
          if (candidateLayover < 0) {
            candidate.setUTCDate(candidate.getUTCDate() + 1);
            candidateLayover += 24 * 60;
          }
          if (candidateLayover >= 0 && candidateLayover <= MAX_LAYOVER_MIN) {
            const oldDepIso = next.departure_date;
            const newDepIso = dateToISO(candidate);
            console.log(
              `[layover-fix] seg ${i} (${prevDest}): layover ${Math.round(layoverMin)}min implausible; snapping departure_date ${oldDepIso} -> ${newDepIso} (new layover ${Math.round(candidateLayover)}min)`,
            );
            next.departure_date = newDepIso;
            // Shift arrival_date by the same delta to preserve flight duration
            if (next.arrival_date) {
              const oldDep = nextDepDate;
              const arrShiftDays = Math.round((candidate.getTime() - oldDep.getTime()) / 86_400_000);
              const arrIso = isoToDate(next.arrival_date);
              if (arrIso) {
                arrIso.setUTCDate(arrIso.getUTCDate() + arrShiftDays);
                next.arrival_date = dateToISO(arrIso);
              }
            }
          }
        }
      }
    }

    return json({ success: true, extracted });
  } catch (err) {
    console.error("extract-booking-data fatal", err);
    return json({ error: (err as Error).message ?? "Erro inesperado." }, 500);
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
