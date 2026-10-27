# Property Studio

A browser-local property planning workspace for Angie Yap, combining the HDB and condo calculators in a single premium interface.

## Scenarios

- Buy an HDB
- Sell an HDB
- Sell HDB and buy HDB
- Sell HDB and buy condo
- Buy a condo
- Sell a condo
- Sell condo and buy condo

## Features

- Responsive ivory, navy and gold theme.
- Separate scenario drafts, automatically saved in the current browser.
- Named estimate collection, reopen and remove controls.
- JSON backup download and restore.
- Dependency-free downloadable PDF with inputs, notes, calculation breakdown and assumptions.
- No enquiry form, analytics, server storage, external fonts, or third-party scripts.

Saved data is limited to the current browser and origin. Clearing browser data removes it; download a JSON backup to keep a separate copy. Drafts from the original calculator sites do not automatically transfer.

## Calculation behavior

Loan estimates use up to 75% of the lower purchase price and valuation. Approved loans are capped by this amount. Cash-over-valuation, bank minimum cash downpayment, miscellaneous fees and commissions are cash only. Eligible CPF and grants do not offset these amounts.

The COV summary row follows the downpayment rows. Cash top up for Loan is the positive difference between 75% of purchase price and 75% of valuation, shown for purchases using a loan. Guide rows are explanatory and do not add duplicate costs.

Second HDB loan proceeds paydown defaults to 50% of positive HDB sale proceeds, capped by the approved loan, with a manual override. Set an explicit zero to override the default. CPF OA must include any sale CPF refund the buyer intends to reuse; it is not automatically added again.

Stamp duties use the higher purchase price and market valuation. Commission includes 9% GST unless a full edited amount is provided. Zero overrides and disabled commission are supported. Actual loan, CPF, grant and tax eligibility must be confirmed separately.

## Files

- `model.js`: pure shared calculation functions.
- `app.js`: UI, browser persistence, backup/restore and PDF download.
- `pdf.js`: paginated A4 PDF writer.
- `index.html`, `styles.css`: interface and responsive design.
- `test.cjs`: model checks and sample PDF generation.

Run `node test.cjs` to execute the calculation checks. No dependency installation or build is needed. Serve the folder with a static web server to preview; for example `python -m http.server 8000`.

## GitHub Pages

Use Settings → Pages → Deploy from a branch → main → / (root). `.nojekyll` keeps publication static.

Branding: Angie Yap · CEA Reg No. R067805D.
