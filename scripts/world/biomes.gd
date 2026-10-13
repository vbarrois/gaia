class_name Biomes
extends RefCounted
## Types de tuiles terrain + palette Gaya.
## L’atlas procédural (voir TerrainTileset) mappe chaque biome → une couleur.

enum Id {
	DEEP_WATER = 0,
	WATER = 1,
	SHORE = 2,
	GRASS = 3,
	SOIL = 4,
	ROCK = 5,
	POLLUTED = 6,
}

## Couleurs RGB (0–255) alignées sur `js/world/colors.js`.
const COLORS: Dictionary = {
	Id.DEEP_WATER: Color8(56, 107, 117),
	Id.WATER: Color8(125, 164, 140),
	Id.SHORE: Color8(207, 193, 151),
	Id.GRASS: Color8(91, 129, 67),
	Id.SOIL: Color8(156, 143, 105),
	Id.ROCK: Color8(165, 164, 145),
	Id.POLLUTED: Color8(149, 115, 155),
}

const NAMES: Dictionary = {
	Id.DEEP_WATER: "deep_water",
	Id.WATER: "water",
	Id.SHORE: "shore",
	Id.GRASS: "grass",
	Id.SOIL: "soil",
	Id.ROCK: "rock",
	Id.POLLUTED: "polluted",
}


static func count() -> int:
	return COLORS.size()


static func color(biome_id: int) -> Color:
	if WorldManager and WorldManager.palette:
		return WorldManager.palette.biome_color(biome_id)
	return COLORS.get(biome_id, Color.MAGENTA) as Color


static func name_of(biome_id: int) -> String:
	return str(NAMES.get(biome_id, "unknown"))


## Choisit un biome à partir de la hauteur et du niveau d’eau (logique SIG simple).
static func from_height(height: float, water_level: float, pollution: float = 0.0) -> int:
	if height < water_level - 6.0:
		return Id.DEEP_WATER
	if height < water_level:
		return Id.WATER
	if height < water_level + 1.5:
		return Id.SHORE
	if height > 28.0:
		return Id.ROCK
	if pollution > 70.0:
		return Id.POLLUTED
	if height > water_level + 8.0:
		return Id.GRASS
	return Id.SOIL
