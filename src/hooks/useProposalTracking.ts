import { useEffect, useRef, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { emitLearningEvent } from "@/lib/learningEvents";

interface TrackingConfig {
  proposalId: string;
  viewerId: string;
  enabled: boolean;
}

/**
 * Deep engagement tracking for public proposals.
 * Tracks: scroll depth, section visibility, time on page, CTA clicks, card expansions.
 */
export function useProposalTracking({ proposalId, viewerId, enabled }: TrackingConfig) {
  const startTime = useRef(Date.now());
  const activeMs = useRef(0);
  const lastTickAt = useRef(Date.now());
  const isVisible = useRef(true);
  const maxScroll = useRef(0);
  const sectionsViewed = useRef(new Set<string>());
  const sectionTimers = useRef<Record<string, number>>({});
  const currentSection = useRef<string | null>(null);
  const sectionStartTime = useRef<number>(Date.now());
  const interactionQueue = useRef<any[]>([]);
  const clickQueue = useRef<any[]>([]);
  const flushTimer = useRef<ReturnType<typeof setInterval>>();

  // Batch flush interactions every 5 seconds
  const flushQueue = useCallback(async () => {
    if (!enabled) return;
    if (interactionQueue.current.length > 0) {
      const batch = [...interactionQueue.current];
      interactionQueue.current = [];
      try {
        await supabase.from("proposal_interactions" as any).insert(batch);
      } catch (err) {
        console.warn("[ProposalTrack] flush error:", err);
        interactionQueue.current.unshift(...batch);
      }
    }
    if (clickQueue.current.length > 0) {
      const batch = [...clickQueue.current];
      clickQueue.current = [];
      try {
        await supabase.from("proposal_clicks" as any).insert(batch);
      } catch (err) {
        console.warn("[ProposalTrack] click flush error:", err);
        clickQueue.current.unshift(...batch);
      }
    }
  }, [enabled]);

  const track = useCallback((eventType: string, sectionName?: string, eventData?: Record<string, any>) => {
    if (!enabled) return;
    interactionQueue.current.push({
      proposal_id: proposalId,
      viewer_id: viewerId,
      event_type: eventType,
      section_name: sectionName || null,
      event_data: eventData || {},
    });
  }, [proposalId, viewerId, enabled]);

  // Track CTA clicks
  const trackCTA = useCallback((ctaType: string, details?: Record<string, any>) => {
    track("click_cta", "cta", { cta_type: ctaType, ...details });

    // Update viewer record
    if (ctaType === "whatsapp") {
      supabase.from("proposal_viewers" as any)
        .update({ whatsapp_clicked: true })
        .eq("id", viewerId)
        .then(() => {});
    }
    supabase.from("proposal_viewers" as any)
      .update({ cta_clicked: true })
      .eq("id", viewerId)
      .then(() => {});

    // Emit learning event
    emitLearningEvent({
      event_type: "proposal_cta_clicked",
      proposal_id: proposalId,
      metadata: { cta_type: ctaType, viewer_id: viewerId, ...details },
    });
  }, [track, proposalId, viewerId]);

  // Track card expansion
  const trackExpand = useCallback((section: string, itemName?: string) => {
    track("expand_card", section, { item_name: itemName });
  }, [track]);

  // Track gallery view
  const trackGallery = useCallback((section: string, photoIndex?: number) => {
    track("view_gallery", section, { photo_index: photoIndex });
  }, [track]);

  useEffect(() => {
    if (!enabled) return;

    // Track initial page view
    track("page_view", "hero");

    // Scroll tracking
    const handleScroll = () => {
      const scrollPercent = Math.round(
        (window.scrollY / (document.documentElement.scrollHeight - window.innerHeight)) * 100
      );
      if (scrollPercent > maxScroll.current) {
        maxScroll.current = scrollPercent;
        // Track at 25%, 50%, 75%, 100%
        const milestones = [25, 50, 75, 100];
        for (const m of milestones) {
          if (scrollPercent >= m && maxScroll.current - (scrollPercent - maxScroll.current) < m) {
            track("scroll_milestone", undefined, { depth_percent: m });
          }
        }
      }
    };

    // Section visibility tracking with IntersectionObserver
    const sectionObserver = new IntersectionObserver((entries) => {
      for (const entry of entries) {
        const sectionName = (entry.target as HTMLElement).dataset.trackSection;
        if (!sectionName) continue;

        if (entry.isIntersecting) {
          sectionsViewed.current.add(sectionName);
          track("section_view", sectionName);

          // Start timing this section
          if (currentSection.current && currentSection.current !== sectionName) {
            const elapsed = Math.round((Date.now() - sectionStartTime.current) / 1000);
            sectionTimers.current[currentSection.current] = (sectionTimers.current[currentSection.current] || 0) + elapsed;
            track("time_on_section", currentSection.current, { seconds: elapsed });
          }
          currentSection.current = sectionName;
          sectionStartTime.current = Date.now();
        }
      }
    }, { threshold: 0.3 });

    // Observe all sections with data-track-section attribute
    setTimeout(() => {
      document.querySelectorAll("[data-track-section]").forEach((el) => {
        sectionObserver.observe(el);
      });
    }, 1000);

    // Scroll listener (throttled)
    let scrollTimeout: ReturnType<typeof setTimeout>;
    const throttledScroll = () => {
      clearTimeout(scrollTimeout);
      scrollTimeout = setTimeout(handleScroll, 300);
    };
    window.addEventListener("scroll", throttledScroll, { passive: true });

    // Periodic flush
    flushTimer.current = setInterval(flushQueue, 5000);

    // Cleanup + final data push
    return () => {
      window.removeEventListener("scroll", throttledScroll);
      sectionObserver.disconnect();
      clearInterval(flushTimer.current);

      // Final section time
      if (currentSection.current) {
        const elapsed = Math.round((Date.now() - sectionStartTime.current) / 1000);
        sectionTimers.current[currentSection.current] = (sectionTimers.current[currentSection.current] || 0) + elapsed;
        track("time_on_section", currentSection.current, { seconds: elapsed });
      }

      const totalTime = Math.round((Date.now() - startTime.current) / 1000);

      // Update viewer summary
      supabase.from("proposal_viewers" as any).update({
        last_active_at: new Date().toISOString(),
        total_time_seconds: totalTime,
        scroll_depth_max: maxScroll.current,
        sections_viewed: Array.from(sectionsViewed.current),
        engagement_score: calculateScore(maxScroll.current, sectionsViewed.current.size, totalTime),
      }).eq("id", viewerId).then(() => {});

      // Emit learning event with engagement summary
      emitLearningEvent({
        event_type: "proposal_engagement_summary",
        proposal_id: proposalId,
        client_opened: true,
        metadata: {
          viewer_id: viewerId,
          total_time_seconds: totalTime,
          scroll_depth: maxScroll.current,
          sections_viewed: Array.from(sectionsViewed.current),
          section_times: sectionTimers.current,
          engagement_score: calculateScore(maxScroll.current, sectionsViewed.current.size, totalTime),
        },
      });

      // Final flush
      flushQueue();
    };
  }, [enabled, track, flushQueue, proposalId, viewerId]);

  return { track, trackCTA, trackExpand, trackGallery };
}

/**
 * Engagement score (0-100):
 * - Scroll depth: max 30pts
 * - Sections viewed: max 30pts (6+ sections = full)
 * - Time on page: max 40pts (120s+ = full)
 */
function calculateScore(scrollDepth: number, sectionsCount: number, timeSeconds: number): number {
  const scrollScore = Math.min(30, Math.round(scrollDepth * 0.3));
  const sectionScore = Math.min(30, Math.round((sectionsCount / 6) * 30));
  const timeScore = Math.min(40, Math.round((timeSeconds / 120) * 40));
  return scrollScore + sectionScore + timeScore;
}
