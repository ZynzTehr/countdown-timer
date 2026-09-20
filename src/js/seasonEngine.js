/**
 * Seasonal Engine — Adapts the scene atmosphere, foliage, and weather
 * according to the real-world calendar season or user preference.
 */

export function getCurrentSeason(date = new Date(), latitude = 40) {
  const month = date.getMonth(); // 0 = Jan, 11 = Dec
  const day = date.getDate();

  // Northern Hemisphere astronomical seasons
  let season = 'winter';
  if ((month === 2 && day >= 20) || month === 3 || month === 4 || (month === 5 && day < 21)) {
    season = 'spring';
  } else if ((month === 5 && day >= 21) || month === 6 || month === 7 || (month === 8 && day < 22)) {
    season = 'summer';
  } else if ((month === 8 && day >= 22) || month === 9 || month === 10 || (month === 11 && day < 21)) {
    season = 'autumn';
  } else {
    season = 'winter';
  }

  // Invert for Southern Hemisphere
  if (latitude < 0) {
    const opposites = { spring: 'autumn', summer: 'winter', autumn: 'spring', winter: 'summer' };
    season = opposites[season];
  }

  return season;
}

export const SEASON_CONFIGS = {
  spring: {
    name: 'Spring',
    tint: 'rgba(236, 72, 153, 0.06)', // soft rose/blossom
    skyOverlay: 'rgba(192, 132, 252, 0.05)',
    defaultWeather: 'clear',
    rainProbability: 0.35,
    snowProbability: 0.05
  },
  summer: {
    name: 'Summer',
    tint: 'rgba(251, 191, 36, 0.08)', // golden warmth
    skyOverlay: 'rgba(249, 115, 22, 0.04)',
    defaultWeather: 'clear',
    rainProbability: 0.15,
    snowProbability: 0
  },
  autumn: {
    name: 'Autumn',
    tint: 'rgba(249, 115, 22, 0.09)', // rich amber & russet
    skyOverlay: 'rgba(217, 70, 239, 0.05)',
    defaultWeather: 'clear',
    rainProbability: 0.30,
    snowProbability: 0.10
  },
  winter: {
    name: 'Winter',
    tint: 'rgba(147, 197, 253, 0.12)', // icy frosty blue
    skyOverlay: 'rgba(168, 85, 247, 0.08)',
    defaultWeather: 'snow',
    rainProbability: 0.10,
    snowProbability: 0.50
  }
};
