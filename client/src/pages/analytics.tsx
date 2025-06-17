import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { TrendingUp, Calendar, Target, Clock } from "lucide-react";
import StatsCard from "@/components/stats-card";
import { Skeleton } from "@/components/ui/skeleton";

export default function Analytics() {
  const { data: stats, isLoading } = useQuery({
    queryKey: ['/api/dashboard/stats'],
  });

  const { data: meetings, isLoading: meetingsLoading } = useQuery({
    queryKey: ['/api/meetings'],
  });

  // Calculate analytics metrics
  const qualificationRate = stats ? Math.round((stats.qualified / (stats.total || 1)) * 100) : 0;
  const avgMeetingsPerDay = meetings ? (meetings.length / 30).toFixed(1) : "0";
  const reviewRate = stats ? Math.round((stats.needsReview / (stats.total || 1)) * 100) : 0;

  return (
    <div className="p-6">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 -mx-6 -mt-6 px-6 py-4 mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-slate-900">Analytics</h1>
            <p className="text-sm text-slate-600 mt-1">Track qualification performance and meeting trends</p>
          </div>
          <div className="flex items-center space-x-4">
            <Select defaultValue="7d">
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="7d">Last 7 days</SelectItem>
                <SelectItem value="30d">Last 30 days</SelectItem>
                <SelectItem value="90d">Last 90 days</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </header>

      <div className="max-w-6xl mx-auto space-y-6">
        {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {isLoading ? (
            Array.from({ length: 4 }).map((_, i) => (
              <Card key={i}>
                <CardContent className="p-6">
                  <Skeleton className="h-20 w-full" />
                </CardContent>
              </Card>
            ))
          ) : (
            <>
              <StatsCard
                title="Qualification Rate"
                value={`${qualificationRate}%`}
                change="+5%"
                changeType="positive"
                icon={Target}
                iconColor="bg-green-50 text-green-600"
              />
              <StatsCard
                title="Avg Meetings/Day"
                value={avgMeetingsPerDay}
                change="+2.1"
                changeType="positive"
                icon={Calendar}
                iconColor="bg-blue-50 text-blue-600"
              />
              <StatsCard
                title="Manual Review Rate"
                value={`${reviewRate}%`}
                change="-3%"
                changeType="positive"
                icon={Clock}
                iconColor="bg-amber-50 text-amber-600"
              />
              <StatsCard
                title="Trend Direction"
                value="↗ Improving"
                change="Last 30 days"
                changeType="positive"
                icon={TrendingUp}
                iconColor="bg-purple-50 text-purple-600"
              />
            </>
          )}
        </div>

        {/* Charts Section */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Weekly Qualification Trends</CardTitle>
              <Select defaultValue="7d">
                <SelectTrigger className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="7d">Last 7 days</SelectItem>
                  <SelectItem value="30d">Last 30 days</SelectItem>
                  <SelectItem value="90d">Last 90 days</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardHeader>
          <CardContent>
            {/* Placeholder for chart */}
            <div className="h-64 bg-slate-50 rounded-lg border-2 border-dashed border-slate-200 flex items-center justify-center">
              <div className="text-center">
                <TrendingUp className="mx-auto text-4xl text-slate-400 mb-2" size={48} />
                <p className="text-slate-600 font-medium">Analytics Chart</p>
                <p className="text-sm text-slate-500">Integration with Chart.js/D3.js for data visualization</p>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-6 mt-6">
              <div className="text-center">
                <p className="text-2xl font-bold text-green-600">{qualificationRate}%</p>
                <p className="text-sm text-slate-600">Qualification Rate</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-blue-600">{avgMeetingsPerDay}</p>
                <p className="text-sm text-slate-600">Avg Meetings/Day</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-amber-600">{reviewRate}%</p>
                <p className="text-sm text-slate-600">Manual Review Rate</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Performance Breakdown */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Qualification Breakdown</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between p-3 bg-green-50 border border-green-200 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                    <span className="text-sm font-medium">Qualified</span>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold text-green-600">{stats?.qualified || 0}</p>
                    <p className="text-xs text-green-600">{qualificationRate}%</p>
                  </div>
                </div>
                <div className="flex items-center justify-between p-3 bg-red-50 border border-red-200 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                    <span className="text-sm font-medium">Disqualified</span>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold text-red-600">{stats?.disqualified || 0}</p>
                    <p className="text-xs text-red-600">
                      {stats ? Math.round((stats.disqualified / (stats.total || 1)) * 100) : 0}%
                    </p>
                  </div>
                </div>
                <div className="flex items-center justify-between p-3 bg-amber-50 border border-amber-200 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <div className="w-3 h-3 bg-amber-500 rounded-full"></div>
                    <span className="text-sm font-medium">Needs Review</span>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold text-amber-600">{stats?.needsReview || 0}</p>
                    <p className="text-xs text-amber-600">{reviewRate}%</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Top Disqualification Reasons</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex items-center justify-between p-2 border-b border-slate-100">
                  <span className="text-sm text-slate-700">Budget too low</span>
                  <span className="text-sm font-medium text-slate-900">12 meetings</span>
                </div>
                <div className="flex items-center justify-between p-2 border-b border-slate-100">
                  <span className="text-sm text-slate-700">Company size too small</span>
                  <span className="text-sm font-medium text-slate-900">8 meetings</span>
                </div>
                <div className="flex items-center justify-between p-2 border-b border-slate-100">
                  <span className="text-sm text-slate-700">Industry mismatch</span>
                  <span className="text-sm font-medium text-slate-900">5 meetings</span>
                </div>
                <div className="flex items-center justify-between p-2 border-b border-slate-100">
                  <span className="text-sm text-slate-700">Missing revenue data</span>
                  <span className="text-sm font-medium text-slate-900">3 meetings</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Meeting Volume Trends */}
        <Card>
          <CardHeader>
            <CardTitle>Meeting Volume by Day</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-48 bg-slate-50 rounded-lg border-2 border-dashed border-slate-200 flex items-center justify-center">
              <div className="text-center">
                <Calendar className="mx-auto text-4xl text-slate-400 mb-2" size={48} />
                <p className="text-slate-600 font-medium">Volume Chart</p>
                <p className="text-sm text-slate-500">Daily meeting distribution visualization</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
