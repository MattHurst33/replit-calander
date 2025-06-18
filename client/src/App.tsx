import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import Dashboard from "@/pages/dashboard";
import CalendarIntegration from "@/pages/calendar-integration";
import QualificationRules from "@/pages/qualification-rules";
import Analytics from "@/pages/analytics";
import EmailReports from "@/pages/email-reports";
import Settings from "@/pages/settings";
import Sidebar from "@/components/sidebar";

function Router() {
  return (
    <div className="min-h-screen bg-slate-50">
      <Sidebar />
      <div className="pl-64">
        <Switch>
          <Route path="/" component={Dashboard} />
          <Route path="/calendar-integration" component={CalendarIntegration} />
          <Route path="/qualification-rules" component={QualificationRules} />
          <Route path="/analytics" component={Analytics} />
          <Route path="/email-reports" component={EmailReports} />
          <Route path="/settings" component={Settings} />
          <Route component={NotFound} />
        </Switch>
      </div>
    </div>
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
