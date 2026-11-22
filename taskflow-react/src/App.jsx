
import { useEffect, useState } from "react";
import {
  getTasks,
  createTask,
  updateTask,
  deleteTask,
  breakdownTask,
} from "./api";
import "./index.css";

function App() {
  const [tasks, setTasks] = useState([]);
  const [title, setTitle] = useState("");
  const [priority, setPriority] = useState("Medium");
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("All");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [page, setPage] = useState("Dashboard");

  const [aiTask, setAiTask] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState("");
  const [suggestions, setSuggestions] = useState([]);
  const [selected, setSelected] = useState([]);

  async function loadTasks() {
    try {
      const data = await getTasks();
      setTasks(Array.isArray(data) ? data : []);
    } catch (err) {
      setError("Could not load tasks. Check your backend and database.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadTasks();
  }, []);

  async function handleAddTask(e) {
    e.preventDefault();

    if (!title.trim()) {
      setError("Please enter a task title.");
      return;
    }

    setSaving(true);
    setError("");

    try {
      const newTask = await createTask({
        title: title.trim(),
        priority,
      });

      if (newTask && newTask.id != null) {
        setTasks([...tasks, newTask]);
      } else {
        await loadTasks();
      }

      setTitle("");
      setPriority("Medium");
    } catch (err) {
      setError("Could not save task.");
    } finally {
      setSaving(false);
    }
  }

  async function handleToggle(task) {
    const updatedTask = {
      title: task.title,
      priority: task.priority,
      completed: !task.completed,
    };

    try {
      const result = await updateTask(task.id, updatedTask);

      setTasks(
        tasks.map((item) =>
          item.id === task.id
            ? result || { ...item, ...updatedTask }
            : item
        )
      );
    } catch (err) {
      setError("Could not update task.");
    }
  }

  async function handleEdit(task) {
    const newTitle = prompt("Enter new task title:", task.title);

    if (!newTitle || !newTitle.trim()) return;

    const updatedTask = {
      title: newTitle.trim(),
      priority: task.priority,
      completed: task.completed,
    };

    try {
      const result = await updateTask(task.id, updatedTask);

      setTasks(
        tasks.map((item) =>
          item.id === task.id
            ? result || { ...item, ...updatedTask }
            : item
        )
      );
    } catch (err) {
      setError("Could not edit task.");
    }
  }

  async function handleDelete(id) {
    if (!confirm("Are you sure you want to delete this task?")) {
      return;
    }

    try {
      await deleteTask(id);
      setTasks(tasks.filter((task) => task.id !== id));
    } catch (err) {
      setError("Could not delete task.");
    }
  }

  async function handleAIBreakdown(e) {
    e.preventDefault();

    if (!aiTask.trim()) {
      setAiError("Please enter a task.");
      return;
    }

    setAiLoading(true);
    setAiError("");
    setSuggestions([]);
    setSelected([]);

    try {
      const data = await breakdownTask(aiTask.trim());

      const result = data.subtasks
        .split("\n")
        .map((item) =>
          item.replace(/^\s*(?:[-*•]|\d+[.)])\s*/, "").trim()
        )
        .filter((item) => item);

      setSuggestions(result);
      setSelected(result.map((item, index) => index));
    } catch (err) {
      setAiError("AI could not generate tasks. Check whether Ollama is running.");
    } finally {
      setAiLoading(false);
    }
  }

  function handleSelect(index) {
    if (selected.includes(index)) {
      setSelected(selected.filter((item) => item !== index));
    } else {
      setSelected([...selected, index]);
    }
  }

  async function handleSaveSuggestions() {
    const selectedTasks = suggestions.filter((item, index) =>
      selected.includes(index)
    );

    if (selectedTasks.length === 0) {
      setAiError("Please select at least one task.");
      return;
    }

    setSaving(true);
    setAiError("");

    try {
      const savedTasks = await Promise.all(
        selectedTasks.map((item) =>
          createTask({
            title: item,
            priority: "Medium",
          })
        )
      );

      if (savedTasks.some((item) => !item || item.id == null)) {
        await loadTasks();
      } else {
        setTasks([...tasks, ...savedTasks]);
      }

      setSuggestions([]);
      setSelected([]);
      setAiTask("");
    } catch (err) {
      setAiError("Could not save the AI tasks.");
      await loadTasks();
    } finally {
      setSaving(false);
    }
  }

  const completed = tasks.filter((task) => task.completed).length;
  const pending = tasks.length - completed;

  const visibleTasks = tasks.filter((task) => {
    const matchesSearch = task.title
      .toLowerCase()
      .includes(search.toLowerCase());

    const matchesFilter =
      filter === "All" ||
      (filter === "Pending" && !task.completed) ||
      (filter === "Completed" && task.completed);

    return matchesSearch && matchesFilter;
  });

  function showTask(task) {
    return (
      <div className="task-card" key={task.id}>
        <div className="task-info">
          <button
            className={`check-button ${task.completed ? "checked" : ""}`}
            onClick={() => handleToggle(task)}
          >
            {task.completed ? "✓" : ""}
          </button>

          <div>
            <h3 className={task.completed ? "completed" : ""}>
              {task.title}
            </h3>
            <p>{task.completed ? "Completed" : "Pending"}</p>
          </div>
        </div>

        <div className="task-right">
          <span className={`priority ${task.priority.toLowerCase()}`}>
            {task.priority}
          </span>

          <button className="edit-button" onClick={() => handleEdit(task)}>
            Edit
          </button>

          <button
            className="delete-button"
            onClick={() => handleDelete(task.id)}
          >
            Delete
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="app-layout">
      <aside className="sidebar">
        <h2 className="logo">TaskFlow <span>AI</span></h2>

        <p className="menu-title">MENU</p>

        <button
          className={page === "Dashboard" ? "nav-link active" : "nav-link"}
          onClick={() => setPage("Dashboard")}
        >
          <span>▦</span> Dashboard
        </button>

        <button
          className={page === "My Tasks" ? "nav-link active" : "nav-link"}
          onClick={() => setPage("My Tasks")}
        >
          <span>☑</span> My Tasks
          <span className="task-count">{tasks.length}</span>
        </button>

        <button
          className={page === "AI Assistant" ? "nav-link active" : "nav-link"}
          onClick={() => setPage("AI Assistant")}
        >
          <span>✧</span> AI Assistant
        </button>

        <button
          className={page === "Analytics" ? "nav-link active" : "nav-link"}
          onClick={() => setPage("Analytics")}
        >
          <span>▥</span> Analytics
        </button>

        <button
          className={page === "Settings" ? "nav-link active" : "nav-link"}
          onClick={() => setPage("Settings")}
        >
          <span>⚙</span> Settings
        </button>

        <div className="sidebar-bottom">
          <div className="sidebar-box">
            <span>✧</span>
            <h3>Need a little help?</h3>
            <p>Let AI break your big tasks into small steps.</p>
            <button onClick={() => setPage("AI Assistant")}>
              Try AI Assistant
            </button>
          </div>

          <p className="sidebar-footer">TaskFlow AI · My Workspace</p>
        </div>
      </aside>

      <main className="main-area">
        <header className="topbar">
          <p>Workspace / <span>{page}</span></p>
          <div className="user-info">
            <span className="online-dot"></span>
            Local AI
            <div className="user-avatar">T</div>
          </div>
        </header>

        {error && (
          <div className="error-message">
            {error}
            <button onClick={() => setError("")}>Close</button>
          </div>
        )}

        {page === "Dashboard" && (
          <section className="content">
            <div className="welcome">
              <div>
                <p className="small-heading">MY WORKSPACE</p>
                <h1>Welcome to <span>TaskFlow AI</span></h1>
                <p>Manage your work and stay productive every day.</p>
              </div>

              <button
                className="main-button"
                onClick={() => setPage("My Tasks")}
              >
                + Add Task
              </button>
            </div>

            <div className="stats">
              <div className="stat-card">
                <p>Total Tasks</p>
                <h2>{tasks.length}</h2>
                <span>All your tasks</span>
              </div>

              <div className="stat-card">
                <p>Pending Tasks</p>
                <h2>{pending}</h2>
                <span>Tasks to complete</span>
              </div>

              <div className="stat-card">
                <p>Completed Tasks</p>
                <h2>{completed}</h2>
                <span>Tasks finished</span>
              </div>
            </div>

            <div className="dashboard-content">
              <div className="content-card recent-tasks">
                <div className="card-heading">
                  <div>
                    <p className="small-heading">YOUR ACTIVITY</p>
                    <h2>Recent Tasks</h2>
                  </div>
                  <button onClick={() => setPage("My Tasks")}>
                    View All →
                  </button>
                </div>

                {loading ? (
                  <p className="empty-text">Loading tasks...</p>
                ) : tasks.length === 0 ? (
                  <p className="empty-text">No tasks yet. Add your first task!</p>
                ) : (
                  tasks.slice(0, 5).map(showTask)
                )}
              </div>

              <div className="content-card progress-card">
                <p className="small-heading">YOUR PROGRESS</p>
                <h2>Task Completion</h2>

                <div
                  className="progress-circle"
                  style={{
                    "--progress": tasks.length
                      ? (completed / tasks.length) * 100
                      : 0,
                  }}
                >
                  <div>
                    <strong>
                      {tasks.length
                        ? Math.round((completed / tasks.length) * 100)
                        : 0}%
                    </strong>
                    <span>Completed</span>
                  </div>
                </div>

                <p className="progress-text">
                  {completed} completed · {pending} pending
                </p>

                <button
                  className="outline-button"
                  onClick={() => setPage("AI Assistant")}
                >
                  ✧ Plan with AI
                </button>
              </div>
            </div>

            <div className="ai-banner">
              <div>
                <p className="small-heading">AI POWERED PLANNING</p>
                <h2>Have a big task? Let AI break it down.</h2>
                <p>Turn your goals into smaller and easier steps.</p>
              </div>

              <button onClick={() => setPage("AI Assistant")}>
                Open AI Assistant →
              </button>
            </div>
          </section>
        )}

        {page === "My Tasks" && (
          <section className="content">
            <div className="welcome">
              <div>
                <p className="small-heading">TASK MANAGEMENT</p>
                <h1>My <span>Tasks</span></h1>
                <p>Create, update and manage your daily tasks.</p>
              </div>
            </div>

            <form className="task-form" onSubmit={handleAddTask}>
              <input
                type="text"
                placeholder="Enter your task..."
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
              />

              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value)}
              >
                <option value="Low">Low Priority</option>
                <option value="Medium">Medium Priority</option>
                <option value="High">High Priority</option>
              </select>

              <button className="main-button" disabled={saving}>
                {saving ? "Saving..." : "Add Task"}
              </button>
            </form>

            <div className="task-filters">
              <input
                type="search"
                placeholder="Search tasks..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />

              <select
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
              >
                <option value="All">All Tasks</option>
                <option value="Pending">Pending</option>
                <option value="Completed">Completed</option>
              </select>
            </div>

            <div className="content-card">
              <div className="card-heading">
                <h2>Your Task List</h2>
                <span>{visibleTasks.length} tasks</span>
              </div>

              {loading ? (
                <p className="empty-text">Loading tasks...</p>
              ) : visibleTasks.length === 0 ? (
                <p className="empty-text">No tasks found.</p>
              ) : (
                visibleTasks.map(showTask)
              )}
            </div>
          </section>
        )}

        {page === "AI Assistant" && (
          <section className="content">
            <div className="welcome">
              <div>
                <p className="small-heading">YOUR PERSONAL AI PLANNER</p>
                <h1>AI <span>Assistant</span></h1>
                <p>Let AI help you organize your goals.</p>
              </div>
              <span className="ai-status">● Llama 3.2 Connected</span>
            </div>

            <div className="ai-card">
              <div className="ai-icon">✧</div>
              <p className="small-heading">AI TASK BREAKDOWN</p>
              <h2>What do you want to accomplish?</h2>
              <p>Enter a task and AI will divide it into five smaller steps.</p>

              <form className="ai-form" onSubmit={handleAIBreakdown}>
                <input
                  type="text"
                  placeholder="Example: Prepare for a Java interview"
                  value={aiTask}
                  onChange={(e) => setAiTask(e.target.value)}
                  required
                />

                <button className="main-button" disabled={aiLoading}>
                  {aiLoading ? "Generating..." : "✧ Generate with AI"}
                </button>
              </form>

              {aiLoading && (
                <p className="empty-text">AI is thinking. Please wait...</p>
              )}

              {aiError && (
                <div className="ai-error">
                  {aiError}
                  <button onClick={() => setAiError("")}>Close</button>
                </div>
              )}

              {suggestions.length > 0 && (
                <div className="ai-results">
                  <h3>Generated Subtasks</h3>

                  {suggestions.map((item, index) => (
                    <label className="suggestion" key={index}>
                      <input
                        type="checkbox"
                        checked={selected.includes(index)}
                        onChange={() => handleSelect(index)}
                      />
                      <span>{item}</span>
                    </label>
                  ))}

                  <button
                    className="main-button"
                    onClick={handleSaveSuggestions}
                    disabled={saving || selected.length === 0}
                  >
                    {saving ? "Adding..." : `Add Selected Tasks (${selected.length})`}
                  </button>
                </div>
              )}
            </div>

            <div className="ai-info">
              <div className="content-card">
                <span>✧</span>
                <h3>Smart Planning</h3>
                <p>Break large tasks into smaller steps.</p>
              </div>

              <div className="content-card">
                <span>✓</span>
                <h3>Your Choice</h3>
                <p>Select the suggestions you want to save.</p>
              </div>

              <div className="content-card">
                <span>⌘</span>
                <h3>Local AI</h3>
                <p>Powered by your local Ollama model.</p>
              </div>
            </div>
          </section>
        )}

        {page === "Analytics" && (
          <section className="content">
            <div className="welcome">
              <div>
                <p className="small-heading">YOUR PERFORMANCE</p>
                <h1><span>Analytics</span></h1>
                <p>Check your task progress.</p>
              </div>
            </div>

            <div className="content-card placeholder">
              <h2>Analytics Coming Soon</h2>
              <p>Charts and productivity reports will be added here.</p>
            </div>
          </section>
        )}

        {page === "Settings" && (
          <section className="content">
            <div className="welcome">
              <div>
                <p className="small-heading">PREFERENCES</p>
                <h1><span>Settings</span></h1>
                <p>Manage your application settings.</p>
              </div>
            </div>

            <div className="content-card placeholder">
              <h2>Settings Coming Soon</h2>
              <p>More settings will be added in future updates.</p>
            </div>
          </section>
        )}

        <footer className="footer">
          <span>TaskFlow AI</span>
          <span>Plan Smarter. Achieve More.</span>
        </footer>
      </main>
    </div>
  );
}

export default App;
