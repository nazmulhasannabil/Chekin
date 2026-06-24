"use client";

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";

interface TrendEntry {
  date: string;
  present: number;
  late: number;
  absent: number;
}

export function AdminDashboardCharts({ trendData }: { trendData: TrendEntry[] }) {
  return (
    <ResponsiveContainer width="100%" height={240}>
      <LineChart data={trendData} margin={{ top: 5, right: 10, bottom: 5, left: -20 }}>
        <XAxis
          dataKey="date"
          tickFormatter={(v) => {
            const d = new Date(v + "T00:00:00");
            return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
          }}
          tick={{ fontSize: 10, fill: "#8b92a5" }}
          axisLine={false}
          tickLine={false}
        />
        <YAxis
          tick={{ fontSize: 10, fill: "#8b92a5" }}
          axisLine={false}
          tickLine={false}
        />
        <Tooltip
          contentStyle={{
            background: "rgba(15, 17, 23, 0.9)",
            border: "1px solid rgba(255,255,255,0.1)",
            borderRadius: "12px",
            fontSize: "12px",
          }}
          labelFormatter={(v) => new Date(v + "T00:00:00").toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })}
        />
        <Legend
          iconType="circle"
          iconSize={8}
          wrapperStyle={{ fontSize: "11px" }}
        />
        <Line
          type="monotone"
          dataKey="present"
          stroke="#22c55e"
          strokeWidth={2}
          dot={false}
          name="Present"
        />
        <Line
          type="monotone"
          dataKey="late"
          stroke="#f59e0b"
          strokeWidth={2}
          dot={false}
          name="Late"
        />
        <Line
          type="monotone"
          dataKey="absent"
          stroke="#ef4444"
          strokeWidth={2}
          dot={false}
          name="Absent"
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
