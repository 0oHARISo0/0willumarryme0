import os
import json
import sqlite3
from datetime import datetime, timezone
from functools import wraps
from flask import Flask, render_template, request, jsonify, Response

app = Flask(__name__)
DB_PATH = os.path.join(os.path.dirname(__file__), "visitor_activity.db")
ADMIN_PASSWORD = os.environ.get("ADMIN_PASSWORD", "change-me-now")

def init_db():
    with sqlite3.connect(DB_PATH) as conn:
        conn.execute("""
            CREATE TABLE IF NOT EXISTS events (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                created_at TEXT NOT NULL,
                event TEXT NOT NULL,
                page INTEGER,
                details TEXT NOT NULL,
                ip_hint TEXT
            )
        """)
        conn.commit()

@app.get("/")
def home():
    return render_template("index.html")

@app.post("/api/event")
def save_event():
    data = request.get_json(silent=True) or {}
    event = str(data.get("event", "unknown"))[:80]
    page = data.get("page")
    details = data.get("details", {})
    if not isinstance(details, dict):
        details = {"value": str(details)[:500]}
    # Avoid storing full IP addresses; this is a simple activity logger.
    ip = request.headers.get("X-Forwarded-For", request.remote_addr or "")
    ip_hint = ".".join(ip.split(".")[:2]) + ".x.x" if "." in ip else "hidden"
    with sqlite3.connect(DB_PATH) as conn:
        conn.execute(
            "INSERT INTO events (created_at, event, page, details, ip_hint) VALUES (?, ?, ?, ?, ?)",
            (datetime.now(timezone.utc).isoformat(), event, page, json.dumps(details)[:3000], ip_hint)
        )
        conn.commit()
    return jsonify({"ok": True})

def admin_auth(fn):
    @wraps(fn)
    def wrapper(*args, **kwargs):
        auth = request.authorization
        if not auth or auth.password != ADMIN_PASSWORD or auth.username != "admin":
            return Response("Login required. Use browser basic auth with username admin and your ADMIN_PASSWORD.", 401,
                            {"WWW-Authenticate": 'Basic realm="Visitor Activity"'})
        return fn(*args, **kwargs)
    return wrapper

@app.get("/admin")
@admin_auth
def admin():
    with sqlite3.connect(DB_PATH) as conn:
        conn.row_factory = sqlite3.Row
        rows = conn.execute("SELECT * FROM events ORDER BY id DESC LIMIT 300").fetchall()
    events = []
    for row in rows:
        item = dict(row)
        try:
            item["details"] = json.loads(item["details"])
        except json.JSONDecodeError:
            item["details"] = {}
        events.append(item)
    return render_template("admin.html", events=events)

if __name__ == "__main__":
    init_db()
    app.run(host="127.0.0.1", port=5000, debug=False)
