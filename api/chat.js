export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  try {
    const { system, messages, max_tokens } = req.body;
    const userText = messages?.[messages.length - 1]?.content || '';
    const fullPrompt = system ? system + '\n\nUsuario: ' + userText : userText;
    const response = await fetch(
      'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=' + process.env.GEMINI_API_KEY,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: fullPrompt }] }],
          generationConfig: { maxOutputTokens: max_tokens || 800, temperature: 0.1 },
        }),
      }
    );
    const data = await response.json();
    if (data.error) return res.status(400).json({ type: 'error', error: data.error });
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
    return res.status(200).json({ content: [{ type: 'text', text }] });
  } catch (error) {
    return res.status(500).json({ type: 'error', error: { message: error.message } });
  }
}
