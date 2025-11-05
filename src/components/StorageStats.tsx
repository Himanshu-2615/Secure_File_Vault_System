import { useState, useEffect } from 'react';
import { getStats } from '../utils/api';
import { StorageStats as IStorageStats } from '../types';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Progress } from './ui/progress';
import { toast } from 'sonner@2.0.3';
import { HardDrive, TrendingDown, Files, Copy } from 'lucide-react';

interface StorageStatsProps {
  refreshTrigger: number;
}

export function StorageStats({ refreshTrigger }: StorageStatsProps) {
  const [stats, setStats] = useState<IStorageStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStats();
  }, [refreshTrigger]);

  const loadStats = async () => {
    setLoading(true);
    try {
      const result = await getStats();
      setStats(result);
    } catch (error: any) {
      toast.error(error.message || 'Failed to load statistics');
      console.error('Load stats error:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
  };

  if (loading || !stats) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <HardDrive className="h-5 w-5" />
            Storage Statistics
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center text-gray-500">Loading statistics...</div>
        </CardContent>
      </Card>
    );
  }

  const storageLimit = (stats as any).storage_limit || 10485760; // 10MB default
  const storageUsed = (stats as any).storage_used || stats.total_storage_used;
  const usagePercentage = storageLimit > 0 
    ? (storageUsed / storageLimit) * 100 
    : 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <HardDrive className="h-5 w-5" />
          Storage Statistics
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span>Storage Used</span>
            <span className="font-medium">
              {formatBytes(storageUsed)} / {formatBytes(storageLimit)}
            </span>
          </div>
          <Progress value={usagePercentage} className="h-2" />
          <p className="text-xs text-gray-600">
            {usagePercentage.toFixed(1)}% of quota used
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-1 p-4 bg-blue-50 rounded-lg">
            <div className="flex items-center gap-2 text-blue-700">
              <Files className="h-4 w-4" />
              <span className="text-sm">Total Files</span>
            </div>
            <p className="text-2xl font-bold text-blue-900">{stats.file_count}</p>
          </div>

          <div className="space-y-1 p-4 bg-purple-50 rounded-lg">
            <div className="flex items-center gap-2 text-purple-700">
              <Copy className="h-4 w-4" />
              <span className="text-sm">Deduplicated</span>
            </div>
            <p className="text-2xl font-bold text-purple-900">{stats.deduplicated_count}</p>
          </div>

          <div className="space-y-1 p-4 bg-green-50 rounded-lg">
            <div className="flex items-center gap-2 text-green-700">
              <HardDrive className="h-4 w-4" />
              <span className="text-sm">Actual Storage</span>
            </div>
            <p className="text-2xl font-bold text-green-900">
              {formatBytes(stats.total_storage_used)}
            </p>
          </div>

          <div className="space-y-1 p-4 bg-orange-50 rounded-lg">
            <div className="flex items-center gap-2 text-orange-700">
              <TrendingDown className="h-4 w-4" />
              <span className="text-sm">Space Saved</span>
            </div>
            <p className="text-2xl font-bold text-orange-900">
              {formatBytes(stats.storage_savings)}
            </p>
          </div>
        </div>

        <div className="pt-4 border-t">
          <div className="grid grid-cols-2 gap-4 text-center">
            <div>
              <p className="text-sm text-gray-600">Original Size</p>
              <p className="text-lg font-semibold">{formatBytes(stats.original_storage_usage)}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Savings</p>
              <p className="text-lg font-semibold text-green-600">
                {stats.storage_savings_percentage.toFixed(1)}%
              </p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
