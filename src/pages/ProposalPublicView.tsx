import { useEffect, useState, useCallback } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { motion } from "framer-motion";
import ProposalPreviewRenderer from "@/components/proposal/ProposalPreviewRenderer";
import ProposalEmailGate from "@/components/proposal/ProposalEmailGate";
import { useProposalTracking } from "@/hooks/useProposalTracking";
import { emitLearningEvent } from "@/lib/learningEvents";

export default function ProposalPublicView() {
  const { slug } = useParams();
  const [proposal, setProposal] = useState<any>(null);
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  // Print mode bypasses the email gate (used by PDF export)
  const isPrintMode = typeof window !== "undefined" && new URLSearchParams(window.location.search).get("print") === "1";

  // Email gate state
  const [viewerEmail, setViewerEmail] = useState<string | null>(() => {
    try { return sessionStorage.getItem(`proposal_viewer_${slug}`); } catch { return null; }
  });
  const [viewerId, setViewerId] = useState<string | null>(() => {
    try { return sessionStorage.getItem(`proposal_viewer_id_${slug}`); } catch { return null; }
  });
  const [gateLoading, setGateLoading] = useState(false);
  const [unlocked, setUnlocked] = useState(!!viewerEmail || isPrintMode);

  // Tracking hook
  const tracking = useProposalTracking({
    proposalId: proposal?.id || "",
    viewerId: viewerId || "",
    enabled: !!proposal?.id && !!viewerId && unlocked,
  });

  // Load proposal data
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
    })();
  }, [slug]);

  // Handle email submission
  const handleEmailSubmit = useCallback(async (email: string, name?: string) => {
    if (!proposal?.id) return;
    setGateLoading(true);

    try {
      const deviceType = /Mobi/i.test(navigator.userAgent) ? "mobile" : "desktop";
      const ua = navigator.userAgent.slice(0, 200);

      // Fetch IP geolocation (free API, no key needed)
      let geo: any = {};
      try {
        const geoRes = await fetch("https://ipapi.co/json/");
        if (geoRes.ok) geo = await geoRes.json();
      } catch {}

      // Upsert viewer record
      const { data: existing } = await supabase
        .from("proposal_viewers" as any)
        .select("id, total_views")
        .eq("proposal_id", proposal.id)
        .eq("email", email)
        .maybeSingle();

      let vid: string;
      if (existing) {
        vid = (existing as any).id;
        await supabase.from("proposal_viewers" as any).update({
          last_active_at: new Date().toISOString(),
          total_views: ((existing as any).total_views || 1) + 1,
          name: name || undefined,
          device_type: deviceType,
          user_agent: ua,
          ip_address: geo.ip || null,
          city: geo.city || null,
          region: geo.region || null,
          country: geo.country_name || null,
          latitude: geo.latitude || null,
          longitude: geo.longitude || null,
        }).eq("id", vid);
      } else {
        const { data: newViewer } = await supabase
          .from("proposal_viewers" as any)
          .insert({
            proposal_id: proposal.id,
            email,
            name: name || null,
            device_type: deviceType,
            user_agent: ua,
            ip_address: geo.ip || null,
            city: geo.city || null,
            region: geo.region || null,
            country: geo.country_name || null,
            latitude: geo.latitude || null,
            longitude: geo.longitude || null,
          })
          .select("id")
          .single();
        vid = (newViewer as any)?.id;
      }

      if (vid) {
        setViewerId(vid);
        setViewerEmail(email);
        setUnlocked(true);
        try {
          sessionStorage.setItem(`proposal_viewer_${slug}`, email);
          sessionStorage.setItem(`proposal_viewer_id_${slug}`, vid);
        } catch {}

        // Update proposal views
        await supabase.from("proposals").update({
          views_count: (proposal.views_count || 0) + 1,
          last_viewed_at: new Date().toISOString(),
        }).eq("id", proposal.id);

        // Also insert legacy proposal_views
        await supabase.from("proposal_views").insert({
          proposal_id: proposal.id,
          device_type: deviceType,
          user_agent: ua,
        });

        // Emit learning event
        emitLearningEvent({
          event_type: "proposal_opened",
          proposal_id: proposal.id,
          client_opened: true,
          metadata: {
            viewer_email: email,
            viewer_name: name,
            viewer_id: vid,
            device_type: deviceType,
            is_return_visit: !!existing,
          },
        });
      }
    } catch (err) {
      console.error("[ProposalView] Email gate error:", err);
    } finally {
      setGateLoading(false);
    }
  }, [proposal, slug]);

  // Extract destination from items for the gate
  const destination = proposal?.destinations
    || items.find((i: any) => i.item_type === "flight")?.title
    || proposal?.title;

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black">
        <motion.div animate={{ opacity: [0.3, 1, 0.3] }} transition={{ repeat: Infinity, duration: 1.5 }} className="text-white/50">
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

  // Show email gate if not unlocked (skipped in print mode)
  if (!unlocked && !isPrintMode) {
    return (
      <ProposalEmailGate
        proposalTitle={proposal?.title}
        destination={destination}
        coverImage={proposal?.cover_image_url}
        onSubmit={handleEmailSubmit}
        loading={gateLoading}
      />
    );
  }

  return (
    <>
      <ProposalPreviewRenderer
        proposal={proposal}
        items={items}
        tracking={tracking}
      />
      {/* Ready signal for the PDF exporter */}
      <PrintReadyMarker />
    </>
  );
}

function PrintReadyMarker() {
  useEffect(() => {
    // Wait a tick to allow images/fonts to layout, then mark ready
    const t = setTimeout(() => {
      (window as any).__PROPOSAL_READY__ = true;
      document.documentElement.setAttribute("data-proposal-ready", "1");
    }, 600);
    return () => clearTimeout(t);
  }, []);
  return null;
}
