import { cn } from "@/lib/utils";
export function ReasonChip({ text }: { text: string }) {
  const tone = text.startsWith("Quote expired") ? "bg-destructive text-destructive-foreground" : text.startsWith("Vendor") ? "bg-destructive/10 text-destructive" : text === "Price dropped" ? "bg-muted text-muted-foreground" : "bg-warning text-warning-foreground";
  return <span className={cn("inline-block whitespace-nowrap rounded px-2 py-0.5 text-xs font-medium", tone)}>{text}</span>;
}
