(function () {
  const KEYS = {
    users: "taskflow-users",
    session: "taskflow-session",
    tasks: "taskflow-tasks-by-user",
    theme: "taskflow-theme"
  };

  const QUOTES = [
    "Small steps still move mountains.",
    "Finish the next thing, not everything.",
    "Progress beats perfection.",
    "One task at a time wins.",
    "Deadlines guide focus.",
    "Start now, breathe easier later.",
    "Consistency makes pressure smaller.",
    "Today counts more than someday.",
    "Done is a beautiful feeling.",
    "Urgency can sharpen purpose.",
    "Your future self loves finished work.",
    "Quiet effort builds strong results."
  ];

  function readJson(key, fallback) {
    try {
      const value = localStorage.getItem(key);
      return value ? JSON.parse(value) : fallback;
    } catch (error) {
      return fallback;
    }
  }

  function writeJson(key, value) {
    localStorage.setItem(key, JSON.stringify(value));
  }

  function normalizeUsername(username) {
    return String(username || "").trim().toLowerCase();
  }

  function randomId() {
    if (window.crypto && typeof window.crypto.randomUUID === "function") {
      return window.crypto.randomUUID();
    }

    return `task-${Date.now()}-${Math.random().toString(16).slice(2)}`;
  }

  function getUsers() {
    return readJson(KEYS.users, []);
  }

  function saveUsers(users) {
    writeJson(KEYS.users, users);
  }

  function findUser(username) {
    const normalizedUsername = normalizeUsername(username);

    if (!normalizedUsername) {
      return null;
    }

    return getUsers().find((user) => user.normalizedUsername === normalizedUsername) || null;
  }

  function setSession(user) {
    writeJson(KEYS.session, {
      normalizedUsername: user.normalizedUsername
    });
  }

  function registerUser(username, password) {
    const trimmedUsername = String(username || "").trim();
    const trimmedPassword = String(password || "").trim();
    const normalizedUsername = normalizeUsername(trimmedUsername);

    if (trimmedUsername.length < 3) {
      return {
        ok: false,
        error: "Usernames need at least 3 characters."
      };
    }

    if (trimmedPassword.length < 4) {
      return {
        ok: false,
        error: "Passwords need at least 4 characters."
      };
    }

    if (findUser(trimmedUsername)) {
      return {
        ok: false,
        error: "That username already exists."
      };
    }

    const users = getUsers();
    const user = {
      username: trimmedUsername,
      normalizedUsername,
      password: trimmedPassword
    };

    users.push(user);
    saveUsers(users);
    setSession(user);

    return {
      ok: true,
      user
    };
  }

  function loginUser(username, password) {
    const user = findUser(username);

    if (!user) {
      return {
        ok: false,
        error: "Username not found."
      };
    }

    if (user.password !== String(password || "").trim()) {
      return {
        ok: false,
        error: "Password does not match."
      };
    }

    setSession(user);

    return {
      ok: true,
      user
    };
  }

  function getCurrentUser() {
    const session = readJson(KEYS.session, null);

    if (!session || !session.normalizedUsername) {
      return null;
    }

    const currentUser = getUsers().find((user) => user.normalizedUsername === session.normalizedUsername);
    return currentUser ? { ...currentUser } : null;
  }

  function logoutUser() {
    localStorage.removeItem(KEYS.session);
  }

  function getAllTasks() {
    return readJson(KEYS.tasks, {});
  }

  function saveAllTasks(tasksByUser) {
    writeJson(KEYS.tasks, tasksByUser);
  }

  function isValidDateString(value) {
    return /^\d{4}-\d{2}-\d{2}$/.test(String(value || ""));
  }

  function parseLocalDate(dateString) {
    const [year, month, day] = String(dateString).split("-").map(Number);
    return new Date(year, month - 1, day);
  }

  function toDateInputValue(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  }

  function todayString() {
    return toDateInputValue(new Date());
  }

  function sanitizeTask(task) {
    return {
      id: task && task.id ? task.id : randomId(),
      title: task && typeof task.title === "string" && task.title.trim() ? task.title.trim() : "Untitled assignment",
      deadline: task && isValidDateString(task.deadline) ? task.deadline : todayString(),
      lane: task && task.lane === "urgent" ? "urgent" : "main",
      createdAt: task && Number(task.createdAt) ? Number(task.createdAt) : Date.now()
    };
  }

  function getTasksForUser(username) {
    const normalizedUsername = normalizeUsername(username);
    const tasksByUser = getAllTasks();
    const savedTasks = Array.isArray(tasksByUser[normalizedUsername]) ? tasksByUser[normalizedUsername] : [];
    return savedTasks.map(sanitizeTask);
  }

  function saveTasksForUser(username, tasks) {
    const normalizedUsername = normalizeUsername(username);
    const tasksByUser = getAllTasks();
    tasksByUser[normalizedUsername] = tasks.map(sanitizeTask);
    saveAllTasks(tasksByUser);
  }

  function getTasksForCurrentUser() {
    const currentUser = getCurrentUser();
    return currentUser ? getTasksForUser(currentUser.username) : [];
  }

  function saveTasksForCurrentUser(tasks) {
    const currentUser = getCurrentUser();

    if (!currentUser) {
      return;
    }

    saveTasksForUser(currentUser.username, tasks);
  }

  function offsetDate(days) {
    const date = new Date();
    date.setDate(date.getDate() + days);
    return toDateInputValue(date);
  }

  function formatDate(dateString) {
    return new Intl.DateTimeFormat("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric"
    }).format(parseLocalDate(dateString));
  }

  function dateDifferenceInDays(targetDate, currentDate) {
    const target = new Date(targetDate.toDateString());
    const current = new Date(currentDate.toDateString());
    const diffInMs = target - current;
    return Math.round(diffInMs / 86400000);
  }

  function deadlineStatus(daysLeft) {
    if (daysLeft < 0) {
      return `Overdue by ${Math.abs(daysLeft)} day${Math.abs(daysLeft) === 1 ? "" : "s"}`;
    }

    if (daysLeft === 0) {
      return "Due today";
    }

    if (daysLeft === 1) {
      return "Due tomorrow";
    }

    return `${daysLeft} days left`;
  }

  function escapeHtml(value) {
    const div = document.createElement("div");
    div.textContent = value;
    return div.innerHTML;
  }

  function getTheme() {
    return localStorage.getItem(KEYS.theme) === "dark" ? "dark" : "light";
  }

  function setTheme(theme) {
    const nextTheme = theme === "dark" ? "dark" : "light";
    document.documentElement.dataset.theme = nextTheme;
    localStorage.setItem(KEYS.theme, nextTheme);
    return nextTheme;
  }

  function applySavedTheme() {
    return setTheme(getTheme());
  }

  function toggleTheme() {
    return setTheme(getTheme() === "dark" ? "light" : "dark");
  }

  function shuffle(items) {
    const copy = [...items];

    for (let index = copy.length - 1; index > 0; index -= 1) {
      const randomIndex = Math.floor(Math.random() * (index + 1));
      [copy[index], copy[randomIndex]] = [copy[randomIndex], copy[index]];
    }

    return copy;
  }

  function fillQuoteSlots(root = document) {
    const slots = [...root.querySelectorAll("[data-quote-slot]")];

    if (slots.length === 0) {
      return;
    }

    const quotePool = shuffle(QUOTES);

    slots.forEach((slot, index) => {
      slot.textContent = quotePool[index % quotePool.length];
    });
  }

  window.TaskFlow = {
    applySavedTheme,
    dateDifferenceInDays,
    deadlineStatus,
    escapeHtml,
    fillQuoteSlots,
    formatDate,
    getCurrentUser,
    getTasksForCurrentUser,
    getTasksForUser,
    getTheme,
    loginUser,
    logoutUser,
    offsetDate,
    parseLocalDate,
    randomId,
    registerUser,
    saveTasksForCurrentUser,
    saveTasksForUser,
    setTheme,
    todayString,
    toDateInputValue,
    toggleTheme
  };
}());
