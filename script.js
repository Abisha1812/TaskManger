// =============================================================================
// TASK DATA MODEL
// =============================================================================
const TaskModel = (() => {
  let tasks = [];
  let observers = [];

  // Private methods
  const notifyObservers = () => {
    observers.forEach((callback) => callback(tasks));
  };

  const generateId = () =>
    Date.now().toString() + Math.random().toString(36).substr(2, 9);

  // Public API
  return {
    // Observer pattern for state changes
    subscribe(callback) {
      observers.push(callback);
    },

    // Get all tasks
    getAllTasks() {
      return [...tasks];
    },

    // Get filtered tasks
    getFilteredTasks(filter) {
      switch (filter) {
        case "completed":
          return tasks.filter((task) => task.completed);
        case "pending":
          return tasks.filter((task) => !task.completed);
        default:
          return [...tasks];
      }
    },

    // Add new task
    addTask(taskData) {
      const newTask = {
        id: generateId(),
        text: taskData.text.trim(),
        completed: false,
        createdAt: new Date().toISOString(),
        dueDate: taskData.dueDate || null,
        priority: taskData.priority || "medium",
      };

      if (!newTask.text) {
        throw new Error("Task text cannot be empty");
      }

      tasks.unshift(newTask);
      this.saveTasks();
      notifyObservers();
      return newTask;
    },

    // Toggle task completion
    toggleTask(taskId) {
      const task = tasks.find((t) => t.id === taskId);
      if (task) {
        task.completed = !task.completed;
        task.completedAt = task.completed ? new Date().toISOString() : null;
        this.saveTasks();
        notifyObservers();
      }
    },

    // Delete task
    deleteTask(taskId) {
      const initialLength = tasks.length;
      tasks = tasks.filter((t) => t.id !== taskId);

      if (tasks.length !== initialLength) {
        this.saveTasks();
        notifyObservers();
        return true;
      }
      return false;
    },

    // Reorder tasks (for drag and drop)
    reorderTasks(draggedTaskId, targetTaskId) {
      const draggedIndex = tasks.findIndex((t) => t.id === draggedTaskId);
      const targetIndex = tasks.findIndex((t) => t.id === targetTaskId);

      if (draggedIndex === -1 || targetIndex === -1) return false;

      const [draggedTask] = tasks.splice(draggedIndex, 1);
      tasks.splice(targetIndex, 0, draggedTask);

      this.saveTasks();
      notifyObservers();
      return true;
    },

    // Get task statistics
    getStats() {
      const total = tasks.length;
      const completed = tasks.filter((t) => t.completed).length;
      const pending = total - completed;

      return { total, completed, pending };
    },

    // Persistence methods
    saveTasks() {
      try {
        localStorage.setItem("tasks", JSON.stringify(tasks));
      } catch (error) {
        console.warn("Could not save tasks to localStorage:", error);
      }
    },

    loadTasks() {
      try {
        const saved = localStorage.getItem("tasks");
        if (saved) {
          tasks = JSON.parse(saved);
          notifyObservers();
        }
      } catch (error) {
        console.warn("Could not load tasks from localStorage:", error);
        tasks = [];
      }
    },
  };
})();

// =============================================================================
// THEME MANAGER MODULE
// =============================================================================
const ThemeManager = (() => {
  let currentTheme = "light";
  const themeToggleBtn = () => document.getElementById("themeToggle");

  // Private methods
  const applyTheme = (theme) => {
    document.documentElement.setAttribute("data-theme", theme);
    const toggleBtn = themeToggleBtn();
    if (toggleBtn) {
      toggleBtn.textContent = theme === "dark" ? "☀️" : "🌙";
    }
    currentTheme = theme;
  };

  const getSystemPreference = () => {
    return window.matchMedia("(prefers-color-scheme: dark)").matches
      ? "dark"
      : "light";
  };

  // Public API
  return {
    init() {
      try {
        const savedTheme = localStorage.getItem("theme");
        const preferredTheme = savedTheme || getSystemPreference();
        applyTheme(preferredTheme);
      } catch (error) {
        console.warn("Could not load theme preference:", error);
        applyTheme(getSystemPreference());
      }
    },

    toggle() {
      const newTheme = currentTheme === "dark" ? "light" : "dark";
      applyTheme(newTheme);

      try {
        localStorage.setItem("theme", newTheme);
      } catch (error) {
        console.warn("Could not save theme preference:", error);
      }
    },

    getCurrentTheme() {
      return currentTheme;
    },
  };
})();

// =============================================================================
// DOM UTILITIES MODULE
// =============================================================================
const DOMUtils = (() => {
  return {
    // Safe element selection
    getElementById(id) {
      const element = document.getElementById(id);
      if (!element) {
        console.warn(`Element with id '${id}' not found`);
      }
      return element;
    },

    // Safe query selector
    querySelector(selector) {
      return document.querySelector(selector);
    },

    querySelectorAll(selector) {
      return document.querySelectorAll(selector);
    },

    // Create element with attributes
    createElement(tag, attributes = {}, textContent = "") {
      const element = document.createElement(tag);

      Object.entries(attributes).forEach(([key, value]) => {
        if (key === "className") {
          element.className = value;
        } else {
          element.setAttribute(key, value);
        }
      });

      if (textContent) {
        element.textContent = textContent;
      }

      return element;
    },

    // HTML escaping for security
    escapeHtml(text) {
      const div = document.createElement("div");
      div.textContent = text;
      return div.innerHTML;
    },

    // Date formatting utility
    formatDate(dateString) {
      const date = new Date(dateString);
      return date.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      });
    },
  };
})();

// =============================================================================
// TASK RENDERER MODULE
// =============================================================================
const TaskRenderer = (() => {
  // Private methods
  const createTaskHTML = (task) => {
    const dueDate = task.dueDate ? new Date(task.dueDate) : null;
    const isOverdue = dueDate && dueDate < new Date() && !task.completed;

    return `
            <input
                type="checkbox"
                class="task-checkbox"
                ${task.completed ? "checked" : ""}
                aria-label="Mark task as ${
                  task.completed ? "incomplete" : "complete"
                }"
            >
            <div class="task-content">
                <div class="task-text">${DOMUtils.escapeHtml(task.text)}</div>
                <div class="task-meta">
                    ${
                      task.dueDate
                        ? `
                        <div class="task-date ${
                          isOverdue ? "text-red-500" : ""
                        }">
                            📅 ${DOMUtils.formatDate(task.dueDate)}
                            ${isOverdue ? " (Overdue)" : ""}
                        </div>
                    `
                        : ""
                    }
                    <div class="priority-badge priority-${task.priority}">
                        ${task.priority}
                    </div>
                </div>
            </div>
            <button
                class="delete-btn"
                aria-label="Delete task"
                tabindex="0"
            >
                🗑️
            </button>
        `;
  };

  const createTaskElement = (task) => {
    const taskElement = DOMUtils.createElement("div", {
      className: `task-item ${task.completed ? "completed" : ""}`,
      "data-task-id": task.id,
      draggable: "true",
    });

    taskElement.innerHTML = createTaskHTML(task);
    return taskElement;
  };

  // Public API
  return {
    renderTasks(tasks, container) {
      if (!container) return;

      // Clear existing tasks
      const existingTasks = container.querySelectorAll(".task-item");
      existingTasks.forEach((task) => task.remove());

      // Show empty state if no tasks
      const emptyState = DOMUtils.getElementById("emptyState");
      if (tasks.length === 0) {
        if (emptyState) emptyState.style.display = "block";
        return;
      }

      if (emptyState) emptyState.style.display = "none";

      // Create and append task elements
      tasks.forEach((task) => {
        const taskElement = createTaskElement(task);
        container.appendChild(taskElement);
      });
    },

    updateStats(stats) {
      const totalElement = DOMUtils.getElementById("totalTasks");
      const completedElement = DOMUtils.getElementById("completedTasks");
      const pendingElement = DOMUtils.getElementById("pendingTasks");

      if (totalElement) totalElement.textContent = stats.total;
      if (completedElement) completedElement.textContent = stats.completed;
      if (pendingElement) pendingElement.textContent = stats.pending;
    },
  };
})();

// =============================================================================
// EVENT HANDLERS MODULE
// =============================================================================
const EventHandlers = (() => {
  let currentFilter = "all";
  let draggedTaskId = null;

  // Private methods
  const getTaskInputValues = () => {
    const taskInput = DOMUtils.getElementById("taskInput");
    const dueDateInput = DOMUtils.getElementById("dueDateInput");
    const prioritySelect = DOMUtils.getElementById("prioritySelect");

    return {
      text: taskInput ? taskInput.value : "",
      dueDate: dueDateInput ? dueDateInput.value : "",
      priority: prioritySelect ? prioritySelect.value : "medium",
    };
  };

  const clearTaskInputs = () => {
    const taskInput = DOMUtils.getElementById("taskInput");
    const dueDateInput = DOMUtils.getElementById("dueDateInput");
    const prioritySelect = DOMUtils.getElementById("prioritySelect");

    if (taskInput) {
      taskInput.value = "";
      taskInput.focus();
    }
    if (dueDateInput) dueDateInput.value = "";
    if (prioritySelect) prioritySelect.value = "medium";
  };

  const updateFilterButtons = (activeFilter) => {
    DOMUtils.querySelectorAll(".filter-btn").forEach((btn) => {
      btn.classList.toggle("active", btn.dataset.filter === activeFilter);
    });
  };

  // Public API
  return {
    // Task management handlers
    handleAddTask() {
      try {
        const taskData = getTaskInputValues();
        TaskModel.addTask(taskData);
        clearTaskInputs();
      } catch (error) {
        console.error("Error adding task:", error);
        const taskInput = DOMUtils.getElementById("taskInput");
        if (taskInput) taskInput.focus();
      }
    },

    handleToggleTask(taskId) {
      TaskModel.toggleTask(taskId);
    },

    handleDeleteTask(taskId) {
      const taskElement = DOMUtils.querySelector(`[data-task-id="${taskId}"]`);
      if (taskElement) {
        taskElement.classList.add("removing");
        setTimeout(() => {
          TaskModel.deleteTask(taskId);
        }, 300);
      }
    },

    // Filter handlers
    handleFilterChange(filter) {
      currentFilter = filter;
      updateFilterButtons(filter);
      this.renderCurrentView();
    },

    getCurrentFilter() {
      return currentFilter;
    },

    // Drag and drop handlers
    handleDragStart(e, taskId) {
      draggedTaskId = taskId;
      e.target.classList.add("dragging");
      e.dataTransfer.effectAllowed = "move";
    },

    handleDragOver(e) {
      e.preventDefault();
      e.dataTransfer.dropEffect = "move";
      e.currentTarget.classList.add("drag-over");
    },

    handleDrop(e, targetTaskId) {
      e.preventDefault();
      e.currentTarget.classList.remove("drag-over");

      if (draggedTaskId && draggedTaskId !== targetTaskId) {
        TaskModel.reorderTasks(draggedTaskId, targetTaskId);
      }
    },

    handleDragEnd() {
      DOMUtils.querySelectorAll(".task-item").forEach((item) => {
        item.classList.remove("dragging", "drag-over");
      });
      draggedTaskId = null;
    },

    // View rendering
    renderCurrentView() {
      const tasks = TaskModel.getFilteredTasks(currentFilter);
      const taskList = DOMUtils.getElementById("taskList");
      TaskRenderer.renderTasks(tasks, taskList);

      // Re-bind events after rendering
      this.bindTaskEvents();
    },

    // Event binding
    bindTaskEvents() {
      // Bind events to task items
      DOMUtils.querySelectorAll(".task-item").forEach((taskItem) => {
        const taskId = taskItem.dataset.taskId;
        if (!taskId) return;

        // Checkbox events
        const checkbox = taskItem.querySelector(".task-checkbox");
        if (checkbox) {
          checkbox.addEventListener("change", () =>
            this.handleToggleTask(taskId)
          );
        }

        // Delete button events
        const deleteBtn = taskItem.querySelector(".delete-btn");
        if (deleteBtn) {
          deleteBtn.addEventListener("click", () =>
            this.handleDeleteTask(taskId)
          );
        }

        // Drag and drop events
        taskItem.addEventListener("dragstart", (e) =>
          this.handleDragStart(e, taskId)
        );
        taskItem.addEventListener("dragover", (e) => this.handleDragOver(e));
        taskItem.addEventListener("drop", (e) => this.handleDrop(e, taskId));
        taskItem.addEventListener("dragend", () => this.handleDragEnd());
      });
    },
  };
})();

// =============================================================================
// APPLICATION CONTROLLER
// =============================================================================
const App = (() => {
  // Private initialization methods
  const bindGlobalEvents = () => {
    // Add task button
    const addTaskBtn = DOMUtils.getElementById("addTaskBtn");
    if (addTaskBtn) {
      addTaskBtn.addEventListener("click", EventHandlers.handleAddTask);
    }

    // Task input enter key
    const taskInput = DOMUtils.getElementById("taskInput");
    if (taskInput) {
      taskInput.addEventListener("keypress", (e) => {
        if (e.key === "Enter") EventHandlers.handleAddTask();
      });
    }

    // Filter buttons
    DOMUtils.querySelectorAll(".filter-btn").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        EventHandlers.handleFilterChange(e.target.dataset.filter);
      });
    });

    // Theme toggle
    const themeToggle = DOMUtils.getElementById("themeToggle");
    if (themeToggle) {
      themeToggle.addEventListener("click", ThemeManager.toggle);
    }

    // Keyboard shortcuts
    document.addEventListener("keydown", (e) => {
      if (e.ctrlKey && e.key === "Enter") {
        EventHandlers.handleAddTask();
      }
    });
  };

  const onTasksChange = (tasks) => {
    // Update view when tasks change
    EventHandlers.renderCurrentView();

    // Update statistics
    const stats = TaskModel.getStats();
    TaskRenderer.updateStats(stats);
  };

  // Public API
  return {
    init() {
      // Initialize theme
      ThemeManager.init();

      // Load saved tasks
      TaskModel.loadTasks();

      // Subscribe to task changes
      TaskModel.subscribe(onTasksChange);

      // Bind global events
      bindGlobalEvents();

      // Initial render
      EventHandlers.renderCurrentView();

      // Update initial stats
      const stats = TaskModel.getStats();
      TaskRenderer.updateStats(stats);

      console.log("Task Manager initialized successfully");
    },
  };
})();

// =============================================================================
// APPLICATION STARTUP
// =============================================================================
document.addEventListener("DOMContentLoaded", () => {
  App.init();
});
