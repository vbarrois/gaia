class_name WaterSource
extends RefCounted
## Source d’eau ponctuelle — intensité → rayon / pouvoir d’humidification.

var tile: Vector2i = Vector2i.ZERO
## 1–10 typique ; plus fort = oasis plus large / plus humide.
var intensity: float = 4.0


func _init(p_tile: Vector2i = Vector2i.ZERO, p_intensity: float = 4.0) -> void:
	tile = p_tile
	intensity = clampf(p_intensity, 1.0, 10.0)


## Portée max en tuiles (Chebyshev).
func radius() -> int:
	return 2 + int(floor(intensity))


## Humidité cible 0–100 à distance Chebyshev `d` de la source.
func moisture_at_dist(d: int) -> float:
	var r := radius()
	if d < 0 or d > r:
		return 0.0
	var falloff := 1.0 - float(d) / float(r + 1)
	var power := intensity / 5.0
	return clampf(100.0 * falloff * power, 0.0, 100.0)


func contains_tile(t: Vector2i) -> bool:
	return t == tile


func world_radius(unit: float) -> float:
	return float(radius()) * unit
