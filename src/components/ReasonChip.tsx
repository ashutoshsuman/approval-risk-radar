import { cn } from "@/lib/utils";
export function ReasonChip({ text }: { text: string }) {
  const tone = text.startsWith("Vendor") ? "bg-destructive/10 text-destructive" : "bg-warning text-warning-foreground";
  return <span className={cn("inline-block whitespace-nowrap rounded px-2 py-0.5 text-xs font-medium", tone)}>{text}</span>;
}
