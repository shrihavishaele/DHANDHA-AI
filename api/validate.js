module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const body = req.body;
    const idea = body && body.idea ? body.idea : null;
    if (!idea) return res.status(400).json({ error: 'No idea provided' });

    const groqKey = process.env.GROQ_API_KEY;
    if (!groqKey) return res.status(500).json({ error: 'GROQ_API_KEY not set in environment variables' });

    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + groqKey,
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        max_tokens: 4000,
        temperature: 0.2,
        messages: [
          { role: 'system', content: buildPrompt() },
          { role: 'user', content: 'Validate this startup idea for India: ' + idea + '\n\nReturn ONLY valid JSON.' },
        ],
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      return res.status(500).json({ error: 'Groq error: ' + (data.error ? data.error.message : response.status) });
    }

    const text = data.choices && data.choices[0] && data.choices[0].message && data.choices[0].message.content;
    if (!text) return res.status(500).json({ error: 'Empty response from Groq' });

    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return res.status(500).json({ error: 'No JSON in response', raw: text.slice(0, 200) });

    let parsed;
    try {
      parsed = JSON.parse(jsonMatch[0]);
    } catch (e) {
      const clean = jsonMatch[0].replace(/[\u0000-\u001F]/g, ' ').replace(/,\s*([}\]])/g, '$1');
      parsed = JSON.parse(clean);
    }

    return res.status(200).json(parsed);

  } catch (err) {
    return res.status(500).json({ error: err.message || 'Unknown server error', stack: err.stack });
  }
};

function buildPrompt() {
  return 'You are Dhanda.ai — India most brutally honest startup validator.\n\nINDIAN CITY DATA:\nMumbai: Rs.2.25L per capita, 18000 startups, 82% internet, 45 VCs, competition 9/10\nDelhi: Rs.3.95L per capita, 15000 startups, 85% internet, 38 VCs, competition 8/10\nBangalore: Rs.2.85L per capita, 25000 startups, 85% internet, 62 VCs, competition 9/10\nHyderabad: Rs.2.68L per capita, 12000 startups, 80% internet, 28 VCs, competition 7/10\nChennai: Rs.2.15L per capita, 9000 startups, 78% internet, 18 VCs, competition 7/10\nPune: Rs.1.85L per capita, 8500 startups, 78% internet, 15 VCs, competition 7/10\nAhmedabad: Rs.1.65L per capita, 5500 startups, 72% internet, 8 VCs, jugaad 7/10\nJaipur: Rs.1.20L per capita, 3200 startups, 65% internet, 3 VCs, jugaad 7/10\nIndore: Rs.1.35L per capita, 2800 startups, 68% internet, 2 VCs, jugaad 6/10\nLucknow: Rs.1.10L per capita, 2200 startups, 62% internet, 2 VCs, jugaad 7/10\nSurat: Rs.1.75L per capita, 3000 startups, 70% internet, 3 VCs, jugaad 7/10\nKochi: Rs.1.55L per capita, 2500 startups, 85% internet, 4 VCs, jugaad 4/10\nChandigarh: Rs.1.80L per capita, 1800 startups, 78% internet, 2 VCs, jugaad 5/10\nCoimbatore: Rs.1.45L per capita, 2100 startups, 70% internet, 2 VCs, jugaad 6/10\nBhubaneswar: Rs.1.05L per capita, 1200 startups, 60% internet, 1 VC, jugaad 7/10\n\nRULES: Never sugarcoat. Quote real numbers. Check jugaad. Think rupees.\n\nReturn ONLY this JSON structure with no markdown or backticks:\n{"verdict":"STRONG YES or PIVOT NEEDED or HARD NO","verdict_class":"pass or pivot or fail","verdict_summary":"2-3 sentences","ai_opinion":"My honest take is...","scores":{"Problem Clarity":70,"Market Size":60,"Willingness to Pay":55,"Competition Risk":50,"Execution Feasibility":55},"score_reasons":{"Problem Clarity":"reason","Market Size":"reason","Willingness to Pay":"reason","Competition Risk":"reason","Execution Feasibility":"reason"},"city_scores":{"Mumbai":50,"Delhi":52,"Bangalore":55,"Hyderabad":60,"Chennai":55,"Pune":58,"Ahmedabad":62,"Jaipur":65,"Indore":70,"Lucknow":60,"Surat":63,"Kochi":68,"Chandigarh":65,"Coimbatore":67,"Bhubaneswar":55},"market_analysis":"analysis","competitors":[{"name":"name","type":"Direct","city":"city","strength":"strength","weakness":"weakness","threat_level":"High"}],"jugaad_check":"analysis","cultural_intelligence":"analysis","price_sensitivity":"analysis","why_scores":"reason","risk_flags":["risk1","risk2","risk3"],"roadmap":["week1","week2","week3","week4","week5"],"raw_report":"full analysis"}';
}
