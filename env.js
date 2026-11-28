/* =====================================================================
   Lecture du fichier privé .env (clés Telegram, Google Sheets…)
   Format : une ligne par réglage, NOM=valeur. Les lignes # sont ignorées.
   Les variables déjà définies par l'hébergeur restent prioritaires.
   ===================================================================== */
const fs = require("fs");
const path = require("path");

const file = path.join(__dirname, ".env");
if (fs.existsSync(file)) {
  for (const line of fs.readFileSync(file, "utf8").split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/);
    if (!m || line.trim().startsWith("#")) continue;
    const value = m[2].replace(/^(['"])(.*)\1$/, "$2");
    if (process.env[m[1]] === undefined) process.env[m[1]] = value;
  }
}
