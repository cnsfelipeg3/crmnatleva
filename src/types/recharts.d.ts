// Shim to make recharts components compatible with current React types.
// Recharts 2.x ships class components whose types break under newer @types/react.
// Re-declare the public API as `any` JSX components so TS stops complaining.
declare module "recharts" {
  import * as React from "react";
  type AnyComp = React.ComponentType<any>;

  export const ResponsiveContainer: AnyComp;
  export const BarChart: AnyComp;
  export const Bar: AnyComp;
  export const LineChart: AnyComp;
  export const Line: AnyComp;
  export const AreaChart: AnyComp;
  export const Area: AnyComp;
  export const PieChart: AnyComp;
  export const Pie: AnyComp;
  export const RadarChart: AnyComp;
  export const Radar: AnyComp;
  export const RadialBarChart: AnyComp;
  export const RadialBar: AnyComp;
  export const ScatterChart: AnyComp;
  export const Scatter: AnyComp;
  export const ComposedChart: AnyComp;
  export const Treemap: AnyComp;
  export const Funnel: AnyComp;
  export const FunnelChart: AnyComp;
  export const Sankey: AnyComp;

  export const XAxis: AnyComp;
  export const YAxis: AnyComp;
  export const ZAxis: AnyComp;
  export const CartesianGrid: AnyComp;
  export const PolarGrid: AnyComp;
  export const PolarAngleAxis: AnyComp;
  export const PolarRadiusAxis: AnyComp;
  export const Tooltip: AnyComp;
  export const Legend: AnyComp;
  export const Cell: AnyComp;
  export const LabelList: AnyComp;
  export const Label: AnyComp;
  export const ReferenceLine: AnyComp;
  export const ReferenceArea: AnyComp;
  export const ReferenceDot: AnyComp;
  export const Brush: AnyComp;
  export const Customized: AnyComp;
  export const ErrorBar: AnyComp;
  export const Sector: AnyComp;
  export const Cross: AnyComp;
  export const Curve: AnyComp;
  export const Dot: AnyComp;
  export const Polygon: AnyComp;
  export const Rectangle: AnyComp;
  export const Surface: AnyComp;
  export const Symbols: AnyComp;
  export const Text: AnyComp;
  export const Trapezoid: AnyComp;
  export const Layer: AnyComp;

  const _default: any;
  export default _default;
}
