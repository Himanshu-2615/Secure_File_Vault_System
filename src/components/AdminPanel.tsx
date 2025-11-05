import { useState, useEffect } from 'react';
import { getAdminFiles, getAdminUsers } from '../utils/api';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Badge } from './ui/badge';
import { toast } from 'sonner@2.0.3';
import { Shield, Users, Files, Download, HardDrive, Eye, Lock } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

interface AdminPanelProps {
  refreshTrigger: number;
}

export function AdminPanel({ refreshTrigger }: AdminPanelProps) {
  const [files, setFiles] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, [refreshTrigger]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [filesResult, usersResult] = await Promise.all([
        getAdminFiles(),
        getAdminUsers()
      ]);
      setFiles(filesResult.files);
      setUsers(usersResult.users);
    } catch (error: any) {
      toast.error(error.message || 'Failed to load admin data');
      console.error('Load admin data error:', error);
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

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  // Analytics data
  const filesByUploader = files.reduce((acc, file) => {
    const name = file.uploader_name;
    if (!acc[name]) {
      acc[name] = { name, count: 0, size: 0 };
    }
    acc[name].count++;
    acc[name].size += file.size;
    return acc;
  }, {} as Record<string, { name: string; count: number; size: number }>);

  const uploaderData = Object.values(filesByUploader).map(u => ({
    name: u.name,
    files: u.count,
    storage: Math.round(u.size / 1024) // KB
  }));

  const mimeTypeData = files.reduce((acc, file) => {
    const type = file.mime_type;
    if (!acc[type]) {
      acc[type] = { type, count: 0 };
    }
    acc[type].count++;
    return acc;
  }, {} as Record<string, { type: string; count: number }>);

  const mimeChartData = Object.values(mimeTypeData);

  const visibilityData = [
    { name: 'Public', value: files.filter(f => f.is_public).length },
    { name: 'Private', value: files.filter(f => !f.is_public).length }
  ];

  const COLORS = ['#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899'];

  const totalStorage = files.reduce((sum, file) => sum + file.size, 0);
  const totalDownloads = files.reduce((sum, file) => sum + file.download_count, 0);
  const deduplicatedFiles = files.filter(f => f.is_deduplicated).length;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Shield className="h-5 w-5" />
          Admin Panel
        </CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="text-center py-8 text-gray-500">Loading admin data...</div>
        ) : (
          <Tabs defaultValue="overview">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="files">All Files</TabsTrigger>
              <TabsTrigger value="users">Users</TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="space-y-6">
              {/* Summary Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="p-4 bg-blue-50 rounded-lg">
                  <div className="flex items-center gap-2 text-blue-700 mb-2">
                    <Files className="h-4 w-4" />
                    <span className="text-sm">Total Files</span>
                  </div>
                  <p className="text-2xl font-bold text-blue-900">{files.length}</p>
                </div>

                <div className="p-4 bg-purple-50 rounded-lg">
                  <div className="flex items-center gap-2 text-purple-700 mb-2">
                    <Users className="h-4 w-4" />
                    <span className="text-sm">Total Users</span>
                  </div>
                  <p className="text-2xl font-bold text-purple-900">{users.length}</p>
                </div>

                <div className="p-4 bg-green-50 rounded-lg">
                  <div className="flex items-center gap-2 text-green-700 mb-2">
                    <HardDrive className="h-4 w-4" />
                    <span className="text-sm">Total Storage</span>
                  </div>
                  <p className="text-2xl font-bold text-green-900">{formatBytes(totalStorage)}</p>
                </div>

                <div className="p-4 bg-orange-50 rounded-lg">
                  <div className="flex items-center gap-2 text-orange-700 mb-2">
                    <Download className="h-4 w-4" />
                    <span className="text-sm">Total Downloads</span>
                  </div>
                  <p className="text-2xl font-bold text-orange-900">{totalDownloads}</p>
                </div>
              </div>

              {/* Charts */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="border rounded-lg p-4">
                  <h3 className="mb-4">Files by Uploader</h3>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={uploaderData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Bar dataKey="files" fill="#3b82f6" name="File Count" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>

                <div className="border rounded-lg p-4">
                  <h3 className="mb-4">File Visibility</h3>
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={visibilityData}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, value }) => `${name}: ${value}`}
                        outerRadius={100}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {visibilityData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Additional Stats */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 border-t pt-6">
                <div className="text-center">
                  <p className="text-sm text-gray-600">Deduplicated Files</p>
                  <p className="text-xl font-semibold">{deduplicatedFiles}</p>
                  <p className="text-xs text-gray-500">
                    {((deduplicatedFiles / files.length) * 100 || 0).toFixed(1)}% of total
                  </p>
                </div>
                <div className="text-center">
                  <p className="text-sm text-gray-600">Avg. File Size</p>
                  <p className="text-xl font-semibold">
                    {formatBytes(files.length > 0 ? totalStorage / files.length : 0)}
                  </p>
                </div>
                <div className="text-center">
                  <p className="text-sm text-gray-600">Avg. Downloads/File</p>
                  <p className="text-xl font-semibold">
                    {(files.length > 0 ? totalDownloads / files.length : 0).toFixed(1)}
                  </p>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="files">
              <div className="space-y-2 max-h-[500px] overflow-y-auto">
                {files.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">No files found</div>
                ) : (
                  files.map((file) => (
                    <div
                      key={file.id}
                      className="flex items-start gap-4 p-4 border rounded-lg hover:bg-gray-50"
                    >
                      <Files className="h-6 w-6 text-blue-500 flex-shrink-0 mt-1" />
                      
                      <div className="flex-1 min-w-0 space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h4 className="truncate">{file.filename}</h4>
                          {file.is_public ? (
                            <Badge variant="outline" className="flex items-center gap-1">
                              <Eye className="h-3 w-3" />
                              Public
                            </Badge>
                          ) : (
                            <Badge variant="secondary" className="flex items-center gap-1">
                              <Lock className="h-3 w-3" />
                              Private
                            </Badge>
                          )}
                          {file.is_deduplicated && (
                            <Badge variant="default">Deduplicated</Badge>
                          )}
                        </div>
                        <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-gray-600">
                          <span>{formatBytes(file.size)}</span>
                          <span>{file.mime_type}</span>
                          <span>Uploaded: {formatDate(file.upload_date)}</span>
                          <span>By: {file.uploader_name}</span>
                          <span>Downloads: {file.download_count}</span>
                          {file.is_deduplicated && (
                            <span>Refs: {file.reference_count}</span>
                          )}
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </TabsContent>

            <TabsContent value="users">
              <div className="space-y-2 max-h-[500px] overflow-y-auto">
                {users.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">No users found</div>
                ) : (
                  users.map((user) => (
                    <div
                      key={user.id}
                      className="flex items-start gap-4 p-4 border rounded-lg hover:bg-gray-50"
                    >
                      <Users className="h-6 w-6 text-purple-500 flex-shrink-0 mt-1" />
                      
                      <div className="flex-1 min-w-0 space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h4>{user.name}</h4>
                          {user.is_admin && (
                            <Badge variant="default" className="flex items-center gap-1">
                              <Shield className="h-3 w-3" />
                              Admin
                            </Badge>
                          )}
                        </div>
                        <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-gray-600">
                          <span>{user.email}</span>
                          <span>Joined: {formatDate(user.created_at)}</span>
                          <span>
                            Storage: {formatBytes(user.storage_used)} / {formatBytes(user.storage_limit)}
                          </span>
                          <span>
                            {((user.storage_used / user.storage_limit) * 100 || 0).toFixed(1)}% used
                          </span>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </TabsContent>
          </Tabs>
        )}
      </CardContent>
    </Card>
  );
}
