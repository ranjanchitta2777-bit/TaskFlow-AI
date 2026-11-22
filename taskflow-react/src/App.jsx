
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

  // AI feature states
  const [aiTask, setAiTask] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState("");
  const [suggestions, setSuggestions] = useState([]);
  const [selectedSuggestions, setSelectedSuggestions] = useState([]);

  async function loadTasks() {
    setLoading(true);
    setError("");

    try {
      const data = await getTasks();
      setTasks(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(
        "Could not load tasks. Check that the backend and database are running."
      );
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadTasks();
  }, []);

  // Create a normal task
  async function handleAddTask(event) {
    event.preventDefault();

    if (!title.trim()) {
      setError("Please enter a task title.");
      return;
    }

    setSaving(true);
    setError("");

    try {
      const savedTask = await createTask({
        title: title.trim(),
        priority,
      });

      if (!savedTask || savedTask.id == null) {
        await loadTasks();
      } else {
        setTasks((previous) => [...previous, savedTask]);
      }

      setTitle("");
      setPriority("Medium");
    } catch (err) {
      setError("Task could not be saved. Please try again.");
      console.error(err);
    } finally {
      setSaving(false);
    }
  }

  // Complete or undo a task
  async function handleToggle(task) {
    setError("");

    const updatedTask = {
      title: task.title,
      priority: task.priority,
      completed: !task.completed,
    };

    try {
      const savedTask = await updateTask(task.id, updatedTask);

      setTasks((previous) =>
        previous.map((item) =>
          item.id === task.id
            ? savedTask ?? { ...item, ...updatedTask }
            : item
        )
      );
    } catch (err) {
      setError("Could not update task. Please try again.");
      console.error(err);
    }
  }

  // Edit a task
  async function handleEdit(task) {
    const newTitle = window.prompt("Edit task title:", task.title);

    if (newTitle === null || !newTitle.trim()) {
      return;
    }

    const updatedTask = {
      title: newTitle.trim(),
      priority: task.priority,
      completed: task.completed,
    };

    setError("");

    try {
      const savedTask = await updateTask(task.id, updatedTask);

      setTasks((previous) =>
        previous.map((item) =>
          item.id === task.id
            ? savedTask ?? { ...item, ...updatedTask }
            : item
        )
      );
    } catch (err) {
      setError("Could not edit task. Please try again.");
      console.error(err);
    }
  }

  // Delete a task
  async function handleDelete(id) {
    if (!window.confirm("Are you sure you want to delete this task?")) {
      return;
    }

    setError("");

    try {
      await deleteTask(id);

      setTasks((previous) =>
        previous.filter((task) => task.id !== id)
      );
    } catch (err) {
      setError("Could not delete task. Please try again.");
      console.error(err);
    }
  }

  // Generate subtasks using AI
  async function handleAIBreakdown(event) {
    event.preventDefault();

    if (!aiTask.trim()) {
      setAiError("Please enter a task for AI to break down.");
      return;
    }

    setAiLoading(true);
    setAiError("");
    setSuggestions([]);
    setSelectedSuggestions([]);

    try {
      const data = await breakdownTask(aiTask.trim());

      const generatedTasks = data.subtasks
        .split("\n")
        .map((line) =>
          line.replace(/^\s*(?:[-*•]|\d+[.)])\s*/, "").trim()
        )
        .filter(Boolean);

      if (generatedTasks.length === 0) {
        throw new Error("The AI did not generate any subtasks.");
      }

      setSuggestions(generatedTasks);
      setSelectedSuggestions(generatedTasks.map((_, index) => index));
    } catch (err) {
      setAiError(
        err.message || "Could not generate subtasks. Please try again."
      );
      console.error(err);
    } finally {
      setAiLoading(false);
    }
  }

  // Select or deselect an AI suggestion
  function toggleSuggestion(index) {
    setSelectedSuggestions((previous) =>
      previous.includes(index)
        ? previous.filter((item) => item !== index)
        : [...previous, index]
    );
  }

  // Save selected AI suggestions into MySQL
  async function handleAddAISuggestions() {
    const selectedTasks = suggestions.filter((_, index) =>
      selectedSuggestions.includes(index)
    );

    if (selectedTasks.length === 0) {
      setAiError("Please select at least one subtask.");
      return;
    }

    setSaving(true);
    setAiError("");

    try {
      const savedTasks = await Promise.all(
        selectedTasks.map((taskTitle) =>
          createTask({
            title: taskTitle,
            priority: "Medium",
          })
        )
      );

      setTasks((previous) => [...previous, ...savedTasks]);

      setSuggestions([]);
      setSelectedSuggestions([]);
      setAiTask("");
    } catch (err) {
      setAiError(
        "Could not save all AI subtasks. Please check your tasks and try again."
      );
      console.error(err);
      await loadTasks();
    } finally {
      setSaving(false);
    }
  }

  // Search and filter tasks
  const visibleTasks = tasks.filter((task) => {
    const matchesSearch = (task.title || "")
      .toLowerCase()
      .includes(search.toLowerCase());

    const matchesFilter =
      filter === "All" ||
      (filter === "Completed" && task.completed) ||
      (filter === "Pending" && !task.completed);

    return matchesSearch && matchesFilter;
  });

  const completedCount = tasks.filter(
    (task) => task.completed
  ).length;

  return (
    <main className="app-container">
      <header className="app-header">
        <h1>TaskFlow AI</h1>
        <p>Organize your tasks and let AI help you plan smarter.</p>
      </header>

      <section className="task-stats">
        <div className="stat-card">
          <h3>{tasks.length}</h3>
          <p>Total Tasks</p>
        </div>

        <div className="stat-card">
          <h3>{tasks.length - completedCount}</h3>
          <p>Pending</p>
        </div>

        <div className="stat-card">
          <h3>{completedCount}</h3>
          <p>Completed</p>
        </div>
      </section>

      {/* AI Task Breakdown */}
      <section className="ai-section">
        <h2>AI Task Breakdown</h2>
        <p>
          Enter a big task and let AI divide it into smaller,
          actionable steps.
        </p>

        <form onSubmit={handleAIBreakdown}>
          <input
            type="text"
            placeholder="Example: Prepare for a Java interview"
            value={aiTask}
            onChange={(event) => setAiTask(event.target.value)}
            maxLength={200}
            required
          />

          <button type="submit" disabled={aiLoading}>
            {aiLoading ? "Generating..." : "✨ Generate with AI"}
          </button>
        </form>

        {aiLoading && <p>AI is thinking. Please wait...</p>}

        {aiError && (
          <div className="error-message" role="alert">
            {aiError}
            <button type="button" onClick={() => setAiError("")}>
              Dismiss
            </button>
          </div>
        )}

        {suggestions.length > 0 && (
          <div className="ai-results">
            <h3>AI-generated subtasks</h3>
            <p>Select the subtasks you want to add to your task list.</p>

            {suggestions.map((suggestion, index) => (
              <label className="ai-suggestion" key={index}>
                <input
                  type="checkbox"
                  checked={selectedSuggestions.includes(index)}
                  onChange={() => toggleSuggestion(index)}
                />
                <span>{suggestion}</span>
              </label>
            ))}

            <button
              type="button"
              onClick={handleAddAISuggestions}
              disabled={saving || selectedSuggestions.length === 0}
            >
              {saving
                ? "Adding..."
                : `Add Selected Tasks (${selectedSuggestions.length})`}
            </button>
          </div>
        )}
      </section>

      {/* Normal task form */}
      <form className="task-form" onSubmit={handleAddTask}>
        <input
          type="text"
          placeholder="What do you need to do?"
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          maxLength={200}
          required
        />

        <select
          value={priority}
          onChange={(event) => setPriority(event.target.value)}
        >
          <option value="Low">Low Priority</option>
          <option value="Medium">Medium Priority</option>
          <option value="High">High Priority</option>
        </select>

        <button type="submit" disabled={saving}>
          {saving ? "Saving..." : "Add Task"}
        </button>
      </form>

      {error && (
        <div className="error-message" role="alert">
          {error}
          <button type="button" onClick={() => setError("")}>
            Dismiss
          </button>
        </div>
      )}

      {/* Search and filters */}
      <section className="task-controls">
        <input
          type="search"
          placeholder="Search tasks..."
          value={search}
          onChange={(event) => setSearch(event.target.value)}
        />

        <select
          value={filter}
          onChange={(event) => setFilter(event.target.value)}
        >
          <option value="All">All Tasks</option>
          <option value="Pending">Pending</option>
          <option value="Completed">Completed</option>
        </select>
      </section>

      {/* Task list */}
      <section className="task-list">
        <h2>Your Tasks</h2>

        {loading ? (
          <p>Loading tasks...</p>
        ) : visibleTasks.length === 0 ? (
          <p>No tasks found. Add a task to get started!</p>
        ) : (
          visibleTasks.map((task) => (
            <article className="task-card" key={task.id}>
              <div className="task-details">
                <h3 className={task.completed ? "completed" : ""}>
                  {task.title}
                </h3>

                <p>
                  Priority: {task.priority} ·{" "}
                  {task.completed ? "Completed" : "Pending"}
                </p>
              </div>

              <div className="task-actions">
                <button
                  type="button"
                  onClick={() => handleToggle(task)}
                >
                  {task.completed ? "Undo" : "Complete"}
                </button>

                <button
                  type="button"
                  onClick={() => handleEdit(task)}
                >
                  Edit
                </button>

                <button
                  type="button"
                  onClick={() => handleDelete(task.id)}
                >
                  Delete
                </button>
              </div>
            </article>
          ))
        )}
      </section>
    </main>
  );
}

export default App;
