// Use global fetch

async function test() {
  const payload = {
    message: "I got 99 percentile in jee main",
    history: [
      { role: "user", parts: [{ text: "My rank is 5000" }] }
    ],
    priorParams: {
      exam: "TGEAPCET",
      rank: 5000,
      category: "OC",
      gender: null,
      branch_preference: null,
      location_preference: null
    }
  };

  const res = await fetch('http://localhost:3000/api/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let result = '';
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    result += decoder.decode(value);
  }
  console.log("RESPONSE:", result);
  console.log("HEADERS:", res.headers.get('x-chat-params'));
}
test();
