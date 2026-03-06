from flask_sqlalchemy import SQLAlchemy
from sqlalchemy import UniqueConstraint

db = SQLAlchemy()

song_tags = db.Table(
    "song_tags",
    db.Column("song_id", db.Integer, db.ForeignKey("songs.id"), primary_key=True),
    db.Column("tag_id", db.Integer, db.ForeignKey("tags.id"), primary_key=True),
)

song_sources = db.Table(
    "song_sources",
    db.Column("song_id", db.Integer, db.ForeignKey("songs.id"), primary_key=True),
    db.Column("source_id", db.Integer, db.ForeignKey("sources.id"), primary_key=True),
)

song_genres = db.Table(
    "song_genres",
    db.Column("song_id", db.Integer, db.ForeignKey("songs.id"), primary_key=True),
    db.Column("genre_id", db.String(50), db.ForeignKey("genres.genre_id"), primary_key=True),
)

song_regions = db.Table(
    "song_regions",
    db.Column("song_id", db.Integer, db.ForeignKey("songs.id"), primary_key=True),
    db.Column("region_id", db.String(10), db.ForeignKey("regions.id"), primary_key=True),
)

class Region(db.Model):
    __tablename__ = "regions"
    id = db.Column(db.String(10), primary_key=True)  # antes Integer
    name = db.Column(db.String(120), nullable=False)
    parent = db.Column(db.String(120), nullable=True)
    description = db.Column(db.Text, nullable=True)

    songs = db.relationship("Song", secondary=song_regions, back_populates="regions")

    def to_dict(self):
        return {
            "id": self.id,
            "name": self.name,
            "parent": self.parent,
            "description": self.description,
        }

class Artist(db.Model):
    __tablename__ = "artists"
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(200), unique=True, nullable=False)
    birth_year = db.Column(db.Integer, nullable=True)
    death_year = db.Column(db.Integer, nullable=True)
    origin_region = db.Column(db.String(120), nullable=True)
    era = db.Column(db.String(120), nullable=True)
    cultural_contribuitions = db.Column(db.Text, nullable=True)
    bio = db.Column(db.Text, nullable=False, default="")
    active_era = db.Column(db.String(120), nullable=False, default="N/D")
    cultural_contributions = db.Column(db.Text, nullable=False, default="")
    photo_url = db.Column(db.String(500), nullable=True)

    songs = db.relationship("Song", back_populates="artist", cascade="all, delete-orphan")

    def to_dict(self, include_songs=False):
        data = {
            "id": self.id,
            "name": self.name,
            "birth_year": self.birth_year,
            "death_year": self.death_year,
            "origin_region": self.origin_region,
            "era": self.era,
            "cultural_contribuitions": self.cultural_contribuitions,
            "bio": self.bio,
            "active_era": self.active_era,
            "cultural_contributions": self.cultural_contributions,
            "photo_url": self.photo_url,
        }
        if include_songs:
            data["songs"] = [s.to_dict(minimal=True) for s in self.songs]
        return data

class Tag(db.Model):
    __tablename__ = "tags"
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(80), unique=True, nullable=False)
    category = db.Column(db.String(120), nullable=True)
    description = db.Column(db.Text, nullable=True)

    songs = db.relationship("Song", secondary=song_tags, back_populates="tags")

    def to_dict(self):
        return {
            "id": self.id,
            "name": self.name,
            "category": self.category,
            "description": self.description,
        }

class Genre(db.Model):
    __tablename__ = "genres"
    genre_id = db.Column(db.String(50), primary_key=True)  # antes Integer
    name = db.Column(db.String(120), unique=True, nullable=False)
    description = db.Column(db.Text, nullable=True)

    songs = db.relationship("Song", secondary=song_genres, back_populates="genres")

    def to_dict(self):
        return {
            "genre_id": self.genre_id,
            "name": self.name,
            "description": self.description,
        }

class Source(db.Model):
    __tablename__ = "sources"
    id = db.Column(db.Integer, primary_key=True)
    title = db.Column(db.String(250), nullable=False)
    url = db.Column(db.String(800), nullable=True)
    note = db.Column(db.String(500), nullable=True)

    __table_args__ = (
        UniqueConstraint("title", "url", name="uq_sources_title_url"),
    )

    def to_dict(self):
        return {"id": self.id, "title": self.title, "url": self.url, "note": self.note}

class Song(db.Model):
    __tablename__ = "songs"
    id = db.Column(db.Integer, primary_key=True)
    title = db.Column(db.String(250), nullable=False)
    year = db.Column(db.Integer, nullable=True)
    iconic_score = db.Column(db.Float, nullable=False, default=0)
    decade = db.Column(db.String(20), nullable=True)
    link = db.Column(db.String(800), nullable=True)
    description = db.Column(db.Text, nullable=True)
    genre = db.Column(db.String(120), nullable=False, default="N/D")
    duration_seconds = db.Column(db.Integer, nullable=True)
    cover_url = db.Column(db.String(800), nullable=True)
    audio_url = db.Column(db.String(800), nullable=True)

    history_context = db.Column(db.Text, nullable=False, default="")
    cultural_influence = db.Column(db.Text, nullable=False, default="")
    references_text = db.Column(db.Text, nullable=False, default="")  # opcional (texto libre)

    artist_id = db.Column(db.Integer, db.ForeignKey("artists.id"), nullable=False)
    region_id = db.Column(db.Integer, db.ForeignKey("regions.id"), nullable=True)

    artist = db.relationship("Artist", back_populates="songs")
    region = db.relationship("Region")
    tags = db.relationship("Tag", secondary=song_tags, back_populates="songs")
    genres = db.relationship("Genre", secondary=song_genres, back_populates="songs")
    regions = db.relationship("Region", secondary=song_regions, back_populates="songs")
    sources = db.relationship("Source", secondary=song_sources, backref="songs")

    __table_args__ = (
        UniqueConstraint("title", "artist_id", name="uq_song_title_artist"),
    )

    def to_dict(self, minimal=False):
        data = {
            "id": self.id,
            "title": self.title,
            "artist": {"id": self.artist.id, "name": self.artist.name} if self.artist else None,
            "year": self.year,
            "iconic_score": self.iconic_score,
            "decade": self.decade,
            "link": self.link,
            "description": self.description,
            "genre": self.genre,
            "region": self.region.to_dict() if self.region else None,
            "genres": [g.to_dict() for g in self.genres],
            "regions": [r.to_dict() for r in self.regions],
            "duration": self.duration_seconds,
            "cover_url": self.cover_url,
            "audio_url": self.audio_url,
        }
        if minimal:
            return data

        data.update({
            "history_context": self.history_context,
            "cultural_influence": self.cultural_influence,
            "references_text": self.references_text,
            "tags": [t.to_dict() for t in self.tags],
            "sources": [s.to_dict() for s in self.sources],
        })
        return data

class AdminUser(db.Model):
    __tablename__ = "admin_users"
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(80), unique=True, nullable=False)
    password_hash = db.Column(db.String(255), nullable=False)
