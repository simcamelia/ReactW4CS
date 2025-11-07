import React, { useEffect, useMemo, useState, useCallback } from "react";
import axios from "axios";
import "./App.css";

const GEO = (q) =>
  `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(
    q
  )}&count=1&language=en&format=json`;

const FORE = (lat, lon) =>
  `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,wind_speed_10m,weather_code&daily=weather_code,temperature_2m_max,temperature_2m_min&timezone=auto&forecast_days=7`;

const codeToIcon = (code) => {
  const map = {
    0: "01d", 1: "02d", 2: "03d", 3: "04d",
    45: "50d", 48: "50d",
    51: "09d", 53: "09d", 55: "09d",
    61: "10d", 63: "10d", 65: "10d", 66: "10d", 67: "10d",
    71: "13d", 73: "13d", 75: "13d", 77: "13d",
    80: "09d", 81: "09d", 82: "09d",
    85: "13d", 86: "13d",
    95: "11d", 96: "11d", 99: "11d"
  };
  return map[code] || "01d";
};

const codeToText = (code) => {
  const map = {
    0: "Clear sky", 1: "Mainly clear", 2: "Partly cloudy", 3: "Overcast",
    45: "Fog", 48: "Rime fog",
    51: "Light drizzle", 53: "Drizzle", 55: "Dense drizzle",
    61: "Light rain", 63: "Rain", 65: "Heavy rain",
    66: "Freezing rain", 67: "Freezing rain",
    71: "Light snow", 73: "Snow", 75: "Heavy snow", 77: "Snow grains",
    80: "Light showers", 81: "Showers", 82: "Heavy showers",
    85: "Snow showers", 86: "Snow showers",
    95: "Thunderstorm", 96: "Thunderstorm w/ hail", 99: "Thunderstorm w/ hail"
  };
  return map[code] || "Weather";
};

// ------------------ COMPONENTS ------------------

function Header({ query, setQuery, onSearch, theme, onThemeChange }) {
  return (
    <header className="header">
      <h1 className="brand">Weather App</h1>
      <form
        className="search"
        onSubmit={(e) => {
          e.preventDefault();
          const q = (query || "").trim();
          if (q) onSearch(q);
        }}
      >
        <input
          type="text"
          placeholder="Type a city…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          aria-label="Search city"
        />
        <button type="submit">Search</button>
      </form>

      <div className="theme-switch">
        <label htmlFor="themeSel">Theme</label>
        <select
          id="themeSel"
          value={theme}
          onChange={(e) => onThemeChange(e.target.value)}
        >
          <option value="light">Light</option>
          <option value="dark">Dark</option>
        </select>
      </div>
    </header>
  );
}

function Current({ city, date, tempDisplay, unit, setUnit, desc, icon, humidity, wind }) {
  return (
    <section className="current">
      <div className="current-top">
        <div className="city-block">
          <h2 className="city">{city || "—"}</h2>
          <p className="date">{date}</p>
        </div>
        <img
          className="big-icon"
          src={`https://openweathermap.org/img/wn/${icon}@2x.png`}
          alt={desc}
          width="96"
          height="96"
        />
      </div>

      <div className="temp-row">
        <span className="temp">{tempDisplay}</span>
        <div className="unit-toggle">
          <button
            type="button"
            className={`unit ${unit === "C" ? "active" : ""}`}
            onClick={() => setUnit("C")}
          >
            °C
          </button>
          <span className="sep">|</span>
          <button
            type="button"
            className={`unit ${unit === "F" ? "active" : ""}`}
            onClick={() => setUnit("F")}
          >
            °F
          </button>
        </div>
      </div>

      <p className="desc">{desc}</p>

      <ul className="details">
        <li>Humidity: <strong>{humidity != null ? humidity : "—"}%</strong></li>
        <li>Wind: <strong>{wind != null ? wind.toFixed(1) : "—"} m/s</strong></li>
      </ul>
    </section>
  );
}

function Forecast({ days, unit }) {
  return (
    <section className="forecast">
      <div className="grid">
        {(days || []).slice(0, 6).map((d, i) => (
          <div className="day" key={i} title={d.text}>
            <div className="name">{d.name}</div>
            <img
              className="ico"
              src={`https://openweathermap.org/img/wn/${d.icon}@2x.png`}
              alt={d.text}
              width="60"
              height="60"
            />
            <div className="t">
              {unit === "C"
                ? `${Math.round(d.max)}° / ${Math.round(d.min)}°`
                : `${Math.round(d.max * 9/5 + 32)}° / ${Math.round(d.min * 9/5 + 32)}°`}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function Footer() {
  return (
    <footer className="footer">
      <span className="rainbow">🌈</span>
      Coded by <strong>&nbsp;Camelia Simion</strong>,{" "}
      <a
        href="https://github.com/simcamelia/ReactW4CS"
        target="_blank"
        rel="noreferrer"
        className="link-github"
      >
        open-sourced on GitHub
      </a>{" "}
      and{" "}
      <a
        href="https://reactw4cs.netlify.app/"
        target="_blank"
        rel="noreferrer"
        className="link-netlify"
      >
        hosted on Netlify
      </a>
      .
    </footer>
  );
}


// ------------------ MAIN APP ------------------

export default function App() {
  const [query, setQuery] = useState("");
  const [city, setCity] = useState("—");
  const [date, setDate] = useState("");
  const [desc, setDesc] = useState("—");
  const [icon, setIcon] = useState("01d");
  const [tempC, setTempC] = useState(null);
  const [humidity, setHumidity] = useState(null);
  const [wind, setWind] = useState(null);
  const [unit, setUnit] = useState("C");
  const [days, setDays] = useState([]);
  const [error, setError] = useState("");

  const getInitialTheme = () => {
    try {
      const saved = localStorage.getItem("theme");
      if (saved === "dark" || saved === "light") return saved;
    } catch {}
    return window.matchMedia &&
      window.matchMedia("(prefers-color-scheme: dark)").matches
      ? "dark"
      : "light";
  };
  const [theme, setTheme] = useState(getInitialTheme);

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    try {
      localStorage.setItem("theme", theme);
    } catch {}
  }, [theme]);

  const tempDisplay = useMemo(() => {
    if (tempC == null) return "–";
    const c = Math.round(tempC);
    const f = Math.round(c * 9/5 + 32);
    return unit === "C" ? `${c}°` : `${f}°`;
  }, [tempC, unit]);

  const fetchCity = useCallback(async (q) => {
    try {
      setError("");
      const geo = await axios.get(GEO(q));
      const res = geo?.data?.results || [];
      if (!res.length) {
        setError("City not found. Try another search.");
        return;
      }
      const g = res[0];
      const label = `${g.name}${g.admin1 ? ", " + g.admin1 : ""}${g.country ? ", " + g.country : ""}`;
      const fore = await axios.get(FORE(g.latitude, g.longitude));
      const cur = fore?.data?.current;
      const daily = fore?.data?.daily;

      setCity(label);
      setDate(new Date().toLocaleString(undefined, { weekday:"long", hour:"2-digit", minute:"2-digit" }));
      setDesc(codeToText(cur.weather_code));
      setIcon(codeToIcon(cur.weather_code));
      setTempC(cur.temperature_2m ?? null);
      setHumidity(Math.round(cur.relative_humidity_2m ?? 0));
      setWind(cur.wind_speed_10m ?? null);

      const out = [];
      for (let i = 1; i < Math.min(daily.time.length, 7); i++) {
        out.push({
          name: new Date(daily.time[i]).toLocaleDateString(undefined, { weekday:"short" }),
          icon: codeToIcon(daily.weather_code[i]),
          text: codeToText(daily.weather_code[i]),
          min: daily.temperature_2m_min[i],
          max: daily.temperature_2m_max[i]
        });
      }
      setDays(out);
    } catch (e) {
      console.error(e);
      setError("Could not load data. Please try again.");
    }
  }, []);

  useEffect(() => {
    fetchCity("London");
  }, [fetchCity]);

  return (
    <div className="shell">
      <div className="container">
        <Header
          query={query}
          setQuery={setQuery}
          onSearch={fetchCity}
          theme={theme}
          onThemeChange={setTheme}
        />
        {error && <div className="error">{error}</div>}
        <Current
          city={city}
          date={date}
          tempDisplay={tempDisplay}
          unit={unit}
          setUnit={setUnit}
          desc={desc}
          icon={icon}
          humidity={humidity}
          wind={wind}
        />
        <Forecast days={days} unit={unit} />
        <Footer />
      </div>
    </div>
  );
}
