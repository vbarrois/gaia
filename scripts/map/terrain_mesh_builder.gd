class_name TerrainMeshBuilder
extends RefCounted
## Heightfield soft-shaded par chunk (normales sommet lissées).
## Raccords : positions de bord **exactes** (même monde pour 2 chunks voisins)
## + jupes (skirts) pour masquer micro-fissures / T-junctions si LOD.


static func build_chunk_mesh(
	generator: TerrainGenerator,
	chunk_coord: Vector2i,
	chunk_size: int,
	unit: float,
	resolution: int,
	water_level: float,
	skirt_depth: float = 28.0
) -> ArrayMesh:
	resolution = maxi(resolution, 1)
	var origin_tile := chunk_coord * chunk_size
	var cols := resolution + 1

	var heights := PackedFloat32Array()
	heights.resize(cols * cols)
	var colors: Array[Color] = []
	colors.resize(cols * cols)

	# Couleurs en espace monde continu (pas floori→tuile) : sinon marches de
	# « biome » alignées sur les bords de chunks alors que la hauteur raccords OK.
	for iz in cols:
		for ix in cols:
			var xz := _grid_xz(origin_tile, chunk_size, unit, ix, iz, resolution)
			var h := generator.height_at_world(xz.x, xz.y)
			var pol := generator.pollution_at_world(xz.x, xz.y)
			var veg := 0.0 if h < water_level else clampf((100.0 - pol) * 0.31, 0.0, 100.0)
			var idx := iz * cols + ix
			heights[idx] = h
			colors[idx] = TerrainColors.natural(h, water_level, pol, veg)

	# Surface + 4 jupes (res quads × 2 tris chacune).
	var surface_tris := resolution * resolution * 2
	var skirt_tris := resolution * 4 * 2
	var vert_count := (surface_tris + skirt_tris) * 3
	var vertices := PackedVector3Array()
	vertices.resize(vert_count)
	var normals := PackedVector3Array()
	normals.resize(vert_count)
	var vertex_colors := PackedColorArray()
	vertex_colors.resize(vert_count)

	# Normales via gradient hauteur monde (pas faces locales) → identiques
	# des deux côtés d’un bord de chunk (sinon « coupure biome » = shading).
	var step := float(chunk_size) * unit / float(resolution)
	var smooth_n := PackedVector3Array()
	smooth_n.resize(cols * cols)
	for iz in cols:
		for ix in cols:
			var xz := _grid_xz(origin_tile, chunk_size, unit, ix, iz, resolution)
			smooth_n[iz * cols + ix] = _normal_at_world(generator, xz.x, xz.y, step)

	var vi := 0
	for iz in resolution:
		for ix in resolution:
			var i00 := iz * cols + ix
			var i10 := i00 + 1
			var i01 := i00 + cols
			var i11 := i01 + 1

			var xz00 := _grid_xz(origin_tile, chunk_size, unit, ix, iz, resolution)
			var xz10 := _grid_xz(origin_tile, chunk_size, unit, ix + 1, iz, resolution)
			var xz01 := _grid_xz(origin_tile, chunk_size, unit, ix, iz + 1, resolution)
			var xz11 := _grid_xz(origin_tile, chunk_size, unit, ix + 1, iz + 1, resolution)

			var p00 := Vector3(xz00.x, heights[i00], xz00.y)
			var p10 := Vector3(xz10.x, heights[i10], xz10.y)
			var p01 := Vector3(xz01.x, heights[i01], xz01.y)
			var p11 := Vector3(xz11.x, heights[i11], xz11.y)

			# Winding horaire (Godot) ; normales sommet lissées.
			vi = _emit_tri_smooth(
				vertices, normals, vertex_colors, vi,
				p00, p10, p01, colors[i00], colors[i10], colors[i01],
				smooth_n[i00], smooth_n[i10], smooth_n[i01]
			)
			vi = _emit_tri_smooth(
				vertices, normals, vertex_colors, vi,
				p10, p11, p01, colors[i10], colors[i11], colors[i01],
				smooth_n[i10], smooth_n[i11], smooth_n[i01]
			)

	# Jupes : ferment les fissures entre chunks (surtout si LOD différent).
	if skirt_depth > 0.0:
		vi = _emit_skirt_edge(
			vertices, normals, vertex_colors, vi,
			origin_tile, chunk_size, unit, resolution, heights, colors, cols,
			skirt_depth, false, false
		)  # -Z (nord)
		vi = _emit_skirt_edge(
			vertices, normals, vertex_colors, vi,
			origin_tile, chunk_size, unit, resolution, heights, colors, cols,
			skirt_depth, false, true
		)  # +Z (sud)
		vi = _emit_skirt_edge(
			vertices, normals, vertex_colors, vi,
			origin_tile, chunk_size, unit, resolution, heights, colors, cols,
			skirt_depth, true, false
		)  # -X (ouest)
		vi = _emit_skirt_edge(
			vertices, normals, vertex_colors, vi,
			origin_tile, chunk_size, unit, resolution, heights, colors, cols,
			skirt_depth, true, true
		)  # +X (est)

	var arrays: Array = []
	arrays.resize(Mesh.ARRAY_MAX)
	arrays[Mesh.ARRAY_VERTEX] = vertices
	arrays[Mesh.ARRAY_NORMAL] = normals
	arrays[Mesh.ARRAY_COLOR] = vertex_colors

	var mesh := ArrayMesh.new()
	mesh.add_surface_from_arrays(Mesh.PRIMITIVE_TRIANGLES, arrays)
	return mesh


## Positions monde **canoniques** : les bords partagés tombent sur les mêmes floats.
static func _grid_xz(
	origin_tile: Vector2i,
	chunk_size: int,
	unit: float,
	ix: int,
	iz: int,
	resolution: int
) -> Vector2:
	var wx: float
	var wz: float
	if ix <= 0:
		wx = float(origin_tile.x) * unit
	elif ix >= resolution:
		wx = float(origin_tile.x + chunk_size) * unit
	else:
		wx = (float(origin_tile.x) + float(chunk_size) * float(ix) / float(resolution)) * unit

	if iz <= 0:
		wz = float(origin_tile.y) * unit
	elif iz >= resolution:
		wz = float(origin_tile.y + chunk_size) * unit
	else:
		wz = (float(origin_tile.y) + float(chunk_size) * float(iz) / float(resolution)) * unit

	return Vector2(wx, wz)


## along_x = true → jupe sur bord ouest/est ; false → nord/sud.
## high = true → bord +X ou +Z.
static func _emit_skirt_edge(
	vertices: PackedVector3Array,
	normals: PackedVector3Array,
	vertex_colors: PackedColorArray,
	vi: int,
	origin_tile: Vector2i,
	chunk_size: int,
	unit: float,
	resolution: int,
	heights: PackedFloat32Array,
	colors: Array[Color],
	cols: int,
	skirt_depth: float,
	along_x: bool,
	high: bool
) -> int:
	for i in resolution:
		var i0 := i
		var i1 := i + 1
		var ax: int
		var az: int
		var bx: int
		var bz: int
		if along_x:
			ax = resolution if high else 0
			bx = ax
			az = i0
			bz = i1
		else:
			az = resolution if high else 0
			bz = az
			ax = i0
			bx = i1

		var xz_a := _grid_xz(origin_tile, chunk_size, unit, ax, az, resolution)
		var xz_b := _grid_xz(origin_tile, chunk_size, unit, bx, bz, resolution)
		var ia := az * cols + ax
		var ib := bz * cols + bx
		var ha := heights[ia]
		var hb := heights[ib]
		var ca: Color = colors[ia]
		var cb: Color = colors[ib]
		var skirt_col_a := ca.darkened(0.35)
		var skirt_col_b := cb.darkened(0.35)

		var top_a := Vector3(xz_a.x, ha, xz_a.y)
		var top_b := Vector3(xz_b.x, hb, xz_b.y)
		var bot_a := Vector3(xz_a.x, ha - skirt_depth, xz_a.y)
		var bot_b := Vector3(xz_b.x, hb - skirt_depth, xz_b.y)

		# Orientation : normale vers l’extérieur du chunk.
		if high:
			vi = _emit_tri(vertices, normals, vertex_colors, vi, top_a, top_b, bot_a, ca, cb, skirt_col_a, false)
			vi = _emit_tri(vertices, normals, vertex_colors, vi, top_b, bot_b, bot_a, cb, skirt_col_b, skirt_col_a, false)
		else:
			vi = _emit_tri(vertices, normals, vertex_colors, vi, top_a, bot_a, top_b, ca, skirt_col_a, cb, false)
			vi = _emit_tri(vertices, normals, vertex_colors, vi, top_b, bot_a, bot_b, cb, skirt_col_a, skirt_col_b, false)

	return vi


## Différences centrales sur le heightfield → même normale aux bords partagés.
static func _normal_at_world(
	generator: TerrainGenerator,
	world_x: float,
	world_z: float,
	eps: float
) -> Vector3:
	var e := maxf(eps * 0.5, 0.05)
	var h_l := generator.height_at_world(world_x - e, world_z)
	var h_r := generator.height_at_world(world_x + e, world_z)
	var h_d := generator.height_at_world(world_x, world_z - e)
	var h_u := generator.height_at_world(world_x, world_z + e)
	var n := Vector3(h_l - h_r, 2.0 * e, h_d - h_u)
	if n.is_zero_approx():
		return Vector3.UP
	return n.normalized()


static func _tri_normal(a: Vector3, b: Vector3, c: Vector3) -> Vector3:
	var n := (b - a).cross(c - a)
	if n.is_zero_approx():
		return Vector3.UP
	if n.y < 0.0:
		n = -n
	return n.normalized()


static func _emit_tri_smooth(
	vertices: PackedVector3Array,
	normals: PackedVector3Array,
	vertex_colors: PackedColorArray,
	vi: int,
	a: Vector3,
	b: Vector3,
	c: Vector3,
	ca: Color,
	cb: Color,
	cc: Color,
	na: Vector3,
	nb: Vector3,
	nc: Vector3
) -> int:
	vertices[vi] = a
	normals[vi] = na
	vertex_colors[vi] = ca
	vi += 1
	vertices[vi] = b
	normals[vi] = nb
	vertex_colors[vi] = cb
	vi += 1
	vertices[vi] = c
	normals[vi] = nc
	vertex_colors[vi] = cc
	vi += 1
	return vi


static func _emit_tri(
	vertices: PackedVector3Array,
	normals: PackedVector3Array,
	vertex_colors: PackedColorArray,
	vi: int,
	a: Vector3,
	b: Vector3,
	c: Vector3,
	ca: Color,
	cb: Color,
	cc: Color,
	force_up_normal: bool = false
) -> int:
	var n := _tri_normal(a, b, c)
	if force_up_normal and n.y < 0.0:
		n = -n
	return _emit_tri_smooth(vertices, normals, vertex_colors, vi, a, b, c, ca, cb, cc, n, n, n)


static func lod_resolution(
	base: int,
	chebyshev_dist: int,
	near: int,
	mid: int,
	far: int,
	enable_lod: bool
) -> int:
	if not enable_lod:
		return base
	if chebyshev_dist <= near:
		return base
	if chebyshev_dist <= mid:
		return maxi(base / 2, 4)
	if chebyshev_dist <= far:
		return maxi(base / 4, 2)
	return maxi(base / 8, 2)
