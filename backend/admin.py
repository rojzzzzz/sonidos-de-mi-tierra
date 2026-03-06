from flask import Blueprint, render_template, request, redirect, url_for, flash, session
from werkzeug.security import generate_password_hash, check_password_hash
from models import db, AdminUser, Song, Artist, Region, Tag, Source
from auth import login_required, generate_csrf_token, validate_csrf

admin = Blueprint("admin", __name__, url_prefix="/admin")

@admin.before_app_request
def csrf_protect():
    # Solo protege rutas admin (evita romper API)
    if request.path.startswith("/admin"):
        validate_csrf()

@admin.app_context_processor
def inject_csrf():
    return {"csrf_token": generate_csrf_token()}

@admin.get("/login")
def login():
    return render_template("login.html")

@admin.post("/login")
def login_post():
    username = (request.form.get("username") or "").strip()
    password = request.form.get("password") or ""
    user = AdminUser.query.filter_by(username=username).first()
    if not user or not check_password_hash(user.password_hash, password):
        flash("Credenciales inválidas.", "error")
        return redirect(url_for("admin.login"))
    session["admin_user"] = user.username
    flash("Bienvenido/a al panel.", "success")
    return redirect(url_for("admin.dashboard"))

@admin.get("/logout")
@login_required
def logout():
    session.pop("admin_user", None)
    flash("Sesión cerrada.", "success")
    return redirect(url_for("admin.login"))

@admin.get("/")
@login_required
def dashboard():
    songs = Song.query.order_by(Song.id.desc()).limit(50).all()
    artists = Artist.query.order_by(Artist.name.asc()).all()
    return render_template("dashboard.html", songs=songs, artists=artists)

# ---------- SONGS CRUD ----------
def _parse_int(val):
    try:
        return int(val)
    except Exception:
        return None

def _parse_duration_to_seconds(mmss: str):
    if not mmss:
        return None
    mmss = mmss.strip()
    if ":" not in mmss:
        return _parse_int(mmss)
    parts = mmss.split(":")
    if len(parts) != 2:
        return None
    m = _parse_int(parts[0])
    s = _parse_int(parts[1])
    if m is None or s is None:
        return None
    return m * 60 + s

def _upsert_tags(tag_string: str):
    names = [t.strip().lower() for t in (tag_string or "").split(",") if t.strip()]
    tags = []
    for name in names:
        t = Tag.query.filter_by(name=name).first()
        if not t:
            t = Tag(name=name)
            db.session.add(t)
        tags.append(t)
    return tags

def _upsert_sources(src_string: str):
    """
    Formato esperado (una por línea):
      Titulo | URL | Nota
    URL y Nota opcionales.
    """
    sources = []
    for line in (src_string or "").splitlines():
        line = line.strip()
        if not line:
            continue
        parts = [p.strip() for p in line.split("|")]
        title = parts[0] if len(parts) > 0 else ""
        url = parts[1] if len(parts) > 1 else None
        note = parts[2] if len(parts) > 2 else None
        if not title:
            continue
        s = Source.query.filter_by(title=title, url=url).first()
        if not s:
            s = Source(title=title, url=url, note=note)
            db.session.add(s)
        sources.append(s)
    return sources

@admin.get("/songs/new")
@login_required
def song_new():
    artists = Artist.query.order_by(Artist.name.asc()).all()
    regions = Region.query.order_by(Region.name.asc()).all()
    return render_template("song_form.html", mode="create", song=None, artists=artists, regions=regions)

@admin.post("/songs/new")
@login_required
def song_create():
    title = (request.form.get("title") or "").strip()
    artist_id = _parse_int(request.form.get("artist_id"))
    year = _parse_int(request.form.get("year"))
    genre = (request.form.get("genre") or "N/D").strip()
    region_id = _parse_int(request.form.get("region_id"))
    duration = _parse_duration_to_seconds(request.form.get("duration"))
    cover_url = (request.form.get("cover_url") or "").strip() or None
    audio_url = (request.form.get("audio_url") or "").strip() or None
    history_context = (request.form.get("history_context") or "").strip()
    cultural_influence = (request.form.get("cultural_influence") or "").strip()
    references_text = (request.form.get("references_text") or "").strip()
    tags_str = request.form.get("tags") or ""
    sources_str = request.form.get("sources") or ""

    if not title or not artist_id:
        flash("Título y artista son obligatorios.", "error")
        return redirect(url_for("admin.song_new"))

    artist = Artist.query.get(artist_id)
    if not artist:
        flash("Artista inválido.", "error")
        return redirect(url_for("admin.song_new"))

    song = Song(
        title=title,
        artist_id=artist_id,
        year=year,
        genre=genre,
        region_id=region_id,
        duration_seconds=duration,
        cover_url=cover_url,
        audio_url=audio_url,
        history_context=history_context,
        cultural_influence=cultural_influence,
        references_text=references_text,
    )
    song.tags = _upsert_tags(tags_str)
    song.sources = _upsert_sources(sources_str)

    db.session.add(song)
    db.session.commit()
    flash("Canción creada.", "success")
    return redirect(url_for("admin.dashboard"))

@admin.get("/songs/<int:song_id>/edit")
@login_required
def song_edit(song_id: int):
    song = Song.query.get_or_404(song_id)
    artists = Artist.query.order_by(Artist.name.asc()).all()
    regions = Region.query.order_by(Region.name.asc()).all()
    tags_str = ", ".join([t.name for t in song.tags])
    sources_str = "\n".join([f"{s.title} | {s.url or ''} | {s.note or ''}".strip() for s in song.sources])
    return render_template(
        "song_form.html",
        mode="edit",
        song=song,
        artists=artists,
        regions=regions,
        tags_str=tags_str,
        sources_str=sources_str
    )

@admin.post("/songs/<int:song_id>/edit")
@login_required
def song_update(song_id: int):
    song = Song.query.get_or_404(song_id)
    title = (request.form.get("title") or "").strip()
    artist_id = _parse_int(request.form.get("artist_id"))
    year = _parse_int(request.form.get("year"))
    genre = (request.form.get("genre") or "N/D").strip()
    region_id = _parse_int(request.form.get("region_id"))
    duration = _parse_duration_to_seconds(request.form.get("duration"))
    cover_url = (request.form.get("cover_url") or "").strip() or None
    audio_url = (request.form.get("audio_url") or "").strip() or None
    history_context = (request.form.get("history_context") or "").strip()
    cultural_influence = (request.form.get("cultural_influence") or "").strip()
    references_text = (request.form.get("references_text") or "").strip()
    tags_str = request.form.get("tags") or ""
    sources_str = request.form.get("sources") or ""

    if not title or not artist_id:
        flash("Título y artista son obligatorios.", "error")
        return redirect(url_for("admin.song_edit", song_id=song_id))

    song.title = title
    song.artist_id = artist_id
    song.year = year
    song.genre = genre
    song.region_id = region_id
    song.duration_seconds = duration
    song.cover_url = cover_url
    song.audio_url = audio_url
    song.history_context = history_context
    song.cultural_influence = cultural_influence
    song.references_text = references_text
    song.tags = _upsert_tags(tags_str)
    song.sources = _upsert_sources(sources_str)

    db.session.commit()
    flash("Canción actualizada.", "success")
    return redirect(url_for("admin.dashboard"))

@admin.get("/songs/<int:song_id>/delete")
@login_required
def song_delete_confirm(song_id: int):
    song = Song.query.get_or_404(song_id)
    return render_template("confirm_delete.html", entity="canción", name=song.title, action=url_for("admin.song_delete", song_id=song_id))

@admin.post("/songs/<int:song_id>/delete")
@login_required
def song_delete(song_id: int):
    song = Song.query.get_or_404(song_id)
    db.session.delete(song)
    db.session.commit()
    flash("Canción eliminada.", "success")
    return redirect(url_for("admin.dashboard"))

# ---------- ARTISTS CRUD ----------
@admin.get("/artists/new")
@login_required
def artist_new():
    return render_template("artist_form.html", mode="create", artist=None)

@admin.post("/artists/new")
@login_required
def artist_create():
    name = (request.form.get("name") or "").strip()
    bio = (request.form.get("bio") or "").strip()
    active_era = (request.form.get("active_era") or "N/D").strip()
    cultural_contributions = (request.form.get("cultural_contributions") or "").strip()
    photo_url = (request.form.get("photo_url") or "").strip() or None

    if not name:
        flash("Nombre es obligatorio.", "error")
        return redirect(url_for("admin.artist_new"))

    artist = Artist(
        name=name,
        bio=bio,
        active_era=active_era,
        cultural_contributions=cultural_contributions,
        photo_url=photo_url
    )
    db.session.add(artist)
    db.session.commit()
    flash("Artista creado.", "success")
    return redirect(url_for("admin.dashboard"))

@admin.get("/artists/<int:artist_id>/edit")
@login_required
def artist_edit(artist_id: int):
    artist = Artist.query.get_or_404(artist_id)
    return render_template("artist_form.html", mode="edit", artist=artist)

@admin.post("/artists/<int:artist_id>/edit")
@login_required
def artist_update(artist_id: int):
    artist = Artist.query.get_or_404(artist_id)
    name = (request.form.get("name") or "").strip()
    bio = (request.form.get("bio") or "").strip()
    active_era = (request.form.get("active_era") or "N/D").strip()
    cultural_contributions = (request.form.get("cultural_contributions") or "").strip()
    photo_url = (request.form.get("photo_url") or "").strip() or None

    if not name:
        flash("Nombre es obligatorio.", "error")
        return redirect(url_for("admin.artist_edit", artist_id=artist_id))

    artist.name = name
    artist.bio = bio
    artist.active_era = active_era
    artist.cultural_contributions = cultural_contributions
    artist.photo_url = photo_url
    db.session.commit()

    flash("Artista actualizado.", "success")
    return redirect(url_for("admin.dashboard"))

@admin.get("/artists/<int:artist_id>/delete")
@login_required
def artist_delete_confirm(artist_id: int):
    artist = Artist.query.get_or_404(artist_id)
    return render_template("confirm_delete.html", entity="artista", name=artist.name, action=url_for("admin.artist_delete", artist_id=artist_id))

@admin.post("/artists/<int:artist_id>/delete")
@login_required
def artist_delete(artist_id: int):
    artist = Artist.query.get_or_404(artist_id)
    db.session.delete(artist)
    db.session.commit()
    flash("Artista eliminado.", "success")
    return redirect(url_for("admin.dashboard"))
