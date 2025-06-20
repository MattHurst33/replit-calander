import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import GroomingEfficiency from "@/components/grooming-efficiency";
import { BarChart3, TrendingUp, Clock, Users } from "lucide-react";

export default function Analytics() {
  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Analytics Dashboard</h1>
          <p className="text-muted-foreground">
            Track performance metrics and productivity insights
          </p>
        </div>
      </div>

      <Tabs defaultValue="efficiency" className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="efficiency" className="flex items-center gap-2">
            <Clock size={16} />
            Grooming Efficiency
          </TabsTrigger>
          <TabsTrigger value="performance" className="flex items-center gap-2">
            <BarChart3 size={16} />
            Performance
          </TabsTrigger>
          <TabsTrigger value="trends" className="flex items-center gap-2">
            <TrendingUp size={16} />
            Trends
          </TabsTrigger>
          <TabsTrigger value="team" className="flex items-center gap-2">
            <Users size={16} />
            Team Report
          </TabsTrigger>
        </TabsList>

        <TabsContent value="efficiency">
          <GroomingEfficiency />
        </TabsContent>

        <TabsContent value="performance">
          <Card>
            <CardHeader>
              <CardTitle>Performance Analytics</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center py-12 text-muted-foreground">
                <BarChart3 size={64} className="mx-auto mb-4 opacity-50" />
                <p>Performance analytics coming soon</p>
                <p className="text-sm">Track conversion rates, meeting outcomes, and revenue impact</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="trends">
          <Card>
            <CardHeader>
              <CardTitle>Trend Analysis</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center py-12 text-muted-foreground">
                <TrendingUp size={64} className="mx-auto mb-4 opacity-50" />
                <p>Trend analysis coming soon</p>
                <p className="text-sm">Identify patterns in meeting qualification and scheduling trends</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="team">
          <Card>
            <CardHeader>
              <CardTitle>Team Efficiency Report</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center py-12 text-muted-foreground">
                <Users size={64} className="mx-auto mb-4 opacity-50" />
                <p>Team reports coming soon</p>
                <p className="text-sm">Compare team member productivity and automation effectiveness</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}