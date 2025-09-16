/**
 * AsteroidExplorer.jsx
 *
 * Usage:
 *  - Place under src/ in a React app (Vite / CRA).
 *  - Install deps:
 *      npm install react-three-fiber @react-three/fiber @react-three/drei three dayjs
 *    (Tailwind optional — component uses simple classes but will work without Tailwind.)
 *  - Optionally set REACT_APP_NASA_API_KEY for better rate limits. If absent, DEMO_KEY is used.
 *
 * What this component does:
 *  - Loads a small sample asteroid list (includes the asteroids you requested).
 *  - Attempts to fetch NEO list from NASA NEO Browse & SBDB for details (graceful fallback).
 *  - Renders details, history (notable events), and an interactive 3D viewer:
 *      - The 3D body is a procedurally-bumped sphere (per-vertex displacement) and optionally textured.
 *      - Orbit visualization is minimal (a simple circular/elliptical helper) — replace with precise ephemeris if desired.
 *
 * Notes:
 *  - This is intentionally self-contained; improve shapes/textures by supplying glTF models or heightmaps.
 *  - The SBDB endpoint used: https://ssd-api.jpl.nasa.gov/sbdb.api?sstr=...
 */

import React, { useEffect, useMemo, useRef, useState, Suspense } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { OrbitControls, Html, Stars } from "@react-three/drei";
import * as THREE from "three";
import dayjs from "dayjs";

/* -------------------------
   Sample asteroid dataset (includes user-requested names)
   ------------------------- */
const SAMPLE_ASTEROIDS = [
  {
    id: "99942",
    name: "99942 Apophis",
    designation: "99942 Apophis",
    diameter_km: 0.340,
    absolute_magnitude_h: 19.7,
    is_potentially_hazardous: true,
    discovery_date: "2004-06-19",
    discoverer: "K. A. Williams / R. S. McMillan (LINEAR)",
    summary:
      "Apophis is a near-Earth asteroid known for its close approach in April 2029; modern orbit determinations rule out impacts for the foreseeable future.",
    notable_events: [
      { date: "2004-06-19", event: "Discovery (LINEAR)" },
      { date: "2029-04-13", event: "Very close Earth approach (inside geostationary orbit distance)" },
    ],
  },
  {
    id: "152830",
    name: "152830 Dinkinesh",
    designation: "152830 Dinkinesh & Selam",
    diameter_km: 0.1,
    absolute_magnitude_h: 21.5,
    is_potentially_hazardous: false,
    discovery_date: "2006-08-27",
    discoverer: "Spacewatch",
    summary:
      "Dinkinesh is a small main-belt asteroid visited by NASA's Lucy mission; it has a small companion named Selam.",
    notable_events: [
      { date: "2023-10-XX", event: "Lucy flyby (imaging and characterization)" },
    ],
  },
  {
    id: "25143",
    name: "25143 Itokawa",
    designation: "25143 Itokawa",
    diameter_km: 0.535,
    absolute_magnitude_h: 19.2,
    is_potentially_hazardous: false,
    discovery_date: "1998-09-26",
    discoverer: "H. Abe",
    summary:
      "Itokawa is a rubble-pile asteroid visited by JAXA's Hayabusa mission; samples returned to Earth in 2010.",
    notable_events: [
      { date: "1998-09-26", event: "Discovery (H. Abe)" },
      { date: "2005-09-12", event: "Hayabusa arrival" },
      { date: "2010-06-13", event: "Sample return to Earth" },
    ],
  },
  {
    id: "16",
    name: "16 Psyche",
    designation: "16 Psyche",
    diameter_km: 226,
    absolute_magnitude_h: 6.2,
    is_potentially_hazardous: false,
    discovery_date: "1852-03-17",
    discoverer: "Annibale de Gasparis",
    summary:
      "Psyche is a large, metal-rich asteroid and target of NASA's Psyche mission to study planetary cores and differentiation.",
    notable_events: [{ date: "2020-10-13", event: "Psyche mission launch (target selected earlier)" }],
  },
  {
    id: "2024YR4",
    name: "2024 YR4",
    designation: "2024 YR4",
    diameter_km: null,
    absolute_magnitude_h: null,
    is_potentially_hazardous: false,
    discovery_date: "2024-12-XX",
    discoverer: "Survey",
    summary: "Recently-designated near-Earth object — check JPL SBDB for latest parameters.",
    notable_events: [{ date: "2024-12-01", event: "Discovery (survey)" }],
  },
  {
    id: "52246",
    name: "52246 Donaldjohanson",
    designation: "52246 Donaldjohanson",
    diameter_km: 0.005,
    absolute_magnitude_h: 18.9,
    is_potentially_hazardous: false,
    discovery_date: "1987-10-07",
    discoverer: "Observatory",
    summary: "Main-belt asteroid named after paleoanthropologist Donald Johanson.",
    notable_events: [{ date: "1987-10-07", event: "Discovery" }],
  },
  {
    id: "Didymos",
    name: "65803 Didymos & Dimorphos",
    designation: "65803 Didymos",
    diameter_km: 0.780,
    absolute_magnitude_h: 18.3,
    is_potentially_hazardous: false,
    discovery_date: "1996-04-11",
    discoverer: "ROAST survey",
    summary:
      "Binary near-Earth system; Dimorphos was the target of NASA's DART impact demonstration in 2022.",
    notable_events: [
      { date: "1996-04-11", event: "Discovery of Didymos" },
      { date: "2022-09-26", event: "DART kinetic impact on Dimorphos" },
    ],
  },
  {
    id: "243",
    name: "243 Ida & Dactyl",
    designation: "243 Ida",
    diameter_km: 31.8,
    absolute_magnitude_h: 10.5,
    is_potentially_hazardous: false,
    discovery_date: "1884-09-29",
    discoverer: "J. Palisa",
    summary:
      "Ida is a main-belt asteroid and host to Dactyl, the first discovered asteroid moon (discovered in Galileo images).",
    notable_events: [
      { date: "1993-08-28", event: "Galileo imaging and discovery of moon Dactyl" },
    ],
  },
  {
    id: "433",
    name: "433 Eros",
    designation: "433 Eros",
    diameter_km: 16.84,
    absolute_magnitude_h: 10.4,
    is_potentially_hazardous: false,
    discovery_date: "1898-08-13",
    discoverer: "G. Witt",
    summary:
      "Visited by NASA's NEAR Shoemaker mission which mapped Eros and landed in 2001.",
    notable_events: [{ date: "1999-02-14", event: "NEAR Shoemaker arrival & mapping (1999–2001)" }],
  },
  {
    id: "4",
    name: "4 Vesta",
    designation: "4 Vesta",
    diameter_km: 525.4,
    absolute_magnitude_h: 3.2,
    is_potentially_hazardous: false,
    discovery_date: "1807-03-29",
    discoverer: "H. Olbers",
    summary:
      "One of the largest objects in the asteroid belt; Dawn mission mapped its geology and linked HED meteorites to Vesta.",
    notable_events: [{ date: "2011-07-16", event: "Dawn orbit & mapping (2011–2012)" }],
  },
];

/* -------------------------
   Utilities
   ------------------------- */
function fmt(dateStr) {
  if (!dateStr) return "—";
  const d = dayjs(dateStr);
  return d.isValid() ? d.format("MMM D, YYYY") : dateStr;
}

/* Small deterministic pseudorandom generator for repeatable bumps */
function mulberry32(seed) {
  let t = seed >>> 0;
  return function () {
    t += 0x6d2b79f5;
    let r = Math.imul(t ^ (t >>> 15), 1 | t);
    r ^= r + Math.imul(r ^ (r >>> 7), 61 | r);
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

/* Create a bumped sphere geometry (clone + displace vertices along normals).
   intensity: how big the bumps are relative to radius (0..1)
   seed: used for deterministic pseudo-noise
*/
function createBumpyGeometry(radius = 1, segments = 128, intensity = 0.08, seed = 42) {
  const geom = new THREE.SphereGeometry(radius, Math.max(32, segments), Math.max(16, Math.floor(segments / 2)));
  const pos = geom.attributes.position;
  const normal = geom.attributes.normal;
  const rng = mulberry32(seed);
  // Create per-vertex noise value using consistent RNG and vertex normal + pos
  for (let i = 0; i < pos.count; i++) {
    const nx = normal.getX(i);
    const ny = normal.getY(i);
    const nz = normal.getZ(i);
    // derive a simple hash from coordinates to feed rng
    const hash =
      Math.abs(Math.sin((pos.getX(i) * 73856093) ^ (pos.getY(i) * 19349663) ^ (pos.getZ(i) * 83492791))) * 100000;
    const localRng = mulberry32(Math.floor(hash) + seed);
    const noise = localRng() * 2 - 1; // -1..1
    const displacement = 1 + noise * intensity * (0.6 + 0.4 * Math.abs(nx + ny + nz)); // more on irregular facets
    pos.setXYZ(i, pos.getX(i) * displacement, pos.getY(i) * displacement, pos.getZ(i) * displacement);
  }
  pos.needsUpdate = true;
  geom.computeVertexNormals();
  return geom;
}

/* -------------------------
   3D React components
   ------------------------- */
function AsteroidMesh({ name = "asteroid", size = 1, textureUrl = null, rotationSpeed = 0.25 }) {
  const meshRef = useRef();
  // Create geometry once per name/size to keep deterministic bumps
  const geom = useMemo(() => createBumpyGeometry(1, 128, Math.max(0.02, Math.min(0.12, 0.06)), hashCode(name)), [name]);

  // Optional texture loader
  const [mapTex, setMapTex] = useState(null);
  useEffect(() => {
    let active = true;
    if (textureUrl) {
      const loader = new THREE.TextureLoader();
      loader.crossOrigin = "";
      loader.load(
        textureUrl,
        (tex) => {
          if (!active) return;
          tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
          setMapTex(tex);
        },
        undefined,
        () => {
          if (!active) return;
          setMapTex(null);
        }
      );
    } else {
      setMapTex(null);
    }
    return () => {
      active = false;
    };
  }, [textureUrl]);

  useFrame((state, delta) => {
    if (meshRef.current) {
      meshRef.current.rotation.y += delta * rotationSpeed;
      // slight precession
      meshRef.current.rotation.x = Math.sin(state.clock.elapsedTime * 0.1) * 0.08;
    }
  });

  return (
    <mesh ref={meshRef} geometry={geom} scale={[size, size, size]}>
      <meshStandardMaterial
        map={mapTex}
        metalness={0.05}
        roughness={0.9}
        flatShading={false}
        envMapIntensity={0.2}
        // subtle vertex colors effect can be added by setting vertexColors if provided
      />
    </mesh>
  );
}

/* Small helper to convert string to int seed */
function hashCode(str = "") {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/* Minimal Orbit helper: draws a faint ellipse (approx). Not precise ephemeris */
function OrbitRing({ a = 2.5, b = 2.0, color = "#888", segments = 256 }) {
  const ref = useRef();
  const curve = useMemo(() => {
    const pts = [];
    for (let i = 0; i < segments; i++) {
      const t = (i / segments) * Math.PI * 2;
      pts.push(new THREE.Vector3(Math.cos(t) * a, 0, Math.sin(t) * b));
    }
    const geom = new THREE.BufferGeometry().setFromPoints(pts);
    return geom;
  }, [a, b, segments]);

  return (
    <line ref={ref} geometry={curve}>
      <lineBasicMaterial attach="material" color={color} linewidth={1} transparent opacity={0.5} />
    </line>
  );
}

/* Camera reset helper for user friendliness */
function CameraResetButton({ cameraRef }) {
  return (
    <Html position={[0, -1.5, 0]}>
      <div style={{ textAlign: "center" }}>
        <button
          onClick={() => {
            if (!cameraRef?.current) return;
            cameraRef.current.position.set(0, 0, 3.5);
            cameraRef.current.lookAt(0, 0, 0);
          }}
          style={{
            padding: "6px 10px",
            fontSize: 12,
            background: "#111827",
            color: "white",
            border: "1px solid rgba(255,255,255,0.06)",
            borderRadius: 6,
            cursor: "pointer",
          }}
        >
          Reset view
        </button>
      </div>
    </Html>
  );
}

/* -------------------------
   Main component
   ------------------------- */
export default function AsteroidExplorer() {
  const [asteroids, setAsteroids] = useState(SAMPLE_ASTEROIDS);
  const [selected, setSelected] = useState(SAMPLE_ASTEROIDS[0]);
  const [loading, setLoading] = useState(false);
  const [textureUrl, setTextureUrl] = useState(null);
  const [query, setQuery] = useState("");
  const cameraRef = useRef();

  /* Try to fetch NEO browse from NASA (graceful fallback to sample) */
  useEffect(() => {
    async function fetchNeos() {
      const key = process.env.REACT_APP_NASA_API_KEY || process.env.REACT_APP_NASAKEY || "DEMO_KEY";
      setLoading(true);
      try {
        const resp = await fetch(`https://api.nasa.gov/neo/rest/v1/neo/browse?api_key=${key}`);
        if (!resp.ok) throw new Error("NEO browse failed");
        const json = await resp.json();
        const items = (json.near_earth_objects || [])
          .slice(0, 12)
          .map((n) => ({
            id: n.id,
            name: n.name,
            designation: n.designation || n.name,
            diameter_km:
              n.estimated_diameter?.meters?.estimated_diameter_max != null
                ? n.estimated_diameter.meters.estimated_diameter_max / 1000
                : null,
            absolute_magnitude_h: n.absolute_magnitude_h,
            is_potentially_hazardous: n.is_potentially_hazardous_asteroid,
            discovery_date: n.orbital_data?.first_observation_date || null,
            discoverer: null,
            summary:
              n.close_approach_data && n.close_approach_data.length
                ? `Closest approach (sample): ${n.close_approach_data[0]?.close_approach_date}`
                : "Near-Earth object",
            notable_events: [],
          }));
        if (items.length) {
          // merge with our sample list so requested asteroids remain present
          const merged = [...SAMPLE_ASTEROIDS, ...items.filter((it) => !SAMPLE_ASTEROIDS.find((s) => s.id === it.id))];
          setAsteroids(merged);
          // keep current selection if possible
          setSelected((prev) => merged.find((m) => m.id === prev.id) || merged[0]);
        }
      } catch (err) {
        // fail silently and keep sample
        // console.warn("NEO fetch failed:", err);
      } finally {
        setLoading(false);
      }
    }
    fetchNeos();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* Fetch extra details from JPL SBDB when selecting (best-effort) */
  async function fetchSBDBDetails(obj) {
    setLoading(true);
    const key = process.env.REACT_APP_NASA_API_KEY || "DEMO_KEY";
    try {
      const target = obj.id || obj.designation || obj.name;
      // JPL SBDB public API (ssd-api.jpl.nasa.gov)
      const res = await fetch(`https://ssd-api.jpl.nasa.gov/sbdb.api?sstr=${encodeURIComponent(target)}&phys=true&orb=true`);
      if (!res.ok) throw new Error("SBDB lookup failed");
      const json = await res.json();
      const phys = json.phys || {};
      const merged = {
        ...obj,
        diameter_km: phys.diameter || obj.diameter_km,
        absolute_magnitude_h: phys.H || obj.absolute_magnitude_h,
        summary: (phys.albedo ? `${obj.name} — albedo: ${phys.albedo}` : obj.summary) || obj.summary,
        notable_events: obj.notable_events || [],
        sbdb_raw: json,
      };
      setSelected(merged);
    } catch (err) {
      // fallback: keep obj
      setSelected(obj);
    } finally {
      setLoading(false);
    }
  }

  function onSelect(a) {
    fetchSBDBDetails(a);
  }

  function onTextureUpload(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    const url = URL.createObjectURL(file);
    setTextureUrl(url);
  }

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return asteroids;
    return asteroids.filter(
      (a) =>
        (a.name && a.name.toLowerCase().includes(q)) ||
        (a.designation && a.designation.toLowerCase().includes(q)) ||
        (a.id && String(a.id).toLowerCase().includes(q))
    );
  }, [asteroids, query]);

  // a simple camera ref hookup for reset
  function CameraWithRef(props) {
    const { camera } = useThree();
    useEffect(() => {
      cameraRef.current = camera;
    }, [camera]);
    return null;
  }

  return (
    <div style={{ fontFamily: "Inter, system-ui, Arial", color: "#e6eef8", background: "linear-gradient(#061426,#031021)", minHeight: "100vh", padding: 20 }}>
      <div style={{ maxWidth: 1200, margin: "0 auto", display: "grid", gridTemplateColumns: "300px 1fr 340px", gap: 18 }}>
        {/* Sidebar */}
        <aside style={{ background: "#0f1724", padding: 14, borderRadius: 12, height: "calc(100vh - 40px)", overflow: "auto" }}>
          <h2 style={{ margin: 0, fontSize: 18 }}>Asteroid Explorer</h2>
          <p style={{ color: "#94a3b8", fontSize: 13, marginTop: 6 }}>Search & inspect asteroids (sample + public NASA/JPL endpoints).</p>

          <div style={{ marginTop: 10 }}>
            <input
              aria-label="search"
              placeholder="Search name or designation"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              style={{
                width: "100%",
                padding: "8px 10px",
                borderRadius: 8,
                border: "1px solid rgba(255,255,255,0.04)",
                background: "rgba(255,255,255,0.02)",
                color: "inherit",
                marginBottom: 8,
              }}
            />
            <div style={{ fontSize: 13, color: "#94a3b8", marginBottom: 8 }}>{loading ? "Loading..." : `${filtered.length} items`}</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {filtered.length === 0 && <div style={{ color: "#9ca3af" }}>No matches</div>}
              {filtered.map((a) => {
                const selectedFlag = selected && selected.id === a.id;
                return (
                  <button
                    key={a.id + a.name}
                    onClick={() => onSelect(a)}
                    style={{
                      textAlign: "left",
                      padding: 10,
                      borderRadius: 8,
                      background: selectedFlag ? "linear-gradient(90deg,#4f46e5, #7c3aed44)" : "transparent",
                      border: "1px solid rgba(255,255,255,0.02)",
                      color: "inherit",
                      cursor: "pointer",
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", gap: 6 }}>
                      <div>
                        <div style={{ fontWeight: 600 }}>{a.name}</div>
                        <div style={{ fontSize: 12, color: "#94a3b8" }}>{a.designation || a.id}</div>
                      </div>
                      <div style={{ textAlign: "right", minWidth: 80 }}>
                        <div style={{ fontSize: 12, color: "#94a3b8" }}>
                          {a.diameter_km ? `${Number(a.diameter_km).toFixed(3)} km` : "—"}
                        </div>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>

            <div style={{ marginTop: 12, fontSize: 13, color: "#9ca3af" }}>
              Tip: click an asteroid to load details. You may upload a surface texture for the 3D viewer.
            </div>

            <div style={{ marginTop: 10 }}>
              <label style={{ display: "block", fontSize: 13, marginBottom: 6, color: "#cbd5e1" }}>Upload surface texture (optional)</label>
              <input type="file" accept="image/*" onChange={onTextureUpload} style={{ color: "#111827" }} />
              {textureUrl && (
                <div style={{ marginTop: 6, fontSize: 12 }}>
                  <button
                    onClick={() => {
                      URL.revokeObjectURL(textureUrl);
                      setTextureUrl(null);
                    }}
                    style={{ padding: "6px 8px", borderRadius: 6, background: "#374151", color: "white", border: "none", cursor: "pointer" }}
                  >
                    Clear texture
                  </button>
                </div>
              )}
            </div>
          </div>
        </aside>

        {/* Main panel */}
        <main style={{ background: "rgba(255,255,255,0.02)", padding: 18, borderRadius: 12, minHeight: "60vh" }}>
          <div style={{ display: "flex", gap: 18 }}>
            <div style={{ flex: 1 }}>
              <h3 style={{ margin: 0 }}>{selected?.name}</h3>
              <div style={{ color: "#94a3b8", fontSize: 13, marginTop: 6 }}>{selected?.designation || selected?.id}</div>

              {/* Metrics */}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(2,1fr)", gap: 12, marginTop: 14 }}>
                <div style={{ background: "#0b1220", padding: 10, borderRadius: 10 }}>
                  <div style={{ fontSize: 12, color: "#94a3b8" }}>Diameter</div>
                  <div style={{ fontWeight: 700 }}>{selected?.diameter_km ? `${Number(selected.diameter_km).toFixed(3)} km` : "—"}</div>
                </div>
                <div style={{ background: "#0b1220", padding: 10, borderRadius: 10 }}>
                  <div style={{ fontSize: 12, color: "#94a3b8" }}>Absolute mag (H)</div>
                  <div style={{ fontWeight: 700 }}>{selected?.absolute_magnitude_h ?? "—"}</div>
                </div>
                <div style={{ background: "#0b1220", padding: 10, borderRadius: 10 }}>
                  <div style={{ fontSize: 12, color: "#94a3b8" }}>Potentially Hazardous</div>
                  <div style={{ fontWeight: 700 }}>{selected?.is_potentially_hazardous ? "Yes" : "No"}</div>
                </div>
                <div style={{ background: "#0b1220", padding: 10, borderRadius: 10 }}>
                  <div style={{ fontSize: 12, color: "#94a3b8" }}>Discovery</div>
                  <div style={{ fontWeight: 700 }}>
                    {fmt(selected?.discovery_date)}{selected?.discoverer ? ` — ${selected.discoverer}` : ""}
                  </div>
                </div>
              </div>

              {/* Summary */}
              <section style={{ marginTop: 18 }}>
                <h4 style={{ marginBottom: 8 }}>Summary</h4>
                <p style={{ color: "#dbeafe", lineHeight: 1.5 }}>{selected?.summary || "No summary available."}</p>
              </section>

              {/* History */}
              <section style={{ marginTop: 10 }}>
                <h4 style={{ marginBottom: 8 }}>History & Notable events</h4>
                {(selected?.notable_events && selected.notable_events.length > 0) ? (
                  <ol style={{ paddingLeft: 18, color: "#e6eef8" }}>
                    {selected.notable_events.map((ev, i) => (
                      <li key={i} style={{ marginBottom: 8, background: "#071028", padding: 8, borderRadius: 6 }}>
                        <div style={{ fontSize: 12, color: "#94a3b8" }}>{fmt(ev.date)}</div>
                        <div style={{ fontWeight: 600 }}>{ev.event}</div>
                      </li>
                    ))}
                  </ol>
                ) : (
                  <div style={{ color: "#9ca3af" }}>No recorded events in this dataset.</div>
                )}
              </section>
            </div>

            {/* 3D viewer */}
            <aside style={{ width: 360, background: "#051022", borderRadius: 10, padding: 12 }}>
              <div style={{ fontWeight: 700, marginBottom: 8 }}>3D Viewer</div>
              <div style={{ width: "100%", height: 420, borderRadius: 8, overflow: "hidden", background: "black" }}>
                <Canvas camera={{ position: [0, 0, 3.5], fov: 50 }}>
                  <CameraWithRef />
                  <ambientLight intensity={0.6} />
                  <directionalLight intensity={1.0} position={[5, 5, 5]} />
                  <Suspense fallback={<Html center>Loading 3D...</Html>}>
                    <group>
                      {/* orbit ring for scale (example) */}
                      <OrbitRing a={2.8} b={2.2} />
                      {/* main asteroid body */}
                      <AsteroidMesh name={selected?.name || "asteroid"} size={1.2} textureUrl={textureUrl} rotationSpeed={0.25} />
                    </group>
                  </Suspense>
                  <OrbitControls enablePan={true} enableZoom={true} />
                  <Stars radius={50} depth={20} count={2000} factor={4} saturation={0} fade />
                </Canvas>
              </div>

              <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
                <button
                  onClick={() => {
                    // try to download a quick snapshot (canvas capture)
                    const canvas = document.querySelector("canvas");
                    if (!canvas) return;
                    const data = canvas.toDataURL("image/png");
                    const a = document.createElement("a");
                    a.href = data;
                    a.download = `${(selected?.name || "asteroid").replace(/\s+/g, "_")}_snapshot.png`;
                    document.body.appendChild(a);
                    a.click();
                    a.remove();
                  }}
                  style={{ flex: 1, padding: "8px 10px", borderRadius: 8, background: "#374151", color: "white", border: "none", cursor: "pointer" }}
                >
                  Snapshot
                </button>
                <button
                  onClick={() => setTextureUrl(null)}
                  style={{ padding: "8px 10px", borderRadius: 8, background: "#111827", color: "white", border: "none", cursor: "pointer" }}
                >
                  Clear Texture
                </button>
              </div>
              <div style={{ marginTop: 8, fontSize: 12, color: "#94a3b8" }}>Mouse / touch: rotate & zoom. Use Snapshot to save a PNG.</div>
            </aside>
          </div>
        </main>

        {/* Right column: quick timeline & export */}
        <aside style={{ background: "#0f1724", padding: 14, borderRadius: 12, height: "calc(100vh - 40px)", overflow: "auto" }}>
          <h4 style={{ marginTop: 0 }}>Quick Timeline</h4>
          <div style={{ color: "#94a3b8", fontSize: 13, marginBottom: 8 }}>
            Condensed timeline for the selected asteroid (top events).
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {(selected?.notable_events || []).slice(0, 8).map((ev, i) => (
              <div key={i} style={{ background: "#071028", padding: 8, borderRadius: 6 }}>
                <div style={{ fontSize: 12, color: "#94a3b8" }}>{fmt(ev.date)}</div>
                <div style={{ fontWeight: 600 }}>{ev.event}</div>
              </div>
            ))}
            {(!selected?.notable_events || selected.notable_events.length === 0) && <div style={{ color: "#9ca3af" }}>No events recorded.</div>}
          </div>

          <div style={{ marginTop: 12 }}>
            <h5 style={{ marginBottom: 8 }}>Export / Share</h5>
            <div style={{ color: "#94a3b8", fontSize: 13 }}>Copy the selected asteroid's JSON to clipboard.</div>
            <div style={{ marginTop: 8 }}>
              <button
                onClick={() => {
                  navigator.clipboard?.writeText(JSON.stringify(selected, null, 2));
                }}
                style={{ padding: "8px 10px", borderRadius: 8, background: "#4f46e5", color: "white", border: "none", cursor: "pointer" }}
              >
                Copy JSON
              </button>
            </div>
          </div>

          <div style={{ marginTop: 18, fontSize: 12, color: "#9ca3af" }}>
            Data: sample + public NASA/JPL endpoints (when available). For full ephemeris & high-fidelity shapes, fetch JPL Horizons or retrieve mission shape models (glTF).
          </div>
        </aside>
      </div>

      <footer style={{ maxWidth: 1200, margin: "18px auto 0", color: "#9ca3af", fontSize: 12, textAlign: "center" }}>
        Built for exploration — replace procedural shapes with official 3D models for high-fidelity renderings.
      </footer>
    </div>
  );
}
