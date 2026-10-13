extends Node2D
## DrawMap — racine visuelle du plateau.
## Responsabilité : accueillir les chunks, exposer la caméra, relayer le focus.
## Le streaming (load/unload) est délégué à ChunkManager (autoload).

signal map_ready
signal focus_changed(world_position: Vector2)

@onready var chunks_root: Node2D = $Chunks
@onready var camera: Camera2D = $Camera2D

@export var config: WorldConfig
@export var start_centered: bool = true

var _ready_emitted: bool = false


func _ready() -> void:
	if config == null:
		config = WorldConfig.defaults()
	config.sanitize()

	# Config d’abord → le tileset procédural prend la bonne tile_size.
	WorldManager.apply_config(config)
	ChunkManager.bind_draw_map(self)

	if start_centered:
		camera.position = Vector2.ZERO

	ChunkManager.refresh_around(camera.global_position)
	_ready_emitted = true
	map_ready.emit()
	GameManager.notify_map_ready(self)


func _process(_delta: float) -> void:
	# Le streaming suit la caméra (pan / zoom).
	ChunkManager.refresh_around(camera.global_position)


func get_camera() -> Camera2D:
	return camera


func get_chunks_root() -> Node2D:
	return chunks_root


func set_focus(world_position: Vector2) -> void:
	camera.position = world_position
	focus_changed.emit(world_position)
	ChunkManager.refresh_around(world_position)


## Convertit une position écran → coordonnée de tuile monde.
func screen_to_tile(screen_pos: Vector2) -> Vector2i:
	var world := get_viewport().get_canvas_transform().affine_inverse() * screen_pos
	var ts := float(config.tile_size)
	return Vector2i(floori(world.x / ts), floori(world.y / ts))


## Infos debug sous le curseur (biome, hauteur…).
func peek_at_screen(screen_pos: Vector2, _snap_sources: bool = false) -> Dictionary:
	var tile := screen_to_tile(screen_pos)
	return ChunkManager.peek_tile(tile)
