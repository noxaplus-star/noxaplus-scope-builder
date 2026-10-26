# Changelog

This file records project changes. An entry here does not indicate that a
GitHub release or a hosted deployment exists.

## [0.1.0] - 2026-10-26

Initial documented version, prepared for the first public release.

### Added

- Persian right-to-left service-proposal interface using plain HTML, CSS,
  and JavaScript.
- Responsive editor and live proposal preview.
- Provider, client, project title, and description inputs.
- Addable and removable service rows.
- Quantity, unit-price, subtotal, fixed-discount, and total calculations.
- Exact monetary arithmetic using `BigInt` in hundredths of the selected
  display unit.
- Persian validation messages and rejection of invalid financial inputs.
- USD, USDT, and تومان display labels without currency conversion.
- Included and excluded work, delivery time, and revision rounds.
- Fictional sample data and reset confirmation.
- UTF-8 JSON export and import using schema version 1.
- Import size limit of 1 MiB.
- Schema and input validation before importing.
- Confirmation before replacing a form that differs from its initial state.
- Recalculation of totals from imported inputs.
- Browser printing and Save as PDF through the browser print dialog.
- A4 portrait print styling, multipage content flow, and omission of blank
  optional print sections.
- Non-binding proposal and legal-disclaimer wording.
- README, manual test checklist, privacy/data-flow documentation, and
  repository ignore rules.

### Testing status

The user reported passing manual checks for:

- Service calculations and input validation.
- JSON export and import.
- Cancelling import replacement.
- Browser printing and PDF output.
- Persian text and multipage output.
- Continued operation after cancelling print.

No automated test execution, independent security audit, performance
measurement, or comprehensive browser-compatibility result is claimed.

### Current boundaries

- No automatic saving or app-managed proposal persistence.
- No payment processing, automatic tax calculation, or exchange-rate conversion.
- No legally reviewed contract or official tax invoice generation.
- No server, API integration, account system, or external runtime dependencies.
- No dedicated PDF library; output depends on browser printing.
- License selection is pending; no LICENSE file is included.