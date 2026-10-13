class_name CellData
extends RefCounted
## Une case écologique (port partiel de `js/world/World.js` Cell).
## Les chunks stockent un tableau de CellData ; la simu éco viendra plus tard.

var tile_x: int = 0
var tile_y: int = 0
var height: float = 0.0
var biome: int = Biomes.Id.SOIL
var wet: bool = false
var pollution: float = 0.0
## Quantité / qualité de terre (0–100).
var soil: float = 50.0
var moisture: float = 50.0
var veg: float = 0.0
## True si une WaterSource est sur cette tuile.
var is_source: bool = false


func _init(
	p_tile_x: int = 0,
	p_tile_y: int = 0,
	p_height: float = 0.0,
	p_biome: int = Biomes.Id.SOIL
) -> void:
	tile_x = p_tile_x
	tile_y = p_tile_y
	height = p_height
	biome = p_biome
	wet = biome == Biomes.Id.WATER or biome == Biomes.Id.DEEP_WATER


## Fertilité dérivée : sol × humidité × (1 − pollution).
func fertility() -> float:
	return clampf(
		soil * (moisture / 100.0) * (1.0 - pollution / 100.0),
		0.0,
		100.0
	)


func to_dict() -> Dictionary:
	return {
		"tile_x": tile_x,
		"tile_y": tile_y,
		"height": height,
		"biome": biome,
		"wet": wet,
		"pollution": pollution,
		"soil": soil,
		"moisture": moisture,
		"veg": veg,
		"fertility": fertility(),
		"is_source": is_source,
	}
