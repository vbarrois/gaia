class_name TerrainGenerator
extends RefCounted
## Génère hauteur + biome pour une tuile monde à partir de Perlin + WorldConfig.
## Port de `World.field` / `World.height` (JS), sans falloff d’île fixe :
## le monde Godot est conçu pour s’étendre (chunks), donc pas d’edge hard.

var config: WorldConfig
var perlin: Perlin


func _init(p_config: WorldConfig, p_perlin: Perlin = null) -> void:
	config = p_config
	perlin = p_perlin if p_perlin != null else Perlin.new(p_config.seed)


## Coordonnées monde « JS-like » (unités continues) à partir d’indices de tuile.
func tile_to_world(tile_x: int, tile_y: int) -> Vector2:
	var u := config.world_unit_per_tile
	return Vector2((tile_x + 0.5) * u, (tile_y + 0.5) * u)


func field(world_x: float, world_z: float) -> float:
	var s := config.scale
	var n := perlin
	var wx := n.noise((world_x / s) * 0.65 + 19.0, (world_z / s) * 0.65 + 11.0, 2.17) * config.warp
	var wz := n.noise((world_x / s) * 0.65 - 31.0, (world_z / s) * 0.65 + 8.0, 7.39) * config.warp
	return n.fbm(
		(world_x + wx) / s + 0.137,
		(world_z + wz) / s + 0.873,
		config.octaves,
		config.persistence
	)


func height_at_world(world_x: float, world_z: float) -> float:
	# Sans falloff d’île : le relief reste cohérent à l’infini (chunks).
	var f := field(world_x, world_z)
	return 10.0 + f * config.amplitude * 1.72


func height_at_tile(tile_x: int, tile_y: int) -> float:
	var w := tile_to_world(tile_x, tile_y)
	return height_at_world(w.x, w.y)


## Pollution continue en monde (même bruit des deux côtés d’un bord de chunk).
func pollution_at_world(world_x: float, world_z: float) -> float:
	var noise := perlin.noise(world_x / 31.0 + 6.0, world_z / 31.0 + 22.0, 4.6)
	return clampf(config.pollution + noise * 54.0, 0.0, 100.0)


func pollution_at_tile(tile_x: int, tile_y: int) -> float:
	var w := tile_to_world(tile_x, tile_y)
	return pollution_at_world(w.x, w.y)


func build_cell(tile_x: int, tile_y: int) -> CellData:
	var h := height_at_tile(tile_x, tile_y)
	var pol := pollution_at_tile(tile_x, tile_y)
	var biome := Biomes.from_height(h, config.water_level, pol)
	var cell := CellData.new(tile_x, tile_y, h, biome)
	cell.pollution = pol
	cell.wet = biome == Biomes.Id.WATER or biome == Biomes.Id.DEEP_WATER
	if cell.wet:
		cell.moisture = 100.0
		cell.veg = 0.0
		cell.soil = 20.0
	else:
		cell.soil = clampf(36.0 - pol * 0.22, 0.0, 100.0)
		cell.moisture = clampf(39.0 + (config.water_level - h) * 1.1, 0.0, 100.0)
		# + jitter déterministe (port JS `rand() * 9`) pour densifier un peu la veg.
		var jitter := HashUtil.hash01(config.seed * 31 + tile_x + tile_y * 97) * 9.0
		cell.veg = clampf((100.0 - pol) * 0.31 + jitter, 0.0, 100.0)
	return cell
