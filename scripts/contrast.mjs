#!/usr/bin/env node
/**
 * WCAG 2.1 contrast measurement for the Paper & Ink tokens.
 * Run: node scripts/contrast.mjs
 * Output: markdown table, one row per measured pair.
 */

const TOKENS = {
  light: {
    canvas: "#ffffff",
    surface: "#ffffff",
    sunken: "#fafafa",
    line: "#e4e4e7",
    "line-strong": "#8e8e96",
    "ink-muted": "#71717a",
    "ink-secondary": "#52525b",
    ink: "#0a0a0a",
    inverse: "#ffffff",
  },
  dark: {
    canvas: "#0a0a0a",
    surface: "#121212",
    sunken: "#161616",
    line: "#262626",
    "line-strong": "#66666f",
    "ink-muted": "#8b8b93",
    "ink-secondary": "#a1a1aa",
    ink: "#fafafa",
    inverse: "#0a0a0a",
  },
};

const PAIRS = [
  { fg: "ink", bg: "canvas", role: "Body, judul", need: 7 },
  { fg: "ink", bg: "surface", role: "Teks di kartu", need: 7 },
  { fg: "ink", bg: "sunken", role: "Teks di header tabel", need: 7 },
  { fg: "ink-secondary", bg: "canvas", role: "Teks pendukung", need: 7 },
  { fg: "ink-secondary", bg: "sunken", role: "Metadata di daftar", need: 7 },
  { fg: "ink-muted", bg: "canvas", role: "Caption, placeholder", need: 4.5 },
  { fg: "ink-muted", bg: "sunken", role: "Caption di daftar", need: 4.5 },
  { fg: "inverse", bg: "ink", role: "Teks badge isian hitam", need: 7 },
  { fg: "line-strong", bg: "canvas", role: "Batas input/interaktif", need: 3 },
  { fg: "line", bg: "canvas", role: "Garis dekoratif", need: 1 },
];

function channel(value) {
  const c = value / 255;
  return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
}

function luminance(hex) {
  const clean = hex.replace("#", "");
  const [r, g, b] = [0, 2, 4].map((i) => parseInt(clean.slice(i, i + 2), 16));
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
}

function contrast(a, b) {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

const rows = [];
for (const mode of ["light", "dark"]) {
  const tokens = TOKENS[mode];
  for (const pair of PAIRS) {
    const ratio = contrast(tokens[pair.fg], tokens[pair.bg]);
    rows.push({
      mode,
      pair: `${pair.fg} / ${pair.bg}`,
      role: pair.role,
      ratio: ratio.toFixed(2),
      need: pair.need,
      pass: ratio >= pair.need ? "ya" : "TIDAK",
    });
  }
}

const header = "| Mode | Pasangan | Peran | Rasio | Target | Lulus |\n|---|---|---|---|---|---|";
console.log(header);
for (const row of rows) {
  console.log(
    `| ${row.mode} | \`${row.pair}\` | ${row.role} | ${row.ratio}:1 | ${row.need}:1 | ${row.pass} |`,
  );
}

const failures = rows.filter((row) => row.pass !== "ya");
console.log(`\nTotal pasangan: ${rows.length} · gagal: ${failures.length}`);
