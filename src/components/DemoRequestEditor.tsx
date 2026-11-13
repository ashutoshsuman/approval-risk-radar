import { Input } from "./ui/input";
import { useDemo } from "@/lib/demo";
import { dateFromToday, type PurchaseRequest } from "@/lib/requests";
import { daysUntil } from "@/lib/risk";

export function DemoRequestEditor({ request }: { request: PurchaseRequest }) {
  const { enabled, updateRequest } = useDemo();
  if (!enabled) return null;
  return <section className="space-y-3 border-y py-4">
    <h2 className="text-sm font-medium">Demo values · Testing only</h2>
    <div className="grid gap-4 sm:grid-cols-3">
      {([
        ["approvedAmount", "Approved amount (INR)", request.approvedAmount],
        ["latestVendorPrice", "Latest vendor price (INR)", request.latestVendorPrice],
        ["quoteValidUntil", "Quote valid-until (days from today)", daysUntil(request.quoteValidUntil)],
      ] as const).map(([field, label, value]) => <div key={field} className="space-y-1">
        <label htmlFor={field} className="text-xs text-muted-foreground">{label}</label>
        <Input id={field} type="number" min={field === "quoteValidUntil" ? undefined : 0}
          step={field === "quoteValidUntil" ? 1 : "any"} value={value} onChange={(e) => {
            const n = e.currentTarget.valueAsNumber;
            if (!Number.isFinite(n) || (field !== "quoteValidUntil" && n < 0)) return;
            if (field === "quoteValidUntil") {
              if (!Number.isInteger(n) || Math.abs(n) > 36500) return;
              updateRequest(request.id, { quoteValidUntil: dateFromToday(n) });
            } else updateRequest(request.id, { [field]: n });
          }} />
      </div>)}
    </div>
  </section>;
}