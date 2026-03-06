from flask import Blueprint, jsonify, request
from sqlalchemy import or_, func, case, select
from models import db, Song, Artist, Tag, Region, song_tags, song_genres, song_regions

api = Blueprint("api", __name__, url_prefix="/api")

def _int(v):
    try:
        return int(v)
    except Exception:
        return None

def recommend_songs(song_id, limit=10):
    base_song = Song.query.get(song_id)
    if not base_song:
        return None

    base_genres_subq = select(song_genres.c.genre_id).where(song_genres.c.song_id == song_id)
    base_tags_subq = select(song_tags.c.tag_id).where(song_tags.c.song_id == song_id)
    base_regions_subq = select(song_regions.c.region_id).where(song_regions.c.song_id == song_id)

    shared_genres_count = (
        select(func.count())
        .select_from(song_genres)
        .where(song_genres.c.song_id == Song.id, song_genres.c.genre_id.in_(base_genres_subq))
        .correlate(Song)
        .scalar_subquery()
    )
    shared_tags_count = (
        select(func.count())
        .select_from(song_tags)
        .where(song_tags.c.song_id == Song.id, song_tags.c.tag_id.in_(base_tags_subq))
        .correlate(Song)
        .scalar_subquery()
    )
    shared_regions_count = (
        select(func.count())
        .select_from(song_regions)
        .where(song_regions.c.song_id == Song.id, song_regions.c.region_id.in_(base_regions_subq))
        .correlate(Song)
        .scalar_subquery()
    )

    score_expr = (
        case((Song.artist_id == base_song.artist_id, 3), else_=0)
        + (shared_genres_count * 2)
        + (shared_tags_count * 2)
        + shared_regions_count
        + (func.coalesce(Song.iconic_score, 0) / 50.0)
    )

    rows = (
        db.session.query(
            Song.id,
            Song.title,
            Artist.name.label("artist_name"),
            score_expr.label("score"),
        )
        .join(Artist, Song.artist_id == Artist.id)
        .filter(Song.id != song_id)
        .order_by(score_expr.desc(), Song.id.asc())
        .limit(limit)
        .all()
    )

    return [
        {
            "id": row.id,
            "title": row.title,
            "artist_name": row.artist_name,
            "score": float(row.score or 0),
        }
        for row in rows
    ]

@api.get("/health")
def health():
    return jsonify({"status": "ok"})

@api.get("/regions")
def list_regions():
    regions = Region.query.order_by(Region.name.asc()).all()
    return jsonify([r.to_dict() for r in regions])

@api.get("/regions/<region_id>")
def get_region(region_id):
    region = Region.query.get_or_404(region_id)
    songs = (
        Song.query
        .join(Artist)
        .join(song_regions)
        .filter(song_regions.c.region_id == region_id)
        .order_by(Song.title.asc())
        .all()
    )
    payload = region.to_dict()
    payload["songs"] = [s.to_dict(minimal=True) for s in songs]
    return jsonify(payload)

@api.get("/tags")
def list_tags():
    tags = Tag.query.order_by(Tag.name.asc()).all()
    return jsonify([t.to_dict() for t in tags])

@api.get("/artists")
def list_artists():
    q = (request.args.get("q") or "").strip()
    query = Artist.query
    if q:
        query = query.filter(Artist.name.ilike(f"%{q}%"))
    artists = query.order_by(Artist.name.asc()).all()
    return jsonify([a.to_dict(include_songs=False) for a in artists])

@api.get("/artists/<int:artist_id>")
def get_artist(artist_id: int):
    artist = Artist.query.get_or_404(artist_id)
    return jsonify(artist.to_dict(include_songs=True))

@api.get("/songs")
def list_songs():
    """
    Filtros:
      - year=1978
      - region=Managua (nombre) o region_id=1
      - genre=Son Nica
      - artist=Nombre (parcial) o artist_id=1
      - tag=palabra (parcial) o tag_id=1
      - q=keyword (busca en título, historia, influencia, artista)
      - sort=year|title (default title)
      - order=asc|desc (default asc)
      - limit, offset
    """
    q = (request.args.get("q") or "").strip()
    year = _int(request.args.get("year"))
    region_id = (request.args.get("region_id") or "").strip()
    region = (request.args.get("region") or "").strip()
    genre = (request.args.get("genre") or "").strip()
    artist_id = _int(request.args.get("artist_id"))
    artist = (request.args.get("artist") or "").strip()
    tag_id = _int(request.args.get("tag_id"))
    tag = (request.args.get("tag") or "").strip()
    sort = (request.args.get("sort") or "title").strip().lower()
    order = (request.args.get("order") or "asc").strip().lower()
    limit = min(_int(request.args.get("limit")) or 50, 200)
    offset = max(_int(request.args.get("offset")) or 0, 0)

    query = Song.query.join(Artist)

    if year is not None:
        query = query.filter(Song.year == year)

    if genre:
        query = query.filter(Song.genre.ilike(f"%{genre}%"))

    if region_id:
        query = query.filter(Song.regions.any(Region.id == region_id))
    elif region:
        # legacy: permite buscar por nombre de region usando la relacion many-to-many
        query = query.filter(Song.regions.any(Region.name.ilike(f"%{region}%")))

    if artist_id is not None:
        query = query.filter(Song.artist_id == artist_id)
    elif artist:
        query = query.filter(Artist.name.ilike(f"%{artist}%"))

    if tag_id is not None:
        query = query.join(Song.tags).filter(Tag.id == tag_id)
    elif tag:
        query = query.join(Song.tags).filter(Tag.name.ilike(f"%{tag}%"))

    if q:
        query = query.filter(or_(
            Song.title.ilike(f"%{q}%"),
            Song.history_context.ilike(f"%{q}%"),
            Song.cultural_influence.ilike(f"%{q}%"),
            Artist.name.ilike(f"%{q}%"),
        ))

    # sorting
    sort_col = Song.title
    if sort == "year":
        sort_col = Song.year
    elif sort == "title":
        sort_col = Song.title

    if order == "desc":
        sort_col = sort_col.desc()
    else:
        sort_col = sort_col.asc()

    total = query.count()
    songs = query.order_by(sort_col).offset(offset).limit(limit).all()
    return jsonify({
        "total": total,
        "limit": limit,
        "offset": offset,
        "items": [s.to_dict(minimal=True) for s in songs]
    })

@api.get("/songs/<int:song_id>")
def get_song(song_id: int):
    song = Song.query.get_or_404(song_id)
    return jsonify(song.to_dict(minimal=False))

@api.get("/songs/<int:song_id>/recommendations")
def get_song_recommendations(song_id: int):
    limit = min(max(_int(request.args.get("limit")) or 10, 1), 100)
    items = recommend_songs(song_id, limit=limit)
    if items is None:
        return jsonify({"error": "not_found", "message": "Song not found"}), 404
    return jsonify({"song_id": song_id, "limit": limit, "items": items})

@api.get("/educational/timeline")
def timeline():
    """
    Devuelve un timeline simple por año con conteo y ejemplos.
    """
    songs = Song.query.filter(Song.year.isnot(None)).order_by(Song.year.asc()).all()
    bucket = {}
    for s in songs:
        bucket.setdefault(s.year, []).append(s)

    out = []
    for year in sorted(bucket.keys()):
        items = bucket[year][:5]
        out.append({
            "year": year,
            "count": len(bucket[year]),
            "songs": [x.to_dict(minimal=True) for x in items]
        })
    return jsonify(out)

@api.get("/educational/playlists")
def playlists():
    """
    Playlists temáticas (predefinidas por lógica).
    """
    playlists = [
        {"id": "identidad", "title": "Identidad nicaragüense", "tag_hint": "identidad"},
        {"id": "tradicional", "title": "Tradición y folklore", "tag_hint": "folklore"},
        {"id": "memoria", "title": "Memoria histórica", "tag_hint": "historia"},
        {"id": "managua", "title": "Managua y su imaginario", "tag_hint": "managua"},
    ]

    results = []
    for p in playlists:
        items = (Song.query
                 .join(Song.tags, isouter=True)
                 .filter(Tag.name.ilike(f"%{p['tag_hint']}%"))
                 .limit(20).all())
        results.append({
            "id": p["id"],
            "title": p["title"],
            "items": [s.to_dict(minimal=True) for s in items]
        })
    return jsonify(results)
