# DataFlow - AI-Powered Calendar Grooming Agent

## Overview

DataFlow is a sophisticated calendar management and meeting qualification system built as a full-stack web application. The application automatically qualifies and disqualifies meetings based on preset criteria, saving 30-60 minutes of manual grooming time daily. It processes 10-20 meetings per day with color-coded status indicators and provides comprehensive analytics and automation features.

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript and Vite for fast development and building
- **UI Framework**: Shadcn/UI components built on Radix UI primitives with Tailwind CSS
- **State Management**: TanStack Query (React Query) for server state management
- **Routing**: Wouter for lightweight client-side routing
- **Styling**: Tailwind CSS with CSS custom properties for theming

### Backend Architecture
- **Runtime**: Node.js with Express.js server
- **Language**: TypeScript with ES modules
- **Database**: PostgreSQL with Drizzle ORM for type-safe database operations
- **Authentication**: Replit Auth with OIDC integration and session management
- **Session Storage**: PostgreSQL-based sessions using connect-pg-simple

### Database Design
- **ORM**: Drizzle with PostgreSQL dialect
- **Schema Location**: `shared/schema.ts` for type sharing between frontend and backend
- **Migration System**: Drizzle Kit for database migrations
- **Connection**: Neon serverless PostgreSQL with connection pooling

## Key Components

### Authentication System
- Replit OIDC authentication with passport integration
- Session-based authentication using PostgreSQL session store
- Secure cookie configuration with httpOnly and secure flags
- User profile management with settings storage

### Calendar Integration Services
- **Google Calendar Integration**: OAuth2 flow for calendar access and event management
- **Outlook Integration**: Microsoft Graph API integration for Office 365 calendars
- **Calendar Scanner Service**: Automated scanning of calendar events every 15 minutes
- **Calendar Cleanup Service**: Automatic deletion of disqualified meetings from calendars

### Meeting Management
- **Qualification Engine**: Rule-based automatic meeting qualification/disqualification
- **Meeting Storage**: Comprehensive meeting data with form responses and metadata
- **Status Tracking**: Real-time status updates (qualified, disqualified, needs_review)
- **Invite Tracking**: Monitor meeting invite acceptance/decline status

### Email Services
- **Email Queue Service**: Background processing of email jobs
- **Gmail Service**: Gmail API integration for sending emails
- **Email Templates**: Customizable templates for different email types
- **Morning Briefing Service**: Daily summary emails with meeting insights

### Automation Services
- **Auto-Reschedule Service**: Automatic rescheduling of no-show meetings
- **No-Show Reschedule Service**: Intelligent rescheduling with email notifications
- **Grooming Efficiency Service**: Weekly metrics calculation and productivity tracking

## Data Flow

1. **Calendar Event Ingestion**: Calendar scanner services poll Google Calendar and Outlook for new events
2. **Meeting Processing**: Events are converted to meetings and stored with form data
3. **Qualification Engine**: Rules are applied to automatically qualify/disqualify meetings
4. **Status Updates**: Meetings are categorized and calendar events are color-coded
5. **Email Automation**: Qualified meetings trigger confirmation emails and briefings
6. **Analytics Processing**: Weekly metrics are calculated for grooming efficiency
7. **Cleanup Operations**: Disqualified meetings are automatically removed from calendars

## External Dependencies

### Calendar Providers
- Google Calendar API with OAuth2 authentication
- Microsoft Graph API for Outlook calendar integration
- Calendly webhook integration for external meeting bookings

### Email Services
- Gmail API for sending emails through user accounts
- SendGrid for transactional email delivery
- SMTP configuration for fallback email sending

### Database and Infrastructure
- Neon PostgreSQL for serverless database hosting
- WebSocket support for real-time database connections
- Session storage with automatic cleanup

### Authentication
- Replit OIDC provider for user authentication
- Passport.js for authentication middleware
- Memoized OIDC configuration for performance

## Deployment Strategy

### Development Environment
- Vite development server with HMR support
- TSX for TypeScript execution in development
- Cartographer plugin for Replit development tools
- Runtime error overlay for better debugging

### Production Build
- Vite builds the frontend to `dist/public`
- ESBuild bundles the backend server to `dist/index.js`
- Static file serving from the built frontend
- Node.js production server with environment-based configuration

### Environment Configuration
- Database URL configuration for PostgreSQL connection
- OAuth client IDs and secrets for calendar integrations
- Email service API keys and SMTP credentials
- Session secrets and security configuration

## Changelog

- June 27, 2025. Initial setup

## User Preferences

Preferred communication style: Simple, everyday language.