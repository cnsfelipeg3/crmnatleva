import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { motion } from "framer-motion";
import ProposalPreviewRenderer from "@/components/proposal/ProposalPreviewRenderer";

export default function ProposalPublicView() {
  const { slug } = useParams();
  const [proposal, setProposal] = useState<any>(null);
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [startTime] = useState(Date.now());

  useEffect(() => {
    if (!slug) return;
    (async () => {
      const { data, error } = await supabase
        .from("proposals")
        .select("*")
        .eq("slug", slug)
        .single();
      if (error || !data) { setNotFound(true); setLoading(false); return; }
      setProposal(data);

      const { data: itemsData } = await supabase
        .from("proposal_items")
        .select("*")
        .eq("proposal_id", data.id)
        .order("position");
      setItems(itemsData || []);
      setLoading(false);

      // Track view
      await supabase.from("proposal_views").insert({
        proposal_id: data.id,
        device_type: /Mobi/i.test(navigator.userAgent) ? "mobile" : "desktop",
        user_agent: navigator.userAgent.slice(0, 200),
      });
      await supabase.from("proposals").update({
        views_count: (data.views_count || 0) + 1,
        last_viewed_at: new Date().toISOString(),
      }).eq("id", data.id);
    })();

    return () => {
      if (proposal?.id) {
        const duration = Math.round((Date.now() - startTime) / 1000);
        supabase.from("proposal_views").update({ duration_seconds: duration }).eq("proposal_id", proposal.id).order("viewed_at", { ascending: false }).limit(1);
      }
    };
  }, [slug]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <motion.div animate={{ opacity: [0.3, 1, 0.3] }} transition={{ repeat: Infinity, duration: 1.5 }} className="text-muted-foreground">
          Carregando sua proposta...
        </motion.div>
      </div>
    );
  }

  if (notFound) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <p className="text-2xl font-serif text-foreground mb-2">Proposta não encontrada</p>
          <p className="text-muted-foreground">O link pode estar incorreto ou a proposta foi removida.</p>
        </div>
      </div>
    );
  }

  return <ProposalPreviewRenderer proposal={proposal} items={items} />;
}
