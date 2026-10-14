class_name EcoSim
extends RefCounted
## Simu journalière : production source + capillarité + conso végétale + pollution.
## 1) Hydrique — humidité qui se déplace emporte une part de pollution.
## 2) Particulaire — sol sale émet ; le vent transporte et redépose.
## Évaporation sol / nuages / pluie : plus tard (EVAP_RATE hors inject = filet provisoire).


## Tuiles supplémentaires au-delà du rayon d’injection (auréole de capillarité).
const DIFFUSE_EXTRA := 3
## Perte d’humidité / jour hors du rayon d’injection (vers le baseline) — provisoire.
const EVAP_RATE := 2.4
## Fraction de la cible source ajoutée / jour (production, pas plancher hard).
const INJECT_RATE := 0.14
## Conso végétale : humidité retirée / jour ≈ veg * VEG_DRINK (port JS 0.006).
const VEG_DRINK := 0.006
## Croissance / dépérissement veg (port JS step).
const VEG_GROW_BASE := 0.2
const VEG_GROW_SOIL := 0.005
const VEG_DIE := 0.7
const VEG_MOIST_MIN := 19.0
const VEG_POL_MAX := 67.0
const VEG_SOIL_MIN := 14.0
## Zone active pollution (Chebyshev depuis une source) — évite l’infini.
const POLLUTION_SIM_RADIUS := 36
## Fraction de pollution emportée avec le flux d’humidité.
const HYDRIC_CARRY := 0.55
## Émission particulaire (fraction / jour si sol assez sale / assez sec).
const DUST_EMIT_WEAK := 0.018
const DUST_EMIT_STRONG := 0.038
const DUST_MIN_POL := 22.0
const DUST_MAX_MOISTURE := 72.0


## Une étape : production → capillarité → conso plantes → lessivage.
static func step_day(
	sources: Array,
	eco: Dictionary,
	generator: TerrainGenerator,
	wind_dir: Vector2i = Vector2i.ZERO,
	wind_strong: bool = false
) -> void:
	if generator == null:
		return
	for src_v in sources:
		var src: WaterSource = src_v as WaterSource
		if src == null:
			continue
		_inject_source(src, eco, generator)
	# Hotspots déjà seedés au bootstrap ; ne rescanne que s’il manque des entrées.
	if generator.hotspots.size() > 0 and eco.size() < 32:
		_seed_hotspot_tiles(eco, generator)
	_diffuse_moisture_and_hydric(eco, generator, sources)
	_plant_consume_and_grow(eco, generator)
	_evaporate_outside(eco, generator, sources)
	_particulate_wind(eco, generator, sources, wind_dir, wind_strong)
	_prune_far(eco, generator, sources)


static func max_reach(src: WaterSource) -> int:
	return src.radius() + DIFFUSE_EXTRA


static func _chebyshev(a: Vector2i, b: Vector2i) -> int:
	return maxi(absi(a.x - b.x), absi(a.y - b.y))


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


static func _in_pollution_sim(tile: Vector2i, sources: Array) -> bool:
	if sources.is_empty():
		return false
	return _dist_nearest_source(tile, sources) <= POLLUTION_SIM_RADIUS


static func _ensure_entry(eco: Dictionary, tile: Vector2i, generator: TerrainGenerator) -> Dictionary:
	if eco.has(tile):
		var existing: Dictionary = eco[tile]
		if not existing.has("veg"):
			var base := generator.build_cell(tile.x, tile.y)
			existing["veg"] = base.veg
			eco[tile] = existing
		return existing
	var base := generator.build_cell(tile.x, tile.y)
	var entry := {
		"soil": base.soil,
		"moisture": base.moisture,
		"pollution": base.pollution,
		"veg": base.veg,
	}
	eco[tile] = entry
	return entry


static func _seed_hotspot_tiles(eco: Dictionary, generator: TerrainGenerator) -> void:
	if generator == null:
		return
	for h_v in generator.hotspots:
		var h = h_v
		if h == null:
			continue
		var r: int = int(h.radius)
		var center: Vector2i = h.tile
		for dz in range(-r, r + 1):
			for dx in range(-r, r + 1):
				if maxi(absi(dx), absi(dz)) > r:
					continue
				_ensure_entry(eco, Vector2i(center.x + dx, center.y + dz), generator)


## Production journalière : comble vers la cible de distance (pas un plancher à 100 %).
## Si déjà ≥ cible, la source n’ajoute rien → les plantes peuvent puiser un gradient.
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
			var m := float(entry["moisture"])
			if m >= target:
				continue
			var add := minf(target - m, maxf(target * INJECT_RATE, 1.2))
			entry["moisture"] = clampf(m + add, 0.0, 100.0)
			eco[tile] = entry


## Diffusion humidité + lessivage hydrique.
## Règle : la pollution dissoute **suit l’eau** (humide → plus sec), donc avec la
## capillarité elle part **vers l’extérieur**, pas vers le cœur de source.
static func _diffuse_moisture_and_hydric(
	eco: Dictionary, generator: TerrainGenerator, sources: Array
) -> void:
	if eco.is_empty():
		return
	var moist_d: Dictionary = {}
	var pol_d: Dictionary = {}
	var keys: Array = eco.keys()
	for key in keys:
		var tile: Vector2i = key
		if not _in_pollution_sim(tile, sources) and not _inside_any_reach(tile, sources):
			continue
		var entry: Dictionary = eco[tile]
		var m := float(entry["moisture"])
		var pol := float(entry["pollution"])
		if m < 8.0:
			continue
		var share := m * 0.06
		for n in _neighbors4(tile):
			if not _in_pollution_sim(n, sources) and not _inside_any_reach(n, sources):
				continue
			var n_entry := _ensure_entry(eco, n, generator)
			var nm := float(n_entry["moisture"])
			if nm >= m - 0.5:
				continue
			var dm := share * 0.25
			moist_d[n] = float(moist_d.get(n, 0.0)) + dm
			# Drain quasi conservatif (évite la création nette d’eau → saturation).
			moist_d[tile] = float(moist_d.get(tile, 0.0)) - dm
			# Pollution emportée avec l’eau vers le voisin plus sec (exfiltration).
			if pol > 1.0 and m > 0.01:
				var carry := pol * (dm / m) * HYDRIC_CARRY
				carry = minf(carry, pol * 0.12)
				if carry > 0.05:
					pol_d[tile] = float(pol_d.get(tile, 0.0)) - carry
					pol_d[n] = float(pol_d.get(n, 0.0)) + carry
	for t in moist_d.keys():
		var entry: Dictionary = _ensure_entry(eco, t, generator)
		entry["moisture"] = clampf(float(entry["moisture"]) + float(moist_d[t]), 0.0, 100.0)
		eco[t] = entry
	for t in pol_d.keys():
		var entry: Dictionary = _ensure_entry(eco, t, generator)
		entry["pollution"] = clampf(float(entry["pollution"]) + float(pol_d[t]), 0.0, 100.0)
		eco[t] = entry
	# Cœur d’oasis : léger rinçage (l’eau de source dilue / chasse).
	_flush_source_core(eco, sources)


## Les plantes boivent ; croissent si conditions OK, sinon dépérissent (port JS).
## C’est le puits principal tant que l’évaporation sol n’est pas branchée.
static func _plant_consume_and_grow(eco: Dictionary, generator: TerrainGenerator) -> void:
	if eco.is_empty():
		return
	var keys: Array = eco.keys()
	for key in keys:
		var tile: Vector2i = key
		var entry := _ensure_entry(eco, tile, generator)
		var base := generator.build_cell(tile.x, tile.y)
		if base.wet:
			continue
		var m := float(entry["moisture"])
		var soil := float(entry["soil"])
		var pol := float(entry["pollution"])
		var veg := float(entry.get("veg", base.veg))
		# Consommation (puits) — même ordre de grandeur que JS `veg * 0.006`.
		if veg > 0.5 and m > 0.0:
			var drink := minf(m, veg * VEG_DRINK)
			m = maxf(0.0, m - drink)
		# Croissance / mort selon humidité / pollution / sol.
		if veg > 0.0:
			if m > VEG_MOIST_MIN and pol < VEG_POL_MAX and soil > VEG_SOIL_MIN:
				veg = clampf(veg + VEG_GROW_BASE + soil * VEG_GROW_SOIL, 0.0, 100.0)
				soil = clampf(soil + veg * 0.0014, 0.0, 100.0)
				pol = maxf(0.0, pol - veg * 0.0025)
			else:
				veg = maxf(0.0, veg - VEG_DIE)
		entry["moisture"] = m
		entry["veg"] = veg
		entry["soil"] = soil
		entry["pollution"] = pol
		eco[tile] = entry


## Dilution lente dans le rayon d’injection (évite un tas toxique au beacon).
static func _flush_source_core(eco: Dictionary, sources: Array) -> void:
	for src_v in sources:
		var src: WaterSource = src_v as WaterSource
		if src == null:
			continue
		var r := src.radius()
		for dz in range(-r, r + 1):
			for dx in range(-r, r + 1):
				if maxi(absi(dx), absi(dz)) > r:
					continue
				var tile := Vector2i(src.tile.x + dx, src.tile.y + dz)
				if not eco.has(tile):
					continue
				var entry: Dictionary = eco[tile]
				var pol := float(entry["pollution"])
				if pol <= 8.0:
					continue
				# Plus près du centre = plus fort le rinçage.
				var d := maxi(absi(dx), absi(dz))
				var flush := (1.0 - float(d) / float(r + 1)) * 1.8
				entry["pollution"] = maxf(0.0, pol - flush)
				eco[tile] = entry


## Sol sale / assez sec → poussière portée par le vent.
## Ne se redépose presque pas sur sol très humide (cœur d’oasis) — évite l’artefact
## « anneau de hotspots + vent → tas au centre ».
static func _particulate_wind(
	eco: Dictionary,
	generator: TerrainGenerator,
	sources: Array,
	wind_dir: Vector2i,
	wind_strong: bool
) -> void:
	if eco.is_empty():
		return
	if wind_dir == Vector2i.ZERO:
		return
	var dist := 5 if wind_strong else 2
	var frac := DUST_EMIT_STRONG if wind_strong else DUST_EMIT_WEAK
	var pol_d: Dictionary = {}
	var keys: Array = eco.keys()
	for key in keys:
		var tile: Vector2i = key
		if not _in_pollution_sim(tile, sources):
			continue
		var entry: Dictionary = eco[tile]
		var pol := float(entry["pollution"])
		var m := float(entry["moisture"])
		if pol < DUST_MIN_POL:
			continue
		if m > DUST_MAX_MOISTURE:
			continue
		var dry := 1.0 - clampf(m / DUST_MAX_MOISTURE, 0.0, 1.0)
		var emit := pol * frac * (0.35 + dry * 0.65)
		if emit < 0.08:
			continue
		var dest := Vector2i(tile.x + wind_dir.x * dist, tile.y + wind_dir.y * dist)
		if not _in_pollution_sim(dest, sources):
			dest = tile + wind_dir * mini(dist, 1)
		# Si la cible est dans le rayon d’eau de source, pousser plus loin sous le vent.
		var push := 0
		while push < 4 and _inside_source_inject(dest, sources):
			dest += wind_dir
			push += 1
		var dest_entry := _ensure_entry(eco, dest, generator)
		var dest_m := float(dest_entry["moisture"])
		# Sol humide : peu de dépôt (la poussière « n’accroche » pas / est reprise).
		var settle := 0.92 * (1.0 - clampf((dest_m - 35.0) / 55.0, 0.0, 0.9))
		var deposited := emit * settle
		var lost := emit - deposited
		pol_d[tile] = float(pol_d.get(tile, 0.0)) - emit
		if deposited > 0.05:
			pol_d[dest] = float(pol_d.get(dest, 0.0)) + deposited
		# lost = dispersé hors carte (pas de concentration magique)
		if lost < 0.0:
			pass
	for t in pol_d.keys():
		var entry: Dictionary = _ensure_entry(eco, t, generator)
		entry["pollution"] = clampf(float(entry["pollution"]) + float(pol_d[t]), 0.0, 100.0)
		eco[t] = entry


static func _inside_source_inject(tile: Vector2i, sources: Array) -> bool:
	for src_v in sources:
		var src: WaterSource = src_v as WaterSource
		if src == null:
			continue
		if _chebyshev(tile, src.tile) <= src.radius():
			return true
	return false


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


## Garde reach source, hotspots, et tuiles dont la pollution a divergé.
static func _prune_far(eco: Dictionary, generator: TerrainGenerator, sources: Array) -> void:
	var drop: Array[Vector2i] = []
	for key in eco.keys():
		var tile: Vector2i = key
		if _inside_any_reach(tile, sources):
			continue
		if generator != null and generator.hotspot_boost_at_tile(tile.x, tile.y) > 0.5:
			continue
		if _in_pollution_sim(tile, sources):
			var entry: Dictionary = eco[tile]
			var base := generator.build_cell(tile.x, tile.y)
			if absf(float(entry["pollution"]) - base.pollution) > 1.5:
				continue
			if absf(float(entry["moisture"]) - base.moisture) > 2.0:
				continue
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


## Vecteur tuile cardinal depuis un WindState / angle approximé.
static func wind_tile_dir_from_vector(v: Vector3) -> Vector2i:
	if absf(v.x) >= absf(v.z):
		return Vector2i(1 if v.x >= 0.0 else -1, 0)
	return Vector2i(0, 1 if v.z >= 0.0 else -1)
