/**
 * End-to-end tests using Puppeteer (headless Chrome).
 *
 * Prerequisites:
 *   1. npm run dev  →  Next.js running on http://localhost:3000
 *   2. (Optional) ChromaDB running + data ingested for full flow tests
 *
 * Usage:
 *   npm run test:e2e
 */

import puppeteer from 'puppeteer';

const BASE = 'http://localhost:3000';
const TIMEOUT = 30_000;

// ── Helpers ──────────────────────────────────────────────────────────────────

let passed = 0, failed = 0;
const results = [];

async function test(name, fn) {
  try {
    await fn();
    console.log(`  ✓  ${name}`);
    passed++;
    results.push({ name, ok: true });
  } catch (err) {
    console.error(`  ✗  ${name}`);
    console.error(`     ${err.message}`);
    failed++;
    results.push({ name, ok: false, error: err.message });
  }
}

function assert(condition, msg) {
  if (!condition) throw new Error(msg || 'Assertion failed');
}

async function waitForText(page, selector, substring, timeout = TIMEOUT) {
  await page.waitForFunction(
    (sel, sub) => {
      const el = document.querySelector(sel);
      return el && el.textContent.includes(sub);
    },
    { timeout },
    selector,
    substring
  );
}

async function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

// ── Tests ─────────────────────────────────────────────────────────────────────

async function runTests(browser) {
  const page = await browser.newPage();
  page.setDefaultTimeout(TIMEOUT);

  // Capture console errors from the page
  const pageErrors = [];
  page.on('console', msg => {
    if (msg.type() === 'error') pageErrors.push(msg.text());
  });
  page.on('pageerror', err => pageErrors.push(err.message));

  // ── Suite 1: Home Page ──────────────────────────────────────────────────

  console.log('\n📄 Home page');

  await test('loads without error', async () => {
    const res = await page.goto(BASE, { waitUntil: 'networkidle2' });
    assert(res.status() < 400, `HTTP ${res.status()}`);
  });

  await test('has correct page title', async () => {
    const title = await page.title();
    assert(title.toLowerCase().includes('counsell') || title.toLowerCase().includes('mantrana'),
      `Unexpected title: "${title}"`);
  });

  await test('CTA button is visible', async () => {
    const btn = await page.$('a[href="/chat"], button');
    assert(btn, 'No CTA button found');
    const visible = await btn.isVisible();
    assert(visible, 'CTA button is not visible');
  });

  await test('no critical JS errors on home page', async () => {
    const criticalErrors = pageErrors.filter(e =>
      !e.includes('favicon') && !e.includes('net::ERR')
    );
    assert(criticalErrors.length === 0,
      `JS errors: ${criticalErrors.join(', ')}`);
  });

  // ── Suite 2: Navigation to Chat ─────────────────────────────────────────

  console.log('\n🔀 Navigation');

  await test('CTA navigates to /chat', async () => {
    const chatLink = await page.$('a[href="/chat"]');
    assert(chatLink, 'No link to /chat found');
    await Promise.all([
      page.waitForNavigation({ waitUntil: 'networkidle2' }),
      chatLink.click(),
    ]);
    assert(page.url().endsWith('/chat'), `Unexpected URL: ${page.url()}`);
  });

  // ── Suite 3: Chat Page UI ────────────────────────────────────────────────

  console.log('\n💬 Chat page UI');

  await test('chat page loads', async () => {
    const url = page.url();
    assert(url.includes('/chat'), `Not on /chat: ${url}`);
  });

  await test('shows initial greeting', async () => {
    await page.waitForSelector('[class*="bubble"]', { timeout: 5000 });
    const bubbles = await page.$$('[class*="bubble"]');
    assert(bubbles.length > 0, 'No message bubbles found');
    const firstText = await bubbles[0].evaluate(el => el.textContent);
    assert(
      firstText.toLowerCase().includes('counsell') ||
      firstText.toLowerCase().includes('hello') ||
      firstText.toLowerCase().includes('mantrana'),
      `Unexpected greeting: "${firstText.slice(0, 100)}"`
    );
  });

  await test('input field is focusable', async () => {
    const input = await page.$('input[type="text"]');
    assert(input, 'No text input found');
    await input.focus();
    const focused = await page.evaluate(() =>
      document.activeElement.tagName === 'INPUT'
    );
    assert(focused, 'Input did not receive focus');
  });

  await test('send button is disabled when input is empty', async () => {
    const btn = await page.$('button[type="submit"]');
    assert(btn, 'No submit button found');
    const disabled = await btn.evaluate(el => el.disabled);
    assert(disabled, 'Send button should be disabled on empty input');
  });

  await test('send button enables when text is typed', async () => {
    const input = await page.$('input[type="text"]');
    await input.type('hello');
    const btn = await page.$('button[type="submit"]');
    const disabled = await btn.evaluate(el => el.disabled);
    assert(!disabled, 'Send button should be enabled when text is present');
    // Clear input
    await input.evaluate(el => { el.value = ''; el.dispatchEvent(new Event('input', { bubbles: true })); });
  });

  await test('back button returns to home', async () => {
    const backBtn = await page.$('a[href="/"]');
    assert(backBtn, 'No back button found');
  });

  await test('header shows "Live" badge', async () => {
    const badge = await page.$('[class*="headerBadge"]');
    assert(badge, 'No live badge found');
    const text = await badge.evaluate(el => el.textContent);
    assert(text.includes('Live'), `Badge text: "${text}"`);
  });

  // ── Suite 4: Chat Functionality ─────────────────────────────────────────

  console.log('\n🤖 Chat functionality');

  await test('typing and submitting sends a message', async () => {
    const input = await page.$('input[type="text"]');
    await input.type('Hello');
    await page.keyboard.press('Enter');

    // User bubble should appear
    await page.waitForFunction(
      () => [...document.querySelectorAll('[class*="bubbleUser"]')].some(el =>
        el.textContent.includes('Hello')
      ),
      { timeout: 5000 }
    );
  });

  await test('bot responds (streaming or loading indicator shows)', async () => {
    // Either a thinking bubble or a bot response should appear
    await page.waitForFunction(
      () => {
        const thinking = document.querySelector('[class*="thinkingBubble"]');
        const botBubbles = document.querySelectorAll('[class*="bubbleBot"]');
        return thinking || botBubbles.length >= 2;
      },
      { timeout: 8000 }
    );
  });

  await test('bot response appears after streaming', async () => {
    // Wait for ≥2 bot bubbles where the LAST one has real content and is not still streaming
    await page.waitForFunction(
      () => {
        const botBubbles = [...document.querySelectorAll('[class*="bubbleBot"]')];
        if (botBubbles.length < 2) return false;
        const last = botBubbles[botBubbles.length - 1];
        const hasThinking = !!last.querySelector('[class*="thinkingBubble"], [class*="spinner"]');
        const hasCursor  = !!last.querySelector('[class*="cursor"]');
        return !hasThinking && !hasCursor && last.textContent.trim().length > 10;
      },
      { timeout: TIMEOUT }
    );
    const botBubbles = await page.$$('[class*="bubbleBot"]');
    const lastText = await botBubbles[botBubbles.length - 1].evaluate(el => el.textContent);
    assert(lastText.trim().length > 10, `Bot response too short: "${lastText.slice(0, 80)}"`);
  });

  // ── Suite 5: Conversation flow ───────────────────────────────────────────

  console.log('\n🔄 Conversation flow (rank → category → gender)');

  // Reload for a fresh session
  await page.goto(`${BASE}/chat`, { waitUntil: 'networkidle2' });
  await page.waitForSelector('[class*="bubble"]');

  await test('rank mention triggers a clarifying question', async () => {
    const countBefore = await page.$$eval('[class*="bubbleBot"]', els => els.length);
    const input = await page.$('input[type="text"]');
    await input.type('I got rank 5000 in TGEAPCET');
    await page.keyboard.press('Enter');

    // Wait for a NEW, fully-streamed bot bubble that asks for more info
    await page.waitForFunction(
      (before) => {
        const botBubbles = [...document.querySelectorAll('[class*="bubbleBot"]')];
        if (botBubbles.length <= before) return false;
        const last = botBubbles[botBubbles.length - 1];
        if (last.querySelector('[class*="thinkingBubble"],[class*="cursor"]')) return false;
        const t = last.textContent.toLowerCase();
        // Bot should ask for category, gender, or any clarifying detail
        return t.includes('categor') || t.includes('gender') || t.includes('exam') ||
               t.includes('oc') || t.includes('bc') || t.includes('boys') || t.includes('girls') ||
               t.includes('reserv') || t.includes('which') || t.includes('what');
      },
      { timeout: 60_000 },
      countBefore
    );
  });

  await test('providing category triggers gender question', async () => {
    const countBefore = await page.$$eval('[class*="bubbleBot"]', els => els.length);
    const input = await page.$('input[type="text"]');
    await input.type('OC category');
    await page.keyboard.press('Enter');

    // Wait for a NEW bot bubble with any substantive response (gender question, branch question, or anything)
    await page.waitForFunction(
      (before) => {
        const botBubbles = [...document.querySelectorAll('[class*="bubbleBot"]')];
        if (botBubbles.length <= before) return false;
        const last = botBubbles[botBubbles.length - 1];
        if (last.querySelector('[class*="thinkingBubble"],[class*="cursor"]')) return false;
        // Any meaningful response (>20 chars) after getting category info
        return last.textContent.trim().length > 20;
      },
      { timeout: 90_000 },
      countBefore
    );
    // Verify the response is contextually related to the conversation
    const botBubbles = await page.$$('[class*="bubbleBot"]');
    const lastText = await botBubbles[botBubbles.length - 1].evaluate(el => el.textContent.toLowerCase());
    const relevant = lastText.includes('gender') || lastText.includes('boys') || lastText.includes('girls') ||
                     lastText.includes('male') || lastText.includes('female') || lastText.includes('branch') ||
                     lastText.includes('prefer') || lastText.includes('noted') || lastText.includes('oc') ||
                     lastText.includes('rank') || lastText.includes('great') || lastText.includes('next');
    assert(relevant, `Unexpected bot response: "${lastText.slice(0, 120)}"`);
  });

  await test('providing gender triggers college search or data response', async () => {
    const countBefore = await page.$$eval('[class*="bubbleBot"]', els => els.length);
    const input = await page.$('input[type="text"]');
    await input.type('Boys');
    await page.keyboard.press('Enter');

    // Wait for a NEW bot bubble with substantive content
    await page.waitForFunction(
      (before) => {
        const botBubbles = [...document.querySelectorAll('[class*="bubbleBot"]')];
        if (botBubbles.length <= before) return false;
        const last = botBubbles[botBubbles.length - 1];
        const isStreaming = !!last.querySelector('[class*="thinkingBubble"],[class*="cursor"]');
        if (isStreaming) return false;
        const t = last.textContent.toLowerCase();
        return t.length > 30 && (
          t.includes('college') || t.includes('branch') || t.includes('rank') ||
          t.includes('data') || t.includes('available') || t.includes('engineering') ||
          t.includes('found') || t.includes('sorry')
        );
      },
      { timeout: 90_000 },
      countBefore
    );
  });

  // ── Suite 6: Error & Edge Cases ──────────────────────────────────────────

  console.log('\n⚠️  Edge cases');

  await test('very long message does not crash UI', async () => {
    const input = await page.$('input[type="text"]');
    const longMsg = 'a'.repeat(300);
    await input.type(longMsg);
    const value = await input.evaluate(el => el.value);
    assert(value.length > 0, 'Input lost the value');
    // Clear without submitting
    await page.keyboard.down('Control');
    await page.keyboard.press('a');
    await page.keyboard.up('Control');
    await page.keyboard.press('Backspace');
  });

  await test('pressing Enter on empty input does nothing', async () => {
    const prevBubbleCount = await page.$$eval('[class*="bubble"]', els => els.length);
    await page.keyboard.press('Enter');
    await sleep(500);
    const newBubbleCount = await page.$$eval('[class*="bubble"]', els => els.length);
    assert(newBubbleCount === prevBubbleCount, 'Empty submit created a bubble');
  });

  await test('no unhandled JS errors during session', async () => {
    const critical = pageErrors.filter(e =>
      e.includes('TypeError') || e.includes('ReferenceError') || e.includes('SyntaxError')
    );
    assert(critical.length === 0, `Unhandled errors: ${critical.join(' | ')}`);
  });

  await page.close();
}

// ── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log('🚀 Launching headless Chrome…');
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
  });

  try {
    await runTests(browser);
  } finally {
    await browser.close();
  }

  console.log(`\n${'─'.repeat(50)}`);
  console.log(`Results: ${passed} passed, ${failed} failed out of ${passed + failed} tests`);

  if (failed > 0) {
    console.log('\nFailed tests:');
    results.filter(r => !r.ok).forEach(r => console.log(`  ✗ ${r.name}: ${r.error}`));
    process.exit(1);
  } else {
    console.log('\n✅ All tests passed!');
  }
}

main().catch(err => {
  console.error('Test runner error:', err);
  process.exit(1);
});
