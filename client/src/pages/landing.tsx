import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle, Calendar, BarChart3, Mail, Send, Filter, Zap, Clock, Users } from "lucide-react";

export default function Landing() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="container mx-auto px-4 py-16">
        {/* Header */}
        <div className="text-center mb-16">
          <h1 className="text-5xl font-bold text-gray-900 mb-6">
            My Calendar App
          </h1>
          <p className="text-xl text-gray-600 mb-8 max-w-3xl mx-auto">
            A powerful calendar management system built with React, TypeScript, and modern web technologies. 
            Streamline your scheduling and boost productivity.
          </p>
          <Button 
            size="lg" 
            className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-4 text-lg"
            onClick={() => window.location.href = '/dashboard'}
          >
            Get Started
          </Button>
        </div>

        {/* Features Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 mb-16">
          <Card className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <Calendar className="h-8 w-8 text-blue-600 mb-2" />
              <CardTitle>Smart Calendar Management</CardTitle>
              <CardDescription>
                Intelligent calendar integration with Google Calendar and Outlook. Manage multiple calendars in one place.
              </CardDescription>
            </CardHeader>
          </Card>

          <Card className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <Filter className="h-8 w-8 text-blue-600 mb-2" />
              <CardTitle>Meeting Qualification</CardTitle>
              <CardDescription>
                Set custom rules to automatically organize and prioritize your meetings based on your criteria.
              </CardDescription>
            </CardHeader>
          </Card>

          <Card className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <BarChart3 className="h-8 w-8 text-blue-600 mb-2" />
              <CardTitle>Analytics & Reports</CardTitle>
              <CardDescription>
                Comprehensive analytics dashboard with insights into your calendar usage and meeting patterns.
              </CardDescription>
            </CardHeader>
          </Card>

          <Card className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <Mail className="h-8 w-8 text-blue-600 mb-2" />
              <CardTitle>Email Integration</CardTitle>
              <CardDescription>
                Seamless email integration with automated notifications and customizable templates.
              </CardDescription>
            </CardHeader>
          </Card>

          <Card className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <Zap className="h-8 w-8 text-blue-600 mb-2" />
              <CardTitle>Real-time Updates</CardTitle>
              <CardDescription>
                Live synchronization across all your devices with instant updates and notifications.
              </CardDescription>
            </CardHeader>
          </Card>

          <Card className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <Clock className="h-8 w-8 text-blue-600 mb-2" />
              <CardTitle>Time Management</CardTitle>
              <CardDescription>
                Advanced scheduling features and time-saving automation to optimize your productivity.
              </CardDescription>
            </CardHeader>
          </Card>
        </div>

        {/* Benefits Section */}
        <div className="text-center">
          <h2 className="text-3xl font-bold text-gray-900 mb-8">
            Built with Modern Technologies
          </h2>
          <div className="grid md:grid-cols-3 gap-8 max-w-4xl mx-auto">
            <div className="flex flex-col items-center">
              <div className="bg-blue-100 rounded-full p-4 mb-4">
                <CheckCircle className="h-8 w-8 text-blue-600" />
              </div>
              <h3 className="font-semibold text-lg mb-2">React & TypeScript</h3>
              <p className="text-gray-600">Built with modern React 18 and TypeScript for type safety</p>
            </div>
            <div className="flex flex-col items-center">
              <div className="bg-green-100 rounded-full p-4 mb-4">
                <CheckCircle className="h-8 w-8 text-green-600" />
              </div>
              <h3 className="font-semibold text-lg mb-2">Tailwind CSS</h3>
              <p className="text-gray-600">Beautiful, responsive design with Tailwind CSS and Shadcn/UI</p>
            </div>
            <div className="flex flex-col items-center">
              <div className="bg-purple-100 rounded-full p-4 mb-4">
                <CheckCircle className="h-8 w-8 text-purple-600" />
              </div>
              <h3 className="font-semibold text-lg mb-2">Full-Stack Ready</h3>
              <p className="text-gray-600">Complete with Express.js backend and PostgreSQL database</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}