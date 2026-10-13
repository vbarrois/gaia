class_name MapChunk
extends Node2D
## Un chunk = une grille chunk_size × chunk_size de tuiles.
## Généré à la demande par ChunkManager, destruit hors rayon de vue.

signal ready_drawn(chunk_coord: Vector2i)

@onready var tile_layer: TileMapLayer = $TileMapLayer

var chunk_coord: Vector2i = Vector2i.ZERO
var cells: Array[CellData] = []

var _config: WorldConfig
var _generator: TerrainGenerator
var _built: bool = false


func setup(coord: Vector2i, config: WorldConfig, generator: TerrainGenerator, tileset: TileSet) -> void:
	chunk_coord = coord
	_config = config
	_generator = generator
	name = "Chunk_%d_%d" % [coord.x, coord.y]
	if tile_layer == null:
		tile_layer = $TileMapLayer
	tile_layer.tile_set = tileset
	position = Vector2(coord) * config.chunk_size * config.tile_size


func build() -> void:
	if _built:
		return
	cells.clear()
	var size := _config.chunk_size
	var origin := chunk_coord * size

	for local_y in size:
		for local_x in size:
			var tx := origin.x + local_x
			var ty := origin.y + local_y
			var cell := _generator.build_cell(tx, ty)
			cells.append(cell)
			tile_layer.set_cell(
				Vector2i(local_x, local_y),
				TerrainTileset.ATLAS_ID,
				TerrainTileset.atlas_coords_for_biome(cell.biome)
			)

	_built = true
	ready_drawn.emit(chunk_coord)


func get_cell_local(local_x: int, local_y: int) -> CellData:
	var size := _config.chunk_size
	if local_x < 0 or local_y < 0 or local_x >= size or local_y >= size:
		return null
	return cells[local_y * size + local_x]


func clear_tiles() -> void:
	if tile_layer:
		tile_layer.clear()
	cells.clear()
	_built = false
