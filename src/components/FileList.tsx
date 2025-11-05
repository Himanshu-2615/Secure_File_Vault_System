import { useState, useEffect } from 'react';
import { getFiles, downloadFile, deleteFile, shareFile } from '../utils/api';
import { FileMetadata, SearchFilters } from '../types';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { toast } from 'sonner@2.0.3';
import {
  File,
  Download,
  Trash2,
  Search,
  Filter,
  Share2,
  Eye,
  Lock,
  Users,
  Copy
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger
} from './ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from './ui/select';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from './ui/collapsible';

interface FileListProps {
  refreshTrigger: number;
}

export function FileList({ refreshTrigger }: FileListProps) {
  const [files, setFiles] = useState<FileMetadata[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState<SearchFilters>({});
  const [showFilters, setShowFilters] = useState(false);
  const [shareDialogOpen, setShareDialogOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState<FileMetadata | null>(null);
  const [shareEmail, setShareEmail] = useState('');

  useEffect(() => {
    loadFiles();
  }, [refreshTrigger]);

  const loadFiles = async () => {
    setLoading(true);
    try {
      const result = await getFiles(filters);
      setFiles(result.files);
    } catch (error: any) {
      toast.error(error.message || 'Failed to load files');
      console.error('Load files error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = () => {
    loadFiles();
  };

  const handleDownload = async (file: FileMetadata) => {
    try {
      const result = await downloadFile(file.id);
      
      // Open download URL in new tab
      window.open(result.download_url, '_blank');
      
      toast.success(`Downloading ${file.filename}`);
      
      // Refresh to update download count
      loadFiles();
    } catch (error: any) {
      toast.error(error.message || 'Download failed');
      console.error('Download error:', error);
    }
  };

  const handleDelete = async (file: FileMetadata) => {
    if (!confirm(`Are you sure you want to delete ${file.filename}?`)) {
      return;
    }

    try {
      await deleteFile(file.id);
      toast.success('File deleted successfully');
      loadFiles();
    } catch (error: any) {
      toast.error(error.message || 'Delete failed');
      console.error('Delete error:', error);
    }
  };

  const handleShare = async (isPublic: boolean) => {
    if (!selectedFile) return;

    try {
      await shareFile(selectedFile.id, isPublic, shareEmail || undefined);
      toast.success(isPublic ? 'File made public' : 'File shared successfully');
      setShareDialogOpen(false);
      setShareEmail('');
      loadFiles();
    } catch (error: any) {
      toast.error(error.message || 'Share failed');
      console.error('Share error:', error);
    }
  };

  const formatFileSize = (bytes: number) => {
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
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const mimeTypes = [
    'image/png',
    'image/jpeg',
    'image/gif',
    'application/pdf',
    'application/zip',
    'text/plain',
    'application/json'
  ];

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <File className="h-5 w-5" />
            My Files ({files.length})
          </CardTitle>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowFilters(!showFilters)}
          >
            <Filter className="h-4 w-4 mr-2" />
            {showFilters ? 'Hide Filters' : 'Show Filters'}
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <Collapsible open={showFilters} onOpenChange={setShowFilters}>
          <CollapsibleContent className="space-y-4 pb-4 border-b">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="search-filename">Filename</Label>
                <Input
                  id="search-filename"
                  placeholder="Search by filename..."
                  value={filters.filename || ''}
                  onChange={(e) => setFilters({ ...filters, filename: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="search-mime">MIME Type</Label>
                <Select
                  value={filters.mime_type || 'all'}
                  onValueChange={(value) => setFilters({ ...filters, mime_type: value === 'all' ? undefined : value })}
                >
                  <SelectTrigger id="search-mime">
                    <SelectValue placeholder="All types" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All types</SelectItem>
                    {mimeTypes.map(type => (
                      <SelectItem key={type} value={type}>{type}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="search-uploader">Uploader</Label>
                <Input
                  id="search-uploader"
                  placeholder="Search by uploader..."
                  value={filters.uploader_name || ''}
                  onChange={(e) => setFilters({ ...filters, uploader_name: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="search-size-min">Min Size (bytes)</Label>
                <Input
                  id="search-size-min"
                  type="number"
                  placeholder="0"
                  value={filters.size_min || ''}
                  onChange={(e) => setFilters({ ...filters, size_min: e.target.value ? parseInt(e.target.value) : undefined })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="search-size-max">Max Size (bytes)</Label>
                <Input
                  id="search-size-max"
                  type="number"
                  placeholder="Unlimited"
                  value={filters.size_max || ''}
                  onChange={(e) => setFilters({ ...filters, size_max: e.target.value ? parseInt(e.target.value) : undefined })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="search-tags">Tags (comma-separated)</Label>
                <Input
                  id="search-tags"
                  placeholder="work, project"
                  value={filters.tags?.join(',') || ''}
                  onChange={(e) => setFilters({ 
                    ...filters, 
                    tags: e.target.value ? e.target.value.split(',').map(t => t.trim()) : undefined 
                  })}
                />
              </div>
            </div>

            <div className="flex gap-2">
              <Button onClick={handleSearch} className="flex-1">
                <Search className="h-4 w-4 mr-2" />
                Search
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  setFilters({});
                  setTimeout(() => loadFiles(), 0);
                }}
              >
                Clear
              </Button>
            </div>
          </CollapsibleContent>
        </Collapsible>

        {loading ? (
          <div className="text-center py-8 text-gray-500">Loading files...</div>
        ) : files.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            No files found. Upload some files to get started!
          </div>
        ) : (
          <div className="space-y-2 max-h-[500px] overflow-y-auto">
            {files.map((file) => (
              <div
                key={file.id}
                className="flex items-start gap-4 p-4 border rounded-lg hover:bg-gray-50 transition-colors"
              >
                <File className="h-8 w-8 text-blue-500 flex-shrink-0 mt-1" />
                
                <div className="flex-1 min-w-0 space-y-2">
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="truncate">{file.filename}</h3>
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
                        <Badge variant="default" className="flex items-center gap-1">
                          <Copy className="h-3 w-3" />
                          Deduplicated
                        </Badge>
                      )}
                    </div>
                    <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-gray-600 mt-1">
                      <span>{formatFileSize(file.size)}</span>
                      <span>{file.mime_type}</span>
                      <span>Uploaded: {formatDate(file.upload_date)}</span>
                      <span>By: {file.uploader_name}</span>
                      {file.is_public && (
                        <span className="flex items-center gap-1">
                          <Download className="h-3 w-3" />
                          {file.download_count} downloads
                        </span>
                      )}
                      {file.is_deduplicated && (
                        <span>{file.reference_count} references</span>
                      )}
                    </div>
                  </div>

                  {file.tags && file.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {file.tags.map((tag, idx) => (
                        <Badge key={idx} variant="outline" className="text-xs">
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>

                <div className="flex gap-2 flex-shrink-0">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleDownload(file)}
                    title="Download"
                  >
                    <Download className="h-4 w-4" />
                  </Button>
                  
                  <Dialog open={shareDialogOpen && selectedFile?.id === file.id} onOpenChange={(open) => {
                    setShareDialogOpen(open);
                    if (open) setSelectedFile(file);
                  }}>
                    <DialogTrigger asChild>
                      <Button
                        variant="outline"
                        size="sm"
                        title="Share"
                      >
                        <Share2 className="h-4 w-4" />
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Share File</DialogTitle>
                        <DialogDescription>
                          Share "{file.filename}" with others
                        </DialogDescription>
                      </DialogHeader>
                      <div className="space-y-4">
                        <div className="space-y-2">
                          <Button
                            onClick={() => handleShare(true)}
                            className="w-full"
                            variant={file.is_public ? 'default' : 'outline'}
                          >
                            <Eye className="h-4 w-4 mr-2" />
                            Make Public
                          </Button>
                          <p className="text-sm text-gray-600">
                            Anyone with the link can download this file
                          </p>
                        </div>

                        <div className="border-t pt-4 space-y-2">
                          <Label htmlFor="share-email">Share with specific user</Label>
                          <Input
                            id="share-email"
                            type="email"
                            placeholder="user@example.com"
                            value={shareEmail}
                            onChange={(e) => setShareEmail(e.target.value)}
                          />
                          <Button
                            onClick={() => handleShare(false)}
                            className="w-full"
                            variant="outline"
                            disabled={!shareEmail}
                          >
                            <Users className="h-4 w-4 mr-2" />
                            Share with User
                          </Button>
                        </div>
                      </div>
                    </DialogContent>
                  </Dialog>

                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => handleDelete(file)}
                    title="Delete"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
