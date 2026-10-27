from typing import Annotated, Literal, Protocol

from pydantic import BaseModel, ConfigDict, Field, model_validator
from shapely.geometry import shape

Longitude = Annotated[float, Field(ge=-180, le=180, allow_inf_nan=False)]
Latitude = Annotated[float, Field(ge=-90, le=90, allow_inf_nan=False)]
Position = tuple[Longitude, Latitude]


class Point(BaseModel):
    model_config = ConfigDict(extra="forbid")

    type: Literal["Point"] = "Point"
    coordinates: Position


class Polygon(BaseModel):
    model_config = ConfigDict(extra="forbid")

    type: Literal["Polygon"] = "Polygon"
    coordinates: list[list[Position]] = Field(min_length=1, max_length=20)

    @model_validator(mode="after")
    def closed_rings(self):
        for ring in self.coordinates:
            if not 4 <= len(ring) <= 1000 or ring[0] != ring[-1]:
                raise ValueError(
                    "Cada anillo debe ser cerrado y tener de 4 a 1000 posiciones"
                )
        geometry = shape(self.model_dump())
        if not geometry.is_valid or geometry.area == 0:
            raise ValueError(
                "El polígono debe ser válido y tener área distinta de cero"
            )
        return self


class ForestSource(BaseModel):
    id: str
    name: str
    source_url: str
    version: str
    license: str
    attribution: str
    accessed_at: str
    redistribution: str
    processing: str
    validation_owner: str
    status: Literal["not_configured", "ready"]
    interpretation: str


class CanopyStatistics(BaseModel):
    source_id: str
    valid_pixels: int = Field(ge=1)
    mean_height_m: float = Field(ge=0, allow_inf_nan=False)
    min_height_m: float = Field(ge=0, allow_inf_nan=False)
    max_height_m: float = Field(ge=0, allow_inf_nan=False)
    estimated: Literal[True] = True


class CanopyProvider(Protocol):
    def analyze(self, area: Polygon) -> CanopyStatistics: ...


CHMV2_SOURCE = ForestSource(
    id="chmv2",
    name="Meta/WRI Canopy Height Maps v2",
    source_url="https://registry.opendata.aws/dataforgood-fb-forestsv2/",
    version="v2",
    license="CC-BY-4.0",
    attribution=(
        "Meta and World Resources Institute (WRI), 2026. CHMv2. "
        "Source imagery for CHM © 2016 Vantor. Accessed 27 October 2026."
    ),
    accessed_at="2026-10-27",
    redistribution="Dataset CC BY 4.0 con atribución; no concede derechos sobre imagen fuente.",
    processing="Solo registro de metadatos; no se descargó ni procesó ningún raster.",
    validation_owner="Giuseppe Proboste: validación geoespacial local pendiente",
    status="not_configured",
    interpretation="Altura de copa estimada en metros; no es medición directa ni crecimiento anual.",
)


class UnconfiguredCanopyProvider:
    def analyze(self, area: Polygon) -> CanopyStatistics:
        raise NotImplementedError(
            "CHMv2 no configurado: falta seleccionar y validar una fuente COG permitida."
        )
