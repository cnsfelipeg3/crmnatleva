-- Permitir exclusão de leads a partir do painel /leads
CREATE POLICY "Allow delete prateleira viewers"
ON public.prateleira_product_viewers
FOR DELETE
USING (true);

CREATE POLICY "Allow delete prateleira viewer events"
ON public.prateleira_viewer_events
FOR DELETE
USING (true);

-- proposal_viewers já tem policy * para anon, mas garantimos DELETE explícito
CREATE POLICY "Allow delete proposal viewers"
ON public.proposal_viewers
FOR DELETE
USING (true);