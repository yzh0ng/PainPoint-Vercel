import React, { useState, useEffect, useMemo, useRef } from "react";

// ============================================================================
// ClearPain — a calm pain tracking app
// ============================================================================

const STORAGE_KEY = "clearpain_entries";

const PAIN_TYPES = ["sharp", "dull", "aching", "burning", "throbbing", "tingling"];
const DEFAULT_TRIGGERS = [
  "waking up",
  "walking",
  "sitting",
  "after eating",
  "stress",
  "weather",
  "exercise",
  "no clear trigger",
];

const REGION_LABELS = {
  head: "head",
  left_shoulder: "left shoulder",
  right_shoulder: "right shoulder",
  chest: "chest",
  upper_back: "upper back",
  abdomen: "abdomen",
  lower_back: "lower back",
  left_arm: "left arm",
  right_arm: "right arm",
  left_hip: "left hip",
  right_hip: "right hip",
  left_knee: "left knee",
  right_knee: "right knee",
  left_foot: "left foot",
  right_foot: "right foot",
};

// Regions available per body view
const FRONT_REGIONS = [
  "head",
  "left_shoulder",
  "right_shoulder",
  "chest",
  "abdomen",
  "left_arm",
  "right_arm",
  "left_hip",
  "right_hip",
  "left_knee",
  "right_knee",
  "left_foot",
  "right_foot",
];

const BACK_REGIONS = [
  "head",
  "left_shoulder",
  "right_shoulder",
  "upper_back",
  "lower_back",
  "left_arm",
  "right_arm",
  "left_hip",
  "right_hip",
  "left_knee",
  "right_knee",
  "left_foot",
  "right_foot",
];

// ============================================================================
// Sample data seeding — 21 days of realistic varied entries
// ============================================================================

function seedSampleData() {
  const now = Date.now();
  const DAY = 24 * 60 * 60 * 1000;
  const entries = [];

  const regions = ["lower_back", "left_hip", "right_knee", "abdomen"];
  const triggers = DEFAULT_TRIGGERS;
  const types = PAIN_TYPES;

  // Generate 35-40 entries over last 21 days
  const count = 38;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayStart = today.getTime();

  for (let i = 0; i < count; i++) {
    // Distribute across 21 days, weighted toward recent
    const dayOffset = Math.floor(Math.random() * 21);
    const hourOffset = 6 + Math.floor(Math.random() * 16); // 6am-10pm
    const minuteOffset = Math.floor(Math.random() * 60);
    // Anchor to start of day N days ago, then add hour/minute
    let timestamp =
      todayStart - dayOffset * DAY + hourOffset * 60 * 60 * 1000 + minuteOffset * 60 * 1000;
    // Guard: never in the future
    if (timestamp > now) timestamp = now - Math.floor(Math.random() * 3600000);

    // Recent entries trend higher intensity (upward trend over last week)
    let baseIntensity;
    if (dayOffset <= 6) {
      baseIntensity = 5 + Math.floor(Math.random() * 4); // 5-8
    } else if (dayOffset <= 13) {
      baseIntensity = 4 + Math.floor(Math.random() * 3); // 4-6
    } else {
      baseIntensity = 3 + Math.floor(Math.random() * 3); // 3-5
    }

    // Lower back is most common
    let region;
    const r = Math.random();
    if (r < 0.45) region = "lower_back";
    else if (r < 0.7) region = "left_hip";
    else if (r < 0.88) region = "right_knee";
    else region = "abdomen";

    // Waking up is the most common trigger
    let trigger;
    const t = Math.random();
    if (t < 0.35) trigger = "waking up";
    else if (t < 0.55) trigger = "sitting";
    else if (t < 0.72) trigger = "stress";
    else trigger = triggers[Math.floor(Math.random() * triggers.length)];

    entries.push({
      id: `seed_${i}_${timestamp}`,
      region,
      painType: types[Math.floor(Math.random() * types.length)],
      intensity: baseIntensity,
      trigger,
      note: "",
      timestamp,
    });
  }

  // Ensure "aching" is most common pain type
  entries.forEach((e, idx) => {
    if (idx % 3 === 0) e.painType = "aching";
  });

  entries.sort((a, b) => b.timestamp - a.timestamp);
  return entries;
}

// ============================================================================
// Utility functions
// ============================================================================

function greeting() {
  const h = new Date().getHours();
  if (h < 12) return "good morning";
  if (h < 18) return "good afternoon";
  return "good evening";
}

function formatDate(ts) {
  const d = new Date(ts);
  return d.toLocaleDateString("en-US", {
    weekday: "long",
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function formatDateShort(ts) {
  const d = new Date(ts);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function formatDateLong(ts) {
  const d = new Date(ts);
  return d.toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

function dateKey(ts) {
  const d = new Date(ts);
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
}

function timeAgo(ts) {
  const diff = Date.now() - ts;
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return formatDateShort(ts);
}

function intensityColor(n) {
  if (n <= 3) return "#7BAE8F"; // sage
  if (n <= 6) return "#D4A843"; // amber
  return "#E8735A"; // coral
}

function dayHeader(ts) {
  const d = new Date(ts);
  const now = new Date();
  const yesterday = new Date();
  yesterday.setDate(now.getDate() - 1);
  if (dateKey(ts) === dateKey(now.getTime())) return "today";
  if (dateKey(ts) === dateKey(yesterday.getTime())) return "yesterday";
  return d
    .toLocaleDateString("en-US", {
      weekday: "long",
      month: "short",
      day: "numeric",
    })
    .toLowerCase();
}

// ============================================================================
// Body SVG — gentle, rounded, warm
// ============================================================================


function BodyFront({ onRegionTap, pulseRegion, heatmap }) {
  const heatFill = (region) => {
    if (!heatmap) return "transparent";
    const count = heatmap[region] || 0;
    if (count === 0) return "transparent";
    const max = Math.max(...Object.values(heatmap), 1);
    const intensity = count / max;
    if (intensity < 0.34) return `rgba(123, 174, 143, ${0.3 + intensity * 0.4})`;
    if (intensity < 0.67) return `rgba(212, 168, 67, ${0.4 + intensity * 0.4})`;
    return `rgba(232, 115, 90, ${0.45 + intensity * 0.45})`;
  };

  return (
    <svg
      viewBox="0 0 200 500"
      xmlns="http://www.w3.org/2000/svg"
      preserveAspectRatio="xMidYMid meet"
      style={{ width: "100%", height: "100%", display: "block" }}
    >
      <image
        href="/body-front.png"
        x="18"
        y="8"
        width="164"
        height="484"
        preserveAspectRatio="xMidYMid meet"
      />

      {/* heatmap overlays */}
      <ellipse cx="100" cy="48" rx="17" ry="22" fill={heatFill("head")} pointerEvents="none" />
      <circle cx="79" cy="99" r="12" fill={heatFill("left_shoulder")} pointerEvents="none" />
      <circle cx="121" cy="99" r="12" fill={heatFill("right_shoulder")} pointerEvents="none" />
      <ellipse cx="100" cy="146" rx="28" ry="24" fill={heatFill("chest")} pointerEvents="none" />
      <ellipse cx="100" cy="207" rx="27" ry="28" fill={heatFill("abdomen")} pointerEvents="none" />
      <ellipse cx="60" cy="188" rx="12" ry="42" fill={heatFill("left_arm")} pointerEvents="none" />
      <ellipse cx="140" cy="188" rx="12" ry="42" fill={heatFill("right_arm")} pointerEvents="none" />
      <circle cx="86" cy="268" r="13" fill={heatFill("left_hip")} pointerEvents="none" />
      <circle cx="114" cy="268" r="13" fill={heatFill("right_hip")} pointerEvents="none" />
      <circle cx="86" cy="381" r="14" fill={heatFill("left_knee")} pointerEvents="none" />
      <circle cx="114" cy="381" r="14" fill={heatFill("right_knee")} pointerEvents="none" />
      <ellipse cx="84" cy="474" rx="13" ry="10" fill={heatFill("left_foot")} pointerEvents="none" />
      <ellipse cx="116" cy="474" rx="13" ry="10" fill={heatFill("right_foot")} pointerEvents="none" />

      {/* tap zones */}
      {!heatmap && (
        <g>
          <ellipse cx="100" cy="48" rx="24" ry="30" fill="transparent" onClick={() => onRegionTap("head")} style={{ cursor: "pointer" }} />
          <circle cx="79" cy="99" r="16" fill="transparent" onClick={() => onRegionTap("left_shoulder")} style={{ cursor: "pointer" }} />
          <circle cx="121" cy="99" r="16" fill="transparent" onClick={() => onRegionTap("right_shoulder")} style={{ cursor: "pointer" }} />
          <ellipse cx="100" cy="146" rx="34" ry="30" fill="transparent" onClick={() => onRegionTap("chest")} style={{ cursor: "pointer" }} />
          <ellipse cx="100" cy="207" rx="34" ry="34" fill="transparent" onClick={() => onRegionTap("abdomen")} style={{ cursor: "pointer" }} />
          <ellipse cx="60" cy="188" rx="18" ry="58" fill="transparent" onClick={() => onRegionTap("left_arm")} style={{ cursor: "pointer" }} />
          <ellipse cx="140" cy="188" rx="18" ry="58" fill="transparent" onClick={() => onRegionTap("right_arm")} style={{ cursor: "pointer" }} />
          <circle cx="86" cy="268" r="18" fill="transparent" onClick={() => onRegionTap("left_hip")} style={{ cursor: "pointer" }} />
          <circle cx="114" cy="268" r="18" fill="transparent" onClick={() => onRegionTap("right_hip")} style={{ cursor: "pointer" }} />
          <circle cx="86" cy="381" r="20" fill="transparent" onClick={() => onRegionTap("left_knee")} style={{ cursor: "pointer" }} />
          <circle cx="114" cy="381" r="20" fill="transparent" onClick={() => onRegionTap("right_knee")} style={{ cursor: "pointer" }} />
          <ellipse cx="84" cy="474" rx="16" ry="14" fill="transparent" onClick={() => onRegionTap("left_foot")} style={{ cursor: "pointer" }} />
          <ellipse cx="116" cy="474" rx="16" ry="14" fill="transparent" onClick={() => onRegionTap("right_foot")} style={{ cursor: "pointer" }} />
        </g>
      )}

      {pulseRegion && <PulseRing region={pulseRegion} view="front" />}
    </svg>
  );
}



function BodyBack({ onRegionTap, pulseRegion, heatmap }) {
  const heatFill = (region) => {
    if (!heatmap) return "transparent";
    const count = heatmap[region] || 0;
    if (count === 0) return "transparent";
    const max = Math.max(...Object.values(heatmap), 1);
    const intensity = count / max;
    if (intensity < 0.34) return `rgba(123, 174, 143, ${0.3 + intensity * 0.4})`;
    if (intensity < 0.67) return `rgba(212, 168, 67, ${0.4 + intensity * 0.4})`;
    return `rgba(232, 115, 90, ${0.45 + intensity * 0.45})`;
  };

  return (
    <svg
      viewBox="0 0 200 500"
      xmlns="http://www.w3.org/2000/svg"
      preserveAspectRatio="xMidYMid meet"
      style={{ width: "100%", height: "100%", display: "block" }}
    >
      <image
        href="/body-back.png"
        x="18"
        y="8"
        width="164"
        height="484"
        preserveAspectRatio="xMidYMid meet"
      />

      {/* heatmap overlays */}
      <ellipse cx="100" cy="48" rx="18" ry="22" fill={heatFill("head")} pointerEvents="none" />
      <circle cx="79" cy="99" r="12" fill={heatFill("left_shoulder")} pointerEvents="none" />
      <circle cx="121" cy="99" r="12" fill={heatFill("right_shoulder")} pointerEvents="none" />
      <ellipse cx="100" cy="151" rx="30" ry="30" fill={heatFill("upper_back")} pointerEvents="none" />
      <ellipse cx="100" cy="217" rx="29" ry="28" fill={heatFill("lower_back")} pointerEvents="none" />
      <ellipse cx="60" cy="188" rx="12" ry="42" fill={heatFill("left_arm")} pointerEvents="none" />
      <ellipse cx="140" cy="188" rx="12" ry="42" fill={heatFill("right_arm")} pointerEvents="none" />
      <circle cx="86" cy="268" r="13" fill={heatFill("left_hip")} pointerEvents="none" />
      <circle cx="114" cy="268" r="13" fill={heatFill("right_hip")} pointerEvents="none" />
      <circle cx="86" cy="381" r="14" fill={heatFill("left_knee")} pointerEvents="none" />
      <circle cx="114" cy="381" r="14" fill={heatFill("right_knee")} pointerEvents="none" />
      <ellipse cx="84" cy="474" rx="13" ry="10" fill={heatFill("left_foot")} pointerEvents="none" />
      <ellipse cx="116" cy="474" rx="13" ry="10" fill={heatFill("right_foot")} pointerEvents="none" />

      {/* tap zones */}
      {!heatmap && (
        <g>
          <ellipse cx="100" cy="48" rx="24" ry="30" fill="transparent" onClick={() => onRegionTap("head")} style={{ cursor: "pointer" }} />
          <circle cx="79" cy="99" r="16" fill="transparent" onClick={() => onRegionTap("left_shoulder")} style={{ cursor: "pointer" }} />
          <circle cx="121" cy="99" r="16" fill="transparent" onClick={() => onRegionTap("right_shoulder")} style={{ cursor: "pointer" }} />
          <ellipse cx="100" cy="151" rx="34" ry="34" fill="transparent" onClick={() => onRegionTap("upper_back")} style={{ cursor: "pointer" }} />
          <ellipse cx="100" cy="217" rx="34" ry="32" fill="transparent" onClick={() => onRegionTap("lower_back")} style={{ cursor: "pointer" }} />
          <ellipse cx="60" cy="188" rx="18" ry="58" fill="transparent" onClick={() => onRegionTap("left_arm")} style={{ cursor: "pointer" }} />
          <ellipse cx="140" cy="188" rx="18" ry="58" fill="transparent" onClick={() => onRegionTap("right_arm")} style={{ cursor: "pointer" }} />
          <circle cx="86" cy="268" r="18" fill="transparent" onClick={() => onRegionTap("left_hip")} style={{ cursor: "pointer" }} />
          <circle cx="114" cy="268" r="18" fill="transparent" onClick={() => onRegionTap("right_hip")} style={{ cursor: "pointer" }} />
          <circle cx="86" cy="381" r="20" fill="transparent" onClick={() => onRegionTap("left_knee")} style={{ cursor: "pointer" }} />
          <circle cx="114" cy="381" r="20" fill="transparent" onClick={() => onRegionTap("right_knee")} style={{ cursor: "pointer" }} />
          <ellipse cx="84" cy="474" rx="16" ry="14" fill="transparent" onClick={() => onRegionTap("left_foot")} style={{ cursor: "pointer" }} />
          <ellipse cx="116" cy="474" rx="16" ry="14" fill="transparent" onClick={() => onRegionTap("right_foot")} style={{ cursor: "pointer" }} />
        </g>
      )}

      {pulseRegion && <PulseRing region={pulseRegion} view="back" />}
    </svg>
  );
}


const REGION_COORDS_FRONT = {
  head: { cx: 100, cy: 48 },
  left_shoulder: { cx: 79, cy: 99 },
  right_shoulder: { cx: 121, cy: 99 },
  chest: { cx: 100, cy: 146 },
  abdomen: { cx: 100, cy: 207 },
  left_arm: { cx: 60, cy: 188 },
  right_arm: { cx: 140, cy: 188 },
  left_hip: { cx: 86, cy: 268 },
  right_hip: { cx: 114, cy: 268 },
  left_knee: { cx: 86, cy: 381 },
  right_knee: { cx: 114, cy: 381 },
  left_foot: { cx: 84, cy: 474 },
  right_foot: { cx: 116, cy: 474 },
};

const REGION_COORDS_BACK = {
  head: { cx: 100, cy: 48 },
  left_shoulder: { cx: 79, cy: 99 },
  right_shoulder: { cx: 121, cy: 99 },
  upper_back: { cx: 100, cy: 151 },
  lower_back: { cx: 100, cy: 217 },
  left_arm: { cx: 60, cy: 188 },
  right_arm: { cx: 140, cy: 188 },
  left_hip: { cx: 86, cy: 268 },
  right_hip: { cx: 114, cy: 268 },
  left_knee: { cx: 86, cy: 381 },
  right_knee: { cx: 114, cy: 381 },
  left_foot: { cx: 84, cy: 474 },
  right_foot: { cx: 116, cy: 474 },
};

function PulseRing({ region, view }) {
  const coords = view === "front" ? REGION_COORDS_FRONT[region] : REGION_COORDS_BACK[region];
  if (!coords) return null;
  return (
    <g style={{ pointerEvents: "none" }}>
      <circle
        cx={coords.cx}
        cy={coords.cy}
        r={10}
        fill="none"
        stroke="#7BAE8F"
        strokeWidth="1.5"
        style={{
          animation: "cp-pulse 650ms ease-out forwards",
          transformOrigin: `${coords.cx}px ${coords.cy}px`,
          transformBox: "fill-box",
        }}
      />
      <circle
        cx={coords.cx}
        cy={coords.cy}
        r={8}
        fill="#7BAE8F"
        fillOpacity="0.25"
        style={{
          animation: "cp-pulse-fill 650ms ease-out forwards",
          transformOrigin: `${coords.cx}px ${coords.cy}px`,
          transformBox: "fill-box",
        }}
      />
    </g>
  );
}

// Empty state little figure
function CalmFigure() {
  return (
    <svg viewBox="0 0 120 120" style={{ width: 120, height: 120, opacity: 0.6 }}>
      {/* sitting figure */}
      <circle cx="60" cy="35" r="14" fill="#F2C9A0" stroke="#D4956A" strokeWidth="0.8" />
      <path
        d="M 45 50 Q 40 65 42 85 L 42 95 Q 42 100 48 100 L 72 100 Q 78 100 78 95 L 78 85 Q 80 65 75 50 Q 70 46 60 46 Q 50 46 45 50 Z"
        fill="#F2C9A0"
        stroke="#D4956A"
        strokeWidth="0.8"
      />
      <path d="M 42 100 Q 35 105 38 115" stroke="#D4956A" strokeWidth="0.8" fill="none" />
      <path d="M 78 100 Q 85 105 82 115" stroke="#D4956A" strokeWidth="0.8" fill="none" />
    </svg>
  );
}

// ============================================================================
// Main app
// ============================================================================

export default function ClearPain() {
  const [entries, setEntries] = useState([]);
  const [tab, setTab] = useState("log");
  const [bodyView, setBodyView] = useState("front");
  const [sheetOpen, setSheetOpen] = useState(false);
  const [selectedRegion, setSelectedRegion] = useState(null);
  const [pulseRegion, setPulseRegion] = useState(null);
  const [toast, setToast] = useState("");
  const [reportTab, setReportTab] = useState("summary");
  const [customTriggers, setCustomTriggers] = useState([]);
  const [detailEntry, setDetailEntry] = useState(null);

  // Load / seed entries
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        setEntries(JSON.parse(raw));
      } else {
        const seed = seedSampleData();
        localStorage.setItem(STORAGE_KEY, JSON.stringify(seed));
        setEntries(seed);
      }
    } catch (err) {
      const seed = seedSampleData();
      setEntries(seed);
    }
  }, []);

  // Persist
  const saveEntries = (next) => {
    setEntries(next);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch (err) {
      /* ignore */
    }
  };

  // region tap
  const handleRegionTap = (region) => {
    setPulseRegion(region);
    setTimeout(() => setPulseRegion(null), 650);
    setTimeout(() => {
      setSelectedRegion(region);
      setSheetOpen(true);
    }, 150);
  };

  const addEntry = (entry) => {
    const newEntry = {
      id: `e_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      ...entry,
      timestamp: Date.now(),
    };
    const next = [newEntry, ...entries];
    saveEntries(next);
    showToast("logged ✓");
  };

  const deleteEntry = (id) => {
    saveEntries(entries.filter((e) => e.id !== id));
  };

  const showToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(""), 2000);
  };

  return (
    <>
      <style>{styles}</style>
      <div className="cp-canvas">
        <div className="cp-phone">
          {/* Content */}
          <div className="cp-content">
            <div className={`cp-tab-panel ${tab === "log" ? "active" : ""}`}>
              {tab === "log" && (
                <LogTab
                  entries={entries}
                  bodyView={bodyView}
                  setBodyView={setBodyView}
                  onRegionTap={handleRegionTap}
                  pulseRegion={pulseRegion}
                  onEntryClick={setDetailEntry}
                />
              )}
            </div>
            <div className={`cp-tab-panel ${tab === "history" ? "active" : ""}`}>
              {tab === "history" && (
                <HistoryTab entries={entries} onDelete={deleteEntry} onEntryClick={setDetailEntry} />
              )}
            </div>
            <div className={`cp-tab-panel ${tab === "report" ? "active" : ""}`}>
              {tab === "report" && (
                <ReportTab
                  entries={entries}
                  reportTab={reportTab}
                  setReportTab={setReportTab}
                  showToast={showToast}
                />
              )}
            </div>
          </div>

          {/* Toast */}
          {toast && <div className="cp-toast">{toast}</div>}

          {/* Bottom sheet */}
          <BottomSheet
            open={sheetOpen}
            onClose={() => setSheetOpen(false)}
            region={selectedRegion}
            onSave={(data) => {
              addEntry({ region: selectedRegion, ...data });
              setSheetOpen(false);
            }}
            customTriggers={customTriggers}
            setCustomTriggers={setCustomTriggers}
          />

          {/* Detail view */}
          {detailEntry && (
            <DetailView entry={detailEntry} onClose={() => setDetailEntry(null)} onDelete={(id) => { deleteEntry(id); setDetailEntry(null); }} />
          )}

          {/* Bottom nav */}
          <nav className="cp-nav">
            <button
              className={`cp-nav-btn ${tab === "log" ? "active" : ""}`}
              onClick={() => setTab("log")}
            >
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="9" />
                <path d="M12 7v10M7 12h10" />
              </svg>
              <span>log</span>
            </button>
            <button
              className={`cp-nav-btn ${tab === "history" ? "active" : ""}`}
              onClick={() => setTab("history")}
            >
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 12a9 9 0 1 0 3-6.7" />
                <path d="M3 4v5h5" />
                <path d="M12 8v4l3 2" />
              </svg>
              <span>history</span>
            </button>
            <button
              className={`cp-nav-btn ${tab === "report" ? "active" : ""}`}
              onClick={() => setTab("report")}
            >
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                <rect x="5" y="3" width="14" height="18" rx="2" />
                <path d="M9 8h6M9 12h6M9 16h4" />
              </svg>
              <span>report</span>
            </button>
          </nav>
        </div>
      </div>
    </>
  );
}

// ============================================================================
// Log tab
// ============================================================================

function LogTab({ entries, bodyView, setBodyView, onRegionTap, pulseRegion, onEntryClick }) {
  const recent = entries.slice(0, 2);
  const today = new Date();
  const dateStr = today.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  }).toLowerCase();

  return (
    <div className="cp-log">
      <div className="cp-log-header">
        <div className="cp-greeting">{greeting()}</div>
        <div className="cp-date">{dateStr}</div>
      </div>

      <div className="cp-body-toggle">
        <button
          className={`cp-toggle-btn ${bodyView === "front" ? "active" : ""}`}
          onClick={() => setBodyView("front")}
        >
          front
        </button>
        <button
          className={`cp-toggle-btn ${bodyView === "back" ? "active" : ""}`}
          onClick={() => setBodyView("back")}
        >
          back
        </button>
      </div>

      <div className="cp-body-wrap">
        <div key={bodyView} className="cp-body-inner">
          {bodyView === "front" ? (
            <BodyFront onRegionTap={onRegionTap} pulseRegion={pulseRegion} />
          ) : (
            <BodyBack onRegionTap={onRegionTap} pulseRegion={pulseRegion} />
          )}
        </div>
      </div>

      <div className="cp-log-hint">tap anywhere on the body to log</div>

      {recent.length > 0 && (
        <div className="cp-recent">
          <div className="cp-recent-label">recent</div>
          {recent.map((e) => (
            <button key={e.id} className="cp-recent-card" onClick={() => onEntryClick(e)}>
              <span className="cp-recent-dot" style={{ background: intensityColor(e.intensity) }} />
              <div className="cp-recent-meta">
                <div className="cp-recent-region">{REGION_LABELS[e.region]}</div>
                <div className="cp-recent-sub">
                  {e.painType} · {e.intensity}/10
                </div>
              </div>
              <div className="cp-recent-time">{timeAgo(e.timestamp)}</div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ============================================================================
// Bottom sheet (log form)
// ============================================================================

function BottomSheet({ open, onClose, region, onSave, customTriggers, setCustomTriggers }) {
  const [painType, setPainType] = useState("aching");
  const [intensity, setIntensity] = useState(5);
  const [trigger, setTrigger] = useState("");
  const [note, setNote] = useState("");
  const [customOpen, setCustomOpen] = useState(false);
  const [customText, setCustomText] = useState("");

  useEffect(() => {
    if (open) {
      setPainType("aching");
      setIntensity(5);
      setTrigger("");
      setNote("");
      setCustomOpen(false);
      setCustomText("");
    }
  }, [open]);

  const allTriggers = [...DEFAULT_TRIGGERS, ...customTriggers];

  const handleAddCustom = () => {
    const t = customText.trim().toLowerCase();
    if (t && !allTriggers.includes(t)) {
      setCustomTriggers([...customTriggers, t]);
      setTrigger(t);
      setCustomOpen(false);
      setCustomText("");
    }
  };

  const handleSave = () => {
    onSave({
      painType,
      intensity,
      trigger: trigger || "no clear trigger",
      note: note.trim(),
    });
  };

  return (
    <>
      {open && <div className="cp-sheet-backdrop" onClick={onClose} />}
      <div className={`cp-sheet ${open ? "open" : ""}`}>
        <div className="cp-sheet-handle" onClick={onClose} />
        <div className="cp-sheet-inner">
          <div className="cp-sheet-region-pill">{region ? REGION_LABELS[region] : ""}</div>

          <div className="cp-field">
            <div className="cp-field-label">pain type</div>
            <div className="cp-pills-scroll">
              {PAIN_TYPES.map((t) => (
                <button
                  key={t}
                  className={`cp-pill ${painType === t ? "active" : ""}`}
                  onClick={() => setPainType(t)}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>

          <div className="cp-field">
            <div className="cp-field-label">intensity</div>
            <div className="cp-intensity-num" style={{ color: intensityColor(intensity) }}>
              {intensity}
            </div>
            <input
              type="range"
              min="1"
              max="10"
              value={intensity}
              onChange={(e) => setIntensity(Number(e.target.value))}
              className="cp-slider"
              style={{ "--thumb-color": intensityColor(intensity) }}
            />
            <div className="cp-slider-labels">
              <span>1</span>
              <span>10</span>
            </div>
          </div>

          <div className="cp-field">
            <div className="cp-field-label">trigger</div>
            <div className="cp-pills-wrap">
              {allTriggers.map((t) => (
                <button
                  key={t}
                  className={`cp-pill cp-pill-sm ${trigger === t ? "active" : ""}`}
                  onClick={() => setTrigger(t)}
                >
                  {t}
                </button>
              ))}
              {!customOpen ? (
                <button
                  className="cp-pill cp-pill-sm cp-pill-dashed"
                  onClick={() => setCustomOpen(true)}
                >
                  + add your own
                </button>
              ) : (
                <div className="cp-custom-input-wrap">
                  <input
                    autoFocus
                    className="cp-custom-input"
                    placeholder="e.g. lifting"
                    value={customText}
                    onChange={(e) => setCustomText(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleAddCustom()}
                  />
                  <button className="cp-custom-add" onClick={handleAddCustom}>add</button>
                </div>
              )}
            </div>
          </div>

          <div className="cp-field">
            <input
              className="cp-note-input"
              placeholder="optional note..."
              value={note}
              onChange={(e) => setNote(e.target.value)}
            />
          </div>

          <button className="cp-save-btn" onClick={handleSave}>save entry</button>
        </div>
      </div>
    </>
  );
}

// ============================================================================
// History tab
// ============================================================================

function HistoryTab({ entries, onDelete, onEntryClick }) {
  const stats = useMemo(() => {
    if (entries.length === 0) return { total: 0, topRegion: "—", avgIntensity: "—" };
    const regionCount = {};
    let sumIntensity = 0;
    entries.forEach((e) => {
      regionCount[e.region] = (regionCount[e.region] || 0) + 1;
      sumIntensity += e.intensity;
    });
    const topRegion = Object.entries(regionCount).sort((a, b) => b[1] - a[1])[0][0];
    return {
      total: entries.length,
      topRegion: REGION_LABELS[topRegion],
      avgIntensity: (sumIntensity / entries.length).toFixed(1),
    };
  }, [entries]);

  const grouped = useMemo(() => {
    const groups = {};
    entries.forEach((e) => {
      const key = dateKey(e.timestamp);
      if (!groups[key]) groups[key] = { label: dayHeader(e.timestamp), ts: e.timestamp, entries: [] };
      groups[key].entries.push(e);
    });
    return Object.values(groups).sort((a, b) => b.ts - a.ts);
  }, [entries]);

  if (entries.length === 0) {
    return (
      <div className="cp-empty">
        <CalmFigure />
        <p>nothing logged yet — tap the log tab to start.</p>
      </div>
    );
  }

  return (
    <div className="cp-history">
      <div className="cp-history-header">
        <h2>history</h2>
      </div>
      <div className="cp-stats-row">
        <div className="cp-stat">
          <div className="cp-stat-label">total logs</div>
          <div className="cp-stat-num">{stats.total}</div>
        </div>
        <div className="cp-stat">
          <div className="cp-stat-label">top region</div>
          <div className="cp-stat-num cp-stat-small">{stats.topRegion}</div>
        </div>
        <div className="cp-stat">
          <div className="cp-stat-label">avg</div>
          <div className="cp-stat-num">{stats.avgIntensity}</div>
        </div>
      </div>

      {grouped.map((group) => (
        <div key={group.label + group.ts} className="cp-group">
          <div className="cp-group-header">{group.label}</div>
          {group.entries.map((e) => (
            <div key={e.id} className="cp-entry-card" onClick={() => onEntryClick(e)}>
              <span className="cp-entry-dot" style={{ background: intensityColor(e.intensity) }} />
              <div className="cp-entry-meta">
                <div className="cp-entry-region">{REGION_LABELS[e.region]}</div>
                <div className="cp-entry-sub">
                  {e.painType} · {e.trigger}
                </div>
              </div>
              <div className="cp-entry-num">{e.intensity}</div>
              <button
                className="cp-entry-del"
                onClick={(ev) => {
                  ev.stopPropagation();
                  onDelete(e.id);
                }}
                aria-label="delete"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
                  <path d="M5 7h14M10 11v6M14 11v6M6 7l1 12a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-12M9 7V4h6v3" />
                </svg>
              </button>
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}

// ============================================================================
// Detail view
// ============================================================================

function DetailView({ entry, onClose, onDelete }) {
  return (
    <div className="cp-detail-overlay" onClick={onClose}>
      <div className="cp-detail-card" onClick={(e) => e.stopPropagation()}>
        <button className="cp-detail-close" onClick={onClose}>✕</button>
        <div className="cp-detail-region">{REGION_LABELS[entry.region]}</div>
        <div className="cp-detail-intensity" style={{ color: intensityColor(entry.intensity) }}>
          {entry.intensity}<span className="cp-detail-denom">/10</span>
        </div>
        <div className="cp-detail-rows">
          <div className="cp-detail-row"><span>pain type</span><span>{entry.painType}</span></div>
          <div className="cp-detail-row"><span>trigger</span><span>{entry.trigger}</span></div>
          <div className="cp-detail-row"><span>logged</span><span>{new Date(entry.timestamp).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }).toLowerCase()}</span></div>
          {entry.note && <div className="cp-detail-row"><span>note</span><span>{entry.note}</span></div>}
        </div>
        <button className="cp-detail-del" onClick={() => onDelete(entry.id)}>delete entry</button>
      </div>
    </div>
  );
}

// ============================================================================
// Report tab
// ============================================================================

function ReportTab({ entries, reportTab, setReportTab, showToast }) {
  return (
    <div className="cp-report">
      <div className="cp-report-header">
        <h2>report</h2>
      </div>
      <div className="cp-report-tabs">
        <button
          className={`cp-rtab ${reportTab === "summary" ? "active" : ""}`}
          onClick={() => setReportTab("summary")}
        >
          summary
        </button>
        <button
          className={`cp-rtab ${reportTab === "questions" ? "active" : ""}`}
          onClick={() => setReportTab("questions")}
        >
          questions
        </button>
      </div>

      {reportTab === "summary" ? (
        <SummarySection entries={entries} />
      ) : (
        <QuestionsSection entries={entries} showToast={showToast} />
      )}
    </div>
  );
}

function computeStats(entries) {
  if (entries.length === 0) return null;
  const sorted = [...entries].sort((a, b) => a.timestamp - b.timestamp);
  const start = sorted[0].timestamp;
  const end = sorted[sorted.length - 1].timestamp;

  const regionCount = {};
  const typeCount = {};
  const triggerCount = {};
  let sumI = 0;
  let maxI = 0;
  let maxEntry = sorted[0];

  sorted.forEach((e) => {
    regionCount[e.region] = (regionCount[e.region] || 0) + 1;
    typeCount[e.painType] = (typeCount[e.painType] || 0) + 1;
    triggerCount[e.trigger] = (triggerCount[e.trigger] || 0) + 1;
    sumI += e.intensity;
    if (e.intensity > maxI) {
      maxI = e.intensity;
      maxEntry = e;
    }
  });

  const topEntry = (obj) => Object.entries(obj).sort((a, b) => b[1] - a[1])[0];
  const topRegion = topEntry(regionCount);
  const topType = topEntry(typeCount);
  const topTrigger = topEntry(triggerCount);

  const spanDays = Math.ceil((end - start) / (24 * 60 * 60 * 1000));
  const regions = Object.keys(regionCount);

  // Trend: compare first 3 days avg vs last 3 days avg (per spec)
  let trend = "none";
  if (spanDays >= 7) {
    const DAY = 24 * 60 * 60 * 1000;
    const lastCutoff = end - 3 * DAY;
    const firstCutoff = start + 3 * DAY;
    const lastEntries = sorted.filter((e) => e.timestamp >= lastCutoff);
    const firstEntries = sorted.filter((e) => e.timestamp <= firstCutoff);
    if (lastEntries.length > 0 && firstEntries.length > 0) {
      const lastAvg = lastEntries.reduce((s, e) => s + e.intensity, 0) / lastEntries.length;
      const firstAvg = firstEntries.reduce((s, e) => s + e.intensity, 0) / firstEntries.length;
      if (lastAvg > firstAvg) trend = "up";
      else if (lastAvg < firstAvg) trend = "down";
    }
  }

  return {
    total: entries.length,
    start,
    end,
    spanDays,
    regionCount,
    regions,
    topRegion,
    topType,
    topTrigger,
    avgIntensity: sumI / entries.length,
    maxIntensity: maxI,
    maxEntry,
    trend,
  };
}

function SummarySection({ entries }) {
  const s = useMemo(() => computeStats(entries), [entries]);

  const handlePrint = () => {
    window.print();
  };

  if (!s) {
    return <div className="cp-summary-empty">no data to summarize yet.</div>;
  }

  const facts = [];
  facts.push(`Pain was logged ${s.total} times between ${formatDateLong(s.start)} and ${formatDateLong(s.end)}.`);
  facts.push(`The most frequently reported location was ${REGION_LABELS[s.topRegion[0]]} (${s.topRegion[1]} entries).`);
  facts.push(`Reported locations included: ${s.regions.map((r) => REGION_LABELS[r]).join(", ")}.`);
  facts.push(`The most common pain type was ${s.topType[0]}, reported ${s.topType[1]} times.`);
  facts.push(`The most frequently noted trigger was ${s.topTrigger[0]} (${s.topTrigger[1]} entries).`);
  facts.push(`Average reported intensity was ${s.avgIntensity.toFixed(1)} out of 10.`);
  facts.push(`Highest intensity recorded: ${s.maxIntensity}/10 on ${formatDateLong(s.maxEntry.timestamp)} in ${REGION_LABELS[s.maxEntry.region]}.`);
  if (s.regions.length > 1) {
    facts.push(`Pain was recorded across ${s.regions.length} distinct body regions.`);
  }
  if (s.trend === "up") {
    facts.push(`Reported intensity has increased over the tracked period.`);
  } else if (s.trend === "down") {
    facts.push(`Reported intensity has decreased over the tracked period.`);
  }

  return (
    <div className="cp-summary" id="cp-print-area">
      <div className="cp-summary-card">
        <div className="cp-summary-title">Pain Log Summary</div>
        <div className="cp-summary-meta">
          {formatDateShort(s.start)} – {formatDateShort(s.end)} · {s.total} entries
        </div>
        <div className="cp-summary-divider" />
        <ul className="cp-summary-list">
          {facts.map((f, i) => (
            <li key={i}>{f}</li>
          ))}
        </ul>

        <div className="cp-heatmap-wrap">
          <div className="cp-heatmap-label">reported regions</div>
          <div className="cp-heatmap-body">
            <BodyFront heatmap={s.regionCount} />
          </div>
        </div>
      </div>

      <button className="cp-print-btn" onClick={handlePrint}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
          <path d="M6 9V3h12v6M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" />
          <rect x="6" y="14" width="12" height="8" />
        </svg>
        print / save as pdf
      </button>
    </div>
  );
}

function QuestionsSection({ entries, showToast }) {
  const s = useMemo(() => computeStats(entries), [entries]);

  if (!s) {
    return <div className="cp-summary-empty">log a few entries to see suggested questions.</div>;
  }

  const questions = [];
  questions.push(`What could be causing pain in my ${REGION_LABELS[s.topRegion[0]]}?`);
  questions.push(`Is there anything I should avoid doing when the pain is at its worst?`);

  if (s.avgIntensity > 6) {
    questions.push(`My pain has been averaging ${s.avgIntensity.toFixed(1)}/10 — is that level something we should treat more aggressively?`);
  }
  if (s.trend === "up") {
    questions.push(`My pain seems to be getting more intense over time — what does that suggest?`);
  }
  if (s.regions.length >= 2) {
    const [a, b] = s.regions;
    questions.push(`I've been noticing pain in multiple areas — ${REGION_LABELS[a]} and ${REGION_LABELS[b]} — could these be connected?`);
  }
  if (s.topTrigger[0] === "waking up") {
    questions.push(`My pain is often worst when I wake up — could that be related to how I'm sleeping or something inflammatory?`);
  }
  if (s.topTrigger[0] === "stress" || Object.keys(s.regionCount).some((r) => r === "stress")) {
    // check if stress appears in trigger list
  }
  // separate stress check via trigger data
  const stressCount = entries.filter((e) => e.trigger === "stress").length;
  if (stressCount >= 2 && !questions.some((q) => q.includes("stress"))) {
    questions.push(`I've noticed pain correlates with stress — are there approaches that address both?`);
  }

  questions.push(`Based on this log, what would you recommend as a next step?`);

  // Cap at 7
  const final = questions.slice(0, 7);

  const copyAll = async () => {
    const text = final.map((q, i) => `${i + 1}. ${q}`).join("\n");
    try {
      await navigator.clipboard.writeText(text);
      showToast("copied ✓");
    } catch {
      showToast("copy failed");
    }
  };

  return (
    <div className="cp-questions">
      <div className="cp-questions-header">
        <h3>questions to ask your doctor</h3>
        <p>based on what you've logged, here are things worth bringing up.</p>
      </div>
      <div className="cp-questions-list">
        {final.map((q, i) => (
          <div key={i} className="cp-question-card">
            <div className="cp-quote-icon">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
                <path d="M7 7h3v3c0 2-1 3-3 4M14 7h3v3c0 2-1 3-3 4" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
            <div className="cp-question-text">{q}</div>
          </div>
        ))}
      </div>
      <button className="cp-copy-btn" onClick={copyAll}>copy all questions</button>
    </div>
  );
}

// ============================================================================
// Styles
// ============================================================================

const styles = `
@import url('https://fonts.googleapis.com/css2?family=DM+Sans:opsz,wght@9..40,300;9..40,400;9..40,500&family=Playfair+Display:wght@400;500&display=swap');

* { box-sizing: border-box; -webkit-tap-highlight-color: transparent; }

.cp-canvas {
  min-height: 100vh;
  background: #F0EDE8;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
  font-family: 'DM Sans', system-ui, sans-serif;
  color: #2C2C2C;
  letter-spacing: -0.01em;
}

.cp-phone {
  width: 100%;
  max-width: 390px;
  height: min(844px, calc(100vh - 40px));
  background: #FFFFFF;
  border-radius: 44px;
  box-shadow: 0 20px 60px rgba(0,0,0,0.08), 0 0 0 1px rgba(0,0,0,0.03);
  overflow: hidden;
  position: relative;
  display: flex;
  flex-direction: column;
}

.cp-content {
  flex: 1;
  overflow: hidden;
  position: relative;
}

.cp-tab-panel {
  position: absolute;
  inset: 0;
  opacity: 0;
  pointer-events: none;
  transform: translateY(6px);
  transition: opacity 200ms ease, transform 200ms ease;
  overflow-y: auto;
  overflow-x: hidden;
  padding-bottom: 80px;
}
.cp-tab-panel.active {
  opacity: 1;
  pointer-events: auto;
  transform: translateY(0);
}
.cp-tab-panel::-webkit-scrollbar { width: 0; }

/* ============ LOG TAB ============ */
.cp-log {
  padding: 32px 24px 0;
  display: flex;
  flex-direction: column;
  min-height: 100%;
}
.cp-log-header {
  text-align: center;
  margin-bottom: 14px;
}
.cp-greeting {
  color: #8A8A8A;
  font-size: 15px;
  font-weight: 400;
}
.cp-date {
  color: #B5B5B5;
  font-size: 12px;
  margin-top: 2px;
}

.cp-body-toggle {
  display: inline-flex;
  margin: 0 auto 12px;
  background: #F5F2ED;
  border-radius: 999px;
  padding: 3px;
}
.cp-toggle-btn {
  border: none;
  background: transparent;
  padding: 6px 18px;
  font-size: 13px;
  font-family: inherit;
  color: #8A8A8A;
  border-radius: 999px;
  cursor: pointer;
  transition: all 200ms ease;
}
.cp-toggle-btn.active {
  background: #FFFFFF;
  color: #2C2C2C;
  box-shadow: 0 1px 3px rgba(0,0,0,0.06);
}

.cp-body-wrap {
  flex: 1;
  min-height: 300px;
  max-height: 48vh;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0 12px;
  overflow: hidden;
}
.cp-body-inner {
  height: 100%;
  width: auto;
  aspect-ratio: 200 / 500;
  max-width: 180px;
  display: flex;
  align-items: center;
  justify-content: center;
  animation: body-fade 260ms ease;
}
@keyframes body-fade {
  from { opacity: 0; transform: scale(0.98); }
  to { opacity: 1; transform: scale(1); }
}

.cp-log-hint {
  text-align: center;
  color: #B5B5B5;
  font-size: 12px;
  margin: 8px 0 12px;
}

.cp-recent {
  margin-top: auto;
  padding-top: 8px;
}
.cp-recent-label {
  color: #B5B5B5;
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  margin-bottom: 6px;
  padding-left: 2px;
}
.cp-recent-card {
  width: 100%;
  background: #FAFAF8;
  border-radius: 18px;
  border: none;
  box-shadow: 0 1px 8px rgba(0,0,0,0.05);
  padding: 10px 14px;
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 6px;
  cursor: pointer;
  font-family: inherit;
  text-align: left;
  transition: transform 120ms ease;
}
.cp-recent-card:active { transform: scale(0.98); }
.cp-recent-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  flex-shrink: 0;
}
.cp-recent-meta { flex: 1; min-width: 0; }
.cp-recent-region {
  font-size: 13px;
  font-weight: 500;
  color: #2C2C2C;
}
.cp-recent-sub {
  font-size: 11px;
  color: #8A8A8A;
  margin-top: 1px;
}
.cp-recent-time {
  font-size: 11px;
  color: #B5B5B5;
}

/* ============ PULSE RING ============ */
@keyframes cp-pulse {
  0% { transform: scale(0.6); opacity: 0.9; }
  100% { transform: scale(3.2); opacity: 0; }
}
@keyframes cp-pulse-fill {
  0% { transform: scale(0.4); opacity: 0.6; }
  100% { transform: scale(2.2); opacity: 0; }
}

/* ============ BOTTOM SHEET ============ */
.cp-sheet-backdrop {
  position: absolute;
  inset: 0;
  background: rgba(0,0,0,0.15);
  z-index: 20;
  animation: fade-in 200ms ease;
}
@keyframes fade-in { from { opacity: 0; } to { opacity: 1; } }

.cp-sheet {
  position: absolute;
  left: 0;
  right: 0;
  bottom: 0;
  background: #FFFFFF;
  border-radius: 24px 24px 0 0;
  z-index: 25;
  transform: translateY(100%);
  transition: transform 300ms cubic-bezier(0.32, 0.72, 0, 1);
  box-shadow: 0 -10px 40px rgba(0,0,0,0.1);
  max-height: 82%;
  overflow-y: auto;
  overscroll-behavior: contain;
}
.cp-sheet.open { transform: translateY(0); }
.cp-sheet-handle {
  width: 36px;
  height: 4px;
  border-radius: 2px;
  background: #E0DDD5;
  margin: 10px auto 4px;
  cursor: pointer;
}
.cp-sheet-inner {
  padding: 8px 20px 24px;
}
.cp-sheet-region-pill {
  display: inline-block;
  background: #F5F2ED;
  color: #6B6B6B;
  padding: 5px 14px;
  border-radius: 999px;
  font-size: 12px;
  margin: 4px auto 16px;
  position: relative;
  left: 50%;
  transform: translateX(-50%);
}

.cp-field { margin-bottom: 18px; }
.cp-field-label {
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  color: #B5B5B5;
  margin-bottom: 8px;
}

/* pills - horizontal scroll for pain type */
.cp-pills-scroll {
  display: flex;
  gap: 6px;
  overflow-x: auto;
  padding-bottom: 4px;
  scrollbar-width: none;
  -ms-overflow-style: none;
}
.cp-pills-scroll::-webkit-scrollbar { display: none; }

.cp-pills-wrap {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
}

.cp-pill {
  flex-shrink: 0;
  background: #FAFAF8;
  border: 1px solid #EEEAE2;
  border-radius: 999px;
  padding: 7px 14px;
  font-size: 13px;
  color: #6B6B6B;
  cursor: pointer;
  font-family: inherit;
  transition: all 180ms ease;
}
.cp-pill.active {
  background: #7BAE8F;
  border-color: #7BAE8F;
  color: #FFFFFF;
}
.cp-pill-sm { padding: 5px 12px; font-size: 12px; }
.cp-pill-dashed {
  border-style: dashed;
  border-color: #D4D0C8;
  color: #8A8A8A;
}

.cp-custom-input-wrap {
  display: flex;
  gap: 4px;
  align-items: center;
}
.cp-custom-input {
  border: 1px solid #D4D0C8;
  border-radius: 999px;
  padding: 5px 12px;
  font-size: 12px;
  outline: none;
  font-family: inherit;
  width: 110px;
}
.cp-custom-input:focus { border-color: #7BAE8F; }
.cp-custom-add {
  background: #7BAE8F;
  color: white;
  border: none;
  border-radius: 999px;
  padding: 5px 12px;
  font-size: 12px;
  cursor: pointer;
  font-family: inherit;
}

/* intensity */
.cp-intensity-num {
  text-align: center;
  font-size: 32px;
  font-weight: 500;
  line-height: 1;
  margin: 4px 0 12px;
  transition: color 180ms ease;
}
.cp-slider {
  width: 100%;
  -webkit-appearance: none;
  appearance: none;
  height: 4px;
  border-radius: 2px;
  background: #EEEAE2;
  outline: none;
}
.cp-slider::-webkit-slider-thumb {
  -webkit-appearance: none;
  width: 22px;
  height: 22px;
  border-radius: 50%;
  background: var(--thumb-color, #7BAE8F);
  cursor: pointer;
  border: 3px solid #FFFFFF;
  box-shadow: 0 2px 6px rgba(0,0,0,0.15);
  transition: background 180ms ease;
}
.cp-slider::-moz-range-thumb {
  width: 22px;
  height: 22px;
  border-radius: 50%;
  background: var(--thumb-color, #7BAE8F);
  cursor: pointer;
  border: 3px solid #FFFFFF;
  box-shadow: 0 2px 6px rgba(0,0,0,0.15);
}
.cp-slider-labels {
  display: flex;
  justify-content: space-between;
  font-size: 10px;
  color: #B5B5B5;
  margin-top: 4px;
  padding: 0 2px;
}

.cp-note-input {
  width: 100%;
  border: none;
  border-bottom: 1px solid #EEEAE2;
  padding: 8px 2px;
  font-size: 14px;
  font-family: inherit;
  outline: none;
  background: transparent;
  color: #2C2C2C;
}
.cp-note-input::placeholder { color: #B5B5B5; }
.cp-note-input:focus { border-bottom-color: #7BAE8F; }

.cp-save-btn {
  width: 100%;
  height: 48px;
  background: #7BAE8F;
  color: #FFFFFF;
  border: none;
  border-radius: 999px;
  font-family: inherit;
  font-size: 15px;
  font-weight: 500;
  cursor: pointer;
  margin-top: 8px;
  transition: background 180ms ease, transform 120ms ease;
}
.cp-save-btn:hover { background: #6A9E80; }
.cp-save-btn:active { transform: scale(0.98); }

/* ============ TOAST ============ */
.cp-toast {
  position: absolute;
  top: 20px;
  left: 50%;
  transform: translateX(-50%);
  background: #2C2C2C;
  color: #FFFFFF;
  padding: 10px 20px;
  border-radius: 999px;
  font-size: 13px;
  z-index: 50;
  animation: toast-in 300ms ease, toast-out 300ms ease 1.7s forwards;
  box-shadow: 0 4px 16px rgba(0,0,0,0.15);
}
@keyframes toast-in {
  from { opacity: 0; transform: translateX(-50%) translateY(-12px); }
  to { opacity: 1; transform: translateX(-50%) translateY(0); }
}
@keyframes toast-out {
  to { opacity: 0; transform: translateX(-50%) translateY(-12px); }
}

/* ============ NAV ============ */
.cp-nav {
  display: flex;
  justify-content: space-around;
  align-items: center;
  height: 72px;
  background: #FFFFFF;
  border-top: 1px solid #F0EDE8;
  padding-bottom: 8px;
}
.cp-nav-btn {
  background: transparent;
  border: none;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  color: #B5B5B5;
  font-size: 11px;
  font-family: inherit;
  cursor: pointer;
  padding: 6px 16px;
  transition: color 200ms ease;
  min-height: 44px;
}
.cp-nav-btn.active { color: #7BAE8F; }

/* ============ HISTORY ============ */
.cp-history { padding: 28px 20px 0; }
.cp-history-header h2 {
  font-size: 22px;
  font-weight: 500;
  margin: 0 0 14px;
}

.cp-stats-row {
  display: grid;
  grid-template-columns: 1fr 1fr 1fr;
  gap: 8px;
  margin-bottom: 20px;
}
.cp-stat {
  background: #FAFAF8;
  border-radius: 18px;
  padding: 12px 10px;
  text-align: center;
  box-shadow: 0 1px 8px rgba(0,0,0,0.04);
}
.cp-stat-label {
  font-size: 10px;
  color: #B5B5B5;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  margin-bottom: 4px;
}
.cp-stat-num {
  font-size: 20px;
  font-weight: 500;
  color: #2C2C2C;
}
.cp-stat-small { font-size: 13px; }

.cp-group { margin-bottom: 18px; }
.cp-group-header {
  font-size: 10px;
  text-transform: uppercase;
  letter-spacing: 0.12em;
  color: #B5B5B5;
  margin-bottom: 8px;
  padding-left: 4px;
}

.cp-entry-card {
  background: #FAFAF8;
  border-radius: 18px;
  padding: 12px 14px;
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 6px;
  box-shadow: 0 1px 8px rgba(0,0,0,0.04);
  cursor: pointer;
  transition: transform 120ms ease;
}
.cp-entry-card:active { transform: scale(0.99); }
.cp-entry-dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  flex-shrink: 0;
}
.cp-entry-meta { flex: 1; min-width: 0; }
.cp-entry-region { font-size: 14px; font-weight: 500; }
.cp-entry-sub { font-size: 11px; color: #8A8A8A; margin-top: 1px; }
.cp-entry-num {
  font-size: 16px;
  font-weight: 500;
  color: #2C2C2C;
  margin-right: 4px;
}
.cp-entry-del {
  background: transparent;
  border: none;
  color: #C5C5C5;
  cursor: pointer;
  padding: 6px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 8px;
  transition: color 150ms ease, background 150ms ease;
}
.cp-entry-del:hover { color: #E8735A; background: rgba(232, 115, 90, 0.08); }

.cp-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 100%;
  text-align: center;
  padding: 60px 30px;
  color: #8A8A8A;
  font-size: 14px;
}
.cp-empty p { margin-top: 16px; max-width: 220px; line-height: 1.5; }

/* ============ REPORT ============ */
.cp-report { padding: 28px 20px 0; }
.cp-report-header h2 {
  font-size: 22px;
  font-weight: 500;
  margin: 0 0 14px;
}
.cp-report-tabs {
  display: inline-flex;
  background: #F5F2ED;
  padding: 3px;
  border-radius: 999px;
  margin-bottom: 18px;
}
.cp-rtab {
  background: transparent;
  border: none;
  padding: 7px 18px;
  font-size: 13px;
  color: #8A8A8A;
  border-radius: 999px;
  cursor: pointer;
  font-family: inherit;
  transition: all 200ms ease;
}
.cp-rtab.active {
  background: #FFFFFF;
  color: #2C2C2C;
  box-shadow: 0 1px 3px rgba(0,0,0,0.06);
}

.cp-summary-empty {
  text-align: center;
  color: #8A8A8A;
  padding: 40px 20px;
  font-size: 14px;
}

.cp-summary-card {
  background: #FAFAF8;
  border-radius: 18px;
  padding: 22px 20px;
  box-shadow: 0 1px 8px rgba(0,0,0,0.05);
}
.cp-summary-title {
  font-family: 'Playfair Display', serif;
  font-size: 20px;
  font-weight: 400;
  color: #2C2C2C;
  margin-bottom: 4px;
}
.cp-summary-meta {
  font-size: 11px;
  color: #B5B5B5;
  text-transform: uppercase;
  letter-spacing: 0.08em;
}
.cp-summary-divider {
  height: 1px;
  background: #EEEAE2;
  margin: 16px 0;
}
.cp-summary-list {
  list-style: none;
  padding: 0;
  margin: 0;
}
.cp-summary-list li {
  font-size: 13px;
  line-height: 1.55;
  color: #3C3C3C;
  padding: 8px 0 8px 14px;
  position: relative;
  border-bottom: 1px solid rgba(238,234,226,0.6);
}
.cp-summary-list li:last-child { border-bottom: none; }
.cp-summary-list li::before {
  content: "";
  position: absolute;
  left: 0;
  top: 17px;
  width: 4px;
  height: 4px;
  border-radius: 50%;
  background: #D4D0C8;
}

.cp-heatmap-wrap {
  margin-top: 20px;
  padding-top: 16px;
  border-top: 1px solid #EEEAE2;
}
.cp-heatmap-label {
  font-size: 10px;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  color: #B5B5B5;
  text-align: center;
  margin-bottom: 8px;
}
.cp-heatmap-body {
  height: 280px;
  display: flex;
  justify-content: center;
  align-items: center;
}
.cp-heatmap-body > svg { max-height: 100%; width: auto; }

.cp-print-btn {
  width: 100%;
  margin-top: 14px;
  background: #FFFFFF;
  border: 1px solid #EEEAE2;
  border-radius: 999px;
  padding: 12px;
  font-family: inherit;
  font-size: 13px;
  color: #6B6B6B;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  transition: all 180ms ease;
}
.cp-print-btn:hover {
  border-color: #7BAE8F;
  color: #7BAE8F;
}

/* ============ QUESTIONS ============ */
.cp-questions-header h3 {
  font-size: 16px;
  font-weight: 500;
  margin: 0 0 4px;
  color: #2C2C2C;
}
.cp-questions-header p {
  color: #8A8A8A;
  font-size: 12px;
  margin: 0 0 16px;
  line-height: 1.5;
}
.cp-questions-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-bottom: 14px;
}
.cp-question-card {
  background: #FAFAF8;
  border-radius: 18px;
  padding: 14px 16px;
  display: flex;
  gap: 10px;
  align-items: flex-start;
  box-shadow: 0 1px 8px rgba(0,0,0,0.04);
}
.cp-quote-icon {
  color: #7BAE8F;
  flex-shrink: 0;
  margin-top: 2px;
}
.cp-question-text {
  font-size: 13px;
  line-height: 1.5;
  color: #3C3C3C;
}

.cp-copy-btn {
  width: 100%;
  background: #FFFFFF;
  border: 1px solid #EEEAE2;
  border-radius: 999px;
  padding: 12px;
  font-family: inherit;
  font-size: 13px;
  color: #6B6B6B;
  cursor: pointer;
  transition: all 180ms ease;
}
.cp-copy-btn:hover {
  border-color: #7BAE8F;
  color: #7BAE8F;
}

/* ============ DETAIL ============ */
.cp-detail-overlay {
  position: absolute;
  inset: 0;
  background: rgba(44,44,44,0.3);
  z-index: 30;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
  animation: fade-in 200ms ease;
}
.cp-detail-card {
  background: #FFFFFF;
  border-radius: 22px;
  padding: 24px 22px;
  width: 100%;
  max-width: 320px;
  position: relative;
  box-shadow: 0 20px 50px rgba(0,0,0,0.15);
  animation: detail-in 260ms ease;
}
@keyframes detail-in {
  from { opacity: 0; transform: scale(0.95); }
  to { opacity: 1; transform: scale(1); }
}
.cp-detail-close {
  position: absolute;
  top: 12px;
  right: 12px;
  background: transparent;
  border: none;
  color: #B5B5B5;
  width: 28px;
  height: 28px;
  border-radius: 50%;
  cursor: pointer;
  font-size: 14px;
}
.cp-detail-close:hover { background: #F5F2ED; }
.cp-detail-region {
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: 0.12em;
  color: #8A8A8A;
  margin-bottom: 4px;
}
.cp-detail-intensity {
  font-size: 44px;
  font-weight: 500;
  line-height: 1;
  margin-bottom: 16px;
}
.cp-detail-denom {
  font-size: 18px;
  color: #B5B5B5;
  margin-left: 2px;
}
.cp-detail-rows { margin-bottom: 18px; }
.cp-detail-row {
  display: flex;
  justify-content: space-between;
  padding: 9px 0;
  border-bottom: 1px solid #F5F2ED;
  font-size: 13px;
}
.cp-detail-row:last-child { border-bottom: none; }
.cp-detail-row span:first-child { color: #8A8A8A; }
.cp-detail-row span:last-child { color: #2C2C2C; text-align: right; max-width: 60%; }
.cp-detail-del {
  width: 100%;
  background: transparent;
  border: 1px solid #EEEAE2;
  border-radius: 999px;
  padding: 10px;
  color: #E8735A;
  font-family: inherit;
  font-size: 13px;
  cursor: pointer;
  transition: all 150ms ease;
}
.cp-detail-del:hover {
  background: rgba(232,115,90,0.06);
  border-color: #E8735A;
}

/* ============ PRINT ============ */
@media print {
  body * { visibility: hidden; }
  #cp-print-area, #cp-print-area * { visibility: visible; }
  #cp-print-area {
    position: absolute;
    left: 0;
    top: 0;
    width: 100%;
    padding: 40px;
  }
  .cp-summary-card {
    background: transparent;
    box-shadow: none;
    border: none;
    padding: 0;
  }
  .cp-print-btn { display: none !important; }
}
`;
