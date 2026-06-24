"use client";

import { useState, useTransition } from "react";
import { GlassCard } from "@/components/shared/glass-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { createExportJob } from "@/actions/reports";
import { FileDown } from "lucide-react";

export function ExportRequestForm() {
  const [isPending, startTransition] = useTransition();
  const [startDate, setStartDate] = useState(() => {
    const d = new Date();
    d.setDate(1);
    return d.toISOString().split("T")[0];
  });
  const [endDate, setEndDate] = useState(new Date().toISOString().split("T")[0]);
  const [format, setFormat] = useState<"XLSX" | "CSV">("XLSX");
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSuccess(false);
    startTransition(async () => {
      const result = await createExportJob({ startDate, endDate, format });
      if (result.success) {
        setSuccess(true);
        setTimeout(() => window.location.reload(), 2000);
      } else {
        setError("Failed to create export job.");
      }
    });
  }

  return (
    <GlassCard>
      <p className="text-sm font-semibold mb-4">Generate New Report</p>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="space-y-1.5">
            <Label className="text-xs">Start Date</Label>
            <Input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="bg-white/5 border-white/10"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">End Date</Label>
            <Input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="bg-white/5 border-white/10"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Format</Label>
            <Select value={format} onValueChange={(v) => setFormat(v as "XLSX" | "CSV")}>
              <SelectTrigger className="bg-white/5 border-white/10">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="XLSX">Excel (.xlsx)</SelectItem>
                <SelectItem value="CSV">CSV</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-end">
            <Button type="submit" disabled={isPending} className="w-full gap-2">
              <FileDown className="h-4 w-4" />
              {isPending ? "Generating…" : "Generate"}
            </Button>
          </div>
        </div>

        {success && (
          <p className="text-sm text-emerald-400">
            Export job queued. The download link will appear below when ready.
          </p>
        )}
        {error && <p className="text-sm text-destructive">{error}</p>}
      </form>
    </GlassCard>
  );
}
