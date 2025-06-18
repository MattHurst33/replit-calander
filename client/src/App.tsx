import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useAuth } from "@/hooks/useAuth";
import NotFound from "@/pages/not-found";
import Landing from "@/pages/landing";
import Dashboard from "@/pages/dashboard";
import CalendarIntegration from "@/pages/calendar-integration";
import QualificationRules from "@/pages/qualification-rules";
import Analytics from "@/pages/analytics";
import EmailReports from "@/pages/email-reports";
import EmailAutomation from "@/pages/email-automation";
import Settings from "@/pages/settings";
import Sidebar from "@/components/sidebar";

function Router() {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-lg">Loading...</div>
      </div>
    );
  }

  return (
    <Switch>
      {!isAuthenticated ? (
        <Route path="/" component={Landing} />
      ) : (
        <>
          <Route path="/" component={() => (
            <div className="min-h-screen bg-slate-50">
              <Sidebar />
              <div className="pl-64">
                <Dashboard />
              </div>
            </div>
          )} />
          <Route path="/calendar-integration" component={() => (
            <div className="min-h-screen bg-slate-50">
              <Sidebar />
              <div className="pl-64">
                <CalendarIntegration />
              </div>
            </div>
          )} />
          <Route path="/qualification-rules" component={() => (
            <div className="min-h-screen bg-slate-50">
              <Sidebar />
              <div className="pl-64">
                <QualificationRules />
              </div>
            </div>
          )} />
          <Route path="/analytics" component={() => (
            <div className="min-h-screen bg-slate-50">
              <Sidebar />
              <div className="pl-64">
                <Analytics />
              </div>
            </div>
          )} />
          <Route path="/email-reports" component={() => (
            <div className="min-h-screen bg-slate-50">
              <Sidebar />
              <div className="pl-64">
                <EmailReports />
              </div>
            </div>
          )} />
          <Route path="/email-automation" component={() => (
            <div className="min-h-screen bg-slate-50">
              <Sidebar />
              <div className="pl-64">
                <EmailAutomation />
              </div>
            </div>
          )} />
          <Route path="/settings" component={() => (
            <div className="min-h-screen bg-slate-50">
              <Sidebar />
              <div className="pl-64">
                <Settings />
              </div>
            </div>
          )} />
        </>
      )}
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Router />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
