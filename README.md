<p align="center"><img src="docs/brand.png" alt="NoxaPlus" width="520"></p>

## Live Demo

[Open NoxaPlus Scope Builder](https://noxaplus-star.github.io/noxaplus-scope-builder/)

# NoxaPlus Scope Builder

A free-to-use, browser-based tool for freelancers and small service providers
to prepare clear, non-binding service proposals.

The application has a Persian right-to-left interface. It runs locally using
plain HTML, CSS, and JavaScript, without a backend, build step, or external
runtime dependencies.

Author / brand: **NoxaPlus**  
Documented version: **0.3.0**

## What it does

Enter the provider, client, project details, document identity, and service
items to build a live proposal preview. Start from a reusable fictional
template or a blank form, then save an editable JSON copy, reopen it later,
or use the browser print dialog to print the proposal or save it as a PDF.

The working draft is autosaved in the same browser, and the interface offers
light and dark themes, a sticky preview on desktop, and editor/preview tabs on
mobile.

This tool helps describe scope and pricing. It is not a legally reviewed
contract and does not produce an official tax invoice.

## Current features

### Layout and interface

- Persian right-to-left interface with a professional, minimal visual system.
- Light and dark themes. The default follows the operating-system preference;
  an explicit choice is remembered in the browser.
- Wide-screen two-column workspace with a sticky, independently scrollable
  live preview.
- Mobile and narrow-screen editor/preview tabs with keyboard arrow, Home, and
  End navigation.
- Numbered form sections, completion meter, autosave status, and clearly
  separated document actions.
- Locally bundled Vazirmatn variable font under the SIL Open Font License 1.1
  and inline SVG icons. No CDN font or icon requests.
- Skip link, visible focus styles, reduced-motion support, and responsive
  controls.

### Proposal content

- Provider, client, project title, and project description.
- Proposal number and issue date, shown in the preview and print output.
- Addable and removable service rows with per-row totals.
- Positive whole-number quantities and non-negative unit prices.
- Subtotal, fixed-amount discount, and proposal total.
- Exact monetary arithmetic using `BigInt` in hundredths of the selected
  display unit.
- Included and excluded work, entered one item per line.
- Delivery time and a non-negative number of revision rounds.
- USD, USDT, and تومان display labels without currency conversion.
- Persian validation messages and rejection of invalid financial inputs.
- Plain-text rendering of user-entered and imported content.

### Workflow

- Four fictional templates: website design/development, consulting, monthly
  support, and a sample café proposal.
- Confirmation before replacing meaningful form content, resetting, starting
  fresh, or clearing the saved draft.
- Local autosave with a restore banner; the draft can be cleared explicitly.
- UTF-8 JSON export and import with schema version 2.
- Version 1 exports from earlier releases remain importable.
- Import validation before replacing the current form, including size, UTF-8,
  JSON syntax, schema, types, limits, numeric rules, and discount limit.
- Browser printing and Save as PDF, with A4 portrait styling and omission of
  blank optional print sections.
- Toast and inline feedback for file, print, template, and draft actions.

There is no login, payment processing, automatic tax calculation, currency
conversion, cloud sync, or backend storage.

## Local autosave

The draft is saved in `localStorage` under
`noxaplus-scope-builder:draft` after edits (with a short debounce) and after
import/template/reset/new-proposal actions. The selected theme is stored under
`noxaplus-scope-builder:theme`.

On the next load in the same browser storage context, the draft is restored and
a banner offers a fresh start. "پاک کردن نسخهٔ ذخیره‌شده" removes the saved copy
without changing the current form; autosave resumes on the next edit.

This is local convenience, not backup or cloud recovery. It does not follow the
user to another browser, device, or hosting origin. It is not encrypted, can be
unavailable in restricted/private browser modes, and can be lost when site data
is cleared. Export JSON for an explicit backup.

## Run locally

1. Keep the project structure intact, including `assets/fonts/`.
2. Open `index.html` in a browser with JavaScript enabled.
3. Enter a proposal, choose a template, or restore a previously autosaved
   draft.

No installation, terminal command, package manager, API key, or local server
is required.

The application references its stylesheet, JavaScript, and font using relative
paths. Its code does not load CDN resources, remote fonts, analytics, or
external APIs.

Browser handling of `localStorage` for `file://` pages can vary. If autosave is
unavailable, the toolbar reports an error; exporting JSON still works.

## Project structure

    .
    ├── index.html
    ├── style.css
    ├── app.js
    ├── README.md
    ├── LICENSE
    ├── .gitignore
    ├── CHANGELOG.md
    ├── assets/
    │   └── fonts/
    │       ├── vazirmatn-var.woff2
    │       └── OFL.txt
    └── docs/
        ├── test-checklist.md
        └── privacy.md

Optional local directories `private-data/` and `backups/` are excluded by the
provided `.gitignore`. They are not required to run the application.

## Entering prices and quantities

- Quantity must be a positive whole number with at most 9 digits.
- Revision rounds must be a non-negative whole number with at most 9 digits.
- Unit prices and the fixed discount must be non-negative.
- Each entered monetary amount allows at most 12 integer digits and
  2 decimal places.
- The discount cannot exceed the subtotal.
- Persian, Arabic, and English digits are accepted.
- Use `.` or `٫` as the decimal separator.
- Do not enter thousands separators.

### Monetary precision

The application applies the same two-decimal-place policy to USD, USDT, and
تومان. Inputs with more than two decimal places are rejected rather than
rounded.

Internally, monetary values use `BigInt` in hundredths of the selected display
unit. Row totals, subtotal, discount subtraction, and the final total do not
use floating-point monetary arithmetic.

Amounts are displayed with two decimal places. This policy is not a statement
about the customary precision of a currency or token.

### Currency labels

USD, USDT, and تومان are display labels only. Changing the selector changes
the label, not the numeric amounts. No exchange-rate conversion is performed.

The application does not add taxes, fees, or payment processing.

## Document identity

Proposal number and issue date are required, appear in the preview header and
print output, and are stored with the proposal. The issue date defaults to the
current Persian-calendar date. Both fields are free text subject to a length
limit, so the user remains responsible for numbering and date conventions.

## Export a proposal as JSON

1. Complete the required fields and correct validation errors.
2. Select `ذخیرهٔ JSON`.
3. Let the browser download the JSON file.

The generated filename follows this pattern:

    noxaplus-proposal-YYYY-MM-DD.json

The date comes from the device's local date.

The file contains all editable proposal inputs, together with:

- `appId`: `"noxaplus-scope-builder"`
- `schemaVersion`: `2`

The schema version 2 fields are:

- `proposalNumber`
- `proposalDate`
- `provider`
- `client`
- `title`
- `description`
- `currency`
- `services`, containing `description`, `quantity`, and `unitPrice`
- `fixedDiscount`
- `includedWork`
- `excludedWork`
- `deliveryTime`
- `revisionRounds`

Numeric input values are stored as strings to preserve their input
representation. `schemaVersion` is a JSON number.

Computed totals are not exported. They are recalculated from the inputs.
Exports larger than 1 MiB are rejected so that exported files remain within
the import size limit.

Export again to create a new file after changes; autosave is not a file backup.

## Import a proposal from JSON

1. Select `باز کردن`.
2. Explicitly choose a proposal JSON file.
3. If prompted, confirm replacement of the current form.

The application checks the file size, UTF-8 decoding, JSON syntax, app
identifier, schema version, expected field types, text limits, supported
currency labels, service rows, numeric rules, and discount limit before
applying imported data.

The maximum file size is 1 MiB: 1,048,576 bytes.

Unsupported versions and invalid proposals are rejected. Extra fields,
including any supplied totals, are ignored. Totals are recalculated.

Version 1 files are accepted for compatibility; missing document number and
date receive defaults. Version 2 files must contain both fields.

Cancelling file selection, declining replacement, or submitting an invalid
file does not replace the current proposal. The same file can be selected
again.

Only versions 1 and 2 of this application's schema are supported; arbitrary
JSON files are not supported.

## Print or save as PDF

1. Complete and validate the proposal.
2. Select `چاپ / PDF` in the editor toolbar. On mobile, the print icon in the
   preview toolbar performs the same action.
3. In the browser print dialog, choose a printer or select `Save as PDF`.
4. Review the pages and confirm printing or saving.

The application refreshes the preview and reuses the existing validation before
calling `window.print()`.

The print stylesheet targets A4 portrait with 15 mm margins. It hides the
editor, themes, toolbars, dialogs, toasts, and other controls; removes preview
scrolling constraints; repeats table headers where supported; and avoids
breaking ordinary rows, totals, scope cards, and the disclaimer where
possible.

Blank optional description, included-work, excluded-work, and delivery-time
sections are omitted from print output. The legal disclaimer remains.

Browser-generated headers and footers, such as the date, file address, or
page numbers, are controlled through browser print settings. Application CSS
cannot reliably guarantee their removal.

The application cannot determine whether the user saved a PDF, printed a
document, or cancelled the dialog. It does not claim that a PDF was saved.

For a proposal that can be imported and edited later, keep its JSON export;
a PDF is not an import format.

## Privacy and exported files

The application code does not send network requests. Proposal values are held
in the current page's form, DOM, temporary JavaScript objects, and the local
autosave entry. The theme choice is also stored locally.

The autosaved draft, JSON, and PDF files contain client and pricing
information. Local processing does not encrypt that information. Protect it,
clear the saved draft on shared devices when appropriate, and do not add real
client data to a public repository.

See [Privacy and data flow](docs/privacy.md).

## Manual and automated testing

Local automated browser checks were run on 2026-11-16 with Playwright driving
installed Chrome against the static page. They covered desktop/mobile layout,
theme switching, templates, validation, exact arithmetic, schema 1 and 2
import, rejected versions, export/import round trips, autosave and restore,
draft clearing, confirmation dialogs, print blocking and triggering, mobile
tabs, preview printing, and print-media styles.

The test scripts were run locally and are not included as a committed test
suite. No independent security audit, real-device test, or comprehensive
browser-compatibility matrix is claimed.

The user also reported earlier manual checks for calculations and validation,
JSON export/import, cancelling import replacement, printing and PDF output,
Persian text, multipage output, and continued use after cancelling print.

See the [manual test checklist](docs/test-checklist.md) for reported results
and additional checks.

## Current limitations

- The interface is Persian only.
- Autosave is local to one browser storage context, does not sync, is not
  encrypted, and depends on localStorage availability.
- Clearing browser site data or storage limits can remove the draft.
- Browser form restoration may vary and is not an application recovery
  feature.
- JSON import supports only schema versions 1 and 2 and a 1 MiB limit.
- PDF generation uses the browser print dialog, not a dedicated PDF engine.
- Pagination, table-header repetition, margins, and row-break handling can
  vary between browsers and print settings.
- Print CSS requests that ordinary service rows, totals, scope cards, and the
  disclaimer remain together where possible; this is not guaranteed by every
  browser.
- Validation blocks printing through the application's print buttons.
  Browser-menu printing and keyboard shortcuts cannot be reliably blocked;
  the `beforeprint` handler refreshes the preview but does not cancel printing.
- There is no backend, account system, cloud sync, payment processing,
  automatic tax calculation, signature workflow, or legally reviewed contract
  generation.
- Broad browser and mobile-device compatibility has not yet been established.
- The templates are fictional starting points, not legal or pricing advice.

## Repository hygiene

Keep real proposals, client information, and exported PDFs outside the public
repository. The `.gitignore` includes private-data and backup directories,
but does not ignore all JSON files.

A `.gitignore` is not a privacy boundary. It does not stop someone from
manually uploading a file through GitHub's website, and it does not remove
files already tracked by Git.

## AI assistance

AI assistance was used to draft and revise application code and documentation.
Automated checks were executed locally against the static application, and
manual test results recorded here were reported by the user. They should not
be interpreted as an independent security audit.

## Licensing

Licensed under the MIT License. See [LICENSE](LICENSE).

The bundled Vazirmatn font is licensed under the SIL Open Font License 1.1;
see [assets/fonts/OFL.txt](assets/fonts/OFL.txt).

## فارسی

### معرفی

NoxaPlus Scope Builder یک پیشنهادساز خدمات با رابط فارسی و راست‌به‌چپ برای
فریلنسرها و ارائه‌دهندگان خدمات است.

اطلاعات طرفین، شماره و تاریخ سند، شرح پروژه، خدمات، قیمت‌ها، محدودهٔ کار،
زمان تحویل و دورهای بازبینی را وارد کنید تا پیش‌نمایش زندهٔ پیشنهاد ساخته شود.
مضاف بر این، می‌توانید از الگوهای آماده شروع کنید، بین حالت روشن و تاریک
جابه‌جا شوید و نسخهٔ کاری را در همان مرورگر ادامه دهید.

این خروجی پیشنهاد غیرالزام‌آور خدمات است؛ قرارداد بررسی‌شدهٔ حقوقی یا
صورتحساب رسمی مالیاتی نیست.

### اجرا

ساختار پروژه را کامل نگه دارید، از جمله پوشهٔ `assets/fonts/`، و
`index.html` را در مرورگر باز کنید. نصب بسته، اجرای دستور یا سرور لازم نیست.

فونت وزیرمتن و آیکون‌ها محلی‌اند و از CDN یا سرویس بیرونی دریافت نمی‌شوند.

### ذخیرهٔ خودکار و فایل

- پیش‌نویس، پس از ویرایش، به‌صورت خودکار در `localStorage` همان مرورگر ذخیره
  می‌شود و پس از بارگذاری دوباره با یک نوار بازیابی نمایش داده می‌شود.
- «شروع تازه» و «بازنشانی» پیش‌نویس را جایگزین می‌کنند.
- «پاک کردن نسخهٔ ذخیره‌شده» پیش‌نویس ذخیره‌شده را حذف می‌کند.
- ذخیرهٔ خودکار همگام‌سازی ابری نیست، رمزگذاری ندارد و به در دسترس بودن
  حافظهٔ مرورگر وابسته است.
- برای نگهداری نسخهٔ قابل‌ویرایش، «ذخیرهٔ JSON» را بزنید و فایل بگیرید.
- برای بازیابی، «باز کردن» را بزنید و فایل JSON همین برنامه را انتخاب کنید.
- حداکثر حجم فایل ۱ MiB است.
- پیش از جایگزینی فرمِ دارای محتوا، تأیید گرفته می‌شود.
- فایل نامعتبر یا لغو عملیات اطلاعات فعلی را جایگزین نمی‌کند.
- خروجی جدید از نسخهٔ ساختار ۲ استفاده می‌کند؛ فایل‌های نسخهٔ ۱ همچنان
  پذیرفته می‌شوند.

### چاپ و PDF

«چاپ / PDF» را بزنید. در نمای موبایل، آیکون چاپ در نوار پیش‌نمایش هم همین
عمل را انجام می‌دهد. برای دریافت PDF، در پنجرهٔ چاپ گزینهٔ `Save as PDF` را
انتخاب کنید.

چیدمان چاپ بر A4 عمودی با حاشیهٔ ۱۵ میلی‌متر تنظیم شده است. برای کنترل تاریخ،
آدرس و شمارهٔ صفحهٔ خودکار، تنظیمات سربرگ و پابرگ مرورگر را بررسی کنید. برنامه
نمی‌تواند ذخیره‌شدن PDF را تشخیص دهد.

### مبالغ و محدودیت‌ها

واحدهای USD، USDT و تومان فقط برچسب نمایشی هستند و تبدیل ارز انجام نمی‌شود.
مالیات، کارمزد یا پرداختی پردازش نمی‌شود. همهٔ مبالغ حداکثر دو رقم اعشار دارند
و ورودی دقیق‌تر به‌جای گردشدن رد می‌شود.

فایل‌های JSON و PDF و پیش‌نویس ذخیره‌شده حاوی اطلاعات مشتری و قیمت‌ها هستند.
آن‌ها را محافظت کنید و اطلاعات واقعی مشتری را در مخزن عمومی قرار ندهید.
پردازش محلی به معنای رمزگذاری داده‌ها نیست.

### مستندات تکمیلی

- [چک‌لیست آزمون دستی](docs/test-checklist.md)
- [حریم خصوصی و جریان داده](docs/privacy.md)
- [تاریخچهٔ تغییرات](CHANGELOG.md)

برند و پدیدآورنده: NoxaPlus.
