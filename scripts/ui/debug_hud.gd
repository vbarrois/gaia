extends CanvasLayer
## HUD debug — seed, chunks, LOD queue, triangles, tuile.

@onready var label: Label = $Margin/Label

var _hover: Dictionary = {}
var _pending: int = 0
var _tris: int = 0


func _ready() -> void:
	InputManager.tile_hovered.connect(_on_hover)
	InputManager.tile_selected.connect(_on_select)
	WorldManager.seed_changed.connect(func(_s): _refresh())
	ChunkManager.chunk_loaded.connect(func(_c): _refresh())
	ChunkManager.chunk_unloaded.connect(func(_c): _refresh())
	ChunkManager.build_stats.connect(_on_build_stats)
	TimeManager.day_advanced.connect(func(_d): _refresh())
	_refresh()


func _process(_delta: float) -> void:
	_refresh()


func _on_hover(_tile: Vector2i, data: Dictionary) -> void:
	_hover = data


func _on_select(_tile: Vector2i, data: Dictionary) -> void:
	_hover = data


func _on_build_stats(pending: int, triangles: int) -> void:
	_pending = pending
	_tris = triangles


func _refresh() -> void:
	if label == null:
		return
	var world_seed: int = WorldManager.config.seed if WorldManager.config else 0
	var chunks: int = ChunkManager.loaded_count()
	var day: int = TimeManager.day
	var state_name: String = str(GameManager.State.keys()[GameManager.state])
	var lines: PackedStringArray = [
		"Gaïa · Godot 3D",
		"État : %s  ·  Jour %d  ·  Seed %d" % [state_name, day, world_seed],
		"Chunks : %d  ·  queue build : %d  ·  tris : %d" % [chunks, _pending, _tris],
		"Clic gauche drag = orbit  ·  Droit = pan  ·  Molette = zoom",
		"WASD = déplacer  ·  T = vue dessus  ·  F = reset  ·  R = seed  ·  Espace = pause",
	]
	if not _hover.is_empty():
		lines.append(
			"Tuile (%d,%d)  biome=%s  h=%.1f  pol=%.0f  wet=%s"
			% [
				int(_hover.get("tile_x", 0)),
				int(_hover.get("tile_y", 0)),
				Biomes.name_of(int(_hover.get("biome", 0))),
				float(_hover.get("height", 0.0)),
				float(_hover.get("pollution", 0.0)),
				str(_hover.get("wet", false)),
			]
		)
	label.text = "\n".join(lines)
