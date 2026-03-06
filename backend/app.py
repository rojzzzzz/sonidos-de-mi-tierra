from flask import Flask, jsonify, request
from flask_cors import CORS
from config import Config
from models import db
from api import api
from admin import admin
from seed import seed_all
import os

def create_app():
    app = Flask(__name__)
    app.config.from_object(Config)

    CORS(app, resources={r"/api/*": {"origins": [
        "http://127.0.0.1:8080",
        "http://localhost:8080",
        "https://sonidos-de-mi-tierra.netlify.app"
    ]}})
    db.init_app(app)

    app.register_blueprint(api)
    app.register_blueprint(admin)

    # ---- CORS (para desarrollo local) ----
    @app.after_request
    def add_cors_headers(response):
        origin = request.headers.get("Origin")
        allowed = {"http://127.0.0.1:8080", "http://localhost:8080", "https://sonidos-de-mi-tierra.netlify.app"}
        if origin in allowed:
            response.headers["Access-Control-Allow-Origin"] = origin
            response.headers["Vary"] = "Origin"
            response.headers["Access-Control-Allow-Credentials"] = "true"
            response.headers["Access-Control-Allow-Headers"] = "Content-Type, Authorization, X-CSRF-Token"
            response.headers["Access-Control-Allow-Methods"] = "GET, POST, PUT, PATCH, DELETE, OPTIONS"
        return response

    @app.route("/api/<path:_path>", methods=["OPTIONS"])
    def api_preflight(_path):
        return ("", 204)

    @app.errorhandler(404)
    def not_found(e):
        # API errors in JSON
        if str(getattr(e, "description", "")).lower().find("csrf") >= 0:
            return jsonify({"error": "forbidden", "message": "CSRF token inválido"}), 403
        if hasattr(e, "code") and e.code == 404 and ("/api/" in (getattr(e, "name", "") or "") or "/api/" in str(e)):
            return jsonify({"error": "not_found"}), 404
        return e

    @app.errorhandler(403)
    def forbidden(e):
        if "/api/" in str(e) or "/admin" in str(e):
            return jsonify({"error": "forbidden", "message": str(e)}), 403
        return e

    return app

if __name__ == "__main__":
    app = create_app()
    seed_all(app, app.config["ADMIN_USERNAME"], app.config["ADMIN_PASSWORD"])

    port = int(os.environ.get("PORT", 5000))
    app.run(host="0.0.0.0", port=port, debug=False)

