// Test if the Android emulator can reach the server
// This simulates what the emulator would see

const http = require('http');

console.log('🔍 Testing Android Emulator Connection...');
console.log('Emulator uses 10.0.2.2 to reach host machine\n');

const testUrls = [
  { name: 'Health Check', url: 'http://10.0.2.2:3001/api/health' },
  { name: 'Root Endpoint', url: 'http://10.0.2.2:3001/' },
];

let allPassed = true;

async function testUrl(name, url) {
  return new Promise((resolve) => {
    console.log(`Testing: ${name}`);
    console.log(`URL: ${url}`);
    
    const req = http.get(url, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        if (res.statusCode === 200 || res.statusCode === 404) {
          console.log(`✅ SUCCESS - Status: ${res.statusCode}`);
          console.log(`Response: ${data.substring(0, 100)}...\n`);
          resolve(true);
        } else {
          console.log(`⚠️  Status: ${res.statusCode}\n`);
          resolve(false);
        }
      });
    });

    req.on('error', (error) => {
      if (error.code === 'ECONNREFUSED') {
        console.log('❌ CONNECTION REFUSED');
        console.log('   This means the server is not accessible from 10.0.2.2');
        console.log('   Likely causes:');
        console.log('   1. Windows Firewall is blocking');
        console.log('   2. Server is not listening on 0.0.0.0');
        console.log('   3. Port 3001 is blocked\n');
      } else if (error.code === 'ETIMEDOUT') {
        console.log('❌ CONNECTION TIMEOUT');
        console.log('   The connection timed out\n');
      } else {
        console.log(`❌ ERROR: ${error.message}`);
        console.log(`   Code: ${error.code}\n`);
      }
      allPassed = false;
      resolve(false);
    });

    req.setTimeout(5000, () => {
      console.log('❌ CONNECTION TIMEOUT (5 seconds)\n');
      req.destroy();
      allPassed = false;
      resolve(false);
    });
  });
}

(async () => {
  for (const test of testUrls) {
    await testUrl(test.name, test.url);
  }
  
  console.log('\n' + '='.repeat(50));
  if (allPassed) {
    console.log('✅ All tests passed! Emulator should be able to connect.');
  } else {
    console.log('❌ Tests failed. Emulator cannot connect.');
    console.log('\n🔧 Solutions:');
    console.log('1. Run fix-firewall.ps1 as Administrator');
    console.log('2. Or manually configure Windows Firewall (see QUICK_FIX.md)');
    console.log('3. Make sure server is listening on 0.0.0.0:3001');
  }
  console.log('='.repeat(50));
})();














