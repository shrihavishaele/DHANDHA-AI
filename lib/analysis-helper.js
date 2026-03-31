const path = require('path');
const fs = require('fs');

const DATA_DIR = path.join(__dirname, '..', 'databases');
const DATASET_FILES = {
  city_master_data: 'city_master_data.json',
  competition_density_proxy: 'competition_density_proxy.json',
  consumer_expenditure: 'consumer_expenditure.json',
  financial_inclusion: 'financial_inclusion.json',
  government_schemes: 'government_schemes.json',
  master_config: 'master_config.json',
  mindset_matrix: 'mindset_matrix.json',
  opportunity_score_engine: 'opportunity_score_engine.json',
  regulatory_compliance: 'regulatory_compliance.json',
  sector_market_size: 'sector_market_size.json'
};

let datasetsCache = null;

function safeReadJson(fileName) {
  const filePath = path.join(DATA_DIR, fileName);
  try {
    if (!fs.existsSync(filePath)) return { _missing: true, filePath };
    const raw = fs.readFileSync(filePath, 'utf-8');
    return JSON.parse(raw);
  } catch (error) {
    return { _error: true, filePath, message: error.message };
  }
}

function ensureDatasetsLoaded() {
  if (datasetsCache) return datasetsCache;
  datasetsCache = {};
  for (const [key, fileName] of Object.entries(DATASET_FILES)) {
    datasetsCache[key] = safeReadJson(fileName);
  }
  return datasetsCache;
}

function truncateText(value, maxChars) {
  const text = String(value || '');
  if (text.length <= maxChars) return text;
  return text.slice(0, Math.max(0, maxChars - 15)) + '\n...[truncated]';
}

function pickTopCitiesByOpportunity(datasets) {
  const cityData = datasets.city_master_data?.cities || [];
  const opportunityRows = datasets.opportunity_score_engine?.base_scores || [];
  if (!cityData.length || !opportunityRows.length) return [];
  const cityMap = new Map(cityData.map((city) => [city.city, city]));
  return opportunityRows
    .map((row) => ({ ...cityMap.get(row.city), opportunity_score: row.opportunity_score, city: row.city }))
    .filter((item) => item && item.city)
    .slice(0, 8);
}

function buildDatasetContext(body) {
  const ds = ensureDatasetsLoaded();
  const topCities = pickTopCitiesByOpportunity(ds);

  const context = {
    source: DATA_DIR,
    description: 'Use these datasets to rank cities, compare fit, and attach India-specific economic, competition, and regulatory context.',
    top_cities_by_opportunity: topCities.map((c) => ({
      city: c.city,
      state: c.state,
      tier: c.tier,
      opportunity_score: c.opportunity_score,
      per_capita_income_inr_yearly: c.per_capita_income_inr_yearly,
      avg_monthly_hh_expenditure_inr: c.avg_monthly_hh_expenditure_inr,
      startup_density_per_lakh_pop: c.startup_density_per_lakh_pop,
      ease_of_living_rank: c.ease_of_living_rank,
      upi_adoption_index: c.upi_adoption_index
    })),
    competition_density_proxy: ds.competition_density_proxy || {},
    consumer_expenditure: ds.consumer_expenditure || {},
    financial_inclusion: ds.financial_inclusion || {},
    government_schemes: ds.government_schemes || {},
    regulatory_compliance: ds.regulatory_compliance || {},
    sector_market_size: ds.sector_market_size || {},
    mindset_matrix: ds.mindset_matrix || {},
    master_config: ds.master_config || {},
    input: {
      idea: body.idea,
      targetCustomer: body.targetCustomer,
      problem: body.problem,
      solution: body.solution,
      revenueModel: body.revenueModel,
      geography: body.geography,
      stage: body.stage
    }
  };

  return truncateText(JSON.stringify(context, null, 2), 8000);
}

const SYSTEM_PROMPT = `
You are Dhanda.ai — India's most brutally honest startup validator. Built for Bharat, not Silicon Valley.

You think like an Indian operator, not a Silicon Valley VC. You know:
- Indian price sensitivity (tier 1 vs tier 2 vs tier 3 cities)
- Jugaad culture — informal workarounds that kill startups before they start
- Trust barriers — religion, caste, habit, regional behavior
- WhatsApp economy — what gets solved informally that tech cannot disrupt
- Unit economics in rupees — not dollars
- Ground-level execution difficulty in India

You are blunt, data-driven, and opinionated. No fluff. No generic advice.

RULES:
1. Never sugarcoat. If the idea is bad, say it clearly.
2. Always think city by city across India — Mumbai ≠ Jaipur ≠ Lucknow.
3. Always check if jugaad, WhatsApp, or a local uncle already solves this.
4. Quote real Indian market numbers wherever possible.
5. Be the strict IIT professor reviewing their business plan.

INDIAN CITY DATA (use these numbers):
Mumbai (Tier 1): Rs.2.25L per capita/yr | 18,000 startups | 82% internet | 45 VCs | Competition 9/10 | Trust barrier 4 months
Delhi (Tier 1): Rs.3.95L per capita/yr | 15,000 startups | 85% internet | 38 VCs | Competition 8/10 | Trust barrier 5 months
Bangalore (Tier 1): Rs.2.85L per capita/yr | 25,000 startups | 85% internet | 62 VCs | Competition 9/10 | Trust barrier 2 months
Hyderabad (Tier 1): Rs.2.68L per capita/yr | 12,000 startups | 80% internet | 28 VCs | Competition 7/10 | Trust barrier 3 months
Chennai (Tier 1): Rs.2.15L per capita/yr | 9,000 startups | 78% internet | 18 VCs | Competition 7/10 | Trust barrier 4 months
Pune (Tier 1): Rs.1.85L per capita/yr | 8,500 startups | 78% internet | 15 VCs | Competition 7/10 | Trust barrier 3 months
Ahmedabad (Tier 2): Rs.1.65L per capita/yr | 5,500 startups | 72% internet | 8 VCs | Jugaad 7/10 | Trust barrier 5 months
Jaipur (Tier 2): Rs.1.20L per capita/yr | 3,200 startups | 65% internet | 3 VCs | Jugaad 7/10 | Trust barrier 7 months
Indore (Tier 2): Rs.1.35L per capita/yr | 2,800 startups | 68% internet | 2 VCs | Jugaad 6/10 | Trust barrier 5 months
Lucknow (Tier 2): Rs.1.10L per capita/yr | 2,200 startups | 62% internet | 2 VCs | Jugaad 7/10 | Trust barrier 8 months
Surat (Tier 2): Rs.1.75L per capita/yr | 3,000 startups | 70% internet | 3 VCs | Jugaad 7/10 | Trust barrier 6 months
Kochi (Tier 2): Rs.1.55L per capita/yr | 2,500 startups | 85% internet | 4 VCs | Jugaad 4/10 | Trust barrier 4 months
Chandigarh (Tier 2): Rs.1.80L per capita/yr | 1,800 startups | 78% internet | 2 VCs | Jugaad 5/10 | Trust barrier 4 months
Coimbatore (Tier 2): Rs.1.45L per capita/yr | 2,100 startups | 70% internet | 2 VCs | Jugaad 6/10 | Trust barrier 5 months
Bhubaneswar (Tier 2): Rs.1.05L per capita/yr | 1,200 startups | 60% internet | 1 VC | Jugaad 7/10 | Trust barrier 7 months
`;

const USER_PROMPT = (input) => {
  const { idea } = input;

  return `
Startup Idea: ${idea || ''}

OUTPUT FORMAT - YOU MUST FOLLOW THIS EXACTLY. USE THESE EXACT HEADINGS AND NUMBERING. NO DEVIATION.

# STARTUP VALIDATION REPORT

## 1. YOUR IDEA
[Rewrite the idea in 1-2 sharp sentences. No fluff.]

## 2. VERDICT
*[PROCEED / PIVOT NEEDED / NOT VIABLE]*
[4-6 lines. Sharp. Honest. Reference data. No padding.]

## 3. IDEA SCORES (0-10)
- Problem Clarity: [Score]
- Market Size: [Score]
- Willingness to Pay: [Score]
- Competition Risk: [Score]
- Execution Feasibility: [Score]

## 4. INDIA OPPORTUNITY HEATMAP
*Ranking of top 10-15 Indian cities:*
1. [City Name] - [Score]/100
2. [City Name] - [Score]/100
3. [City Name] - [Score]/100
4. [City Name] - [Score]/100
5. [City Name] - [Score]/100
6. [City Name] - [Score]/100
7. [City Name] - [Score]/100
8. [City Name] - [Score]/100
9. [City Name] - [Score]/100
10. [City Name] - [Score]/100
11. [City Name] - [Score]/100
12. [City Name] - [Score]/100
13. [City Name] - [Score]/100
14. [City Name] - [Score]/100
15. [City Name] - [Score]/100

*TOP 3 CITIES TO LAUNCH FIRST:*
* *[City 1]:* [Why - reference income, competition, jugaad risk, trust speed]
* *[City 2]:* [Why]
* *[City 3]:* [Why]

## 5. FULL MARKET ANALYSIS

### MARKET REALITY
*TAM/SAM:* [In INR crores. Be specific.]
*Real Demand:* [What real data or signals show this demand exists in India]

### MARKET GAP
[What existing players are failing at. Why this gap exists. Be specific.]

### COMPETITOR LANDSCAPE
*Direct Competitors:*
* *[Competitor Name]:* [Strength / weakness in Indian context]
* *[Competitor Name]:* [Strength / weakness]

*Indirect Competitors:*
* *[Category]:* [How they compete informally]

### DIFFERENTIATION
1. *[Move 1]:* [Concrete India-specific execution advantage]
2. *[Move 2]:* [Concrete change]
3. *[Move 3]:* [Concrete change]

### JUGAAD CHECK - INFORMAL COMPETITION
[What WhatsApp groups, local vendors, family networks, or street-level solutions already solve this problem informally. How strong is the jugaad. Does it kill the idea or can you beat it.]

### CULTURAL INTELLIGENCE
[Trust factors, religion, caste, regional habits, family decision-making dynamics that affect this idea. City-specific behavioral differences.]

### PRICE SENSITIVITY & UNIT ECONOMICS
[What Indian customers will actually pay at each tier. CAC estimate. LTV. Break-even timeline. All in rupees.]

### RISK FLAGS
* *Regulatory:* [Specific regulation risk - GST, RBI, FSSAI, DPDP, etc.]
* *Execution:* [Ground-level execution risk]
* *Competition:* [Competitive risk]
* *Market:* [Market timing or demand risk]

## 6. YOUR NEXT 90 DAYS (ACTION PLAN)
[If VERDICT is PROCEED use the weekly timeline below. If PIVOT NEEDED or NOT VIABLE replace with a RECOMMENDED FIX paragraph explaining what must change before any building happens.]

### Week 1-2
* [Specific, real-world action - not generic startup advice]
* [Specific action]

### Week 3-4
* [Specific action]
* [Specific action]

### Week 5-6
* [Specific action]
* [Specific action]

### Week 7-8
* [Specific action]
* [Specific action]

### Week 9-12
* [Specific action]
* [Specific action]

Rules:
- Return only the completed report with real values; do not include bracket placeholders.
- Use India-specific reasoning and city-level evidence.
- Do not output any prompt instructions, metadata, or explanations outside the report.
`;
};

module.exports = {
  SYSTEM_PROMPT,
  USER_PROMPT,
  buildDatasetContext
};
