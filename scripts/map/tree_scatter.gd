class_name TreeScatter
extends RefCounted
## Placements d’arbres Gaya (port de `js/terrain/trees.js`) + assets MultiMesh partagés.
## Règle : veg > 25 + tirage déterministe ; pas sur l’eau.

const VEG_MIN := 25.0
## Stride spatial (monde infini) — évite collisions x/z vs GRID JS fixe.
const TILE_STRIDE := 73856093

static var _ready: bool = false
static var trunk_mesh: Mesh
static var crown_mesh: Mesh
static var top_mesh: Mesh
static var trunk_mat: Material
static var foliage_mat: Material


static func ensure_assets() -> void:
	if _ready:
		return
	var trunk := CylinderMesh.new()
	trunk.top_radius = 0.14
	trunk.bottom_radius = 0.22
	trunk.height = 1.5
	trunk.radial_segments = 5
	trunk.rings = 1
	trunk_mesh = trunk

	var crown := CylinderMesh.new()
	crown.top_radius = 0.001
	crown.bottom_radius = 1.0
	crown.height = 2.7
	crown.radial_segments = 6
	crown.rings = 1
	crown_mesh = crown

	var top := CylinderMesh.new()
	top.top_radius = 0.001
	top.bottom_radius = 0.72
	top.height = 2.1
	top.radial_segments = 6
	top.rings = 1
	top_mesh = top

	var tmat := StandardMaterial3D.new()
	tmat.albedo_color = Color(0.447, 0.396, 0.290)
	tmat.roughness = 1.0
	tmat.metallic = 0.0
	trunk_mat = tmat

	var fmat := StandardMaterial3D.new()
	fmat.vertex_color_use_as_albedo = true
	fmat.roughness = 0.95
	fmat.metallic = 0.0
	foliage_mat = fmat

	_ready = true


## Collecte les arbres d’un chunk (tuiles du chunk uniquement).
static func collect_for_chunk(
	generator: TerrainGenerator,
	config: WorldConfig,
	chunk_coord: Vector2i
) -> Array[Dictionary]:
	var list: Array[Dictionary] = []
	var origin := chunk_coord * config.chunk_size
	var size := config.chunk_size
	var unit := config.world_unit_per_tile
	var water := config.water_level
	var seed := config.seed

	for lz in size:
		for lx in size:
			var tx := origin.x + lx
			var tz := origin.y + lz
			var cell := generator.build_cell(tx, tz)
			if cell.wet or cell.veg <= VEG_MIN:
				continue
			var r := HashUtil.hash01(seed + tx + tz * TILE_STRIDE)
			if r >= cell.veg / 125.0:
				continue
			var ox := (HashUtil.hash01(tx + tz * 89 + 442) - 0.5) * 1.8
			var oz := (HashUtil.hash01(tx + tz * 12 + 72) - 0.5) * 1.8
			var wx := (float(tx) + 0.5) * unit + ox
			var wz := (float(tz) + 0.5) * unit + oz
			var y := generator.height_at_world(wx, wz)
			if y < water + 0.25:
				continue
			var s := 0.7 + cell.veg * 0.018
			list.append({
				"x": wx,
				"y": y,
				"z": wz,
				"s": s,
				"r": r,
				"veg": cell.veg,
			})
	return list


static func make_multimesh(mesh: Mesh, colored: bool) -> MultiMesh:
	var mm := MultiMesh.new()
	mm.transform_format = MultiMesh.TRANSFORM_3D
	mm.use_colors = colored
	mm.mesh = mesh
	mm.instance_count = 0
	return mm


static func fill_multimeshes(
	placements: Array[Dictionary],
	trunks: MultiMesh,
	crowns: MultiMesh,
	tops: MultiMesh
) -> int:
	var n := placements.size()
	trunks.instance_count = n
	crowns.instance_count = n
	tops.instance_count = n
	for i in n:
		var t: Dictionary = placements[i]
		var x: float = t["x"]
		var y: float = t["y"]
		var z: float = t["z"]
		var s: float = t["s"]
		var r: float = t["r"]
		var veg: float = t["veg"]
		var yaw := r * 7.0
		var basis := Basis.from_euler(Vector3(0.0, yaw, 0.0)).scaled(Vector3(s, s, s))

		trunks.set_instance_transform(i, Transform3D(basis, Vector3(x, y + s * 0.72, z)))
		crowns.set_instance_transform(i, Transform3D(basis, Vector3(x, y + s * 2.0, z)))
		tops.set_instance_transform(i, Transform3D(basis, Vector3(x, y + s * 3.1, z)))

		var hue := 0.22 + r * 0.035
		var sat := 0.2 + clampf(veg / 110.0, 0.0, 1.0) * 0.24
		var lit := 0.25 + r * 0.15
		var col := Color.from_hsv(hue, sat, lit)
		crowns.set_instance_color(i, col)
		tops.set_instance_color(i, Color(
			minf(col.r * 1.17, 1.0),
			minf(col.g * 1.17, 1.0),
			minf(col.b * 1.17, 1.0)
		))
	return n
