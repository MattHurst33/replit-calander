import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { TrendingUp, Calendar, Target, Clock, UserX, Building, Users, DollarSign, RefreshCw } from "lucide-react";
import StatsCard from "@/components/stats-card";
import { Skeleton } from "@/components/ui/skeleton";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";

interface NoShowAnalytics {
  totalNoShows: number;
  noShowRate: number;
  noShowsByTimeSlot: Array<{ hour: number; count: number }>;
  noShowsByIndustry: Array<{ industry: string; count: number }>;
  noShowsByCompanySize: Array<{ sizeRange: string; count: number }>;
  noShowsByRevenue: Array<{ revenueRange: string; count: number }>;
}

const COLORS = ['#8884d8', '#82ca9d', '#ffc658', '#ff7300', '#0088fe', '#00c49f'];

export default function Analytics() {
  const { data: stats, isLoading } = useQuery({
    queryKey: ['/api/dashboard/stats'],
  });

  const { data: meetings, isLoading: meetingsLoading } = useQuery({
    queryKey: ['/api/meetings'],
  });

  const { data: noShowAnalytics, isLoading: noShowLoading, refetch: refetchNoShows } = useQuery<NoShowAnalytics>({
    queryKey: ['/api/analytics/no-shows'],
  });

  // Calculate analytics metrics
  const qualificationRate = stats ? Math.round((stats.qualified / (stats.total || 1)) * 100) : 0;
  const avgMeetingsPerDay = meetings ? (meetings.length / 30).toFixed(1) : "0";
  const reviewRate = stats ? Math.round((stats.needsReview / (stats.total || 1)) * 100) : 0;
  
  // No-show helper functions
  const formatTimeSlot = (hour: number) => {
    const period = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
    return `${displayHour}:00 ${period}`;
  };

  const timeSlotData = noShowAnalytics?.noShowsByTimeSlot.map(slot => ({
    ...slot,
    timeLabel: formatTimeSlot(slot.hour)
  })) || [];

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
                title="No-Show Rate"
                value={`${noShowAnalytics?.noShowRate || 0}%`}
                change={noShowAnalytics?.noShowRate && noShowAnalytics.noShowRate < 15 ? "Below average" : "Needs attention"}
                changeType={noShowAnalytics?.noShowRate && noShowAnalytics.noShowRate < 15 ? "positive" : "negative"}
                icon={UserX}
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

        {/* No-Show Analytics Section */}
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-slate-900">No-Show Analytics</h2>
            <Button
              onClick={() => refetchNoShows()}
              variant="outline"
              size="sm"
            >
              <RefreshCw size={16} className="mr-2" />
              Refresh Data
            </Button>
          </div>

          {/* No-Show Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-slate-600">Total No-Shows</p>
                    <p className="text-2xl font-bold text-slate-900">{noShowAnalytics?.totalNoShows || 0}</p>
                  </div>
                  <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                    <UserX className="text-purple-600" size={20} />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-slate-600">Peak No-Show Hour</p>
                    <p className="text-2xl font-bold text-slate-900">
                      {noShowAnalytics?.noShowsByTimeSlot && noShowAnalytics.noShowsByTimeSlot.length > 0 
                        ? formatTimeSlot(noShowAnalytics.noShowsByTimeSlot.reduce((a, b) => a.count > b.count ? a : b).hour)
                        : 'N/A'
                      }
                    </p>
                  </div>
                  <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center">
                    <Clock className="text-orange-600" size={20} />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-slate-600">Top No-Show Industry</p>
                    <p className="text-2xl font-bold text-slate-900">
                      {noShowAnalytics?.noShowsByIndustry && noShowAnalytics.noShowsByIndustry.length > 0 
                        ? noShowAnalytics.noShowsByIndustry.reduce((a, b) => a.count > b.count ? a : b).industry
                        : 'N/A'
                      }
                    </p>
                  </div>
                  <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                    <Building className="text-blue-600" size={20} />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-slate-600">No-Show Rate</p>
                    <p className="text-2xl font-bold text-slate-900">{noShowAnalytics?.noShowRate || 0}%</p>
                  </div>
                  <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center">
                    <TrendingUp className="text-red-600" size={20} />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* No-Show Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* No-Shows by Time Slot */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Clock size={20} />
                  <span>No-Shows by Time Slot</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={timeSlotData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="timeLabel" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="count" fill="#8b5cf6" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* No-Shows by Industry */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Building size={20} />
                  <span>No-Shows by Industry</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={noShowAnalytics?.noShowsByIndustry || []}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, value }) => `${name}: ${value}`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="count"
                    >
                      {(noShowAnalytics?.noShowsByIndustry || []).map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* No-Shows by Company Size */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Users size={20} />
                  <span>No-Shows by Company Size</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={noShowAnalytics?.noShowsByCompanySize || []}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="sizeRange" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="count" fill="#10b981" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* No-Shows by Revenue */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <DollarSign size={20} />
                  <span>No-Shows by Revenue Range</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={noShowAnalytics?.noShowsByRevenue || []}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="revenueRange" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="count" fill="#f59e0b" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          {/* Insights and Recommendations */}
          <Card>
            <CardHeader>
              <CardTitle>Key Insights & Recommendations</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {noShowAnalytics?.noShowRate && noShowAnalytics.noShowRate > 20 && (
                  <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                    <h4 className="font-medium text-red-900 mb-2">High No-Show Rate Alert</h4>
                    <p className="text-sm text-red-800">
                      Your no-show rate of {noShowAnalytics.noShowRate}% is above the industry average of 15-20%. 
                      Consider implementing confirmation calls or stricter booking requirements.
                    </p>
                  </div>
                )}

                {noShowAnalytics?.noShowsByTimeSlot && noShowAnalytics.noShowsByTimeSlot.length > 0 && (
                  <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                    <h4 className="font-medium text-blue-900 mb-2">Time Slot Analysis</h4>
                    <p className="text-sm text-blue-800">
                      Most no-shows occur at {formatTimeSlot(noShowAnalytics.noShowsByTimeSlot.reduce((a, b) => a.count > b.count ? a : b).hour)}. 
                      Consider avoiding this time slot for high-value prospects or implement additional confirmation steps.
                    </p>
                  </div>
                )}

                {noShowAnalytics?.noShowsByIndustry && noShowAnalytics.noShowsByIndustry.length > 0 && (
                  <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                    <h4 className="font-medium text-yellow-900 mb-2">Industry Patterns</h4>
                    <p className="text-sm text-yellow-800">
                      The {noShowAnalytics.noShowsByIndustry.reduce((a, b) => a.count > b.count ? a : b).industry} industry 
                      has the highest no-show rate. Consider industry-specific follow-up strategies.
                    </p>
                  </div>
                )}

                <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                  <h4 className="font-medium text-green-900 mb-2">Best Practices</h4>
                  <ul className="text-sm text-green-800 space-y-1">
                    <li>• Send confirmation emails 24 hours before meetings</li>
                    <li>• Implement calendar reminders and SMS notifications</li>
                    <li>• Qualify prospects more thoroughly before booking</li>
                    <li>• Consider requiring a small deposit for high-value meetings</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
