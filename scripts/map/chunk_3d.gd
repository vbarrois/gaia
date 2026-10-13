class_name MapChunk3D
extends MeshInstance3D
## Un chunk terrain 3D = ArrayMesh (normales lissées) + MultiMesh arbres.
## Conçu pour être poolé : recycle() au lieu de queue_free.

signal built(chunk_coord: Vector2i, triangle_count: int)

var chunk_coord: Vector2i = Vector2i.ZERO
var lod_resolution: int = 16
var triangle_count: int = 0
var tree_count: int = 0
var is_built: bool = false

var _config: WorldConfig
var _generator: TerrainGenerator

var _trunks: MultiMeshInstance3D
var _crowns: MultiMeshInstance3D
var _tops: MultiMeshInstance3D


func setup(coord: Vector2i, config: WorldConfig, generator: TerrainGenerator, material: Material, resolution: int) -> void:
	chunk_coord = coord
	_config = config
	_generator = generator
	lod_resolution = resolution
	name = "Chunk3D_%d_%d" % [coord.x, coord.y]
	material_override = material
	cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_OFF
	gi_mode = GeometryInstance3D.GI_MODE_DISABLED
	# Position = 0 : vertices déjà en world space (évite double transform).
	position = Vector3.ZERO
	visible = false
	_ensure_tree_nodes()


func _ensure_tree_nodes() -> void:
	if _trunks != null:
		return
	TreeScatter.ensure_assets()
	_trunks = _make_tree_layer("TreesTrunks", TreeScatter.make_multimesh(TreeScatter.trunk_mesh, false), TreeScatter.trunk_mat)
	_crowns = _make_tree_layer("TreesCrowns", TreeScatter.make_multimesh(TreeScatter.crown_mesh, true), TreeScatter.foliage_mat)
	_tops = _make_tree_layer("TreesTops", TreeScatter.make_multimesh(TreeScatter.top_mesh, true), TreeScatter.foliage_mat)


func _make_tree_layer(node_name: String, mm: MultiMesh, mat: Material) -> MultiMeshInstance3D:
	var node := MultiMeshInstance3D.new()
	node.name = node_name
	node.multimesh = mm
	node.material_override = mat
	node.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_OFF
	node.gi_mode = GeometryInstance3D.GI_MODE_DISABLED
	add_child(node)
	return node


func build() -> void:
	var mesh := TerrainMeshBuilder.build_chunk_mesh(
		_generator,
		chunk_coord,
		_config.chunk_size,
		_config.world_unit_per_tile,
		lod_resolution,
		_config.water_level,
		_config.skirt_depth
	)
	self.mesh = mesh
	triangle_count = lod_resolution * lod_resolution * 2
	_rebuild_trees()
	is_built = true
	visible = true
	# AABB explicite pour le frustum culling moteur (+ hauteur arbres).
	var unit := _config.world_unit_per_tile
	var size := float(_config.chunk_size) * unit
	var origin := Vector3(
		float(chunk_coord.x) * size,
		-20.0,
		float(chunk_coord.y) * size
	)
	custom_aabb = AABB(origin, Vector3(size, 120.0, size))
	built.emit(chunk_coord, triangle_count)


func _rebuild_trees() -> void:
	_ensure_tree_nodes()
	var placements := TreeScatter.collect_for_chunk(_generator, _config, chunk_coord)
	tree_count = TreeScatter.fill_multimeshes(
		placements,
		_trunks.multimesh,
		_crowns.multimesh,
		_tops.multimesh
	)
	var show := tree_count > 0
	_trunks.visible = show
	_crowns.visible = show
	_tops.visible = show


func recycle() -> void:
	visible = false
	mesh = null
	triangle_count = 0
	tree_count = 0
	is_built = false
	chunk_coord = Vector2i(999_999, 999_999)
	if _trunks and _trunks.multimesh:
		_trunks.multimesh.instance_count = 0
		_trunks.visible = false
	if _crowns and _crowns.multimesh:
		_crowns.multimesh.instance_count = 0
		_crowns.visible = false
	if _tops and _tops.multimesh:
		_tops.multimesh.instance_count = 0
		_tops.visible = false
