class_name TerrainColors
extends RefCounted
## Couleurs vertex — naturel ou overlays colorimétriques (sol / humidité / pollution / fertilité).


static func natural(height: float, water_level: float, pollution: float, veg: float) -> Color:
	return _palette().natural(height, water_level, pollution, veg)


static func for_cell(layer: int, cell: CellData, water_level: float) -> Color:
	match layer:
		WorldManager.ViewLayer.SOIL:
			return heatmap(cell.soil / 100.0, Color(0.58, 0.40, 0.31), Color(0.47, 0.69, 0.35))
		WorldManager.ViewLayer.MOISTURE:
			return moisture_blue(cell.moisture)
		WorldManager.ViewLayer.POLLUTION:
			return heatmap(cell.pollution / 100.0, Color(0.39, 0.62, 0.38), Color(0.62, 0.32, 0.59))
		WorldManager.ViewLayer.FERTILITY:
			return heatmap(cell.fertility() / 100.0, Color(0.45, 0.32, 0.22), Color(0.35, 0.78, 0.42))
		_:
			var veg := cell.veg
			return natural(cell.height, water_level, cell.pollution, veg)


## Dégradé bleu d’humidité (sec → saturé).
static func moisture_blue(moisture: float) -> Color:
	return heatmap(
		moisture / 100.0,
		Color(0.78, 0.82, 0.72),  # presque sec, teinte froide légère
		Color(0.12, 0.45, 0.82)   # saturé
	)


## t 0–1 : low → high.
static func heatmap(t: float, low: Color, high: Color) -> Color:
	return low.lerp(high, clampf(t, 0.0, 1.0))


static func _palette() -> TerrainPalette:
	if WorldManager and WorldManager.palette:
		return WorldManager.palette
	return TerrainPalette.defaults()
