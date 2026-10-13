extends Node
## WorldManager — config + Perlin + palette + vent (lecture).
## Accès global : `WorldManager.xxx`
## Vent : cible journalière discrète, angle courant lissé (tourne progressivement).

signal config_changed(config: WorldConfig)
signal seed_changed(seed: int)
signal palette_changed(palette: TerrainPalette)
signal wind_changed(wind: WindState)

const DEFAULT_PALETTE := preload("res://resources/configs/terrain_palette.tres")
## Vitesse de rotation vers la cible (plus haut = plus vite).
const WIND_TURN_SPEED := 1.35
const WIND_STRENGTH_SPEED := 1.8

var config: WorldConfig
var palette: TerrainPalette
var perlin: Perlin
var generator: TerrainGenerator
## Cible du jour (label HUD).
var wind: WindState = WindState.new()
## Angle / force courants (visuels + traits).
var wind_angle: float = -PI * 0.5
var wind_angle_target: float = -PI * 0.5
var wind_strength_f: float = 1.0
var wind_strength_target: float = 1.0
var wind_ready: bool = false


func _ready() -> void:
	palette = DEFAULT_PALETTE.duplicate(true) as TerrainPalette
	if palette == null:
		palette = TerrainPalette.defaults()
	apply_config(WorldConfig.defaults())
	call_deferred("_bind_time")
	set_process(true)


func _bind_time() -> void:
	if not TimeManager.day_advanced.is_connected(_on_day_advanced):
		TimeManager.day_advanced.connect(_on_day_advanced)
	refresh_wind(true)


func _on_day_advanced(_day: int) -> void:
	refresh_wind(false)


func _process(delta: float) -> void:
	if not wind_ready:
		return
	var t_ang := 1.0 - exp(-WIND_TURN_SPEED * delta)
	var t_str := 1.0 - exp(-WIND_STRENGTH_SPEED * delta)
	wind_angle = lerp_angle(wind_angle, wind_angle_target, t_ang)
	wind_strength_f = lerpf(wind_strength_f, wind_strength_target, t_str)
	# Visuels lisent wind_angle / wind_strength_f chaque frame.


func apply_config(new_config: WorldConfig) -> void:
	config = new_config.duplicate_config() if new_config else WorldConfig.defaults()
	config.sanitize()
	perlin = Perlin.new(config.seed)
	generator = TerrainGenerator.new(config, perlin)
	config_changed.emit(config)
	seed_changed.emit(config.seed)
	refresh_wind(true)
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


## snap=true : aligne tout de suite (boot / reseed). false : tourne vers la nouvelle cible.
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


## Multiplicateur de vitesse des traits (≈ 1 faible → ≈ 2 fort), lissé.
func wind_speed_factor() -> float:
	return wind_strength_f


func height_at_tile(tile_x: int, tile_y: int) -> float:
	return generator.height_at_tile(tile_x, tile_y)


func build_cell(tile_x: int, tile_y: int) -> CellData:
	return generator.build_cell(tile_x, tile_y)
