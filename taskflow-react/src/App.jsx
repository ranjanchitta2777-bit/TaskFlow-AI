
import { useEffect, useState } from "react";
import {
  getTasks,
  createTask,
  updateTask,
  deleteTask,
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
  const [editingId, setEditingId] = useState(null);

  async function loadTasks() {
    setLoading(true);
    setError("");

    try {
      const data = await getTasks();
      setTasks(Array.isArray(data) ? data : []);
    } catch (err) {
      setError("Could not load tasks. Check that the backend and database are running.");
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadTasks();
  }, []);

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
        completed: false,
      });

      // The backend must return the saved task.
      if (!savedTask || savedTask.id == null) {
        await loadTasks();
        setTitle("");
        setPriority("Medium");
        return;
      }

      setTasks((previous) => [...previous, savedTask]);
      setTitle("");
      setPriority("Medium");
    } catch (err) {
      setError("Task could not be saved. Please try again.");
      console.error(err);
    } finally {
      setSaving(false);
    }
  }

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
        <p>Organize your tasks and track your progress.</p>
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
