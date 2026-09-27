/**
 * Four real KPI cards. Values come from `useDashboardMetrics`.
 */

import React from 'react';
import { FolderKanban, Activity, BarChart3, Clock } from 'lucide-react';
import { GlassCard } from '@/components/ui/glass-card';
import type { DashboardMetrics } from '@/hooks/dashboard/use-dashboard-metrics';

interface MetricCardProps {
  label: string;
  value: number;
  tone: 'primary' | 'green' | 'yellow' | 'red';
  Icon: React.ComponentType<{ className?: string }>;
}

const toneClasses: Record<MetricCardProps['tone'], string> = {
  primary: 'text-primary',
  green: 'text-green-400',
  yellow: 'text-yellow-400',
  red: 'text-red-400',
};

const MetricCard = React.memo(function MetricCard({
  label,
  value,
  tone,
  Icon,
}: MetricCardProps) {
  return (
    <GlassCard variant="elevated" padding="md" className="flex items-center gap-3">
      <div className="p-2 rounded-lg bg-white/5">
        <Icon className={`w-5 h-5 ${toneClasses[tone]}`} />
      </div>
      <div>
        <div className={`text-3xl font-bold tracking-tight ${toneClasses[tone]}`}>
          {value}
        </div>
        <div className="text-xs text-gray-400 mt-0.5">{label}</div>
      </div>
    </GlassCard>
  );
});

interface MetricsBarProps {
  metrics: DashboardMetrics;
}

const MetricsBar: React.FC<MetricsBarProps> = ({ metrics }) => {
  return (
    <section
      aria-label="Dashboard metrics"
      className="grid grid-cols-2 lg:grid-cols-4 gap-4"
    >
      <MetricCard
        label="Total Projects"
        value={metrics.totalProjects}
        tone="primary"
        Icon={FolderKanban}
      />
      <MetricCard
        label="Active Projects"
        value={metrics.activeProjects}
        tone="green"
        Icon={Activity}
      />
      <MetricCard
        label="Total Analyses"
        value={metrics.totalAnalyses}
        tone="yellow"
        Icon={BarChart3}
      />
      <MetricCard
        label="Pending Reviews"
        value={metrics.pendingReviews}
        tone="red"
        Icon={Clock}
      />
    </section>
  );
};

export default React.memo(MetricsBar);