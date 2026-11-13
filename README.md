# Approval Risk Radar

Build a desktop web app called "Approval Risk Radar", a concept for a procurement platform. Use mock data only, no login.

Data: 8 purchase requests. Each has: id, item (e.g. "Design tool licences – 12 seats"), requester, department, amount in INR, approver name and role, approval stage, days pending, quote valid-until date, renewal date (optional), approved amount, and latest vendor price.

Screen 1 – Risk queue: a table of pending requests sorted by "money at risk". Calculate money at risk in code: if the latest vendor price is above the approved amount, the difference; if the quote expires within 7 days, flag it; if a renewal lapses within 14 days, flag it. Show a short reason per row, e.g. "Quote expires in 3 days".

Screen 2 – Approver brief: clicking a row opens a one-screen summary: what is being bought, why, amount, quote validity, what happens if it waits, and buttons Approve / Ask a question / Delegate. Generate the short summary text with an LLM, but all numbers must come from the data, never from the LLM.

Screen 3 – Price drift: for requests where the latest vendor price is higher than the approved amount, show both numbers and the difference in % and INR. If within 10%, offer "Quick re-approve the difference"; otherwise "Send back for full approval".

Style: clean, professional B2B, neutral colours. Do not use any real company's name, logo or branding.

This project was built with [Lovable](https://lovable.dev).

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/2c91b23c-546e-46bc-aa37-fb2bdbe6aaab).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
