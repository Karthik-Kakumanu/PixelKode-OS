"use client";

import { motion } from "framer-motion";

import { Card } from "@/components/ui/card";
import { formatCompactNumber, formatCurrency } from "@/lib/utils";

export function KpiCard({
  label,
  value,
  delta,
  currency = false
}: {
  label: string;
  value: number;
  delta: string;
  currency?: boolean;
}) {
  return (
    <motion.div whileHover={{ y: -4 }} transition={{ duration: 0.2 }}>
      <Card className="h-full">
        <p className="text-sm text-slate-400">{label}</p>
        <div className="mt-3 flex items-end justify-between gap-3">
          <h3 className="text-3xl font-semibold text-white">
            {currency ? formatCurrency(value) : value > 99 ? formatCompactNumber(value) : value}
          </h3>
          <span className="rounded-full bg-emerald-500/10 px-3 py-1 text-xs font-medium text-emerald-300">{delta}</span>
        </div>
      </Card>
    </motion.div>
  );
}
