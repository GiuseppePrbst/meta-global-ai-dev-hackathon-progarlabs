"""Public media library: approved assets only, each with license, attribution and review state.

Two sources feed one contract:
- external records already in taxa.json (Commons/iNaturalist links, license and author
  recorded), exposed as assets without copying them;
- resources/media-assets.json, where owner or licensed assets are approved before they
  can be served. It is empty until their rights are confirmed.

Private research material (originals, EXIF/GPS, thumbnails, SAM inputs) never reaches
this module: `publication_status` only admits `public_approved`, and extra fields such as
coordinates or local paths are rejected by the schema.
"""

import json
import re
from functools import lru_cache
from importlib.resources import files
from typing import Annotated, Literal

from fastapi import HTTPException, Query
from pydantic import BaseModel, ConfigDict, Field, TypeAdapter, model_validator

from bosque_api.biodiversity import get_taxa

MediaType = Literal["image", "video"]
VisualRole = Literal[
    "arbol_completo",
    "copa",
    "tronco",
    "corteza",
    "rama",
    "hoja",
    "enves",
    "flor",
    "fruto",
    "helecho",
    "arbusto",
    "sotobosque",
    "hongo",
    "animal",
    "habitat",
    "paisaje",
    "sin_organismo",
    "no_evaluado",
]
Redistribution = Literal["yes", "with_attribution", "share_alike_with_attribution"]
# Derivatives or commercial reuse are not allowed for these; the product never serves them.
BLOCKED_LICENSE_MARKERS = ("NC", "ND")


class MediaAsset(BaseModel):
    """A served asset. Unknown fields fail: coordinates, paths and private IDs cannot leak."""

    model_config = ConfigDict(extra="forbid")
    asset_id: str = Field(pattern=r"^[a-z0-9]+(?:-[a-z0-9]+)*$")
    taxon_id: str | None = Field(default=None, pattern=r"^[a-z]+(?:-[a-z]+)+$")
    media_type: MediaType
    visual_role: VisualRole
    title: str = Field(min_length=3)
    alt_text: str = Field(min_length=10)
    caption: str = Field(min_length=3)
    source_type: Literal["external", "owner"]
    creator: str | None = None
    source_url: str = Field(pattern=r"^https://")
    public_url: str = Field(pattern=r"^https://")
    thumbnail_url: str | None = Field(default=None, pattern=r"^https://")
    license: str = Field(min_length=3)
    attribution: str = Field(min_length=10)
    redistribution: Redistribution
    width: int | None = Field(default=None, gt=0)
    height: int | None = Field(default=None, gt=0)
    duration_seconds: float | None = Field(default=None, gt=0)
    fps: float | None = Field(default=None, gt=0)
    review_status: Literal["platform_label_only", "agent_visual_check", "specialist_validated"]
    publication_status: Literal["public_approved"]
    location_scope: Literal["undisclosed", "general_region"] = "undisclosed"

    @model_validator(mode="after")
    def rights_are_usable(self):
        if any(
            marker in self.license.upper().replace("-", " ").split()
            for marker in BLOCKED_LICENSE_MARKERS
        ):
            raise ValueError("Licencias NC o ND no se sirven en el producto")
        if self.media_type == "video" and self.duration_seconds is None:
            raise ValueError("Un video requiere duración")
        return self


class MediaPage(BaseModel):
    items: list[MediaAsset]
    total: int
    limit: int
    offset: int


def _slug(value: str) -> str:
    return re.sub(r"[^a-z0-9]+", "-", value.lower()).strip("-")


def _from_taxon_media() -> list[MediaAsset]:
    """Each taxa.json photo becomes one asset; the record is not duplicated on disk."""
    assets = []
    for taxon in get_taxa():
        for media in taxon.media:
            assets.append(
                MediaAsset(
                    asset_id=f"ext-{_slug(media.media_id)}",
                    taxon_id=taxon.id,
                    media_type="image",
                    visual_role="no_evaluado",
                    title=f"{taxon.common_names[0]} ({taxon.scientific_name})",
                    alt_text=f"Fotografía de {taxon.scientific_name}; vista sin evaluar.",
                    caption="Fotografía externa enlazada con licencia y autor registrados.",
                    source_type="external",
                    creator=media.author,
                    source_url=media.source_url,
                    public_url=media.media_url,
                    license=media.license,
                    attribution=media.attribution,
                    redistribution=media.redistribution,
                    review_status=media.review_status,
                    publication_status="public_approved",
                )
            )
    return assets


@lru_cache
def get_media() -> tuple[MediaAsset, ...]:
    content = (
        files("bosque_api").joinpath("resources/media-assets.json").read_text(encoding="utf-8")
    )
    owned = TypeAdapter(list[MediaAsset]).validate_python(json.loads(content))
    assets = [*_from_taxon_media(), *owned]
    ids = [a.asset_id for a in assets]
    if len(set(ids)) != len(ids):
        raise ValueError("Biblioteca multimedia con IDs duplicados")
    taxa = {t.id for t in get_taxa()}
    if any(a.taxon_id and a.taxon_id not in taxa for a in assets):
        raise ValueError("Medio asociado a un taxón inexistente")
    return tuple(assets)


def register_media_routes(app):
    @app.get("/taxa/{taxon_id}/media", response_model=MediaPage)
    def taxon_media(
        taxon_id: str,
        media_type: MediaType | None = None,
        visual_role: VisualRole | None = None,
        limit: Annotated[int, Query(ge=1, le=100)] = 50,
        offset: Annotated[int, Query(ge=0, le=10000)] = 0,
    ):
        """Approved media for one taxon. Private research material is never listed here."""
        if taxon_id not in {t.id for t in get_taxa()}:
            raise HTTPException(404, "Taxón no encontrado")
        items = [
            a
            for a in get_media()
            if a.taxon_id == taxon_id
            and (media_type is None or a.media_type == media_type)
            and (visual_role is None or a.visual_role == visual_role)
        ]
        return MediaPage(
            items=items[offset : offset + limit], total=len(items), limit=limit, offset=offset
        )

    @app.get("/media/{asset_id}", response_model=MediaAsset)
    def media_asset(asset_id: str):
        asset = next((a for a in get_media() if a.asset_id == asset_id), None)
        if asset is None:
            raise HTTPException(404, "Medio no disponible")
        return asset
