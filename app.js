const STORAGE_KEY = "familyBudgetSections.v7";
const LEGACY_STORAGE_KEYS = ["familyBudgetSections.v6", "familyBudgetSections.v5", "familyBudgetSections.v4", "familyBudgetSections.v3"];
const GOOGLE_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbyYRrFkOrOPP2Yv1-mEj3fWJG1cKA5yLlaDirs7f7K7EhOz9vnOIDLte2FEaOvXI_YR/exec";
const GOOGLE_SCRIPT_TOKEN = "family-budget-2026";
const START_DATE = "2026-09-01";
const START_MONTH = "2026-09";
const RUB = new Intl.NumberFormat("ru-RU", {
  style: "currency",
  currency: "RUB",
  maximumFractionDigits: 0,
});

const requiredDefaults = [
  { name: "Квартира", amount: 90000, paid: true, order: 1 },
  { name: "Коммуналка", amount: 10000, paid: true, order: 2 },
  { name: "Карта Тройка", amount: 7000, paid: true, order: 3 },
  { name: "Оплата моб. связи Крис", amount: 0, order: 4 },
  { name: "Оплата моб. связи Алины", amount: 0, order: 5 },
];

const incomeDefaults = [
  {
    name: "Крис",
    order: 1,
    slots: [
      { key: "day14", label: "14 число" },
      { key: "day29", label: "29 число" },
    ],
  },
  {
    name: "Алина СМ",
    order: 2,
    slots: [
      { key: "day11", label: "11 число" },
      { key: "day25", label: "25 число" },
    ],
  },
  {
    name: "Алина Нейромолодость",
    order: 3,
    slots: [
      { key: "day5", label: "5 число" },
      { key: "day20", label: "20 число" },
      { key: "cash", label: "Наличкой" },
    ],
  },
];


const debtDefaults = [
  {
    name: "Кредит Крис (Металл)",
    amount: 14100,
    dueDay: 18,
    balance: 326392.4,
    paid: true,
    order: 1,
  },
  {
    name: "Кредит Крис (Альфа)",
    amount: 17200,
    dueDay: 5,
    balance: 318591.76,
    paid: true,
    order: 2,
  },
  {
    name: "Кредит Алина (Тинькофф)",
    amount: 0,
    dueDay: "",
    balance: 0,
    order: 3,
  },
  {
    name: "Кредит Алина (Сбер, кредитка)",
    amount: 0,
    dueDay: "",
    balance: 0,
    order: 4,
  },
  {
    name: "Кредит Алина (Сбер, мама)",
    amount: 0,
    dueDay: "",
    balance: 0,
    order: 5,
  },
];

const sections = {
  income: {
    title: "Доходы",
    hint: "Основные выплаты по датам и дополнительные поступления за выбранный месяц.",
    placeholder: "Например: премия или возврат",
  },
  required: {
    title: "Обязательные расходы",
    hint: "То, что нужно оплатить обязательно: жилье, коммунальные услуги, регулярные переводы.",
    placeholder: "Например: квартира",
  },
  debt: {
    title: "Долги",
    hint: "Кредиты, рассрочки, займы и любые платежи по долгам.",
    placeholder: "Например: кредит",
  },
  other: {
    title: "Прочие траты",
    hint: "Повседневные и нерегулярные расходы: продукты, транспорт, дом, личные покупки.",
    placeholder: "Например: продукты",
  },
  savings: {
    title: "Сбережения с прошлых месяцев",
    hint: "Деньги, которые уже были отложены раньше и переходят в текущий месяц.",
    placeholder: "Например: остаток с прошлого месяца",
  },
};

let activeSection = "income";
let selectedMonth = START_MONTH;
const state = loadState();
let hasLoadedRemoteState = false;
let syncTimer;

const els = {
  tabs: [...document.querySelectorAll("[data-section]")],
  monthInput: document.querySelector("#monthInput"),
  resetButton: document.querySelector("#resetButton"),
  syncStatus: document.querySelector("#syncStatus"),
  currentBudget: document.querySelector("#currentBudget"),
  sectionTitle: document.querySelector("#sectionTitle"),
  sectionHint: document.querySelector("#sectionHint"),
  sectionTotal: document.querySelector("#sectionTotal"),
  entryForm: document.querySelector("#entryForm"),
  entryName: document.querySelector("#entryName"),
  entryDate: document.querySelector("#entryDate"),
  entryAmount: document.querySelector("#entryAmount"),
  entryComment: document.querySelector("#entryComment"),
  entryList: document.querySelector("#entryList"),
};

init();

function init() {
  els.entryDate.value = START_DATE;
  els.monthInput.value = selectedMonth;

  els.tabs.forEach((tab) => {
    tab.addEventListener("click", () => {
      activeSection = tab.dataset.section;
      render();
    });
  });
  els.monthInput.addEventListener("change", () => {
    selectedMonth = els.monthInput.value || START_MONTH;
    els.entryDate.value = `${selectedMonth}-01`;
    render();
  });

  els.entryForm.addEventListener("submit", (event) => {
    event.preventDefault();
    const amount = Number(els.entryAmount.value);
    if (!amount) return;

    state.entries.push({
      id: uid(),
      section: activeSection,
      name: els.entryName.value.trim(),
      date: els.entryDate.value,
      amount,
      comment: els.entryComment.value.trim(),
      paid: false,
    });

    saveState();
    els.entryName.value = "";
    els.entryAmount.value = "";
    els.entryComment.value = "";
    render();
    els.entryName.focus();
  });

  els.resetButton.addEventListener("click", () => {
    if (!confirm("Вернуться к стартовой точке 1 сентября 2026?")) return;
    state.entries = defaultEntries();
    saveState();
    render();
  });

  render();
  loadRemoteState();
}

function render() {
  const section = sections[activeSection];
  const entries = visibleEntries(activeSection).sort(sortEntries);
  const total = sectionTotal(activeSection, entries);

  els.tabs.forEach((tab) => {
    const isActive = tab.dataset.section === activeSection;
    tab.classList.toggle("active", isActive);
    tab.setAttribute("aria-current", isActive ? "page" : "false");
  });

  els.sectionTitle.textContent = section.title;
  els.sectionHint.textContent = section.hint;
  els.sectionTotal.textContent = money(total);
  els.entryName.placeholder = section.placeholder;
  els.currentBudget.textContent = money(currentBudget());
  els.entryForm.hidden = activeSection === "savings";

  els.entryList.innerHTML = entries.length
    ? entries
        .map((entry) => renderEntry(entry))
        .join("")
    : `<div class="empty">Пока здесь нет записей.</div>`;

  els.entryList.querySelectorAll("[data-delete]").forEach((button) => {
    button.addEventListener("click", () => {
      const entry = state.entries.find((item) => item.id === button.dataset.delete);
      if (!entry) return;
      if (["income", "other"].includes(entry.section) && !confirm(`Удалить запись "${entry.name}"?`)) return;
      state.entries = state.entries.filter((item) => item.id !== entry.id);
      saveState();
      render();
    });
  });
  els.entryList.querySelectorAll("[data-paid]").forEach((button) => {
    button.addEventListener("click", () => {
      const entry = state.entries.find((item) => item.id === button.dataset.paid);
      if (!entry) return;
      if (isPaidForMonth(entry) && !confirm(`Вернуть "${entry.name}" в неоплаченные?`)) return;
      togglePaidMonth(entry);
      saveState();
      render();
    });
  });
  els.entryList.querySelectorAll("[data-adjust]").forEach((button) => {
    button.addEventListener("click", () => {
      const entry = state.entries.find((item) => item.id === button.dataset.adjust);
      if (!entry) return;
      const direction = button.dataset.direction === "plus" ? 1 : -1;
      const value = prompt(direction > 0 ? "На сколько увеличить?" : "На сколько уменьшить?");
      const amount = Number((value || "").replace(",", "."));
      if (!amount) return;
      entry.amount = Math.max(0, Number(entry.amount || 0) + direction * amount);
      saveState();
      render();
    });
  });
  els.entryList.querySelectorAll("[data-income-input]").forEach((input) => {
    input.addEventListener("change", () => {
      const entry = state.entries.find((item) => item.id === input.dataset.incomeInput);
      if (!entry) return;
      const slot = input.dataset.slot;
      const amount = Number((input.value || "").replace(",", "."));
      if (Number.isNaN(amount)) return;
      entry.amountsByMonth = entry.amountsByMonth || {};
      entry.amountsByMonth[selectedMonth] = entry.amountsByMonth[selectedMonth] || {};
      entry.amountsByMonth[selectedMonth][slot] = Math.max(0, amount);
      saveState();
      render();
    });
  });
}

function renderEntry(entry) {
  if (activeSection === "income" && entry.recurring) return renderIncomeEntry(entry);

  const alertClass =
    activeSection === "required" || activeSection === "debt" ? ` due-${dueLevel(entry)}` : "";
  const status =
    activeSection === "required" || activeSection === "debt"
      ? `<span class="status ${isPaidForMonth(entry) ? "paid" : "unpaid"}">${
          isPaidForMonth(entry) ? "Оплачено" : "Не оплачено"
        }</span>`
      : "";
  const meta =
    entry.section === "debt"
      ? debtMeta(entry)
      : entry.section === "income" && entry.recurring
        ? incomeMeta(entry)
        : `${formatDate(entry.date)}${entry.comment ? ` · ${escapeHtml(entry.comment)}` : ""}`;
  const actions = entryActions(entry);
  const displayAmount = entry.amount;

  return `
    <article class="entry ${alertClass} ${(activeSection === "required" || activeSection === "debt") && isPaidForMonth(entry) ? "is-paid" : ""}">
      <div>
        <div class="entry-heading">
          <h3>${escapeHtml(entry.name)}</h3>
          ${status}
        </div>
        <p>${meta}</p>
      </div>
      <div class="entry-side">
        <strong>${money(displayAmount)}</strong>
        ${actions}
      </div>
    </article>
  `;
}

function renderIncomeEntry(entry) {
  const total = incomeEntryTotal(entry);
  return `
    <article class="income-card">
      <div class="income-card-head">
        <div>
          <p class="income-label">Источник дохода</p>
          <h3>${escapeHtml(entry.name)}</h3>
        </div>
        <div class="income-total">
          <span>Итого</span>
          <strong>${money(total)}</strong>
        </div>
      </div>
      <div class="income-slots">
        ${entry.slots
          .map(
            (slot) => `
              <div class="income-slot ${monthlyAmount(entry, slot.key) ? "has-value" : ""}">
                <div>
                  <span>${escapeHtml(slot.label)}</span>
                  <input
                    class="income-amount-input"
                    type="number"
                    min="0"
                    step="0.01"
                    inputmode="decimal"
                    placeholder="0 ₽"
                    value="${monthlyAmount(entry, slot.key) || ""}"
                    data-income-input="${entry.id}"
                    data-slot="${slot.key}"
                    aria-label="${escapeHtml(`${entry.name}, ${slot.label}`)}"
                  />
                </div>
              </div>
            `,
          )
          .join("")}
      </div>
    </article>
  `;
}

function entryActions(entry) {
  if (activeSection === "income" && entry.recurring) {
    return "";
  }

  if (activeSection === "required" || activeSection === "debt") {
    return `<button class="pill-button" type="button" data-paid="${entry.id}">${
      isPaidForMonth(entry) ? "Вернуть" : "Оплачено"
    }</button>`;
  }

  if (activeSection === "savings") {
    return `
      <button class="round-button plus" type="button" aria-label="Увеличить" data-adjust="${entry.id}" data-direction="plus">+</button>
      <button class="round-button minus" type="button" aria-label="Уменьшить" data-adjust="${entry.id}" data-direction="minus">−</button>
    `;
  }

  return `<button class="delete-button" type="button" aria-label="Удалить" data-delete="${entry.id}">×</button>`;
}

function currentBudget() {
  const currentMonth = monthKey(new Date());
  return state.entries.reduce((total, entry) => {
    const amount = Number(entry.amount || 0);
    if (entry.section === "savings") return total + amount;
    if (entry.section === "income" && entry.recurring) return total + incomeEntryTotal(entry);
    if (entry.section === "income" && entry.date.startsWith(selectedMonth)) return total + amount;
    if (selectedMonth <= currentMonth && entry.section === "required" && !isPaidForMonth(entry)) return total - amount;
    if (selectedMonth <= currentMonth && entry.section === "debt" && !isPaidForMonth(entry)) return total - amount;
    if (entry.section === "other" && entry.date.startsWith(selectedMonth)) return total - amount;
    return total;
  }, 0);
}

function visibleEntries(section) {
  return state.entries.filter((entry) => {
    if (entry.section !== section) return false;
    if (section === "income") return entry.recurring || entry.date.startsWith(selectedMonth);
    if (section === "other") return entry.date.startsWith(selectedMonth);
    return true;
  });
}

function sectionTotal(section, entries) {
  if (section === "debt") {
    return entries.reduce((sum, entry) => sum + debtBalanceForMonth(entry), 0);
  }
  if (section === "income" || section === "savings") {
    return entries.reduce((sum, entry) => sum + (entry.recurring ? incomeEntryTotal(entry) : Number(entry.amount || 0)), 0);
  }
  return entries.reduce((sum, entry) => sum + Number(entry.amount || 0), 0);
}

function loadState() {
  for (const key of [STORAGE_KEY, ...LEGACY_STORAGE_KEYS]) {
    try {
      const saved = JSON.parse(localStorage.getItem(key));
      if (saved && Array.isArray(saved.entries)) return migrateState(saved);
    } catch {
      localStorage.removeItem(key);
    }
  }
  return { entries: defaultEntries() };
}

function migrateState(saved) {
  const oldIncomeAmounts = collectOldIncomeAmounts(saved.entries);
  saved.entries = saved.entries.filter((entry) => !isOldIncomeEntry(entry));
  incomeDefaults.forEach((item) => {
    const exists = saved.entries.some((entry) => entry.section === "income" && entry.name === item.name);
    if (!exists) saved.entries.push(incomeEntry(item));
  });
  requiredDefaults.forEach((item) => {
    const exists = saved.entries.some((entry) => entry.section === "required" && entry.name === item.name);
    if (!exists) saved.entries.push(requiredEntry(item.name, item.amount, item.paid));
  });
  debtDefaults.forEach((item) => {
    const exists = saved.entries.some((entry) => entry.section === "debt" && entry.name === item.name);
    if (!exists) saved.entries.push(debtEntry(item));
  });
  saved.entries.forEach((entry) => {
    if (entry.section === "income" && entry.recurring) {
      entry.amountsByMonth = entry.amountsByMonth || {};
      entry.slots = incomeDefaults.find((item) => item.name === entry.name)?.slots || entry.slots || [];
      entry.order = incomeDefaults.find((item) => item.name === entry.name)?.order || entry.order || 100;
      applyOldIncomeAmounts(entry, oldIncomeAmounts);
    }
    entry.paidMonths = Array.isArray(entry.paidMonths) ? entry.paidMonths : [];
    if (entry.section === "required" && ["Квартира", "Коммуналка", "Карта Тройка"].includes(entry.name)) {
      addPaidMonth(entry, START_MONTH);
    }
    if (entry.section === "debt" && ["Кредит Крис (Металл)", "Кредит Крис (Альфа)"].includes(entry.name)) {
      addPaidMonth(entry, START_MONTH);
    }
  });
  saveStateObject(saved);
  return saved;
}

function defaultEntries() {
  return [
    {
      id: uid(),
      section: "savings",
      name: "Накопительный счет",
      date: START_DATE,
      amount: 19000,
      comment: "Стартовая сумма",
      paidMonths: [],
    },
    {
      id: uid(),
      section: "savings",
      name: "Наличкой",
      date: START_DATE,
      amount: 176000,
      comment: "Стартовая сумма",
      paidMonths: [],
    },
    ...incomeDefaults.map((item) => incomeEntry(item)),
    ...requiredDefaults.map((item) => requiredEntry(item.name, item.amount, item.paid)),
    ...debtDefaults.map((item) => debtEntry(item)),
  ];
}

function incomeEntry(item) {
  return {
    id: uid(),
    section: "income",
    name: item.name,
    date: START_DATE,
    amount: 0,
    amountsByMonth: {},
    comment: "Фактическая сумма по месяцу",
    recurring: true,
    slots: item.slots,
    order: item.order,
    paidMonths: [],
  };
}

function requiredEntry(name, amount, paid = false) {
  return {
    id: uid(),
    section: "required",
    name,
    date: START_DATE,
    amount,
    comment: "Обязательный расход",
    paid,
    paidMonths: paid ? [START_MONTH] : [],
    order: requiredDefaults.find((item) => item.name === name)?.order || 100,
  };
}

function debtEntry(item) {
  const date =
    item.dueDay === "" ? START_DATE : `2026-09-${String(item.dueDay).padStart(2, "0")}`;
  return {
    id: uid(),
    section: "debt",
    name: item.name,
    date,
    amount: item.amount,
    comment: "Ежемесячный платеж",
    paidMonths: item.paid ? [START_MONTH] : [],
    dueDay: item.dueDay,
    balance: item.balance,
    order: item.order,
  };
}

function debtMeta(entry) {
  const day = entry.dueDay ? `${entry.dueDay} число` : "число позже";
  const payment = Number(entry.amount || 0) ? `платеж ${money(entry.amount)}` : "платеж позже";
  const balance = Number(entry.balance || 0) ? `остаток ${money(debtBalanceForMonth(entry))}` : "остаток позже";
  return `${day} · ${payment} · ${balance}`;
}

function incomeMeta(entry) {
  return incomeEntryTotal(entry) > 0 ? "сумма внесена" : "сумма пока не внесена";
}

function monthlyAmount(entry, slot) {
  const monthly = entry.amountsByMonth?.[selectedMonth];
  if (typeof monthly === "number") return Number(monthly || 0);
  return Number(monthly?.[slot] || 0);
}

function incomeEntryTotal(entry) {
  return (entry.slots || []).reduce((total, slot) => total + monthlyAmount(entry, slot.key), 0);
}

function sortEntries(a, b) {
  if ((activeSection === "required" || activeSection === "debt") && isPaidForMonth(a) !== isPaidForMonth(b)) {
    return isPaidForMonth(a) ? 1 : -1;
  }
  if ((activeSection === "required" || activeSection === "debt") && !isPaidForMonth(a) && !isPaidForMonth(b)) {
    const severity = { overdue: 0, red: 1, orange: 2, yellow: 3, none: 4, paid: 5 };
    const levelA = severity[dueLevel(a)] ?? 4;
    const levelB = severity[dueLevel(b)] ?? 4;
    if (levelA !== levelB) return levelA - levelB;
  }
  const orderA = Number(a.order || 100);
  const orderB = Number(b.order || 100);
  if (orderA !== orderB) return orderA - orderB;
  return a.date.localeCompare(b.date);
}

function isOldIncomeEntry(entry) {
  return (
    entry.section === "income" &&
    [
      "Крис — 14 число",
      "Крис — 29 число",
      "Алина СМ — 11 число",
      "Алина СМ — 25 число",
      "Алина Нейромолодость — 5 число",
      "Алина Нейромолодость — 20 число",
      "Алина Нейромолодость — наличкой",
    ].includes(entry.name)
  );
}

function collectOldIncomeAmounts(entries) {
  const result = {};
  entries.filter(isOldIncomeEntry).forEach((entry) => {
    const target = oldIncomeTarget(entry.name);
    if (!target) return;
    Object.entries(entry.amountsByMonth || {}).forEach(([month, value]) => {
      result[target.name] = result[target.name] || {};
      result[target.name][month] = result[target.name][month] || {};
      result[target.name][month][target.slot] = Number(value || 0);
    });
  });
  return result;
}

function oldIncomeTarget(name) {
  const map = {
    "Крис — 14 число": { name: "Крис", slot: "day14" },
    "Крис — 29 число": { name: "Крис", slot: "day29" },
    "Алина СМ — 11 число": { name: "Алина СМ", slot: "day11" },
    "Алина СМ — 25 число": { name: "Алина СМ", slot: "day25" },
    "Алина Нейромолодость — 5 число": { name: "Алина Нейромолодость", slot: "day5" },
    "Алина Нейромолодость — 20 число": { name: "Алина Нейромолодость", slot: "day20" },
    "Алина Нейромолодость — наличкой": { name: "Алина Нейромолодость", slot: "cash" },
  };
  return map[name];
}

function applyOldIncomeAmounts(entry, oldAmounts) {
  const byEntry = oldAmounts[entry.name];
  if (!byEntry) return;
  Object.entries(byEntry).forEach(([month, values]) => {
    entry.amountsByMonth[month] = { ...(entry.amountsByMonth[month] || {}), ...values };
  });
}

function isPaidForMonth(entry) {
  return Array.isArray(entry.paidMonths) && entry.paidMonths.includes(selectedMonth);
}

function addPaidMonth(entry, month) {
  entry.paidMonths = Array.isArray(entry.paidMonths) ? entry.paidMonths : [];
  if (!entry.paidMonths.includes(month)) entry.paidMonths.push(month);
}

function togglePaidMonth(entry) {
  entry.paidMonths = Array.isArray(entry.paidMonths) ? entry.paidMonths : [];
  if (entry.paidMonths.includes(selectedMonth)) {
    entry.paidMonths = entry.paidMonths.filter((month) => month !== selectedMonth);
  } else {
    entry.paidMonths.push(selectedMonth);
  }
}

function debtBalanceForMonth(entry) {
  const monthsBefore = (entry.paidMonths || []).filter((month) => month >= START_MONTH && month < selectedMonth).length;
  return Math.max(0, Number(entry.balance || 0) - monthsBefore * Number(entry.amount || 0));
}

function dueLevel(entry) {
  if (isPaidForMonth(entry)) return "paid";
  const currentMonth = monthKey(new Date());
  const due = dueDateForEntry(entry);
  if (!due) return "none";
  if (selectedMonth < currentMonth) return "overdue";
  if (selectedMonth > currentMonth) return "none";

  const today = startOfToday();
  const days = Math.ceil((due.getTime() - today.getTime()) / 86400000);
  if (days < 0) return "overdue";
  if (days <= 2) return "red";
  if (days <= 5) return "orange";
  if (days <= 7) return "yellow";
  return "none";
}

function dueDateForEntry(entry) {
  const day = Number(entry.dueDay || new Date(`${entry.date}T00:00:00`).getDate());
  if (!day) return null;
  const [year, month] = selectedMonth.split("-").map(Number);
  const lastDay = new Date(year, month, 0).getDate();
  return new Date(year, month - 1, Math.min(day, lastDay));
}

function startOfToday() {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate());
}

function saveState() {
  saveStateObject(state);
  scheduleRemoteSave();
}

function saveStateObject(value) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(value));
}

function setSyncStatus(text, tone = "") {
  if (!els.syncStatus) return;
  els.syncStatus.textContent = text;
  els.syncStatus.dataset.tone = tone;
}

function loadRemoteState() {
  setSyncStatus("Загружаю данные из Google Таблицы...", "loading");
  const callbackName = `budgetSync_${Date.now()}_${Math.random().toString(36).slice(2)}`;
  const script = document.createElement("script");
  const cleanup = () => {
    delete window[callbackName];
    script.remove();
  };

  window[callbackName] = (response) => {
    cleanup();
    if (!response?.ok) {
      setSyncStatus("Не удалось загрузить Google Таблицу", "error");
      return;
    }
    if (response.data?.entries && Array.isArray(response.data.entries)) {
      const remoteState = migrateState(response.data);
      state.entries = remoteState.entries;
      saveStateObject(state);
      render();
      setSyncStatus("Данные загружены из Google Таблицы", "ok");
    } else {
      saveRemoteState();
      setSyncStatus("Google Таблица подключена", "ok");
    }
    hasLoadedRemoteState = true;
  };

  script.onerror = () => {
    cleanup();
    setSyncStatus("Google Таблица недоступна", "error");
  };
  script.src = `${GOOGLE_SCRIPT_URL}?token=${encodeURIComponent(GOOGLE_SCRIPT_TOKEN)}&callback=${encodeURIComponent(callbackName)}&t=${Date.now()}`;
  document.body.appendChild(script);
}

function scheduleRemoteSave() {
  if (!hasLoadedRemoteState) return;
  clearTimeout(syncTimer);
  setSyncStatus("Сохраняю в Google Таблицу...", "loading");
  syncTimer = setTimeout(saveRemoteState, 450);
}

function saveRemoteState() {
  const payload = {
    token: GOOGLE_SCRIPT_TOKEN,
    data: {
      entries: state.entries,
      savedAt: new Date().toISOString(),
    },
  };

  fetch(GOOGLE_SCRIPT_URL, {
    method: "POST",
    mode: "no-cors",
    headers: {
      "Content-Type": "text/plain;charset=utf-8",
    },
    body: JSON.stringify(payload),
  })
    .then(() => {
      hasLoadedRemoteState = true;
      setSyncStatus("Сохранено в Google Таблицу", "ok");
    })
    .catch(() => {
      setSyncStatus("Не удалось сохранить в Google Таблицу", "error");
    });
}

function money(value) {
  return RUB.format(Number(value || 0));
}

function isoDate(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(
    2,
    "0",
  )}`;
}

function monthKey(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

function formatDate(dateString) {
  return new Intl.DateTimeFormat("ru-RU", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  }).format(new Date(`${dateString}T00:00:00`));
}

function uid() {
  return Math.random().toString(36).slice(2, 10);
}

function escapeHtml(value) {
  return value.replace(/[&<>"']/g, (char) => {
    const map = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" };
    return map[char];
  });
}
