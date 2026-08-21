require("dotenv").config();
const path = require("path");
const fs = require("fs");
const express = require("express");
const cors = require("cors");
const cookieSession = require("cookie-session");
const QRCode = require("qrcode");
const { nanoid } = require("nanoid");

const db = require("./db/database");
const { QUESTIONS, QUALIFICATION_THRESHOLD } = require("./config/questions");

const app = express();
const PORT = process.env.PORT || 3000;
const ADMIN_USER = process.env.ADMIN_USER || "admin";
const ADMIN_PASS = process.env.ADMIN_PASS || "zmien-to-haslo";
const SESSION_SECRET = process.env.SESSION_SECRET || "zmien-ten-sekret-tez";

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));
app.use(
  cookieSession({
    name: "g4session",
    keys: [SESSION_SECRET],
    maxAge: 8 * 60 * 60 * 1000, // 8h
  })
);

const qrDir = path.join(__dirname, "public", "qrcodes");
if (!fs.existsSync(qrDir)) fs.mkdirSync(qrDir, { recursive: true });

// -------------------------------------------------------------------------
// Middleware
// -------------------------------------------------------------------------
function requireAdmin(req, res, next) {
  if (req.session && req.session.isAdmin) return next();
  return res.status(401).json({ error: "Brak autoryzacji." });
}

// -------------------------------------------------------------------------
// AUTH (panel admina)
// -------------------------------------------------------------------------
app.post("/api/admin/login", (req, res) => {
  const { username, password } = req.body || {};
  if (username === ADMIN_USER && password === ADMIN_PASS) {
    req.session.isAdmin = true;
    return res.json({ ok: true });
  }
  return res.status(401).json({ error: "Nieprawidlowy login lub haslo." });
});

app.post("/api/admin/logout", (req, res) => {
  req.session = null;
  res.json({ ok: true });
});

app.get("/api/admin/me", (req, res) => {
  res.json({ isAdmin: !!(req.session && req.session.isAdmin) });
});

// -------------------------------------------------------------------------
// ADMIN: generowanie kodow jednorazowych + QR
// -------------------------------------------------------------------------
app.post("/api/admin/codes", requireAdmin, async (req, res) => {
  const count = Math.min(Math.max(parseInt(req.body?.count, 10) || 1, 1), 200);
  const labelPrefix = (req.body?.label || "").toString().slice(0, 50);

  const insert = db.prepare(
    "INSERT INTO codes (code, label) VALUES (?, ?)"
  );

  const created = [];
  for (let i = 0; i < count; i++) {
    // Krotki, czytelny kod numeryczny (na wypadek braku kamery) + losowosc
    const code = String(Math.floor(100000 + Math.random() * 900000)); // 6 cyfr
    try {
      insert.run(code, labelPrefix || null);
    } catch (e) {
      // kolizja kodu - losuj ponownie (rzadkie)
      i--;
      continue;
    }
    const qrPath = path.join(qrDir, `${code}.png`);
    await QRCode.toFile(qrPath, code, { width: 400, margin: 2 });
    created.push({ code, qrUrl: `/qrcodes/${code}.png` });
  }

  res.json({ created });
});

app.get("/api/admin/codes", requireAdmin, (req, res) => {
  const rows = db
    .prepare("SELECT code, label, status, created_at FROM codes ORDER BY id DESC")
    .all();
  res.json({ codes: rows });
});

// -------------------------------------------------------------------------
// ADMIN: lista zgloszen + podejmowanie decyzji
// -------------------------------------------------------------------------
app.get("/api/admin/submissions", requireAdmin, (req, res) => {
  const rows = db
    .prepare(
      `SELECT s.id, s.code, c.label, s.answers_json, s.score, s.suggestion,
              s.decision, s.submitted_at, s.decided_at
       FROM submissions s
       LEFT JOIN codes c ON c.code = s.code
       ORDER BY s.id DESC`
    )
    .all()
    .map((r) => ({ ...r, answers: JSON.parse(r.answers_json) }));
  res.json({ submissions: rows, questions: QUESTIONS });
});

app.post("/api/admin/submissions/:id/decision", requireAdmin, (req, res) => {
  const { decision } = req.body || {};
  if (!["qualified", "rejected", "waiting"].includes(decision)) {
    return res.status(400).json({ error: "Nieprawidlowa decyzja." });
  }
  const stmt = db.prepare(
    "UPDATE submissions SET decision = ?, decided_at = datetime('now') WHERE id = ?"
  );
  const result = stmt.run(decision, req.params.id);
  if (result.changes === 0) return res.status(404).json({ error: "Nie znaleziono zgloszenia." });
  res.json({ ok: true });
});

// -------------------------------------------------------------------------
// PUBLIC: pytania ankiety (bez progu punktowego)
// -------------------------------------------------------------------------
app.get("/api/questions", (req, res) => {
  res.json({ questions: QUESTIONS });
});

// -------------------------------------------------------------------------
// PUBLIC: sprawdzenie waznosci kodu
// -------------------------------------------------------------------------
app.get("/api/codes/:code/check", (req, res) => {
  const row = db.prepare("SELECT * FROM codes WHERE code = ?").get(req.params.code);
  if (!row) return res.json({ valid: false, reason: "not_found" });
  if (row.status === "used") return res.json({ valid: false, reason: "used" });
  res.json({ valid: true });
});

// -------------------------------------------------------------------------
// PUBLIC: wyslanie odpowiedzi ankiety
// -------------------------------------------------------------------------
app.post("/api/codes/:code/submit", (req, res) => {
  const code = req.params.code;
  const answers = req.body?.answers || {};

  const codeRow = db.prepare("SELECT * FROM codes WHERE code = ?").get(code);
  if (!codeRow) return res.status(404).json({ error: "Kod nie istnieje." });
  if (codeRow.status === "used") {
    return res.status(409).json({ error: "Ten kod zostal juz uzyty." });
  }

  // Liczenie wyniku
  let score = 0;
  for (const q of QUESTIONS) {
    const val = answers[q.id];
    if (q.type === "yesno") {
      if (val === true || val === "tak") score += q.weight || 0;
    } else if (q.type === "scale") {
      const num = Number(val) || 0;
      score += num * (q.weight || 1);
    } else if (q.type === "choice") {
      const opt = (q.options || []).find((o) => o.label === val);
      if (opt) score += opt.points || 0;
    }
    // type "text" nie wplywa na wynik
  }

  const suggestion = score >= QUALIFICATION_THRESHOLD ? "qualified" : "rejected";

  const tx = db.transaction(() => {
    db.prepare(
      "INSERT INTO submissions (code, answers_json, score, suggestion, decision) VALUES (?, ?, ?, ?, 'waiting')"
    ).run(code, JSON.stringify(answers), score, suggestion);
    db.prepare("UPDATE codes SET status = 'used' WHERE code = ?").run(code);
  });
  tx();

  res.json({ ok: true });
});

// -------------------------------------------------------------------------
// PUBLIC: sprawdzenie statusu decyzji po kodzie (strona oczekiwania)
// -------------------------------------------------------------------------
app.get("/api/status/:code", (req, res) => {
  const row = db
    .prepare("SELECT decision, submitted_at, decided_at FROM submissions WHERE code = ?")
    .get(req.params.code);
  if (!row) return res.status(404).json({ error: "Brak zgloszenia dla tego kodu." });
  res.json(row);
});

app.listen(PORT, () => {
  console.log(`G4 Survey dziala na http://localhost:${PORT}`);
  console.log(`Panel admina: http://localhost:${PORT}/admin/login.html`);
  console.log(`Login admina: ${ADMIN_USER} / haslo ustawione w .env`);
});
