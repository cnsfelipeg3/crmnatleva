

## Plano: Aproveitar todo o conteúdo do Hotels.com

Hoje a gente extrai só 4 campos básicos do JSON do Hotels.com (nome, preço, foto, nota). O JSON traz muito mais coisa útil que está sendo ignorada. Abaixo, o que vamos passar a aproveitar.

### O que está sendo desperdiçado no JSON

| Campo no JSON | Valor de exemplo | Hoje | Vamos usar pra |
|---|---|---|---|
| `priceSection.badge.text` | `"$67 off"` | ❌ ignorado | Selo de desconto vermelho no card |
| `displayMessagesV2[0]` (`$47 nightly`) | preço/noite oficial | parcial | Linha "R$ X/noite" confiável (sem ter que dividir manualmente) |
| `priceMessagingV2` | `"for 3 nights"`, `"May 7 - May 10"` | parcial | Subtítulo do preço já formatado |
| `accessibilityLabel` da option | `"Price was $252, price is now $185 for 3 nights..."` | ❌ | Frase pronta pra copiar/compartilhar |
| `mediaSection.gallery.media[].description` | `"Reception"`, `"Exterior"`, `"Bar"` | ❌ | Categorizar/legendar fotos por tipo de ambiente |
| `headingSection.amenities[].icon.id` + `text` | `pool` + `"Pool"` | parcial (só id) | Ícone visual + nome traduzido |
| `summarySections[0].guestRatingSectionV2.badge.theme` | `"positive"` | ❌ | Cor do badge de nota (verde/amarelo/vermelho) |
| `analyticsEvents` → `product_list` | badges (`Public_Promo`), `free_cancellation_bool`, `earn_eligible_bool` | ❌ | Selos extras: "Promoção pública", "Cancelamento grátis" |
| `cardLink.resource.value` (URL) | parâmetros internos (`selectedRoomType`, `selectedRatePlan`, `latLong`, `regionId`, `neighborhoodId`) | só usa URL | Extrair lat/long + bairro pra mostrar no mapa/localização |
| `propertyId` | `"553248635974547388_32905077"` | ❌ | ID composto (regionId_propertyId) pra deep links futuros |
| `saveTripItem.attributes.roomConfiguration` | adultos/crianças | ❌ | Confirmar configuração de quartos |
| `featuredHeader`, `callOut`, `cardBackgroundTheme` | null nesse ex., mas frequentes | ❌ | Selos editoriais ("Top pick", "Member deal") |

### Mudanças nos arquivos

**1. `src/components/booking-rapidapi/unifiedHotelTypes.ts`**
- Expandir `HotelscomLodgingCard` com os campos novos (`priceSection.badge`, `analyticsEvents`, `propertyId`, `featuredHeader`, `callOut`, `mediaSection.gallery.media[].media.description`).
- Em `normalizeHotelscomHotel`, extrair: `discountBadge`, `photoCaptions[]`, `latitude`/`longitude` (via regex no `cardLink.resource.value`: `latLong=25.26,55.29`), `neighborhoodId`/`regionId`, badges de promoção do `analyticsEvents.product_list`.
- Adicionar campos novos em `UnifiedHotel`/`UnifiedHotelOffer`: `discountBadge?: string`, `photoCaptions?: string[]`, `promoBadges?: string[]`, `accessibilityPriceLabel?: string`.

**2. `src/components/booking-rapidapi/HotelscomDetailDrawer.tsx`**
- **Header do preço:** mostrar selo `"$67 off"` (vermelho destacado) ao lado do total.
- **Aba Fotos:** exibir a `description` de cada foto como legenda (ex: "Recepção", "Exterior", "Bar"). Traduzir os termos comuns (Reception, Lobby, Pool, Gym, Bar, Restaurant, Suite, Bedroom, Bathroom).
- **Aba Informações:** nova seção "Selos & Promoções" com badges do `analyticsEvents` (Promoção pública, Cancelamento grátis, Elegível a pontos).
- **Aba Informações:** adicionar bairro/região quando extraído da URL.
- Remover a aba "Dados" (debug JSON) — virou ruído visual já que o conteúdo agora está exposto.

**3. `src/components/booking-rapidapi/HotelscomCard.tsx`** *(card da listagem)*
- Adicionar selo de desconto (`$67 off` → "R$ X off" convertido) no canto da foto.
- Mostrar 1 badge de promoção (se houver) abaixo do nome.

### Diagrama do que será extraído

```text
JSON Hotels.com (LodgingCard)
│
├─ priceSection
│   ├─ badge ─────────────────► [NOVO] discountBadge "R$ X off"
│   ├─ priceSummary
│   │   ├─ optionsV2[].accessibilityLabel ► [NOVO] frase pronta
│   │   └─ priceMessagingV2 ──────────────► já usado
│
├─ mediaSection.gallery.media[]
│   └─ media.description ──────► [NOVO] legenda de cada foto
│
├─ cardLink.resource.value (URL)
│   ├─ latLong=lat,long ───────► [NOVO] coords pro mapa
│   ├─ neighborhoodId ─────────► [NOVO] bairro
│   └─ regionId ───────────────► [NOVO] região
│
├─ analyticsEvents → product_list
│   ├─ badges[] ───────────────► [NOVO] selos promo
│   ├─ free_cancellation_bool ─► [NOVO] selo verde
│   └─ earn_eligible_bool ─────► [NOVO] selo "ganha pontos"
│
└─ featuredHeader / callOut ───► [NOVO] selos editoriais
```

### Resultado

O drawer do Hotels.com vai ficar muito mais rico: selo de desconto, fotos legendadas por ambiente, badges de promoção, bairro/região, sem precisar mais expor o JSON cru.

