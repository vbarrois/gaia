extends Node
## WorldManager — config + Perlin + palette + vent + éco (source / capillarité).
## Accès global : `WorldManager.xxx`

const PollutionHotspotScr := preload("res://scripts/world/pollution_hotspot.gd")

signal config_changed(config: WorldConfig)
signal seed_changed(seed: int)
signal palette_changed(palette: TerrainPalette)
signal wind_changed(wind: WindState)
signal sources_changed()
signal eco_changed()
signal view_layer_changed(layer: int)

enum ViewLayer { NATURAL, SOIL, MOISTURE, POLLUTION, FERTILITY }

const DEFAULT_PALETTE := preload("res://resources/configs/terrain_palette.tres")
const DEFAULT_SOURCE_INTENSITY := 4.0
const WIND_TURN_SPEED := 1.35
const WIND_STRENGTH_SPEED := 1.8
const VIEW_LAYER_NAMES := ["Naturel", "Sol", "Humidité", "Pollution", "Fertilité"]

var config: WorldConfig
var palette: TerrainPalette
var perlin: Perlin
var generator: TerrainGenerator
## Overlay colorimétrique carte (1–5 / cycle).
var view_layer: int = ViewLayer.NATURAL

var wind: WindState = WindState.new()
var wind_angle: float = -PI * 0.5
var wind_angle_target: float = -PI * 0.5
var wind_strength_f: float = 1.0
var wind_strength_target: float = 1.0
var wind_ready: bool = false

## Sources d’eau actives.
var sources: Array[WaterSource] = []
## Cicatrices toxiques (héritage) autour de la source.
var hotspots: Array = []
## Overrides live : Vector2i → { soil, moisture, pollution, veg }.
var eco: Dictionary = {}


func _ready() -> void:
	palette = DEFAULT_PALETTE.duplicate(true) as TerrainPalette
	if palette == null:
		palette = TerrainPalette.defaults()
	apply_config(WorldConfig.defaults())
	call_deferred("_bind_time")
	set_process(true)


func _bind_time() -> void:
	if not TimeManager.days_advanced.is_connected(_on_days_advanced):
		TimeManager.days_advanced.connect(_on_days_advanced)
	refresh_wind(true)
	bootstrap_eco()


## Un seul tick vent + N steps éco + un eco_changed (évite le spam au tempo élevé).
func _on_days_advanced(_day: int, count: int) -> void:
	if count <= 0:
		return
	refresh_wind(false)
	if generator == null or sources.is_empty():
		return
	for _i in count:
		_step_eco_once()
	eco_changed.emit()


func _process(delta: float) -> void:
	if not wind_ready:
		return
	var t_ang := 1.0 - exp(-WIND_TURN_SPEED * delta)
	var t_str := 1.0 - exp(-WIND_STRENGTH_SPEED * delta)
	wind_angle = lerp_angle(wind_angle, wind_angle_target, t_ang)
	wind_strength_f = lerpf(wind_strength_f, wind_strength_target, t_str)


func apply_config(new_config: WorldConfig) -> void:
	config = new_config.duplicate_config() if new_config else WorldConfig.defaults()
	config.sanitize()
	perlin = Perlin.new(config.seed)
	generator = TerrainGenerator.new(config, perlin)
	config_changed.emit(config)
	seed_changed.emit(config.seed)
	refresh_wind(true)
	bootstrap_eco()
	print("[WorldManager] seed=%d scale=%.1f water=%.1f" % [config.seed, config.scale, config.water_level])


func apply_palette(new_palette: TerrainPalette, reload_chunks: bool = true) -> void:
	if new_palette == null:
		palette = DEFAULT_PALETTE.duplicate(true) as TerrainPalette
	else:
		palette = new_palette.duplicate(true) as TerrainPalette
	palette_changed.emit(palette)
	print("[WorldManager] palette updated (sat=%.2f)" % palette.saturation_boost)
	if reload_chunks and ChunkManager.draw_map != null:
		ChunkManager.reload_all()
		if GameManager.draw_map and GameManager.draw_map.has_method("_setup_water"):
			GameManager.draw_map._setup_water()


func reseed(new_seed: int = -1) -> void:
	if new_seed < 0:
		new_seed = randi_range(1, 999_999)
	config.seed = new_seed
	apply_config(config)
	ChunkManager.reload_all()


func refresh_wind(snap: bool = false) -> void:
	if config == null or perlin == null:
		return
	var day := 1
	if TimeManager:
		day = TimeManager.day
	wind = WindState.from_day(config.seed, day)
	wind_angle_target = wind.angle_radians()
	wind_strength_target = float(wind.strength)
	if snap or not wind_ready:
		wind_angle = wind_angle_target
		wind_strength_f = wind_strength_target
		wind_ready = true
	wind_changed.emit(wind)


func wind_vector() -> Vector3:
	return WindState.vector_from_angle(wind_angle)


func wind_speed_factor() -> float:
	return wind_strength_f


func set_view_layer(layer: int) -> void:
	var next := clampi(layer, ViewLayer.NATURAL, ViewLayer.FERTILITY)
	if next == view_layer:
		return
	view_layer = next
	view_layer_changed.emit(view_layer)
	print("[WorldManager] couche = %s" % view_layer_name())


func cycle_view_layer(delta: int = 1) -> void:
	var count := VIEW_LAYER_NAMES.size()
	set_view_layer(posmod(view_layer + delta, count))


func view_layer_name() -> String:
	return VIEW_LAYER_NAMES[view_layer]


## Place 1 source + hotspots + première capillarité.
func bootstrap_eco() -> void:
	if generator == null:
		return
	sources.clear()
	eco.clear()
	hotspots.clear()
	if generator:
		generator.hotspots = []
		generator.clean_tiles = []
	var tile := _find_spawn_source_tile()
	sources.append(WaterSource.new(tile, DEFAULT_SOURCE_INTENSITY))
	generator.clean_tiles = [tile]
	_bootstrap_hotspots(tile)
	EcoSim._seed_hotspot_tiles(eco, generator)
	_step_eco_once()
	sources_changed.emit()
	eco_changed.emit()
	print("[WorldManager] source @ (%d,%d) intensity=%.1f radius=%d  hotspots=%d" % [
		tile.x, tile.y, DEFAULT_SOURCE_INTENSITY, sources[0].radius(), hotspots.size()
	])
	for h in hotspots:
		print(
			"[WorldManager] hotspot @ (%d,%d) r=%d peak=%.0f"
			% [h.tile.x, h.tile.y, h.radius, h.peak]
		)


func _bootstrap_hotspots(anchor: Vector2i) -> void:
	if config == null or generator == null:
		return
	hotspots = PollutionHotspotScr.generate_around(
		config.seed,
		anchor,
		config.hotspot_count,
		config.hotspot_radius_min,
		config.hotspot_radius_max,
		config.hotspot_peak_min,
		config.hotspot_peak_max,
		config.hotspot_min_dist,
		config.hotspot_max_dist,
		generator
	)
	generator.hotspots = hotspots


func hotspot_at(tile: Vector2i):
	if generator == null:
		return null
	return generator.hotspot_at_tile(tile.x, tile.y)


func step_eco() -> void:
	if generator == null or sources.is_empty():
		return
	_step_eco_once()
	eco_changed.emit()


func _step_eco_once() -> void:
	var wdir := EcoSim.wind_tile_dir_from_vector(wind_vector())
	var strong := wind != null and wind.strength >= WindState.STRENGTH_STRONG
	EcoSim.step_day(sources, eco, generator, wdir, strong)


## Chunks touchés par source / hotspots / zone lessivage — pour recolor ciblé.
func eco_affected_chunk_coords() -> Array[Vector2i]:
	var out: Array[Vector2i] = []
	var seen: Dictionary = {}
	if config == null:
		return out
	var size := config.chunk_size
	# Pad mesh/arbres = reach source + hotspots (pas tout POLLUTION_SIM_RADIUS → hitch ×100).
	for src in sources:
		_append_chunk_pad(seen, out, src.tile, EcoSim.max_reach(src) + 2, size)
	for h in hotspots:
		if h == null:
			continue
		_append_chunk_pad(seen, out, h.tile, int(h.radius) + 3, size)
	return out


func _append_chunk_pad(
	seen: Dictionary, out: Array[Vector2i], center: Vector2i, reach: int, size: int
) -> void:
	var t0 := Vector2i(center.x - reach, center.y - reach)
	var t1 := Vector2i(center.x + reach, center.y + reach)
	var c0 := Vector2i(floori(float(t0.x) / float(size)), floori(float(t0.y) / float(size)))
	var c1 := Vector2i(floori(float(t1.x) / float(size)), floori(float(t1.y) / float(size)))
	for cy in range(c0.y, c1.y + 1):
		for cx in range(c0.x, c1.x + 1):
			var c := Vector2i(cx, cy)
			if seen.has(c):
				continue
			seen[c] = true
			out.append(c)


func _find_spawn_source_tile() -> Vector2i:
	# Cherche une tuile sèche près de l’origine (pas sous l’eau).
	var best := Vector2i.ZERO
	var best_score := -INF
	for r in range(0, 24):
		for dz in range(-r, r + 1):
			for dx in range(-r, r + 1):
				if maxi(absi(dx), absi(dz)) != r:
					continue
				var t := Vector2i(dx, dz)
				var cell := generator.build_cell(t.x, t.y)
				if cell.wet:
					continue
				var score := cell.height - float(r) * 0.35
				if score > best_score:
					best_score = score
					best = t
		if best_score > -INF and r >= 2:
			break
	return best


func primary_source() -> WaterSource:
	if sources.is_empty():
		return null
	return sources[0]


func source_at(tile: Vector2i) -> WaterSource:
	for s in sources:
		if s.tile == tile:
			return s
	return null


func height_at_tile(tile_x: int, tile_y: int) -> float:
	return generator.height_at_tile(tile_x, tile_y)


func build_cell(tile_x: int, tile_y: int) -> CellData:
	return get_cell(tile_x, tile_y)


## Baseline générateur + overrides eco + flag source.
func get_cell(tile_x: int, tile_y: int) -> CellData:
	var cell := generator.build_cell(tile_x, tile_y)
	var key := Vector2i(tile_x, tile_y)
	if eco.has(key):
		var e: Dictionary = eco[key]
		cell.soil = float(e.get("soil", cell.soil))
		cell.moisture = float(e.get("moisture", cell.moisture))
		# Pollution live si écrite ; sinon baseline (bruit + hotspot).
		if e.has("pollution"):
			cell.pollution = float(e["pollution"])
		# Veg live (conso / croissance EcoSim) ; sinon formule pollution.
		if e.has("veg"):
			cell.veg = float(e["veg"])
		elif not cell.wet and config != null:
			var jitter := HashUtil.hash01(config.seed * 31 + tile_x + tile_y * 97) * 9.0
			cell.veg = clampf((100.0 - cell.pollution) * 0.31 + jitter, 0.0, 100.0)
	cell.is_source = source_at(key) != null
	cell.is_hotspot = hotspot_at(key) != null
	return cell
