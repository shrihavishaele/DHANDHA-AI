const OpenAI = require('openai');
const dotenv = require('dotenv');
const { SYSTEM_PROMPT, USER_PROMPT, buildDatasetContext } = require('../lib/analysis-helper');

dotenv.config();

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    let body = req.body || {};
    if (typeof body === 'string') {
      body = JSON.parse(body);
    }

    const idea = body.idea;
    if (!idea || !idea.trim()) {
      return res.status(400).json({ error: 'Idea is required.' });
    }

    const nvidiaKey = body.apiKey || process.env.NVIDIA_API_KEY;
    const nvidiaUrl = body.apiUrl || process.env.NVIDIA_API_URL;
    const nvidiaModel = body.model || process.env.NVIDIA_MODEL || 'meta/llama-3.1-405b-instruct';

    if (!nvidiaKey) {
      return res.status(400).json({ error: 'NVIDIA API key is required. Provide it in the form or set NVIDIA_API_KEY.' });
    }

    if (!nvidiaUrl) {
      return res.status(400).json({ error: 'NVIDIA API URL is required. Provide it in the form or set NVIDIA_API_URL.' });
    }

    const client = new OpenAI({ apiKey: nvidiaKey, baseURL: nvidiaUrl });
    const datasetContext = buildDatasetContext(body);
    const completion = await client.chat.completions.create({
      model: nvidiaModel,
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: `${USER_PROMPT(body)}\n\nDATASET CONTEXT:\n${datasetContext}` }
      ],
      temperature: 0.35,
      max_tokens: 1500
    });

    const responseText = completion.choices?.[0]?.message?.content || 'No response from the model.';
    return res.status(200).json({ result: responseText });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: error.message || 'Unexpected error.' });
  }
};
