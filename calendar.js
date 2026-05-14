const state = {
  currentUser: null,
  currentMonth: startOfMonth(new Date()),
  tasks: []
};

const themeToggle = document.getElementById("themeToggle");
const logoutButton = document.getElementById("logoutButton");
const memberNav = document.getElementById("memberNav");
const userChip = document.getElementById("userChip");
const userNameLabel = document.getElementById("userNameLabel");
const calendarHeading = document.getElementById("calendarHeading");
const calendarSubhead = document.getElementById("calendarSubhead");
const monthLabel = document.getElementById("monthLabel");
const calendarGrid = document.getElementById("calendarGrid");
const agendaList = document.getElementById("agendaList");
const prevMonthButton = document.getElementById("prevMonth");
const nextMonthButton = document.getElementById("nextMonth");
const todayButton = document.getElementById("todayButton");

initialize();

function initialize() {
  TaskFlow.applySavedTheme();
  TaskFlow.fillQuoteSlots();
  updateThemeToggle();

  themeToggle.addEventListener("click", handleThemeToggle);
  logoutButton.addEventListener("click", handleLogout);
  prevMonthButton.addEventListener("click", () => changeMonth(-1));
  nextMonthButton.addEventListener("click", () => changeMonth(1));
  todayButton.addEventListener("click", () => {
    state.currentMonth = startOfMonth(new Date());
    renderCalendarPage();
  });

  if (!syncSession()) {
    return;
  }

  renderCalendarPage();
}

function syncSession() {
  state.currentUser = TaskFlow.getCurrentUser();

  if (!state.currentUser) {
    window.location.replace("index.html");
    return false;
  }

  state.tasks = sortedTasks(TaskFlow.getTasksForCurrentUser());
  memberNav.hidden = false;
  userChip.hidden = false;
  logoutButton.hidden = false;
  userNameLabel.textContent = state.currentUser.username;
  calendarHeading.textContent = "MaxTask";
  calendarSubhead.textContent = "Your go-to for getting stuff done.";
  return true;
}

function handleThemeToggle() {
  TaskFlow.toggleTheme();
  updateThemeToggle();
}

function updateThemeToggle() {
  themeToggle.textContent = TaskFlow.getTheme() === "dark" ? "Light mode" : "Dark mode";
}

function handleLogout() {
  TaskFlow.logoutUser();
  window.location.replace("index.html");
}

function changeMonth(offset) {
  state.currentMonth = new Date(
    state.currentMonth.getFullYear(),
    state.currentMonth.getMonth() + offset,
    1
  );
  renderCalendarPage();
}

function renderCalendarPage() {
  monthLabel.textContent = new Intl.DateTimeFormat("en-US", {
    month: "long",
    year: "numeric"
  }).format(state.currentMonth);

  renderCalendarGrid();
  renderAgenda();
}

function renderCalendarGrid() {
  const monthStart = startOfMonth(state.currentMonth);
  const calendarStart = new Date(monthStart);
  calendarStart.setDate(monthStart.getDate() - monthStart.getDay());
  const tasksByDate = groupTasksByDate(state.tasks);

  calendarGrid.innerHTML = "";

  for (let index = 0; index < 42; index += 1) {
    const cellDate = new Date(calendarStart);
    cellDate.setDate(calendarStart.getDate() + index);

    const cellKey = TaskFlow.toDateInputValue(cellDate);
    const dayTasks = tasksByDate[cellKey] || [];
    const isOutsideMonth = cellDate.getMonth() !== state.currentMonth.getMonth();
    const isToday = cellKey === TaskFlow.todayString();
    const cell = document.createElement("article");

    cell.className = `calendar-cell${isOutsideMonth ? " is-outside" : ""}${isToday ? " is-today" : ""}`;
    cell.innerHTML = `
      <div class="calendar-date">${cellDate.getDate()}</div>
      <div class="calendar-task-list">
        ${buildCalendarTaskMarkup(dayTasks)}
      </div>
    `;

    calendarGrid.append(cell);
  }
}

function buildCalendarTaskMarkup(tasks) {
  if (tasks.length === 0) {
    return "";
  }

  const visibleTasks = tasks.slice(0, 3).map((task) => {
    return `<div class="calendar-task ${task.lane}">${TaskFlow.escapeHtml(task.title)}</div>`;
  }).join("");

  if (tasks.length <= 3) {
    return visibleTasks;
  }

  return `${visibleTasks}<p class="calendar-more">+${tasks.length - 3} more</p>`;
}

function renderAgenda() {
  const today = TaskFlow.parseLocalDate(TaskFlow.todayString());
  const orderedTasks = sortedTasks(state.tasks);
  const futureTasks = orderedTasks.filter((task) => TaskFlow.parseLocalDate(task.deadline) >= today);
  const upcomingTasks = (futureTasks.length > 0 ? futureTasks : orderedTasks).slice(0, 8);

  if (upcomingTasks.length === 0) {
    agendaList.innerHTML = '<p class="agenda-empty">No assignments saved yet.</p>';
    return;
  }

  agendaList.innerHTML = upcomingTasks.map((task) => {
    const daysLeft = TaskFlow.dateDifferenceInDays(TaskFlow.parseLocalDate(task.deadline), new Date());
    const laneLabel = task.lane === "urgent" ? "Urgent" : "Main";

    return `
      <article class="agenda-item">
        <p class="agenda-item-title">${TaskFlow.escapeHtml(task.title)}</p>
        <p class="agenda-item-meta">
          ${laneLabel} &middot; ${TaskFlow.formatDate(task.deadline)} &middot; ${TaskFlow.deadlineStatus(daysLeft)}
        </p>
      </article>
    `;
  }).join("");
}

function groupTasksByDate(tasks) {
  return tasks.reduce((grouped, task) => {
    if (!grouped[task.deadline]) {
      grouped[task.deadline] = [];
    }

    grouped[task.deadline].push(task);
    return grouped;
  }, {});
}

function sortedTasks(tasks) {
  return [...tasks].sort((a, b) => {
    const deadlineDifference = TaskFlow.parseLocalDate(a.deadline) - TaskFlow.parseLocalDate(b.deadline);

    if (deadlineDifference !== 0) {
      return deadlineDifference;
    }

    return a.createdAt - b.createdAt;
  });
}

function startOfMonth(date) {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}
