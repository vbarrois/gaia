class_name TerrainGenerator
extends RefCounted
## Génère hauteur + biome pour une tuile monde à partir de Perlin + WorldConfig.
## Port de `World.field` / `World.height` (JS), sans falloff d’île fixe :
## le monde Godot est conçu pour s’étendre (chunks), donc pas d’edge hard.

var config: WorldConfig
var perlin: Perlin
## Cicatrices héritées (WorldManager les remplit après spawn source).
var hotspots: Array = []
## Tuiles source (refuge propre) — pollution initiale forcée à 0.
var clean_tiles: Array[Vector2i] = []


func _init(p_config: WorldConfig, p_perlin: Perlin = null) -> void:
	config = p_config
	perlin = p_perlin if p_perlin != null else Perlin.new(p_config.seed)
	hotspots = []
	clean_tiles = []


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


## Pollution continue + cicatrices (hotspots). Fond élevé ; source = exception propre.
func pollution_at_world(world_x: float, world_z: float) -> float:
	var u := config.world_unit_per_tile
	var tx := floori(world_x / u)
	var tz := floori(world_z / u)
	if _is_clean_tile(tx, tz):
		return 0.0
	var noise := perlin.noise(world_x / 31.0 + 6.0, world_z / 31.0 + 22.0, 4.6)
	# Fond hérité fort (~55–90) — la carte part sale hors oasis.
	var ambient := clampf(config.pollution * 0.82 + noise * 16.0, 0.0, 92.0)
	var boost := hotspot_boost_at_tile(tx, tz)
	return clampf(ambient + boost, 0.0, 100.0)


func _is_clean_tile(tile_x: int, tile_y: int) -> bool:
	var t := Vector2i(tile_x, tile_y)
	for c in clean_tiles:
		if c == t:
			return true
	return false


func pollution_at_tile(tile_x: int, tile_y: int) -> float:
	var w := tile_to_world(tile_x, tile_y)
	return pollution_at_world(w.x, w.y)


func hotspot_boost_at_tile(tile_x: int, tile_y: int) -> float:
	var boost := 0.0
	for h in hotspots:
		if h == null:
			continue
		boost = maxf(boost, float(h.contribution_at(tile_x, tile_y)))
	return boost


func hotspot_at_tile(tile_x: int, tile_y: int):
	var best = null
	var best_c := 0.0
	for h in hotspots:
		if h == null:
			continue
		var c := float(h.contribution_at(tile_x, tile_y))
		if c > best_c:
			best_c = c
			best = h
	return best


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
		# Sol un peu plus généreux : fertilité exploitable hors oasis.
		cell.soil = clampf(52.0 - pol * 0.28, 0.0, 100.0)
		cell.moisture = clampf(39.0 + (config.water_level - h) * 1.1, 0.0, 100.0)
		# + jitter déterministe (port JS `rand() * 9`) pour densifier un peu la veg.
		var jitter := HashUtil.hash01(config.seed * 31 + tile_x + tile_y * 97) * 9.0
		cell.veg = clampf((100.0 - pol) * 0.31 + jitter, 0.0, 100.0)
	return cell
