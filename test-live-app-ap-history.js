async function test() {
  const payload = {
    history: [
      { role: "user", parts: [{ text: "I got 4000 rank in tg eamcet" }] },
      { role: "model", parts: [{ text: "To better assist you, could you please tell me your category (e.g., OC, BC-A, SC-I, etc.)?" }] },
      { role: "user", parts: [{ text: "My category is OC." }] },
      { role: "model", parts: [{ text: "To provide you with accurate college options, are you looking for admissions for Boys or Girls?" }] },
      { role: "user", parts: [{ text: "I am applying under Boys." }] },
      { role: "model", parts: [{ text: "Here are the 7 colleges closest to your rank of 4,000 (OC Boys)..." }] }
    ],
    message: "I got 4000 rank in ap eamcet",
    profile: {
      exam: "TGEAPCET",
      rank: 4000,
      category: "OC",
      gender: "boys"
    }
  };

  const response = await fetch('http://localhost:3000/api/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let result = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    result += decoder.decode(value, { stream: true });
  }

  console.log("FINAL SERVER RESPONSE:");
  console.log(result);
}

test();
