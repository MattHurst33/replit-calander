# My Calendar App

A modern, full-stack calendar management system built with React, TypeScript, and Express.js.

## 🚀 Features

- **Modern Tech Stack**: Built with React 18, TypeScript, and Vite for fast development
- **Beautiful UI**: Styled with Tailwind CSS and Shadcn/UI components
- **Calendar Integration**: Supports Google Calendar and Outlook integration
- **Meeting Management**: Intelligent meeting qualification and organization
- **Real-time Updates**: Live synchronization across devices
- **Email Integration**: Automated notifications and customizable templates
- **Analytics Dashboard**: Comprehensive insights and reporting
- **Responsive Design**: Works perfectly on desktop and mobile

## 🛠️ Tech Stack

### Frontend
- **React 18** with TypeScript
- **Vite** for fast development and building
- **Tailwind CSS** for styling
- **Shadcn/UI** for beautiful components
- **TanStack Query** for server state management
- **Wouter** for client-side routing

### Backend
- **Node.js** with Express.js
- **TypeScript** with ES modules
- **PostgreSQL** with Drizzle ORM
- **Authentication** with session management
- **Email Services** integration

## 📋 Prerequisites

Before you begin, ensure you have the following installed:
- [Node.js](https://nodejs.org/) (version 18 or higher)
- [npm](https://www.npmjs.com/) or [yarn](https://yarnpkg.com/)
- [PostgreSQL](https://www.postgresql.org/) (for database)

## 🚀 Getting Started

1. **Clone the repository**
   ```bash
   git clone https://github.com/MattHurst33/replit-calander.git
   cd replit-calander
   ```

2. **Install dependencies**
   
   **Option A: Using the setup script (Windows)**
   ```cmd
   # For Command Prompt
   setup.bat
   
   # For PowerShell
   .\setup.ps1
   ```
   
   **Option B: Manual installation**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   Create a `.env` file in the root directory and add:
   ```env
   DATABASE_URL=your_postgresql_connection_string
   SESSION_SECRET=your_session_secret
   GOOGLE_CLIENT_ID=your_google_client_id
   GOOGLE_CLIENT_SECRET=your_google_client_secret
   ```

4. **Set up the database**
   ```bash
   npm run db:push
   ```

5. **Start the development server**
   ```bash
   npm run dev
   ```

6. **Open your browser**
   Navigate to `http://localhost:5000` to see your app!

## 📝 Available Scripts

- `npm run dev` - Start the development server
- `npm run build` - Build the app for production
- `npm start` - Start the production server
- `npm run check` - Run TypeScript type checking
- `npm run db:push` - Push database schema changes

## 🏗️ Project Structure

```
├── client/                 # Frontend React application
│   ├── src/
│   │   ├── components/     # Reusable UI components
│   │   ├── pages/          # Page components
│   │   ├── hooks/          # Custom React hooks
│   │   ├── lib/            # Utility functions
│   │   └── ...
├── server/                 # Backend Express application
│   ├── services/           # Business logic services
│   └── ...
├── shared/                 # Shared types and schemas
└── ...
```

## 🔧 Customization

### Changing the App Name
1. Update `package.json` name field
2. Update the title in `client/index.html`
3. Update the landing page in `client/src/pages/landing.tsx`

### Adding New Features
1. Create new components in `client/src/components/`
2. Add new pages in `client/src/pages/`
3. Update routing in `client/src/App.tsx`
4. Add backend routes in `server/routes.ts`

### Styling
- All styles use Tailwind CSS classes
- Custom components are in `client/src/components/ui/`
- Global styles are in `client/src/index.css`

## 🌐 Deployment

### Development
The app runs on `http://localhost:5000` by default.

### Production
1. Build the application:
   ```bash
   npm run build
   ```

2. Start the production server:
   ```bash
   npm start
   ```

## 🤝 Contributing

1. Fork the repository
2. Create a new branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## � Troubleshooting

### Node.js/npm not recognized in Windows
If you get "npm is not recognized" or "node is not recognized" errors:

1. **Restart your terminal/PowerShell** after installing Node.js
2. **Check if Node.js is installed properly**:
   - Open a new PowerShell/Command Prompt
   - Try: `where node` and `where npm`
3. **Manually add to PATH** (if needed):
   - Find your Node.js installation (usually `C:\Program Files\nodejs\`)
   - Add it to your system PATH environment variable
   - Restart your terminal

### TypeScript Errors
If you see TypeScript/JSX errors:
1. Make sure dependencies are installed: `npm install`
2. Check that `@types/react` and `@types/react-dom` are installed
3. Restart your VS Code/editor after installing dependencies

### Database Connection Issues
1. Make sure PostgreSQL is running
2. Check your `.env` file has the correct `DATABASE_URL`
3. Try running `npm run db:push` to set up the schema

## 📄� License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙋‍♂️ Support

If you have any questions or need help getting started, please open an issue or reach out!
