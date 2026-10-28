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

Repayments assume a constant monthly-rest interest rate and show the first payment's principal/interest, total interest, cash gap after current OA and a +1% rate comparison. The monthly amortisation table rounds each month's interest/principal to cents and adjusts the final payment. PDF reports include an repayment summary without amortisation tables.

Assessment data autosaves locally across property tabs and reloads. Property Planner saved estimates can include an assessment snapshot; JSON backups include the current assessment. HDB and condo targets can be imported from the planner, and assessed HDB/condo loans can be copied back explicitly. EC results remain in the assessment/report to avoid relabelling an EC purchase as a condo scenario.

Commission amount fields show the rate-calculated total by default; typing a total creates an override. Clear it or choose Use commission rate to return to automatic calculation. Mobile label blocks align paired inputs, including both commission fields.

Both PDF downloads use `Property Planner - Name - DDMMMYY.pdf`, with the date in Singapore time (e.g. `Property Planner - Test Name - 28Oct26.pdf`).

## Others: pro-rated LTV

The Others tab implements the requested formula:

`((remaining lease - 20) / (95 - youngest buyer age - 20)) * current LTV limit`

Remaining lease is estimated as `original lease term - (current year - built year)`, floored at zero. The original lease defaults to 99 years and is editable. Built year is treated as an estimated lease-start year; it can differ from actual lease commencement. Use the actual lease commencement year when known.

Current year starts from the current Singapore year and can be overridden. DOB is optional. DOB age uses the actual birthday, evaluated at today's month/day in the selected year. Typing an age overrides DOB; changing DOB or clicking Use DOB age restores automatic calculation.

The starting LTV defaults to 75% and is editable. If remaining lease plus youngest age reaches 95, the starting LTV applies without reduction. Remaining lease of 20 years or less gives 0% under this formula. The applied LTV is bounded between zero and the starting limit. Loan estimate equals property price times the unrounded applied LTV.

This is a formula-based planning tool, not a bank/HDB approval or a CPF withdrawal-limit calculation. The HDB lease-based loan context and CPF lease-usage guidance are linked in the tab. Actual financing also depends on valuation, age, tenure, income and eligibility.

Values autosave locally, are retained when changing tabs, and are included in saved-estimate snapshots and JSON backups. A button can copy the HDB purchase price from Property Planner.

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
- `lease-ltv-model.js`, `others.js`, `others.css`: the Others tab and its pure lease/LTV engine.
- `test-lease-ltv.cjs`: formula, coverage boundaries, DOB, overrides and short-lease checks.

Run `node test.cjs`, `node test-enhancements.cjs`, `node test-affordability.cjs` and `node test-lease-ltv.cjs` to execute the calculation checks. No dependency installation or build is needed. Serve the folder with a static web server to preview; for example `python -m http.server 8000`.

## GitHub Pages

Use Settings → Pages → Deploy from a branch → main → / (root). `.nojekyll` keeps publication static.

Branding: Estate Basics.


### Simplified affordability workspace

The page uses a first housing loan, annual variable income at 70%, full-rate CPF allocation (with editable OA), no existing housing instalments, and EC subject to MSR. Main Max Loan always matures by age 65; maturity defaults to 65 and longer-tenure options are collapsed. Three synchronized buttons assess applicant 1, applicant 2 or applicants 1 + 2. New applicant entry is below the first applicant section. Older saved applicant details are preserved, while removed assumptions are normalized on restore.

The detailed property summary is driven by the selected loan amount: implied property price = loan / LTV, with equity and minimum cash contributions shown before purchase costs. Price is assumed equal to valuation. It is a financing illustration, not a full cash-budget affordability limit. The selected loan can be sent to Property Planner for purchase-cost calculations. The on-screen amortisation table remains expandable. PDFs use the same simplified assumptions and property summary.

Others also shows the original full loan (price × current starting LTV) in regular weight beside the pro-rated result.

Additional checks: `node test-simplified.cjs` (saved-state normalization, income recognition, selected applicants, maturity and loan-driven property budgets).


### Combined PDF report

Use **Export combined report** in either Property Planner or Affordability Assessment. The report includes a premium blue cover, the current property scenario and all its breakdowns, followed by the current selected affordability assessment, applicant details, notes, assumptions and repayment figures without amortisation tables. It uses a shared name (Property Planner name first, assessment name if blank, otherwise scenario label) and one Singapore report date across every page. The filename remains `Property Planner - Name - DDMMMYY.pdf`. Each workspace retains its own figures and notes; export does not overwrite names, assessment dates or calculation inputs. Both sections must contain valid figures; missing information opens a notice with a link to the relevant section. Existing individual exports remain available.

`combined-report.js` coordinates the local workspaces. `pdf.js` renders the cover and both chapters in one document with continuous pagination. `node test-combined-report.cjs` checks both sections, shared identity, retained notes and assumptions, pagination, PDF cross-references and filename dates.


### Compact assessment and portable saves

Affordability shows Max Loan and Max Property Price for HDB, EC and Condo, a numeric automatic tenure, a property-specific summary title and the effective MAS assessment rate plus the quoted interest rate. Repeated standard/extended cards and stressed ratio displays are removed; the primary assessment remains maturity by age 65. Calculation checks are unchanged: HDB/new EC take the lower of MSR and TDSR headroom; Condo uses TDSR.

Save assessment to device downloads a standalone JSON restore file; Restore assessment reloads it. Browser autosaving continues. Assessment-only PDF export remains available, and combined export is enabled when both calculations are available. Names follow between tabs while blank or previously shared; separately entered names remain independent. A manually entered planner loan can seed a blank matching assessment loan. A valid assessment can fill a blank matching Property Planner purchase when switching tabs; existing purchase figures are preserved. The explicit Use this loan action preserves a compatible sale-and-purchase scenario and existing price/valuation, and updates the loan. Monthly CPF OA contributions are not copied into total CPF savings fields.

LTV results display whole percentages and dollar amounts; the unrounded formula still determines the loan. The comparison also shows original full loan minus pro-rated loan.

### Read-only property summaries

All editable assessment controls (including quoted interest, tenure, property selection, loan override and notes) are under Lending Assumptions. The matching HDB, EC or Condo summary displays labeled lines only, followed by save/export actions and expandable amortisation. Clicking any cell in a comparison row selects the property, scrolls to its summary and focuses its heading. Rows support Enter/Space keyboard activation and visible focus. Calculation, save and PDF data remain unchanged.



### Fresh starts, IWAA and Others exports

Affordability and Others have independent Start fresh actions with a confirmation dialog. Defaults return (4% assessment rate, age-65 maturity, 99-year original lease and 75% LTV); their current draft clears and persists. Other workspaces and downloaded saves remain intact. Fresh drafts suppress automatic old-planner prefill, including after reload.

The planning model rounds income-weighted age upward to the next whole year before tenure/LTV checks, retaining `rawAge` for audit/tests. This is an explicitly requested conservative rounding assumption; the site/report does not claim a verified universal MAS rounding requirement. Tenure remains actual loan years and stays editable as clarified by the user. Property selection uses the HDB/EC/Condo comparison rows. Notes span both input columns.

All currency values display without decimals while internal calculations retain precision. The summary omits duplicate selected-loan/property rows, effective assessment rate and minimum cash downpayment; remaining Max Loan and Max Property Price follow the editable loan amount. PDF exports contain no annual/monthly amortisation sections; the on-screen table remains available.

Others includes Save to device (JSON), Restore calculation and standalone Export PDF, without combined export. The PDF contains lease/buyer inputs, full versus pro-rated loan amounts, the difference, formula and assumptions. Export is available only after a valid complete calculation with a property price. `workspace-fresh.js` manages reset confirmation; `node test-iwaa-reset.cjs` checks rounding, tenure effects and fresh-state persistence.
