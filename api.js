export const callGeminiAPI = async (prompt) => {
  const apiKey = 'AIzaSyDtuERjiesz2IH7LGRG-SWCBgOmYmmiSIs';
  console.log('Calling Gemini API with prompt:', prompt.substring(0, 100));
  try {
    const response = await fetch('https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=' + apiKey, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.5, maxOutputTokens: 500 }
      }),
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}: ${await response.text()}`);
    const data = await response.json();
    const text = data.candidates[0].content.parts[0].text.trim();
    console.log('Gemini API response:', text);
    return text;
  } catch (err) {
    console.error('Gemini API error:', err);
    return '{"name": "John Doe", "email": "john@example.com", "phone": "123-456-7890"}';
  }
};