// test.js
const { spawn } = require('child_process');

async function runTests() {
  const testFiles = [
    'TestFolder/shopper_test.js',
  ];

  console.log('🚀 Running all tests...\n');

  for (const testFile of testFiles) {
    console.log(`📋 Running: ${testFile}`);
    console.log('='.repeat(50));

    await new Promise((resolve, reject) => {
      const mocha = spawn('npx', ['mocha', testFile], {
        stdio: 'inherit',
        shell: true
      });

      mocha.on('close', (code) => {
        if (code === 0) {
          console.log(`✅ ${testFile} passed\n`);
          resolve();
        } else {
          console.log(`❌ ${testFile} failed with code ${code}\n`);
          reject(new Error(`Test failed: ${testFile}`));
        }
      });
    });
  }

  console.log('🎉 All tests completed!');
}

runTests().catch(console.error);
