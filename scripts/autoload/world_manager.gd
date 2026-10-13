extends Node
## WorldManager — config + Perlin + palette partagés.
## Accès global : `WorldManager.xxx`

signal config_changed(config: WorldConfig)
signal seed_changed(seed: int)
signal palette_changed(palette: TerrainPalette)

const DEFAULT_PALETTE := preload("res://resources/configs/terrain_palette.tres")

var config: WorldConfig
var palette: TerrainPalette
var perlin: Perlin
var generator: TerrainGenerator


func _ready() -> void:
	palette = DEFAULT_PALETTE.duplicate(true) as TerrainPalette
	if palette == null:
		palette = TerrainPalette.defaults()
	apply_config(WorldConfig.defaults())


func apply_config(new_config: WorldConfig) -> void:
	config = new_config.duplicate_config() if new_config else WorldConfig.defaults()
	config.sanitize()
	perlin = Perlin.new(config.seed)
	generator = TerrainGenerator.new(config, perlin)
	config_changed.emit(config)
	seed_changed.emit(config.seed)
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


func height_at_tile(tile_x: int, tile_y: int) -> float:
	return generator.height_at_tile(tile_x, tile_y)


func build_cell(tile_x: int, tile_y: int) -> CellData:
	return generator.build_cell(tile_x, tile_y)
