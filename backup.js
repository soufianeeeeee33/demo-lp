/* =====================================================================
   Sauvegarde de la base des commandes : node backup.js
   Copie database/shop.db dans database/backups/shop-AAAA-MM-JJ.db
   (copie cohérente, même si le site reçoit une commande au même moment)
   et garde les 14 dernières sauvegardes.
   Sur le VPS, lancée chaque nuit par une tâche cron.
   ===================================================================== */
const fs = require("fs");
const path = require("path");
const Database = require("better-sqlite3");

const KEEP = 14;
const dir = path.join(__dirname, "database");
const backups = path.join(dir, "backups");
fs.mkdirSync(backups, { recursive: true });

const day = new Intl.DateTimeFormat("sv-SE", { timeZone: "Africa/Casablanca" }).format(new Date());
const target = path.join(backups, `shop-${day}.db`);

const db = new Database(path.join(dir, "shop.db"), { readonly: true, fileMustExist: true });
db.backup(target)
  .then(() => {
    db.close();
    const files = fs.readdirSync(backups).filter((f) => /^shop-\d{4}-\d{2}-\d{2}\.db$/.test(f)).sort();
    files.slice(0, Math.max(0, files.length - KEEP)).forEach((f) => fs.unlinkSync(path.join(backups, f)));
    console.log(`Sauvegarde OK : ${target} (${Math.min(files.length, KEEP)} conservées)`);
  })
  .catch((err) => { console.error("Sauvegarde échouée :", err.message); process.exit(1); });
