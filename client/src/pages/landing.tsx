import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle, Calendar, BarChart3, Mail, Send, Filter } from "lucide-react";

export default function Landing() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      <div className="container mx-auto px-4 py-16">
        {/* Header */}
        <div className="text-center mb-16">
          <h1 className="text-5xl font-bold text-slate-900 mb-6">
            AI-Powered Calendar Grooming Agent
          </h1>
          <p className="text-xl text-slate-600 mb-8 max-w-3xl mx-auto">
            Automatically qualify and disqualify meetings based on preset criteria. 
            Save 30-60 minutes of manual grooming time every day.
          </p>
          <Button 
            size="lg" 
            className="bg-brand-600 hover:bg-brand-700 text-white px-8 py-4 text-lg"
            onClick={() => window.location.href = '/api/login'}
          >
            Get Started
          </Button>
        </div>

        {/* Features Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 mb-16">
          <Card>
            <CardHeader>
              <Filter className="h-8 w-8 text-brand-600 mb-2" />
              <CardTitle>Smart Qualification</CardTitle>
              <CardDescription>
                Set custom rules to automatically qualify or disqualify meetings based on revenue, company size, industry, and more.
              </CardDescription>
            </CardHeader>
          </Card>

          <Card>
            <CardHeader>
              <Calendar className="h-8 w-8 text-brand-600 mb-2" />
              <CardTitle>Calendar Integration</CardTitle>
              <CardDescription>
                Seamlessly connects with Google Calendar and Calendly to process 10-20 meetings daily with color-coded status indicators.
              </CardDescription>
            </CardHeader>
          </Card>

          <Card>
            <CardHeader>
              <BarChart3 className="h-8 w-8 text-brand-600 mb-2" />
              <CardTitle>Analytics & Insights</CardTitle>
              <CardDescription>
                Track no-show patterns, qualification rates, and get comprehensive analytics to optimize your meeting pipeline.
              </CardDescription>
            </CardHeader>
          </Card>

          <Card>
            <CardHeader>
              <Mail className="h-8 w-8 text-brand-600 mb-2" />
              <CardTitle>Morning Briefings</CardTitle>
              <CardDescription>
                Receive daily email summaries with prospect insights, pain points, and meeting context to prepare for your day.
              </CardDescription>
            </CardHeader>
          </Card>

          <Card>
            <CardHeader>
              <Send className="h-8 w-8 text-brand-600 mb-2" />
              <CardTitle>Email Automation</CardTitle>
              <CardDescription>
                Send personalized follow-up emails to qualified prospects using customizable templates with dynamic variables.
              </CardDescription>
            </CardHeader>
          </Card>

          <Card>
            <CardHeader>
              <CheckCircle className="h-8 w-8 text-brand-600 mb-2" />
              <CardTitle>Time Savings</CardTitle>
              <CardDescription>
                Eliminate manual meeting review and save 30-60 minutes daily with automated qualification and calendar management.
              </CardDescription>
            </CardHeader>
          </Card>
        </div>

        {/* Benefits Section */}
        <div className="text-center">
          <h2 className="text-3xl font-bold text-slate-900 mb-8">
            Perfect for B2B Sales Teams
          </h2>
          <div className="grid md:grid-cols-3 gap-8 max-w-4xl mx-auto">
            <div className="flex flex-col items-center">
              <div className="bg-green-100 rounded-full p-4 mb-4">
                <CheckCircle className="h-8 w-8 text-green-600" />
              </div>
              <h3 className="font-semibold text-lg mb-2">Qualified Meetings</h3>
              <p className="text-slate-600">Automatically marked in green with follow-up emails sent</p>
            </div>
            <div className="flex flex-col items-center">
              <div className="bg-red-100 rounded-full p-4 mb-4">
                <CheckCircle className="h-8 w-8 text-red-600" />
              </div>
              <h3 className="font-semibold text-lg mb-2">Disqualified Meetings</h3>
              <p className="text-slate-600">Marked in red with optional calendar slot freeing</p>
            </div>
            <div className="flex flex-col items-center">
              <div className="bg-yellow-100 rounded-full p-4 mb-4">
                <CheckCircle className="h-8 w-8 text-yellow-600" />
              </div>
              <h3 className="font-semibold text-lg mb-2">Manual Review</h3>
              <p className="text-slate-600">Edge cases marked in yellow for human decision</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}