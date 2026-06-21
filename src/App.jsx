import { useState } from "react";

const SCALES = {
  major:          { label: "Major",            pcs: [0,2,4,5,7,9,11] },
  melodic_minor:  { label: "Melodic Minor",    pcs: [0,2,3,5,7,9,11] },
  harmonic_minor: { label: "Harmonic Minor",   pcs: [0,2,3,5,7,8,11] },
  lydian_dim:     { label: "Lydian Diminished",pcs: [0,2,3,6,7,9,11] },
  diminished:     { label: "Diminished",       pcs: [0,1,3,4,6,7,9,10] },
};
const NOTE_NAMES = ["C","C#","D","D#","E","F","F#","G","G#","A","A#","B"];
const OPEN = [4,9,2,7,11,4];                 // low E .. high e
const STRING_LABELS = ["E","A","D","G","B","e"];
const FRETS = 15;
const INLAYS = [3,5,7,9,15];

// palette (matches the book diagrams)
const RED = "#bf3b2b", BLUE = "#1b4f72", INK = "#1a1f2e";
const INDIGO = "#6366f1", MUTED = "#6b7280";
const FAINT_FILL = "#eef1f5", FAINT_STROKE = "#cdd2db", LINE = "#d8dce4";

// geometry
const X0 = 46, FW = 52, Y0 = 36, SS = 40;
const cx = (f) => X0 + (f - 0.5) * FW;
const cy = (i) => Y0 + (5 - i) * SS;          // i=0 low E at bottom
const VB_W = X0 + FRETS * FW + 16;
const VB_H = Y0 + 5 * SS + 40;

export default function App() {
  const [keyPC, setKeyPC] = useState(0);       // default C
  const [scaleId, setScaleId] = useState("major");
  const [selected, setSelected] = useState({}); // { stringIndex: fret }
  const [hint, setHint] = useState("");

  const scaleSet = new Set(SCALES[scaleId].pcs.map((s) => (keyPC + s) % 12));

  const stringFrets = (i) => {
    const a = [];
    for (let f = 1; f <= FRETS; f++) if (scaleSet.has((OPEN[i] + f) % 12)) a.push(f);
    return a;
  };
  const isScaleTone = (i, f) => scaleSet.has((OPEN[i] + f) % 12);
  const isRoot = (i, f) => (OPEN[i] + f) % 12 === keyPC;

  const reset = () => { setSelected({}); setHint(""); };
  const changeKey = (v) => { setKeyPC(v); setSelected({}); setHint(""); };
  const changeScale = (v) => { setScaleId(v); setSelected({}); setHint(""); };

  const toggle = (i, f) => {
    setHint("");
    setSelected((prev) => {
      const next = { ...prev };
      if (next[i] === f) { delete next[i]; return next; }      // deselect
      if (i in next) { next[i] = f; return next; }             // move on that string
      if (Object.keys(next).length >= 4) { setHint("Four notes max — one per string."); return prev; }
      next[i] = f; return next;
    });
  };

  const step = (dir) => {
    setSelected((prev) => {
      const keys = Object.keys(prev);
      if (keys.length === 0) return prev;
      const next = {};
      for (const k of keys) {
        const list = stringFrets(+k);
        const idx = list.indexOf(prev[k]);
        const ni = idx + dir;
        if (ni < 0 || ni >= list.length) return prev;          // blocked at neck edge
        next[k] = list[ni];
      }
      return next;
    });
  };

  const canStep = (dir) => {
    const keys = Object.keys(selected);
    if (keys.length === 0) return false;
    for (const k of keys) {
      const list = stringFrets(+k);
      const idx = list.indexOf(selected[k]);
      if (idx + dir < 0 || idx + dir >= list.length) return false;
    }
    return true;
  };

  const fretsSel = Object.values(selected);
  const span = fretsSel.length >= 2 ? Math.max(...fretsSel) - Math.min(...fretsSel) : 0;
  const wide = span > 4;
  const count = Object.keys(selected).length;

  // build note circles
  const dots = [];
  for (let i = 0; i < 6; i++) {
    for (let f = 1; f <= FRETS; f++) {
      if (!isScaleTone(i, f)) continue;
      const sel = selected[i] === f;
      const root = isRoot(i, f);
      let fill, stroke, sw, r;
      if (sel) { fill = root ? RED : BLUE; stroke = root ? RED : BLUE; sw = 0; r = 15; }
      else { fill = FAINT_FILL; stroke = root ? RED : FAINT_STROKE; sw = root ? 2 : 1.5; r = 11; }
      dots.push(
        <g key={`${i}-${f}`} style={{ cursor: "pointer" }} onClick={() => toggle(i, f)}>
          <circle cx={cx(f)} cy={cy(i)} r={r} fill={fill} stroke={stroke} strokeWidth={sw} />
          {sel && <circle cx={cx(f)} cy={cy(i)} r={r} fill="none" stroke="#ffffff" strokeWidth="1.5" opacity="0.25" />}
        </g>
      );
    }
  }

  const ctrlBtn = (active) => ({
    padding: "7px 12px", borderRadius: 8, border: "1px solid " + (active ? INDIGO : "#d6dae2"),
    background: active ? INDIGO : "#fff", color: active ? "#fff" : INK, fontWeight: 600,
    fontSize: 14, cursor: "pointer",
  });
  const stepBtn = (on) => ({
    flex: 1, padding: "14px 0", borderRadius: 10, border: "none",
    background: on ? INDIGO : "#e8eaf0", color: on ? "#fff" : "#aab0bd",
    fontWeight: 700, fontSize: 16, cursor: on ? "pointer" : "default",
  });

  return (
    <div style={{ fontFamily: "Inter, system-ui, sans-serif", color: INK, maxWidth: 920, margin: "0 auto", padding: "18px 16px 40px" }}>
      <h1 style={{ fontSize: 24, margin: "0 0 4px", fontWeight: 800 }}>Holdsworth Chord Explorer</h1>
      <p style={{ margin: "0 0 18px", color: MUTED, fontSize: 15, lineHeight: 1.5 }}>
        Pick a key and a scale, tap <strong>four notes</strong> (one per string) to build a voicing, then move
        that shape up and down the scale &mdash; each note climbing its own string. No chord names, just notes,
        the way Allan Holdsworth thought about the fretboard.
      </p>

      {/* controls */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: 18, alignItems: "flex-start", marginBottom: 16 }}>
        <div>
          <div style={{ fontSize: 12, fontWeight: 700, color: MUTED, marginBottom: 6, textTransform: "uppercase", letterSpacing: ".04em" }}>Key</div>
          <select value={keyPC} onChange={(e) => changeKey(+e.target.value)}
            style={{ padding: "8px 10px", borderRadius: 8, border: "1px solid #d6dae2", fontSize: 14, fontWeight: 600, color: INK, background: "#fff" }}>
            {NOTE_NAMES.map((n, idx) => <option key={idx} value={idx}>{n}</option>)}
          </select>
        </div>
        <div>
          <div style={{ fontSize: 12, fontWeight: 700, color: MUTED, marginBottom: 6, textTransform: "uppercase", letterSpacing: ".04em" }}>Scale</div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            {Object.entries(SCALES).map(([id, s]) => (
              <button key={id} style={ctrlBtn(scaleId === id)} onClick={() => changeScale(id)}>{s.label}</button>
            ))}
          </div>
        </div>
      </div>

      {/* fretboard */}
      <div style={{ overflowX: "auto", border: "1px solid #edeff3", borderRadius: 12, padding: "4px 2px", background: "#fff" }}>
        <svg viewBox={`0 0 ${VB_W} ${VB_H}`} style={{ width: "100%", minWidth: 620, display: "block" }}>
          {/* fret wires */}
          {Array.from({ length: FRETS + 1 }, (_, f) => (
            <line key={f} x1={X0 + f * FW} y1={cy(5)} x2={X0 + f * FW} y2={cy(0)} stroke={LINE} strokeWidth={f === 0 ? 3 : 1.4} />
          ))}
          {/* strings */}
          {Array.from({ length: 6 }, (_, i) => (
            <line key={i} x1={X0} y1={cy(i)} x2={X0 + FRETS * FW} y2={cy(i)} stroke={LINE} strokeWidth="1.4" />
          ))}
          {/* inlays */}
          {INLAYS.map((f) => <circle key={f} cx={cx(f)} cy={(cy(0) + cy(5)) / 2} r="4" fill="#dfe3ea" />)}
          <circle cx={cx(12)} cy={(cy(0)+cy(5))/2 - 22} r="4" fill="#dfe3ea" />
          <circle cx={cx(12)} cy={(cy(0)+cy(5))/2 + 22} r="4" fill="#dfe3ea" />
          {/* string labels */}
          {STRING_LABELS.map((l, i) => (
            <text key={i} x={X0 - 16} y={cy(i) + 4} textAnchor="middle" fontSize="13" fontStyle="italic" fill={MUTED}>{l}</text>
          ))}
          {/* fret numbers */}
          {Array.from({ length: FRETS }, (_, k) => (
            <text key={k} x={cx(k + 1)} y={cy(0) + 30} textAnchor="middle" fontSize="12" fill={MUTED}>{k + 1}</text>
          ))}
          {dots}
        </svg>
      </div>

      {/* status */}
      <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap", margin: "12px 2px 0", minHeight: 22 }}>
        <span style={{ fontSize: 14, fontWeight: 600, color: count === 4 ? INK : MUTED }}>{count} / 4 notes</span>
        {wide && <span style={{ fontSize: 13, fontWeight: 700, color: "#b45309", background: "#fef3c7", padding: "3px 9px", borderRadius: 6 }}>wide stretch ({span} frets)</span>}
        {hint && <span style={{ fontSize: 13, color: RED }}>{hint}</span>}
        <span style={{ flex: 1 }} />
        <button onClick={reset} style={{ ...ctrlBtn(false), fontWeight: 600 }}>Reset</button>
      </div>

      {/* step controls */}
      <div style={{ display: "flex", gap: 10, marginTop: 12 }}>
        <button style={stepBtn(canStep(-1))} disabled={!canStep(-1)} onClick={() => step(-1)}>&#9660;&nbsp; Down the scale</button>
        <button style={stepBtn(canStep(1))} disabled={!canStep(1)} onClick={() => step(1)}>Up the scale &nbsp;&#9650;</button>
      </div>
      {count > 0 && !canStep(1) && !canStep(-1) && (
        <p style={{ fontSize: 13, color: MUTED, margin: "8px 2px 0" }}>This shape can&rsquo;t move any further on the neck.</p>
      )}

      {/* legend */}
      <div style={{ display: "flex", gap: 18, flexWrap: "wrap", margin: "18px 2px 0", fontSize: 13, color: MUTED }}>
        <span style={{ display: "flex", alignItems: "center", gap: 7 }}><span style={{ width: 14, height: 14, borderRadius: "50%", background: RED, display: "inline-block" }} /> root</span>
        <span style={{ display: "flex", alignItems: "center", gap: 7 }}><span style={{ width: 14, height: 14, borderRadius: "50%", background: BLUE, display: "inline-block" }} /> selected note</span>
        <span style={{ display: "flex", alignItems: "center", gap: 7 }}><span style={{ width: 14, height: 14, borderRadius: "50%", background: FAINT_FILL, border: `1.5px solid ${FAINT_STROKE}`, display: "inline-block" }} /> scale tone</span>
      </div>

      {/* book CTA */}
      <div style={{ marginTop: 26, padding: "18px 20px", borderRadius: 12, background: "#f6f7fb", border: "1px solid #e8eaf2" }}>
        <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 4 }}>Want the whole system?</div>
        <p style={{ margin: "0 0 12px", color: MUTED, fontSize: 14, lineHeight: 1.5 }}>
          This is one corner of how Allan Holdsworth saw the guitar. My book lays out the scales, the chord
          approach, and the technique behind his sound &mdash; the full method, not just a glimpse.
        </p>
        <a href="https://unlocktheguitar.net/how-to-play-like-allan-holdsworth.html" target="_blank" rel="noopener"
          style={{ display: "inline-block", padding: "10px 18px", borderRadius: 8, background: INDIGO, color: "#fff", fontWeight: 700, fontSize: 14, textDecoration: "none" }}>
          How to Play Like Allan Holdsworth &rarr;
        </a>
      </div>
    </div>
  );
}
