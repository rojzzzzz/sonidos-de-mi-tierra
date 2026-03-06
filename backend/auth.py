import secrets
from functools import wraps
from flask import session, redirect, url_for, request, abort
from werkzeug.security import check_password_hash

def login_required(view):
    @wraps(view)
    def wrapped(*args, **kwargs):
        if not session.get("admin_user"):
            return redirect(url_for("admin.login", next=request.path))
        return view(*args, **kwargs)
    return wrapped

def generate_csrf_token():
    token = session.get("_csrf_token")
    if not token:
        token = secrets.token_urlsafe(32)
        session["_csrf_token"] = token
    return token

def validate_csrf():
    if request.method in ("POST", "PUT", "DELETE"):
        form_token = request.form.get("csrf_token") or request.headers.get("X-CSRF-Token")
        session_token = session.get("_csrf_token")
        if not form_token or not session_token or form_token != session_token:
            abort(403, description="CSRF token missing/invalid")
