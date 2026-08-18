const PROJECT_FIELDS = [
  "projektart",
  "beschreibung",
  "masse",
  "material_optik",
  "ort_plz",
  "zeitraum",
  "fotos_plaene"
];

const BRAND_NAME = "Echtholz Träume";

const EXCLUDED_HINTS = [
  "rechnung", "auftragsbestätigung", "bestellung", "versand", "newsletter",
  "praktikum", "bewerbung", "kooperation", "support", "bestätigungscode"
];

const PROJECT_HINTS = [
  "anfrage", "anfertigung", "einbauschrank", "schrank", "garderobe", "küche",
  "treppe", "möbel", "tisch", "sitzbank", "badmöbel", "regal", "holz",
  "innenausbau", "sanierung", "projekt"
];

function textOf(input = {}) {
  return `${input.subject || ""}\n${input.body || ""}`.toLowerCase();
}

function classify(input) {
  const text = textOf(input);
  const excluded = EXCLUDED_HINTS.filter((word) => text.includes(word));
  const project = PROJECT_HINTS.filter((word) => text.includes(word));
  if (excluded.length && !project.length) return { category: "kein_neuprojekt", confidence: 0.92, reasons: excluded };
  if (project.length >= 2) return { category: "projektanfrage", confidence: 0.82, reasons: project };
  return { category: "manuell_pruefen", confidence: 0.5, reasons: [...project, ...excluded] };
}

function detectAddressStyle(input) {
  const body = input.body || "";
  const informalSignals = [
    /\bdu\b/i, /\bdir\b/i, /\bdich\b/i, /\bdein(?:e|en|em|er|es)?\b/i,
    /hallo\s+lukas\b/i, /hi\s+lukas\b/i, /hey\s+lukas\b/i
  ];
  const formalSignals = [
    /\bsie\b/, /\bihnen\b/i, /\bihr(?:e|en|em|er|es)?\b/,
    /sehr geehrte/i, /sehr geehrter/i
  ];
  const informal = informalSignals.filter((rx) => rx.test(body)).length;
  const formal = formalSignals.filter((rx) => rx.test(body)).length;
  if (informal > formal) return "du";
  if (formal > informal) return "sie";
  return "sie";
}

function extract(input) {
  const body = input.body || "";
  const lower = body.toLowerCase();
  const data = {};
  const projectType = PROJECT_HINTS.find((word) => lower.includes(word) && !["anfrage", "projekt", "holz"].includes(word));
  if (projectType) data.projektart = projectType;
  const zip = body.match(/\b\d{5}\b/);
  if (zip) data.ort_plz = zip[0];
  const dimension = body.match(/\b\d+(?:[.,]\d+)?\s*(?:x|×)\s*\d+(?:[.,]\d+)?(?:\s*(?:x|×)\s*\d+(?:[.,]\d+)?)?\s*(?:mm|cm|m)?\b/i);
  if (dimension) data.masse = dimension[0];
  const materials = ["eiche", "nussbaum", "buche", "esche", "fichte", "weiß", "weiss", "schwarz", "grau"];
  const material = materials.find((word) => lower.includes(word));
  if (material) data.material_optik = material;
  if (/foto|bild|plan|zeichnung|grundriss|anhang|anbei/.test(lower) || (input.attachments || []).length) data.fotos_plaene = "vorhanden";
  return data;
}

function missingFields(data) {
  return PROJECT_FIELDS.filter((field) => !data[field]);
}

function draftReply(input, data, missing) {
  const style = detectAddressStyle(input);
  const firstName = input.firstName ? ` ${input.firstName}` : "";
  const projectName = data.projektart ? ` „${data.projektart}“` : "";
  const questions = [];

  if (style === "du") {
    if (missing.includes("beschreibung")) questions.push("eine kurze Beschreibung, was genau du dir wünschst");
    if (missing.includes("masse")) questions.push("ungefähre Maße bzw. die verfügbare Einbausituation");
    if (missing.includes("material_optik")) questions.push("deine gewünschte Holzart, Oberfläche oder optische Richtung");
    if (missing.includes("ort_plz")) questions.push("den Projektort bzw. die PLZ");
    if (missing.includes("zeitraum")) questions.push("deinen gewünschten Zeitraum");
    if (missing.includes("fotos_plaene")) questions.push("wenn vorhanden, Fotos, Skizzen oder Pläne");
    const ask = questions.length ? `\n\nDamit wir uns ein gutes Bild machen können, schick uns bitte noch ${questions.join(", ")}.` : "\n\nDie wichtigsten Informationen sind bereits enthalten. Wir schauen uns deine Angaben an und melden uns mit dem nächsten sinnvollen Schritt.";
    return `Hallo${firstName},\n\nvielen Dank für deine Anfrage${projectName}. Schön, dass du dich mit deiner Idee an ${BRAND_NAME} wendest.${ask}\n\nViele Grüße\n${BRAND_NAME}`;
  }

  if (missing.includes("beschreibung")) questions.push("eine kurze Beschreibung, was genau Sie sich wünschen");
  if (missing.includes("masse")) questions.push("ungefähre Maße bzw. die verfügbare Einbausituation");
  if (missing.includes("material_optik")) questions.push("Ihre gewünschte Holzart, Oberfläche oder optische Richtung");
  if (missing.includes("ort_plz")) questions.push("den Projektort bzw. die PLZ");
  if (missing.includes("zeitraum")) questions.push("Ihren gewünschten Zeitraum");
  if (missing.includes("fotos_plaene")) questions.push("wenn vorhanden, Fotos, Skizzen oder Pläne");
  const ask = questions.length ? `\n\nDamit wir uns ein gutes Bild machen können, schicken Sie uns bitte noch ${questions.join(", ")}.` : "\n\nDie wichtigsten Informationen sind bereits enthalten. Wir schauen uns Ihre Angaben an und melden uns mit dem nächsten sinnvollen Schritt.";
  return `Hallo${firstName},\n\nvielen Dank für Ihre Anfrage${projectName}. Schön, dass Sie sich mit Ihrer Idee an ${BRAND_NAME} wenden.${ask}\n\nViele Grüße\n${BRAND_NAME}`;
}

export default function handler(req, res) {
  if (req.method === "GET") return res.status(200).json({ ok: true, service: `${BRAND_NAME} Anfrage-Assistent`, mode: "draft_only", version: 2 });
  if (req.method !== "POST") {
    res.setHeader("Allow", "GET, POST");
    return res.status(405).json({ error: "Method not allowed" });
  }
  const input = req.body || {};
  const classification = classify(input);
  const projectData = extract(input);
  const missing = missingFields(projectData);
  const address_style = detectAddressStyle(input);
  return res.status(200).json({
    mode: "draft_only",
    classification,
    address_style,
    project: projectData,
    missing_fields: missing,
    draft_reply: classification.category === "projektanfrage" ? draftReply(input, projectData, missing) : null,
    action: classification.category === "projektanfrage" ? "create_gmail_draft_after_review" : "no_automatic_reply"
  });
}
