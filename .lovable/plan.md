

# Corrigir Dashboard + Extracao IA Completa

## Problema 1: Dashboard nao abre
O componente `RoutesMap` usa `react-leaflet` que causa `TypeError: render2 is not a function` com React 18. A solucao e reescrever o mapa usando Leaflet vanilla (sem o wrapper react-leaflet).

## Problema 2: Extracao IA nao preenche todos os campos
Atualmente, quando voce sobe um print ou PDF, a IA extrai dados mas o sistema so preenche ~13 campos do formulario. Campos como nomes de passageiros, adultos, criancas, CPF, telefone, passaporte, forma de pagamento, quarto de hotel, alimentacao, valor recebido, nome da venda, observacoes e custos sao ignorados mesmo quando a IA os identifica.

## Plano de Implementacao

### 1. Reescrever RoutesMap com Leaflet vanilla
- Remover imports de `react-leaflet`
- Usar `useRef` + `useEffect` para inicializar `L.map()` diretamente
- Manter a mesma visual (rotas com linhas, circulos nos aeroportos)
- Arquivo: `src/components/RoutesMap.tsx`

### 2. Criar ClientDistributionMap com Leaflet vanilla
- Novo componente que consulta `passengers` + `sale_passengers` + `sales`
- Mostra circulos proporcionais por cidade no mapa do Brasil
- Tabela de ranking regional (Estado, Cidade, Clientes, Vendas, Receita)
- Arquivo: `src/components/ClientDistributionMap.tsx`

### 3. Expandir prompt da IA para extrair TODOS os campos
Adicionar ao prompt de extracao os seguintes campos que hoje sao ignorados:
- `sale_name` (sugestao de nome para a venda)
- `payment_method` (PIX, cartao, transferencia, boleto)
- `adults`, `children`, `children_ages`
- `hotel_room`, `hotel_meal_plan`
- `received_value` (valor cobrado do cliente)
- `air_cash`, `air_miles_qty`, `air_miles_price`, `air_taxes`
- `hotel_cash`, `hotel_miles_qty`, `hotel_miles_price`, `hotel_taxes`
- `emission_source` (site/app usado para emitir)
- `observations` (notas relevantes detectadas)
- Arquivo: `supabase/functions/extract-sale-data/index.ts`

### 4. Expandir mapeamento de campos extraidos no formulario
Atualizar a funcao `handleExtract` em `NewSale.tsx` para mapear TODOS os campos retornados pela IA para os campos correspondentes do formulario:
- Nomes de passageiros, adultos, criancas
- Forma de pagamento
- Hotel (quarto, alimentacao)
- Todos os valores financeiros (custo aereo, milhas, taxas, valor recebido)
- Nome sugerido para a venda
- Fonte de emissao
- Arquivo: `src/pages/NewSale.tsx` (linhas 129-145)

### 5. Integrar mapa de distribuicao no Dashboard
- Importar `ClientDistributionMap` no Dashboard
- Adicionar secao entre o mapa de rotas e os graficos
- Arquivo: `src/pages/Dashboard.tsx`

## Detalhes Tecnicos

### Leaflet Vanilla (RoutesMap + ClientDistributionMap):
```text
const mapRef = useRef<HTMLDivElement>(null);
const mapInstance = useRef<L.Map | null>(null);

useEffect(() => {
  if (!mapRef.current) return;
  const map = L.map(mapRef.current).setView([-14, -51], 4);
  L.tileLayer("https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png").addTo(map);
  mapInstance.current = map;
  return () => { map.remove(); };
}, []);
```

### Campos adicionados ao prompt IA:
```text
"sale_name": sugestao de nome para a venda
"payment_method": metodo de pagamento identificado
"adults": numero de adultos
"children": numero de criancas  
"children_ages": idades das criancas
"hotel_room": tipo de quarto
"hotel_meal_plan": regime de alimentacao
"received_value": valor cobrado do cliente
"air_cash": valor pago em dinheiro (aereo)
"air_miles_qty": quantidade de milhas usadas
"air_miles_price": preco do milheiro
"air_taxes": taxas aereas
"hotel_cash": valor pago pelo hotel
"emission_source": onde foi emitido
"observations": notas relevantes
```

### Mapeamento expandido no handleExtract:
Todos os campos acima serao mapeados no `setForm()`, fazendo com que ao subir um print com informacoes de hotel, valor, passageiros, etc., tudo seja preenchido automaticamente sem necessidade de digitacao manual.

### Arquivos modificados:
- `src/components/RoutesMap.tsx` -- reescrito com Leaflet vanilla
- `src/components/ClientDistributionMap.tsx` -- novo componente
- `src/pages/Dashboard.tsx` -- integrar mapa de distribuicao
- `src/pages/NewSale.tsx` -- expandir mapeamento de campos extraidos
- `supabase/functions/extract-sale-data/index.ts` -- expandir prompt IA

