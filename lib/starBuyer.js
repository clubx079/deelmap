// "Star Buyer" detection, run once at signup.
//
// A star buyer is someone who looks like a real-estate professional (investor,
// agency, brokerage, wholesaler, fund) rather than a casual browser. We use a
// HYBRID classifier: a cheap deterministic pre-filter (email domain + business
// wording) produces signals that are fed to a Groq LLM, which makes the final
// judgment and returns a confidence + persona + reason.
//
// FAIL-OPEN: any error (no key, network, bad JSON) resolves to a NORMAL buyer.
// A signup must never break, and never be wrongly treated as "star" on error.

// Common free/consumer email providers — a NON-free domain is a strong "business" signal.
const FREE_EMAIL_DOMAINS = new Set([
  'gmail.com', 'googlemail.com', 'yahoo.com', 'ymail.com', 'rocketmail.com',
  'outlook.com', 'hotmail.com', 'live.com', 'msn.com',
  'icloud.com', 'me.com', 'mac.com', 'aol.com',
  'protonmail.com', 'proton.me', 'gmx.com', 'mail.com', 'zoho.com', 'yandex.com',
])

// Real-estate / investor wording found in the email local-part or display name.
// Kept substring-based; curated to avoid common false-positive fragments.
const RE_KEYWORDS = [
  'invest', 'capital', 'realty', 'realestate', 'estate', 'properties', 'property',
  'wholesale', 'realtor', 'broker', 'brokerage', 'ventures', 'holdings', 'equity',
  'acquisition', 'homebuyer', 'offmarket', 'cashoffer', 'portfolio', 'reit',
  'homes', 'houses', 'deals', 'group', 'partners', 'enterprises', 'developers',
  'mortgage', 'lending', 'funding',
]
// Legal-entity suffixes (matched as a trailing token — safe against random substrings).
const BUSINESS_SUFFIXES = ['llc', 'inc', 'corp', 'ltd', 'llp']

// Deterministic, network-free signal extraction. Exported for unit testing.
export function emailSignals(email = '', name = '') {
  const clean = String(email || '').trim().toLowerCase()
  const at = clean.lastIndexOf('@')
  const local = at > 0 ? clean.slice(0, at) : clean
  const domain = at > 0 ? clean.slice(at + 1) : ''
  const nameL = String(name || '').trim().toLowerCase()

  const customDomain = !!domain && !FREE_EMAIL_DOMAINS.has(domain)
  const haystack = `${local} ${nameL}`
  const keyword = RE_KEYWORDS.some((k) => haystack.includes(k))
  const suffix = BUSINESS_SUFFIXES.some(
    (s) => local.endsWith(s) || new RegExp(`(^|[^a-z])${s}([^a-z]|$)`).test(nameL)
  )
  const keywordHit = keyword || suffix

  let signal = 'none'
  if (customDomain) signal = 'strong'          // e.g. deals@bludoor.com
  else if (keywordHit) signal = 'medium'       // e.g. wgainvestmentsllc@gmail.com

  return { local, domain, customDomain, keywordHit, signal }
}

// Ask Groq to make the call, given the deterministic signals as context.
// Returns the parsed JSON verdict, or null on any failure.
async function groqVerdict({ name, email, statesCount, signals }) {
  const key = process.env.GROQ_API_KEY
  if (!key) return null

  const system =
    'You classify new sign-ups on a real-estate INVESTMENT marketplace. A "star" ' +
    'buyer is a real-estate professional — investor, agency, brokerage, wholesaler, ' +
    'fund, or someone clearly operating in the business. A "normal" buyer is an ' +
    'individual or casual browser. Judge only from the name and email. A custom ' +
    '(non-free) email domain, a company-style email, or investor/agency wording are ' +
    'strong signals. Reply with ONLY compact JSON, no prose.'

  const user =
    `Name: ${name || '(none)'}\n` +
    `Email: ${email}\n` +
    `Email domain: ${signals.customDomain ? 'custom/business domain' : 'free consumer provider'}\n` +
    `Business/investor wording in email or name: ${signals.keywordHit ? 'yes' : 'no'}\n` +
    `States of interest selected: ${statesCount}\n\n` +
    'Return JSON exactly with these keys: ' +
    '{"is_star": boolean, "confidence": number between 0 and 1, ' +
    '"persona": one of "agency"|"investor"|"wholesaler"|"broker"|"fund"|"professional"|"casual", ' +
    '"company": string (best-guess company name or ""), "reason": short string}'

  try {
    const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        messages: [
          { role: 'system', content: system },
          { role: 'user', content: user },
        ],
        temperature: 0,
        max_tokens: 200,
        response_format: { type: 'json_object' },
      }),
    })
    if (!res.ok) throw new Error(`Groq API error: ${res.status}`)
    const data = await res.json()
    return JSON.parse(data?.choices?.[0]?.message?.content || '{}')
  } catch (e) {
    console.error('[starBuyer] groq error:', e?.message || e)
    return null
  }
}

// Minimum LLM confidence required to treat a buyer as "star".
const CONFIDENCE_THRESHOLD = 0.6

// Classify a new buyer. Returns:
//   { isStar, confidence, persona, company, reason, method, signal }
// Always resolves (never throws) — fail-open to a normal buyer.
export async function classifyBuyer({ name = '', email = '', statesOfInterest = [] } = {}) {
  const signals = emailSignals(email, name)
  const statesCount = Array.isArray(statesOfInterest) ? statesOfInterest.length : 0

  const llm = await groqVerdict({ name, email, statesCount, signals })

  if (llm && typeof llm.is_star === 'boolean') {
    const c = Number(llm.confidence)
    const confidence = Number.isFinite(c) ? Math.min(1, Math.max(0, c)) : 0
    const isStar = llm.is_star && confidence >= CONFIDENCE_THRESHOLD
    return {
      isStar,
      confidence,
      persona: String(llm.persona || (isStar ? 'professional' : 'casual')).slice(0, 40),
      company: String(llm.company || '').slice(0, 120),
      reason: String(llm.reason || '').slice(0, 300),
      method: 'llm',
      signal: signals.signal,
    }
  }

  // LLM unavailable → decide from deterministic signals only. Only a custom
  // business domain auto-qualifies; "medium" is left to a human, not auto-starred.
  const isStar = signals.signal === 'strong'
  return {
    isStar,
    confidence: signals.signal === 'strong' ? 0.6 : signals.signal === 'medium' ? 0.4 : 0.1,
    persona: isStar ? 'professional' : 'casual',
    company: '',
    reason: isStar
      ? `Business email domain (${signals.domain})`
      : signals.signal === 'medium'
        ? 'Business wording on a free email domain — needs review'
        : 'No professional signals detected',
    method: 'rules',
    signal: signals.signal,
  }
}
