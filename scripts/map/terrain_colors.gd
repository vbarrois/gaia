class_name TerrainColors
extends RefCounted
## Couleurs vertex — délègue à `WorldManager.palette` (fichier `.tres`).


static func natural(height: float, water_level: float, pollution: float, veg: float) -> Color:
	return _palette().natural(height, water_level, pollution, veg)


static func _palette() -> TerrainPalette:
	if WorldManager and WorldManager.palette:
		return WorldManager.palette
	return TerrainPalette.defaults()
