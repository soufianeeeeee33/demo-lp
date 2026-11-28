/* =====================================================================
   Commandes Creatine Maroc — script Google Sheets
   À coller dans : Extensions → Apps Script (remplacer tout le contenu).
   Le serveur du site envoie chaque commande ici ; une ligne est ajoutée.
   ⚠️ Ce fichier contient une clé secrète : ne le partagez pas.
   ===================================================================== */

// Clé secrète partagée avec le serveur (identique à SHEETS_SECRET dans .env)
const SECRET = "f013c0ee09c221bff96baf7db8ba52c79a3fd417f6273281";

const SHEET_NAME = "Commandes";
const HEADERS = ["N°", "Date", "Nom", "Téléphone", "Adresse", "Commande", "Format", "Qté", "Sous-total (DH)", "Livraison (DH)", "Total (DH)", "Statut", "Remarque"];
const STATUSES = ["🆕 Nouvelle", "✅ Confirmée", "🚚 Expédiée", "📦 Livrée", "❌ Annulée"];
const STATUS_COLORS = ["#fff4c2", "#d7f0dc", "#d6e6fb", "#c8e6c9", "#f8d7d4"];
const STATUS_COL = 12;

/** À lancer UNE fois (bouton ▶ Exécuter) : crée l'onglet, les titres, la liste des statuts et les couleurs. */
function installer() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sh = ss.getSheetByName(SHEET_NAME);
  if (!sh) {
    sh = ss.getSheets().length === 1 && ss.getSheets()[0].getLastRow() === 0
      ? ss.getSheets()[0].setName(SHEET_NAME)
      : ss.insertSheet(SHEET_NAME);
  }
  sh.getRange(1, 1, 1, HEADERS.length).setValues([HEADERS])
    .setFontWeight("bold").setBackground("#1d1b18").setFontColor("#ffffff").setVerticalAlignment("middle");
  sh.setFrozenRows(1);
  sh.setRowHeight(1, 32);
  const widths = [60, 130, 160, 110, 260, 240, 170, 50, 110, 100, 100, 130, 220];
  widths.forEach((w, i) => sh.setColumnWidth(i + 1, w));
  sh.getRange("D:D").setNumberFormat("@"); // téléphone en texte (garde le 0)

  const statusRange = sh.getRange(2, STATUS_COL, 5000, 1);
  statusRange.setDataValidation(
    SpreadsheetApp.newDataValidation().requireValueInList(STATUSES, true).setAllowInvalid(false).build()
  );
  const rules = STATUSES.map((s, i) =>
    SpreadsheetApp.newConditionalFormatRule().whenTextEqualTo(s).setBackground(STATUS_COLORS[i]).setRanges([statusRange]).build()
  );
  sh.setConditionalFormatRules(rules);
  if (!sh.getFilter()) sh.getRange(1, 1, sh.getMaxRows(), HEADERS.length).createFilter();
  SpreadsheetApp.flush();
}

/** Reçoit une commande du serveur. */
function doPost(e) {
  let data;
  try { data = JSON.parse(e.postData.contents); } catch (err) { return reply({ ok: false, error: "json" }); }
  if (!data || data.secret !== SECRET) return reply({ ok: false, error: "secret" });

  const lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    let sh = ss.getSheetByName(SHEET_NAME);
    if (!sh) { installer(); sh = ss.getSheetByName(SHEET_NAME); }
    sh.appendRow([
      Number(data.id) || "",
      safe(data.date),
      safe(data.name),
      "'" + String(data.phone || ""),
      safe(data.address),
      safe(data.order),
      safe(data.pack),
      Number(data.quantity) || "",
      Number(data.subtotal) || 0,
      Number(data.delivery) || 0,
      Number(data.total) || 0,
      STATUSES[0],
      ""
    ]);
  } finally {
    lock.releaseLock();
  }
  return reply({ ok: true });
}

/** Empêche qu'un texte saisi par un client soit lu comme une formule (=, +, -, @). */
function safe(v) {
  const s = String(v == null ? "" : v).slice(0, 500);
  return /^[=+\-@]/.test(s) ? "'" + s : s;
}

function reply(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}
