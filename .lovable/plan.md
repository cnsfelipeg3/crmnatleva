# Plano · Áudio com cancelamento real + Drag & Drop estilo WhatsApp

## Contexto rápido

Hoje, no `/operacao/inbox`:
1. Ao gravar áudio e clicar na lixeira, o áudio ainda é enviado · bug real.
2. Para anexar arquivos é preciso clicar no clips, abrir picker, etc · fricção.

Vamos resolver os dois problemas com foco em UX premium.

---

## Parte 1 · Lixeira do áudio que realmente cancela (bug)

### Causa raiz
Em `OperacaoInbox.tsx` (linha 1549), `cancelRecording` zera `audioChunksRef` e chama `stop()`. Porém o navegador dispara um último `ondataavailable` ANTES do `onstop`, repopulando os chunks. O `onstop` então monta o blob, vê tamanho > 100 e envia normalmente.

### Correção
- Criar `cancelledRef = useRef(false)`.
- `cancelRecording` seta `cancelledRef.current = true` antes do `stop()`.
- No `onstop`, primeira linha: `if (cancelledRef.current) { cancelledRef.current = false; cleanup(); return; }`.
- `startRecording` reseta `cancelledRef.current = false` no início.
- Limpeza unificada (stream, audioContext, intervalos, waveform) em função interna `cleanupRecording()` reutilizada por stop/cancel/cancelado.
- Toast sutil "Áudio descartado" ao cancelar para feedback claro.

---

## Parte 2 · Drag & Drop estilo WhatsApp com modal de preview

### Comportamento alvo
1. Usuário arrasta arquivo (imagem, vídeo, PDF, doc, qualquer tipo) sobre a área da conversa.
2. Aparece um overlay full-area com indicação visual ("Solte para anexar · imagens, vídeos, documentos").
3. Ao soltar, abre o `AttachmentPreviewDialog` com:
   - Preview adequado por tipo (imagem grande, player de vídeo, ícone+nome para PDF/doc).
   - Lista lateral com os outros arquivos da fila (suporte a múltiplos arquivos arrastados de uma vez, navegáveis).
   - Campo de legenda (textarea com auto-resize, emoji-friendly, contador sutil).
   - **Alternativa: gravar áudio como legenda** · botão de mic abaixo do preview que grava um áudio descritivo (waveform mini) que será enviado JUNTO com o arquivo, em mensagem subsequente.
   - Botões: Cancelar · Adicionar mais · Enviar.
4. Ao enviar:
   - Usa pipeline existente (`sendImage`/`sendDocument`/`sendVideo` · ou seja lá como o componente faz hoje via `sendViaZapi`).
   - Se houver legenda de texto, vai como `caption` no envio nativo do tipo (Z-API suporta caption em image/document).
   - Se houver áudio descritivo, é enviado logo após cada arquivo como mensagem de áudio independente.
5. Mesmo modal abre via clipe (clips) e via paste, unificando a UX.

### Componentes novos
- `src/components/livechat/AttachmentDropOverlay.tsx` · overlay visual durante drag.
- `src/components/livechat/AttachmentPreviewDialog.tsx` · modal completo com preview, legenda, áudio, fila múltipla.
- `src/components/livechat/MiniAudioRecorder.tsx` · recorder reutilizável (extrai a lógica de mic/waveform já existente).

### Integração no `OperacaoInbox.tsx`
- Adicionar handlers `onDragEnter/onDragOver/onDragLeave/onDrop` no container da área de mensagens (debounce com counter para evitar flicker em filhos).
- State `pendingAttachments: File[]` e `previewOpen: boolean`.
- Reaproveitar `handlePaste` para também abrir o preview dialog (em vez de enviar direto), com mesma UX.
- Botão clips passa a abrir o input file e ao selecionar, alimenta o mesmo dialog.

### Tipos suportados
- Imagens: JPG, PNG, WEBP, GIF · preview inline.
- Vídeo: MP4, MOV · player.
- PDF: ícone + 1ª página opcional via `<embed>` reduzido.
- Outros (DOCX, XLSX, ZIP): card com ícone + nome + tamanho formatado.
- Limite tamanho por arquivo: respeitar limite do Z-API (16MB · validação client-side com toast).

### UX/UI premium
- Modal usa design system existente (glass-card, border 0.75rem, gold-line accent topo).
- Animações suaves (Framer Motion fade+scale 0.96→1).
- Atalhos: `Esc` cancela, `Ctrl/Cmd+Enter` envia.
- Suporte a múltiplos arquivos com thumbnails na lateral (carrossel vertical).
- Loading states por arquivo durante upload (progress bar individual).

---

## Arquivos afetados

### Modificar
- `src/pages/operacao/OperacaoInbox.tsx` · fix cancelamento + integração drop/preview.

### Criar
- `src/components/livechat/AttachmentDropOverlay.tsx`
- `src/components/livechat/AttachmentPreviewDialog.tsx`
- `src/components/livechat/MiniAudioRecorder.tsx`

---

## Detalhes técnicos chave

```text
[Conversa Container]
  ├─ onDragEnter/Over/Leave/Drop (counter para nested)
  ├─ <AttachmentDropOverlay visible={isDragging} />
  └─ <AttachmentPreviewDialog
        files={pendingAttachments}
        onRemove / onAddMore
        onSend={(files, caption, audioBlob?) => { ... }}
      />
```

Pipeline de envio dentro do dialog reutiliza funções já existentes no Inbox (passadas via prop ou via handler `onSend`):
- texto+arquivo: `send-image` / `send-document` / `send-video` com `caption`.
- áudio descritivo: chama o mesmo fluxo de `send-audio` após cada arquivo.

Sem mudanças de banco, sem novas edge functions, sem novos secrets.

---

## Não está no escopo
- Editar imagem antes de enviar (crop/desenho) · pode vir em fase 2.
- Compressão automática de vídeo · usaríamos o blob como veio.