# Manual test checklist

Project: NoxaPlus Scope Builder  
Documentation baseline: 0.1.0  
Recorded: 2026-10-26

This document records manual testing only. No automated test suite is included,
and no automated test execution is claimed.

## A. Checks reported as passed by the user

The following categories were explicitly reported as working by the user.
These results have not been independently reproduced by the documentation
author.

- [x] Service calculations and input validation.
- [x] JSON export and import.
- [x] Cancelling replacement of the current form during import.
- [x] Browser printing and PDF output.
- [x] Persian text in output.
- [x] Multipage print output.
- [x] Continued application operation after cancelling print.

Browser name, version, operating system, device, and exact test inputs were
not recorded with these reports. These results do not establish compatibility
with every browser or device.

## B. Additional checks still requiring verification

These are more specific checks or additional coverage. Do not mark them passed
solely because a broader category in section A was reported as working.

### 1. Form and arithmetic

- [ ] Load fictional sample data: subtotal is 240.00 USD, discount is
      20.00 USD, and total is 220.00 USD.
- [ ] With one service, quantity `3`, unit price `0.10`, and discount `0`,
      row total and proposal total are exactly 0.30.
- [ ] A zero unit price is accepted.
- [ ] A discount equal to the subtotal produces a valid zero total.
- [ ] Adding and removing rows updates the preview and totals.
- [ ] Switching USD, USDT, and تومان changes only labels, not numeric values.
- [ ] Quantity `۲` and price `۱۲٫۵۰` produce a row total of 25.00.
- [ ] Arabic digits such as `٢` and `١٢٫٥٠` are accepted.
- [ ] Included and excluded work preserve separate non-empty lines.
- [ ] Zero revision rounds are accepted and displayed.
- [ ] Cancelling reset preserves the current form.
- [ ] Confirming reset restores the initial form.

### 2. Invalid inputs and boundaries

- [ ] Empty provider, client, and project title show Persian errors.
- [ ] Whitespace-only required text is rejected.
- [ ] An empty service description is rejected.
- [ ] Removing every service produces a minimum-service error.
- [ ] Quantity `0`, `-1`, and `1.5` are rejected.
- [ ] Negative or fractional revision rounds are rejected.
- [ ] Quantities and revision counts longer than 9 digits are rejected.
- [ ] Negative prices and discounts are rejected.
- [ ] A price such as `1.234` is rejected, not rounded.
- [ ] A monetary input with more than 12 integer digits is rejected.
- [ ] Thousands separators in monetary inputs are rejected.
- [ ] An empty price or discount is not silently treated as zero.
- [ ] A discount larger than the subtotal is rejected.
- [ ] Invalid financial inputs do not display a misleading valid final total.

### 3. JSON export and round-trip import

- [ ] Export a valid proposal and inspect the downloaded UTF-8 JSON.
- [ ] Confirm `appId` is `noxaplus-scope-builder`.
- [ ] Confirm `schemaVersion` is the number `1`.
- [ ] Confirm all editable inputs are present, including optional blank text.
- [ ] Confirm numeric inputs are stored as strings.
- [ ] Confirm computed totals are not exported.
- [ ] Confirm the filename follows `noxaplus-proposal-YYYY-MM-DD.json`.
- [ ] Export, reset, and import; compare every field and service row.
- [ ] Repeat with Persian text, line breaks, and mixed Latin content.
- [ ] Select the same file twice and confirm both selections are processed.
- [ ] Edit after export and confirm the existing downloaded file does not
      change automatically.
- [ ] Export again and confirm the new file contains the edited inputs.
- [ ] Invalid form data prevents export.
- [ ] An export exceeding 1 MiB is rejected.

### 4. Invalid JSON, invalid schema, and cancellation

Use copies of exported files, never the only copy of a real proposal.

- [ ] An empty file is rejected.
- [ ] Malformed JSON is rejected.
- [ ] A file larger than 1,048,576 bytes is rejected.
- [ ] Invalid UTF-8 is rejected.
- [ ] An incorrect or missing `appId` is rejected.
- [ ] `schemaVersion: 2` is rejected.
- [ ] `schemaVersion: "1"` is rejected because it is a string.
- [ ] A top-level array or `null` is rejected.
- [ ] Missing expected fields are rejected.
- [ ] Incorrect types, including numeric values where strings are expected,
      are rejected.
- [ ] An unsupported currency such as `EUR` is rejected.
- [ ] An empty services array is rejected.
- [ ] Invalid service quantities, unit prices, or descriptions are rejected.
- [ ] Excessively long text fields are rejected.
- [ ] A discount larger than the imported subtotal is rejected.
- [ ] Extra fields such as a fake `total` are ignored; totals are recalculated.
- [ ] Cancelling file selection preserves the form.
- [ ] Declining replacement preserves every current form value.
- [ ] Each failed import preserves the current proposal and preview.
- [ ] Imported `<b>example</b>` appears as text, not rendered markup.
- [ ] Imported content does not automatically trigger printing.

### 5. Short proposal printing and PDF

- [ ] The application print button refuses an invalid proposal.
- [ ] Print immediately after editing; output includes the newest values.
- [ ] Only the proposal preview appears, without editor controls or notices.
- [ ] Provider, client, title, service table, amounts, revision rounds, and
      legal disclaimer are present.
- [ ] Non-empty optional sections are included.
- [ ] Blank optional sections and their placeholder messages are omitted.
- [ ] A4 portrait output is readable with the intended margins.
- [ ] Output remains readable with background graphics disabled.
- [ ] Save as PDF, open the resulting file, and inspect the actual pages.
- [ ] Cancelling printing does not clear data or disable normal actions.
- [ ] The application never claims that a PDF was successfully saved.
- [ ] Browser header/footer settings can be adjusted separately.

### 6. Multipage proposal printing

- [ ] Create approximately 30–50 valid service rows to span multiple pages.
- [ ] Confirm the first and last rows and all intermediate rows are present.
- [ ] Confirm the table is not clipped by the screen scroll container.
- [ ] Check whether table headers repeat in the tested browser.
- [ ] Check ordinary row splitting near page boundaries.
- [ ] Check whether subtotal, discount, and total remain together where possible.
- [ ] Add long included/excluded sections and confirm they continue across pages.
- [ ] Confirm the disclaimer remains present at the end of the proposal.
- [ ] Check that no content is forced into a single scaled-down page.
- [ ] Check for unintended blank pages or large unexplained gaps.

### 7. Persian and mixed-direction text

- [ ] Persian text is legible on screen and in the saved PDF.
- [ ] Test `طراحی Landing Page برای NoxaPlus` in a description.
- [ ] Test a Latin provider name and a Persian client name together.
- [ ] Inspect the placement of amounts with USD and USDT.
- [ ] Inspect amounts with تومان and Persian digits.
- [ ] Check long unbroken text for overflow or clipping.

### 8. Mobile-width layout and keyboard use

- [ ] At approximately 320 px, the page has no unintended page-wide overflow.
- [ ] At approximately 375–390 px, controls remain readable and usable.
- [ ] Editor and preview stack vertically at narrow widths.
- [ ] The service table can be horizontally scrolled without clipping the page.
- [ ] Add, remove, export, import, print, sample, and reset buttons are usable.
- [ ] Keyboard focus is visible.
- [ ] Form labels identify their associated controls.
- [ ] File-operation and print messages are understandable.
- [ ] Check on an actual mobile device, not only a resized desktop window.

### 9. Data-flow inspection

- [ ] With browser developer tools, inspect runtime network activity and confirm
      no application-initiated external requests occur during editing,
      export/import, or print preparation.
- [ ] Confirm no proposal is written to localStorage, sessionStorage, IndexedDB,
      or cookies by application code.
- [ ] Refresh after editing and confirm there is no app-managed restoration.
- [ ] Distinguish any browser form restoration from application persistence.

## Recording a new manual run

For future runs, record:

- Date:
- Browser and version:
- Operating system:
- Device or viewport:
- Test items:
- Result:
- Observed problem:
- Reproduction steps:

Use fictional data. Do not paste real client information into public issues,
screenshots, or test reports.

## فارسی: نحوهٔ خواندن این چک‌لیست

بخش A فقط آزمون‌هایی است که کاربر انجام‌شدن موفق آن‌ها را گزارش کرده است.
جزئیات مرورگر و ورودی‌های دقیق این آزمون‌ها ثبت نشده‌اند.

بخش B شامل آزمون‌های دقیق‌تر و مواردی است که هنوز به تأیید جداگانه نیاز دارند.
علامت‌نخوردن آن‌ها به معنی وجود خطا نیست؛ یعنی نتیجهٔ مستقل برای آن مورد
ثبت نشده است.

هیچ موردی در این سند آزمون خودکار محسوب نمی‌شود.
## محیط آزمون دستی

- تاریخ: Oct 27 2026
- سیستم‌عامل و نسخه: Windows 11 pro 26H2
- مرورگر و نسخه:Chrome  156.0.8078.48
- دستگاه: کامپیوتر ویندوزی Laptop
- روش اجرا: باز کردن مستقیم index.html
- آزمون روی موبایل واقعی: انجام نشده
- آزمون نمای موبایل در ابزار مرورگر: در انتظار بررسی
## گزارش آزمون دستی پیش از انتشار

- تاریخ آزمون: 2026-10-27
- سیستم‌عامل: Windows — [نسخه واقعی را وارد کنید]
- مرورگر: [نام و نسخه واقعی]
- روش اجرا: باز کردن مستقیم index.html

نتایج:
- محاسبات و اعتبارسنجی ورودی‌ها: موفق
- رد فایل JSON خراب و نسخه ساختار نامعتبر: موفق
- حفظ اطلاعات هنگام لغو یا شکست ورود فایل: موفق
- بازکردن دوباره همان فایل: موفق
- بررسی نمای موبایل در عرض‌های 320، 375 و 768: موفق
- درخواست شبکه خارجی در سناریوهای بررسی‌شده: مشاهده نشد
- خطای قرمز مرتبط با برنامه در Console: مشاهده نشد
- خروجی PDF کوتاه و چندصفحه‌ای: موفق

این نتایج مربوط به آزمون دستی در محیط بالا هستند؛
آزمون روی همه مرورگرها و دستگاه‌ها انجام نشده است.