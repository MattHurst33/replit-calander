import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Clock, TrendingUp, Users, Target, RefreshCw, Calculator } from "lucide-react";
import { format, subWeeks } from "date-fns";

interface WeeklyMetrics {
  totalMeetings: number;
  qualifiedMeetings: number;
  disqualifiedMeetings: number;
  autoQualifiedMeetings: number;
  autoDisqualifiedMeetings: number;
  manualReviewMeetings: number;
  timeSpentGroomingMinutes: number;
  timeSavedMinutes: number;
  automationAccuracy: string;
  weekStart: string;
  weekEnd: string;
}

interface EfficiencyData {
  currentWeek: WeeklyMetrics | null;
  historical: WeeklyMetrics[];
}

export default function GroomingEfficiency() {
  const { toast } = useToast();

  const { data: efficiencyData, isLoading } = useQuery<EfficiencyData>({
    queryKey: ['/api/grooming-efficiency'],
    retry: false
  });

  const calculateMetricsMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest('/api/calculate-metrics', {
        method: 'POST'
      });
    },
    onSuccess: () => {
      toast({
        title: "Metrics Updated",
        description: "Grooming efficiency metrics have been recalculated",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/grooming-efficiency'] });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to calculate metrics",
        variant: "destructive",
      });
    },
  });

  if (isLoading) {
    return <div>Loading efficiency metrics...</div>;
  }

  const currentWeek = efficiencyData?.currentWeek;
  const historical = efficiencyData?.historical || [];

  // Calculate trends
  const last4Weeks = historical.slice(-4);
  const totalTimeSavedLast4Weeks = last4Weeks.reduce((sum, week) => sum + week.timeSavedMinutes, 0);
  const avgAccuracyLast4Weeks = last4Weeks.length > 0 
    ? last4Weeks.reduce((sum, week) => sum + parseFloat(week.automationAccuracy), 0) / last4Weeks.length 
    : 0;

  // Convert minutes to hours for better display
  const formatTime = (minutes: number): string => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours > 0) {
      return `${hours}h ${mins}m`;
    }
    return `${mins}m`;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Grooming Efficiency</h2>
          <p className="text-muted-foreground">
            Track time saved and productivity gains from AI automation
          </p>
        </div>
        <Button
          onClick={() => calculateMetricsMutation.mutate()}
          disabled={calculateMetricsMutation.isPending}
          variant="outline"
        >
          {calculateMetricsMutation.isPending ? (
            <>
              <RefreshCw className="animate-spin mr-2" size={16} />
              Calculating...
            </>
          ) : (
            <>
              <Calculator className="mr-2" size={16} />
              Recalculate
            </>
          )}
        </Button>
      </div>

      {/* Current Week Overview */}
      {currentWeek && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock size={20} />
              This Week ({format(new Date(currentWeek.weekStart), 'MMM d')} - {format(new Date(currentWeek.weekEnd), 'MMM d')})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="text-center p-4 bg-green-50 rounded-lg">
                <div className="text-2xl font-bold text-green-600">{formatTime(currentWeek.timeSavedMinutes)}</div>
                <div className="text-sm text-green-600">Time Saved</div>
              </div>
              
              <div className="text-center p-4 bg-blue-50 rounded-lg">
                <div className="text-2xl font-bold text-blue-600">{currentWeek.totalMeetings}</div>
                <div className="text-sm text-blue-600">Total Meetings</div>
              </div>
              
              <div className="text-center p-4 bg-purple-50 rounded-lg">
                <div className="text-2xl font-bold text-purple-600">{parseFloat(currentWeek.automationAccuracy).toFixed(1)}%</div>
                <div className="text-sm text-purple-600">Automation Rate</div>
              </div>
              
              <div className="text-center p-4 bg-orange-50 rounded-lg">
                <div className="text-2xl font-bold text-orange-600">{formatTime(currentWeek.timeSpentGroomingMinutes)}</div>
                <div className="text-sm text-orange-600">Manual Review Time</div>
              </div>
            </div>

            <div className="mt-6 space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium">Qualification Breakdown</span>
                <span className="text-sm text-muted-foreground">{currentWeek.totalMeetings} total</span>
              </div>
              
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="bg-green-50 text-green-700">Auto Qualified</Badge>
                    <span className="text-sm">{currentWeek.autoQualifiedMeetings}</span>
                  </div>
                  <Progress value={(currentWeek.autoQualifiedMeetings / currentWeek.totalMeetings) * 100} className="w-24 h-2" />
                </div>
                
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="bg-red-50 text-red-700">Auto Disqualified</Badge>
                    <span className="text-sm">{currentWeek.autoDisqualifiedMeetings}</span>
                  </div>
                  <Progress value={(currentWeek.autoDisqualifiedMeetings / currentWeek.totalMeetings) * 100} className="w-24 h-2" />
                </div>
                
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="bg-yellow-50 text-yellow-700">Manual Review</Badge>
                    <span className="text-sm">{currentWeek.manualReviewMeetings}</span>
                  </div>
                  <Progress value={(currentWeek.manualReviewMeetings / currentWeek.totalMeetings) * 100} className="w-24 h-2" />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* 4-Week Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Time Saved (4 weeks)</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{formatTime(totalTimeSavedLast4Weeks)}</div>
            <p className="text-xs text-muted-foreground">
              Equivalent to {(totalTimeSavedLast4Weeks / 60 / 8).toFixed(1)} work days
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Average Automation Rate</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{avgAccuracyLast4Weeks.toFixed(1)}%</div>
            <p className="text-xs text-muted-foreground">
              Last 4 weeks average
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Weekly Meetings</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-600">
              {last4Weeks.length > 0 ? Math.round(last4Weeks.reduce((sum, week) => sum + week.totalMeetings, 0) / last4Weeks.length) : 0}
            </div>
            <p className="text-xs text-muted-foreground">
              Average per week
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Historical Trend */}
      <Card>
        <CardHeader>
          <CardTitle>Historical Efficiency Trend</CardTitle>
        </CardHeader>
        <CardContent>
          {historical.length > 0 ? (
            <div className="space-y-4">
              <div className="grid grid-cols-6 gap-4 text-sm font-medium text-muted-foreground">
                <div>Week</div>
                <div>Meetings</div>
                <div>Time Saved</div>
                <div>Automation %</div>
                <div>Auto Qualified</div>
                <div>Manual Review</div>
              </div>
              
              {historical.slice(-8).reverse().map((week, index) => (
                <div key={index} className="grid grid-cols-6 gap-4 text-sm py-2 border-b">
                  <div className="font-medium">
                    {format(new Date(week.weekStart), 'MMM d')}
                  </div>
                  <div>{week.totalMeetings}</div>
                  <div className="text-green-600">{formatTime(week.timeSavedMinutes)}</div>
                  <div className="text-blue-600">{parseFloat(week.automationAccuracy).toFixed(1)}%</div>
                  <div>{week.autoQualifiedMeetings + week.autoDisqualifiedMeetings}</div>
                  <div>{week.manualReviewMeetings}</div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <Calculator size={48} className="mx-auto mb-4 opacity-50" />
              <p>No historical data available yet</p>
              <p className="text-sm">Metrics will appear here as you process meetings</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Insights */}
      <Card>
        <CardHeader>
          <CardTitle>Efficiency Insights</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3 text-sm">
            {currentWeek && (
              <>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  <span>
                    You saved <strong>{formatTime(currentWeek.timeSavedMinutes)}</strong> this week through automation
                  </span>
                </div>
                
                {currentWeek.automationAccuracy && parseFloat(currentWeek.automationAccuracy) > 80 && (
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                    <span>
                      High automation rate of <strong>{parseFloat(currentWeek.automationAccuracy).toFixed(1)}%</strong> - excellent efficiency!
                    </span>
                  </div>
                )}
                
                {currentWeek.manualReviewMeetings > currentWeek.autoQualifiedMeetings + currentWeek.autoDisqualifiedMeetings && (
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>
                    <span>
                      Consider refining qualification rules to reduce manual reviews
                    </span>
                  </div>
                )}
              </>
            )}
            
            {totalTimeSavedLast4Weeks > 0 && (
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                <span>
                  Total time saved in last 4 weeks: <strong>{formatTime(totalTimeSavedLast4Weeks)}</strong>
                </span>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}