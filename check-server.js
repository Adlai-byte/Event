// Quick script to check if the server is running
const http = require('http');

const testUrl = 'http://localhost:3001/api/health';

console.log('🔍 Checking if server is running...');
console.log(`Testing: ${testUrl}`);

const req = http.get(testUrl, (res) => {
  let data = '';
  
  res.on('data', (chunk) => {
    data += chunk;
  });
  
  res.on('end', () => {
    if (res.statusCode === 200) {
      console.log('✅ Server is running!');
      console.log(`Response: ${data}`);
      process.exit(0);
    } else {
      console.log(`❌ Server responded with status ${res.statusCode}`);
      process.exit(1);
    }
  });
});

req.on('error', (error) => {
  if (error.code === 'ECONNREFUSED') {
    console.log('❌ Server is NOT running');
    console.log('   Solution: Run "npm run server" in another terminal');
  } else {
    console.log('❌ Error:', error.message);
  }
  process.exit(1);
});

req.setTimeout(3000, () => {
  console.log('❌ Connection timeout - server might not be running');
  req.destroy();
  process.exit(1);
});




