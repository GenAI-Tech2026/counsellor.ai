async function test() {
  const payload = {
    history: [],
    message: "I got 4000 rank in ap eamcet",
    priorParams: {
      exam: "APEAMCET",
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

  console.log("STATUS:", response.status);
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
