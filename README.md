# Estate Basics

A browser-local property planning workspace combining the HDB and condo calculators in a single premium blue interface.

## Scenarios

- Buy an HDB
- Sell an HDB
- Sell HDB and buy HDB
- Sell HDB and buy condo
- Buy a condo
- Sell a condo
- Sell condo and buy condo

## Features

- Larger responsive premium blue theme, branded Estate Basics.
- Planning notes next to the estimate name.
- Scenario drafts saved in the current browser, with matching HDB/condo purchase and sale figures shared across related scenarios during the session.
- Automatic approved loan amount at 75% of purchase price, with a manual lower amount and a button to return to automatic.
- Named estimate collection, reopen and remove controls.
- JSON backup download and restore.
- Branded premium blue PDF reports with aligned amount columns, selective bold text and red attention rows.
- No enquiry form, analytics, server storage, external fonts, or third-party scripts.

## Affordability Assessment

The second tab assesses bank loans for HDB, EC and condo purchases. HDB concessionary loans are not included. Add up to eight applicants and select one applicant, applicants 1+2, or all applicants. DOB is optional; age and monthly OA can be entered manually or calculated automatically.

Gross assessable monthly income is monthly income plus other annual income divided by 12. Income marked variable is recognised at 70% for the bank-loan model. Monthly debt includes car, credit-card assessed repayments, other loans and retained housing loans. TDSR uses a 55% limit; applicable MSR uses 30% and includes existing housing repayments.

The assessment rate defaults to 4% and can be raised. The effective rate is the highest of the current 4% floor, entered assessment rate, quoted rate and bank thereafter rate. Standard tenure is limited to 25 years for HDB / 30 years for private property and maturity by age 65. Absolute tenure caps are 30 years for HDB and 35 years for private property. An editable maturity-age assumption of 75 is used for extended loans; it is a bank-policy assumption, not a universal MAS rule.

With no other outstanding housing loans, normal/reduced LTV tiers are 75%/55%. With one other loan they are 45%/25%; with two or more they are 35%/15%. Enter the applicable count for the selected borrowers after any sale loans are settled. A target price/valuation caps the income-based capacity. Without a target, the implied property value at full LTV is illustrative and is not a cash-budget affordability limit.

MSR is applied to HDB and new/pre-MOP EC financing; post-MOP resale EC and condo comparisons use TDSR only. HDB/EC purchase eligibility, household income ceilings, citizenship, lease rules, CPF withdrawal limits and full lender credit policies are outside this model.

Automatic OA uses the published 2026 CPF contribution and allocation tables for citizens / full-rate PR employees. Ordinary monthly wages are capped at $8,000; low-wage contribution formulas and contribution rounding are included. Age bands change in the month after the birthday when DOB is supplied. RA allocations may be redirected to OA if the FRS option is selected from age 55. Bonus CPF and other account overflows are not modelled. Use manual OA for other profiles, circumstances or years.

Repayments assume a constant monthly-rest interest rate and show the first payment's principal/interest, total interest, cash gap after current OA and a +1% rate comparison. The monthly amortisation table rounds each month's interest/principal to cents and adjusts the final payment. PDF reports include an annual amortisation summary.

Assessment data autosaves locally across property tabs and reloads. Property Planner saved estimates can include an assessment snapshot; JSON backups include the current assessment. HDB and condo targets can be imported from the planner, and assessed HDB/condo loans can be copied back explicitly. EC results remain in the assessment/report to avoid relabelling an EC purchase as a condo scenario.

Commission amount fields show the rate-calculated total by default; typing a total creates an override. Clear it or choose Use commission rate to return to automatic calculation. Mobile label blocks align paired inputs, including both commission fields.

Both PDF downloads use `Property Planner - Name - DDMMMYY.pdf`, with the date in Singapore time (e.g. `Property Planner - Test Name - 28Oct26.pdf`).

### Sources checked 28 October 2026

- [MAS macroprudential settings](https://www.mas.gov.sg/publications/macroprudential-policies-in-singapore)
- [MAS MSR and TDSR rules](https://www.mas.gov.sg/regulation/explainers/new-housing-loans/msr-and-tdsr-rules)
- [MoneySense loan limits and cash downpayments](https://www.moneysense.gov.sg/buying-a-property-how-much-can-you-afford/)
- [CPF contribution tables 2026](https://www.cpf.gov.sg/content/dam/web/employer/employer-obligations/documents/CPFcontributionratesfrom1Jan2026.pdf)
- [CPF allocation tables 2026](https://www.cpf.gov.sg/content/dam/web/employer/employer-obligations/documents/CPFAllocationRatesfromJanuary2026.pdf)
- [CPF age-band timing](https://www.cpf.gov.sg/service/article/how-are-my-cpf-contributions-allocated-to-my-cpf-accounts)
- [MAS income-weighted age and variable-income treatment](https://www.nas.gov.sg/archivesonline/data/pdfdoc/20130705007/press_release_-_mas_introduces_debt_servicing_framework_for_property_loans.pdf) (current thresholds use the MAS settings above)
- [Bank explanation of the qualifying-rate floor and variable income](https://www.posb.com.sg/personal/articles/budget-debt/understanding-tdsr-and-borrowing)

Saved data is limited to the current browser and origin. Clearing browser data removes it; download a JSON backup to keep a separate copy. Drafts from the original calculator sites do not automatically transfer.

## Calculation behavior

Loan estimates use up to 75% of the lower purchase price and valuation. Approved loans are capped by this amount. Cash-over-valuation, bank minimum cash downpayment, miscellaneous fees and commissions are cash only. Eligible CPF and grants do not offset these amounts.

The COV summary row follows the downpayment rows. Cash top up for Loan is the positive difference between 75% of purchase price and 75% of valuation, shown for purchases using a loan. Guide rows are explanatory and do not add duplicate costs.

Second HDB loan proceeds paydown defaults to 50% of positive HDB sale proceeds, capped by the approved loan, with a manual override. Set an explicit zero to override the default. CPF OA must include any sale CPF refund the buyer intends to reuse; it is not automatically added again.

Stamp duties use the higher purchase price and market valuation. Commission offers two alternative checkboxes: with 9% GST (default), or without GST. Both may be off to exclude commission. A full edited amount replaces the percentage calculation. Zero overrides are supported. Actual loan, CPF, grant and tax eligibility must be confirmed separately.

Existing browser storage keys are preserved so saved estimates remain available after rebranding. Legacy loan amounts below 75% of price remain manual; amounts at or above 75% switch to automatic.

Breakdown formatting is shared by the site and PDF. Only the requested purchase rows are bold; only Selling price is bold in the sale breakdown. Valuation below price, Cash top up for Loan and second HDB proceeds paydown are red. Resale levy, HIP and bank penalty are red in the sale breakdown.

## Files

- `model.js`: pure shared calculation functions.
- `app.js`: UI, browser persistence, backup/restore and PDF download.
- `pdf.js`: paginated A4 PDF writer.
- `index.html`, `styles.css`: interface and responsive design.
- `theme-blue.css`: Estate Basics visual system and larger type.
- `test.cjs`: model checks and sample PDF generation.
- `test-enhancements.cjs`: loan automation, GST alternatives and formatting checks.
- `affordability-model.js`: testable bank-loan, CPF and amortisation functions.
- `affordability.js`, `affordability.css`: assessment tab, local persistence and PDF export.
- `test-affordability.cjs`: age, CPF, bank limits, repayment, amortisation and filename checks.

Run `node test.cjs`, `node test-enhancements.cjs` and `node test-affordability.cjs` to execute the calculation checks. No dependency installation or build is needed. Serve the folder with a static web server to preview; for example `python -m http.server 8000`.

## GitHub Pages

Use Settings → Pages → Deploy from a branch → main → / (root). `.nojekyll` keeps publication static.

Branding: Estate Basics.
