import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  UserX, 
  Clock, 
  TrendingUp, 
  Building, 
  Users, 
  DollarSign,
  Calendar,
  RefreshCw
} from "lucide-react";
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

export default function NoShowAnalytics() {
  const { data: analytics, isLoading, refetch } = useQuery<NoShowAnalytics>({
    queryKey: ['/api/analytics/no-shows'],
  });

  const formatTimeSlot = (hour: number) => {
    const period = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
    return `${displayHour}:00 ${period}`;
  };

  const timeSlotData = analytics?.noShowsByTimeSlot.map(slot => ({
    ...slot,
    timeLabel: formatTimeSlot(slot.hour)
  })) || [];

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold text-slate-900">No-Show Analytics</h1>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[...Array(4)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-6">
                <div className="h-16 bg-slate-200 rounded"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-slate-900">No-Show Analytics</h1>
        <Button
          onClick={() => refetch()}
          variant="outline"
          size="sm"
        >
          <RefreshCw size={16} className="mr-2" />
          Refresh Data
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-600">Total No-Shows</p>
                <p className="text-2xl font-bold text-slate-900">{analytics?.totalNoShows || 0}</p>
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
                <p className="text-sm font-medium text-slate-600">No-Show Rate</p>
                <p className="text-2xl font-bold text-slate-900">{analytics?.noShowRate || 0}%</p>
              </div>
              <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center">
                <TrendingUp className="text-red-600" size={20} />
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
                  {analytics?.noShowsByTimeSlot.length > 0 
                    ? formatTimeSlot(analytics.noShowsByTimeSlot.reduce((a, b) => a.count > b.count ? a : b).hour)
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
                  {analytics?.noShowsByIndustry.length > 0 
                    ? analytics.noShowsByIndustry.reduce((a, b) => a.count > b.count ? a : b).industry
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
      </div>

      {/* Charts */}
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
                  data={analytics?.noShowsByIndustry || []}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, value }) => `${name}: ${value}`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="count"
                >
                  {(analytics?.noShowsByIndustry || []).map((entry, index) => (
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
              <BarChart data={analytics?.noShowsByCompanySize || []}>
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
              <BarChart data={analytics?.noShowsByRevenue || []}>
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
            {analytics?.noShowRate && analytics.noShowRate > 20 && (
              <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                <h4 className="font-medium text-red-900 mb-2">High No-Show Rate Alert</h4>
                <p className="text-sm text-red-800">
                  Your no-show rate of {analytics.noShowRate}% is above the industry average of 15-20%. 
                  Consider implementing confirmation calls or stricter booking requirements.
                </p>
              </div>
            )}

            {analytics?.noShowsByTimeSlot.length > 0 && (
              <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <h4 className="font-medium text-blue-900 mb-2">Time Slot Analysis</h4>
                <p className="text-sm text-blue-800">
                  Most no-shows occur at {formatTimeSlot(analytics.noShowsByTimeSlot.reduce((a, b) => a.count > b.count ? a : b).hour)}. 
                  Consider avoiding this time slot for high-value prospects or implement additional confirmation steps.
                </p>
              </div>
            )}

            {analytics?.noShowsByIndustry.length > 0 && (
              <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                <h4 className="font-medium text-yellow-900 mb-2">Industry Patterns</h4>
                <p className="text-sm text-yellow-800">
                  The {analytics.noShowsByIndustry.reduce((a, b) => a.count > b.count ? a : b).industry} industry 
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
  );
}