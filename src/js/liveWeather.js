/**
 * Live Weather & User Location Engine
 * Automatically fetches real-world weather conditions (rain, snow, clear skies)
 * based on the user's geographic location via Open-Meteo (free, no API key needed).
 */

const CACHE_KEY = 'user_live_weather_data';
const CACHE_TTL_MS = 15 * 60 * 1000; // 15 minutes

export async function fetchUserLiveWeather() {
  // Check cached data first
  try {
    const cached = sessionStorage.getItem(CACHE_KEY);
    if (cached) {
      const parsed = JSON.parse(cached);
      if (Date.now() - parsed.timestamp < CACHE_TTL_MS) {
        return parsed.data;
      }
    }
  } catch (e) {
    // Ignore cache error
  }

  // 1. Determine Coordinates (Geolocation or Timezone Fallback)
  let coords = await getBrowserCoordinates();
  if (!coords) {
    coords = getTimezoneFallbackCoordinates();
  }

  // 2. Fetch live atmospheric data from Open-Meteo
  try {
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${coords.lat.toFixed(3)}&longitude=${coords.lon.toFixed(3)}&current=temperature_2m,relative_humidity_2m,weather_code,rain,snowfall,cloud_cover`;
    const res = await fetch(url);
    if (!res.ok) throw new Error('Weather fetch failed');
    const data = await res.json();
    const current = data.current;

    let condition = 'clear';
    let summary = 'Fair Skies';

    const code = current.weather_code || 0;
    const rain = current.rain || 0;
    const snow = current.snowfall || 0;

    if (snow > 0.1 || (code >= 71 && code <= 77) || (code >= 85 && code <= 86)) {
      condition = 'snow';
      summary = 'Snowing';
    } else if (rain > 0.1 || (code >= 51 && code <= 67) || (code >= 80 && code <= 82)) {
      condition = 'rain';
      summary = 'Raining';
    } else if (current.cloud_cover > 75) {
      condition = 'clear'; // Cloud cover adds mist
      summary = 'Overcast';
    }

    const result = {
      condition,
      summary,
      temperature: current.temperature_2m,
      weatherCode: code,
      latitude: coords.lat,
      isNorthernHemisphere: coords.lat >= 0,
      timestamp: Date.now()
    };

    sessionStorage.setItem(CACHE_KEY, JSON.stringify({ timestamp: Date.now(), data: result }));
    return result;
  } catch (err) {
    console.warn('Live weather lookup failed, falling back to local seasonal weather:', err);
    return null;
  }
}

function getBrowserCoordinates() {
  return new Promise((resolve) => {
    if (!navigator.geolocation) {
      return resolve(null);
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        resolve({
          lat: pos.coords.latitude,
          lon: pos.coords.longitude
        });
      },
      () => resolve(null),
      { timeout: 3500, maximumAge: 600000 }
    );
  });
}

function getTimezoneFallbackCoordinates() {
  // Approximate coordinate mapping from timezone string
  const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || '';
  if (tz.includes('New_York') || tz.includes('Toronto') || tz.includes('Montreal')) return { lat: 40.7, lon: -74.0 };
  if (tz.includes('Chicago') || tz.includes('Winnipeg')) return { lat: 41.8, lon: -87.6 };
  if (tz.includes('Denver') || tz.includes('Edmonton')) return { lat: 39.7, lon: -104.9 };
  if (tz.includes('Los_Angeles') || tz.includes('Vancouver') || tz.includes('Seattle')) return { lat: 34.0, lon: -118.2 };
  if (tz.includes('London') || tz.includes('Dublin')) return { lat: 51.5, lon: -0.1 };
  if (tz.includes('Paris') || tz.includes('Berlin') || tz.includes('Rome') || tz.includes('Amsterdam') || tz.includes('Madrid')) return { lat: 48.8, lon: 2.3 };
  if (tz.includes('Tokyo')) return { lat: 35.6, lon: 139.6 };
  if (tz.includes('Sydney') || tz.includes('Melbourne')) return { lat: -33.8, lon: 151.2 };
  if (tz.includes('Sao_Paulo') || tz.includes('Buenos_Aires')) return { lat: -23.5, lon: -46.6 };
  if (tz.includes('Singapore') || tz.includes('Hong_Kong')) return { lat: 1.3, lon: 103.8 };

  // Default coordinate (mid-latitude mountain zone)
  return { lat: 45.0, lon: -110.0 };
}
