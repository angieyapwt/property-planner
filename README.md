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

Run `node test.cjs` and `node test-enhancements.cjs` to execute the calculation checks. No dependency installation or build is needed. Serve the folder with a static web server to preview; for example `python -m http.server 8000`.

## GitHub Pages

Use Settings → Pages → Deploy from a branch → main → / (root). `.nojekyll` keeps publication static.

Branding: Estate Basics.
