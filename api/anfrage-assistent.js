const PROJECT_FIELDS = [
  "projektart",
  "beschreibung",
  "masse",
  "material_optik",
  "ort_plz",
  "zeitraum",
  "fotos_plaene"
];

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

  // Conservative by design: ambiguous messages must be reviewed manually.
  if (excluded.length && !project.length) {
    return { category: "kein_neuprojekt", confidence: 0.92, reasons: excluded };
  }
  if (project.length >= 2) {
    return { category: "projektanfrage", confidence: 0.82, reasons: project };
  }
  return { category: "manuell_pruefen", confidence: 0.5, reasons: [...project, ...excluded] };
}

function extract(input) {
  const body = input.body || "";
  const lower = body.toLowerCase();
  const data = {};

  const projectType = PROJECT_HINTS.find((word) => lower.includes(word) && word !== "anfrage" && word !== "projekt" && word !== "holz");
  if (projectType) data.projektart = projectType;

  const zip = body.match(/\b\d{5}\b/);
  if (zip) data.ort_plz = zip[0];

  const dimension = body.match(/\b\d+(?:[.,]\d+)?\s*(?:x|×)\s*\d+(?:[.,]\d+)?(?:\s*(?:x|×)\s*\d+(?:[.,]\d+)?)?\s*(?:mm|cm|m)?\b/i);
  if (dimension) data.masse = dimension[0];

  const materials = ["eiche", "nussbaum", "buche", "esche", "fichte", "weiß", "weiss", "schwarz", "grau"];
  const material = materials.find((word) => lower.includes(word));
  if (material) data.material_optik = material;

  if (/foto|bild|plan|zeichnung|grundriss|anhang|anbei/.test(lower) || (input.attachments || []).length) {
    data.fotos_plaene = "vorhanden";
  }

  return data;
}

function missingFields(data) {
  return PROJECT_FIELDS.filter((field) => !data[field]);
}

function draftReply(input, data, missing) {
  const name = input.firstName ? ` ${input.firstName}` : "";
  const project = data.projektart ? ` zu Ihrem Projekt „${data.projektart}“` : " zu Ihrem Projekt";
  const questions = [];

  if (missing.includes("beschreibung")) questions.push("eine kurze Beschreibung, was genau Sie sich wünschen");
  if (missing.includes("masse")) questions.push("ungefähre Maße bzw. die verfügbare Einbausituation");
  if (missing.includes("material_optik")) questions.push("Ihre gewünschte Holzart, Oberfläche oder optische Richtung");
  if (missing.includes("ort_plz")) questions.push("den Projektort bzw. die PLZ");
  if (missing.includes("zeitraum")) questions.push("Ihren gewünschten Zeitraum");
  if (missing.includes("fotos_plaene")) questions.push("wenn vorhanden, Fotos, Skizzen oder Pläne");

  const ask = questions.length
    ? `\n\nDamit wir uns ein gutes Bild machen können, schicken Sie uns bitte noch ${questions.join(", ")}.`
    : "\n\nDie wichtigsten Informationen sind bereits enthalten. Wir schauen uns Ihre Angaben an und melden uns mit dem nächsten sinnvollen Schritt.";

  return `Hallo${name},\n\nvielen Dank für Ihre Anfrage${project}. Schön, dass Sie sich mit Ihrer Idee an Echtholzträume wenden.${ask}\n\nViele Grüße\nEchtholzträume`;
}

export default function handler(req, res) {
  if (req.method === "GET") {
    return res.status(200).json({
      ok: true,
      service: "Echtholzträume Anfrage-Assistent",
      mode: "draft_only",
      version: 1
    });
  }

  if (req.method !== "POST") {
    res.setHeader("Allow", "GET, POST");
    return res.status(405).json({ error: "Method not allowed" });
  }

  const input = req.body || {};
  const classification = classify(input);
  const projectData = extract(input);
  const missing = missingFields(projectData);

  return res.status(200).json({
    mode: "draft_only",
    classification,
    project: projectData,
    missing_fields: missing,
    draft_reply: classification.category === "projektanfrage"
      ? draftReply(input, projectData, missing)
      : null,
    action: classification.category === "projektanfrage"
      ? "create_gmail_draft_after_review"
      : "no_automatic_reply"
  });
}
