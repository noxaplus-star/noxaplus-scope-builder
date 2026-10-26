# Privacy and data flow

Project: NoxaPlus Scope Builder  
Implementation baseline: 0.1.0  
Reviewed against the application code documented on 2026-10-26.

This document describes the application's own implementation. It is not a
security audit or a guarantee about browsers, operating systems, extensions,
hosting providers, or printing services.

## Application network behavior

The current application code does not initiate network requests.

It contains no application calls to external APIs, analytics services,
payment services, or upload endpoints. It does not load CDN libraries,
remote fonts, or external runtime resources.

`index.html` references `style.css` and `app.js` through relative paths.

When opened directly from a local directory, those resources are read as
local files. If the project is hosted on a website later, the browser will
request the page and its static files from that host. Hosting-related access
logs and policies are outside this application's implementation.

A browser, extension, operating system, print destination, or file-sync
service may have its own data behavior. The application does not control
those systems.

## Where proposal data exists during use

Editable values are held in the page's form controls. The live preview contains
copies of the relevant text and calculated amounts in the DOM.

JavaScript creates temporary objects and calculation values during rendering,
validation, export, and import. Monetary calculations use `BigInt`.

The application does not implement localStorage, sessionStorage, IndexedDB,
cookies, a backend database, or automatic saving of proposals.

The reset button replaces the current form values. It is not a secure erasure
operation and does not delete exported files or browser/operating-system
artifacts.

## JSON export

Export validates the current form and creates a JSON Blob in the browser.

A temporary object URL is used to request a file download. The application
removes the temporary download link and schedules object-URL cleanup. It
also releases outstanding download URLs on the page's `pagehide` event.

Releasing an object URL does not delete a downloaded JSON file.

The export contains the editable proposal inputs, including client information,
service descriptions, quantities, prices, discounts, and scope details.
Computed totals are not stored; they are recalculated when used.

Where the file is stored depends on the user's browser and download settings.

## JSON import

Import begins only when the user selects a file.

The application:

1. Checks the file size against the 1 MiB limit.
2. Reads the selected file into browser memory.
3. Decodes it as UTF-8.
4. Parses it with `JSON.parse`.
5. Validates the expected schema and proposal inputs.
6. Requests confirmation before replacing a form that differs from its
   initial state.
7. Applies accepted inputs and recalculates the preview.

The selected file is not uploaded by application code.

Imported totals and other unrecognized fields are not used. User-entered and
imported text is assigned through plain-text DOM methods or form values, not
inserted as executable HTML.

These implementation choices do not constitute a general guarantee that all
security risks have been eliminated.

## Printing and PDF

The application's print button validates the current proposal, refreshes the
preview, and calls `window.print()`.

The browser controls the print dialog, printer selection, PDF destination,
headers, footers, and final output.

Printed documents and PDFs include proposal information such as client names,
project details, scope, and pricing. They may also contain browser-generated
headers or footers, depending on print settings.

The application cannot determine whether printing completed, a PDF was saved,
or the user cancelled the dialog.

A network printer, cloud-connected print destination, shared computer, or
synchronised download folder may expose data beyond the page. Review the
settings of the tools you choose.

## Local does not mean encrypted

The application does not encrypt proposal data or exported files.

Processing locally does not, by itself, provide encryption, access control,
secure deletion, or protection from other software with access to the device.

The JSON export is a readable text file. PDFs and printed copies also require
appropriate protection.

## Protecting proposal files

- Use fictional data for public examples, demonstrations, and screenshots.
- Do not upload real client proposals, pricing, or personal information to
  the public repository.
- Review exported files before sharing them.
- Check the destination folder and any automatic cloud synchronisation.
- Protect access to the device and shared storage.
- Delete or retain files according to your own client agreements and
  applicable requirements.

The provided `.gitignore` excludes the root `private-data/` and `backups/`
directories, but it does not ignore all JSON or PDF files.

`.gitignore` is not a confidentiality mechanism. It does not prevent manually
uploading a file through GitHub's website, does not remove already tracked
files, and does not erase files from repository history.

## Refreshing and closing the page

There is no app-managed auto-save or recovery mechanism. Export JSON again
after changes if you need to retain an editable copy.

Some browsers may restore form values or retain a page in memory. Browser
restoration is not implemented or guaranteed by this application.

Closing or refreshing the page should not be treated as verified secure
deletion of sensitive data.

## Known verification limits

This description is based on source-code inspection.

The user has reported manual functional testing, but no independent security
audit, automated privacy test, or recorded runtime network inspection is
claimed.

## فارسی: خلاصهٔ جریان داده

کد فعلی برنامه درخواست شبکه، آپلود اطلاعات، تحلیل‌گر آماری یا ارتباط با API
ندارد. هنگام استفاده، داده‌ها در کنترل‌های فرم، پیش‌نمایش صفحه و اشیای موقت
جاوااسکریپت قرار دارند.

خروجی JSON از داخل مرورگر ساخته می‌شود. ورودی JSON نیز پس از انتخاب مستقیم
کاربر، داخل مرورگر خوانده و اعتبارسنجی می‌شود. چاپ و تولید PDF در اختیار
پنجرهٔ چاپ مرورگر است.

برنامه ذخیرهٔ خودکار یا رمزگذاری ندارد. محلی بودن پردازش به‌تنهایی به معنای
امنیت کامل یا رمزگذاری نیست.

فایل JSON، PDF و نسخهٔ چاپی می‌توانند نام مشتری، جزئیات پروژه و قیمت‌ها را
در خود داشته باشند. از این فایل‌ها محافظت کنید و اطلاعات واقعی مشتری را
در مخزن عمومی، تصاویر نمونه یا گزارش خطای عمومی قرار ندهید.

رفتار افزونه‌ها، سیستم‌عامل، پوشه‌های همگام‌شده، چاپگرها و سرویس میزبانی
احتمالی خارج از کنترل کد این برنامه است.