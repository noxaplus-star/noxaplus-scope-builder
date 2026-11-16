# Privacy and data flow

Project: NoxaPlus Scope Builder  
Implementation baseline: 0.2.0  
Reviewed against the application code documented on 2026-11-16.

This document describes the application's own implementation. It is not a
security audit or a guarantee about browsers, operating systems, extensions,
hosting providers, or printing services.

## Application network behavior

The current application code does not initiate network requests.

It contains no application calls to external APIs, analytics services,
payment services, or upload endpoints. It does not load CDN libraries,
remote fonts, or external runtime resources. The Vazirmatn font and SVG icons
are served from local project files.

`index.html` references `style.css`, `app.js`, the local font, and a data-URI
favicon. When opened directly from a local directory, these resources are
read as local files. If the project is hosted on a website, the browser will
request the page and its static files from that host. Hosting-related access
logs and policies are outside this application's implementation.

A browser, extension, operating system, print destination, or file-sync
service may have its own data behavior. The application does not control
those systems.

## Browser storage used by the application

The application has no backend database, account system, cookies, or
IndexedDB. It uses `localStorage` for two purposes:

1. `noxaplus-scope-builder:draft` stores the current working draft so it can
   be restored after a reload in the same browser storage context.
2. `noxaplus-scope-builder:theme` stores the selected light or dark theme.

The draft is written after an edit, with a short debounce, and after importing
a file, applying a template, adding/removing a service, resetting, or starting
a new proposal. It contains the editable proposal inputs, including provider
and client names, project details, document number and date, service
descriptions, quantities, unit prices, discount, scope text, delivery time,
and revision rounds. Computed totals are not stored; they are recalculated.

On page load, the application reads and restores the stored draft when one
exists and shows a restore banner. "شروع تازه" (start fresh), the reset
action, and import/template actions replace the draft. "پاک کردن نسخهٔ
ذخیره‌شده" removes it without changing the current form; autosave resumes on
the next edit.

`localStorage` is not encrypted. It persists until the application removes it,
the user or browser clears site data, or the browser storage profile is
discarded. It is accessible to scripts running in the same origin and may be
accessible through browser tooling or extensions. On a shared origin, such as
a hosting domain that also serves other projects, other pages on that origin
should also be trusted. The application uses a project-specific key, but that
is not an access-control boundary.

Browsers may disable storage, restrict it in private modes, or reject writes
because of quota. In that case the autosave status reports an error and no
draft is restored. The application cannot guarantee localStorage availability
or durability.

Clearing the saved draft is not secure erasure of browser data, exported
files, backups, snapshots, or operating-system artifacts.

## Where proposal data exists during use

Editable values are held in the page's form controls. The live preview contains
copies of the relevant text and calculated amounts in the DOM.

JavaScript creates temporary objects and calculation values during rendering,
validation, export, and import. Monetary calculations use `BigInt`.

## JSON export

Export validates the current form and creates a JSON Blob in the browser.

A temporary object URL is used to request a file download. The application
removes the temporary download link and schedules object-URL cleanup. It
also releases outstanding download URLs on the page's `pagehide` event.

Releasing an object URL does not delete a downloaded JSON file.

The export contains the editable proposal inputs, including document number
and date, client information, service descriptions, quantities, prices,
discounts, and scope details. Computed totals are not stored; they are
recalculated when used.

Exports currently use schema version 2. Version 1 files from earlier releases
can still be imported; missing document number and date are filled with
defaults when imported.

Where the file is stored depends on the user's browser and download settings.

## JSON import

Import begins only when the user selects a file.

The application:

1. Checks the file size against the 1 MiB limit.
2. Reads the selected file into browser memory.
3. Decodes it as UTF-8.
4. Parses it with `JSON.parse`.
5. Validates the expected schema and proposal inputs.
6. Requests confirmation before replacing a form that already contains
   meaningful content.
7. Applies accepted inputs and recalculates the preview.

The selected file is not uploaded by application code.

Imported totals and other unrecognized fields are not used. User-entered and
imported text is assigned through plain-text DOM methods or form values, not
inserted as executable HTML.

These implementation choices do not constitute a general guarantee that all
security risks have been eliminated.

## Printing and PDF

The application's print buttons validate the current proposal, refresh the
preview, and call `window.print()`.

The browser controls the print dialog, printer selection, PDF destination,
headers, footers, and final output.

Printed documents and PDFs include proposal information such as the document
number and date, client names, project details, scope, and pricing. They may
also contain browser-generated headers or footers, depending on print
settings.

The application cannot determine whether printing completed, a PDF was saved,
or the user cancelled the dialog.

A network printer, cloud-connected print destination, shared computer, or
synchronised download folder may expose data beyond the page. Review the
settings of the tools you choose.

## Local does not mean encrypted

The application does not encrypt draft storage, proposal data, or exported
files.

Processing locally does not, by itself, provide encryption, access control,
secure deletion, or protection from other software with access to the device.

The autosaved draft is readable in browser storage. The JSON export is a
readable text file. PDFs and printed copies also require appropriate
protection.

## Protecting proposal files

- Use fictional data for public examples, demonstrations, and screenshots.
- Do not upload real client proposals, pricing, or personal information to
  the public repository.
- Review exported files before sharing them.
- Check the destination folder and any automatic cloud synchronisation.
- Protect access to the device, browser profile, and shared storage.
- Clear the saved draft on shared devices when the proposal is no longer
  needed.
- Delete or retain files according to your own client agreements and
  applicable requirements.

The provided `.gitignore` excludes the root `private-data/` and `backups/`
directories, but it does not ignore all JSON or PDF files.

`.gitignore` is not a confidentiality mechanism. It does not prevent manually
uploading a file through GitHub's website, does not remove already tracked
files, and does not erase files from repository history.

## Refreshing, closing, and restoring

A draft is restored from the same browser storage context after a reload.
This is local autosave, not cloud sync or a guaranteed recovery system. It
does not follow the user to another browser, device, or hosting origin, and
it can be lost when site data is cleared or storage is unavailable.

Export JSON for an explicit backup or to move a proposal between environments.

Some browsers may also restore form values independently. Browser restoration
is not implemented or guaranteed by this application.

Closing or refreshing the page should not be treated as verified secure
deletion of sensitive data. Use the clear-draft action and review browser
storage settings when that matters.

## Known verification limits

This description is based on source-code inspection.

Local automated browser checks were run on 2026-11-16 with Playwright driving
installed Chrome; the user also reported earlier manual functional testing.
No independent security audit, automated privacy test, real-device test, or
recorded runtime network inspection is claimed.

## فارسی: خلاصهٔ جریان داده

کد فعلی برنامه درخواست شبکه، آپلود اطلاعات، تحلیل‌گر آماری یا ارتباط با API
ندارد. فونت و آیکون‌ها از فایل‌های محلی پروژه خوانده می‌شوند.

برنامه برای ذخیرهٔ خودکار پیش‌نویس از `localStorage` استفاده می‌کند. کلید
`noxaplus-scope-builder:draft` شامل نام ارائه‌دهنده و مشتری، عنوان و شرح پروژه،
شماره و تاریخ سند، خدمات، تعداد، قیمت واحد، تخفیف، محدودهٔ کار، زمان تحویل و
دورهای بازبینی است. کلید `noxaplus-scope-builder:theme` فقط انتخاب حالت روشن
یا تاریک را نگه می‌دارد. این حافظه رمزگذاری نمی‌شود و تا پاک‌شدن داده‌های
سایت یا حذف نسخهٔ ذخیره‌شده باقی می‌ماند.

با بارگذاری دوبارهٔ صفحه، پیش‌نویسِ همان مرورگر بازیابی می‌شود. «شروع تازه»،
«بازنشانی» و اعمال الگو یا فایل، پیش‌نویس را جایگزین می‌کنند. دکمهٔ «پاک کردن
نسخهٔ ذخیره‌شده» آن را حذف می‌کند تا ویرایش بعدی.

خروجی JSON از داخل مرورگر ساخته می‌شود و اکنون با نسخهٔ ساختار ۲ ذخیره می‌شود؛
فایل‌های نسخهٔ ۱ همچنان پذیرفته می‌شوند و شماره و تاریخ پیش‌فرض می‌گیرند.
ورودی JSON نیز پس از انتخاب مستقیم کاربر، داخل مرورگر خوانده و اعتبارسنجی
می‌شود. چاپ و تولید PDF در اختیار پنجرهٔ چاپ مرورگر است.

برنامه رمزگذاری، همگام‌سازی ابری یا حذف امن ندارد. محلی بودن پردازش به‌تنهایی
به معنای امنیت کامل نیست. فایل JSON، PDF، نسخهٔ چاپی و پیش‌نویس ذخیره‌شده
می‌توانند نام مشتری، جزئیات پروژه و قیمت‌ها را در خود داشته باشند. از آن‌ها
محافظت کنید و اطلاعات واقعی مشتری را در مخزن عمومی، تصاویر نمونه یا گزارش
خطای عمومی قرار ندهید.

رفتار افزونه‌ها، سیستم‌عامل، پوشه‌های همگام‌شده، چاپگرها و سرویس میزبانی
احتمالی خارج از کنترل کد این برنامه است.
