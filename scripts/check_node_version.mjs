const current = process.versions.node;
const [major, minor] = current.split(".").map(Number);

const ok =
  (major === 20 && minor >= 19) ||
  (major === 22 && minor >= 12) ||
  major >= 23;

if (!ok) {
  console.error("");
  console.error(`[ScreenLingua] Node.js ${current} is too old for this Vite version.`);
  console.error("[ScreenLingua] Install Node.js 20.19+ or 22.12+, then reopen the terminal.");
  console.error("[ScreenLingua] Current PATH is picking the old node.exe first.");
  console.error("");
  process.exit(1);
}

if (!process.argv.includes("--quiet")) {
  console.log(`[ScreenLingua] Node.js ${current} OK`);
}
