// Database Schema Checker
// Run this in browser console to check if migration was successful

const checkDatabaseSchema = async () => {
  console.log('🔍 Checking Supabase database schema...');
  
  try {
    // Try to select trips with new columns
    const response = await fetch('https://kyzbtkkprvegzgzrlhez.supabase.co/rest/v1/trips?select=id,name,privacy,owner_id,tagged_users,tags&limit=1', {
      headers: {
        'apikey': 'your-anon-key-here', // Replace with actual anon key
        'Authorization': 'Bearer your-anon-key-here', // Replace with actual anon key
        'Content-Type': 'application/json'
      }
    });
    
    if (response.ok) {
      const data = await response.json();
      console.log('✅ Database schema is correct! New columns are available.');
      console.log('Sample data:', data[0] || 'No trips found');
      return true;
    } else {
      const error = await response.json();
      console.error('❌ Database schema issue:', error);
      return false;
    }
  } catch (error) {
    console.error('❌ Error checking schema:', error);
    return false;
  }
};

// Also check what columns are missing
const debugMissingColumns = async () => {
  console.log('🔍 Testing individual columns...');
  
  const columns = ['privacy', 'owner_id', 'tagged_users', 'tags'];
  
  for (const column of columns) {
    try {
      const response = await fetch(`https://kyzbtkkprvegzgzrlhez.supabase.co/rest/v1/trips?select=${column}&limit=1`, {
        headers: {
          'apikey': 'your-anon-key-here', // Replace with actual anon key
          'Authorization': 'Bearer your-anon-key-here', // Replace with actual anon key
          'Content-Type': 'application/json'
        }
      });
      
      if (response.ok) {
        console.log(`✅ Column '${column}' exists`);
      } else {
        const error = await response.json();
        console.error(`❌ Column '${column}' missing:`, error.message);
      }
    } catch (error) {
      console.error(`❌ Error checking column '${column}':`, error);
    }
  }
};

// Instructions
console.log(`
🚀 Database Schema Checker

To use this:
1. Replace 'your-anon-key-here' with your actual Supabase anon key
2. Run: checkDatabaseSchema()
3. Or run: debugMissingColumns()

Your Supabase URL: https://kyzbtkkprvegzgzrlhez.supabase.co
`);

// Export functions to global scope
window.checkDatabaseSchema = checkDatabaseSchema;
window.debugMissingColumns = debugMissingColumns;