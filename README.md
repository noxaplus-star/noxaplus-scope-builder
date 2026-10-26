# NoxaPlus Scope Builder

A free-to-use, browser-based tool for freelancers and small service providers
to prepare clear, non-binding service proposals.

The application has a Persian right-to-left interface. It runs locally using
plain HTML, CSS, and JavaScript, without a backend, build step, or external
runtime dependencies.

Author / brand: **NoxaPlus**

## What it does

Enter the provider, client, project details, and service items to build a live
proposal preview. Export editable proposal data as JSON, import it later, or
use the browser print dialog to print the proposal or save it as a PDF.

This tool helps describe scope and pricing. It is not a legally reviewed
contract and does not produce an official tax invoice.

## Current features

- Persian right-to-left interface with a responsive screen layout.
- Provider, client, project title, and project description.
- Addable and removable service rows.
- Positive whole-number quantities and non-negative unit prices.
- Row totals, subtotal, fixed-amount discount, and proposal total.
- Persian validation messages.
- Included and excluded work, entered one item per line.
- Delivery time and a non-negative number of revision rounds.
- Fictional sample data.
- Reset with confirmation.
- Manual UTF-8 JSON export and import.
- Import validation before replacing the current form.
- Confirmation before importing over a form that differs from its initial state.
- Browser printing and Save as PDF.
- A4 portrait print styling and multipage content flow.
- Plain-text rendering of user-entered and imported content.

There is no login, payment processing, automatic tax calculation, currency
conversion, or automatic saving.

## Run locally

1. Keep `index.html`, `style.css`, and `app.js` in the same directory.
2. Open `index.html` in a browser with JavaScript enabled.
3. Enter a proposal or select the fictional sample data.

No installation, terminal command, package manager, API key, or local server
is required.

The application references its stylesheet and JavaScript using relative paths.
Its code does not load CDN resources, remote fonts, analytics, or external APIs.

## Project structure

    .
    ├── index.html
    ├── style.css
    ├── app.js
    ├── README.md
    ├── .gitignore
    ├── CHANGELOG.md
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

The prototype applies the same two-decimal-place policy to USD, USDT, and
تومان. Inputs with more than two decimal places are rejected rather than
rounded.

Internally, monetary values use `BigInt` in hundredths of the selected display
unit. Row totals, subtotal, discount subtraction, and the final total do not
use floating-point monetary arithmetic.

Amounts are displayed with two decimal places. This prototype policy is not
a statement about the customary precision of a currency or token.

### Currency labels

USD, USDT, and تومان are display labels only. Changing the selector changes
the label, not the numeric amounts. No exchange-rate conversion is performed.

The application does not add taxes, fees, or payment processing.

## Export a proposal as JSON

1. Complete the required fields and correct validation errors.
2. Select `ذخیره پیشنهاد`.
3. Let the browser download the JSON file.

The generated filename follows this pattern:

    noxaplus-proposal-YYYY-MM-DD.json

The date comes from the device's local date.

The file contains all editable proposal inputs, together with:

- `appId`: `"noxaplus-scope-builder"`
- `schemaVersion`: `1`

The version 1 fields are:

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

The page does not auto-save. Export again after editing if you want to keep
the updated proposal.

## Import a proposal from JSON

1. Select `باز کردن پیشنهاد`.
2. Explicitly choose a proposal JSON file.
3. If prompted, confirm replacement of the current form.

The application checks the file size, UTF-8 decoding, JSON syntax, app
identifier, schema version, expected field types, text limits, supported
currency labels, service rows, numeric rules, and discount limit before
applying imported data.

The maximum file size is 1 MiB: 1,048,576 bytes.

Unsupported versions and invalid proposals are rejected. Extra fields,
including any supplied totals, are ignored. Totals are recalculated.

Cancelling file selection, declining replacement, or submitting an invalid
file does not replace the current proposal. The same file can be selected
again.

Only version 1 of this application's schema is supported; arbitrary JSON
files are not supported.

## Print or save as PDF

1. Complete and validate the proposal.
2. Select `چاپ / ذخیره PDF`.
3. In the browser print dialog, choose a printer or select `Save as PDF`.
4. Review the pages and confirm printing or saving.

The application's button refreshes the preview and reuses the existing
validation before calling `window.print()`.

The print stylesheet targets A4 portrait with 16 mm margins. It hides the
editor and other application controls, removes preview scrolling constraints,
and allows long content to continue across pages.

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

The application code does not send network requests. Proposal values are
held in the current page's form and DOM, with temporary JavaScript objects
during operations.

JSON and PDF files contain client and pricing information. Local processing
does not encrypt those files. Protect them and do not add real client data
to a public repository.

See [Privacy and data flow](docs/privacy.md).

## Manual testing

The user has reported passing manual checks for calculations and validation,
JSON export/import, cancelling import replacement, printing and PDF output,
Persian text, multipage output, and continued use after cancelling print.

These are user-reported manual results, not automated tests or independently
verified cross-browser results.

See the [manual test checklist](docs/test-checklist.md) for reported results
and additional checks requiring verification.

## Current limitations

- The interface is Persian only.
- There is no auto-save or localStorage persistence.
- Refreshing or closing the page does not create a recoverable app-managed
  copy; export JSON before leaving if you need to retain the proposal.
- Browser form restoration may vary and is not an application saving feature.
- JSON import supports only the current version 1 schema and a 1 MiB limit.
- PDF generation uses the browser print dialog, not a dedicated PDF engine.
- Pagination, table-header repetition, margins, and row-break handling can
  vary between browsers and print settings.
- Print CSS requests that ordinary service rows and the totals block remain
  together where possible; this is not guaranteed by every browser.
- Validation blocks printing through the application's print button.
  Browser-menu printing and keyboard shortcuts cannot be reliably blocked;
  the `beforeprint` handler refreshes the preview but does not cancel printing.
- There is no backend, account system, payment processing, automatic tax
  calculation, signature workflow, or legally reviewed contract generation.
- Broad browser and mobile-device compatibility has not yet been established.

## Repository hygiene

Keep real proposals, client information, and exported PDFs outside the public
repository. The `.gitignore` includes private-data and backup directories,
but does not ignore all JSON files.

A `.gitignore` is not a privacy boundary. It does not stop someone from
manually uploading a file through GitHub's website, and it does not remove
files already tracked by Git.

## AI assistance

AI assistance was used to draft and revise application code and documentation.
Manual test results recorded here were reported by the user. They should not
be interpreted as automated testing or an independent security audit.

## Licensing status

A license has not yet been selected. No `LICENSE` file is included in this
version. Free-to-use project intent should not be interpreted as an already
granted open-source license.

## فارسی

### معرفی

NoxaPlus Scope Builder یک پیشنهادساز خدمات با رابط فارسی و راست‌به‌چپ برای
فریلنسرها و ارائه‌دهندگان خدمات است.

اطلاعات طرفین، شرح پروژه، خدمات، قیمت‌ها، محدودهٔ کار، زمان تحویل و دورهای
بازبینی را وارد کنید تا پیش‌نمایش پیشنهاد ساخته شود.

این خروجی پیشنهاد غیرالزام‌آور خدمات است؛ قرارداد بررسی‌شدهٔ حقوقی یا
صورتحساب رسمی مالیاتی نیست.

### اجرا

سه فایل `index.html`، `style.css` و `app.js` را کنار هم نگه دارید و
`index.html` را در مرورگر باز کنید. نصب بسته، اجرای دستور یا سرور لازم نیست.

### ذخیره و بازیابی

- برای نگهداری ورودی‌های قابل‌ویرایش، «ذخیره پیشنهاد» را بزنید و JSON بگیرید.
- برای بازیابی، «باز کردن پیشنهاد» را بزنید و فایل JSON همین برنامه را انتخاب کنید.
- حداکثر حجم فایل ۱ MiB است.
- پیش از جایگزینی فرمِ تغییرکرده، تأیید گرفته می‌شود.
- فایل نامعتبر یا لغو عملیات نباید اطلاعات فعلی را جایگزین کند.
- صفحه ذخیرهٔ خودکار ندارد؛ پس از ویرایش دوباره خروجی بگیرید.

### چاپ و PDF

«چاپ / ذخیره PDF» را بزنید. برای دریافت PDF، در پنجره چاپ گزینه
`Save as PDF` را انتخاب کنید.

برای کنترل تاریخ، آدرس و شمارهٔ صفحهٔ خودکار، تنظیمات سربرگ و پابرگ
مرورگر را بررسی کنید. برنامه نمی‌تواند ذخیره‌شدن PDF را تشخیص دهد.

### مبالغ و محدودیت‌ها

واحدهای USD، USDT و تومان فقط برچسب نمایشی هستند و تبدیل ارز انجام نمی‌شود.
مالیات، کارمزد یا پرداختی پردازش نمی‌شود. همهٔ مبالغ حداکثر دو رقم اعشار دارند
و ورودی دقیق‌تر به‌جای گردشدن رد می‌شود.

فایل‌های JSON و PDF حاوی اطلاعات مشتری و قیمت‌ها هستند. آن‌ها را محافظت کنید
و اطلاعات واقعی مشتری را در مخزن عمومی قرار ندهید. پردازش محلی به معنای
رمزگذاری داده‌ها نیست.

### مستندات تکمیلی

- [چک‌لیست آزمون دستی](docs/test-checklist.md)
- [حریم خصوصی و جریان داده](docs/privacy.md)
- [تاریخچهٔ تغییرات](CHANGELOG.md)

برند و پدیدآورنده: NoxaPlus.