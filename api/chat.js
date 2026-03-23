export const config = { runtime: 'edge' };

const GITBOOK_URLS = [
  "https://anymind-group.gitbook.io/english-1",
  "https://anymind-group.gitbook.io/english-1/gonore",
  "https://anymind-group.gitbook.io/english-1/faq/kyanpn",
  "https://anymind-group.gitbook.io/english-1/faq/infuruens",
  "https://anymind-group.gitbook.io/english-1/faq/anaritikusu",
  "https://anymind-group.gitbook.io/english-1/kyanpn/kyanpnnitsuite",
  "https://anymind-group.gitbook.io/english-1/kyanpn/engjimento",
  "https://anymind-group.gitbook.io/english-1/kyanpn/mkettopureisu",
  "https://anymind-group.gitbook.io/english-1/kyanpn/tracking",
  "https://anymind-group.gitbook.io/english-1/kyanpn/tiktok-special",
  "https://anymind-group.gitbook.io/english-1/infuruens/influencer",
  "https://anymind-group.gitbook.io/english-1/infuruens/pakkji",
  "https://anymind-group.gitbook.io/english-1/anaritikusu/snsakauntono",
  "https://anymind-group.gitbook.io/english-1/anaritikusu/guan-li-hua-mian",
  "https://anymind-group.gitbook.io/english-1/trend/trends",
  "https://anymind-group.gitbook.io/english-1/more-tools/hashtag-and-keyword-analysis",
];

async function fetchPage(url) {
  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': 'AnyTag-Agent/1.0' },
      signal: AbortSignal.timeout(5000)
    });
    const html = await res.text();
    const mainMatch = html.match(/<main[^>]*>([\s\S]*?)<\/main>/i) ||
                      html.match(/<article[^>]*>([\s\S]*?)<\/article>/i);
    const content = mainMatch ? mainMatch[1] : html;
    const text = content
      .replace(/<script[\s\S]*?<\/script>/gi, '')
      .replace(/<style[\s\S]*?<\/style>/gi, '')
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
    const titleMatch = html.match(/<h1[^>]*>([^<]+)<\/h1>/i);
    const title = titleMatch ? titleMatch[1].trim() : url;
    return `## ${title}\n[${url}]\n${text.slice(0, 1500)}`;
  } catch (e) {
    return `[Could not fetch: ${url}]`;
  }
}

function generateSuggestions(reply, question) {
  const all = [
    "How do I invite influencers to a campaign?",
    "What metrics can I track in AnyTag reporting?",
    "How does the Marketplace campaign work?",
    "How do I set up campaign tracking?",
    "What is the difference between Engagement and Marketplace?",
    "How do I download influencer data?",
    "How does TikTok campaign setup work?",
    "What analytics features does AnyTag offer?",
    "How do I add a new account in AnyTag?",
    "How does influencer discovery filtering work?",
    "How do I track posts automatically?",
    "What is the Chrome Extension for?",
  ];
  const q = question.toLowerCase().split(' ')[0];
  return all.filter(s => !s.toLowerCase().includes(q)).slice(0, 3);
}

function extractSources(text) {
  const matches = text.match(/\(Source:[^)]+\)/g) || [];
  return matches.map(m => m.replace('(Source:', '').replace(')', '').trim());
}

export default async function handler(req) {
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  const { message, history } = await req.json();

  const apiKey = process.env.ANTHROPIC_API_KEY;

  if (!apiKey) {
    return new Response(JSON.stringify({ error: 'API key not configured on server' }), { status: 500 });
  }

  const docs = await Promise.all(GITBOOK_URLS.slice(0, 8).map(fetchPage));
  const knowledge = docs.join('\n\n---\n\n');

  const system = `You are the AnyTag Knowledge Agent — an internal AI assistant for AnyMind Group's Customer Success team.

AnyTag is AnyMind Group's influencer marketing platform for discovering, activating, managing, tracking and attributing influencer marketing campaigns.

RULES:
1. Answer based on the AnyTag documentation below.
2. Always cite the source at the end: (Source: [page name])
3. If not in docs, say: "I don't have this information yet. Please check with the Product team or #cs-product-questions."
4. Reply in the same language as the question — Vietnamese or English.
5. For workflow questions, use numbered steps. Be concise.

--- LIVE ANYTAG DOCUMENTATION ---
${knowledge}`;

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01'
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-5',
      max_tokens: 1024,
      system,
      messages: [...history, { role: 'user', content: message }]
    })
  });

  const data = await response.json();

  if (data.error) {
    return new Response(JSON.stringify({ error: data.error.message }), { status: 400 });
  }

  const reply = data.content[0].text;

  return new Response(JSON.stringify({
    reply,
    suggestions: generateSuggestions(reply, message),
    sources: extractSources(reply)
  }), {
    headers: { 'Content-Type': 'application/json' }
  });
}
```

Commit xong → vào **Vercel dashboard** → **Settings** → **Environment Variables** → thêm:
```
ANTHROPIC_API_KEY = sk-ant-api03-...
