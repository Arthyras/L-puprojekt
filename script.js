const state = {
  currentUser: null,
  tasks: []
};

const authShell = document.getElementById("authShell");
const appShell = document.getElementById("appShell");
const loginForm = document.getElementById("loginForm");
const registerForm = document.getElementById("registerForm");
const loginMessage = document.getElementById("loginMessage");
const registerMessage = document.getElementById("registerMessage");
const themeToggle = document.getElementById("themeToggle");
const logoutButton = document.getElementById("logoutButton");
const memberNav = document.getElementById("memberNav");
const userChip = document.getElementById("userChip");
const userNameLabel = document.getElementById("userNameLabel");
const welcomeTitle = document.getElementById("welcomeTitle");
const plannerHeading = document.getElementById("plannerHeading");
const taskForm = document.getElementById("taskForm");
const titleInput = document.getElementById("taskTitle");
const deadlineInput = document.getElementById("taskDeadline");
const laneInput = document.getElementById("taskLane");
const mainList = document.getElementById("mainList");
const urgentList = document.getElementById("urgentList");
const mainCount = document.getElementById("mainCount");
const urgentCount = document.getElementById("urgentCount");
const emptyStateTemplate = document.getElementById("emptyStateTemplate");
const dropZones = document.querySelectorAll(".task-list[data-lane]");

let draggedTaskId = null;

initialize();

function initialize() {
  TaskFlow.applySavedTheme();
  TaskFlow.fillQuoteSlots();
  updateThemeToggle();
  deadlineInput.min = TaskFlow.todayString();

  themeToggle.addEventListener("click", handleThemeToggle);
  logoutButton.addEventListener("click", handleLogout);
  loginForm.addEventListener("submit", handleLoginSubmit);
  registerForm.addEventListener("submit", handleRegisterSubmit);
  taskForm.addEventListener("submit", handleTaskSubmit);

  setupDropZones();
  syncSessionView();
}

function syncSessionView() {
  state.currentUser = TaskFlow.getCurrentUser();

  if (!state.currentUser) {
    state.tasks = [];
    renderTasks();
    showAuthView();
    return;
  }

  showAppView();
  loadTasks();
}

function showAuthView() {
  authShell.hidden = false;
  appShell.hidden = true;
  memberNav.hidden = true;
  userChip.hidden = true;
  logoutButton.hidden = true;
  userNameLabel.textContent = "Guest";
  plannerHeading.textContent = "Your planner";
  welcomeTitle.textContent = "MaxTask";
}

function showAppView() {
  authShell.hidden = true;
  appShell.hidden = false;
  memberNav.hidden = false;
  userChip.hidden = false;
  logoutButton.hidden = false;
  userNameLabel.textContent = state.currentUser.username;
  plannerHeading.textContent = `${state.currentUser.username}'s planner`;
  welcomeTitle.textContent = "MaxTask";
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
  loginForm.reset();
  registerForm.reset();
  clearMessage(registerMessage);
  showMessage(loginMessage, "Logged out. See you soon.", "success");
  syncSessionView();
}

function handleLoginSubmit(event) {
  event.preventDefault();

  const formData = new FormData(loginForm);
  const username = String(formData.get("loginUsername") || "");
  const password = String(formData.get("loginPassword") || "");
  const result = TaskFlow.loginUser(username, password);

  if (!result.ok) {
    showMessage(loginMessage, result.error, "error");
    return;
  }

  loginForm.reset();
  clearMessage(loginMessage);
  clearMessage(registerMessage);
  syncSessionView();
}

function handleRegisterSubmit(event) {
  event.preventDefault();

  const formData = new FormData(registerForm);
  const username = String(formData.get("registerUsername") || "");
  const password = String(formData.get("registerPassword") || "");
  const result = TaskFlow.registerUser(username, password);

  if (!result.ok) {
    showMessage(registerMessage, result.error, "error");
    return;
  }

  registerForm.reset();
  clearMessage(registerMessage);
  clearMessage(loginMessage);
  syncSessionView();
}

function showMessage(element, text, tone) {
  element.textContent = text;
  element.className = `status-message ${tone}`;
}

function clearMessage(element) {
  element.textContent = "";
  element.className = "status-message";
}

function loadTasks() {
  state.tasks = TaskFlow.getTasksForCurrentUser();
  renderTasks();
}

function persistTasks() {
  TaskFlow.saveTasksForCurrentUser(state.tasks);
}

function handleTaskSubmit(event) {
  event.preventDefault();

  const title = titleInput.value.trim();
  const deadline = deadlineInput.value;
  const lane = laneInput.value;

  if (!title || !deadline || !state.currentUser) {
    return;
  }

  state.tasks.unshift({
    id: TaskFlow.randomId(),
    title,
    deadline,
    lane,
    createdAt: Date.now()
  });

  persistTasks();
  taskForm.reset();
  laneInput.value = "main";
  deadlineInput.min = TaskFlow.todayString();
  renderTasks();
}

function renderTasks() {
  const mainTasks = sortedTasks(state.tasks.filter((task) => task.lane !== "urgent"));
  const urgentTasks = sortedTasks(state.tasks.filter((task) => task.lane === "urgent"));

  renderList(mainList, mainTasks, "main");
  renderList(urgentList, urgentTasks, "urgent");
  mainCount.textContent = String(mainTasks.length);
  urgentCount.textContent = String(urgentTasks.length);
}

function renderList(container, tasks, lane) {
  container.innerHTML = "";

  if (tasks.length === 0) {
    const emptyState = emptyStateTemplate.content.cloneNode(true);
    const message = emptyState.querySelector("p");
    message.textContent = lane === "urgent"
      ? "Drop urgent assignments here."
      : "Add assignments to start planning.";
    container.append(emptyState);
    return;
  }

  tasks.forEach((task) => {
    container.append(buildTaskCard(task));
  });
}

function buildTaskCard(task) {
  const article = document.createElement("article");
  article.className = `task-card${task.lane === "urgent" ? " urgent" : ""}`;
  article.draggable = true;
  article.dataset.taskId = task.id;

  const deadlineDate = TaskFlow.parseLocalDate(task.deadline);
  const daysLeft = TaskFlow.dateDifferenceInDays(deadlineDate, new Date());
  const laneLabel = task.lane === "urgent" ? "Urgent" : "Main";

  article.innerHTML = `
    <div class="task-topline">
      <div class="task-title">${TaskFlow.escapeHtml(task.title)}</div>
      <span class="lane-pill ${task.lane}">${laneLabel}</span>
    </div>
    <div class="task-meta">
      <span>Deadline: ${TaskFlow.formatDate(task.deadline)}</span>
      <span>${TaskFlow.deadlineStatus(daysLeft)}</span>
    </div>
    <div class="task-actions">
      <button class="mini-button alert" type="button" data-action="toggle-lane">${task.lane === "urgent" ? "Move to Main" : "Move to Urgent"}</button>
      <button class="mini-button remove" type="button" data-action="remove">Delete</button>
    </div>
  `;

  article.addEventListener("dragstart", (event) => {
    draggedTaskId = task.id;
    article.classList.add("is-dragging");
    event.dataTransfer.effectAllowed = "move";
    event.dataTransfer.setData("text/plain", task.id);
  });

  article.addEventListener("dragend", () => {
    draggedTaskId = null;
    article.classList.remove("is-dragging");
    dropZones.forEach((zone) => zone.classList.remove("is-drop-target"));
  });

  article.querySelector('[data-action="toggle-lane"]').addEventListener("click", () => {
    updateTask(task.id, (currentTask) => ({
      ...currentTask,
      lane: currentTask.lane === "urgent" ? "main" : "urgent"
    }));
  });

  article.querySelector('[data-action="remove"]').addEventListener("click", () => {
    state.tasks = state.tasks.filter((currentTask) => currentTask.id !== task.id);
    persistTasks();
    renderTasks();
  });

  return article;
}

function setupDropZones() {
  dropZones.forEach((zone) => {
    zone.addEventListener("dragover", (event) => {
      event.preventDefault();
      zone.classList.add("is-drop-target");
      event.dataTransfer.dropEffect = "move";
    });

    zone.addEventListener("dragleave", (event) => {
      if (!zone.contains(event.relatedTarget)) {
        zone.classList.remove("is-drop-target");
      }
    });

    zone.addEventListener("drop", (event) => {
      event.preventDefault();
      zone.classList.remove("is-drop-target");

      const taskId = draggedTaskId || event.dataTransfer.getData("text/plain");
      const destinationLane = zone.dataset.lane;

      if (!taskId) {
        return;
      }

      updateTask(taskId, (currentTask) => ({
        ...currentTask,
        lane: destinationLane
      }));
    });
  });
}

function updateTask(taskId, updater) {
  state.tasks = state.tasks.map((task) => {
    if (task.id !== taskId) {
      return task;
    }

    return updater(task);
  });

  persistTasks();
  renderTasks();
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
