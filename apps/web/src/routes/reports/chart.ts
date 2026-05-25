// The design brand palette (index.css tokens) as concrete hex, for Recharts `fill`/`stroke` — SVG is
// most reliable with literal colors. Order = the design's chart sequence (teal, navy, amber, green).
export const CHART_PALETTE = ["#1a8fa1", "#223d69", "#f4b400", "#2bb673", "#e5484d"] as const;

export const CHART_TEAL = CHART_PALETTE[0];
export const CHART_NAVY = CHART_PALETTE[1];
