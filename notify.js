/* =====================================================================
   Notifications de nouvelle commande
   - Telegram : message instantané sur ton téléphone
   - Google Sheets : une ligne ajoutée dans ta feuille (via Apps Script)
   Réglages dans le fichier privé .env (voir .env.example).
   Une notification qui échoue ne bloque JAMAIS la commande :
   elle est déjà enregistrée dans la base avant l'envoi.
   ===================================================================== */

const TIMEOUT_MS = 8000;

const cfg = () => ({
  tgToken: (process.env.TELEGRAM_BOT_TOKEN || "").trim(),
  tgChat: (process.env.TELEGRAM_CHAT_ID || "").trim(),
  sheetUrl: (process.env.SHEETS_WEBHOOK_URL || "").trim(),
  sheetSecret: (process.env.SHEETS_SECRET || "").trim()
});

const esc = (s) => String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const dh = (n) => `${new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 2 }).format(n).replace(/ | /g, " ")} DH`;
const dateMaroc = () => new Intl.DateTimeFormat("fr-FR", {
  timeZone: "Africa/Casablanca", day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit"
}).format(new Date());

async function post(url, body, attempts = 2) {
  let lastErr;
  for (let i = 0; i < attempts; i++) {
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(TIMEOUT_MS),
        redirect: "follow"
      });
      const text = await res.text();
      if (!res.ok) throw new Error(`HTTP ${res.status} ${text.slice(0, 200)}`);
      return text;
    } catch (err) {
      lastErr = err;
      if (i < attempts - 1) await new Promise((r) => setTimeout(r, 1500));
    }
  }
  throw lastErr;
}

function telegramText(id, o) {
  return [
    `🛒 <b>Nouvelle commande #${id}</b>`,
    "",
    `👤 ${esc(o.full_name)}`,
    `📞 ${esc(o.phone)}`,
    `📍 ${esc(o.address)}`,
    "",
    `📦 ${esc(o.flavor)}`,
    `     ${esc(o.pack)}`,
    `💰 <b>${dh(o.total_price)}</b>${o.delivery_fee ? ` (dont livraison ${dh(o.delivery_fee)})` : ""}`,
    "",
    `🕒 ${dateMaroc()}`
  ].join("\n");
}

async function sendTelegram(text) {
  const { tgToken, tgChat } = cfg();
  if (!tgToken || !tgChat) return "désactivé";
  await post(`https://api.telegram.org/bot${tgToken}/sendMessage`, {
    chat_id: tgChat, text, parse_mode: "HTML", disable_web_page_preview: true
  });
  return "ok";
}

async function sendSheet(id, o) {
  const { sheetUrl, sheetSecret } = cfg();
  if (!sheetUrl) return "désactivé";
  const text = await post(sheetUrl, {
    secret: sheetSecret,
    id, date: dateMaroc(),
    name: o.full_name, phone: o.phone, address: o.address,
    order: o.flavor, pack: o.pack, quantity: o.quantity,
    subtotal: Math.round((o.total_price - o.delivery_fee) * 100) / 100,
    delivery: o.delivery_fee, total: o.total_price
  });
  // Apps Script répond {"ok":true} ; toute autre réponse = échec (clé, déploiement…)
  let res = null;
  try { res = JSON.parse(text); } catch (_) { /* page HTML = mauvais lien ou accès */ }
  if (!res || res.ok !== true) throw new Error(res ? `refusé (${res.error})` : "réponse inattendue : vérifiez le lien et l'accès « Tout le monde »");
  return "ok";
}

/** Lance les notifications en arrière-plan (ne retarde pas la réponse au client). */
function notifyNewOrder(id, order) {
  const tasks = [
    ["Telegram", () => sendTelegram(telegramText(id, order))],
    ["Google Sheets", () => sendSheet(id, order)]
  ];
  for (const [name, run] of tasks) {
    run().catch((err) => console.error(`[Notification ${name}] commande #${id} non envoyée :`, err.message));
  }
}

module.exports = { notifyNewOrder, sendTelegram, telegramText, cfg };
