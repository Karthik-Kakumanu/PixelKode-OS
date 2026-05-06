import { cn } from "@/lib/utils";

const toneClasses = {
  purple: "bg-violet-100 text-violet-700",
  blue: "bg-sky-100 text-sky-700",
  green: "bg-emerald-100 text-emerald-700",
  orange: "bg-orange-100 text-orange-700",
  red: "bg-rose-100 text-rose-700",
  slate: "bg-white/70 text-slate-700"
};

export function Badge({
  children,
  tone = "slate"
}: {
  children: React.ReactNode;
  tone?: keyof typeof toneClasses;
}) {
  return <span className={cn("rounded-full px-3 py-1 text-xs font-medium", toneClasses[tone])}>{children}</span>;
}
