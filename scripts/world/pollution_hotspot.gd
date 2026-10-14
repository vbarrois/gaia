class_name PollutionHotspot
extends RefCounted
## Cicatrice de pollution héritée — pic local, falloff Chebyshev.
## Pas un bâtiment : héritage du passé (brief reconquête).

var tile: Vector2i = Vector2i.ZERO
## Rayon en tuiles (Chebyshev).
var radius: int = 4
## Pollution ajoutée au centre (0–100).
var peak: float = 40.0


func _init(p_tile: Vector2i = Vector2i.ZERO, p_radius: int = 4, p_peak: float = 40.0) -> void:
	tile = p_tile
	radius = maxi(p_radius, 1)
	peak = clampf(p_peak, 0.0, 100.0)


func dist_to(tx: int, ty: int) -> int:
	return maxi(absi(tx - tile.x), absi(ty - tile.y))


func contains_tile(tx: int, ty: int) -> bool:
	return dist_to(tx, ty) <= radius


## Contribution 0–peak à (tx, ty).
func contribution_at(tx: int, ty: int) -> float:
	var d := dist_to(tx, ty)
	if d > radius:
		return 0.0
	var t := 1.0 - float(d) / float(radius + 1)
	# Courbe douce : bord moins agressif que le cœur.
	return peak * t * t


## Place N cicatrices déterministes autour d’un ancre (souvent la source).
static func generate_around(
	world_seed: int,
	anchor: Vector2i,
	count: int,
	radius_min: int,
	radius_max: int,
	peak_min: float,
	peak_max: float,
	min_dist_from_anchor: int,
	max_dist_from_anchor: int,
	generator: TerrainGenerator
) -> Array:
	var out: Array = []
	if count <= 0 or generator == null:
		return out
	var placed := 0
	var attempt := 0
	var max_attempts := count * 24
	while placed < count and attempt < max_attempts:
		attempt += 1
		var h1 := HashUtil.hash01(world_seed * 17 + attempt * 9137 + placed * 401)
		var h2 := HashUtil.hash01(world_seed * 31 + attempt * 5779 + placed * 223)
		var h3 := HashUtil.hash01(world_seed * 47 + attempt * 3343 + placed * 109)
		var ang := h1 * TAU
		var dist_f := lerpf(float(min_dist_from_anchor), float(max_dist_from_anchor), h2)
		var tx := anchor.x + int(round(cos(ang) * dist_f))
		var ty := anchor.y + int(round(sin(ang) * dist_f))
		var cell := generator.build_cell(tx, ty)
		if cell.wet:
			continue
		# Évite de saturer le cœur d’oasis.
		if maxi(absi(tx - anchor.x), absi(ty - anchor.y)) < min_dist_from_anchor:
			continue
		var overlap := false
		for existing in out:
			if existing.dist_to(tx, ty) < existing.radius + 2:
				overlap = true
				break
		if overlap:
			continue
		var r := radius_min + int(floor(h3 * float(radius_max - radius_min + 1)))
		r = clampi(r, radius_min, radius_max)
		var peak := lerpf(peak_min, peak_max, HashUtil.hash01(world_seed + tx * 13 + ty * 29))
		out.append(new(Vector2i(tx, ty), r, peak))
		placed += 1
	return out
