import { tool } from "@openai/agents";
import { z } from "zod";

const WeatherInputSchema = z
  .object({
    location: z.string().min(1).describe("City name to get weather for"),
  })
  .strict();

type GeoResult = {
  results?: {
    name: string;
    country: string;
    latitude: number;
    longitude: number;
  }[];
};

type WeatherResult = {
  current: {
    temperature_2m: number;
    relative_humidity_2m: number;
    apparent_temperature: number;
    weather_code: number;
    wind_speed_10m: number;
  };
};

function weatherCodeToCondition(code: number): string {
  if (code === 0) return "Clear sky";
  if (code <= 3) return "Partly cloudy";
  if (code <= 48) return "Foggy";
  if (code <= 57) return "Drizzle";
  if (code <= 65) return "Rain";
  if (code <= 67) return "Freezing rain";
  if (code <= 75) return "Snow";
  if (code === 77) return "Snow grains";
  if (code <= 82) return "Rain showers";
  if (code <= 86) return "Snow showers";
  if (code === 95) return "Thunderstorm";
  if (code <= 99) return "Thunderstorm with hail";
  return "Unknown";
}

export const weatherTool = tool({
  name: "weather",
  description:
    "Get the current weather for a city. Use this for any weather-related questions.",
  parameters: WeatherInputSchema,
  execute: async ({ location }) => {
    // Step 1: Geocode the city name
    const geoUrl = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(location)}&count=1`;
    const geoRes = await fetch(geoUrl, { signal: AbortSignal.timeout(10_000) });
    if (!geoRes.ok) {
      throw new Error(`Geocoding request failed with status ${geoRes.status}`);
    }
    const geoData = (await geoRes.json()) as GeoResult;

    if (!geoData.results || geoData.results.length === 0) {
      throw new Error(`Could not find location: ${location}`);
    }

    const { name, country, latitude, longitude } = geoData.results[0];

    // Step 2: Fetch current weather
    const weatherUrl = `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,relative_humidity_2m,apparent_temperature,weather_code,wind_speed_10m`;
    const weatherRes = await fetch(weatherUrl, { signal: AbortSignal.timeout(10_000) });
    if (!weatherRes.ok) {
      throw new Error(`Weather request failed with status ${weatherRes.status}`);
    }
    const weatherData = (await weatherRes.json()) as WeatherResult;

    const current = weatherData.current;

    return {
      location: `${name}, ${country}`,
      temperature: current.temperature_2m,
      feelsLike: current.apparent_temperature,
      humidity: current.relative_humidity_2m,
      windSpeed: current.wind_speed_10m,
      condition: weatherCodeToCondition(current.weather_code),
      unit: "°C",
    };
  },
});
