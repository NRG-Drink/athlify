// import { useState } from 'react'
// import reactLogo from './assets/react.svg'
// import viteLogo from './assets/vite.svg'
// import heroImg from './assets/hero.png'
import { ResponsiveContainer } from "recharts";
import "./App.css";
import TemplateDiagram from "./chart-demo/template";
import TrackDiagram from "./chart-demo/TrackDiagram";
import {
  addFormattedDate,
  getAggregatedData as aggregateData,
  getConsistentDates,
  getConsistentMonths,
  getConsistentYears,
  getFormattedDate,
  getMinMaxDates,
  toDiagramDataBy,
  toDiagramDataByDay,
  TrackData,
} from "./chart-demo/track-data";

const trackData = [
  new TrackData("2024-01-01", 50, 30, 100, 30),
  new TrackData("2024-01-02", 100, 60, 200, 60),
  new TrackData("2024-01-03", 70, 45, 150, 45),
  new TrackData("2024-01-04", 120, 75, 250, 75),
  new TrackData("2024-01-15", 90, 55, 180, 55),
  new TrackData("2024-01-20", 110, 65, 220, 65),
  new TrackData("2024-01-25", 80, 50, 160, 50),
  new TrackData("2024-01-30", 130, 80, 270, 80),
  // Create two TrackData entries for the same date to test aggregation
  new TrackData("2024-01-13", 60, 35, 120, 35),
  new TrackData("2024-01-13", 70, 40, 140, 40),

  new TrackData("2024-02-01", 90, 55, 180, 55),
  new TrackData("2024-02-02", 100, 60, 200, 60),
  new TrackData("2024-02-03", 80, 50, 160, 50),
  new TrackData("2024-02-04", 110, 65, 220, 65),
  new TrackData("2024-02-05", 70, 45, 140, 45),
  new TrackData("2024-02-06", 120, 75, 240, 75),
  new TrackData("2024-02-07", 90, 55, 180, 55),
  new TrackData("2024-02-08", 100, 60, 200, 60),
  new TrackData("2024-02-09", 80, 50, 160, 50),
  new TrackData("2024-02-10", 110, 65, 220, 65),
  new TrackData("2024-02-11", 70, 45, 140, 45),
  new TrackData("2024-02-12", 120, 75, 240, 75),
  new TrackData("2024-02-13", 90, 55, 180, 55),

  // March data
  new TrackData("2024-03-01", 100, 60, 200, 60),
  new TrackData("2024-03-02", 80, 50, 160, 50),
  new TrackData("2024-03-03", 110, 65, 220, 65),
  new TrackData("2024-03-04", 70, 45, 140, 45),
  new TrackData("2024-03-05", 120, 75, 240, 75),

  // April data
  new TrackData("2024-04-01", 90, 55, 180, 55),
  new TrackData("2024-04-02", 100, 60, 200, 60),
  new TrackData("2024-04-03", 80, 50, 160, 50),
  new TrackData("2024-04-04", 110, 65, 220, 65),

  // January data for 2025 to test year aggregation
  new TrackData("2025-01-01", 50, 30, 100, 30),
  new TrackData("2025-01-02", 100, 60, 200, 60),
  new TrackData("2025-01-03", 70, 45, 150, 45),
  new TrackData("2025-01-04", 120, 75, 250, 75),
  new TrackData("2025-01-15", 90, 55, 180, 55),
  new TrackData("2025-01-20", 110, 65, 220, 65),
  new TrackData("2025-01-25", 80, 50, 160, 50),
  new TrackData("2025-01-30", 130, 80, 270, 80),

  // February data for 2025 to test year aggregation
  new TrackData("2025-02-01", 90, 55, 180, 55),
  new TrackData("2025-02-02", 100, 60, 200, 60),
  new TrackData("2025-02-03", 80, 50, 160, 50),

  // March data for 2025 to test year aggregation
  new TrackData("2025-03-01", 100, 60, 200, 60),
  new TrackData("2025-03-02", 80, 50, 160, 50),
  new TrackData("2025-03-03", 110, 65, 220, 65),
];

function App() {
  // const [count, setCount] = useState(0)

  // const chartData = toDiagramDataByDay(trackData);
  // const chartData = toDiagramDataBy(trackData, (data) => data.monthNumber);
  const key = "month"; // Change this to "month", "week", or "day" as needed
  const formattedDates = addFormattedDate(trackData, key);
  const minMaxDates = getMinMaxDates(formattedDates);
  const consistentDates = getConsistentDates(minMaxDates.minDate, minMaxDates.maxDate, key);
  const chartData = aggregateData(formattedDates, consistentDates, key);

  return (
    <>
      <div
        style={{
          width: "calc(100vw - 20px)",
          height: "calc(80vh - 20px)",
          margin: "10px",
          padding: "5px",
          overflow: "hidden",
          boxSizing: "border-box",
          border: "4px solid #818181",
          borderRadius: "15px",
          backgroundColor: "#b8e2e0",
        }}
      >
        <ResponsiveContainer style={{ margin: "0", padding: "0" }}>
          {/* <TemplateDiagram /> */}
          <TrackDiagram data={chartData} />
        </ResponsiveContainer>
      </div>

      {/* <section id="center">
        <div className="hero">
          <img src={heroImg} className="base" width="170" height="179" alt="" />
          <img src={reactLogo} className="framework" alt="React logo" />
          <img src={viteLogo} className="vite" alt="Vite logo" />
        </div>
        <div>
          <h1>Get started</h1>
          <p>
            Edit <code>src/App.tsx</code> and save to test <code>HMR</code>
          </p>
        </div>
        <button
          type="button"
          className="counter"
          onClick={() => setCount((count) => count + 1)}
        >
          Count is {count}
        </button>
      </section>

      <div className="ticks"></div>

      <section id="next-steps">
        <div id="docs">
          <svg className="icon" role="presentation" aria-hidden="true">
            <use href="/icons.svg#documentation-icon"></use>
          </svg>
          <h2>Documentation</h2>
          <p>Your questions, answered</p>
          <ul>
            <li>
              <a href="https://vite.dev/" target="_blank">
                <img className="logo" src={viteLogo} alt="" />
                Explore Vite
              </a>
            </li>
            <li>
              <a href="https://react.dev/" target="_blank">
                <img className="button-icon" src={reactLogo} alt="" />
                Learn more
              </a>
            </li>
          </ul>
        </div>
        <div id="social">
          <svg className="icon" role="presentation" aria-hidden="true">
            <use href="/icons.svg#social-icon"></use>
          </svg>
          <h2>Connect with us</h2>
          <p>Join the Vite community</p>
          <ul>
            <li>
              <a href="https://github.com/vitejs/vite" target="_blank">
                <svg
                  className="button-icon"
                  role="presentation"
                  aria-hidden="true"
                >
                  <use href="/icons.svg#github-icon"></use>
                </svg>
                GitHub
              </a>
            </li>
            <li>
              <a href="https://chat.vite.dev/" target="_blank">
                <svg
                  className="button-icon"
                  role="presentation"
                  aria-hidden="true"
                >
                  <use href="/icons.svg#discord-icon"></use>
                </svg>
                Discord
              </a>
            </li>
            <li>
              <a href="https://x.com/vite_js" target="_blank">
                <svg
                  className="button-icon"
                  role="presentation"
                  aria-hidden="true"
                >
                  <use href="/icons.svg#x-icon"></use>
                </svg>
                X.com
              </a>
            </li>
            <li>
              <a href="https://bsky.app/profile/vite.dev" target="_blank">
                <svg
                  className="button-icon"
                  role="presentation"
                  aria-hidden="true"
                >
                  <use href="/icons.svg#bluesky-icon"></use>
                </svg>
                Bluesky
              </a>
            </li>
          </ul>
        </div>
      </section>

      <div className="ticks"></div>
      <section id="spacer"></section> */}
    </>
  );
}

export default App;
