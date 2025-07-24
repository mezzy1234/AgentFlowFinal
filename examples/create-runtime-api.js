// Example: Create Runtime via API
// You can use this in your agent code

const createRuntime = async () => {
  try {
    const response = await fetch('/api/runtime', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        runtimeName: 'my-agent-runtime',
        memoryMb: 512  // Optional: default is 256MB
      })
    });

    const result = await response.json();
    console.log('✅ Runtime created:', result);
    return result.runtime;
  } catch (error) {
    console.error('❌ Error creating runtime:', error);
  }
};

// Call it
createRuntime();
