extends CanvasLayer
## HUD debug — seed, chunks, LOD queue, triangles, tuile.
## Vent : boussole coin haut-droit (pas de flèches plein plateau).
## Tempo : − / + en bas à gauche (paliers pause → 3×).

@onready var label: Label = $Margin/Label
@onready var wind_label: Label = %WindLabel
@onready var tempo_label: Label = %TempoLabel
@onready var slower_btn: Button = %Slower
@onready var faster_btn: Button = %Faster

var _hover: Dictionary = {}
var _pending: int = 0
var _tris: int = 0


func _ready() -> void:
	InputManager.tile_hovered.connect(_on_hover)
	InputManager.tile_selected.connect(_on_select)
	WorldManager.seed_changed.connect(func(_s): _refresh())
	WorldManager.wind_changed.connect(func(_w): _refresh())
	WorldManager.eco_changed.connect(_on_eco_changed)
	WorldManager.sources_changed.connect(func(): _refresh())
	WorldManager.view_layer_changed.connect(func(_l): _refresh())
	ChunkManager.chunk_loaded.connect(func(_c): _refresh())
	ChunkManager.chunk_unloaded.connect(func(_c): _refresh())
	ChunkManager.build_stats.connect(_on_build_stats)
	TimeManager.day_advanced.connect(func(_d): _refresh())
	TimeManager.speed_changed.connect(func(_s): _refresh())
	if slower_btn:
		slower_btn.pressed.connect(TimeManager.slower)
	if faster_btn:
		faster_btn.pressed.connect(TimeManager.faster)
	# HUD à ~4 Hz (pas chaque frame — évite le saccadé en ×10).
	var hud_tick := Timer.new()
	hud_tick.wait_time = 0.25
	hud_tick.autostart = true
	hud_tick.timeout.connect(_refresh)
	add_child(hud_tick)
	_refresh()


func _on_hover(_tile: Vector2i, data: Dictionary) -> void:
	_hover = data


func _on_select(_tile: Vector2i, data: Dictionary) -> void:
	_hover = data


func _on_build_stats(pending: int, triangles: int) -> void:
	_pending = pending
	_tris = triangles


func _on_eco_changed() -> void:
	if not _hover.is_empty():
		var tx := int(_hover.get("tile_x", 0))
		var ty := int(_hover.get("tile_y", 0))
		_hover = WorldManager.get_cell(tx, ty).to_dict()
	_refresh()


func _refresh() -> void:
	if label == null:
		return
	var world_seed: int = WorldManager.config.seed if WorldManager.config else 0
	var chunks: int = ChunkManager.loaded_count()
	var day: int = TimeManager.day
	var state_name: String = str(GameManager.State.keys()[GameManager.state])
	var tempo := TimeManager.speed_label()
	var lines: PackedStringArray = [
		"Gaïa · Godot 3D",
		"État : %s  ·  Jour %d  ·  Tempo %s  ·  Seed %d" % [state_name, day, tempo, world_seed],
		"Couche : %s  ·  1–5 ou L" % WorldManager.view_layer_name(),
		"Chunks : %d  ·  queue build : %d  ·  tris : %d" % [chunks, _pending, _tris],
		"Clic gauche drag = orbit  ·  Droit = pan  ·  Molette = zoom",
		"WASD = déplacer  ·  T = vue dessus  ·  F = reset  ·  R = seed  ·  Espace = pause  ·  −/+ = tempo  ·  G = grille chunks",
	]
	var map := GameManager.draw_map if GameManager else null
	if map and map.get("show_chunk_grid") == true:
		lines[3] = lines[3] + "  ·  GRILLE ON"
	if tempo_label:
		tempo_label.text = "Tempo %s" % tempo
	if slower_btn:
		slower_btn.disabled = TimeManager.effective_speed() <= 0.0
	if faster_btn:
		faster_btn.disabled = TimeManager.effective_speed() >= TimeManager.SPEED_STEPS[-1]
	if not _hover.is_empty():
		var src_tag := "  ·  SOURCE" if bool(_hover.get("is_source", false)) else ""
		lines.append(
			"Tuile (%d,%d)  biome=%s  h=%.1f%s"
			% [
				int(_hover.get("tile_x", 0)),
				int(_hover.get("tile_y", 0)),
				Biomes.name_of(int(_hover.get("biome", 0))),
				float(_hover.get("height", 0.0)),
				src_tag,
			]
		)
		lines.append(
			"sol %.0f  ·  humidité %.0f  ·  pollution %.0f  ·  fertilité %.0f"
			% [
				float(_hover.get("soil", 0.0)),
				float(_hover.get("moisture", 0.0)),
				float(_hover.get("pollution", 0.0)),
				float(_hover.get("fertility", 0.0)),
			]
		)
		var primary := WorldManager.primary_source()
		if primary and bool(_hover.get("is_source", false)):
			lines.append(
				"Source intensité %.1f  ·  inject %d  ·  reach %d  ·  vue 3 = humidité"
				% [primary.intensity, primary.radius(), EcoSim.max_reach(primary)]
			)
	label.text = "\n".join(lines)
	if wind_label:
		wind_label.text = WorldManager.wind.label() if WorldManager.wind else "—"
