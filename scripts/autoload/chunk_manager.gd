extends Node
## ChunkManager — streaming 3D (load / unload / pool / LOD / budget).
## Accès global : `ChunkManager.xxx`

signal chunk_loaded(coord: Vector2i)
signal chunk_unloaded(coord: Vector2i)
signal build_stats(pending: int, triangles: int)

const CHUNK_SCENE_3D := preload("res://scenes/world/chunk_3d.tscn")

var draw_map: Node3D = null
var chunks_root: Node3D = null
var terrain_material: Material = null

## coord → MapChunk3D
var _loaded: Dictionary = {}
## Pool de chunks recyclés (évite instantiate/free).
var _pool: Array[MapChunk3D] = []
## File d’attente de build (coord → desired lod resolution).
var _pending: Dictionary = {}
var _last_center: Vector2i = Vector2i(999_999, 999_999)
var _total_triangles: int = 0


func _ready() -> void:
	set_process(true)


func bind_draw_map(map_node: Node3D) -> void:
	_clear_all()
	draw_map = map_node
	chunks_root = map_node.get_chunks_root()
	terrain_material = TerrainMaterialFactory.make_terrain()
	_prewarm_pool()
	print("[ChunkManager] bound to DrawMap3D (pool=%d)" % _pool.size())


func _prewarm_pool() -> void:
	if chunks_root == null:
		return
	var n := WorldManager.config.chunk_pool_prewarm
	for _i in n:
		var chunk: MapChunk3D = CHUNK_SCENE_3D.instantiate()
		chunks_root.add_child(chunk)
		chunk.visible = false
		_pool.append(chunk)


func _process(_delta: float) -> void:
	_drain_build_queue()


func refresh_around(focus: Vector3) -> void:
	if draw_map == null or chunks_root == null:
		return
	var cfg: WorldConfig = WorldManager.config
	var csize := cfg.chunk_world_size()
	var center := Vector2i(
		floori(focus.x / csize),
		floori(focus.z / csize)
	)
	var center_changed := center != _last_center
	_last_center = center

	var needed: Dictionary = {}
	var radius := cfg.load_radius
	for cy in range(center.y - radius, center.y + radius + 1):
		for cx in range(center.x - radius, center.x + radius + 1):
			var coord := Vector2i(cx, cy)
			var dist := maxi(absi(cx - center.x), absi(cy - center.y))
			var res := TerrainMeshBuilder.lod_resolution(
				cfg.mesh_resolution,
				dist,
				cfg.lod_near,
				cfg.lod_mid,
				cfg.lod_far,
				cfg.enable_mesh_lod
			)
			needed[coord] = res

	# Unload hors rayon
	var to_remove: Array[Vector2i] = []
	for coord in _loaded.keys():
		if not needed.has(coord):
			to_remove.append(coord)
	for coord in to_remove:
		_unload_chunk(coord)
		_pending.erase(coord)

	# Load / relod
	for coord in needed.keys():
		var want_res: int = needed[coord]
		if not _loaded.has(coord):
			_pending[coord] = want_res
		elif center_changed:
			var chunk: MapChunk3D = _loaded[coord]
			if chunk.lod_resolution != want_res:
				_pending[coord] = want_res

	build_stats.emit(_pending.size(), _total_triangles)


func _drain_build_queue() -> void:
	if _pending.is_empty() or chunks_root == null:
		return
	var budget := WorldManager.config.build_budget_per_frame
	var built := 0
	var keys: Array = _pending.keys()
	# Priorité : plus proches du centre d’abord.
	keys.sort_custom(func(a: Vector2i, b: Vector2i) -> bool:
		var da := maxi(absi(a.x - _last_center.x), absi(a.y - _last_center.y))
		var db := maxi(absi(b.x - _last_center.x), absi(b.y - _last_center.y))
		return da < db
	)
	for coord in keys:
		if built >= budget:
			break
		var res: int = _pending[coord]
		_pending.erase(coord)
		_build_or_rebuild(coord, res)
		built += 1
	build_stats.emit(_pending.size(), _total_triangles)


func _build_or_rebuild(coord: Vector2i, resolution: int) -> void:
	var chunk: MapChunk3D = _loaded.get(coord)
	if chunk == null:
		chunk = _acquire_chunk()
		_loaded[coord] = chunk
		chunk_loaded.emit(coord)
	else:
		_total_triangles -= chunk.triangle_count

	chunk.setup(coord, WorldManager.config, WorldManager.generator, terrain_material, resolution)
	chunk.build()
	_total_triangles += chunk.triangle_count


func _acquire_chunk() -> MapChunk3D:
	if not _pool.is_empty():
		return _pool.pop_back()
	var chunk: MapChunk3D = CHUNK_SCENE_3D.instantiate()
	chunks_root.add_child(chunk)
	return chunk


func _unload_chunk(coord: Vector2i) -> void:
	var chunk: MapChunk3D = _loaded.get(coord)
	if chunk == null:
		return
	_total_triangles -= chunk.triangle_count
	chunk.recycle()
	_loaded.erase(coord)
	_pool.append(chunk)
	chunk_unloaded.emit(coord)


func _clear_all() -> void:
	var coords: Array = _loaded.keys()
	for coord in coords:
		_unload_chunk(coord)
	_pending.clear()
	_total_triangles = 0
	_last_center = Vector2i(999_999, 999_999)


func reload_all() -> void:
	_clear_all()
	# Remettre le pool sous le nouveau root si besoin.
	if draw_map and draw_map.has_method("get_focus"):
		refresh_around(draw_map.get_focus())


func get_chunk(coord: Vector2i) -> MapChunk3D:
	return _loaded.get(coord)


func tile_to_chunk(tile: Vector2i) -> Vector2i:
	var size := WorldManager.config.chunk_size
	return Vector2i(
		floori(float(tile.x) / float(size)),
		floori(float(tile.y) / float(size))
	)


func world_to_tile(world_xz: Vector3) -> Vector2i:
	var u := WorldManager.config.world_unit_per_tile
	return Vector2i(floori(world_xz.x / u), floori(world_xz.z / u))


func peek_tile(tile: Vector2i) -> Dictionary:
	return WorldManager.build_cell(tile.x, tile.y).to_dict()


func loaded_count() -> int:
	return _loaded.size()


func pending_count() -> int:
	return _pending.size()


func total_triangles() -> int:
	return _total_triangles
