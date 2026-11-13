import { useState } from "react";
import { toast } from "sonner";
import { Input } from "./ui/input";
import { Button } from "./ui/button";
import { useDemo } from "@/lib/demo";
import type { PurchaseRequest } from "@/lib/requests";

export function SimulateQuote({ request, onApplied }: { request: PurchaseRequest; onApplied: () => void }) {
  const [price, setPrice] = useState("");
  const demo = useDemo();
  const amount = price.trim() ? Number(price) : NaN;
  return <div className="space-y-2">
    <label htmlFor={`new-quote-${request.id}`} className="text-sm font-medium">{request.id} · {request.item}</label>
    <div className="flex flex-wrap gap-2">
      <Input id={`new-quote-${request.id}`} className="min-w-0 flex-1" type="number" min={0} step="any" placeholder="New vendor price (INR)" value={price} onChange={(e) => setPrice(e.target.value)} />
      <Button disabled={!Number.isFinite(amount) || amount < 0} onClick={() => {
        demo.simulateNewQuote(request.id, amount);
        toast.success("Updated vendor quote received. Valid for 14 days.");
        onApplied();
      }}>Apply new quote</Button>
    </div>
  </div>;
}