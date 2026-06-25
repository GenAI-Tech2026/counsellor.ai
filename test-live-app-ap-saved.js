async function test() {
  const payload = {
    history: [],
    message: "I got 4000 rank in ap eamcet",
    profile: {
      category: "OC",
      gender: "Boys" // UI saves exactly what was used, which might be "Boys" or "boys"
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
