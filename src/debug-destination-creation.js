// Debug script to test destination creation
// This can be run in browser console to test destination creation

console.log('🧪 Testing destination creation...');

// Test data for destination creation
const testDestinationData = {
  name: 'Test Restaurant',
  location: 'Berlin, Germany',
  category: 'restaurant',
  startDate: '2025-01-15',
  endDate: '2025-01-15',
  budget: 50,
  notes: 'Great reviews online'
};

// Function to test destination creation
async function testDestinationCreation() {
  try {
    // Access the React app context
    const reactRoot = document.getElementById('root');
    if (!reactRoot) {
      console.error('❌ React root not found');
      return;
    }

    // Get the React app instance (this is a simplified approach)
    console.log('🔍 React app found, attempting to access context...');
    
    // We'll need to access this through the browser's React DevTools
    // or through a globally exposed function
    console.log('📝 Test destination data:', testDestinationData);
    console.log('📋 Instructions:');
    console.log('1. Open React DevTools');
    console.log('2. Select the SupabaseAppProvider component');
    console.log('3. Access the createDestination function from props');
    console.log('4. Call createDestination with the test data above');
    
    return testDestinationData;
  } catch (error) {
    console.error('❌ Error in test:', error);
  }
}

// Run the test
testDestinationCreation();