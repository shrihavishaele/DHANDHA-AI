// api/validate.js — Dhanda.ai Backend (Groq + Llama 3.3)

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { idea, sector, budget, stage } = req.body;
  if (!idea || idea.length < 10) return res.status(400).json({ error: 'Please provide a valid idea' });

  try {
    const result = await callGroq(idea, sector, budget, stage);
    return res.status(200).json(result);
  } catch (error) {
    console.error('Error:', error);
    return res.status(500).json({ error: error.message });
  }
};

async function callGroq(idea, sector, budget, stage) {
  const systemPrompt = `You are Dhanda.ai — India's most brutally honest startup validator. Built for Bharat, not Silicon Valley.

REAL INDIAN CITY DATA (use these exact numbers):
Mumbai (Tier 1): Per capita Rs.2,25,000/yr | Startups 18,000 | Internet 82% | VC firms 45 | Competition 9/10 | Trust barrier 4 months
Delhi (Tier 1): Per capita Rs.3,95,000/yr | Startups 15,000 | Internet 85% | VC firms 38 | Competition 8/10 | Trust barrier 5 months
Bangalore (Tier 1): Per capita Rs.2,85,000/yr | Startups 25,000 | Internet 85% | VC firms 62 | Competition 9/10 | Trust barrier 2 months
Hyderabad (Tier 1): Per capita Rs.2,68,000/yr | Startups 12,000 | Internet 80% | VC firms 28 | Competition 7/10 | Trust barrier 3 months
Chennai (Tier 1): Per capita Rs.2,15,000/yr | Startups 9,000 | Internet 78% | VC firms 18 | Competition 7/10 | Trust barrier 4 months
Pune (Tier 1): Per capita Rs.1,85,000/yr | Startups 8,500 | Internet 78% | VC firms 15 | Competition 7/10 | Trust barrier 3 months
Ahmedabad (Tier 2): Per capita Rs.1,65,000/yr | Startups 5,500 | Internet 72% | VC firms 8 | Jugaad 7/10 | Trust barrier 5 months
Jaipur (Tier 2): Per capita Rs.1,20,000/yr | Startups 3,200 | Internet 65% | VC firms 3 | Jugaad 7/10 | Trust barrier 7 months
Indore (Tier 2): Per capita Rs.1,35,000/yr | Startups 2,800 | Internet 68% | VC firms 2 | Jugaad 6/10 | Trust barrier 5 months
Lucknow (Tier 2): Per capita Rs.1,10,000/yr | Startups 2,200 | Internet 62% | VC firms 2 | Jugaad 7/10 | Trust barrier 8 months
Surat (Tier 2): Per capita Rs.1,75,000/yr | Startups 3,000 | Internet 70% | VC firms 3 | Jugaad 7/10 | Trust barrier 6 months
Kochi (Tier 2): Per capita Rs.1,55,000/yr | Startups 2,500 | Internet 85% | VC firms 4 | Jugaad 4/10 | Trust barrier 4 months
Chandigarh (Tier 2): Per capita Rs.1,80,000/yr | Startups 1,800 | Internet 78% | VC firms 2 | Jugaad 5/10 | Trust barrier 4 months
Coimbatore (Tier 2): Per capita Rs.1,45,000/yr | Startups 2,100 | Internet 70% | VC firms 2 | Jugaad 6/10 | Trust barrier 5 months
Bhubaneswar (Tier 2): Per capita Rs.1,05,000/yr | Startups 1,200 | Internet 60% | VC firms 1 | Jugaad 7/10 | Trust barrier 7 months

RULES:
1. Never sugarcoat. If bad say it is bad.
2. Quote exact numbers from the data above.
3. Check if jugaad or WhatsApp already solves this.
4. Think in rupees not dollars.
5. Be like a strict IIT professor.

Respond ONLY with valid JSON. No markdown. No backticks. No text outside JSON. No newlines in string values.

{"verdict":"STRONG YES or PIVOT NEEDED or HARD NO","verdict_class":"pass or pivot or fail","verdict_summary":"2-3 brutal sentences","ai_opinion":"My honest take is... YES or NO","scores":{"Problem Clarity":75,"Market Size":60,"Willingness to Pay":55,"Competition Risk":45,"Execution Feasibility":50},"score_reasons":{"Problem Clarity":"reason","Market Size":"rupee numbers","Willingness to Pay":"price points","Competition Risk":"competitor names","Execution Feasibility":"challenges"},"city_scores":{"Mumbai":45,"Delhi":50,"Bangalore":55,"Hyderabad":60,"Chennai":55,"Pune":58,"Ahmedabad":62,"Jaipur":65,"Indore":70,"Lucknow":60,"Surat":63,"Kochi":68,"Chandigarh":65,"Coimbatore":67,"Bhubaneswar":55},"market_analysis":"TAM in rupees","competitors":[{"name":"name","type":"Direct or Indirect or Jugaad","city":"city","strength":"strength","weakness":"weakness","threat_level":"High or Medium or Low"}],"jugaad_check":"informal workarounds","cultural_intelligence":"relationship trust analysis","price_sensitivity":"rupee price points","why_scores":"scoring logic","risk_flags":["Risk 1","Risk 2","Risk 3","Risk 4","Risk 5"],"roadmap":["Week 1-2","Week 3-4","Week 5-6","Week 7-8","Week 9-12"],"raw_report":"400 word analysis"}`;

  const userPrompt = 'Validate this startup idea for the Indian market:\n\nIDEA: ' + idea + '\n' + (sector ? 'SECTOR: ' + sector + '\n' : '') + (budget ? 'BUDGET: ' + budget + '\n' : '') + (stage ? 'STAGE: ' + stage + '\n' : '') + '\nUse exact city data. Be brutal. Return ONLY valid JSON.';

  const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer ' + process.env.GROQ_API_KEY,
    },
    body: JSON.stringify({
      model: 'llama-3.3-70b-versatile',
      max_tokens: 4000,
      temperature: 0.2,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
    }),
  });

  const data = await response.json();
  if (!response.ok) throw new Error(data.error ? data.error.message : 'Groq API error: ' + response.status);

  const text = (data.choices && data.choices[0] && data.choices[0].message && data.choices[0].message.content) || '';
  if (!text) throw new Error('Empty response from AI');

  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error('Could not parse AI response');

  try {
    return JSON.parse(jsonMatch[0]);
  } catch (e) {
    const clean = jsonMatch[0].replace(/[\u0000-\u001F]/g, ' ').replace(/,\s*([}\]])/g, '$1');
    return JSON.parse(clean);
  }
}
