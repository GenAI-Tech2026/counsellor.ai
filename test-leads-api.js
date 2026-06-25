async function test() {
  const response = await fetch('http://localhost:3000/api/leads', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: 'Test', phone: '1234567890', state: 'TS' })
  });
  console.log("Status:", response.status);
  const data = await response.json();
  console.log("Data:", data);
}
test();
