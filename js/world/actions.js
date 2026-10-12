export const ACTIONS = {
  inspect: {
    name: 'Observer le vivant',
    text: 'Un clic court affiche les valeurs de la case. Glisser tourne la caméra, sans agir.',
  },
  clean: {
    name: 'Dépolluer une zone',
    text: 'Retire jusqu’à 22 points par case. La pollution extraite est isolée, pas transformée en compost. Coût : 3 + 0,22 × cases, arrondi, en énergie.',
  },
  water: {
    name: 'Arroser le sol',
    text: '+25 d’humidité par case. Coût : 2 d’énergie et 0,65 d’eau × cases, arrondi.',
  },
  soil: {
    name: 'Enrichir le sol',
    text: '+22 de fertilité par case. Coût : 4 d’énergie et 0,25 de compost × cases, arrondi. Le compost revient lentement avec la végétation.',
  },
  plant: {
    name: 'Planter la vie',
    text: '+22 de végétation. Il faut un sol ≥ 25, une humidité ≥ 18 et une pollution < 70. Coût : 3 + 0,15 × cases, arrondi, en énergie, et 3 d’eau.',
  },
  purify: {
    name: 'Puiser et purifier',
    text: 'Clique sur un lac ou à moins de 10 unités de la source : +28 d’eau pour 6 d’énergie. Dans cette version, le niveau des lacs ne baisse pas.',
  },
}

export const ACTION_IDS = Object.keys(ACTIONS)

/**
 * @param {string} type
 * @returns {boolean}
 */
export function isActionType(type) {
  return Object.prototype.hasOwnProperty.call(ACTIONS, type)
}
