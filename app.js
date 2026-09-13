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
  { name: "Карта Тройка Крис", amount: 3460, dueDay: 26, owner: "kris", paid: true, order: 3 },
  { name: "Карта Тройка Алина", amount: 3460, dueDay: 26, owner: "alina", paid: true, order: 4 },
  { name: "Оплата моб. связи Крис", amount: 482, dueDay: 5, owner: "kris", order: 5 },
  { name: "Оплата моб. связи Алина", amount: 990, dueDay: 7, owner: "alina", order: 6 },
];

const incomeDefaults = [
  {
    name: "Крис",
    owner: "kris",
    order: 1,
    slots: [
      { key: "day14", label: "14 число" },
      { key: "day29", label: "29 число" },
    ],
  },
  {
    name: "Алина СМ",
    owner: "alina",
    order: 2,
    slots: [
      { key: "day11", label: "11 число" },
      { key: "day25", label: "25 число" },
    ],
  },
  {
    name: "Алина Нейромолодость",
    owner: "alina",
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
    owner: "kris",
    order: 1,
  },
  {
    name: "Кредит Крис (Альфа)",
    amount: 17200,
    dueDay: 5,
    balance: 318591.76,
    paid: true,
    owner: "kris",
    order: 2,
  },
  {
    name: "Кредит Алина (Тинькофф)",
    amount: 1000,
    dueDay: 19,
    balance: 7618.66,
    paid: false,
    owner: "alina",
    order: 3,
  },
  {
    name: "Кредит Алина (Сбер, кредитка)",
    amount: 5600,
    dueDay: 25,
    balance: 72395.63,
    paid: false,
    owner: "alina",
    order: 4,
  },
  {
    name: "Кредит Алина (Сбер, мама)",
    amount: 1600,
    dueDay: 6,
    balance: 20033.29,
    paid: true,
    owner: "alina",
    order: 5,
  },
];

const sections = {
  income: {
    title: "Доходы",
    hint: "Основные выплаты по датам и дополнительные поступления за выбранный месяц.",
    placeholder: "Например: премия или возврат",
  },
  summary: {
    title: "Сводка",
    hint: "Красивая картина месяца: деньги, траты, долги, сбережения и подсказка, что делать с остатком.",
    placeholder: "",
  },
  balance: {
    title: "Баланс",
    hint: "Баланс Крис и Алины за выбранный месяц: доходы минус личные платежи, долги, прочие траты и отложенные деньги.",
    placeholder: "",
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
  apartment: {
    title: "Отложить на квартиру",
    hint: "Деньги, которые вручную откладываются из основных доходов и лежат отдельно наличкой.",
    placeholder: "Например: отложили наличкой",
  },
  savings: {
    title: "Сбережения с прошлых месяцев",
    hint: "Деньги, которые уже были отложены раньше и переходят в текущий месяц.",
    placeholder: "Например: остаток с прошлого месяца",
  },
  transfer: {
    title: "Переводы",
    hint: "Внутренние переводы между Крис и Алиной.",
    placeholder: "",
  },
  savingsTransfer: {
    title: "Перенос в сбережения",
    hint: "Перенос денег с карты в сбережения.",
    placeholder: "",
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
  monthButton: document.querySelector("#monthButton"),
  summaryButton: document.querySelector("#summaryButton"),
  balanceButton: document.querySelector("#balanceButton"),
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
  entryOwnerField: document.querySelector("#entryOwnerField"),
  entryOwner: document.querySelector("#entryOwner"),
  entryComment: document.querySelector("#entryComment"),
  entryList: document.querySelector("#entryList"),
};

init();

function init() {
  els.entryDate.value = START_DATE;
  els.monthInput.value = selectedMonth;
  els.monthButton.textContent = displayMonth(selectedMonth);

  els.tabs.forEach((tab) => {
    tab.addEventListener("click", () => {
      activeSection = tab.dataset.section;
      render();
    });
  });
  els.summaryButton.addEventListener("click", () => {
    activeSection = "summary";
    render();
  });
  els.balanceButton.addEventListener("click", () => {
    activeSection = "balance";
    render();
  });
  els.monthButton.addEventListener("click", () => {
    if (typeof els.monthInput.showPicker === "function") {
      els.monthInput.showPicker();
    } else {
      els.monthInput.focus();
      els.monthInput.click();
    }
  });
  els.monthInput.addEventListener("change", () => {
    selectedMonth = normalizeMonth(els.monthInput.value);
    els.monthInput.value = selectedMonth;
    els.monthButton.textContent = displayMonth(selectedMonth);
    els.entryDate.value = `${selectedMonth}-01`;
    render();
  });

  els.entryForm.addEventListener("submit", (event) => {
    event.preventDefault();
    const amount = Number(els.entryAmount.value);
    if (!amount) return;
    const date = normalizeDate(els.entryDate.value, selectedMonth);
    els.entryDate.value = date;

    state.entries.push({
      id: uid(),
      section: activeSection,
      name: els.entryName.value.trim(),
      date,
      amount,
      owner: ownerForNewEntry(),
      comment: els.entryComment.value.trim(),
      paid: false,
    });

    saveState();
    els.entryName.value = "";
    els.entryAmount.value = "";
    els.entryComment.value = "";
    els.entryOwner.value = defaultOwnerForSection(activeSection);
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
  const total = ["summary", "balance"].includes(activeSection) ? currentBudget() : sectionTotal(activeSection, entries);

  els.monthInput.value = selectedMonth;
  els.monthButton.textContent = displayMonth(selectedMonth);
  els.tabs.forEach((tab) => {
    const isActive = tab.dataset.section === activeSection;
    tab.classList.toggle("active", isActive);
    tab.setAttribute("aria-current", isActive ? "page" : "false");
  });
  els.summaryButton.classList.toggle("active", activeSection === "summary");
  els.balanceButton.classList.toggle("active", activeSection === "balance");

  els.sectionTitle.textContent = section.title;
  els.sectionHint.textContent = section.hint;
  els.sectionTotal.textContent = money(total);
  els.entryName.placeholder = section.placeholder;
  els.entryOwnerField.hidden = !needsOwnerField(activeSection);
  els.entryOwner.value = defaultOwnerForSection(activeSection);
  els.currentBudget.textContent = money(currentBudget());
  els.entryForm.hidden = activeSection === "savings" || activeSection === "summary" || activeSection === "balance";

  els.entryList.innerHTML = renderActiveContent(entries);

  els.entryList.querySelectorAll("[data-delete]").forEach((button) => {
    button.addEventListener("click", () => {
      const entry = state.entries.find((item) => item.id === button.dataset.delete);
      if (!entry) return;
      if (["income", "other", "apartment", "transfer", "savingsTransfer"].includes(entry.section) && !confirm(`Удалить запись "${entry.name}"?`)) return;
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
  els.entryList.querySelectorAll("[data-move-savings]").forEach((button) => {
    button.addEventListener("click", () => {
      const kind = button.dataset.moveSavings;
      if (kind === "cash-to-account") moveCashToSavingsAccount();
      if (kind === "cash-to-card") moveCashToCard();
      if (kind === "card-to-account") moveCardToSavings("Накопительный счет");
      if (kind === "card-to-cash") moveCardToSavings("Наличкой");
    });
  });
  els.entryList.querySelectorAll("[data-transfer-person]").forEach((button) => {
    button.addEventListener("click", () => {
      transferBetweenPeople(button.dataset.transferPerson);
    });
  });
}

function renderActiveContent(entries) {
  if (activeSection === "summary") return renderSummary();
  if (activeSection === "balance") return renderBalance();
  if (activeSection === "savings") return renderSavings(entries);
  if (!entries.length) return `<div class="empty">Пока здесь нет записей.</div>`;
  if (["required", "debt"].includes(activeSection)) return renderSingleGroup(entries);
  return renderGroupedEntries(entries);
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
  const owner = entry.owner ? `<span class="status owner">${ownerLabel(entry.owner)}</span>` : "";
  const meta =
    entry.section === "debt"
      ? debtMeta(entry)
      : entry.section === "transfer"
        ? transferMeta(entry)
        : entry.section === "savingsTransfer"
          ? savingsTransferMeta(entry)
      : entry.section === "income" && entry.recurring
        ? incomeMeta(entry)
        : `${formatDate(entry.date)}${entry.comment ? ` · ${escapeHtml(entry.comment)}` : ""}`;
  const actions = entryActions(entry);
  const displayAmount = entry.amount;

  return `
    <article class="entry ${ownerClass(entry.owner)} ${alertClass} ${(activeSection === "required" || activeSection === "debt") && isPaidForMonth(entry) ? "is-paid" : ""}">
      <div>
        <div class="entry-heading">
          <h3>${escapeHtml(entry.name)}</h3>
          ${status}
          ${owner}
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

function renderGroupedEntries(entries) {
  return entryGroups(entries)
    .map(
      (group) => `
        <details class="date-group" open>
          <summary>
            <span>${group.label}</span>
            <strong>${money(group.total)}</strong>
          </summary>
          <div class="date-group-list">
            ${group.entries.map((entry) => renderEntry(entry)).join("")}
          </div>
        </details>
      `,
    )
    .join("");
}

function renderSingleGroup(entries) {
  const label = activeSection === "required" ? "Все обязательные расходы" : "Все долги";
  const total = entries.reduce((sum, entry) => {
    if (entry.section === "debt") return sum + debtBalanceForMonth(entry);
    return sum + Number(entry.amount || 0);
  }, 0);

  return `
    <details class="date-group" open>
      <summary>
        <span>${label}</span>
        <strong>${money(total)}</strong>
      </summary>
      <div class="date-group-list">
        ${entries.map((entry) => renderEntry(entry)).join("")}
      </div>
    </details>
  `;
}

function renderSavings(entries) {
  const history = monthlySavingsTransfers();
  const total = savingsBalanceTotal(entries);
  return `
    <div class="quick-actions">
      <button type="button" data-move-savings="cash-to-account">Наличные → счет</button>
      <button type="button" data-move-savings="cash-to-card">Наличные → карта</button>
      <button type="button" data-move-savings="card-to-account">Карта → счет</button>
      <button type="button" data-move-savings="card-to-cash">Карта → наличные</button>
    </div>
    <details class="date-group" open>
      <summary>
        <span>Все сбережения</span>
        <strong>${money(total)}</strong>
      </summary>
      <div class="date-group-list">
        ${entries.length ? entries.map((entry) => renderSavingsEntry(entry)).join("") : `<div class="empty">Пока здесь нет записей.</div>`}
      </div>
    </details>
    ${renderHistorySection("История операций", history)}
  `;
}

function renderSavingsEntry(entry) {
  return renderEntry({ ...entry, amount: savingsEntryDisplayAmount(entry) });
}

function entryGroups(entries) {
  const groups = new Map();
  entries.forEach((entry) => {
    const key = groupKey(entry);
    if (!groups.has(key.id)) groups.set(key.id, { ...key, total: 0, entries: [] });
    const group = groups.get(key.id);
    group.entries.push(entry);
    group.total += entry.recurring ? incomeEntryTotal(entry) : Number(entry.amount || 0);
  });
  return [...groups.values()].sort((a, b) => a.sort.localeCompare(b.sort));
}

function groupKey(entry) {
  if (entry.section === "income" && entry.recurring) {
    return { id: "income-main", label: "Основные доходы", sort: "0000-00-00" };
  }
  const date = entry.section === "required" || entry.section === "debt" ? dueDateString(entry) : entry.date;
  return { id: date, label: formatDate(date), sort: date };
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

function renderSummary() {
  const summary = monthSummary();
  const bars = [
    { label: "Доходы", value: summary.income, className: "income" },
    { label: "Обязательные", value: summary.requiredTotal, className: "required" },
    { label: "Долги", value: summary.debtPayments, className: "debt" },
    { label: "Прочие", value: summary.otherTotal, className: "other" },
    { label: "На квартиру", value: summary.apartmentTotal, className: "apartment" },
    { label: "Сбережения", value: summary.savingsTotal, className: "savings" },
  ];
  const maxValue = Math.max(...bars.map((bar) => bar.value), 1);

  return `
    <div class="summary-grid">
      <article class="summary-card summary-main">
        <p class="summary-label">Итог месяца</p>
        <strong>${money(summary.available)}</strong>
        <span>${summary.monthName}${selectedMonth === START_MONTH ? " · тестовый месяц" : ""}</span>
      </article>
      <article class="summary-card">
        <p class="summary-label">Доходы</p>
        <strong>${money(summary.income)}</strong>
        <span>внесено за месяц</span>
      </article>
      <article class="summary-card">
        <p class="summary-label">Прочие траты</p>
        <strong>${money(summary.otherTotal)}</strong>
        <span>${selectedMonth === START_MONTH ? "учет с 11.09.2026" : "за выбранный месяц"}</span>
      </article>
      <article class="summary-card">
        <p class="summary-label">Остаток долгов</p>
        <strong>${money(summary.debtBalance)}</strong>
        <span>с учетом прошлых месяцев</span>
      </article>
      <article class="summary-card">
        <p class="summary-label">На квартиру</p>
        <strong>${money(summary.apartmentTotal)}</strong>
        <span>отложено наличкой</span>
      </article>
    </div>

    <article class="summary-panel">
      <div>
        <p class="summary-label">Диаграмма</p>
        <h3>Что формирует бюджет</h3>
      </div>
      <div class="chart-bars">
        ${bars
          .map(
            (bar) => `
              <div class="chart-row">
                <span>${bar.label}</span>
                <div class="chart-track">
                  <i class="${bar.className}" style="width: ${Math.max(6, Math.round((bar.value / maxValue) * 100))}%"></i>
                </div>
                <strong>${money(bar.value)}</strong>
              </div>
            `,
          )
          .join("")}
      </div>
    </article>

    <article class="summary-panel">
      <div>
        <p class="summary-label">Совет месяца</p>
        <h3>${summary.advice.title}</h3>
      </div>
      <p>${summary.advice.text}</p>
      <div class="advice-split">
        ${summary.advice.steps.map((step) => `<span>${step}</span>`).join("")}
      </div>
    </article>

  `;
}

function renderBalance() {
  const balance = monthBalance();
  const history = monthlyTransfers();
  const maxValue = Math.max(
    balance.kris.income,
    balance.kris.deductions,
    Math.abs(balance.kris.balance),
    balance.alina.income,
    balance.alina.deductions,
    Math.abs(balance.alina.balance),
    1,
  );

  return `
    <div class="quick-actions">
      <button type="button" data-transfer-person="kris-to-alina">Крис → Алина</button>
      <button type="button" data-transfer-person="alina-to-kris">Алина → Крис</button>
    </div>
    <div class="balance-grid">
      ${renderPersonBalance("Крис", balance.kris, maxValue)}
      ${renderPersonBalance("Алина", balance.alina, maxValue)}
    </div>
    ${renderHistorySection("История переводов", history)}
  `;
}

function renderHistorySection(title, entries) {
  return `
    <article class="summary-panel history-panel">
      <div>
        <p class="summary-label">${title}</p>
        <h3>${entries.length ? "Операции по датам" : "Операций пока нет"}</h3>
      </div>
      ${entries.length ? renderGroupedEntries(entries) : `<div class="empty">Пока здесь нет записей.</div>`}
    </article>
  `;
}

function renderPersonBalance(name, data, maxValue) {
  const rows = [
    { label: "Доходы", value: data.income, className: "income" },
    { label: "Списания", value: data.deductions, className: "other" },
    { label: "Остаток", value: Math.abs(data.balance), className: data.balance >= 0 ? "savings" : "debt" },
  ];

  return `
    <article class="balance-card">
      <div class="balance-head">
        <div>
          <p class="summary-label">Баланс</p>
          <h3>${name}</h3>
        </div>
        <strong class="${data.balance < 0 ? "negative" : ""}">${money(data.balance)}</strong>
      </div>
      <div class="chart-bars compact">
        ${rows
          .map(
            (row) => `
              <div class="chart-row">
                <span>${row.label}</span>
                <div class="chart-track">
                  <i class="${row.className}" style="width: ${Math.max(6, Math.round((row.value / maxValue) * 100))}%"></i>
                </div>
                <strong>${money(row.value)}</strong>
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

  if (activeSection === "savings" && entry.section === "savings") {
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
    if (entry.section === "savings") return total + savingsEntryDisplayAmount(entry);
    if (entry.section === "savingsTransfer" && entry.date.startsWith(selectedMonth)) {
      if (entry.movement === "cash-to-card") return total + amount;
      if (entry.movement === "cash-to-account") return total;
      return total - amount;
    }
    if (entry.section === "income" && entry.recurring) return total + incomeEntryTotal(entry);
    if (entry.section === "income" && entry.date.startsWith(selectedMonth)) return total + amount;
    if (selectedMonth <= currentMonth && entry.section === "required" && !isPaidForMonth(entry)) return total - amount;
    if (selectedMonth <= currentMonth && entry.section === "debt" && !isPaidForMonth(entry)) return total - amount;
    if (entry.section === "other" && entry.date.startsWith(selectedMonth)) return total - amount;
    if (entry.section === "apartment" && entry.date.startsWith(selectedMonth)) return total - amount;
    return total;
  }, 0);
}

function visibleEntries(section) {
  return state.entries.filter((entry) => {
    if (section === "summary") return false;
    if (entry.section !== section) return false;
    if (section === "income") return entry.recurring || entry.date.startsWith(selectedMonth);
    if (section === "other") return entry.date.startsWith(selectedMonth);
    if (section === "apartment") return entry.date.startsWith(selectedMonth);
    return true;
  });
}

function sectionTotal(section, entries) {
  if (section === "debt") {
    return entries.reduce((sum, entry) => sum + debtBalanceForMonth(entry), 0);
  }
  if (section === "savings") {
    return savingsBalanceTotal(entries);
  }
  if (section === "income" || section === "savings" || section === "apartment") {
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
  saved.entries = saved.entries.filter((entry) => !isOldIncomeEntry(entry) && !isOldRequiredEntry(entry));
  incomeDefaults.forEach((item) => {
    const entry = saved.entries.find((savedEntry) => savedEntry.section === "income" && savedEntry.name === item.name);
    if (entry) {
      entry.owner = item.owner;
    } else {
      saved.entries.push(incomeEntry(item));
    }
  });
  requiredDefaults.forEach((item) => {
    const entry = findRequiredEntry(saved.entries, item.name);
    if (entry) {
      applyRequiredDefault(entry, item);
    } else {
      saved.entries.push(requiredEntry(item));
    }
  });
  debtDefaults.forEach((item) => {
    const entry = saved.entries.find((savedEntry) => savedEntry.section === "debt" && savedEntry.name === item.name);
    if (entry) {
      applyDebtDefault(entry, item);
    } else {
      saved.entries.push(debtEntry(item));
    }
  });
  saved.entries.forEach((entry) => {
    if (entry.section === "income" && entry.recurring) {
      entry.amountsByMonth = entry.amountsByMonth || {};
      entry.slots = incomeDefaults.find((item) => item.name === entry.name)?.slots || entry.slots || [];
      entry.order = incomeDefaults.find((item) => item.name === entry.name)?.order || entry.order || 100;
      entry.owner = incomeDefaults.find((item) => item.name === entry.name)?.owner || entry.owner || "";
      applyOldIncomeAmounts(entry, oldIncomeAmounts);
    }
    entry.paidMonths = Array.isArray(entry.paidMonths) ? entry.paidMonths : [];
    if (entry.section === "required" && ["Квартира", "Коммуналка", "Карта Тройка"].includes(entry.name)) {
      addPaidMonth(entry, START_MONTH);
    }
    if (entry.section === "debt" && ["Кредит Крис (Металл)", "Кредит Крис (Альфа)"].includes(entry.name)) {
      addPaidMonth(entry, START_MONTH);
    }
    if (entry.section === "debt" && itemPaidInStartMonth(entry.name)) {
      addPaidMonth(entry, START_MONTH);
    }
    if (entry.section === "required" && ["Карта Тройка Крис", "Карта Тройка Алина"].includes(entry.name)) {
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
    ...requiredDefaults.map((item) => requiredEntry(item)),
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
    owner: item.owner || "",
    order: item.order,
    paidMonths: [],
  };
}

function requiredEntry(item) {
  const date =
    item.dueDay === undefined || item.dueDay === "" ? START_DATE : `2026-09-${String(item.dueDay).padStart(2, "0")}`;
  return {
    id: uid(),
    section: "required",
    name: item.name,
    date,
    amount: item.amount,
    comment: "Обязательный расход",
    paid: Boolean(item.paid),
    paidMonths: item.paid ? [START_MONTH] : [],
    dueDay: item.dueDay || "",
    owner: item.owner || "",
    order: item.order || 100,
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
    owner: item.owner || "",
    order: item.order,
  };
}

function findRequiredEntry(entries, name) {
  const aliases = {
    "Оплата моб. связи Алина": ["Оплата моб. связи Алина", "Оплата моб. связи Алины", "Оплата моб.связи Алина"],
  };
  const names = aliases[name] || [name];
  return entries.find((entry) => entry.section === "required" && names.includes(entry.name));
}

function applyRequiredDefault(entry, item) {
  entry.name = item.name;
  entry.amount = item.amount;
  entry.dueDay = item.dueDay || "";
  entry.date =
    item.dueDay === undefined || item.dueDay === "" ? START_DATE : `2026-09-${String(item.dueDay).padStart(2, "0")}`;
  entry.order = item.order || entry.order || 100;
  entry.owner = item.owner || "";
  entry.comment = entry.comment || "Обязательный расход";
  entry.paidMonths = Array.isArray(entry.paidMonths) ? entry.paidMonths : [];

  if (item.paid === true) addPaidMonth(entry, START_MONTH);
}

function applyDebtDefault(entry, item) {
  entry.amount = item.amount;
  entry.dueDay = item.dueDay;
  entry.balance = item.balance;
  entry.date = item.dueDay === "" ? START_DATE : `2026-09-${String(item.dueDay).padStart(2, "0")}`;
  entry.order = item.order || entry.order || 100;
  entry.owner = item.owner || "";
  entry.comment = entry.comment || "Ежемесячный платеж";
  entry.paidMonths = Array.isArray(entry.paidMonths) ? entry.paidMonths : [];

  if (item.paid === true) {
    addPaidMonth(entry, START_MONTH);
  }
  if (item.paid === false) {
    entry.paidMonths = entry.paidMonths.filter((month) => month !== START_MONTH);
  }
}

function itemPaidInStartMonth(name) {
  return debtDefaults.some((item) => item.name === name && item.paid === true);
}

function debtMeta(entry) {
  const day = entry.dueDay ? `${entry.dueDay} число` : "число позже";
  const payment = Number(entry.amount || 0) ? `платеж ${money(entry.amount)}` : "платеж позже";
  const balance = Number(entry.balance || 0) ? `остаток ${money(debtBalanceForMonth(entry))}` : "остаток позже";
  return `${day} · ${payment} · ${balance}`;
}

function transferMeta(entry) {
  return `${formatDate(entry.date)} · ${ownerLabel(entry.owner)} → ${ownerLabel(entry.toOwner)}`;
}

function savingsTransferMeta(entry) {
  const movement = entry.movement || "card-to-savings";
  const labels = {
    "cash-to-account": "Наличные → накопительный счет",
    "cash-to-card": "Наличные → карта",
    "card-to-account": "Карта → накопительный счет",
    "card-to-cash": "Карта → наличные",
    "card-to-savings": `Карта → ${entry.target || "сбережения"}`,
  };
  const owner = ["kris", "alina"].includes(entry.owner) ? ` · ${ownerLabel(entry.owner)}` : "";
  return `${formatDate(entry.date)} · ${labels[movement] || entry.comment || "Перенос"}${owner}`;
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

function needsOwnerField(section) {
  return ["income", "required", "debt", "other", "apartment"].includes(section);
}

function defaultOwnerForSection(section) {
  return section === "income" ? "kris" : "common";
}

function ownerForNewEntry() {
  return needsOwnerField(activeSection) ? els.entryOwner.value : "";
}

function ownerLabel(owner) {
  const labels = { kris: "Крис", alina: "Алина", common: "Общее" };
  return labels[owner] || "";
}

function ownerClass(owner) {
  if (owner === "kris") return "owner-kris";
  if (owner === "alina") return "owner-alina";
  if (owner === "common") return "owner-common";
  return "";
}

function monthBalance() {
  const result = {
    kris: { income: 0, deductions: 0, balance: 0 },
    alina: { income: 0, deductions: 0, balance: 0 },
  };

  state.entries.forEach((entry) => {
    const owner = entry.owner;
    if (!["kris", "alina"].includes(owner)) return;

    if (entry.section === "income") {
      const value = entry.recurring
        ? incomeEntryTotal(entry)
        : entry.date.startsWith(selectedMonth)
          ? Number(entry.amount || 0)
          : 0;
      result[owner].income += value;
      result[owner].balance += value;
      return;
    }

    if (entry.section === "transfer" && entry.date.startsWith(selectedMonth)) {
      const value = Number(entry.amount || 0);
      result[owner].deductions += value;
      result[owner].balance -= value;
      if (["kris", "alina"].includes(entry.toOwner)) {
        result[entry.toOwner].income += value;
        result[entry.toOwner].balance += value;
      }
      return;
    }

    if (entry.section === "savingsTransfer" && entry.date.startsWith(selectedMonth)) {
      const value = Number(entry.amount || 0);
      if (entry.movement === "cash-to-account") return;
      if (entry.movement === "cash-to-card") {
        result[owner].income += value;
        result[owner].balance += value;
      } else {
        result[owner].deductions += value;
        result[owner].balance -= value;
      }
      return;
    }

    const shouldDeduct =
      (entry.section === "other" || entry.section === "apartment") && entry.date.startsWith(selectedMonth);
    if (!shouldDeduct) return;

    const value = Number(entry.amount || 0);
    result[owner].deductions += value;
    result[owner].balance -= value;
  });

  return result;
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

function isOldRequiredEntry(entry) {
  return (
    entry.section === "required" &&
    ["Карта Тройка", "Карта тройка", "Оплата моб. связи Алины"].includes(entry.name)
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

function monthSummary() {
  const current = currentBudget();
  const balance = monthBalance();
  const incomeEntries = state.entries.filter((entry) => entry.section === "income");
  const requiredEntries = state.entries.filter((entry) => entry.section === "required");
  const debtEntries = state.entries.filter((entry) => entry.section === "debt");
  const otherEntries = state.entries.filter((entry) => {
    if (entry.section !== "other" || !entry.date.startsWith(selectedMonth)) return false;
    return selectedMonth !== START_MONTH || entry.date >= "2026-09-11";
  });
  const apartmentEntries = state.entries.filter((entry) => entry.section === "apartment" && entry.date.startsWith(selectedMonth));
  const savingsEntries = state.entries.filter((entry) => entry.section === "savings");

  const income = incomeEntries.reduce((sum, entry) => {
    if (entry.recurring) return sum + incomeEntryTotal(entry);
    return entry.date.startsWith(selectedMonth) ? sum + Number(entry.amount || 0) : sum;
  }, 0);
  const requiredTotal = requiredEntries.reduce((sum, entry) => sum + Number(entry.amount || 0), 0);
  const requiredUnpaid = requiredEntries
    .filter((entry) => !isPaidForMonth(entry))
    .reduce((sum, entry) => sum + Number(entry.amount || 0), 0);
  const debtPayments = debtEntries.reduce((sum, entry) => sum + Number(entry.amount || 0), 0);
  const debtUnpaid = debtEntries
    .filter((entry) => !isPaidForMonth(entry))
    .reduce((sum, entry) => sum + Number(entry.amount || 0), 0);
  const debtBalance = debtEntries.reduce((sum, entry) => sum + debtBalanceForMonth(entry), 0);
  const otherTotal = otherEntries.reduce((sum, entry) => sum + Number(entry.amount || 0), 0);
  const apartmentTotal = apartmentEntries.reduce((sum, entry) => sum + Number(entry.amount || 0), 0);
  const savingsTotal = savingsBalanceTotal(savingsEntries);
  const cashEntry = savingsEntries.find((entry) => entry.name.toLowerCase().includes("налич"));
  const savingsAccountEntry = savingsEntries.find((entry) => entry.name.toLowerCase().includes("накоп"));
  const cash = cashEntry ? savingsEntryDisplayAmount(cashEntry) : 0;
  const savingsAccount = savingsAccountEntry ? savingsEntryDisplayAmount(savingsAccountEntry) : 0;
  const advice = buildAdvice({
    available: current,
    requiredUnpaid,
    debtUnpaid,
    debtBalance,
    requiredTotal,
    debtPayments,
    cash,
    savingsAccount,
  });

  return {
    income,
    requiredTotal,
    debtPayments,
    debtBalance,
    otherTotal,
    apartmentTotal,
    savingsTotal,
    balance,
    available: current,
    monthName: displayMonth(selectedMonth),
    advice,
  };
}

function buildAdvice(summary) {
  const mandatoryUnpaid = summary.requiredUnpaid + summary.debtUnpaid;
  const monthlyBase = summary.requiredTotal + summary.debtPayments;
  const cushionTarget = Math.max(monthlyBase, 100000);

  if (summary.available <= 0) {
    return {
      title: "Сначала закрыть обязательное",
      text: "Свободного остатка пока нет, поэтому лучше не перекладывать деньги в сбережения и не делать досрочные платежи. Главная задача месяца - не уйти в минус и спокойно собрать фактические траты.",
      steps: ["Не трогать запас", "Внести все траты", "Проверить долги"],
    };
  }

  if (mandatoryUnpaid > 0) {
    return {
      title: "Сначала оставить деньги на платежи",
      text: `До конца месяца еще есть неоплаченные обязательные платежи на ${money(mandatoryUnpaid)}. Эту сумму лучше держать доступной, а решения по сбережениям и досрочным платежам принимать только после оплаты.`,
      steps: ["Резерв на платежи", "Остаток - после оплат", "Кредиты - без спешки"],
    };
  }

  if (selectedMonth === START_MONTH) {
    return {
      title: "Сентябрь лучше использовать как тест",
      text: "Так как прочие траты начинаем учитывать с 11 сентября, в этом месяце лучше не делать резких выводов. Хорошая схема: часть оставить наличкой как быстрый запас, часть положить на накопительный счет, а досрочное закрытие кредитов планировать после полной картины расходов.",
      steps: ["40% на счет", "40% наличкой", "20% на кредиты позже"],
    };
  }

  if (summary.cash < cushionTarget * 0.4) {
    return {
      title: "Усилить наличный запас",
      text: "Наличкой пока меньше комфортного быстрого резерва. Можно часть остатка оставить наличными, а остальное отправить на накопительный счет. Кредиты лучше ускорять после того, как запас станет спокойнее.",
      steps: ["50% наличкой", "40% на счет", "10% на кредиты"],
    };
  }

  if (summary.savingsAccount < cushionTarget) {
    return {
      title: "Увеличить накопительный счет",
      text: "Быстрый запас уже есть, поэтому следующий сильный шаг - держать больше денег на накопительном счете. Досрочно закрывать кредиты стоит после сравнения ставок.",
      steps: ["60% на счет", "20% наличкой", "20% на кредиты"],
    };
  }

  return {
    title: "Можно думать о досрочном погашении",
    text: "Запас выглядит спокойнее. Если по кредитам высокая ставка, часть свободных денег можно направлять на досрочное погашение, а остальное продолжать держать на накопительном счете.",
    steps: ["50% на кредиты", "40% на счет", "10% наличкой"],
  };
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

function moveCashToSavingsAccount() {
  const cash = findSavingsEntry("Наличкой");
  const account = findSavingsEntry("Накопительный счет");
  if (!cash || !account) return;
  const value = prompt("Сколько перенести из наличных на накопительный счет?");
  const amount = Number((value || "").replace(",", "."));
  if (!amount) return;
  if (amount > savingsEntryDisplayAmount(cash)) {
    alert("В наличных меньше этой суммы.");
    return;
  }
  state.entries.push({
    id: uid(),
    section: "savingsTransfer",
    name: "Наличные → накопительный счет",
    date: operationDate(),
    amount,
    owner: "common",
    movement: "cash-to-account",
    target: "Накопительный счет",
    comment: "Перенос между сбережениями",
    paidMonths: [],
  });
  saveState();
  render();
}

function moveCashToCard() {
  const cash = findSavingsEntry("Наличкой");
  if (!cash) return;
  const value = prompt("Сколько перенести из наличных на карту?");
  const amount = Number((value || "").replace(",", "."));
  if (!amount) return;
  if (amount > savingsEntryDisplayAmount(cash)) {
    alert("В наличных меньше этой суммы.");
    return;
  }
  const ownerAnswer = prompt("На чью карту? Напиши: Крис или Алина");
  const owner = normalizeOwner(ownerAnswer);
  if (!owner) return;
  state.entries.push({
    id: uid(),
    section: "savingsTransfer",
    name: "Наличные → карта",
    date: operationDate(),
    amount,
    owner,
    movement: "cash-to-card",
    target: "Карта",
    comment: "Перенос из сбережений на карту",
    paidMonths: [],
  });
  saveState();
  render();
}

function moveCardToSavings(targetName) {
  const target = findSavingsEntry(targetName);
  if (!target) return;
  const value = prompt(`Сколько перенести с карты в "${targetName}"?`);
  const amount = Number((value || "").replace(",", "."));
  if (!amount) return;
  const ownerAnswer = prompt("Кто откладывает? Напиши: Крис или Алина");
  const owner = normalizeOwner(ownerAnswer);
  if (!owner) return;
  state.entries.push({
    id: uid(),
    section: "savingsTransfer",
    name: `Перенос с карты в ${targetName}`,
    date: operationDate(),
    amount,
    owner,
    movement: targetName === "Наличкой" ? "card-to-cash" : "card-to-account",
    target: targetName,
    comment: "Быстрый перенос в сбережения",
    paidMonths: [],
  });
  saveState();
  render();
}

function transferBetweenPeople(direction) {
  const transfers = {
    "kris-to-alina": {
      name: "Перевод Крис → Алина",
      owner: "kris",
      toOwner: "alina",
    },
    "alina-to-kris": {
      name: "Перевод Алина → Крис",
      owner: "alina",
      toOwner: "kris",
    },
  };
  const transfer = transfers[direction];
  if (!transfer) return;
  const value = prompt("Сколько перевести?");
  const amount = Number((value || "").replace(",", "."));
  if (!amount) return;
  state.entries.push({
    id: uid(),
    section: "transfer",
    name: transfer.name,
    date: operationDate(),
    amount,
    owner: transfer.owner,
    toOwner: transfer.toOwner,
    comment: "Внутренний перевод",
    paidMonths: [],
  });
  saveState();
  render();
}

function findSavingsEntry(name) {
  return state.entries.find((entry) => entry.section === "savings" && entry.name === name);
}

function monthlyTransfers() {
  return state.entries.filter((entry) => entry.section === "transfer" && entry.date.startsWith(selectedMonth));
}

function monthlySavingsTransfers() {
  return state.entries.filter((entry) => entry.section === "savingsTransfer" && entry.date.startsWith(selectedMonth));
}

function savingsBalanceTotal(entries = state.entries.filter((entry) => entry.section === "savings")) {
  return entries.reduce((sum, entry) => sum + savingsEntryDisplayAmount(entry), 0);
}

function savingsEntryDisplayAmount(entry) {
  return Math.max(0, Number(entry.amount || 0) + savingsEntryAdjustment(entry.name));
}

function savingsEntryAdjustment(name) {
  return monthlySavingsTransfers().reduce((sum, entry) => {
    const amount = Number(entry.amount || 0);
    const movement = entry.movement || "card-to-savings";

    if (name === "Наличкой") {
      if (movement === "cash-to-card" || movement === "cash-to-account") return sum - amount;
      if (movement === "card-to-cash") return sum + amount;
    }

    if (name === "Накопительный счет") {
      if (movement === "cash-to-account" || movement === "card-to-account") return sum + amount;
      if (movement === "card-to-savings" && entry.target === "Накопительный счет") return sum + amount;
    }

    return sum;
  }, 0);
}

function operationDate() {
  const today = new Date();
  const todayMonth = monthKey(today);
  return todayMonth === selectedMonth ? isoDate(today) : `${selectedMonth}-01`;
}

function normalizeOwner(value) {
  const text = String(value || "").trim().toLowerCase();
  if (text.includes("крис")) return "kris";
  if (text.includes("алин")) return "alina";
  alert("Нужно написать: Крис или Алина.");
  return "";
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
  const data = syncPayload();
  const payload = {
    token: GOOGLE_SCRIPT_TOKEN,
    data,
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

function syncPayload() {
  const savedAt = new Date().toISOString();
  return {
    entries: state.entries,
    selectedMonth,
    summary: monthSummary(),
    savedAt,
  };
}

function sheetTables(savedAt) {
  const summary = monthSummary();
  const incomeRows = [];
  state.entries
    .filter((entry) => entry.section === "income")
    .forEach((entry) => {
      if (entry.recurring) {
        (entry.slots || []).forEach((slot) => {
          incomeRows.push([
            selectedMonth,
            entry.name,
            ownerLabel(entry.owner),
            slot.label,
            monthlyAmount(entry, slot.key),
            savedAt,
          ]);
        });
      } else if (entry.date.startsWith(selectedMonth)) {
        incomeRows.push([selectedMonth, entry.name, ownerLabel(entry.owner), formatDate(entry.date), Number(entry.amount || 0), savedAt]);
      }
    });

  const requiredRows = state.entries
    .filter((entry) => entry.section === "required")
    .map((entry) => [
      selectedMonth,
      entry.name,
      ownerLabel(entry.owner),
      Number(entry.amount || 0),
      isPaidForMonth(entry) ? "Оплачено" : "Не оплачено",
      formatDate(dueDateString(entry)),
      savedAt,
    ]);

  const debtRows = state.entries
    .filter((entry) => entry.section === "debt")
    .map((entry) => [
      selectedMonth,
      entry.name,
      ownerLabel(entry.owner),
      entry.dueDay || "",
      Number(entry.amount || 0),
      debtBalanceForMonth(entry),
      isPaidForMonth(entry) ? "Оплачено" : "Не оплачено",
      savedAt,
    ]);

  const otherRows = state.entries
    .filter((entry) => entry.section === "other" && entry.date.startsWith(selectedMonth))
    .map((entry) => [selectedMonth, formatDate(entry.date), entry.name, ownerLabel(entry.owner), Number(entry.amount || 0), entry.comment || "", savedAt]);

  const apartmentRows = state.entries
    .filter((entry) => entry.section === "apartment" && entry.date.startsWith(selectedMonth))
    .map((entry) => [selectedMonth, formatDate(entry.date), entry.name, ownerLabel(entry.owner), Number(entry.amount || 0), entry.comment || "", savedAt]);

  const savingsRows = state.entries
    .filter((entry) => entry.section === "savings")
    .map((entry) => [entry.name, Number(entry.amount || 0), entry.comment || "", savedAt]);

  const allRows = state.entries.flatMap((entry) => {
    if (entry.section === "income" && entry.recurring) {
      return (entry.slots || []).map((slot) => [
        selectedMonth,
        "Доходы",
        slot.label,
        entry.name,
        ownerLabel(entry.owner),
        monthlyAmount(entry, slot.key),
        "Основной доход",
        savedAt,
      ]);
    }

    const amount = entry.section === "debt" ? debtBalanceForMonth(entry) : Number(entry.amount || 0);
    const date =
      entry.section === "required" || entry.section === "debt"
        ? formatDate(dueDateString(entry))
        : formatDate(entry.date);
    const status =
      entry.section === "required" || entry.section === "debt"
        ? isPaidForMonth(entry)
          ? "Оплачено"
          : "Не оплачено"
        : entry.comment || "";

    return [[selectedMonth, sections[entry.section]?.title || entry.section, date, entry.name, ownerLabel(entry.owner), amount, status, savedAt]];
  });

  const summaryRows = [
    [selectedMonth, "Месяц", summary.monthName, savedAt],
    [selectedMonth, "Бюджет на данный момент", summary.available, savedAt],
    [selectedMonth, "Доходы", summary.income, savedAt],
    [selectedMonth, "Обязательные расходы", summary.requiredTotal, savedAt],
    [selectedMonth, "Долги, платежи", summary.debtPayments, savedAt],
    [selectedMonth, "Остаток долгов", summary.debtBalance, savedAt],
    [selectedMonth, "Прочие траты", summary.otherTotal, savedAt],
    [selectedMonth, "Отложить на квартиру", summary.apartmentTotal, savedAt],
    [selectedMonth, "Сбережения", summary.savingsTotal, savedAt],
    [selectedMonth, "Совет", `${summary.advice.title}. ${summary.advice.text}`, savedAt],
  ];
  const balance = monthBalance();
  const balanceRows = [
    [selectedMonth, "Крис", balance.kris.income, balance.kris.deductions, balance.kris.balance, savedAt],
    [selectedMonth, "Алина", balance.alina.income, balance.alina.deductions, balance.alina.balance, savedAt],
  ];

  return {
    "Доходы": [["Месяц", "Источник", "Кто", "Дата/часть", "Сумма", "Обновлено"], ...incomeRows],
    "Обязательные расходы": [["Месяц", "Название", "Кто", "Сумма", "Статус", "Дата", "Обновлено"], ...requiredRows],
    "Долги": [["Месяц", "Название", "Кто", "Число платежа", "Платеж", "Остаток", "Статус", "Обновлено"], ...debtRows],
    "Прочие траты": [["Месяц", "Дата", "Название", "Кто", "Сумма", "Комментарий", "Обновлено"], ...otherRows],
    "Отложить на квартиру": [["Месяц", "Дата", "Название", "Кто", "Сумма", "Комментарий", "Обновлено"], ...apartmentRows],
    "Баланс": [["Месяц", "Кто", "Доходы", "Списания", "Остаток", "Обновлено"], ...balanceRows],
    "Сбережения": [["Название", "Сумма", "Комментарий", "Обновлено"], ...savingsRows],
    "Все операции": [["Месяц", "Раздел", "Дата", "Название", "Кто", "Сумма", "Статус/комментарий", "Обновлено"], ...allRows],
    "Сводка": [["Месяц", "Показатель", "Значение", "Обновлено"], ...summaryRows],
  };
}

function dueDateString(entry) {
  const due = dueDateForEntry(entry);
  if (!due) return `${selectedMonth}-01`;
  return isoDate(due);
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

function normalizeMonth(value) {
  const raw = String(value || "").trim();
  const iso = raw.match(/^(\d{4})-(\d{1,2})$/);
  if (iso) return `${iso[1]}-${String(Number(iso[2])).padStart(2, "0")}`;

  const ru = raw.match(/^(\d{1,2})[./-](\d{4})$/);
  if (ru) return `${ru[2]}-${String(Number(ru[1])).padStart(2, "0")}`;

  const namedMonth = parseNamedMonth(raw);
  if (namedMonth) return namedMonth;

  return START_MONTH;
}

function normalizeDate(value, fallbackMonth = selectedMonth) {
  const raw = String(value || "").trim();
  const iso = raw.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  if (iso) return `${iso[1]}-${String(Number(iso[2])).padStart(2, "0")}-${String(Number(iso[3])).padStart(2, "0")}`;

  const ru = raw.match(/^(\d{1,2})[./-](\d{1,2})[./-](\d{4})$/);
  if (ru) return `${ru[3]}-${String(Number(ru[2])).padStart(2, "0")}-${String(Number(ru[1])).padStart(2, "0")}`;

  return `${normalizeMonth(fallbackMonth)}-01`;
}

function displayMonth(monthString) {
  const [year, month] = normalizeMonth(monthString).split("-").map(Number);
  return new Intl.DateTimeFormat("ru-RU", {
    month: "long",
    year: "numeric",
  }).format(new Date(year, month - 1, 1));
}

function displayDate(dateString) {
  const isoDate = normalizeDate(dateString);
  const [year, month, day] = isoDate.split("-");
  return `${day}.${month}.${year}`;
}

function parseNamedMonth(value) {
  const raw = value.toLowerCase().replace(/\s+/g, " ").replace("г.", "").trim();
  const match = raw.match(/^([а-яё]+)\s+(\d{4})$/i);
  if (!match) return "";

  const months = [
    "январь",
    "февраль",
    "март",
    "апрель",
    "май",
    "июнь",
    "июль",
    "август",
    "сентябрь",
    "октябрь",
    "ноябрь",
    "декабрь",
  ];
  const monthIndex = months.findIndex((month) => month === match[1]);
  if (monthIndex === -1) return "";

  return `${match[2]}-${String(monthIndex + 1).padStart(2, "0")}`;
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
