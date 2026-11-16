"use strict";

const byId = (id) => document.getElementById(id);

const form = byId("proposalForm");
const serviceRows = byId("serviceRows");
const workspace = byId("workspace");

const fields = {
  provider: byId("provider"),
  client: byId("client"),
  project: byId("project"),
  description: byId("description"),
  proposalNumber: byId("proposalNumber"),
  proposalDate: byId("proposalDate"),
  currency: byId("currency"),
  discount: byId("discount"),
  included: byId("included"),
  excluded: byId("excluded"),
  delivery: byId("delivery"),
  revisions: byId("revisions")
};

const APP_ID = "noxaplus-scope-builder";
const SCHEMA_VERSION = 2;
const DRAFT_KEY = "noxaplus-scope-builder:draft";
const THEME_KEY = "noxaplus-scope-builder:theme";
const MAX_FILE_BYTES = 1024 * 1024;
const ALLOWED_CURRENCIES = ["USD", "USDT", "تومان"];
const SVG_NS = "http://www.w3.org/2000/svg";

let nextServiceId = 0;
let importInProgress = false;
let autosaveTimer = null;
let toastTimer = null;
let confirmResolver = null;

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

function createIcon(symbolId, className = "icon") {
  const svg = document.createElementNS(SVG_NS, "svg");
  const use = document.createElementNS(SVG_NS, "use");

  svg.setAttribute("class", className);
  svg.setAttribute("aria-hidden", "true");
  use.setAttribute("href", `#${symbolId}`);
  svg.append(use);

  return svg;
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

function formatTime(date) {
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");

  return toPersianDigits(`${hours}:${minutes}`);
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

  if (!errorElement) {
    return;
  }

  errorElement.textContent = message;
  input.setAttribute("aria-invalid", message ? "true" : "false");
}

function showText(id, value, emptyText) {
  const target = byId(id);
  const text = value.trim();

  target.textContent = text || emptyText;
  target.classList.toggle("empty", text === "");
}

function defaultDocumentDate() {
  try {
    return new Intl.DateTimeFormat("fa-IR", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit"
    }).format(new Date());
  } catch {
    return localDateForFilename();
  }
}

function defaultProposalNumber() {
  const year = normalizeNumber(defaultDocumentDate()).split("/")[0] || "1405";

  return `NP-${year}-001`;
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
  label.append(
    createElement("span", "req", "*"),
    createElement("span", "sr-only", "(الزامی)")
  );

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
    input.maxLength = 24;
    input.setAttribute("aria-describedby", `${error.id} moneyPolicy`);
  } else {
    input.maxLength = 300;
    input.setAttribute("aria-describedby", error.id);
  }

  let control = input;

  if (decimal) {
    control = createElement("div", "input-affix");
    control.append(
      input,
      createElement("span", "currency-suffix", fields.currency.value)
    );
  }

  wrapper.append(label, control, error);

  return { wrapper, input };
}

function addService(data = {}) {
  const id = ++nextServiceId;
  const row = createElement("div", "service-row");
  const header = createElement("div", "service-row-header");
  const heading = createElement("h3");
  const rowTotal = createElement("span", "row-total");
  const removeButton = createElement("button", "remove-row");

  heading.id = `service-${id}-heading`;
  row.setAttribute("role", "group");
  row.setAttribute("aria-labelledby", heading.id);

  removeButton.type = "button";
  removeButton.append(createIcon("i-trash"));
  header.append(heading, rowTotal, removeButton);

  const description = createServiceField({
    id: `service-${id}-description`,
    labelText: "شرح خدمت",
    value: data.description ?? ""
  });

  const quantity = createServiceField({
    id: `service-${id}-quantity`,
    labelText: "تعداد",
    value: data.quantity ?? "1",
    numeric: true
  });

  const price = createServiceField({
    id: `service-${id}-price`,
    labelText: "قیمت واحد",
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
    scheduleAutosave();
    focusTarget.focus();
  });

  renumberServices();

  return description.input;
}

function renumberServices() {
  Array.from(serviceRows.children).forEach((row, index) => {
    const number = toPersianDigits(index + 1);

    row.querySelector("h3").textContent = `خدمت ${number}`;
    row.querySelector(".remove-row").setAttribute(
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
    quantity.ok ? toPersianDigits(quantity.value.toString()) : "نامعتبر"
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

function updateCompletion() {
  const rows = Array.from(serviceRows.children);
  const hasValidService = rows.some((row) => {
    const description = row
      .querySelector('[data-kind="description"]')
      .value.trim();

    return (
      description !== "" &&
      parseWholeNumber(row.querySelector('[data-kind="quantity"]').value, false)
        .ok &&
      parseMoney(row.querySelector('[data-kind="price"]').value).ok
    );
  });

  const checks = [
    fields.provider.value.trim() !== "",
    fields.client.value.trim() !== "",
    fields.project.value.trim() !== "",
    fields.proposalNumber.value.trim() !== "",
    fields.proposalDate.value.trim() !== "",
    fields.description.value.trim() !== "",
    hasValidService,
    fields.included.value.trim() !== "",
    fields.excluded.value.trim() !== "",
    fields.delivery.value.trim() !== ""
  ];

  const percent = Math.round(
    (checks.filter(Boolean).length / checks.length) * 100
  );

  byId("completionValue").textContent = `${toPersianDigits(percent)}٪`;
  byId("completionBar").style.width = `${percent}%`;
  byId("completionMeter").setAttribute("aria-valuenow", String(percent));
}

function render() {
  let hasFormErrors = false;

  const requiredTextFields = [
    [fields.provider, "نام ارائه‌دهنده یا برند را وارد کنید."],
    [fields.client, "نام مشتری را وارد کنید."],
    [fields.project, "عنوان پروژه را وارد کنید."],
    [fields.proposalNumber, "شمارهٔ پیشنهاد را وارد کنید."],
    [fields.proposalDate, "تاریخ صدور را وارد کنید."]
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
  showText("previewProposalNumber", fields.proposalNumber.value, "—");
  showText("previewProposalDate", fields.proposalDate.value, "—");
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

  byId("previewProviderMeta").textContent =
    fields.provider.value.trim() || "—";
  byId("previewClientMeta").textContent = fields.client.value.trim() || "—";
  byId("previewCurrency").textContent = fields.currency.value;

  document.querySelectorAll(".currency-suffix").forEach((suffix) => {
    suffix.textContent = fields.currency.value;
  });

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

    row.querySelector(".row-total").textContent =
      rowTotal === null ? "" : moneyLabel(rowTotal);

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

  const emptyDocument =
    fields.client.value.trim() === "" &&
    fields.project.value.trim() === "" &&
    !rows.some(
      (row) =>
        row.querySelector('[data-kind="description"]').value.trim() !== ""
    );

  byId("documentEmptyHint").hidden = !emptyDocument;

  updateCompletion();
  updatePrintSections();

  return !incomplete;
}

function loadData(data) {
  fields.provider.value = data.provider ?? "NoxaPlus";
  fields.client.value = data.client ?? "";
  fields.project.value = data.project ?? "";
  fields.description.value = data.description ?? "";
  fields.proposalNumber.value =
    data.proposalNumber || defaultProposalNumber();
  fields.proposalDate.value = data.proposalDate || defaultDocumentDate();
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

/* Theme */

function applyTheme(theme) {
  document.documentElement.setAttribute("data-theme", theme);

  const toggle = byId("themeToggle");
  const isDark = theme === "dark";

  toggle.setAttribute("aria-pressed", String(isDark));
  toggle.setAttribute(
    "aria-label",
    isDark ? "تغییر به حالت روشن" : "تغییر به حالت تاریک"
  );

  byId("themeColorMeta").setAttribute(
    "content",
    isDark ? "#0b0f17" : "#f5f4f1"
  );
}

function setupThemeToggle() {
  applyTheme(document.documentElement.getAttribute("data-theme") || "light");

  byId("themeToggle").addEventListener("click", () => {
    const next =
      document.documentElement.getAttribute("data-theme") === "dark"
        ? "light"
        : "dark";

    applyTheme(next);

    try {
      localStorage.setItem(THEME_KEY, next);
    } catch {
      // Theme still applies for this page view.
    }
  });
}

/* Mobile editor/preview tabs */

function switchView(view) {
  workspace.dataset.view = view;

  [
    [byId("viewEditorTab"), "editor"],
    [byId("viewPreviewTab"), "preview"]
  ].forEach(([tab, tabView]) => {
    const active = tabView === view;

    tab.classList.toggle("is-active", active);
    tab.setAttribute("aria-selected", String(active));
  });

  if (view === "preview") {
    render();
  }
}

function setupViewSwitcher() {
  const tabs = [byId("viewEditorTab"), byId("viewPreviewTab")];

  tabs[0].addEventListener("click", () => switchView("editor"));
  tabs[1].addEventListener("click", () => switchView("preview"));

  tabs.forEach((tab, index) => {
    tab.addEventListener("keydown", (event) => {
      let targetIndex = null;

      if (event.key === "ArrowRight" || event.key === "ArrowLeft") {
        targetIndex = index === 0 ? 1 : 0;
      } else if (event.key === "Home") {
        targetIndex = 0;
      } else if (event.key === "End") {
        targetIndex = 1;
      }

      if (targetIndex === null) {
        return;
      }

      event.preventDefault();
      tabs[targetIndex].focus();
      switchView(targetIndex === 0 ? "editor" : "preview");
    });
  });
}

/* Feedback */

function showFileMessage(message, tone = "valid") {
  const target = byId("fileMessage");

  target.hidden = false;
  target.className = `inline-message is-${tone}`;
  target.textContent = message;
}

function hideFileMessage() {
  byId("fileMessage").hidden = true;
}

function showPrintMessage(message, tone = "valid") {
  const target = byId("printMessage");

  target.hidden = false;
  target.className = `inline-message is-${tone}`;
  target.textContent = message;
}

function showToast(message, isError = false) {
  const toast = byId("toast");

  window.clearTimeout(toastTimer);
  byId("toastText").textContent = message;
  toast.classList.toggle("is-error", isError);
  toast.hidden = false;

  toastTimer = window.setTimeout(() => {
    toast.hidden = true;
  }, 3200);
}

/* Autosave */

function setAutosaveState(state, text) {
  const status = byId("autosaveStatus");

  status.classList.toggle("is-saving", state === "saving");
  status.classList.toggle("is-error", state === "error");
  byId("autosaveText").textContent = text;
}

function saveDraft() {
  window.clearTimeout(autosaveTimer);
  autosaveTimer = null;

  try {
    localStorage.setItem(DRAFT_KEY, JSON.stringify(collectProposal()));
    setAutosaveState("saved", `ذخیره شد · ${formatTime(new Date())}`);
  } catch {
    setAutosaveState(
      "error",
      "ذخیرهٔ خودکار ممکن نشد؛ برای نگهداری نسخه، JSON بگیرید."
    );
  }
}

function scheduleAutosave() {
  setAutosaveState("saving", "در حال ذخیره…");
  window.clearTimeout(autosaveTimer);
  autosaveTimer = window.setTimeout(saveDraft, 350);
}

function safeString(value, fallback, maxLength) {
  return typeof value === "string" ? value.slice(0, maxLength) : fallback;
}

function normalizeDraft(raw) {
  if (!isRecord(raw) || raw.appId !== APP_ID) {
    return null;
  }

  const version = raw.schemaVersion === 1 ? 1 : 2;

  const services = Array.isArray(raw.services)
    ? raw.services.slice(0, 100).filter(isRecord).map((service) => ({
        description: safeString(service.description, "", 300),
        quantity: safeString(service.quantity, "1", 24),
        unitPrice: safeString(service.unitPrice, "", 24)
      }))
    : [];

  if (services.length === 0) {
    services.push({ description: "", quantity: "1", unitPrice: "" });
  }

  const currency = ALLOWED_CURRENCIES.includes(raw.currency)
    ? raw.currency
    : "USD";

  return {
    appId: APP_ID,
    schemaVersion: SCHEMA_VERSION,
    proposalNumber:
      version === 2
        ? safeString(raw.proposalNumber, "", 60)
        : defaultProposalNumber(),
    proposalDate:
      version === 2
        ? safeString(raw.proposalDate, "", 40)
        : defaultDocumentDate(),
    provider: safeString(raw.provider, "NoxaPlus", 120),
    client: safeString(raw.client, "", 120),
    title: safeString(raw.title, "", 180),
    description: safeString(raw.description, "", 2000),
    currency,
    services,
    fixedDiscount: safeString(raw.fixedDiscount, "0", 24),
    includedWork: safeString(raw.includedWork, "", 5000),
    excludedWork: safeString(raw.excludedWork, "", 5000),
    deliveryTime: safeString(raw.deliveryTime, "", 250),
    revisionRounds: safeString(raw.revisionRounds, "0", 24)
  };
}

function restoreDraft() {
  let stored;

  try {
    stored = localStorage.getItem(DRAFT_KEY);
  } catch {
    return false;
  }

  if (!stored) {
    return false;
  }

  let draft;

  try {
    draft = normalizeDraft(JSON.parse(stored));
  } catch {
    draft = null;
  }

  if (!draft) {
    return false;
  }

  loadData(proposalToFormData(draft));
  byId("restoreBanner").hidden = false;
  setAutosaveState("saved", "پیش‌نویس بازیابی شد");

  return true;
}

/* JSON file interface */

function collectProposal() {
  return {
    appId: APP_ID,
    schemaVersion: SCHEMA_VERSION,
    proposalNumber: fields.proposalNumber.value,
    proposalDate: fields.proposalDate.value,
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

  const version = data.schemaVersion;

  if (version !== 1 && version !== SCHEMA_VERSION) {
    failValidation(
      "نسخهٔ ساختار فایل پشتیبانی نمی‌شود؛ فقط schemaVersion ۱ یا ۲ پذیرفته می‌شود."
    );
  }

  const proposalNumber =
    version === SCHEMA_VERSION
      ? requireString(data, "proposalNumber", "شمارهٔ پیشنهاد", {
          maxLength: 60,
          required: true,
          singleLine: true
        })
      : defaultProposalNumber();

  const proposalDate =
    version === SCHEMA_VERSION
      ? requireString(data, "proposalDate", "تاریخ صدور", {
          maxLength: 40,
          required: true,
          singleLine: true
        })
      : defaultDocumentDate();

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
    proposalNumber,
    proposalDate,
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
    proposalNumber: proposal.proposalNumber,
    proposalDate: proposal.proposalDate,
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

function formHasMeaningfulContent() {
  return (
    fields.client.value.trim() !== "" ||
    fields.project.value.trim() !== "" ||
    fields.description.value.trim() !== "" ||
    fields.included.value.trim() !== "" ||
    fields.excluded.value.trim() !== "" ||
    fields.delivery.value.trim() !== "" ||
    Array.from(serviceRows.children).some(
      (row) =>
        row.querySelector('[data-kind="description"]').value.trim() !== "" ||
        row.querySelector('[data-kind="price"]').value.trim() !== ""
    )
  );
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
      "درخواست دانلود فایل JSON به مرورگر ارسال شد. فایل شامل اطلاعات مشتری و قیمت‌هاست."
    );
    showToast("فایل JSON با همهٔ ورودی‌های قابل‌ویرایش آماده شد.");

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
      "error"
    );

    switchView("editor");
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

  showFileMessage("در حال خواندن و بررسی فایل؛ اطلاعات فرم هنوز تغییر نکرده است.", "info");

  try {
    const proposal = await readAndValidateProposal(file);

    if (formHasMeaningfulContent()) {
      const confirmed = await askConfirm({
        title: "جایگزینی اطلاعات فرم",
        message:
          "باز کردن این فایل، اطلاعات فعلی فرم را جایگزین می‌کند. اطلاعات فعلی جایگزین شود؟",
        acceptLabel: "جایگزین کن"
      });

      if (!confirmed) {
        showFileMessage(
          "باز کردن پیشنهاد لغو شد؛ اطلاعات فعلی بدون تغییر باقی ماند.",
          "info"
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

    scheduleAutosave();
    showFileMessage(
      "پیشنهاد با موفقیت باز شد و مبالغ از ورودی‌ها دوباره محاسبه شدند."
    );
    showToast("پیشنهاد از فایل JSON باز شد.");
    switchView("editor");
  } catch (error) {
    showFileMessage(
      `باز کردن انجام نشد: ${
        error instanceof Error ? error.message : "خطای نامشخص رخ داد."
      } اطلاعات فعلی فرم حفظ شد.`,
      "error"
    );
  } finally {
    importInProgress = false;
    importButton.disabled = false;
    importButton.removeAttribute("aria-busy");
  }
}

/* Browser printing */

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
      "error"
    );

    switchView("editor");
    form.querySelector('[aria-invalid="true"]')?.focus();
  }
}

/* Confirmation dialog */

function askConfirm({ title, message, acceptLabel = "تأیید" }) {
  const dialog = byId("confirmDialog");

  if (confirmResolver || dialog.open) {
    return Promise.resolve(false);
  }

  byId("confirmTitle").textContent = title;
  byId("confirmMessage").textContent = message;
  byId("confirmAccept").textContent = acceptLabel;

  dialog.returnValue = "cancel";
  dialog.showModal();

  return new Promise((resolve) => {
    confirmResolver = resolve;
  });
}

function setupConfirmDialog() {
  const dialog = byId("confirmDialog");

  dialog.addEventListener("close", () => {
    const confirmed = dialog.returnValue === "confirm";
    const resolver = confirmResolver;

    confirmResolver = null;
    resolver?.(confirmed);
  });

  dialog.addEventListener("click", (event) => {
    if (event.target === dialog) {
      dialog.close("cancel");
    }
  });
}

/* Templates */

const TEMPLATES = {
  website: {
    provider: "NoxaPlus",
    client: "شرکت نمونهٔ آفتاب",
    project: "طراحی و توسعهٔ وب‌سایت شرکتی",
    description:
      "طراحی یک وب‌سایت شرکتی سریع و واکنش‌گرا برای معرفی خدمات، نمونه‌کارها و راه‌های ارتباطی. محتوای نهایی توسط مشتری تأمین می‌شود.",
    currency: "USD",
    discount: "0",
    services: [
      { description: "کشف نیاز و معماری اطلاعات", quantity: "1", price: "180" },
      { description: "طراحی رابط کاربری صفحات اصلی", quantity: "4", price: "95" },
      { description: "پیاده‌سازی واکنش‌گرا و دسترس‌پذیر", quantity: "1", price: "850" },
      { description: "آزمون، انتشار و آموزش کوتاه", quantity: "1", price: "220" }
    ],
    included:
      "طراحی صفحات اصلی بر اساس محتوای نهایی\nپیاده‌سازی نسخهٔ موبایل و دسکتاپ\nانتشار روی فضای میزبانی مشتری\nیک جلسهٔ آموزش کوتاه",
    excluded:
      "تولید متن، عکس یا ویدیو\nدامنه، میزبانی و هزینهٔ سرویس‌های شخص ثالث\nیکپارچه‌سازی با سامانه‌های داخلی مشتری",
    delivery: "۳ هفته کاری پس از تأیید محدوده و دریافت محتوا",
    revisions: "2"
  },
  consulting: {
    provider: "NoxaPlus",
    client: "کسب‌وکار نمونهٔ مسیر",
    project: "مشاورهٔ استراتژی برند و بازاریابی",
    description:
      "همراهی برای روشن‌کردن جایگاه برند، مخاطب اصلی و مسیر اجرای سه‌ماههٔ بازاریابی.",
    currency: "USD",
    discount: "0",
    services: [
      { description: "کارگاه تعریف مسئله و اهداف", quantity: "1", price: "250" },
      { description: "تحلیل رقبا و مخاطب", quantity: "1", price: "320" },
      { description: "گزارش استراتژی و نقشهٔ اجرا", quantity: "1", price: "480" }
    ],
    included:
      "دو جلسهٔ کارگاه آنلاین\nتحلیل محدود رقبا و مخاطب\nگزارش استراتژی و نقشهٔ اجرای سه‌ماهه",
    excluded:
      "اجرای کمپین یا تولید محتوا\nخرید رسانه و تبلیغات\nتحقیقات میدانی گسترده",
    delivery: "۱۰ روز کاری پس از تأیید محدوده",
    revisions: "1"
  },
  support: {
    provider: "NoxaPlus",
    client: "فروشگاه نمونهٔ رون",
    project: "پشتیبانی و نگهداری ماهانهٔ وب‌سایت",
    description:
      "نگهداری دوره‌ای، به‌روزرسانی امنیتی و پاسخ‌گویی به درخواست‌های فنی وب‌سایت در یک بازهٔ ماهانه.",
    currency: "USD",
    discount: "0",
    services: [
      { description: "پایش و به‌روزرسانی ماهانه", quantity: "1", price: "240" },
      { description: "پشتیبانی فنی تا ۱۰ ساعت", quantity: "1", price: "350" },
      { description: "گزارش ماهانه و جلسهٔ بازبینی", quantity: "1", price: "120" }
    ],
    included:
      "به‌روزرسانی امنیتی و پشتیبان‌گیری دوره‌ای\nپاسخ‌گویی به درخواست‌های فنی در ساعات کاری\nگزارش ماهانهٔ وضعیت",
    excluded:
      "توسعهٔ قابلیت‌های جدید\nمدیریت محتوا و تولید متن\nسرویس‌های شخص ثالث و هزینهٔ آن‌ها",
    delivery: "شروع از ابتدای ماه پس از تأیید",
    revisions: "0"
  },
  sample: {
    provider: "NoxaPlus",
    client: "کافهٔ خیالی سپیدار",
    project: "طراحی بستهٔ محتوای شبکه‌های اجتماعی",
    description:
      "آماده‌سازی یک بستهٔ محتوایی برای معرفی منوی جدید یک کافهٔ خیالی.",
    currency: "USD",
    discount: "20",
    services: [
      { description: "طراحی پست ثابت", quantity: "6", price: "25" },
      { description: "طراحی استوری", quantity: "4", price: "12.50" },
      { description: "جلسهٔ هماهنگی و برنامه‌ریزی", quantity: "1", price: "40" }
    ],
    included:
      "طراحی بر اساس هویت بصری ارائه‌شده توسط مشتری\nتحویل فایل‌های نهایی تصویری\nآماده‌سازی متن کوتاه برای هر پست",
    excluded:
      "عکاسی و فیلم‌برداری\nمدیریت حساب شبکهٔ اجتماعی\nهزینهٔ تبلیغات و خرید تصاویر",
    delivery: "۷ روز کاری پس از تأیید محدوده و دریافت محتوا",
    revisions: "2"
  }
};

function applyTemplate(template) {
  const meta = {
    proposalNumber: fields.proposalNumber.value,
    proposalDate: fields.proposalDate.value
  };

  loadData({ ...template, ...meta });
  scheduleAutosave();
  switchView("editor");
  showToast("الگو اعمال شد؛ نام‌ها و مبالغ را با پروژهٔ خود جایگزین کنید.");
}

function setupTemplates() {
  const dialog = byId("templatesDialog");

  byId("templatesButton").addEventListener("click", () => {
    if (!dialog.open) {
      dialog.showModal();
    }
  });

  byId("emptyTemplateButton").addEventListener("click", () => {
    if (!dialog.open) {
      dialog.showModal();
    }
  });

  byId("closeTemplatesButton").addEventListener("click", () => {
    dialog.close();
  });

  dialog.addEventListener("click", (event) => {
    if (event.target === dialog) {
      dialog.close();
    }
  });

  dialog.querySelectorAll("[data-template]").forEach((card) => {
    card.addEventListener("click", async () => {
      const template = TEMPLATES[card.dataset.template];

      if (!template) {
        return;
      }

      dialog.close();

      if (formHasMeaningfulContent()) {
        const confirmed = await askConfirm({
          title: "اعمال الگو",
          message:
            "با اعمال این الگو، اطلاعات فعلی فرم جایگزین می‌شود. ادامه می‌دهید؟",
          acceptLabel: "اعمال کن"
        });

        if (!confirmed) {
          return;
        }
      }

      applyTemplate(template);
    });
  });
}

/* Draft banner */

function setupDraftActions() {
  const newProposal = async () => {
    const confirmed = await askConfirm({
      title: "شروع پیشنهاد تازه",
      message:
        "فرم به حالت اولیه برمی‌گردد و پیش‌نویس قبلی از این مرورگر پاک می‌شود. ادامه می‌دهید؟",
      acceptLabel: "شروع تازه"
    });

    if (!confirmed) {
      return;
    }

    window.clearTimeout(autosaveTimer);
    try {
      localStorage.removeItem(DRAFT_KEY);
    } catch {
      // The form can still be reset if storage is unavailable.
    }

    loadData({});
    byId("restoreBanner").hidden = true;
    showToast("پیشنهاد تازه شروع شد.");
    fields.client.focus();
    scheduleAutosave();
  };

  byId("newProposalButton").addEventListener("click", newProposal);

  byId("clearDraftButton").addEventListener("click", async () => {
    const confirmed = await askConfirm({
      title: "پاک کردن نسخهٔ ذخیره‌شده",
      message:
        "نسخهٔ ذخیره‌شده در این مرورگر پاک شود؟ اطلاعات فعلی فرم تا ویرایش بعدی پاک نمی‌شود.",
      acceptLabel: "پاک کن"
    });

    if (!confirmed) {
      return;
    }

    window.clearTimeout(autosaveTimer);

    try {
      localStorage.removeItem(DRAFT_KEY);
      setAutosaveState("saved", "نسخهٔ ذخیره‌شده پاک شد");
      byId("restoreBanner").hidden = true;
      showToast("نسخهٔ ذخیره‌شده از این مرورگر پاک شد.");
    } catch {
      showToast("پاک کردن نسخهٔ ذخیره‌شده ممکن نشد.", true);
    }
  });
}

/* Existing form actions */

form.addEventListener("submit", (event) => {
  event.preventDefault();
});

form.addEventListener("input", () => {
  render();
  scheduleAutosave();
});

form.addEventListener("change", () => {
  render();
  scheduleAutosave();
});

byId("addServiceButton").addEventListener("click", () => {
  const newDescriptionInput = addService();

  render();
  scheduleAutosave();
  newDescriptionInput.focus();
});

byId("exportButton").addEventListener("click", exportProposal);

byId("importButton").addEventListener("click", () => {
  if (importInProgress) {
    return;
  }

  // Clearing the value allows selecting the same file again.
  byId("proposalFile").value = "";
  byId("proposalFile").click();
});

byId("proposalFile").addEventListener("change", () => {
  const file = byId("proposalFile").files?.[0];

  // Keep the File reference, but clear the input for future selections.
  byId("proposalFile").value = "";

  if (file) {
    importProposal(file);
  }
});

byId("printButton").addEventListener("click", printProposal);
byId("previewPrintButton").addEventListener("click", printProposal);

byId("resetButton").addEventListener("click", async () => {
  const confirmed = await askConfirm({
    title: "بازنشانی فرم",
    message:
      "تمام اطلاعات فعلی پاک و فرم به حالت اولیه برگردانده شود؟ این کار قابل بازگشت نیست.",
    acceptLabel: "بازنشانی کن"
  });

  if (!confirmed) {
    return;
  }

  window.clearTimeout(autosaveTimer);
  try {
    localStorage.removeItem(DRAFT_KEY);
  } catch {
    // The form can still be reset if storage is unavailable.
  }

  loadData({});
  byId("restoreBanner").hidden = true;
  hideFileMessage();
  showToast("فرم بازنشانی شد.");
  switchView("editor");
  fields.provider.focus();
  scheduleAutosave();
});

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

setupThemeToggle();
setupViewSwitcher();
setupConfirmDialog();
setupTemplates();
setupDraftActions();

if (!restoreDraft()) {
  loadData({});
}
