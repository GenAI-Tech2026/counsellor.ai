async function test() {
  const payload = {
    history: [],
    message: "I got 4000 rank in ap eamcet DEBUG_ME",
    profile: {
      exam: "APEAMCET",
      rank: 4000,
      category: "OC",
      gender: "boys",
      branch_preference: "cse"
    }
  };

  const response = await fetch('http://localhost:3000/api/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });

  const result = await response.text();
  console.log("FINAL SERVER RESPONSE:");
  console.log(result);
}

test();
