class_name EcoSim
extends RefCounted
## Capillarité journalière : la source injecte dans son rayon, diffuse un peu au-delà,
## puis s’évapore hors rayon. Pas de propagation à l’infini.


## Tuiles supplémentaires au-delà du rayon d’injection (auréole de capillarité).
const DIFFUSE_EXTRA := 3
## Perte d’humidité / jour hors du rayon d’injection (vers le baseline).
const EVAP_RATE := 2.4


## Une étape : met à jour `eco` (Dictionary Vector2i → {soil, moisture, pollution}).
static func step_day(
	sources: Array,
	eco: Dictionary,
	generator: TerrainGenerator
) -> void:
	if generator == null:
		return
	for src_v in sources:
		var src: WaterSource = src_v as WaterSource
		if src == null:
			continue
		_inject_source(src, eco, generator)
	_diffuse_once(eco, generator, sources)
	_evaporate_outside(eco, generator, sources)
	_prune_far(eco, sources)


static func max_reach(src: WaterSource) -> int:
	return src.radius() + DIFFUSE_EXTRA


static func _chebyshev(a: Vector2i, b: Vector2i) -> int:
	return maxi(absi(a.x - b.x), absi(a.y - b.y))


## Distance à la source la plus proche (Chebyshev). INF si aucune.
static func _dist_nearest_source(tile: Vector2i, sources: Array) -> int:
	var best := 999_999
	for src_v in sources:
		var src: WaterSource = src_v as WaterSource
		if src == null:
			continue
		best = mini(best, _chebyshev(tile, src.tile))
	return best


static func _inside_any_reach(tile: Vector2i, sources: Array) -> bool:
	for src_v in sources:
		var src: WaterSource = src_v as WaterSource
		if src == null:
			continue
		if _chebyshev(tile, src.tile) <= max_reach(src):
			return true
	return false


static func _ensure_entry(eco: Dictionary, tile: Vector2i, generator: TerrainGenerator) -> Dictionary:
	if eco.has(tile):
		return eco[tile] as Dictionary
	var base := generator.build_cell(tile.x, tile.y)
	var entry := {
		"soil": base.soil,
		"moisture": base.moisture,
		"pollution": base.pollution,
	}
	eco[tile] = entry
	return entry


static func _inject_source(src: WaterSource, eco: Dictionary, generator: TerrainGenerator) -> void:
	var r := src.radius()
	for dz in range(-r, r + 1):
		for dx in range(-r, r + 1):
			var d := maxi(absi(dx), absi(dz))
			if d > r:
				continue
			var tile := Vector2i(src.tile.x + dx, src.tile.y + dz)
			var target := src.moisture_at_dist(d)
			if target <= 0.0:
				continue
			var entry := _ensure_entry(eco, tile, generator)
			entry["moisture"] = maxf(float(entry["moisture"]), target)
			eco[tile] = entry


## Une passe : partage vers voisins plus secs, uniquement dans le reach des sources.
static func _diffuse_once(eco: Dictionary, generator: TerrainGenerator, sources: Array) -> void:
	if eco.is_empty() or sources.is_empty():
		return
	var deltas: Dictionary = {}
	var keys: Array = eco.keys()
	for key in keys:
		var tile: Vector2i = key
		if not _inside_any_reach(tile, sources):
			continue
		var entry: Dictionary = eco[tile]
		var m := float(entry["moisture"])
		if m < 8.0:
			continue
		var share := m * 0.06
		for n in _neighbors4(tile):
			if not _inside_any_reach(n, sources):
				continue
			var n_entry := _ensure_entry(eco, n, generator)
			var nm := float(n_entry["moisture"])
			if nm >= m - 0.5:
				continue
			deltas[n] = float(deltas.get(n, 0.0)) + share * 0.25
	for n in deltas.keys():
		var entry: Dictionary = eco[n]
		entry["moisture"] = clampf(float(entry["moisture"]) + float(deltas[n]), 0.0, 100.0)
		eco[n] = entry


## Hors rayon d’injection : redescend vers le baseline générateur.
static func _evaporate_outside(eco: Dictionary, generator: TerrainGenerator, sources: Array) -> void:
	if eco.is_empty():
		return
	var keys: Array = eco.keys()
	for key in keys:
		var tile: Vector2i = key
		var d := _dist_nearest_source(tile, sources)
		var in_inject := false
		for src_v in sources:
			var src: WaterSource = src_v as WaterSource
			if src != null and d <= src.radius():
				in_inject = true
				break
		if in_inject:
			continue
		var entry: Dictionary = eco[tile]
		var base := generator.build_cell(tile.x, tile.y)
		var m := float(entry["moisture"])
		if m <= base.moisture:
			continue
		entry["moisture"] = maxf(base.moisture, m - EVAP_RATE)
		eco[tile] = entry


## Oublie les tuiles hors reach (retour au baseline via get_cell).
static func _prune_far(eco: Dictionary, sources: Array) -> void:
	var drop: Array[Vector2i] = []
	for key in eco.keys():
		var tile: Vector2i = key
		if not _inside_any_reach(tile, sources):
			drop.append(tile)
	for t in drop:
		eco.erase(t)


static func _neighbors4(tile: Vector2i) -> Array[Vector2i]:
	return [
		Vector2i(tile.x + 1, tile.y),
		Vector2i(tile.x - 1, tile.y),
		Vector2i(tile.x, tile.y + 1),
		Vector2i(tile.x, tile.y - 1),
	]
