# Changelog

This file records project changes. An entry here does not indicate that a
GitHub release or a hosted deployment exists.

## [0.3.0] - 2026-11-16

Brand and readability update.

### Changed

- The hero headline now stays on one line on desktop windows instead of
  wrapping in the middle of the sentence; narrow screens still wrap normally.
- The original NoxaPlus logo replaces the letter tile in the header, favicon,
  and project README, with a light variant for the dark theme.

## [0.2.0] - 2026-11-16

Interface and workflow redesign, with local autosave and reusable templates.

### Added

- Professional light and dark themes with a persisted toggle and system-theme
  default.
- Two-column workspace with a sticky, scrollable live preview on wide screens.
- Editor/preview tabs on narrow screens.
- Locally bundled Vazirmatn variable font (SIL Open Font License 1.1) and an
  inline SVG icon set; no remote font or icon requests.
- Document number and issue date, shown in the preview and print output.
- Four reusable fictional templates: website, consulting, monthly support, and
  the sample café proposal.
- Autosave of the working draft in `localStorage`, a restore banner, a
  "start fresh" action, and a clear-saved-copy action.
- Completion meter and autosave status in the editor toolbar.
- Custom confirmation dialogs for reset, template replacement, import
  replacement, starting fresh, and clearing the saved copy.
- Toast and inline success/error feedback for save, import, print, and draft
  actions.
- Print/PDF shortcut in the mobile preview toolbar.
- Keyboard arrow/Home/End navigation for the mobile editor/preview tabs.
- Draft schema version 2 with document identity fields; version 1 files remain
  importable and receive default document metadata.
- Skip link, visible focus styles, reduced-motion support, and local favicon.

### Changed

- Reorganized the form into four numbered cards: parties/project, document
  identity, services/pricing, and scope/delivery.
- Reworked buttons, form controls, service rows, totals, scope cards, dialogs,
  and print typography.
- Print stylesheet now uses 15 mm A4 portrait margins and also hides toasts and
  dialogs.
- Default sample content is now provided through the template gallery.
- Copy throughout the interface and documentation now reflects local autosave,
  document identity, and template behavior.

### Testing status

Local automated browser checks were run on 2026-11-16 with Playwright driving
installed Chrome against the static page. They covered desktop and mobile
layout, theme switching, templates, validation, exact arithmetic, JSON export
and import (versions 1 and 2), rejected versions, autosave and restore, draft
clearing, confirmation dialogs, print blocking/triggering, preview-tab
navigation, and print-media styles.

No independent security audit, real-device test, or comprehensive
browser-compatibility matrix is claimed.

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

The user reported passing manual checks for service calculations, input
validation, JSON export and import, cancelling import replacement, browser
printing and PDF output, Persian text, multipage output, and continued
operation after cancelling print.

No automated test execution, independent security audit, performance
measurement, or comprehensive browser-compatibility result is claimed.

### Current boundaries

- No payment processing, automatic tax calculation, or exchange-rate
  conversion.
- No legally reviewed contract or official tax invoice generation.
- No server, API integration, account system, or external runtime
  dependencies.
- No dedicated PDF library; output depends on browser printing.
