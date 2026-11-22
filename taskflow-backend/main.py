
import os
import requests
import mysql.connector

from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from fastapi.middleware.cors import CORSMiddleware


# Load environment variables
load_dotenv()

app = FastAPI(title="TaskFlow AI API")


# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173"
    ],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Request models
class TaskCreate(BaseModel):
    title: str
    priority: str = "Medium"


class TaskUpdate(BaseModel):
    title: str
    priority: str
    completed: bool


class TaskBreakdownRequest(BaseModel):
    task: str


# Database connection
def get_db_connection():
    return mysql.connector.connect(
        host=os.getenv("MYSQL_HOST", "localhost"),
        port=int(os.getenv("MYSQL_PORT", "3306")),
        user=os.getenv("MYSQL_USER", "root"),
        password=os.getenv("MYSQL_PASSWORD", ""),
        database=os.getenv("MYSQL_DATABASE", "taskflow_db")
    )


# Home route
@app.get("/")
def home():
    return {
        "message": "TaskFlow AI backend is running!",
        "status": "success"
    }


# Get all tasks
@app.get("/tasks")
def get_tasks():
    connection = None
    cursor = None

    try:
        connection = get_db_connection()
        cursor = connection.cursor(dictionary=True)

        cursor.execute(
            "SELECT id, title, priority, completed "
            "FROM tasks ORDER BY id"
        )

        tasks = cursor.fetchall()

        for task in tasks:
            task["completed"] = bool(task["completed"])

        return tasks

    except mysql.connector.Error as error:
        raise HTTPException(
            status_code=500,
            detail="Could not retrieve tasks from the database."
        ) from error

    finally:
        if cursor is not None:
            cursor.close()

        if connection is not None and connection.is_connected():
            connection.close()


# Create a task
@app.post("/tasks", status_code=201)
def create_task(task: TaskCreate):
    title = task.title.strip()
    priority = task.priority.strip().title()

    if not title:
        raise HTTPException(
            status_code=400,
            detail="Task title is required."
        )

    if priority not in ["Low", "Medium", "High"]:
        raise HTTPException(
            status_code=400,
            detail="Priority must be Low, Medium, or High."
        )

    connection = None
    cursor = None

    try:
        connection = get_db_connection()
        cursor = connection.cursor()

        cursor.execute(
            "INSERT INTO tasks (title, priority, completed) "
            "VALUES (%s, %s, %s)",
            (title, priority, False)
        )

        connection.commit()
        task_id = cursor.lastrowid

        return {
            "id": task_id,
            "title": title,
            "priority": priority,
            "completed": False
        }

    except mysql.connector.Error as error:
        if connection is not None and connection.is_connected():
            connection.rollback()

        raise HTTPException(
            status_code=500,
            detail="Could not save the task to the database."
        ) from error

    finally:
        if cursor is not None:
            cursor.close()

        if connection is not None and connection.is_connected():
            connection.close()


# Update a task
@app.put("/tasks/{task_id}")
def update_task(task_id: int, task: TaskUpdate):
    title = task.title.strip()
    priority = task.priority.strip().title()

    if not title:
        raise HTTPException(
            status_code=400,
            detail="Task title is required."
        )

    if priority not in ["Low", "Medium", "High"]:
        raise HTTPException(
            status_code=400,
            detail="Priority must be Low, Medium, or High."
        )

    connection = None
    cursor = None

    try:
        connection = get_db_connection()
        cursor = connection.cursor()

        cursor.execute(
            "UPDATE tasks SET title = %s, priority = %s, completed = %s "
            "WHERE id = %s",
            (title, priority, task.completed, task_id)
        )

        if cursor.rowcount == 0:
            cursor.execute(
                "SELECT id FROM tasks WHERE id = %s",
                (task_id,)
            )

            if cursor.fetchone() is None:
                raise HTTPException(
                    status_code=404,
                    detail="Task not found."
                )

        connection.commit()

        return {
            "id": task_id,
            "title": title,
            "priority": priority,
            "completed": task.completed
        }

    except mysql.connector.Error as error:
        if connection is not None and connection.is_connected():
            connection.rollback()

        raise HTTPException(
            status_code=500,
            detail="Could not update the task."
        ) from error

    finally:
        if cursor is not None:
            cursor.close()

        if connection is not None and connection.is_connected():
            connection.close()


# Delete a task
@app.delete("/tasks/{task_id}")
def delete_task(task_id: int):
    connection = None
    cursor = None

    try:
        connection = get_db_connection()
        cursor = connection.cursor()

        cursor.execute(
            "DELETE FROM tasks WHERE id = %s",
            (task_id,)
        )

        if cursor.rowcount == 0:
            raise HTTPException(
                status_code=404,
                detail="Task not found."
            )

        connection.commit()

        return {
            "message": "Task deleted successfully.",
            "id": task_id
        }

    except mysql.connector.Error as error:
        if connection is not None and connection.is_connected():
            connection.rollback()

        raise HTTPException(
            status_code=500,
            detail="Could not delete the task."
        ) from error

    finally:
        if cursor is not None:
            cursor.close()

        if connection is not None and connection.is_connected():
            connection.close()


# AI task breakdown
@app.post("/ai/breakdown")
def ai_task_breakdown(request: TaskBreakdownRequest):

    task = request.task.strip()

    if not task:
        raise HTTPException(
            status_code=400,
            detail="Task description is required."
        )

    prompt = f"""
    You are a helpful task planning assistant.

    Break down the following task into exactly 5 small,
    practical and actionable subtasks.

    Task: {task}

    Return only a numbered list.
    Do not add an introduction or conclusion.
    """

    try:
        response = requests.post(
            "http://localhost:11434/api/generate",
            json={
                "model": "llama3.2:1b",
                "prompt": prompt,
                "stream": False
            },
            timeout=120
        )

        response.raise_for_status()

        result = response.json().get("response", "").strip()

        if not result:
            raise HTTPException(
                status_code=502,
                detail="The AI model returned an empty response."
            )

        return {
            "original_task": task,
            "subtasks": result
        }

    except requests.RequestException as error:
        raise HTTPException(
            status_code=503,
            detail=(
                "Could not connect to the local AI model. "
                "Make sure Ollama is running."
            )
        ) from error
