// Approximate city-centre coordinates. Distances are straight-line estimates, not driving routes.
export const cityCoordinates: Record<string, [number, number]> = {
  "Благоевград": [42.02, 23.09], "Бургас": [42.50, 27.47], "Варна": [43.21, 27.91],
  "Велико Търново": [43.08, 25.63], "Видин": [43.99, 22.87], "Враца": [43.21, 23.56],
  "Габрово": [42.87, 25.32], "Добрич": [43.57, 27.83], "Кърджали": [41.64, 25.37],
  "Кюстендил": [42.28, 22.69], "Ловеч": [43.14, 24.72], "Монтана": [43.41, 23.23],
  "Пазарджик": [42.19, 24.33], "Перник": [42.61, 23.03], "Плевен": [43.41, 24.62],
  "Пловдив": [42.14, 24.75], "Разград": [43.53, 26.52], "Русе": [43.84, 25.95],
  "Силистра": [44.11, 27.27], "Сливен": [42.68, 26.32], "Смолян": [41.57, 24.70],
  "София": [42.70, 23.32], "Стара Загора": [42.43, 25.63], "Търговище": [43.25, 26.57],
  "Хасково": [41.93, 25.56], "Шумен": [43.27, 26.94], "Ямбол": [42.48, 26.50],
  "Асеновград": [42.01, 24.88], "Банско": [41.84, 23.49], "Велинград": [42.03, 23.99],
  "Дупница": [42.27, 23.12], "Карлово": [42.64, 24.81], "Казанлък": [42.62, 25.40],
  "Несебър": [42.66, 27.72], "Поморие": [42.56, 27.64], "Сандански": [41.57, 23.28],
  "Свиленград": [41.77, 26.20], "Созопол": [42.42, 27.70], "Слънчев бряг": [42.70, 27.71],
};

export function distanceBetweenCitiesKm(origin: string, destination: string): number | null {
  const from = cityCoordinates[origin.trim()];
  const to = cityCoordinates[destination.trim()];
  if (!from || !to) return null;
  const radians = Math.PI / 180;
  const latitude = (to[0] - from[0]) * radians;
  const longitude = (to[1] - from[1]) * radians;
  const arc = Math.sin(latitude / 2) ** 2 + Math.cos(from[0] * radians) *
    Math.cos(to[0] * radians) * Math.sin(longitude / 2) ** 2;
  return Math.round(6371 * 2 * Math.atan2(Math.sqrt(arc), Math.sqrt(1 - arc)));
}
