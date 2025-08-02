const express = require('express');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;  // Changed from 5000 to 3000

console.log('🚀 Starting My Calendar App...');

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Serve static files from the built frontend
const publicPath = path.join(__dirname, '../dist/public');
console.log('📁 Serving static files from:', publicPath);
app.use(express.static(publicPath));

// API routes for development
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    message: 'My Calendar App is running!',
    timestamp: new Date().toISOString()
  });
});

app.get('/api/user', (req, res) => {
  res.json({ 
    user: { 
      name: 'Demo User', 
      email: 'demo@mycalendarapp.com',
      id: 'demo-user-123'
    }, 
    isAuthenticated: true 
  });
});

// Authentication routes
app.get('/api/auth/user', (req, res) => {
  res.json({ 
    name: 'Demo User', 
    email: 'demo@mycalendarapp.com',
    id: 'demo-user-123'
  });
});

// Basic login route
app.get('/api/login', (req, res) => {
  res.redirect('/dashboard');
});

// Catch-all handler: send back React's index.html file for SPA routing
app.get('*', (req, res) => {
  const indexPath = path.join(publicPath, 'index.html');
  console.log('📄 Serving index.html for route:', req.path);
  res.sendFile(indexPath);
});

app.listen(PORT, () => {
  console.log('');
  console.log('🎉 My Calendar App is now running!');
  console.log('');
  console.log(`📱 Open your browser and go to: http://localhost:${PORT}`);
  console.log(`🔧 API Health Check: http://localhost:${PORT}/api/health`);
  console.log('');
  console.log('💡 This is a development server with mock data.');
  console.log('   Your React app should load in the browser!');
  console.log('');
  console.log('🛑 To stop the server, press Ctrl+C');
  console.log('');
});
