"use strict";

const byId = (id) => document.getElementById(id);

const form = byId("proposalForm");
const serviceRows = byId("serviceRows");

const fields = {
  provider: byId("provider"),
  client: byId("client"),
  project: byId("project"),
  description: byId("description"),
  currency: byId("currency"),
  discount: byId("discount"),
  included: byId("included"),
  excluded: byId("excluded"),
  delivery: byId("delivery"),
  revisions: byId("revisions")
};

const APP_ID = "noxaplus-scope-builder";
const SCHEMA_VERSION = 1;
const MAX_FILE_BYTES = 1024 * 1024;
const ALLOWED_CURRENCIES = ["USD", "USDT", "تومان"];

let nextServiceId = 0;
let initialFormSnapshot = "";
let importInProgress = false;

const pendingDownloadUrls = new Set();

function createElement(tag, className, text) {
  const element = document.createElement(tag);

  if (className) {
    element.className = className;
  }

  if (text !== undefined) {
    element.textContent = text;
  }

  return element;
}

function normalizeNumber(value) {
  return String(value)
    .trim()
    .replace(/[۰-۹]/g, (digit) => String("۰۱۲۳۴۵۶۷۸۹".indexOf(digit)))
    .replace(/[٠-٩]/g, (digit) => String("٠١٢٣٤٥٦٧٨٩".indexOf(digit)))
    .replace(/٫/g, ".");
}

function toPersianDigits(value) {
  return String(value).replace(
    /[0-9]/g,
    (digit) => "۰۱۲۳۴۵۶۷۸۹"[Number(digit)]
  );
}

/*
 * Monetary values use BigInt in hundredths of the selected display unit.
 * No floating-point arithmetic, currency conversion, or rounding is used.
 */
function parseMoney(value) {
  const normalized = normalizeNumber(value);

  if (normalized === "") {
    return {
      ok: false,
      error: "مبلغ را وارد کنید؛ برای مبلغ صفر، ۰ بنویسید."
    };
  }

  if (normalized.startsWith("-")) {
    return { ok: false, error: "مبلغ نمی‌تواند منفی باشد." };
  }

  if (!/^\d{1,12}(?:\.\d{1,2})?$/.test(normalized)) {
    return {
      ok: false,
      error:
        "مبلغ باید حداکثر ۱۲ رقم صحیح و ۲ رقم اعشار، بدون جداکنندهٔ هزارگان باشد."
    };
  }

  const [whole, fraction = ""] = normalized.split(".");
  const minorUnits =
    BigInt(whole) * 100n + BigInt(fraction.padEnd(2, "0"));

  return { ok: true, value: minorUnits };
}

function parseWholeNumber(value, allowZero) {
  const normalized = normalizeNumber(value);

  if (!/^\d{1,9}$/.test(normalized)) {
    return {
      ok: false,
      error: allowZero
        ? "یک عدد صحیح نامنفی و حداکثر ۹ رقمی وارد کنید."
        : "یک عدد صحیح مثبت و حداکثر ۹ رقمی وارد کنید."
    };
  }

  const number = BigInt(normalized);

  if (!allowZero && number === 0n) {
    return { ok: false, error: "تعداد باید حداقل ۱ باشد." };
  }

  return { ok: true, value: number };
}

function formatMoney(minorUnits) {
  const whole = (minorUnits / 100n)
    .toString()
    .replace(/\B(?=(\d{3})+(?!\d))/g, "٬");

  const fraction = (minorUnits % 100n).toString().padStart(2, "0");

  return toPersianDigits(`${whole}٫${fraction}`);
}

function moneyLabel(minorUnits) {
  return `${formatMoney(minorUnits)} ${fields.currency.value}`;
}

function setError(input, message) {
  const errorElement = byId(`${input.id}Error`);
  errorElement.textContent = message;
  input.setAttribute("aria-invalid", message ? "true" : "false");
}

function showText(id, value, emptyText) {
  const target = byId(id);
  const text = value.trim();

  target.textContent = text || emptyText;
  target.classList.toggle("empty", text === "");
}

function createServiceField({
  id,
  labelText,
  value,
  numeric = false,
  decimal = false
}) {
  const wrapper = createElement("div", "field");
  const label = createElement("label", "", labelText);
  const input = document.createElement("input");
  const error = createElement("p", "field-error");

  label.htmlFor = id;

  input.id = id;
  input.name = id;
  input.type = "text";
  input.value = value;
  input.required = true;

  error.id = `${id}Error`;

  if (numeric) {
    input.inputMode = decimal ? "decimal" : "numeric";
    input.dir = "ltr";
    input.spellcheck = false;
    input.setAttribute("aria-describedby", `${error.id} moneyPolicy`);
  } else {
    input.maxLength = 300;
    input.setAttribute("aria-describedby", error.id);
  }

  wrapper.append(label, input, error);

  return { wrapper, input };
}

function addService(data = {}) {
  const id = ++nextServiceId;
  const row = createElement("div", "service-row");
  const header = createElement("div", "service-row-header");
  const heading = createElement("h3");
  const removeButton = createElement("button", "button danger", "حذف");

  heading.id = `service-${id}-heading`;
  row.setAttribute("role", "group");
  row.setAttribute("aria-labelledby", heading.id);

  removeButton.type = "button";
  header.append(heading, removeButton);

  const description = createServiceField({
    id: `service-${id}-description`,
    labelText: "شرح خدمت — الزامی",
    value: data.description ?? ""
  });

  const quantity = createServiceField({
    id: `service-${id}-quantity`,
    labelText: "تعداد — الزامی",
    value: data.quantity ?? "1",
    numeric: true
  });

  const price = createServiceField({
    id: `service-${id}-price`,
    labelText: "قیمت واحد — الزامی",
    value: data.price ?? "",
    numeric: true,
    decimal: true
  });

  description.input.dataset.kind = "description";
  quantity.input.dataset.kind = "quantity";
  price.input.dataset.kind = "price";

  const numbers = createElement("div", "service-numbers");
  numbers.append(quantity.wrapper, price.wrapper);

  row.append(header, description.wrapper, numbers);
  serviceRows.append(row);

  removeButton.addEventListener("click", () => {
    const currentRows = Array.from(serviceRows.children);
    const rowIndex = currentRows.indexOf(row);
    const focusTarget =
      currentRows[rowIndex + 1]?.querySelector("input") ||
      currentRows[rowIndex - 1]?.querySelector("input") ||
      byId("addServiceButton");

    row.remove();
    renumberServices();
    render();
    focusTarget.focus();
  });

  renumberServices();

  return description.input;
}

function renumberServices() {
  Array.from(serviceRows.children).forEach((row, index) => {
    const number = toPersianDigits(index + 1);

    row.querySelector("h3").textContent = `خدمت ${number}`;
    row.querySelector("button").setAttribute(
      "aria-label",
      `حذف خدمت ${number}`
    );
  });
}

function renderList(id, value, emptyText) {
  const list = byId(id);
  list.replaceChildren();

  const lines = value
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  if (lines.length === 0) {
    list.append(createElement("li", "empty", emptyText));
    return;
  }

  lines.forEach((line) => {
    list.append(createElement("li", "", line));
  });
}

function appendServicePreview(description, quantity, price, rowTotal) {
  const tableRow = document.createElement("tr");

  const descriptionCell = createElement(
    "td",
    description ? "" : "empty",
    description || "شرح خدمت وارد نشده"
  );

  const quantityCell = createElement(
    "td",
    "",
    quantity.ok
      ? toPersianDigits(quantity.value.toString())
      : "نامعتبر"
  );

  const priceCell = createElement(
    "td",
    "money",
    price.ok ? moneyLabel(price.value) : "نامعتبر"
  );

  const totalCell = createElement(
    "td",
    "money",
    rowTotal === null ? "قابل محاسبه نیست" : moneyLabel(rowTotal)
  );

  tableRow.append(descriptionCell, quantityCell, priceCell, totalCell);
  byId("previewServices").append(tableRow);
}

function render() {
  let hasFormErrors = false;

  const requiredTextFields = [
    [fields.provider, "نام ارائه‌دهنده یا برند را وارد کنید."],
    [fields.client, "نام مشتری را وارد کنید."],
    [fields.project, "عنوان پروژه را وارد کنید."]
  ];

  requiredTextFields.forEach(([input, message]) => {
    const error = input.value.trim() ? "" : message;
    setError(input, error);

    if (error) {
      hasFormErrors = true;
    }
  });

  showText(
    "previewProvider",
    fields.provider.value,
    "ارائه‌دهنده مشخص نشده"
  );
  showText("previewClient", fields.client.value, "مشتری مشخص نشده");
  showText("previewProject", fields.project.value, "عنوان پروژه مشخص نشده");
  showText(
    "previewDescription",
    fields.description.value,
    "توضیحی وارد نشده است."
  );
  showText(
    "previewDelivery",
    fields.delivery.value,
    "زمان تحویل مشخص نشده"
  );

  renderList(
    "previewIncluded",
    fields.included.value,
    "هنوز موردی برای کارهای شامل پیشنهاد مشخص نشده است."
  );

  renderList(
    "previewExcluded",
    fields.excluded.value,
    "هنوز موردی برای کارهای خارج از پیشنهاد مشخص نشده است."
  );

  const revisions = parseWholeNumber(fields.revisions.value, true);
  setError(fields.revisions, revisions.ok ? "" : revisions.error);

  byId("previewRevisions").textContent = revisions.ok
    ? `${toPersianDigits(revisions.value.toString())} دور`
    : "نامعتبر؛ مقدار را اصلاح کنید";

  if (!revisions.ok) {
    hasFormErrors = true;
  }

  const rows = Array.from(serviceRows.children);
  byId("previewServices").replaceChildren();

  let subtotal = 0n;
  let servicesFinanciallyValid = rows.length > 0;

  byId("servicesError").textContent =
    rows.length === 0 ? "حداقل یک خدمت اضافه کنید." : "";

  if (rows.length === 0) {
    hasFormErrors = true;

    const emptyRow = document.createElement("tr");
    const emptyCell = createElement(
      "td",
      "empty",
      "هنوز خدمتی اضافه نشده است."
    );

    emptyCell.colSpan = 4;
    emptyRow.append(emptyCell);
    byId("previewServices").append(emptyRow);
  }

  rows.forEach((row) => {
    const descriptionInput = row.querySelector(
      '[data-kind="description"]'
    );
    const quantityInput = row.querySelector('[data-kind="quantity"]');
    const priceInput = row.querySelector('[data-kind="price"]');

    const description = descriptionInput.value.trim();
    const quantity = parseWholeNumber(quantityInput.value, false);
    const price = parseMoney(priceInput.value);

    setError(
      descriptionInput,
      description ? "" : "شرح این خدمت را وارد کنید."
    );
    setError(quantityInput, quantity.ok ? "" : quantity.error);
    setError(priceInput, price.ok ? "" : price.error);

    if (!description || !quantity.ok || !price.ok) {
      hasFormErrors = true;
    }

    let rowTotal = null;

    if (quantity.ok && price.ok) {
      rowTotal = quantity.value * price.value;
      subtotal += rowTotal;
    } else {
      servicesFinanciallyValid = false;
    }

    appendServicePreview(description, quantity, price, rowTotal);
  });

  const discount = parseMoney(fields.discount.value);
  let discountError = discount.ok ? "" : discount.error;

  if (
    discount.ok &&
    servicesFinanciallyValid &&
    discount.value > subtotal
  ) {
    discountError = "تخفیف نمی‌تواند بیشتر از جمع خدمات باشد.";
  }

  setError(fields.discount, discountError);

  if (discountError) {
    hasFormErrors = true;
  }

  const calculationValid =
    servicesFinanciallyValid && discountError === "";

  byId("previewSubtotal").textContent = servicesFinanciallyValid
    ? moneyLabel(subtotal)
    : "قابل محاسبه نیست";

  byId("previewDiscount").textContent = !discount.ok
    ? "نامعتبر"
    : discountError
      ? "نامعتبر؛ بیشتر از جمع خدمات"
      : servicesFinanciallyValid
        ? moneyLabel(discount.value)
        : `${moneyLabel(discount.value)} — بررسی سقف تخفیف معلق است`;

  byId("previewTotal").textContent = calculationValid
    ? moneyLabel(subtotal - discount.value)
    : "قابل محاسبه نیست";

  let calculationMessage = "";

  if (!calculationValid) {
    calculationMessage =
      "تا اصلاح ورودی‌های مالی و وجود حداقل یک خدمت، مبلغ نهایی نمایش داده نمی‌شود.";
  } else if (hasFormErrors) {
    calculationMessage =
      "محاسبات مالی معتبر است، اما اطلاعات پیشنهاد هنوز کامل یا معتبر نیست.";
  }

  byId("calculationMessage").textContent = calculationMessage;

  const status = byId("previewStatus");
  const incomplete = hasFormErrors || !calculationValid;

  status.classList.toggle("is-invalid", incomplete);
  status.classList.toggle("is-valid", !incomplete);

  const statusText = incomplete
    ? "پیشنهاد ناقص است یا ورودی نامعتبر دارد؛ پیام‌های فرم را بررسی کنید."
    : "فیلدهای الزامی و محاسبات معتبرند؛ این خروجی همچنان پیشنهاد غیرالزام‌آور است.";

  if (status.textContent !== statusText) {
    status.textContent = statusText;
  }

  updatePrintSections();

  return !incomplete;
}

function loadData(data) {
  fields.provider.value = data.provider ?? "NoxaPlus";
  fields.client.value = data.client ?? "";
  fields.project.value = data.project ?? "";
  fields.description.value = data.description ?? "";
  fields.currency.value = data.currency ?? "USD";
  fields.discount.value = data.discount ?? "0";
  fields.included.value = data.included ?? "";
  fields.excluded.value = data.excluded ?? "";
  fields.delivery.value = data.delivery ?? "";
  fields.revisions.value = data.revisions ?? "0";

  serviceRows.replaceChildren();

  const services = data.services ?? [
    { description: "", quantity: "1", price: "" }
  ];

  services.forEach((service) => addService(service));
  render();
}

/* JSON file interface */

function setupFileInterface() {
  const actions = byId("sampleButton").parentElement;

  const exportButton = createElement(
    "button",
    "button secondary",
    "ذخیره پیشنهاد"
  );
  exportButton.id = "exportButton";
  exportButton.type = "button";
  exportButton.setAttribute("aria-describedby", "filePrivacyHelp");

  const importButton = createElement(
    "button",
    "button secondary",
    "باز کردن پیشنهاد"
  );
  importButton.id = "importButton";
  importButton.type = "button";
  importButton.setAttribute("aria-describedby", "filePrivacyHelp");

  actions.prepend(exportButton, importButton);

  const fileInput = document.createElement("input");
  fileInput.id = "proposalFile";
  fileInput.type = "file";
  fileInput.accept = ".json,application/json";
  fileInput.hidden = true;
  fileInput.tabIndex = -1;
  fileInput.setAttribute("aria-label", "انتخاب فایل JSON پیشنهاد");

  const information = createElement("div", "info-box");
  information.id = "filePrivacyHelp";

  information.append(
    createElement(
      "p",
      "",
      "ذخیره پیشنهاد، یک فایل JSON روی دستگاه شما دانلود می‌کند. این فایل شامل اطلاعات مشتری و قیمت‌گذاری است؛ آن را فقط با افراد مورد اعتماد به اشتراک بگذارید."
    ),
    createElement(
      "p",
      "",
      "صفحه ذخیرهٔ خودکار ندارد. پس از هر ویرایش، برای نگهداری نسخهٔ جدید دوباره «ذخیره پیشنهاد» را بزنید. هیچ داده‌ای به سرور ارسال نمی‌شود."
    ),
    createElement(
      "p",
      "",
      "برای باز کردن پیشنهاد، فایل JSON همین برنامه را انتخاب کنید. حداکثر حجم مجاز ۱ MiB، برابر با ۱٬۰۴۸٬۵۷۶ بایت است."
    )
  );

  const message = createElement("p");
  message.id = "fileMessage";
  message.hidden = true;
  message.setAttribute("role", "status");
  message.setAttribute("aria-live", "polite");
  message.setAttribute("aria-atomic", "true");

  const controls = createElement("div");
  controls.append(fileInput, information, message);
  form.before(controls);

  const milestone = document.querySelector(".milestone");
  if (milestone) {
    milestone.textContent = "مرحلهٔ ۳ · JSON و چاپ / PDF";
  }

  const noticeParagraphs = document.querySelectorAll(".notice p");
  if (noticeParagraphs[1]) {
    noticeParagraphs[1].textContent =
      "خروجی، پیشنهاد غیرالزام‌آور خدمات است؛ قرارداد یا صورتحساب رسمی مالیاتی نیست. صفحه ذخیرهٔ خودکار ندارد و اطلاعات پس از تازه‌سازی بازیابی نمی‌شوند؛ برای نگهداری ورودی‌های قابل‌ویرایش، فایل JSON بگیرید.";
  }

  const footer = document.querySelector(".site-footer");
  if (footer) {
    footer.textContent =
      "NoxaPlus Scope Builder · ذخیرهٔ دستی JSON و چاپ مرورگر · بدون ذخیرهٔ خودکار یا ارسال داده به سرور";
  }

  exportButton.addEventListener("click", exportProposal);

  importButton.addEventListener("click", () => {
    if (importInProgress) {
      return;
    }

    // Clearing the value allows selecting the same file again.
    fileInput.value = "";
    fileInput.click();
  });

  fileInput.addEventListener("change", () => {
    const file = fileInput.files?.[0];

    // Keep the File reference, but clear the input for future selections.
    fileInput.value = "";

    if (file) {
      importProposal(file);
    }
  });
}

function showFileMessage(message, isError = false) {
  const target = byId("fileMessage");
  target.hidden = false;
  target.className = `status ${isError ? "is-invalid" : "is-valid"}`;
  target.textContent = message;
}

function collectProposal() {
  return {
    appId: APP_ID,
    schemaVersion: SCHEMA_VERSION,
    provider: fields.provider.value,
    client: fields.client.value,
    title: fields.project.value,
    description: fields.description.value,
    currency: fields.currency.value,
    services: Array.from(serviceRows.children).map((row) => ({
      description: row.querySelector('[data-kind="description"]').value,
      quantity: row.querySelector('[data-kind="quantity"]').value,
      unitPrice: row.querySelector('[data-kind="price"]').value
    })),
    fixedDiscount: fields.discount.value,
    includedWork: fields.included.value,
    excludedWork: fields.excluded.value,
    deliveryTime: fields.delivery.value,
    revisionRounds: fields.revisions.value
  };
}

function isRecord(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function hasOwn(object, key) {
  return Object.prototype.hasOwnProperty.call(object, key);
}

function failValidation(message) {
  throw new Error(message);
}

function requireString(
  object,
  key,
  label,
  { maxLength = null, required = false, singleLine = false } = {}
) {
  if (!hasOwn(object, key) || typeof object[key] !== "string") {
    failValidation(`فیلد «${label}» باید موجود و از نوع متن باشد.`);
  }

  const value = object[key];

  if (required && value.trim() === "") {
    failValidation(`فیلد «${label}» نباید خالی باشد.`);
  }

  if (maxLength !== null && value.length > maxLength) {
    failValidation(
      `فیلد «${label}» نباید بیشتر از ${toPersianDigits(maxLength)} نویسه باشد.`
    );
  }

  if (singleLine && /[\r\n]/.test(value)) {
    failValidation(`فیلد «${label}» باید تک‌خطی باشد.`);
  }

  return value;
}

function validateProposal(data) {
  if (!isRecord(data)) {
    failValidation("ساختار فایل باید یک شیء JSON شامل اطلاعات پیشنهاد باشد.");
  }

  if (!hasOwn(data, "appId") || data.appId !== APP_ID) {
    failValidation("این فایل متعلق به NoxaPlus Scope Builder نیست.");
  }

  if (
    !hasOwn(data, "schemaVersion") ||
    data.schemaVersion !== SCHEMA_VERSION
  ) {
    failValidation(
      "نسخهٔ ساختار فایل پشتیبانی نمی‌شود؛ فقط schemaVersion با مقدار عددی ۱ پذیرفته می‌شود."
    );
  }

  const provider = requireString(data, "provider", "ارائه‌دهنده", {
    maxLength: 120,
    required: true,
    singleLine: true
  });

  const client = requireString(data, "client", "مشتری", {
    maxLength: 120,
    required: true,
    singleLine: true
  });

  const title = requireString(data, "title", "عنوان پروژه", {
    maxLength: 180,
    required: true,
    singleLine: true
  });

  const description = requireString(data, "description", "شرح پروژه", {
    maxLength: 2000
  });

  const currency = requireString(data, "currency", "واحد پول", {
    required: true,
    singleLine: true
  });

  if (!ALLOWED_CURRENCIES.includes(currency)) {
    failValidation("واحد پول فقط می‌تواند USD، USDT یا تومان باشد.");
  }

  const includedWork = requireString(
    data,
    "includedWork",
    "کارهای شامل پیشنهاد",
    { maxLength: 5000 }
  );

  const excludedWork = requireString(
    data,
    "excludedWork",
    "کارهای خارج از پیشنهاد",
    { maxLength: 5000 }
  );

  const deliveryTime = requireString(
    data,
    "deliveryTime",
    "زمان تحویل",
    { maxLength: 250, singleLine: true }
  );

  const revisionRounds = requireString(
    data,
    "revisionRounds",
    "تعداد دورهای بازبینی",
    { required: true, singleLine: true }
  );

  const revisions = parseWholeNumber(revisionRounds, true);
  if (!revisions.ok) {
    failValidation(`تعداد دورهای بازبینی: ${revisions.error}`);
  }

  const fixedDiscount = requireString(
    data,
    "fixedDiscount",
    "تخفیف ثابت",
    { required: true, singleLine: true }
  );

  const discount = parseMoney(fixedDiscount);
  if (!discount.ok) {
    failValidation(`تخفیف ثابت: ${discount.error}`);
  }

  if (
    !hasOwn(data, "services") ||
    !Array.isArray(data.services) ||
    data.services.length === 0
  ) {
    failValidation("خدمات باید یک آرایه با حداقل یک ردیف معتبر باشد.");
  }

  let subtotal = 0n;

  const services = data.services.map((service, index) => {
    const label = `خدمت ${toPersianDigits(index + 1)}`;

    if (!isRecord(service)) {
      failValidation(`${label}: ساختار ردیف معتبر نیست.`);
    }

    const serviceDescription = requireString(
      service,
      "description",
      `شرح ${label}`,
      { maxLength: 300, required: true, singleLine: true }
    );

    const quantityText = requireString(
      service,
      "quantity",
      `تعداد ${label}`,
      { required: true, singleLine: true }
    );

    const unitPrice = requireString(
      service,
      "unitPrice",
      `قیمت واحد ${label}`,
      { required: true, singleLine: true }
    );

    const quantity = parseWholeNumber(quantityText, false);
    const price = parseMoney(unitPrice);

    if (!quantity.ok) {
      failValidation(`${label}، تعداد: ${quantity.error}`);
    }

    if (!price.ok) {
      failValidation(`${label}، قیمت واحد: ${price.error}`);
    }

    subtotal += quantity.value * price.value;

    // Only explicitly allowed fields are copied.
    return {
      description: serviceDescription,
      quantity: quantityText,
      unitPrice
    };
  });

  if (discount.value > subtotal) {
    failValidation("تخفیف نمی‌تواند بیشتر از جمع خدمات باشد.");
  }

  // Imported totals and all other extra properties are ignored.
  return {
    appId: APP_ID,
    schemaVersion: SCHEMA_VERSION,
    provider,
    client,
    title,
    description,
    currency,
    services,
    fixedDiscount,
    includedWork,
    excludedWork,
    deliveryTime,
    revisionRounds
  };
}

function proposalToFormData(proposal) {
  return {
    provider: proposal.provider,
    client: proposal.client,
    project: proposal.title,
    description: proposal.description,
    currency: proposal.currency,
    services: proposal.services.map((service) => ({
      description: service.description,
      quantity: service.quantity,
      price: service.unitPrice
    })),
    discount: proposal.fixedDiscount,
    included: proposal.includedWork,
    excluded: proposal.excludedWork,
    delivery: proposal.deliveryTime,
    revisions: proposal.revisionRounds
  };
}

function currentFormContainsInformation() {
  return JSON.stringify(collectProposal()) !== initialFormSnapshot;
}

function localDateForFilename() {
  const now = new Date();
  const year = String(now.getFullYear()).padStart(4, "0");
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function releaseDownloadUrl(url) {
  if (pendingDownloadUrls.has(url)) {
    URL.revokeObjectURL(url);
    pendingDownloadUrls.delete(url);
  }
}

function exportProposal() {
  let url = null;
  let link = null;

  try {
    const formValid = render();
    const proposal = validateProposal(collectProposal());

    if (!formValid) {
      failValidation(
        "پیشنهاد هنوز معتبر نیست؛ پیام‌های خطای فرم را بررسی کنید."
      );
    }

    const json = JSON.stringify(proposal, null, 2);
    const blob = new Blob([json], {
      type: "application/json;charset=utf-8"
    });

    if (blob.size > MAX_FILE_BYTES) {
      failValidation(
        "حجم خروجی بیشتر از ۱ MiB است. برای ساخت فایل قابل بازکردن، تعداد خدمات یا حجم متن‌ها را کاهش دهید."
      );
    }

    url = URL.createObjectURL(blob);
    pendingDownloadUrls.add(url);

    link = document.createElement("a");
    link.href = url;
    link.download = `noxaplus-proposal-${localDateForFilename()}.json`;
    link.hidden = true;

    document.body.append(link);
    link.click();

    showFileMessage(
      "درخواست دانلود فایل JSON به مرورگر ارسال شد. فایل شامل اطلاعات مشتری و قیمت‌هاست. پس از تغییر پیشنهاد، دوباره خروجی بگیرید."
    );

    const downloadUrl = url;
    window.setTimeout(() => releaseDownloadUrl(downloadUrl), 60000);
  } catch (error) {
    if (url) {
      releaseDownloadUrl(url);
    }

    showFileMessage(
      `ذخیره انجام نشد: ${
        error instanceof Error ? error.message : "خطای نامشخص رخ داد."
      }`,
      true
    );

    form.querySelector('[aria-invalid="true"]')?.focus();
  } finally {
    link?.remove();
  }
}

async function readAndValidateProposal(file) {
  if (file.size > MAX_FILE_BYTES) {
    failValidation(
      "حجم فایل بیشتر از حد مجاز است؛ حداکثر حجم ۱ MiB، برابر با ۱٬۰۴۸٬۵۷۶ بایت است."
    );
  }

  if (file.size === 0) {
    failValidation("فایل انتخاب‌شده خالی است.");
  }

  let buffer;

  try {
    buffer = await file.arrayBuffer();
  } catch {
    failValidation("خواندن فایل ممکن نشد؛ دوباره فایل را انتخاب کنید.");
  }

  if (buffer.byteLength > MAX_FILE_BYTES) {
    failValidation("حجم محتوای فایل بیشتر از حد مجاز ۱ MiB است.");
  }

  let text;

  try {
    text = new TextDecoder("utf-8", { fatal: true }).decode(buffer);
  } catch {
    failValidation("فایل باید یک فایل متنی JSON با کدگذاری UTF-8 باشد.");
  }

  let parsed;

  try {
    parsed = JSON.parse(text.replace(/^\uFEFF/, ""));
  } catch {
    failValidation("محتوای فایل JSON معتبر نیست یا ساختار آن ناقص است.");
  }

  return validateProposal(parsed);
}

async function importProposal(file) {
  if (importInProgress) {
    return;
  }

  importInProgress = true;
  const importButton = byId("importButton");
  importButton.disabled = true;
  importButton.setAttribute("aria-busy", "true");

  showFileMessage("در حال خواندن و بررسی فایل؛ اطلاعات فرم هنوز تغییر نکرده است.");

  try {
    const proposal = await readAndValidateProposal(file);

    if (currentFormContainsInformation()) {
      const confirmed = window.confirm(
        "باز کردن این فایل، اطلاعات فعلی فرم را جایگزین می‌کند. اگر نسخهٔ فعلی را لازم دارید، ابتدا لغو کنید و «ذخیره پیشنهاد» را بزنید. اطلاعات فعلی جایگزین شود؟"
      );

      if (!confirmed) {
        showFileMessage(
          "باز کردن پیشنهاد لغو شد؛ اطلاعات فعلی فرم بدون تغییر باقی ماند."
        );
        return;
      }
    }

    const previousProposal = collectProposal();

    try {
      loadData(proposalToFormData(proposal));
    } catch {
      loadData(proposalToFormData(previousProposal));
      failValidation(
        "اعمال اطلاعات فایل ممکن نشد؛ اطلاعات قبلی فرم بازگردانده شد."
      );
    }

    showFileMessage(
      "پیشنهاد با موفقیت باز شد و مبالغ از ورودی‌ها دوباره محاسبه شدند. صفحه ذخیرهٔ خودکار ندارد؛ پس از ویرایش دوباره خروجی بگیرید."
    );

    fields.client.focus();
  } catch (error) {
    showFileMessage(
      `باز کردن انجام نشد: ${
        error instanceof Error ? error.message : "خطای نامشخص رخ داد."
      } اطلاعات فعلی فرم حفظ شد.`,
      true
    );
  } finally {
    importInProgress = false;
    importButton.disabled = false;
    importButton.removeAttribute("aria-busy");
  }
}

/* Browser printing */

function setupPrintInterface() {
  const actions = byId("sampleButton").parentElement;

  const printButton = createElement(
    "button",
    "button secondary",
    "چاپ / ذخیره PDF"
  );

  printButton.id = "printButton";
  printButton.type = "button";
  printButton.setAttribute("aria-describedby", "printHelp");

  actions.insertBefore(printButton, byId("sampleButton"));

  const printHelp = createElement("div", "info-box print-help");
  printHelp.id = "printHelp";

  printHelp.append(
    createElement(
      "p",
      "",
      "برای دریافت PDF، در پنجره چاپ گزینه Save as PDF را انتخاب کنید."
    ),
    createElement(
      "p",
      "",
      "سربرگ و پابرگ خودکار مرورگر، مانند تاریخ، آدرس فایل و شمارهٔ صفحه، از تنظیمات چاپ مرورگر کنترل می‌شوند؛ CSS برنامه نمی‌تواند حذف آن‌ها را به‌طور قابل‌اعتماد تضمین کند."
    ),
    createElement(
      "p",
      "",
      "PDF برای نمایش پیشنهاد است؛ برای باز کردن و ویرایش دوبارهٔ ورودی‌ها، از «ذخیره پیشنهاد» و فایل JSON استفاده کنید."
    )
  );

  // Keep guidance immediately below the action area.
  actions.parentElement.after(printHelp);

  printButton.addEventListener("click", printProposal);
}

function updatePrintSections() {
  const optionalSections = [
    ["previewDescription", fields.description.value],
    ["previewIncluded", fields.included.value],
    ["previewExcluded", fields.excluded.value]
  ];

  optionalSections.forEach(([previewId, value]) => {
    const section = byId(previewId).closest(".preview-section");
    section.classList.toggle("print-empty", value.trim() === "");
  });

  const deliveryRow = byId("previewDelivery").parentElement;
  deliveryRow.classList.toggle(
    "print-empty",
    fields.delivery.value.trim() === ""
  );
}

function showPrintMessage(message, isError = false) {
  const target = byId("printMessage");
  target.hidden = false;
  target.className = `status ${isError ? "is-invalid" : "is-valid"}`;
  target.textContent = message;
}

function printProposal() {
  try {
    // Refresh preview and reuse both existing validation layers.
    const formValid = render();
    validateProposal(collectProposal());

    if (!formValid) {
      failValidation(
        "پیشنهاد هنوز معتبر نیست؛ پیام‌های خطای فرم را بررسی کنید."
      );
    }

    updatePrintSections();

    showPrintMessage(
      "درخواست چاپ به مرورگر ارسال می‌شود. ذخیرهٔ PDF یا لغو پنجره در اختیار شماست؛ برنامه ذخیره‌شدن فایل را تأیید نمی‌کند."
    );

    // Called directly from the user's button action, not from load/import.
    window.print();
  } catch (error) {
    showPrintMessage(
      `چاپ انجام نشد: ${
        error instanceof Error ? error.message : "خطای نامشخص رخ داد."
      }`,
      true
    );

    form.querySelector('[aria-invalid="true"]')?.focus();
  }
}

function setupPrintMessage() {
  const message = createElement("p");
  message.id = "printMessage";
  message.hidden = true;
  message.setAttribute("role", "status");
  message.setAttribute("aria-live", "polite");
  message.setAttribute("aria-atomic", "true");

  byId("printHelp").after(message);
}

// Also refresh the preview for browser-menu printing.
// This event does not itself open the print dialog.
window.addEventListener("beforeprint", () => {
  render();
});

window.addEventListener("pagehide", () => {
  for (const url of pendingDownloadUrls) {
    URL.revokeObjectURL(url);
  }

  pendingDownloadUrls.clear();
});

/* Existing form actions */

form.addEventListener("submit", (event) => {
  event.preventDefault();
});

form.addEventListener("input", render);
form.addEventListener("change", render);

byId("addServiceButton").addEventListener("click", () => {
  const newDescriptionInput = addService();
  render();
  newDescriptionInput.focus();
});

byId("sampleButton").addEventListener("click", () => {
  loadData({
    provider: "NoxaPlus",
    client: "کافهٔ خیالی سپیدار",
    project: "طراحی بستهٔ محتوای شبکه‌های اجتماعی",
    description:
      "آماده‌سازی یک بستهٔ محتوایی برای معرفی منوی جدید یک کافهٔ خیالی.",
    currency: "USD",
    discount: "20",
    services: [
      {
        description: "طراحی پست ثابت",
        quantity: "6",
        price: "25"
      },
      {
        description: "طراحی استوری",
        quantity: "4",
        price: "12.50"
      },
      {
        description: "جلسهٔ هماهنگی و برنامه‌ریزی",
        quantity: "1",
        price: "40"
      }
    ],
    included:
      "طراحی بر اساس هویت بصری ارائه‌شده توسط مشتری\nتحویل فایل‌های نهایی تصویری\nآماده‌سازی متن کوتاه برای هر پست",
    excluded:
      "عکاسی و فیلم‌برداری\nمدیریت حساب شبکهٔ اجتماعی\nهزینهٔ تبلیغات و خرید تصاویر",
    delivery: "۷ روز کاری پس از تأیید محدوده و دریافت محتوا",
    revisions: "2"
  });

  fields.client.focus();
});

byId("resetButton").addEventListener("click", () => {
  const confirmed = window.confirm(
    "تمام اطلاعات فعلی پاک و فرم به حالت اولیه برگردانده شود؟ این کار قابل بازگشت نیست."
  );

  if (!confirmed) {
    return;
  }

  loadData({});
  fields.provider.focus();
});

setupFileInterface();
setupPrintInterface();
setupPrintMessage();
loadData({});
initialFormSnapshot = JSON.stringify(collectProposal());