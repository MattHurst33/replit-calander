// Simple development server for My Calendar App
import 'dotenv/config';
import express from "express";
import path from "path";
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3000;

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

const mockUser = {
  id: 'demo-user-123',
  name: 'Demo User',
  email: 'demo@mycalendarapp.com',
  firstName: 'Demo',
  lastName: 'User',
  profileImageUrl: null
};

app.get('/api/user', (req, res) => {
  res.json({ user: mockUser, isAuthenticated: true });
});

// Required by useAuth hook — must return a user object for the dashboard to load
app.get('/api/auth/user', (req, res) => {
  res.json(mockUser);
});

app.get('/api/dashboard/stats', (req, res) => {
  res.json({ total: 0, qualified: 0, disqualified: 0, needsReview: 0, integrations: { googleCalendar: false, calendly: false } });
});

app.get('/api/meetings', (req, res) => {
  res.json([]);
});

app.get('/api/qualification-rules', (req, res) => {
  res.json([]);
});

app.get('/api/calendar-integrations', (req, res) => {
  res.json({
    google: { connected: false, lastConnected: null },
    outlook: { connected: false, lastConnected: null },
    scanStats: { lastScan: null, connectedCalendars: [], totalMeetingsImported: 0 }
  });
});

// Google Calendar OAuth initiation
app.get('/api/auth/google/calendar', (_req, res) => {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  if (!clientId || clientId === 'your_google_client_id_here' || !clientSecret || clientSecret === 'your_google_client_secret_here') {
    return res.status(503).json({
      message: "Google Calendar is not configured yet. Add GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET to your .env file and restart the server."
    });
  }
  res.status(501).json({ message: "Run 'npm run dev' (not dev:simple) to use real OAuth." });
});

// Outlook Calendar OAuth initiation
app.get('/api/auth/outlook/calendar', (_req, res) => {
  const clientId = process.env.MICROSOFT_CLIENT_ID;
  const clientSecret = process.env.MICROSOFT_CLIENT_SECRET;
  if (!clientId || clientId === 'your_microsoft_client_id_here' || !clientSecret || clientSecret === 'your_microsoft_client_secret_here') {
    return res.status(503).json({
      message: "Outlook Calendar is not configured yet. Add MICROSOFT_CLIENT_ID and MICROSOFT_CLIENT_SECRET to your .env file and restart the server."
    });
  }
  res.status(501).json({ message: "Run 'npm run dev' (not dev:simple) to use real OAuth." });
});

app.post('/api/scan-calendars', (_req, res) => {
  res.json({ success: false, message: "Calendar scanning requires the full server. Run 'npm run dev' instead of 'npm run dev:simple'." });
});

app.delete('/api/calendar-integrations/:type', (_req, res) => {
  res.json({ success: true, message: "Integration disconnected (stub)." });
});

app.post('/api/sync/calendar', (_req, res) => {
  res.json({ success: false, synced: 0, message: "Calendar sync requires the full server. Run 'npm run dev'." });
});

// Catch-all handler: send back React's index.html file for SPA routing
app.get('*', (req, res) => {
  const indexPath = path.join(publicPath, 'index.html');
  console.log('📄 Serving index.html from:', indexPath);
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
