const PROJECT_FIELDS = ["projektart","beschreibung","masse","material_optik","ort_plz","zeitraum","fotos_plaene"];
const BRAND_NAME = "Echtholz Träume";
const SIGNATURE = `Viele Grüße\nLukas Bernard\n${BRAND_NAME}`;

const EXCLUDED_HINTS = ["rechnung","auftragsbestätigung","bestellung","versand","lieferung","newsletter","praktikum","bewerbung","kooperation","support","bestätigungscode","sicherheitswarnung","passwort","login","registrierung","verifizierung","ticket wurde","zahlung","mahnung","konto bestätigen"];
const STRONG_PROJECT_HINTS = ["einbauschrank","schrank","garderobe","küche","treppe","möbel","tisch","sitzbank","badmöbel","regal","innenausbau","sanierung","schreinerarbeiten","maßanfertigung","massanfertigung","arbeitsplatte","holzpflege","bankauflage","eingangsportal","bodenbelag","tür","tuere","türe"];
const INTENT_HINTS = ["anfrage","angebot","anfertigen","anfertigung","bauen","fertigen","wir würden gerne","wir wuerden gerne","ich würde gerne","ich wuerde gerne","wir möchten","wir moechten","ich möchte","ich moechte","suchen einen","suchen eine","interesse an"];

function textOf(input={}) { return `${input.subject||""}\n${input.body||""}`.toLowerCase(); }
function matchingHints(text,hints){ return hints.filter(h=>text.includes(h)); }
function classify(input){
  const text=textOf(input), excluded=matchingHints(text,EXCLUDED_HINTS);
  if(excluded.length) return {category:"kein_neuprojekt",confidence:.99,reasons:excluded};
  const project=matchingHints(text,STRONG_PROJECT_HINTS), intent=matchingHints(text,INTENT_HINTS);
  if(project.length&&intent.length) return {category:"projektanfrage",confidence:Math.min(.98,.86+(project.length-1)*.03+(intent.length-1)*.02),reasons:[...project,...intent]};
  return {category:"manuell_pruefen",confidence:.4,reasons:[...project,...intent]};
}

function detectAddressStyle(input){
  const body=input.body||"";
  const informal=[/\bdu\b/i,/\bdir\b/i,/\bdich\b/i,/\bdein(?:e|en|em|er|es)?\b/i,/hallo\s+lukas\b/i,/hi\s+lukas\b/i,/hey\s+lukas\b/i].filter(r=>r.test(body)).length;
  const formal=[/\bsie\b/,/\bihnen\b/i,/\bihr(?:e|en|em|er|es)?\b/,/sehr geehrte/i,/sehr geehrter/i].filter(r=>r.test(body)).length;
  return informal>formal?"du":"sie";
}

function cleanSenderName(input){
  let name=(input.senderName||"").trim();
  if(!name && input.from) name=input.from.replace(/<[^>]+>/g,"").replace(/["']/g,"").trim();
  name=name.replace(/\s+/g," ").trim();
  if(!name || name.includes("@")) return {firstName:"",fullName:""};
  const parts=name.split(" ").filter(Boolean);
  return {firstName:parts[0]||"",fullName:name};
}

function greeting(input,style){
  const sender=cleanSenderName(input);
  const hour=Number.isFinite(Number(input.localHour))?Number(input.localHour):12;
  const daypart=hour<11?"Guten Morgen":hour>=18?"Guten Abend":"Guten Tag";
  if(style==="du" && sender.firstName) return `${daypart} ${sender.firstName},`;
  return `${daypart},`;
}

function extract(input){
  const body=input.body||"", lower=body.toLowerCase(), data={};
  const projectType=STRONG_PROJECT_HINTS.find(w=>lower.includes(w)); if(projectType)data.projektart=projectType;
  const zip=body.match(/\b\d{5}\b/); if(zip)data.ort_plz=zip[0];
  const dimension=body.match(/\b\d+(?:[.,]\d+)?\s*(?:x|×)\s*\d+(?:[.,]\d+)?(?:\s*(?:x|×)\s*\d+(?:[.,]\d+)?)?\s*(?:mm|cm|m)?\b/i); if(dimension)data.masse=dimension[0];
  const material=["eiche","nussbaum","buche","esche","fichte","weiß","weiss","schwarz","grau"].find(w=>lower.includes(w)); if(material)data.material_optik=material;
  if(/foto|bild|plan|zeichnung|grundriss|anhang|anbei/.test(lower)||(input.attachments||[]).length)data.fotos_plaene="vorhanden";
  return data;
}
function missingFields(data){return PROJECT_FIELDS.filter(f=>!data[f]);}

function draftReply(input,data,missing){
  const style=detectAddressStyle(input), salutation=greeting(input,style), projectName=data.projektart?` „${data.projektart}“`:"", q=[];
  if(style==="du"){
    if(missing.includes("beschreibung"))q.push("eine kurze Beschreibung, was genau du dir wünschst");
    if(missing.includes("masse"))q.push("ungefähre Maße bzw. die verfügbare Einbausituation");
    if(missing.includes("material_optik"))q.push("deine gewünschte Holzart, Oberfläche oder optische Richtung");
    if(missing.includes("ort_plz"))q.push("den Projektort bzw. die PLZ");
    if(missing.includes("zeitraum"))q.push("deinen gewünschten Zeitraum");
    if(missing.includes("fotos_plaene"))q.push("wenn vorhanden, Fotos, Skizzen oder Pläne");
    const ask=q.length?`\n\nDamit wir uns ein gutes Bild machen können, schick uns bitte noch ${q.join(", ")}.`:`\n\nDie wichtigsten Informationen sind bereits enthalten. Wir schauen uns deine Angaben an und melden uns mit dem nächsten sinnvollen Schritt.`;
    return `${salutation}\n\nvielen Dank für deine Anfrage${projectName}. Schön, dass du dich mit deiner Idee an ${BRAND_NAME} wendest.${ask}\n\n${SIGNATURE}`;
  }
  if(missing.includes("beschreibung"))q.push("eine kurze Beschreibung, was genau Sie sich wünschen");
  if(missing.includes("masse"))q.push("ungefähre Maße bzw. die verfügbare Einbausituation");
  if(missing.includes("material_optik"))q.push("Ihre gewünschte Holzart, Oberfläche oder optische Richtung");
  if(missing.includes("ort_plz"))q.push("den Projektort bzw. die PLZ");
  if(missing.includes("zeitraum"))q.push("Ihren gewünschten Zeitraum");
  if(missing.includes("fotos_plaene"))q.push("wenn vorhanden, Fotos, Skizzen oder Pläne");
  const ask=q.length?`\n\nDamit wir uns ein gutes Bild machen können, schicken Sie uns bitte noch ${q.join(", ")}.`:`\n\nDie wichtigsten Informationen sind bereits enthalten. Wir schauen uns Ihre Angaben an und melden uns mit dem nächsten sinnvollen Schritt.`;
  return `${salutation}\n\nvielen Dank für Ihre Anfrage${projectName}. Schön, dass Sie sich mit Ihrer Idee an ${BRAND_NAME} wenden.${ask}\n\n${SIGNATURE}`;
}

export default function handler(req,res){
  if(req.method==="GET")return res.status(200).json({ok:true,service:`${BRAND_NAME} Anfrage-Assistent`,mode:"draft_only",version:4});
  if(req.method!=="POST"){res.setHeader("Allow","GET, POST");return res.status(405).json({error:"Method not allowed"});}
  const input=req.body||{}, classification=classify(input), projectData=extract(input), missing=missingFields(projectData), address_style=detectAddressStyle(input);
  return res.status(200).json({mode:"draft_only",classification,address_style,project:projectData,missing_fields:missing,draft_reply:classification.category==="projektanfrage"?draftReply(input,projectData,missing):null,action:classification.category==="projektanfrage"?"create_gmail_draft_after_review":"no_automatic_reply"});
}
