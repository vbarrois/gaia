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
var soil: float = 50.0
var moisture: float = 50.0
var veg: float = 0.0


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
	}
