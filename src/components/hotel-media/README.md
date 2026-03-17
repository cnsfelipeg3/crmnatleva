# Biblioteca de Mídia do Hotel — v2.1

## Objetivo

Motor automático de mídia visual para propostas de viagem. Extrai, classifica e organiza fotos do site oficial do hotel, permitindo ao vendedor montar uma proposta completa em ~15 segundos.

## Onde aparece no sistema

| Local | Componente pai | Caminho |
|---|---|---|
| Editor de Propostas | `ProposalEditor.tsx` | Menu → Propostas → Nova Proposta → bloco Hotel |
| Cadastro de Hotéis (Venda) | `HotelEntriesEditor.tsx` | Detalhe da venda → aba Hotéis |

O componente só é renderizado quando o campo `hotelName` está preenchido.

## Fluxo de funcionamento

```
Usuário digita nome do hotel
        ↓
Clica "Buscar mídias do hotel"
        ↓
useHotelMedia.scrapeOfficial()
        ↓
Edge Function: scrape-hotel-photos
  → Descobre site oficial
  → Firecrawl extrai fotos + estrutura
  → Cache interno (evita re-scraping)
        ↓
Fotos retornam ao frontend
        ↓
Se classificação insuficiente (<70% com seção ou <3 ambientes):
  → Edge Function: classify-hotel-photos (IA)
        ↓
Interface renderiza 3 zonas:
  A) Status Bar — origem, cobertura, contagem
  B) Seleção Expressa — kit pronto (capa + quarto + áreas)
  C) Exploração — cards de quartos + chips de áreas
        ↓
Usuário clica "Usar ▶" ou "Usar seleção na proposta"
        ↓
Payload enviado ao ProposalEditor:
  → onSelectPhotos(photos[])
  → onSelectRoomBlock({ room_name, description, amenities, photos, source })
```

## Classificação de fotos

As fotos são organizadas por:

- **Categoria**: `quarto`, `suite`, `piscina`, `restaurante`, `spa`, `lobby`, `fachada`, `vista`, etc.
- **Ambiente** (`environment_name`): nome específico do quarto ou área
- **Fonte** (`source`): `official` (site do hotel) ou complementar (`booking`, `google`)
- **Confiança** (`confidence`): 0.0–1.0, determina badges "Alta", "Média", "Revisar"

## Tags comerciais (v2.1)

| Tag | Critério |
|---|---|
| **Capa recomendada** | Fachada/vista + oficial + confiança ≥ 0.8 |
| **Destaque** | Confiança ≥ 0.9 + oficial |
| **Fiel ao quarto** | Oficial + confiança ≥ 0.7 + match fuzzy por `html_context` |

## Resumo comercial (v2.1)

Cada RoomCard exibe até 2 linhas:
- **Linha 1**: Tamanho · Cama · Capacidade (max 60 chars)
- **Linha 2**: Amenidade diferenciadora · Vista (max 55 chars)

Amenidades diferenciadoras: terraço, varanda, banheira, jacuzzi, vista mar, piscina privativa, hidromassagem, lareira, sacada.

## Componentes

| Arquivo | Responsabilidade |
|---|---|
| `HotelMediaBrowser.tsx` | Orquestrador principal — conecta hook, gerencia seleção e galeria |
| `useHotelMedia.ts` | Hook — scraping, classificação, proxy de imagens, estado |
| `MediaStatusBar.tsx` | Barra de status (origem, cobertura, cache) |
| `MediaExpressSelection.tsx` | Kit pronto de mídia com troca rápida |
| `MediaSwapPopover.tsx` | Popover para trocar imagem individual |
| `RoomCard.tsx` | Card de quarto com resumo comercial e tags |
| `RoomGalleryDrawer.tsx` | Galeria fullscreen com lightbox e seleção |
| `AreaChips.tsx` | Chips de áreas comuns (piscina, spa, etc.) |
| `types.ts` | Tipos, heurísticas de tag, helpers comerciais |

## Payload enviado ao ProposalEditor

```typescript
// onSelectRoomBlock
{
  room_name: "Ocean View Suite",
  description: "85m² · Cama king · 2 hóspedes",
  amenities: ["Wi-Fi", "Minibar", "Terraço"],
  photos: HotelPhoto[],        // até 5 fotos
  source: "official" | "booking"
}

// onSelectPhotos
HotelPhoto[]  // array de fotos selecionadas
```

## Edge Functions relacionadas

- `scrape-hotel-photos` — scraping do site oficial + fallback
- `classify-hotel-photos` — classificação por IA
- `image-proxy` — proxy para imagens com CORS bloqueado
- `places-search` — resolução de URLs do Google Photos
