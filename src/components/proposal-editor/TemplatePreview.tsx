import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";

export interface TemplateForm {
  name: string;
  description: string;
  font_heading: string;
  font_body: string;
  primary_color: string;
  accent_color: string;
  text_color: string;
  bg_color: string;
  theme_config: {
    style: string;
    backgroundPattern: string;
    heroLayout: string;
    heroOverlayOpacity: number;
    heroHeight: string;
    cardStyle: string;
    sectionSpacing: string;
    borderRadius: string;
    shadowIntensity: string;
    gradientAngle: number;
    gradientSecondary: string;
    ctaStyle: string;
    ctaText: string;
    logoPosition: string;
    logoSize: string;
    animationStyle: string;
    dividerStyle: string;
    introStyle: string;
  };
  sections: { type: string; enabled: boolean; order?: number }[];
  is_default: boolean;
  is_active: boolean;
}

export type ActivePanel = "colors" | "fonts" | "sections" | "settings" | "layout" | "effects" | "cta" | "ai" | null;

export interface StylePreviewProps {
  form: TemplateForm;
  activePanel: ActivePanel;
  onClickSection: (panel: ActivePanel) => void;
}

// Shared utilities
export function getRadius(r: string) {
  const map: Record<string, string> = { none: "0px", sm: "0.375rem", md: "0.75rem", lg: "1rem", xl: "1.5rem", full: "2rem" };
  return map[r] || "0.75rem";
}

export function getShadow(s: string) {
  const map: Record<string, string> = { none: "none", soft: "0 2px 8px rgba(0,0,0,0.06)", medium: "0 4px 20px rgba(0,0,0,0.1)", strong: "0 8px 40px rgba(0,0,0,0.18)", glow: "0 0 30px rgba(0,0,0,0.12)" };
  return map[s] || "0 2px 8px rgba(0,0,0,0.06)";
}

export function clickableClass(panel: ActivePanel, activePanel: ActivePanel) {
  return cn(
    "cursor-pointer transition-all duration-200 relative group/edit",
    activePanel === panel && "ring-2 ring-primary ring-offset-2 ring-offset-background rounded-lg"
  );
}

export function editOverlay(label: string) {
  return (
    <div className="absolute inset-0 bg-primary/5 opacity-0 group-hover/edit:opacity-100 transition-opacity rounded-lg flex items-center justify-center z-10 pointer-events-none">
      <Badge className="text-[10px] shadow-lg">{label}</Badge>
    </div>
  );
}

import { EditorialStyle } from "./preview-styles/EditorialStyle";
import { LuxuryStyle } from "./preview-styles/LuxuryStyle";
import { ModernStyle } from "./preview-styles/ModernStyle";
import { TropicalStyle } from "./preview-styles/TropicalStyle";

export function TemplatePreview({ form, activePanel, onClickSection, zoom }: {
  form: TemplateForm;
  activePanel: ActivePanel;
  onClickSection: (panel: ActivePanel) => void;
  zoom: number;
}) {
  const style = form.theme_config.style;
  const bgCol = form.bg_color || (style === "modern" ? "#0a0a0a" : "#ffffff");
  const props: StylePreviewProps = { form, activePanel, onClickSection };

  return (
    <div
      style={{ transform: `scale(${zoom})`, transformOrigin: "top center", backgroundColor: bgCol }}
      className="rounded-xl border border-border overflow-hidden shadow-inner transition-transform"
    >
      {style === "luxury" ? <LuxuryStyle {...props} /> :
       style === "modern" ? <ModernStyle {...props} /> :
       style === "tropical" ? <TropicalStyle {...props} /> :
       <EditorialStyle {...props} />}
    </div>
  );
}
