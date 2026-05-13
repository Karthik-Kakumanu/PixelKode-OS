import { cn } from "@/lib/utils";

const toneClasses = {
  purple: "bg-violet-100 text-violet-700 dark:bg-violet-500/15 dark:text-violet-200",
  blue: "bg-sky-100 text-sky-700 dark:bg-sky-500/15 dark:text-sky-200",
  green: "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-200",
  orange: "bg-orange-100 text-orange-700 dark:bg-orange-500/15 dark:text-orange-200",
  red: "bg-rose-100 text-rose-700 dark:bg-rose-500/15 dark:text-rose-200",
  slate: "bg-white/70 text-slate-700 dark:bg-white/[0.06] dark:text-zinc-200"
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
