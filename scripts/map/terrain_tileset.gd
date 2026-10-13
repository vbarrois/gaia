class_name TerrainTileset
extends RefCounted
## Construit un TileSet procédural (1 couleur / biome).
## Pas besoin d’assets PNG pour démarrer — idéal pour prototyper.

const ATLAS_ID := 0


static func build(tile_size: int = 16) -> TileSet:
	var image := Image.create(Biomes.count() * tile_size, tile_size, false, Image.FORMAT_RGBA8)
	for biome_id in Biomes.COLORS.keys():
		var color: Color = Biomes.color(biome_id)
		var ox: int = int(biome_id) * tile_size
		for y in tile_size:
			for x in tile_size:
				# Léger bord pour distinguer les tuiles adjacentes en debug.
				var edge := x == 0 or y == 0 or x == tile_size - 1 or y == tile_size - 1
				image.set_pixel(ox + x, y, color.darkened(0.12) if edge else color)

	var texture := ImageTexture.create_from_image(image)
	var source := TileSetAtlasSource.new()
	source.texture = texture
	source.texture_region_size = Vector2i(tile_size, tile_size)
	for biome_id in Biomes.COLORS.keys():
		var atlas_coords := Vector2i(int(biome_id), 0)
		source.create_tile(atlas_coords)

	var tileset := TileSet.new()
	tileset.tile_size = Vector2i(tile_size, tile_size)
	tileset.add_source(source, ATLAS_ID)
	return tileset


static func atlas_coords_for_biome(biome_id: int) -> Vector2i:
	return Vector2i(biome_id, 0)
