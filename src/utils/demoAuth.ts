// Demo authentication system for when Supabase email confirmation is enabled
// This allows the app to work immediately without email setup

import { supabase } from './supabase/client';

const DEMO_USERS_KEY = 'demo_users';
const DEMO_SESSION_KEY = 'demo_session';

export interface DemoUser {
  id: string;
  email: string;
  password: string; // In real app, this would be hashed
  name: string;
  is_admin: boolean;
  created_at: string;
}

export interface DemoSession {
  userId: string;
  email: string;
  name: string;
  is_admin: boolean;
  access_token: string;
  created_at: string;
}

// Get all demo users from localStorage
function getDemoUsers(): DemoUser[] {
  try {
    const users = localStorage.getItem(DEMO_USERS_KEY);
    return users ? JSON.parse(users) : [];
  } catch {
    return [];
  }
}

// Save demo users to localStorage
function saveDemoUsers(users: DemoUser[]) {
  localStorage.setItem(DEMO_USERS_KEY, JSON.stringify(users));
}

// Get current demo session
export function getDemoSession(): DemoSession | null {
  try {
    const session = localStorage.getItem(DEMO_SESSION_KEY);
    return session ? JSON.parse(session) : null;
  } catch {
    return null;
  }
}

// Save demo session
function saveDemoSession(session: DemoSession) {
  localStorage.setItem(DEMO_SESSION_KEY, JSON.stringify(session));
}

// Clear demo session
export function clearDemoSession() {
  localStorage.removeItem(DEMO_SESSION_KEY);
}

// Demo signup
export async function demoSignup(email: string, password: string, name: string, isAdmin: boolean): Promise<DemoSession> {
  const users = getDemoUsers();
  
  // Check if user already exists
  if (users.some(u => u.email === email)) {
    throw new Error('User with this email already exists');
  }

  // Create new user
  const newUser: DemoUser = {
    id: `demo_${Date.now()}_${Math.random().toString(36).substring(7)}`,
    email,
    password, // In production, hash this!
    name,
    is_admin: isAdmin,
    created_at: new Date().toISOString()
  };

  users.push(newUser);
  saveDemoUsers(users);

  // Create session
  const session: DemoSession = {
    userId: newUser.id,
    email: newUser.email,
    name: newUser.name,
    is_admin: newUser.is_admin,
    access_token: `demo_token_${newUser.id}`,
    created_at: new Date().toISOString()
  };

  saveDemoSession(session);

  // Initialize user data in KV store
  await initializeDemoUserData(newUser);

  return session;
}

// Demo signin
export function demoSignin(email: string, password: string): DemoSession {
  const users = getDemoUsers();
  
  const user = users.find(u => u.email === email && u.password === password);
  
  if (!user) {
    throw new Error('Invalid email or password');
  }

  const session: DemoSession = {
    userId: user.id,
    email: user.email,
    name: user.name,
    is_admin: user.is_admin,
    access_token: `demo_token_${user.id}`,
    created_at: new Date().toISOString()
  };

  saveDemoSession(session);

  return session;
}

// Initialize demo user data in localStorage (not Supabase - RLS blocks client writes)
async function initializeDemoUserData(user: DemoUser) {
  try {
    // Store user info in localStorage
    const userKey = `demo_kv:user:${user.id}`;
    localStorage.setItem(userKey, JSON.stringify({
      id: user.id,
      email: user.email,
      name: user.name,
      is_admin: user.is_admin,
      created_at: user.created_at
    }));

    // Initialize quota in localStorage
    const quotaKey = `demo_kv:quota:${user.id}`;
    localStorage.setItem(quotaKey, JSON.stringify({
      user_id: user.id,
      storage_used: 0,
      storage_limit: 10 * 1024 * 1024, // 10 MB
      rate_limit: 2,
      last_request_time: Date.now(),
      request_count: 0
    }));

    console.log('Demo user data initialized in localStorage');
  } catch (error) {
    console.error('Failed to initialize demo user data:', error);
  }
}

// Check if we should use demo mode
export function shouldUseDemoMode(): boolean {
  // Use demo mode if we detect we're in a prototype environment
  // or if there's already a demo session
  return !!getDemoSession() || localStorage.getItem('use_demo_mode') === 'true';
}

// Enable demo mode
export function enableDemoMode() {
  localStorage.setItem('use_demo_mode', 'true');
}

// Check if current session is demo
export function isDemoSession(): boolean {
  const session = getDemoSession();
  return session !== null;
}
