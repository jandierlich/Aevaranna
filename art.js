/* AEVARANNA – Kartenkunst v2
   Jede Karte erhält eine geschichtete Szene: Himmel, Horizont,
   Boden, eine stilisierte Figuren-Silhouette (generische, geometrisch
   vereinfachte Gestalt – keine Nachbildung einer bestehenden Illustration)
   sowie ein eigenes Sinnbild als Aura im Hintergrund. Weiterhin reine
   Vektorgrafik, weiterhin ohne klassische Tarot-Ikonografie.
*/

function mulberry32(a) {
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const SUIT_PALETTES = {
  major:   ["#1A1330", "#4A2E63", "#9A6BC0"],
  staebe:  ["#25100A", "#7A3617", "#E08A4E"],
  kelche:  ["#081A2B", "#124163", "#57A8D6"],
  schwerter: ["#13141C", "#3B3F55", "#B7BCD6"],
  muenzen: ["#0D1A10", "#274A2A", "#7CB86A"]
};

function skyFill(id, pal) {
  // Sehr dezenter Verlauf plus sanftes Glanzlicht oben links für 3D-Tiefe
  return `<linearGradient id="${id}sky" x1="0" y1="0" x2="0.3" y2="1">
    <stop offset="0%" stop-color="${pal[2]}" stop-opacity=".12"/>
    <stop offset="55%" stop-color="${pal[1]}"/>
    <stop offset="100%" stop-color="${pal[1]}"/>
  </linearGradient>
  <linearGradient id="${id}ground" x1="0" y1="0" x2="0" y2="1">
    <stop offset="0%" stop-color="${pal[1]}"/>
    <stop offset="100%" stop-color="${pal[0]}"/>
  </linearGradient>
  <radialGradient id="${id}sheen" cx="30%" cy="12%" r="75%">
    <stop offset="0%" stop-color="#FFFFFF" stop-opacity=".09"/>
    <stop offset="45%" stop-color="#FFFFFF" stop-opacity=".02"/>
    <stop offset="100%" stop-color="#FFFFFF" stop-opacity="0"/>
  </radialGradient>
  <linearGradient id="${id}vignette" x1="0" y1="0" x2="0" y2="1">
    <stop offset="0%" stop-color="#000000" stop-opacity=".08"/>
    <stop offset="14%" stop-color="#000000" stop-opacity="0"/>
    <stop offset="86%" stop-color="#000000" stop-opacity="0"/>
    <stop offset="100%" stop-color="#000000" stop-opacity=".14"/>
  </linearGradient>`;
}

function starField(rnd, n, w, h, color) {
  let out = "";
  for (let i = 0; i < n; i++) {
    const x = rnd() * w, y = rnd() * h * 0.5, r = 0.4 + rnd() * 1.0;
    out += `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${r.toFixed(2)}" fill="${color}" opacity="${(0.2 + rnd() * 0.45).toFixed(2)}"/>`;
  }
  return out;
}

// Horizont + Boden – gibt jeder Karte räumliche Tiefe, mit dezentem Verlauf statt Flachfarbe
function groundScene(id, pal, horizonY, rnd) {
  const wobble = 6 + rnd() * 8;
  const path = `M0 ${horizonY} Q50 ${horizonY - wobble} 100 ${horizonY} T200 ${horizonY}`;
  return `
    <path d="${path} L200 240 L0 240 Z" fill="url(#${id}ground)"/>
    <path d="${path}" stroke="${pal[2]}" stroke-width="1.2" fill="none" opacity=".55"/>`;
}

/* ---------- Generische Figuren-Silhouette ---------- */
/* Ein vereinfachter, geometrisch abstrahierter Umriss (Kopf + Robe),
   der je nach "pose" unterschiedlich haltung annimmt. Bewusst schematisch
   gehalten, um keiner bestehenden Illustration zu ähneln. */
function figureSilhouette(pose, cx, cy, scale, fill, accent) {
  const s = scale;
  const headR = 6 * s;
  const headY = cy - 34 * s;
  const shoulderY = cy - 24 * s;
  let robe = `M${cx - 9*s} ${shoulderY} L${cx - 15*s} ${cy} L${cx + 15*s} ${cy} L${cx + 9*s} ${shoulderY} Z`;
  let extra = "";

  if (pose === "armsUp") {
    extra = `<path d="M${cx-9*s} ${shoulderY+2*s} L${cx-20*s} ${headY-6*s} M${cx+9*s} ${shoulderY+2*s} L${cx+20*s} ${headY-6*s}" stroke="${fill}" stroke-width="${1.6*s}" fill="none"/>
      <circle cx="${cx-20*s}" cy="${headY-8*s}" r="${2*s}" fill="${accent}"/>
      <circle cx="${cx+20*s}" cy="${headY-8*s}" r="${2*s}" fill="${accent}"/>`;
  } else if (pose === "reach") {
    extra = `<path d="M${cx+8*s} ${shoulderY+2*s} L${cx+26*s} ${headY-10*s}" stroke="${fill}" stroke-width="${1.6*s}" fill="none"/>
      <circle cx="${cx+27*s}" cy="${headY-13*s}" r="${2.6*s}" fill="${accent}"/>`;
  } else if (pose === "staff") {
    extra = `<line x1="${cx-16*s}" y1="${headY-4*s}" x2="${cx-16*s}" y2="${cy+2*s}" stroke="${fill}" stroke-width="${1.6*s}"/>
      <path d="M${cx-9*s} ${shoulderY+3*s} L${cx-16*s} ${shoulderY-2*s}" stroke="${fill}" stroke-width="${1.6*s}" fill="none"/>`;
  } else if (pose === "seated") {
    robe = `M${cx-10*s} ${shoulderY} L${cx-18*s} ${cy-4*s} L${cx-10*s} ${cy} L${cx+16*s} ${cy} L${cx+10*s} ${shoulderY} Z`;
  } else if (pose === "kneel") {
    robe = `M${cx-9*s} ${shoulderY+6*s} L${cx-14*s} ${cy} L${cx+16*s} ${cy} L${cx+9*s} ${shoulderY+6*s} Z`;
  } else if (pose === "wings") {
    extra = `<path d="M${cx-9*s} ${shoulderY+2*s} Q${cx-30*s} ${shoulderY-6*s} ${cx-26*s} ${shoulderY+14*s} Q${cx-16*s} ${shoulderY+10*s} ${cx-9*s} ${shoulderY+6*s} Z
               M${cx+9*s} ${shoulderY+2*s} Q${cx+30*s} ${shoulderY-6*s} ${cx+26*s} ${shoulderY+14*s} Q${cx+16*s} ${shoulderY+10*s} ${cx+9*s} ${shoulderY+6*s} Z"
        fill="${fill}" opacity=".55"/>`;
  } else if (pose === "fallen") {
    // liegende/hängende Haltung – wird vom Aufrufer meist zusätzlich gedreht
    robe = `M${cx-9*s} ${shoulderY} L${cx-15*s} ${cy} L${cx+15*s} ${cy} L${cx+9*s} ${shoulderY} Z`;
  }

  return `<g>
    <path d="${robe}" fill="${fill}" opacity=".92"/>
    <circle cx="${cx}" cy="${headY}" r="${headR}" fill="${fill}" opacity=".92"/>
    ${extra}
  </g>`;
}

/* ---------- 22 Sinnbilder der Großen Arkana (Hintergrund-Aura) ---------- */
const MAJOR_GLYPHS = [
  (c,a) => `<path d="M20 150 Q100 190 180 120" stroke="${c[2]}" stroke-width="2" fill="none" opacity=".6"/>`,
  (c,a) => `<path d="M80 70 C80 50 100 50 100 70 C100 90 120 90 120 70 C120 50 100 50 100 70 C100 90 80 90 80 70Z" stroke="${a}" stroke-width="2" fill="none" opacity=".5"/>`,
  (c,a) => `<line x1="55" y1="50" x2="55" y2="150" stroke="${c[2]}" stroke-width="3" opacity=".5"/><line x1="145" y1="50" x2="145" y2="150" stroke="${c[2]}" stroke-width="3" opacity=".5"/>`,
  (c,a) => `${[0,60,120,180,240,300].map(d=>`<line x1="${100+30*Math.cos(d*Math.PI/180)}" y1="${70+30*Math.sin(d*Math.PI/180)}" x2="${100+46*Math.cos(d*Math.PI/180)}" y2="${70+46*Math.sin(d*Math.PI/180)}" stroke="${a}" stroke-width="1.4" opacity=".45"/>`).join("")}`,
  (c,a) => `<rect x="76" y="40" width="48" height="48" fill="none" stroke="${a}" stroke-width="2" opacity=".4"/>`,
  (c,a) => `<path d="M65 100 L65 55 A35 35 0 0 1 135 55 L135 100" stroke="${a}" stroke-width="2" fill="none" opacity=".45"/>`,
  (c,a) => `<circle cx="82" cy="60" r="26" fill="none" stroke="${a}" stroke-width="1.6" opacity=".4"/><circle cx="118" cy="60" r="26" fill="none" stroke="${c[2]}" stroke-width="1.6" opacity=".4"/>`,
  (c,a) => `<rect x="55" y="45" width="90" height="55" fill="none" stroke="${c[2]}" stroke-width="1.6" opacity=".4"/>`,
  (c,a) => `<path d="M55 90 Q100 40 145 90" stroke="${c[2]}" stroke-width="2" fill="none" opacity=".5"/>`,
  (c,a) => `<circle cx="150" cy="55" r="9" fill="${a}" opacity=".5"/><circle cx="150" cy="55" r="16" fill="none" stroke="${a}" opacity=".3"/>`,
  (c,a) => `<circle cx="100" cy="65" r="32" fill="none" stroke="${a}" stroke-width="1.6" opacity=".4"/>${[0,45,90,135,180,225,270,315].map(d=>`<line x1="${100+16*Math.cos(d*Math.PI/180)}" y1="${65+16*Math.sin(d*Math.PI/180)}" x2="${100+32*Math.cos(d*Math.PI/180)}" y2="${65+32*Math.sin(d*Math.PI/180)}" stroke="${a}" stroke-width="1" opacity=".4"/>`).join("")}`,
  (c,a) => `<line x1="55" y1="55" x2="145" y2="55" stroke="${a}" stroke-width="2" opacity=".5"/><line x1="100" y1="40" x2="100" y2="70" stroke="${a}" stroke-width="1.6" opacity=".5"/>`,
  (c,a) => `<line x1="100" y1="30" x2="100" y2="65" stroke="${c[2]}" stroke-width="2" opacity=".4"/>`,
  (c,a) => `<rect x="85" y="35" width="30" height="55" fill="none" stroke="${c[2]}" stroke-width="1.6" opacity=".4"/>`,
  (c,a) => `<path d="M60 60 L60 95 Q100 105 140 65 L140 100" stroke="${a}" stroke-width="1.6" fill="none" opacity=".45"/>`,
  (c,a) => `<circle cx="75" cy="60" r="7" fill="none" stroke="${a}" stroke-width="1.6" opacity=".4"/><circle cx="125" cy="60" r="7" fill="none" stroke="${a}" stroke-width="1.6" opacity=".4"/>`,
  (c,a) => `<path d="M100 30 L82 58 M100 30 L118 52" stroke="${a}" stroke-width="1.8" opacity=".5"/>`,
  (c,a) => Array.from({length:7}).map((_,i)=>{const d=i*(360/7)-90;return `<circle cx="${100+38*Math.cos(d*Math.PI/180)}" cy="${58+38*Math.sin(d*Math.PI/180)}" r="${i===0?3.4:1.8}" fill="${a}" opacity=".55"/>`;}).join(""),
  (c,a) => `<path d="M110 40 A20 20 0 1 0 110 80 A15 15 0 1 1 110 40 Z" fill="${a}" opacity=".5"/>`,
  (c,a) => `${[0,30,60,90,120,150,180,210,240,270,300,330].map(d=>`<line x1="${100+22*Math.cos(d*Math.PI/180)}" y1="${55+22*Math.sin(d*Math.PI/180)}" x2="${100+34*Math.cos(d*Math.PI/180)}" y2="${55+34*Math.sin(d*Math.PI/180)}" stroke="${a}" stroke-width="1.4" opacity=".45"/>`).join("")}<circle cx="100" cy="55" r="16" fill="${a}" opacity=".4"/>`,
  (c,a) => `<path d="M90 40 L100 28 L110 40" stroke="${a}" stroke-width="1.8" fill="none" opacity=".5"/>`,
  (c,a) => `<ellipse cx="100" cy="60" rx="34" ry="40" fill="none" stroke="${a}" stroke-width="2" opacity=".4"/>`
];

// Pose je Karte der Großen Arkana – ergänzt die Aura um eine Szene mit Figur
const MAJOR_POSES = [
  "reach","armsUp","seated","seated","staff","kneel","armsUp","staff",
  "kneel","staff","null","staff","fallen","null","armsUp","fallen",
  "fallen","kneel","seated","armsUp","wings","armsUp"
];

/* ---------- Kleine Arkana: Element-Motive ---------- */
function suitGlyph(suit, x, y, s, color) {
  if (suit === "staebe") {
    return `<path d="M${x} ${y+s} L${x} ${y-s*0.6}
      M${x} ${y-s*0.6} L${x-s*0.4} ${y-s*0.1} M${x} ${y-s*0.6} L${x+s*0.4} ${y-s*0.1}
      M${x} ${y-s*0.2} L${x-s*0.35} ${y+s*0.25} M${x} ${y-s*0.2} L${x+s*0.35} ${y+s*0.25}"
      stroke="${color}" stroke-width="1.6" fill="none" opacity=".85"/>`;
  }
  if (suit === "kelche") {
    return `<path d="M${x-s*0.55} ${y-s*0.3} Q${x-s*0.55} ${y+s*0.35} ${x} ${y+s*0.4} Q${x+s*0.55} ${y+s*0.35} ${x+s*0.55} ${y-s*0.3}
      Q${x} ${y-s*0.05} ${x-s*0.55} ${y-s*0.3} Z
      M${x} ${y+s*0.4} L${x} ${y+s*0.62} M${x-s*0.28} ${y+s*0.65} L${x+s*0.28} ${y+s*0.65}"
      stroke="${color}" stroke-width="1.5" fill="none" opacity=".85"/>`;
  }
  if (suit === "schwerter") {
    return `<path d="M${x} ${y-s} L${x} ${y+s*0.55} M${x-s*0.3} ${y-s*0.55} L${x+s*0.3} ${y-s*0.55}
      M${x-s*0.22} ${y+s*0.3} L${x} ${y+s*0.55} L${x+s*0.22} ${y+s*0.3}"
      stroke="${color}" stroke-width="1.6" fill="none" opacity=".85"/>`;
  }
  // muenzen – konzentrischer Ring mit Kern
  return `<circle cx="${x}" cy="${y}" r="${s*0.55}" fill="none" stroke="${color}" stroke-width="1.6" opacity=".85"/>
    <circle cx="${x}" cy="${y}" r="${s*0.2}" fill="${color}" opacity=".7"/>`;
}

function generateCardArt(card) {
  const pal = SUIT_PALETTES[card.arcana === "major" ? "major" : card.suit];
  const rnd = mulberry32(card.sig.seed);
  const gid = `g${card.id}`;
  const ivory = "#EFE7D6";
  const horizonY = 150 + Math.floor(rnd() * 14);
  let scene = "";

  if (card.arcana === "major") {
    const aura = MAJOR_GLYPHS[card.number](pal, ivory);
    const pose = MAJOR_POSES[card.number];
    const figY = horizonY;
    let figFill = ivory;
    let transform = "";
    if (pose === "fallen") transform = `transform="rotate(180 100 ${figY - 20})"`;
    const figure = pose === "null" ? "" : `<g ${transform}>${figureSilhouette(pose, 100, figY, 1.3, figFill, pal[2])}</g>`;
    scene = `${aura}${figure}`;
  } else {
    const cx = 100;
    const rank = card.number;
    if (rank <= 10) {
      const n = rank;
      const topY = 40;
      const bottomY = horizonY - 14;
      for (let i = 0; i < n; i++) {
        const col = i % 4, row = Math.floor(i / 4);
        const rows = Math.ceil(n / 4);
        const x = 38 + col * ((200 - 76) / 3) + (rnd() - 0.5) * 6;
        const y = topY + (rows > 1 ? row * ((bottomY - topY) / (rows - 1 || 1)) : (bottomY - topY) / 2) + (rnd() - 0.5) * 4;
        scene += suitGlyph(card.suit, x, y, 15, ivory);
      }
    } else {
      const pose = rank === 11 ? "reach" : rank === 12 ? "staff" : rank === 13 ? "seated" : "armsUp";
      scene += figureSilhouette(pose, cx, horizonY, rank === 14 ? 1.25 : 1.1, ivory, pal[2]);
      scene += suitGlyph(card.suit, cx + (rank === 12 ? 28 : 0), horizonY - 46, 16, pal[2]);
    }
  }

  const stars = starField(rnd, 14, 200, 240, ivory);
  const ground = groundScene(gid, pal, horizonY, rnd);

  return `<svg viewBox="0 0 200 240" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="${card.name}">
    <defs>${skyFill(gid, pal)}</defs>
    <rect x="0" y="0" width="200" height="240" rx="14" fill="url(#${gid}sky)"/>
    ${stars}
    ${ground}
    <g>${scene}</g>
    <rect x="0" y="0" width="200" height="240" rx="14" fill="url(#${gid}vignette)"/>
    <rect x="0" y="0" width="200" height="240" rx="14" fill="url(#${gid}sheen)"/>
    <rect x="4" y="4" width="192" height="232" rx="11" fill="none" stroke="${ivory}" stroke-opacity=".4" stroke-width="1"/>
    <rect x="1.5" y="1.5" width="197" height="237" rx="12.5" fill="none" stroke="#000000" stroke-opacity=".25" stroke-width="1"/>
  </svg>`;
}
