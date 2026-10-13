class_name TerrainPalette
extends Resource
## Palette terrain Gaïa — éditable dans l’inspecteur / `.tres`.
## Fichier par défaut : `res://resources/configs/terrain_palette.tres`

@export_group("Sol & végétation")
@export var soil: Color = Color(0.52, 0.42, 0.22) ## ocre
@export var grass: Color = Color(0.28, 0.48, 0.18) ## vert
@export var rock: Color = Color(0.48, 0.46, 0.42) ## roche
@export var shore: Color = Color(0.78, 0.68, 0.42) ## grève
@export var polluted: Color = Color(0.55, 0.28, 0.52) ## pollution

@export_group("Eau")
@export var water_shallow: Color = Color(0.32, 0.55, 0.48)
@export var water_deep: Color = Color(0.12, 0.32, 0.38)
@export var water_plane: Color = Color(0.18, 0.52, 0.55, 0.82) ## mesh eau

@export_group("Rendu")
## 0 = palette brute · 1 = saturation max (anti-pastel).
@export_range(0.0, 1.0) var saturation_boost: float = 0.35
## Assombrit légèrement l’albedo (plus de contraste).
@export_range(0.0, 0.4) var darken: float = 0.08
## Multiplie la luminance (1 = neutre).
@export_range(0.6, 1.4) var value_scale: float = 0.95


func color_soil() -> Color:
	return _finish(soil)


func color_grass() -> Color:
	return _finish(grass)


func color_rock() -> Color:
	return _finish(rock)


func color_shore() -> Color:
	return _finish(shore)


func color_polluted() -> Color:
	return _finish(polluted)


func color_water_shallow() -> Color:
	return _finish(water_shallow)


func color_water_deep() -> Color:
	return _finish(water_deep)


func color_water_plane() -> Color:
	var c := _finish(water_plane)
	c.a = water_plane.a
	return c


func biome_color(biome_id: int) -> Color:
	match biome_id:
		Biomes.Id.DEEP_WATER:
			return color_water_deep()
		Biomes.Id.WATER:
			return color_water_shallow()
		Biomes.Id.SHORE:
			return color_shore()
		Biomes.Id.GRASS:
			return color_grass()
		Biomes.Id.SOIL:
			return color_soil()
		Biomes.Id.ROCK:
			return color_rock()
		Biomes.Id.POLLUTED:
			return color_polluted()
		_:
			return Color.MAGENTA


func natural(height: float, water_level: float, pollution: float, veg: float) -> Color:
	if height < water_level:
		var depth := clampf((water_level - height) / 15.0, 0.0, 1.0)
		return color_water_shallow().lerp(color_water_deep(), depth)

	var col := color_soil().lerp(color_grass(), clampf(veg / 70.0, 0.0, 1.0))
	col = col.lerp(color_polluted(), _smooth(33.0, 90.0, pollution) * 0.75)
	col = col.lerp(color_rock(), _smooth(19.0, 42.0, height) * 0.85)
	if height < water_level + 1.5:
		var shore_t := (1.0 - (height - water_level) / 1.5) * 0.85
		col = col.lerp(color_shore(), shore_t)
	return col


func _finish(c: Color) -> Color:
	var out := c
	if saturation_boost > 0.0:
		out.s = clampf(out.s + (1.0 - out.s) * saturation_boost, 0.0, 1.0)
	if darken > 0.0:
		out = out.darkened(darken)
	if not is_equal_approx(value_scale, 1.0):
		out.v = clampf(out.v * value_scale, 0.0, 1.0)
	return out


static func _smooth(edge0: float, edge1: float, x: float) -> float:
	var t := clampf((x - edge0) / (edge1 - edge0), 0.0, 1.0)
	return t * t * (3.0 - 2.0 * t)


static func defaults() -> TerrainPalette:
	return TerrainPalette.new()
