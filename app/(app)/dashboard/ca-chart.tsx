"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { formatEUR } from "@/lib/utils/format";

type DataPoint = {
  mois: string;        // YYYY-MM
  mois_label: string;  // "Mai" / "Juin" etc.
  ca: number;
  depenses: number;
};

export function CaChart({ data }: { data: DataPoint[] }) {
  return (
    <div className="h-72 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
          <XAxis
            dataKey="mois_label"
            stroke="currentColor"
            className="text-xs text-muted-foreground"
          />
          <YAxis
            stroke="currentColor"
            className="text-xs text-muted-foreground"
            tickFormatter={(v: number) =>
              v >= 1000 ? `${(v / 1000).toFixed(0)}k€` : `${v}€`
            }
          />
          <Tooltip
            contentStyle={{
              background: "var(--background)",
              border: "1px solid var(--border)",
              borderRadius: 6,
              fontSize: 12,
            }}
            formatter={(value) => formatEUR(Number(value ?? 0))}
            labelClassName="text-foreground"
          />
          <Bar
            dataKey="ca"
            name="CA encaissé"
            fill="hsl(160 84% 30%)"
            radius={[4, 4, 0, 0]}
          />
          <Bar
            dataKey="depenses"
            name="Dépenses"
            fill="hsl(0 70% 45%)"
            radius={[4, 4, 0, 0]}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
