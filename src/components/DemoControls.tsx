import { useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { FlaskConical, RotateCcw } from "lucide-react";
import { Button } from "./ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "./ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { Switch } from "./ui/switch";
import { scenarios, type ScenarioId } from "@/lib/requests";
import { useDemo } from "@/lib/demo";

export function DemoControls() {
  const [open, setOpen] = useState(false);
  const demo = useDemo();
  const navigate = useNavigate();
  return <>
    <Button variant="outline" size="sm" className="ml-auto shrink-0" onClick={() => setOpen(true)}>
      <FlaskConical className="size-4" /> Demo controls <span className="text-xs text-muted-foreground">· Testing tool</span>
    </Button>
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="max-h-[90dvh] overflow-y-auto">
        <DialogHeader><DialogTitle>Test scenarios</DialogTitle></DialogHeader>
        <div className="flex items-center justify-between gap-4">
          <label htmlFor="demo-mode" className="text-sm font-medium">Demo mode · Testing only</label>
          <Switch id="demo-mode" checked={demo.enabled} onCheckedChange={demo.setEnabled} />
        </div>
        <div className="space-y-2">
          <label htmlFor="scenario" className="text-sm font-medium">Preset scenario</label>
          <Select value={demo.scenario} onValueChange={(value) => {
            demo.selectScenario(value as ScenarioId);
            void navigate({ to: "/" });
          }}>
            <SelectTrigger id="scenario"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="default" disabled>Default data</SelectItem>
              {scenarios.map((s) => <SelectItem key={s.id} value={s.id}>{s.label}</SelectItem>)}
              <SelectItem value="all">All of the above</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <Button variant="outline" onClick={() => { demo.reset(); void navigate({ to: "/" }); }}>
          <RotateCcw className="size-4" /> Reset to default data
        </Button>
      </DialogContent>
    </Dialog>
  </>;
}