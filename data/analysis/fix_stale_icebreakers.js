const fs = require('fs');
const path = require('path');

// Load API key
const envPath = path.join(__dirname, '..', '..', '.env');
const envContent = fs.readFileSync(envPath, 'utf8');
for (const line of envContent.split('\n')) {
  const [key, ...rest] = line.split('=');
  if (key && rest.length) process.env[key.trim()] = rest.join('=').trim();
}

const Anthropic = require('@anthropic-ai/sdk').default;
const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const staleEvents = JSON.parse(
  fs.readFileSync(path.join(__dirname, 'stale_icebreaker_events.json'), 'utf8')
);
const merged = JSON.parse(
  fs.readFileSync(path.join(__dirname, '..', 'enriched', 'events_official_merged.json'), 'utf8')
);

console.log(`Fixing ${staleEvents.length} stale icebreakers...\n`);

async function main() {
  // Get the full event data for each stale event
  const toFix = staleEvents.map(s => merged.find(e => e.event_id === s.event_id)).filter(Boolean);

  const compact = toFix.map(e => ({
    event_id: e.event_id,
    title: e.title,
    description: (e.description || '').slice(0, 200),
    speakers: e.speakers,
  }));

  const msg = await anthropic.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 4096,
    system: `You generate icebreakers and networking tips for AI conference events.

For each event, generate:
- icebreaker: One specific conversation starter. MUST reference a speaker by name if available. Max 120 chars.
- networking_tip: One tactical networking tip. Max 100 chars.

Output ONLY a JSON array: [{"event_id": "...", "icebreaker": "...", "networking_tip": "..."}]`,
    messages: [{ role: 'user', content: `Fix icebreakers for these ${compact.length} events (speakers have changed):\n${JSON.stringify(compact)}` }],
  });

  const text = msg.content[0].type === 'text' ? msg.content[0].text : '';
  const jsonMatch = text.match(/\[[\s\S]*\]/);
  if (!jsonMatch) { console.error('No JSON in response'); process.exit(1); }
  const results = JSON.parse(jsonMatch[0]);

  // Apply fixes
  let fixed = 0;
  for (const result of results) {
    const event = merged.find(e => e.event_id === result.event_id);
    if (event) {
      console.log(`Fixed: [${event.id}] ${event.title.substring(0, 60)}`);
      console.log(`  Old: ${event.icebreaker}`);
      console.log(`  New: ${result.icebreaker}\n`);
      event.icebreaker = result.icebreaker;
      event.networking_tip = result.networking_tip;
      fixed++;
    }
  }

  fs.writeFileSync(
    path.join(__dirname, '..', 'enriched', 'events_official_merged.json'),
    JSON.stringify(merged, null, 2)
  );
  console.log(`Fixed ${fixed}/${staleEvents.length} icebreakers`);
}

main().catch(err => { console.error('Error:', err); process.exit(1); });
