export interface WeatherCurrent {
  temperature: number;
  apparentTemperature: number;
  humidity: number;
  windSpeed: number;
  weatherCode: number;
  isDay: boolean;
}

export interface WeatherHourly {
  time: string;
  temperature: number;
  apparentTemperature: number;
  weatherCode: number;
  precipitationProbability: number;
  windSpeed: number;
  humidity: number;
}

export interface WeatherDay {
  date: string;
  dayOfWeek: string;
  dayOfMonth: string;
  tempMax: number;
  tempMin: number;
  weatherCode: number;
  precipitationProbability: number;
  hourly?: WeatherHourly[];
}

export interface WeatherData {
  current: WeatherCurrent;
  daily: WeatherDay[];
  locationName: string;
  country: string;
  updatedAt: string;
}
