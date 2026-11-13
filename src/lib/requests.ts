export type PurchaseRequest = {
  id: string;
  item: string;
  justification: string;
  requester: string;
  department: string;
  amount: number;
  approver: { name: string; role: string };
  stage: string;
  daysPending: number;
  quoteValidUntil: string; // ISO date
  renewalDate?: string;
  approvedAmount: number;
  latestVendorPrice: number;
};

export function dateFromToday(n: number, now: Date = new Date()) {
  const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() + n);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
const inDays = dateFromToday;

export const requests: PurchaseRequest[] = [
  { id: "PR-1041", item: "Design tool licences – 12 seats", justification: "Product design team grows from 8 to 12; current licences are shared and block parallel work.", requester: "Ananya Rao", department: "Product Design", amount: 432000, approver: { name: "Vikram Mehta", role: "Head of Product" }, stage: "Department head", daysPending: 6, quoteValidUntil: inDays(1), renewalDate: inDays(10), approvedAmount: 432000, latestVendorPrice: 458000 },
  { id: "PR-1042", item: "Laptops – 20 units for new hires", justification: "Onboarding cohort starts next month; hardware lead time is two weeks.", requester: "Rohan Iyer", department: "IT", amount: 2400000, approver: { name: "Meera Shah", role: "CFO" }, stage: "Finance", daysPending: 9, quoteValidUntil: inDays(5), approvedAmount: 2400000, latestVendorPrice: 2760000 },
  { id: "PR-1043", item: "Cloud monitoring subscription – annual", justification: "Replaces three overlapping tools and covers production on-call alerting.", requester: "Kabir Singh", department: "Engineering", amount: 980000, approver: { name: "Priya Nair", role: "VP Engineering" }, stage: "Department head", daysPending: 3, quoteValidUntil: inDays(21), renewalDate: inDays(8), approvedAmount: 980000, latestVendorPrice: 980000 },
  { id: "PR-1044", item: "Office chairs – 40 units", justification: "Ergonomic replacement for the second-floor workspace after audit findings.", requester: "Sneha Kulkarni", department: "Facilities", amount: 520000, approver: { name: "Arjun Desai", role: "Admin Manager" }, stage: "Procurement", daysPending: 12, quoteValidUntil: inDays(18), approvedAmount: 520000, latestVendorPrice: 545000 },
  { id: "PR-1045", item: "Customer survey platform – 1 year", justification: "Quarterly NPS programme; current contract ends and data export is required.", requester: "Farah Khan", department: "Customer Success", amount: 360000, approver: { name: "Vikram Mehta", role: "Head of Product" }, stage: "Department head", daysPending: 4, quoteValidUntil: inDays(25), renewalDate: inDays(30), approvedAmount: 360000, latestVendorPrice: 342000 },
  { id: "PR-1046", item: "Security awareness training – 300 users", justification: "Mandatory annual training required for the upcoming compliance audit.", requester: "Dev Malhotra", department: "Security", amount: 270000, approver: { name: "Meera Shah", role: "CFO" }, stage: "Finance", daysPending: 7, quoteValidUntil: inDays(4), approvedAmount: 270000, latestVendorPrice: 270000 },
  { id: "PR-1047", item: "Trade show booth – regional expo", justification: "Lead generation for the enterprise segment; booth space is first-come.", requester: "Isha Banerjee", department: "Marketing", amount: 850000, approver: { name: "Rahul Verma", role: "CMO" }, stage: "Department head", daysPending: 2, quoteValidUntil: inDays(14), approvedAmount: 850000, latestVendorPrice: 1020000 },
  { id: "PR-1048", item: "Legal research database – renewal", justification: "Used daily by the contracts team; lapse would break access to case history.", requester: "Nikhil Joshi", department: "Legal", amount: 640000, approver: { name: "Meera Shah", role: "CFO" }, stage: "Finance", daysPending: 5, quoteValidUntil: inDays(30), renewalDate: inDays(12), approvedAmount: 640000, latestVendorPrice: 640000 },
];

export const getRequest = (id: string) => requests.find((r) => r.id === id);

export const scenarios = [
  { id: "tomorrow", label: "Quote expires tomorrow", days: 1, factor: 1 },
  { id: "rise15", label: "Price +15%", days: 30, factor: 1.15 },
  { id: "rise5", label: "Price +5%", days: 30, factor: 1.05 },
  { id: "none", label: "No risk", days: 30, factor: 1 },
  { id: "boundary", label: "Exactly 10% rise", days: 30, factor: 1.1 },
  { id: "dropped", label: "Price dropped", days: 30, factor: 0.9 },
  { id: "expired", label: "Quote already expired", days: -1, factor: 1 },
] as const;
export type ScenarioId = typeof scenarios[number]["id"] | "all";

export function scenarioRequests(id: ScenarioId, now: Date = new Date()): PurchaseRequest[] {
  return scenarios.flatMap((scenario, index) => {
    if (id !== "all" && scenario.id !== id) return [];
    const source = requests[index];
    if (!source) return [];
    const request = { ...source, amount: 100000, approvedAmount: 100000,
      latestVendorPrice: Math.round(100000 * scenario.factor),
      quoteValidUntil: dateFromToday(scenario.days, now) };
    delete request.renewalDate;
    return [request];
  });
}
