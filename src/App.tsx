import { useState, useEffect } from 'react';
import { supabase } from './utils/supabase/client';
import { getDemoSession } from './utils/demoAuth';
import { AuthForm } from './components/AuthForm';
import { FileUpload } from './components/FileUpload';
import { FileList } from './components/FileList';
import { StorageStats } from './components/StorageStats';
import { AdminPanel } from './components/AdminPanel';
import { StatusIndicator } from './components/StatusIndicator';
import { getUserInfo, signout } from './utils/api';
import { Button } from './components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './components/ui/tabs';
import { Toaster } from './components/ui/sonner';
import { LogOut, Shield, User } from 'lucide-react';
import { toast } from 'sonner@2.0.3';

export default function App() {
  const [session, setSession] = useState<any>(null);
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  useEffect(() => {
    checkSession();
    
    // Show first-time info
    const hasShownInfo = localStorage.getItem('appInfoShown');
    if (!hasShownInfo) {
      setTimeout(() => {
        toast.info('💡 Tip: Create an admin account by checking the "Admin" box during signup!', {
          duration: 8000
        });
        localStorage.setItem('appInfoShown', 'true');
      }, 1000);
    }
    
    const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session) {
        loadUserInfo();
      } else {
        setUser(null);
      }
    });

    return () => {
      authListener?.subscription?.unsubscribe();
    };
  }, []);

  const checkSession = async () => {
    try {
      // Check demo session first
      const demoSession = getDemoSession();
      if (demoSession) {
        setSession({ access_token: demoSession.access_token } as any);
        await loadUserInfo();
        setLoading(false);
        return;
      }

      // Check Supabase session
      const { data: { session } } = await supabase.auth.getSession();
      setSession(session);
      if (session) {
        await loadUserInfo();
      }
    } catch (error) {
      console.error('Session check error:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadUserInfo = async () => {
    try {
      const userInfo = await getUserInfo();
      setUser(userInfo);
      
      // Show welcome message on first load
      const hasShownWelcome = sessionStorage.getItem('welcomeShown');
      if (!hasShownWelcome) {
        toast.success('Welcome to Secure File Vault! App running in client-side mode.', {
          duration: 5000
        });
        sessionStorage.setItem('welcomeShown', 'true');
      }
    } catch (error: any) {
      console.error('Load user info error:', error);
      toast.error('Failed to load user information');
    }
  };

  const handleSignOut = async () => {
    try {
      await signout();
      setSession(null);
      setUser(null);
      toast.success('Signed out successfully');
    } catch (error: any) {
      toast.error('Sign out failed');
      console.error('Sign out error:', error);
    }
  };

  const handleUploadSuccess = () => {
    setRefreshTrigger(prev => prev + 1);
    toast.success('Upload completed!');
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (!session) {
    return (
      <>
        <AuthForm onSuccess={checkSession} />
        <Toaster />
      </>
    );
  }

  return (
    <>
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
        <div className="container mx-auto p-4 space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between p-4 bg-white rounded-lg shadow">
            <div className="flex items-center gap-3">
              <Shield className="h-8 w-8 text-blue-600" />
              <div>
                <h1 className="text-2xl">Secure File Vault</h1>
                <div className="flex items-center gap-2">
                  <p className="text-sm text-gray-600">
                    {user?.name || 'User'} {user?.is_admin && '(Admin)'}
                  </p>
                  <StatusIndicator />
                </div>
              </div>
            </div>
            <Button onClick={handleSignOut} variant="outline">
              <LogOut className="h-4 w-4 mr-2" />
              Sign Out
            </Button>
          </div>

          {/* Main Content */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left Column - Upload & Stats */}
            <div className="space-y-6">
              <FileUpload onUploadSuccess={handleUploadSuccess} />
              <StorageStats refreshTrigger={refreshTrigger} />
            </div>

            {/* Right Column - Files & Admin */}
            <div className="lg:col-span-2 space-y-6">
              {user?.is_admin ? (
                <Tabs defaultValue="files" className="w-full">
                  <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="files">
                      <User className="h-4 w-4 mr-2" />
                      My Files
                    </TabsTrigger>
                    <TabsTrigger value="admin">
                      <Shield className="h-4 w-4 mr-2" />
                      Admin Panel
                    </TabsTrigger>
                  </TabsList>

                  <TabsContent value="files" className="mt-6">
                    <FileList refreshTrigger={refreshTrigger} />
                  </TabsContent>

                  <TabsContent value="admin" className="mt-6">
                    <AdminPanel refreshTrigger={refreshTrigger} />
                  </TabsContent>
                </Tabs>
              ) : (
                <FileList refreshTrigger={refreshTrigger} />
              )}
            </div>
          </div>

          {/* Footer */}
          <div className="text-center text-sm text-gray-600 py-4">
            <p>Secure File Vault - Production-grade file storage with deduplication</p>
            <p className="text-xs mt-1">Rate limit: 2 requests/second • Storage quota: 10MB per user</p>
          </div>
        </div>
      </div>
      <Toaster />
    </>
  );
}