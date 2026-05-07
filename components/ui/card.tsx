import { cn } from "@/lib/utils";

export function Card({
  className,
  children,
  style
}: {
  className?: string;
  children: React.ReactNode;
  style?: React.CSSProperties;
}) {
  return <div className={cn("glass-panel rounded-[28px] p-5", className)} style={style}>{children}</div>;
}
