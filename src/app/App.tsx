import React, { useState, useEffect } from 'react';
import { PixelCard } from '@/app/components/PixelCard';
import { PixelButton } from '@/app/components/PixelButton';
import { PixelInput } from '@/app/components/PixelInput';
import { PixelBadge } from '@/app/components/PixelBadge';
import { Dumbbell, Trophy, BookOpen, User, Plus, Sword, LogOut, Flame, Share2, Camera, Eye, EyeOff, Trash2, MessageSquare, Star, Settings, X } from 'lucide-react';
import { format } from 'date-fns';
import { ImageWithFallback } from '@/app/components/figma/ImageWithFallback';
import { createClient } from '@supabase/supabase-js';
import { projectId, publicAnonKey } from '/utils/supabase/info';

// Initialize Supabase Client
const supabaseUrl = `https://${projectId}.supabase.co`;
// Singleton pattern to avoid "Multiple GoTrueClient instances" warning during HMR
const supabase = (window as any)._supabaseClient || createClient(supabaseUrl, publicAnonKey);
if (!(window as any)._supabaseClient) {
  (window as any)._supabaseClient = supabase;
}

const API_URL = `https://${projectId}.supabase.co/functions/v1/make-server-7819cca2`;

// Types
type UserRole = 'student' | 'coach';
type UserStatus = 'pending' | 'active' | 'disabled';

interface UserAccount {
  id: string;
  name: string;
  // password removed, handled by Supabase
  role: UserRole;
  status: UserStatus;
  coachId?: string; // Only for students
}

interface LogItem {
  id: string;
  exercise: string;
  weight: number;
  reps: number;
  sets: number;
  muscle: string;
}

interface Log {
  id: string;
  studentId: string;
  date: Date; // stored as string in DB, need to parse
  items: LogItem[];
  notes: string;
  score?: number;
  coachComment?: string;
  coachIdWhoCommented?: string;
  isHidden?: boolean;
}

interface Exercise {
  id: string;
  name: string;
  muscle: string;
  guide: string;
  imageUrl: string;
  author: string;
}

interface BattleComment {
  id: string;
  author: string;
  content: string;
  date: string;
}

interface Battle {
  id: string;
  author: string;
  title: string;
  likes: number;
  likedBy?: string[];
  routine: string[];
  comments?: BattleComment[];
}

// API Helper
const api = {
  signup: async (data: any) => {
    const res = await fetch(`${API_URL}/signup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${publicAnonKey}` },
      body: JSON.stringify(data)
    });
    return res.json();
  },
  updateAccount: async (updates: any) => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) throw new Error("No session");
    const res = await fetch(`${API_URL}/update-account`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json', 
        Authorization: `Bearer ${session.access_token}` 
      },
      body: JSON.stringify(updates)
    });
    return res.json();
  },
  getUsers: async () => {
    const res = await fetch(`${API_URL}/users`, { headers: { Authorization: `Bearer ${publicAnonKey}` } });
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  },
  createUser: async (user: UserAccount) => {
    const res = await fetch(`${API_URL}/users`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${publicAnonKey}` },
      body: JSON.stringify(user)
    });
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  },
  deleteUser: async (id: string) => {
    await fetch(`${API_URL}/users/${id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${publicAnonKey}` } });
  },
  getLogs: async () => {
    const res = await fetch(`${API_URL}/logs`, { headers: { Authorization: `Bearer ${publicAnonKey}` } });
    if (!res.ok) throw new Error(await res.text());
    const data = await res.json();
    return data.map((log: any) => ({ ...log, date: new Date(log.date) }));
  },
  createLog: async (log: Log) => {
    const res = await fetch(`${API_URL}/logs`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${publicAnonKey}` },
      body: JSON.stringify(log)
    });
    return res.json();
  },
  updateLog: async (id: string, updates: Partial<Log>) => {
    const res = await fetch(`${API_URL}/logs/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${publicAnonKey}` },
      body: JSON.stringify(updates)
    });
    return res.json();
  },
  deleteLog: async (id: string) => {
    await fetch(`${API_URL}/logs/${id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${publicAnonKey}` } });
  },
  getExercises: async () => {
    const res = await fetch(`${API_URL}/exercises`, { headers: { Authorization: `Bearer ${publicAnonKey}` } });
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  },
  createExercise: async (ex: Exercise) => {
    const res = await fetch(`${API_URL}/exercises`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${publicAnonKey}` },
      body: JSON.stringify(ex)
    });
    return res.json();
  },
  getBattles: async () => {
    const res = await fetch(`${API_URL}/battles`, { headers: { Authorization: `Bearer ${publicAnonKey}` } });
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  },
  createBattle: async (battle: Battle) => {
    const res = await fetch(`${API_URL}/battles`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${publicAnonKey}` },
      body: JSON.stringify(battle)
    });
    return res.json();
  },
  likeBattle: async (id: string) => {
    const { data: { session } } = await supabase.auth.getSession();
    const token = session?.access_token || publicAnonKey;
    const res = await fetch(`${API_URL}/battles/${id}/like`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` }
    });
    return res.json();
  },
  addBattleComment: async (id: string, comment: { author: string, content: string }) => {
    const res = await fetch(`${API_URL}/battles/${id}/comments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${publicAnonKey}` },
      body: JSON.stringify(comment)
    });
    return res.json();
  }
};

export default function App() {
  // Global State
  const [users, setUsers] = useState<UserAccount[]>([]);
  const [currentUser, setCurrentUser] = useState<UserAccount | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // UI State
  const [activeTab, setActiveTab] = useState<'log' | 'wiki' | 'pk' | 'admin' | 'admin_accounts' | 'export'>('log');
  const [isRegistering, setIsRegistering] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [settingsForm, setSettingsForm] = useState({ email: '', password: '' });
  const [adminLogFilter, setAdminLogFilter] = useState<'all' | 'my'>('my');
  const [adminManageFilter, setAdminManageFilter] = useState<'all' | 'my'>('all');
  
  // Data State
  const [logs, setLogs] = useState<Log[]>([]);
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [battles, setBattles] = useState<Battle[]>([]);
  
  // Auth Input State
  const [usernameInput, setUsernameInput] = useState('');
  const [passwordInput, setPasswordInput] = useState('');
  const [roleInput, setRoleInput] = useState<UserRole>('student');
  const [loginError, setLoginError] = useState('');

  // Form State
  const [newItem, setNewItem] = useState({ exercise: '', weight: '', reps: '', sets: '', muscle: '' });
  const [sessionNotes, setSessionNotes] = useState('');
  const [currentSessionItems, setCurrentSessionItems] = useState<LogItem[]>([]);
  
  const [newExercise, setNewExercise] = useState({ name: '', muscle: '', guide: '', imageUrl: '' });
  
  // Battle Form State
  const [isCreatingBattle, setIsCreatingBattle] = useState(false);
  const [isSelectingLog, setIsSelectingLog] = useState(false);
  const [isLogModalOpen, setIsLogModalOpen] = useState(false);
  const [newBattle, setNewBattle] = useState({ title: '', routine: '' });
  const [battleCommentInputs, setBattleCommentInputs] = useState<Record<string, string>>({});

  // Initial Data Fetch
  const fetchInitialData = async () => {
    setIsLoading(true);
    try {
      // Fetch Data and Session in parallel
      const [sessionRes, usersData, logsData, exercisesData, battlesData] = await Promise.all([
        supabase.auth.getSession(),
        api.getUsers(),
        api.getLogs(),
        api.getExercises(),
        api.getBattles()
      ]);

      setUsers(usersData);
      setLogs(logsData);
      setExercises(exercisesData);
      setBattles(battlesData);

      if (sessionRes.data.session) {
         const userId = sessionRes.data.session.user.id;
         // Try to find user in the fetched list first
         const foundUser = usersData.find((u: UserAccount) => u.id === userId);
         if (foundUser) {
           setCurrentUser(foundUser);
         } else {
           // Fallback fetch
           const res = await fetch(`${API_URL}/users/${userId}`, { headers: { Authorization: `Bearer ${publicAnonKey}` } });
           if (res.ok) {
             const userProfile = await res.json();
             setCurrentUser(userProfile);
           }
         }
      }
    } catch (err) {
      console.error("Failed to initialize:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchInitialData();
  }, []);

  // Handlers
  const handleUpdateAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!settingsForm.email && !settingsForm.password) return;
    
    try {
      const res = await api.updateAccount(settingsForm);
      if (res.error) throw new Error(res.error);
      alert("帳號資料已更新！(Account Updated)");
      setIsSettingsOpen(false);
      setSettingsForm({ email: '', password: '' });
    } catch (err: any) {
      alert("更新失敗: " + err.message);
    }
  };

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError('');
    
    if (!usernameInput.trim() || !passwordInput.trim()) {
      setLoginError('請輸入名稱與密碼');
      return;
    }

    const email = `${usernameInput}@pixelgym.com`;

    try {
      if (isRegistering) {
        // Use Backend Signup to skip email confirmation
        const res = await api.signup({
          email,
          password: passwordInput,
          name: usernameInput,
          role: roleInput
        });

        if (res.error) {
            if (res.error.includes("already been registered")) {
                throw new Error("此 Email 已被註冊，請直接登入 (Email already registered)");
            }
            throw new Error(res.error);
        }
        
        // Auto sign in after signup? 
        // Backend creates user, but doesn't return session.
        // We can try to sign in immediately.
        
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email,
          password: passwordInput,
        });
        
        if (signInError) {
           alert('註冊成功！請嘗試登入。');
           setIsRegistering(false);
        } else {
           // Reload logic removed to prevent white screen flash
           // Instead, fetch initial data to sync state
           await fetchInitialData();
        }
      } else {
        // Login
        const { data, error } = await supabase.auth.signInWithPassword({
          email: email,
          password: passwordInput,
        });

        if (error) throw error;
        
        if (data.user) {
           const res = await fetch(`${API_URL}/users/${data.user.id}`, { headers: { Authorization: `Bearer ${publicAnonKey}` } });
           if (!res.ok) {
             setLoginError('無法取得使用者資料');
             return;
           }
           const user = await res.json();
           
           if (user.status === 'disabled') {
             setLoginError('帳號已被停用');
             await supabase.auth.signOut();
             return;
           }
           
           if (user.status === 'pending' && user.role === 'coach' && user.name !== 'iisa') { // Basic check
             setLoginError('教練帳號審核中');
             await supabase.auth.signOut();
             return;
           }
           // Allow students to login even if pending? No, logic says wait for coach.
           // But code below handles "Block Student View if no coach assigned". 
           // We can allow login.

           setCurrentUser(user);
        }
      }
    } catch (err: any) {
      setLoginError(err.message || '認證失敗');
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setCurrentUser(null);
    setUsernameInput('');
    setPasswordInput('');
    setLoginError('');
    setIsRegistering(false);
    setActiveTab('log');
  };

  // Coach Admin Handlers
  const approveUser = async (userId: string) => {
    const user = users.find(u => u.id === userId);
    if (!user) return;
    const updated = { ...user, status: 'active' as UserStatus };
    await api.createUser(updated); // Upsert
    setUsers(users.map(u => u.id === userId ? updated : u));
  };

  const toggleUserStatus = async (userId: string) => {
    const user = users.find(u => u.id === userId);
    if (!user) return;
    const newStatus = user.status === 'active' ? 'disabled' : 'active';
    const updated = { ...user, status: newStatus as UserStatus };
    await api.createUser(updated);
    setUsers(users.map(u => u.id === userId ? updated : u));
  };

  const assignCoach = async (studentId: string, coachId: string) => {
    const user = users.find(u => u.id === studentId);
    if (!user) return;
    const updated = { ...user, coachId };
    await api.createUser(updated);
    setUsers(users.map(u => u.id === studentId ? updated : u));
  };

  const deleteUser = async (userId: string) => {
    if (window.confirm('確定要刪除此帳號嗎？此操作無法復原。')) {
      await api.deleteUser(userId);
      setUsers(users.filter(u => u.id !== userId));
    }
  };

  const handleAddItem = () => {
    if (!newItem.exercise) return;
    const item: LogItem = {
      id: Date.now().toString(),
      exercise: newItem.exercise,
      weight: Number(newItem.weight) || 0,
      reps: Number(newItem.reps) || 0,
      sets: Number(newItem.sets) || 0,
      muscle: newItem.muscle || '全身',
    };
    setCurrentSessionItems([...currentSessionItems, item]);
    setNewItem({ exercise: '', weight: '', reps: '', sets: '', muscle: '' });
  };

  const handleRemoveItem = (id: string) => {
    setCurrentSessionItems(currentSessionItems.filter(i => i.id !== id));
  };

  const handleSubmitSession = async (e: React.FormEvent) => {
    e.preventDefault();
    if (currentSessionItems.length === 0) {
      alert("請至少新增一個項目！");
      return;
    }
    
    const log: Log = {
      id: Date.now().toString(),
      studentId: currentUser?.id || '',
      date: new Date(),
      items: currentSessionItems,
      notes: sessionNotes,
      isHidden: false
    };
    
    await api.createLog(log);
    setLogs([log, ...logs]);
    
    // Reset form
    setCurrentSessionItems([]);
    setSessionNotes('');
    setIsLogModalOpen(false); // Close modal
  };

  const handleUploadExercise = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newExercise.name || !newExercise.muscle) {
      alert("請填寫完整資訊");
      return;
    }

    const exercise: Exercise = {
      id: Date.now().toString(),
      name: newExercise.name,
      muscle: newExercise.muscle,
      guide: newExercise.guide || '無介紹',
      imageUrl: 'https://images.unsplash.com/photo-1608067008273-aaff95eca6ce?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxwaXhlbCUyMGFydCUyMGd5bSUyMGVxdWlwbWVudHxlbnwxfHx8fDE3Njk2NTA1MDl8MA&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral', // Default placeholder
      author: currentUser?.name || 'Unknown'
    };

    await api.createExercise(exercise);
    setExercises([exercise, ...exercises]);
    alert("Wiki更新成功！");
    setNewExercise({ name: '', muscle: '', guide: '', imageUrl: '' });
  };

  // Coach Actions
  const toggleHideLog = async (id: string) => {
    const log = logs.find(l => l.id === id);
    if (!log) return;
    const newHidden = !log.isHidden;
    await api.updateLog(id, { isHidden: newHidden });
    setLogs(logs.map(l => l.id === id ? { ...l, isHidden: newHidden } : l));
  };

  const deleteLog = async (id: string) => {
    if (window.confirm('確定要刪除這條記錄嗎？(Are you sure?)')) {
      await api.deleteLog(id);
      setLogs(logs.filter(log => log.id !== id));
    }
  };

  const updateLogFeedback = async (id: string, score: number | undefined, comment: string) => {
    await api.updateLog(id, { score, coachComment: comment, coachIdWhoCommented: currentUser?.id });
    setLogs(logs.map(log => 
      log.id === id ? { 
        ...log, 
        score, 
        coachComment: comment,
        coachIdWhoCommented: currentUser?.id 
      } : log
    ));
    alert('評分與備註已更新！');
  };

  // Battle Handlers
  const handleCreateBattle = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newBattle.title || !newBattle.routine) return;

    const battle: Battle = {
      id: Date.now().toString(),
      author: currentUser?.name || 'Anonymous',
      title: newBattle.title,
      likes: 0,
      routine: newBattle.routine.split('\n').filter(line => line.trim() !== '')
    };

    await api.createBattle(battle);
    setBattles([battle, ...battles]);
    setIsCreatingBattle(false);
    setNewBattle({ title: '', routine: '' });
  };

  const handleLikeBattle = async (id: string) => {
    const res = await api.likeBattle(id);
    if (res.success) {
      setBattles(battles.map(b => b.id === id ? res.battle : b));
    }
  };

  const handleAddBattleComment = async (battleId: string) => {
    const content = battleCommentInputs[battleId]?.trim();
    if (!content) return;

    const res = await api.addBattleComment(battleId, {
      author: currentUser?.name || 'Anonymous',
      content
    });

    if (res.success) {
      setBattles(battles.map(b => b.id === battleId ? res.battle : b));
      setBattleCommentInputs({ ...battleCommentInputs, [battleId]: '' });
    }
  };

  // Helper to filter visible logs
  const getVisibleLogs = () => {
    if (!currentUser) return [];

    if (currentUser.role === 'student') {
      return logs.filter(log => log.studentId === currentUser.id);
    }
    
    // Super Admin (iisa)
    if (currentUser.name === 'iisa') {
      if (adminLogFilter === 'all') return logs;
      // 'my' filter for Admin means students assigned to Admin (if any)
      // Usually Admin might not have students, but if they do:
      const myStudents = users.filter(u => u.coachId === currentUser.id).map(u => u.id);
      return logs.filter(log => myStudents.includes(log.studentId));
    }

    // Regular Coach sees only their assigned students' logs
    return logs.filter(log => {
      const student = users.find(u => u.id === log.studentId);
      return student && student.coachId === currentUser.id;
    });
  };

  // Render Functions
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-900 flex flex-col items-center justify-center font-[DotGothic16] text-white">
        <div className="relative">
          <div className="w-16 h-16 border-4 border-gray-600 rounded-full"></div>
          <div className="w-16 h-16 border-4 border-[#ffcd38] border-t-transparent rounded-full animate-spin absolute top-0 left-0"></div>
        </div>
        <h2 className="text-2xl font-bold text-[#ffcd38] mt-6 animate-pulse tracking-widest">LOADING...</h2>
        <p className="text-gray-500 text-xs mt-2 font-mono">PIXEL GYM SYSTEM v1.0</p>
      </div>
    );
  }

  if (!currentUser) {
    return (
      <div className="min-h-screen bg-[#f0f0f0] flex items-center justify-center p-4">
        <PixelCard className="w-full max-w-md z-10 animate-in fade-in zoom-in duration-300">
          <div className="text-center mb-6">
            <h1 className="text-4xl font-bold mb-2 text-[#ffcd38] text-shadow-pixel tracking-widest">PIXEL GYM</h1>
            <p className="text-gray-500 uppercase text-xs font-bold tracking-widest">
              {isRegistering ? 'Create New Account' : 'Welcome Back'}
            </p>
          </div>
          
          <form onSubmit={handleAuth} className="space-y-6">
            <PixelInput 
              label="帳號 (Name)" 
              value={usernameInput}
              onChange={(e) => setUsernameInput(e.target.value)}
              placeholder="Enter your name..."
            />

            <PixelInput 
              label="密碼 (Password)" 
              type="password"
              value={passwordInput}
              onChange={(e) => setPasswordInput(e.target.value)}
              placeholder="Enter your password..."
            />
            
            {isRegistering && (
              <div className="space-y-2">
                <label className="font-bold text-gray-900 uppercase text-sm">角色 (Role)</label>
                <div className="flex gap-4">
                  <button
                    type="button"
                    onClick={() => setRoleInput('student')}
                    className={`flex-1 p-4 border-4 transition-all ${roleInput === 'student' ? 'border-[#ffcd38] bg-gray-900 text-white' : 'border-gray-200 bg-white text-gray-400'}`}
                  >
                    <User className="w-6 h-6 mx-auto mb-2" />
                    <div className="text-center font-bold">學員</div>
                  </button>
                  <button
                    type="button"
                    onClick={() => setRoleInput('coach')}
                    className={`flex-1 p-4 border-4 transition-all ${roleInput === 'coach' ? 'border-[#ff6b6b] bg-gray-900 text-white' : 'border-gray-200 bg-white text-gray-400'}`}
                  >
                    <Trophy className="w-6 h-6 mx-auto mb-2" />
                    <div className="text-center font-bold">教練</div>
                  </button>
                </div>
              </div>
            )}

            {loginError && (
              <div className="bg-red-100 border-2 border-red-500 text-red-500 p-2 text-sm font-bold text-center">
                {loginError}
              </div>
            )}

            <PixelButton type="submit" className="w-full" size="lg">
              {isRegistering ? 'REGISTER' : 'LOGIN'}
            </PixelButton>

            <div className="text-center">
              <button 
                type="button"
                onClick={() => {
                  setIsRegistering(!isRegistering);
                  setLoginError('');
                }}
                className="text-gray-400 text-xs hover:text-white underline"
              >
                {isRegistering ? '已有帳號？登入 (Login)' : '沒有帳號？註冊 (Register)'}
              </button>
            </div>
          </form>
        </PixelCard>
      </div>
    );
  }

  // Block Student View if no coach assigned
  if (currentUser.role === 'student' && !currentUser.coachId) {
    return (
      <div className="min-h-screen bg-[#f0f0f0] flex flex-col font-[DotGothic16]">
        <header className="bg-gray-900 text-white p-4 border-b-4 border-black sticky top-0 z-50">
          <div className="max-w-4xl mx-auto flex justify-between items-center">
            <h1 className="text-xl font-bold text-[#ffcd38]">PIXEL GYM</h1>
            <PixelButton variant="outline" size="sm" onClick={handleLogout} className="bg-gray-800 border-gray-600 text-white">
              <LogOut className="w-4 h-4" />
            </PixelButton>
          </div>
        </header>
        <div className="flex-1 flex items-center justify-center p-4">
          <PixelCard className="max-w-md text-center">
            <div className="mb-4 flex justify-center">
              <div className="w-16 h-16 bg-gray-200 rounded-full flex items-center justify-center border-4 border-black">
                <User className="w-8 h-8 text-gray-400" />
              </div>
            </div>
            <h2 className="text-2xl font-bold mb-2">等待教練分發</h2>
            <p className="text-gray-600 mb-6">
              您的帳號已啟用，但目前尚未分配專屬教練。<br/>
              請聯繫管理員 (iisa) 為您安排教練後即可開始使用完整功能。
            </p>
            <div className="bg-yellow-100 border-2 border-yellow-400 p-2 text-xs text-yellow-700 font-bold">
              STATUS: WAITING_FOR_COACH
            </div>
          </PixelCard>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f0f0f0] flex flex-col font-[DotGothic16]">
      {/* Header */}
      <header className="bg-gray-900 text-white p-4 border-b-4 border-black sticky top-0 z-50">
        <div className="max-w-4xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-[#ffcd38] border-2 border-white flex items-center justify-center text-black font-bold text-xl">
              P
            </div>
            <div>
              <h1 className="text-xl font-bold leading-none text-[#ffcd38]">PIXEL GYM</h1>
              <div className="flex items-center gap-2 text-xs text-gray-400 mt-1">
                <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
                {currentUser.name === 'iisa' ? 'Super Admin' : `Level ${currentUser.role === 'coach' ? '99' : '1'} ${currentUser.role === 'coach' ? 'Coach' : 'Student'}`}
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            <div className="hidden md:block text-right">
              <p className="font-bold text-[#4ecdc4]">{currentUser.name}</p>
              <div className="text-xs text-gray-400 flex flex-col items-end">
                <span>Status: Active</span>
                {currentUser.role === 'student' && currentUser.coachId && (
                  <span className="text-[#ffcd38]">Coach: {users.find(u => u.id === currentUser.coachId)?.name}</span>
                )}
              </div>
            </div>
            <button 
              onClick={() => setIsSettingsOpen(true)}
              className="bg-gray-800 border-2 border-gray-600 text-white p-2 hover:bg-gray-700 transition-colors"
              title="帳號設定"
            >
              <Settings className="w-4 h-4" />
            </button>
            <PixelButton variant="outline" size="sm" onClick={handleLogout} className="bg-gray-800 border-gray-600 text-white hover:bg-gray-700">
              <LogOut className="w-4 h-4" />
            </PixelButton>
          </div>
        </div>
      </header>

      {/* Settings Modal */}
      {isSettingsOpen && (
        <div className="fixed inset-0 bg-black/80 z-[60] flex items-center justify-center p-4 backdrop-blur-sm">
          <PixelCard className="w-full max-w-sm relative animate-in zoom-in duration-200">
            <button 
              onClick={() => setIsSettingsOpen(false)}
              className="absolute top-2 right-2 text-gray-400 hover:text-black"
            >
              <X className="w-6 h-6" />
            </button>
            <h3 className="text-xl font-bold mb-6 flex items-center gap-2 border-b-4 border-black pb-2">
              <Settings className="w-6 h-6" /> 帳號設定 (Settings)
            </h3>
            <form onSubmit={handleUpdateAccount} className="space-y-4">
              <PixelInput 
                label="更新 Email" 
                type="email"
                placeholder="New Email..."
                value={settingsForm.email}
                onChange={e => setSettingsForm({...settingsForm, email: e.target.value})}
              />
              <PixelInput 
                label="更新密碼 (Password)" 
                type="password"
                placeholder="New Password..."
                value={settingsForm.password}
                onChange={e => setSettingsForm({...settingsForm, password: e.target.value})}
              />
              <div className="pt-2">
                <PixelButton type="submit" className="w-full" variant="accent">
                  確認更新 (UPDATE)
                </PixelButton>
              </div>
            </form>
          </PixelCard>
        </div>
      )}

      {/* Main Nav */}
      <nav className="bg-white border-b-4 border-black p-2 overflow-x-auto">
        <div className="max-w-4xl mx-auto flex gap-4 min-w-max">
          <button 
            onClick={() => setActiveTab('log')}
            className={`flex items-center gap-2 px-6 py-3 font-bold border-4 transition-all ${activeTab === 'log' ? 'bg-[#ffcd38] border-black shadow-[4px_4px_0_0_black] -translate-y-1' : 'bg-gray-100 border-transparent text-gray-500 hover:bg-gray-200'}`}
          >
            <Dumbbell className="w-5 h-5" />
            健身日記
          </button>
          <button 
            onClick={() => setActiveTab('wiki')}
            className={`flex items-center gap-2 px-6 py-3 font-bold border-4 transition-all ${activeTab === 'wiki' ? 'bg-[#4ecdc4] border-black shadow-[4px_4px_0_0_black] -translate-y-1' : 'bg-gray-100 border-transparent text-gray-500 hover:bg-gray-200'}`}
          >
            <BookOpen className="w-5 h-5" />
            動作圖鑑
          </button>
          <button 
            onClick={() => setActiveTab('pk')}
            className={`flex items-center gap-2 px-6 py-3 font-bold border-4 transition-all ${activeTab === 'pk' ? 'bg-[#ff6b6b] border-black shadow-[4px_4px_0_0_black] -translate-y-1 text-white' : 'bg-gray-100 border-transparent text-gray-500 hover:bg-gray-200'}`}
          >
            <Sword className="w-5 h-5" />
            PK 對戰板
          </button>
          {currentUser.role === 'coach' && (
             <button 
             onClick={() => setActiveTab('admin')}
             className={`flex items-center gap-2 px-6 py-3 font-bold border-4 transition-all ${activeTab === 'admin' ? 'bg-gray-800 text-white border-black shadow-[4px_4px_0_0_black] -translate-y-1' : 'bg-gray-100 border-transparent text-gray-500 hover:bg-gray-200'}`}
           >
             <User className="w-5 h-5" />
             我的學員
           </button>
          )}

          {currentUser.name === 'iisa' && (
            <>
               <button 
               onClick={() => setActiveTab('admin_accounts')}
               className={`flex items-center gap-2 px-6 py-3 font-bold border-4 transition-all ${activeTab === 'admin_accounts' ? 'bg-[#ffcd38] border-black shadow-[4px_4px_0_0_black] -translate-y-1' : 'bg-gray-100 border-transparent text-gray-500 hover:bg-gray-200'}`}
             >
               <User className="w-5 h-5" />
               帳號管理
             </button>
            </>
          )}
          
          {currentUser.name === 'iisa' && (
             <button 
             onClick={() => setActiveTab('export')}
             className={`flex items-center gap-2 px-6 py-3 font-bold border-4 transition-all ${activeTab === 'export' ? 'bg-[#9333ea] text-white border-black shadow-[4px_4px_0_0_black] -translate-y-1' : 'bg-gray-100 border-transparent text-gray-500 hover:bg-gray-200'}`}
           >
             <Share2 className="w-5 h-5" />
             記錄匯出
           </button>
          )}
        </div>
      </nav>

      {/* Content Area */}
      <main className="flex-1 max-w-4xl mx-auto w-full p-4 md:p-6 space-y-6">
        
        {/* LOG TAB */}
        {activeTab === 'log' && (
          <div className="flex flex-col-reverse md:grid md:grid-cols-[1fr_300px] gap-6 animate-in slide-in-from-bottom-4 duration-500">
            <div className="space-y-6">
              
              {/* MEMBER VIEW: Add Log */}
              {currentUser.role === 'student' && (
                <>
                  <PixelCard 
                    className="border-dashed border-gray-400 bg-gray-50 p-4 md:p-6 flex flex-row md:flex-col items-center justify-center gap-4 hover:bg-gray-100 transition-colors cursor-pointer group mb-6" 
                    onClick={() => setIsLogModalOpen(true)}
                  >
                    <div className="w-12 h-12 md:w-16 md:h-16 rounded-full bg-white border-4 border-black flex items-center justify-center group-hover:scale-110 transition-transform shadow-[4px_4px_0_0_rgba(0,0,0,0.2)] flex-shrink-0">
                      <Plus className="w-5 h-5 md:w-8 md:h-8 text-[#ff6b6b]" />
                    </div>
                    <h3 className="font-bold text-base md:text-xl text-gray-500 group-hover:text-black">記錄今日戰果 (Log New Workout)</h3>
                  </PixelCard>

                  {isLogModalOpen && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
                      <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto">
                        <PixelCard className="relative shadow-[8px_8px_0_0_#4ecdc4] border-4 border-black">
                          <button 
                            onClick={() => setIsLogModalOpen(false)}
                            className="absolute top-4 right-4 text-gray-400 hover:text-black bg-white border-2 border-black p-1 hover:bg-red-100"
                          >
                            <X className="w-6 h-6" />
                          </button>

                          <h2 className="text-xl font-bold mb-4 flex items-center gap-2 border-b-4 border-black pb-2 text-[#ff6b6b]">
                            <Dumbbell className="w-6 h-6" /> 記錄今日戰果 (Daily Workout)
                          </h2>
                          
                          {/* Current Items List */}
                          {currentSessionItems.length > 0 && (
                            <div className="mb-6 space-y-2">
                              <h4 className="font-bold text-gray-500 text-sm uppercase">本次項目 (Items)</h4>
                              {currentSessionItems.map((item, idx) => (
                                <div key={item.id} className="bg-gray-100 border-2 border-gray-300 p-2 flex justify-between items-center text-sm">
                                   <div className="flex gap-2 items-center">
                                      <span className="bg-black text-white w-5 h-5 flex items-center justify-center text-xs font-bold rounded-full">{idx + 1}</span>
                                      <span className="font-bold">{item.exercise}</span>
                                      <span className="text-gray-500">{item.weight}kg x {item.sets}組 x {item.reps}下</span>
                                   </div>
                                   <button onClick={() => handleRemoveItem(item.id)} className="text-red-500 hover:text-red-700">
                                      <Trash2 size={16} />
                                   </button>
                                </div>
                              ))}
                            </div>
                          )}

                          <div className="space-y-4 border-b-4 border-dotted border-gray-300 pb-6 mb-6">
                            <div className="grid grid-cols-2 gap-4">
                              <div>
                                <PixelInput 
                                  label="項目 (Exercise)" 
                                  placeholder="e.g. Bench Press" 
                                  value={newItem.exercise}
                                  list="exercise-list"
                                  onChange={e => {
                                    const val = e.target.value;
                                    const existing = exercises.find(ex => ex.name.toLowerCase() === val.toLowerCase());
                                    setNewItem(prev => ({
                                      ...prev,
                                      exercise: val,
                                      muscle: existing ? existing.muscle : prev.muscle
                                    }));
                                  }}
                                />
                                <datalist id="exercise-list">
                                  {exercises.map(ex => (
                                    <option key={ex.id} value={ex.name} />
                                  ))}
                                </datalist>
                              </div>
                              <PixelInput 
                                label="部位 (Muscle)" 
                                placeholder="e.g. Chest" 
                                value={newItem.muscle}
                                onChange={e => setNewItem({...newItem, muscle: e.target.value})}
                              />
                            </div>
                            <div className="grid grid-cols-3 gap-4">
                              <PixelInput 
                                label="重量 (Kg)" 
                                type="number" 
                                placeholder="0" 
                                value={newItem.weight}
                                onChange={e => setNewItem({...newItem, weight: e.target.value})}
                              />
                              <PixelInput 
                                label="組數 (Sets)" 
                                type="number" 
                                placeholder="0" 
                                value={newItem.sets}
                                onChange={e => setNewItem({...newItem, sets: e.target.value})}
                              />
                              <PixelInput 
                                label="次數 (Reps)" 
                                type="number" 
                                placeholder="0" 
                                value={newItem.reps}
                                onChange={e => setNewItem({...newItem, reps: e.target.value})}
                              />
                            </div>
                            <PixelButton type="button" onClick={handleAddItem} variant="outline" className="w-full border-dashed">
                              <Plus className="w-4 h-4" /> 增加項目 (Add Item)
                            </PixelButton>
                          </div>
                          
                          <div className="space-y-4">
                            <PixelInput 
                              label="整組心得/筆記 (Session Notes)" 
                              placeholder="今天的狀況如何？" 
                              value={sessionNotes}
                              onChange={e => setSessionNotes(e.target.value)}
                            />
                            <PixelButton onClick={handleSubmitSession} className="w-full" variant="primary">
                               完成今日鍛鍊 (FINISH WORKOUT)
                            </PixelButton>
                          </div>
                        </PixelCard>
                      </div>
                    </div>
                  )}
                </>
              )}

              {/* COACH VIEW: Student Logs List */}
              {currentUser.role === 'coach' ? (
                <div className="space-y-4">
                  <div className="flex justify-between items-center mb-2">
                    <h3 className="font-bold text-lg text-[#ff6b6b] flex items-center gap-2">
                       <User className="w-5 h-5"/> 學員菜單審核 (Student Logs)
                    </h3>
                    
                    {currentUser.name === 'iisa' && (
                      <div className="flex gap-2">
                         <button 
                           onClick={() => setAdminLogFilter('my')}
                           className={`px-3 py-1 text-xs font-bold border-2 border-black ${adminLogFilter === 'my' ? 'bg-[#ffcd38] text-black' : 'bg-white text-gray-500'}`}
                         >
                           我的學員
                         </button>
                         <button 
                           onClick={() => setAdminLogFilter('all')}
                           className={`px-3 py-1 text-xs font-bold border-2 border-black ${adminLogFilter === 'all' ? 'bg-[#ffcd38] text-black' : 'bg-white text-gray-500'}`}
                         >
                           全部學員
                         </button>
                      </div>
                    )}
                    
                    <PixelBadge>{getVisibleLogs().filter(l => !l.coachComment && l.score === undefined).length} 待審核</PixelBadge>
                  </div>
                  
                  {getVisibleLogs().length === 0 ? (
                    <PixelCard className="text-center text-gray-400 py-10 border-dashed">
                      目前沒有學員提交記錄
                    </PixelCard>
                  ) : (
                    getVisibleLogs().map(log => {
                      const student = users.find(u => u.id === log.studentId);
                      const currentCoach = users.find(u => u.id === student?.coachId);
                      const commentingCoach = users.find(u => u.id === log.coachIdWhoCommented);
                      
                      return (
                      <div key={log.id} className={`transition-all ${log.isHidden ? 'opacity-50 grayscale' : ''}`}>
                         <PixelCard className="border-black border-4 shadow-[6px_6px_0_0_rgba(0,0,0,0.2)] p-0 overflow-hidden relative">
                            {/* Header Bar */}
                            <div className="bg-gray-900 text-white p-3 flex justify-between items-center">
                               <div className="flex items-center gap-2">
                                  <div className="w-8 h-8 bg-[#4ecdc4] rounded-full border-2 border-white flex items-center justify-center text-black font-bold">
                                    {student?.name[0] || '?'}
                                  </div>
                                  <div>
                                    <span className="font-bold block">{student?.name}</span>
                                    {/* Super Admin sees which coach is assigned */}
                                    {currentUser.name === 'iisa' && currentCoach && (
                                        <span className="text-[10px] text-[#ffcd38] flex items-center gap-1">
                                            <User size={10} /> Coach: {currentCoach.name}
                                        </span>
                                    )}
                                  </div>
                               </div>
                               <div className="flex gap-2">
                                  <button onClick={() => toggleHideLog(log.id)} className="hover:text-[#4ecdc4] transition-colors" title={log.isHidden ? "顯示" : "隱藏"}>
                                     {log.isHidden ? <EyeOff size={18} /> : <Eye size={18} />}
                                  </button>
                                  <button onClick={() => deleteLog(log.id)} className="hover:text-[#ff6b6b] transition-colors" title="刪除">
                                     <Trash2 size={18} />
                                  </button>
                               </div>
                            </div>
                            
                            {/* Content */}
                            <div className="p-4">
                               <div className="mb-4 flex justify-between items-center border-b-2 border-gray-100 pb-2">
                                  <span className="font-bold text-lg text-gray-800">健身日記</span>
                                  <div className="text-xs font-mono text-gray-400">
                                     {format(log.date, 'yyyy/MM/dd HH:mm')}
                                  </div>
                               </div>

                               <div className="space-y-2 mb-4">
                                  {log.items.map((item, idx) => (
                                    <div key={item.id} className="flex justify-between items-center text-sm p-2 bg-gray-50 border border-gray-200">
                                       <div className="flex items-center gap-2">
                                          <span className="text-gray-400 font-bold w-4">{idx + 1}.</span>
                                          <span className="font-bold">{item.exercise}</span>
                                          <PixelBadge variant="warning" className="text-[10px] py-0">{item.muscle}</PixelBadge>
                                       </div>
                                       <div className="font-mono font-bold text-gray-600">
                                          {item.weight}kg x {item.sets}組 x {item.reps}
                                       </div>
                                    </div>
                                  ))}
                               </div>
                               
                               <div className="bg-[#fffbeb] border-2 border-[#fcd34d] p-3 mb-4 text-sm text-gray-600 relative">
                                  <span className="absolute -top-2 left-2 bg-[#fffbeb] px-1 text-xs font-bold text-[#b45309]">學員心得</span>
                                  {log.notes || "無筆記"}
                               </div>

                               {/* Coach Feedback Section */}
                               <div className="border-t-2 border-dashed border-gray-300 pt-4 mt-2">
                                  <div className="flex flex-col gap-3">
                                     {log.coachComment && commentingCoach && currentUser.name === 'iisa' && (
                                         <div className="text-[10px] text-gray-400 font-bold mb-1">
                                             Rated by: {commentingCoach.name}
                                         </div>
                                     )}
                                     
                                     <div className="flex items-center gap-4">
                                        <label className="font-bold text-sm flex items-center gap-1">
                                           <Star className="w-4 h-4 text-[#ffcd38] fill-current" /> 評分:
                                        </label>
                                        <input 
                                           type="number" 
                                           min="0" 
                                           max="100" 
                                           defaultValue={log.score}
                                           className="w-20 border-2 border-black p-1 text-center font-bold"
                                           placeholder="0-100"
                                           id={`score-${log.id}`}
                                        />
                                     </div>
                                     <div className="flex gap-2">
                                        <input 
                                           type="text" 
                                           defaultValue={log.coachComment}
                                           className="flex-1 border-2 border-gray-300 p-2 text-sm focus:border-black outline-none"
                                           placeholder="給予指導建議..."
                                           id={`comment-${log.id}`}
                                        />
                                        <PixelButton 
                                           size="sm" 
                                           onClick={() => {
                                              const scoreInput = document.getElementById(`score-${log.id}`) as HTMLInputElement;
                                              const commentInput = document.getElementById(`comment-${log.id}`) as HTMLInputElement;
                                              updateLogFeedback(log.id, Number(scoreInput.value), commentInput.value);
                                           }}
                                        >
                                           <MessageSquare className="w-4 h-4" /> 評分
                                        </PixelButton>
                                     </div>
                                  </div>
                               </div>
                            </div>
                         </PixelCard>
                      </div>
                    )})
                  )}
                </div>
              ) : (
                /* MEMBER VIEW: Log History */
                <div className="space-y-4">
                  <h3 className="font-bold text-lg text-gray-500">紀錄 (Logs)</h3>
                  {getVisibleLogs().length === 0 ? (
                    <div className="text-center py-10 border-4 border-dashed border-gray-300 text-gray-400">
                      尚無記錄，快開始鍛鍊吧！
                    </div>
                  ) : (
                    getVisibleLogs().map(log => (
                      <div key={log.id} className="bg-white border-2 border-black p-4 shadow-[4px_4px_0_0_rgba(0,0,0,0.1)]">
                        <div className="flex justify-between items-center mb-4 border-b pb-2">
                           <div className="flex items-center gap-2">
                              <span className="font-bold text-lg text-gray-800">Workout Session</span>
                              {(currentUser.id === log.studentId || currentUser.role === 'coach') && (
                                <button 
                                  onClick={(e) => { e.stopPropagation(); deleteLog(log.id); }}
                                  className="text-gray-400 hover:text-red-500 transition-colors"
                                  title="Delete Log"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              )}
                           </div>
                           <span className="text-xs font-mono text-gray-400">{format(log.date, 'MM/dd HH:mm')}</span>
                        </div>
                        
                        <div className="space-y-2 mb-4">
                           {log.items.map((item, idx) => (
                              <div key={item.id} className="flex justify-between items-center text-sm border-b border-gray-100 last:border-0 py-1">
                                 <div className="flex items-center gap-2">
                                    <span className="text-gray-300 font-bold w-4">{idx + 1}.</span>
                                    <span className="font-bold">{item.exercise}</span>
                                    <span className="text-xs bg-gray-100 px-1 rounded text-gray-500">{item.muscle}</span>
                                 </div>
                                 <div className="font-mono text-gray-600">
                                    {item.weight}kg x {item.reps}
                                 </div>
                              </div>
                           ))}
                        </div>

                        {log.notes && (
                           <div className="text-xs text-gray-500 bg-gray-50 p-2 border border-gray-200 italic mb-2">
                              "{log.notes}"
                           </div>
                        )}

                        {/* Coach Feedback for Student */}
                        {(log.coachComment || log.score !== undefined) && (
                           <div className="mt-4 pt-3 border-t-2 border-dashed border-black bg-[#fff5f5] -mx-4 px-4 pb-2">
                              <div className="flex items-center gap-2 mb-1">
                                 <User className="w-4 h-4 text-[#ff6b6b]" />
                                 <span className="font-bold text-sm text-[#ff6b6b]">教練回饋 (Coach Feedback)</span>
                              </div>
                              
                              <div className="flex items-start gap-3">
                                 {log.score !== undefined && (
                                    <div className="flex flex-col items-center bg-white border-2 border-[#ff6b6b] p-1 min-w-[50px]">
                                       <Star className="w-4 h-4 text-[#ffcd38] fill-current" />
                                       <span className="font-bold text-lg leading-none mt-1">{log.score}</span>
                                    </div>
                                 )}
                                 
                                 {log.coachComment && (
                                    <div className="text-sm text-gray-700 py-1 font-bold">
                                       {log.coachComment}
                                    </div>
                                 )}
                              </div>
                           </div>
                        )}
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>

            {/* Sidebar Stats */}
            <div className="space-y-6">
              <PixelCard variant="accent" className="text-center p-2 md:p-4">
                <Flame className="w-8 h-8 md:w-12 md:h-12 mx-auto mb-1 md:mb-2 text-gray-900" />
                <div className="text-2xl md:text-4xl font-bold mb-0 md:mb-1">{getVisibleLogs().length}</div>
                <div className="text-xs md:text-sm font-bold uppercase">{currentUser.role === 'coach' ? 'Reviews' : 'Total Workouts'}</div>
              </PixelCard>
            </div>
           </div>
         )}


        {/* WIKI TAB */}
        {activeTab === 'wiki' && (
          <div className="space-y-6 animate-in slide-in-from-right-4 duration-500">
             {currentUser.role === 'coach' && (
              <PixelCard className="border-dashed border-gray-400 bg-gray-50">
                <h3 className="font-bold text-lg mb-4 text-[#ff6b6b] flex items-center gap-2">
                  <Camera className="w-5 h-5" /> 教練上傳區 (Coach Zone)
                </h3>
                <form onSubmit={handleUploadExercise} className="grid md:grid-cols-2 gap-4">
                  <PixelInput 
                    label="動作名稱" 
                    value={newExercise.name} 
                    onChange={e => setNewExercise({...newExercise, name: e.target.value})}
                  />
                  <PixelInput 
                    label="部位" 
                    value={newExercise.muscle} 
                    onChange={e => setNewExercise({...newExercise, muscle: e.target.value})}
                  />
                  <div className="md:col-span-2">
                     <PixelInput 
                      label="姿勢介紹 / 重點" 
                      value={newExercise.guide} 
                      onChange={e => setNewExercise({...newExercise, guide: e.target.value})}
                    />
                  </div>
                  <PixelButton variant="secondary" type="submit">發布新動作</PixelButton>
                </form>
              </PixelCard>
            )}

            <div className="grid md:grid-cols-2 gap-6">
              {exercises.map(ex => (
                <PixelCard key={ex.id} className="p-0 overflow-hidden flex flex-col">
                  <div className="h-48 bg-gray-200 relative border-b-4 border-black">
                     <ImageWithFallback 
                        src={ex.imageUrl} 
                        alt={ex.name}
                        className="w-full h-full object-cover"
                     />
                     <div className="absolute top-2 right-2">
                        <PixelBadge variant="warning">{ex.muscle}</PixelBadge>
                     </div>
                  </div>
                  <div className="p-4 flex-1 flex flex-col">
                    <h3 className="text-xl font-bold mb-2">{ex.name}</h3>
                    <p className="text-sm text-gray-600 mb-4 flex-1">{ex.guide}</p>
                    <div className="mt-4 pt-4 border-t-2 border-dashed border-gray-300 flex justify-between items-center text-xs text-gray-500">
                      <div className="flex items-center gap-1 font-bold text-gray-700">
                        <User className="w-3 h-3" />
                        <span>Coach {ex.author}</span>
                      </div>
                      <button className="text-[#4ecdc4] font-bold hover:underline">查看詳情 &gt;</button>
                    </div>
                  </div>
                </PixelCard>
              ))}
            </div>
          </div>
        )}

        {/* PK TAB */}
        {activeTab === 'pk' && (
          <div className="space-y-6 animate-in slide-in-from-right-4 duration-500">
             <div className="flex justify-between items-end mb-4">
                <h2 className="text-2xl font-bold text-shadow-pixel text-[#ff6b6b]">BATTLE ARENA</h2>
                {currentUser.role !== 'coach' && (
                   <PixelButton size="sm" variant="outline" onClick={() => setIsCreatingBattle(!isCreatingBattle)}>
                     {isCreatingBattle ? '取消 (Cancel)' : <><Plus className="w-4 h-4 mr-1"/> 分享我的菜單</>}
                   </PixelButton>
                )}
             </div>

             {isCreatingBattle && currentUser.role !== 'coach' && (
                <PixelCard className="mb-6 border-dashed border-[#ff6b6b] bg-[#fff5f5]">
                  <div className="flex justify-between items-center mb-4">
                     <h3 className="font-bold">發起挑戰 (Create Challenge)</h3>
                     <PixelButton 
                        size="sm" 
                        variant="outline" 
                        onClick={() => setIsSelectingLog(!isSelectingLog)}
                        className="bg-white text-xs"
                     >
                        <BookOpen className="w-4 h-4 mr-1"/> 
                        {isSelectingLog ? '關閉 (Close)' : '從日記匯入 (Import Log)'}
                     </PixelButton>
                  </div>

                  {isSelectingLog && (
                     <div className="mb-4 bg-white border-2 border-gray-300 p-3 max-h-60 overflow-y-auto space-y-2 animate-in slide-in-from-top-2">
                        <div className="text-xs text-gray-400 font-bold mb-2 uppercase">Select a log to import routine</div>
                        {getVisibleLogs().length === 0 ? (
                           <div className="text-center text-gray-400 text-xs py-4">無可用日記</div>
                        ) : (
                           getVisibleLogs().slice(0, 10).map(log => {
                              const student = users.find(u => u.id === log.studentId);
                              return (
                                 <div 
                                    key={log.id} 
                                    className="p-2 border border-gray-200 hover:bg-gray-50 hover:border-[#ff6b6b] cursor-pointer flex justify-between items-center text-sm transition-colors"
                                    onClick={() => {
                                       const routineText = log.items.map(item => `${item.exercise} - ${item.weight}kg x ${item.sets} x ${item.reps}`).join('\n');
                                       setNewBattle({
                                          ...newBattle,
                                          title: `Challenge from ${format(new Date(log.date), 'MM/dd')}`,
                                          routine: routineText
                                       });
                                       setIsSelectingLog(false);
                                    }}
                                 >
                                    <div className="flex flex-col">
                                       <span className="font-bold">{format(new Date(log.date), 'yyyy-MM-dd')}</span>
                                       <span className="text-xs text-gray-500">{student?.name || 'Unknown'}</span>
                                    </div>
                                    <span className="text-xs bg-gray-100 px-2 py-1 rounded font-mono">{log.items.length} Items</span>
                                 </div>
                              );
                           })
                        )}
                     </div>
                  )}

                  <form onSubmit={handleCreateBattle} className="space-y-4">
                    <PixelInput 
                      label="挑戰標題 (Title)" 
                      placeholder="e.g. 100下伏地挺身大挑戰"
                      value={newBattle.title}
                      onChange={e => setNewBattle({...newBattle, title: e.target.value})}
                    />
                    <div>
                      <label className="font-bold text-gray-900 uppercase text-sm mb-1 block">菜單內容 (Routine)</label>
                      <textarea 
                        readOnly
                        className="w-full border-4 border-gray-200 p-2 font-mono focus:border-black outline-none min-h-[100px] bg-gray-100 text-gray-500 cursor-not-allowed"
                        placeholder="請點擊上方「從日記匯入」按鈕來選擇挑戰內容..."
                        value={newBattle.routine}
                      />
                    </div>
                    <PixelButton type="submit" variant="primary" className="w-full">發布挑戰 (PUBLISH)</PixelButton>
                  </form>
                </PixelCard>
             )}

             <div className="space-y-4">
                {battles.map(battle => {
                   const isMyBattle = battle.author === currentUser?.name;
                   return (
                   <div key={battle.id} className={`bg-white border-4 p-4 hover:-translate-y-1 transition-transform cursor-pointer relative ${
                        isMyBattle 
                          ? 'border-[#4ecdc4] shadow-[6px_6px_0px_0px_#2d7a75]' 
                          : 'border-black shadow-[6px_6px_0px_0px_#ff6b6b]'
                      }`}>
                      <div className={`absolute -top-3 -right-3 border-2 border-black px-2 py-1 font-bold text-xs shadow-sm ${
                        isMyBattle ? 'bg-[#4ecdc4] text-white' : 'bg-[#ffcd38] text-black'
                      }`}>
                        {isMyBattle ? 'MY BATTLE' : 'LV.5 難度'}
                      </div>
                      
                      <div className="flex justify-between items-start mb-4">
                         <div>
                            <h3 className="text-xl font-bold mb-1">{battle.title}</h3>
                            <div className="flex items-center gap-2 text-sm text-gray-500">
                               <User className="w-4 h-4" /> <span>{battle.author}</span>
                                {(() => {
                                   const student = users.find(u => u.name === battle.author);
                                   const coach = student ? users.find(u => u.id === student.coachId) : null;
                                   return coach ? (
                                      <span className="text-xs bg-gray-100 px-2 py-0.5 rounded text-gray-500 border border-gray-200 ml-1">
                                         Coach: {coach.name}
                                      </span>
                                   ) : null;
                                })()}
                            </div>
                         </div>
                         <div className="flex flex-col items-center group" onClick={() => handleLikeBattle(battle.id)}>
                            <Trophy className={`w-8 h-8 group-hover:scale-110 transition-transform cursor-pointer ${
                              battle.likedBy?.includes(currentUser.id) ? 'text-[#ff6b6b] fill-current' : (isMyBattle ? 'text-[#4ecdc4]' : 'text-[#ffcd38]')
                            }`} />
                            <span className="font-bold">{battle.likes} Likes</span>
                         </div>
                      </div>
                      
                      <div className={`border-2 p-3 mb-4 ${
                        isMyBattle ? 'bg-[#e6fffa] border-[#b2f5ea]' : 'bg-gray-100 border-gray-300'
                      }`}>
                         <ul className="list-disc list-outside pl-5 text-sm space-y-1">
                            {battle.routine.map((item, i) => (
                               <li key={i}>{item}</li>
                            ))}
                         </ul>
                      </div>

                      {/* Comments Section */}
                      <div className={`mt-4 mb-4 pt-4 border-t-2 border-dashed ${
                        isMyBattle ? 'border-[#b2f5ea]' : 'border-gray-300'
                      }`}>
                        <h4 className="font-bold text-sm mb-2 flex items-center gap-2 text-gray-600">
                          <MessageSquare className="w-4 h-4" /> 討論區 (Comments)
                        </h4>
                        
                        {/* Existing Comments */}
                        {battle.comments && battle.comments.length > 0 ? (
                          <div className="space-y-2 mb-3 max-h-40 overflow-y-auto pr-2 custom-scrollbar">
                            {battle.comments.map(comment => (
                              <div key={comment.id} className="bg-gray-50 p-2 text-xs border border-gray-200 rounded-sm">
                                <div className="flex justify-between items-center mb-1">
                                   <span className={`font-bold ${comment.author === currentUser?.name ? 'text-[#ff6b6b]' : 'text-gray-700'}`}>
                                      {comment.author}
                                   </span>
                                   <span className="text-gray-400 text-[10px]">
                                     {format(new Date(comment.date), 'MM/dd HH:mm')}
                                   </span>
                                </div>
                                <p className="text-gray-600 break-words">{comment.content}</p>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="text-xs text-gray-400 italic mb-3">尚無留言 (No comments yet)</div>
                        )}

                        {/* Add Comment */}
                        <div className="flex gap-2">
                          <input 
                            type="text" 
                            placeholder="留言討論..."
                            className={`flex-1 text-xs border-2 p-2 focus:border-black outline-none ${
                              isMyBattle ? 'border-[#b2f5ea]' : 'border-gray-300'
                            }`}
                            value={battleCommentInputs[battle.id] || ''}
                            onChange={e => setBattleCommentInputs({...battleCommentInputs, [battle.id]: e.target.value})}
                            onKeyDown={e => {
                              if (e.key === 'Enter') handleAddBattleComment(battle.id);
                            }}
                          />
                          <PixelButton size="sm" variant="secondary" onClick={() => handleAddBattleComment(battle.id)} className="px-3">
                            Send
                          </PixelButton>
                        </div>
                      </div>
                      
                      <div className="flex gap-2">
                         {battle.author !== currentUser?.name && currentUser.role !== 'coach' && (
                            <PixelButton className="flex-1" size="sm" onClick={() => handleLikeBattle(battle.id)}>接受挑戰 (FIGHT)</PixelButton>
                         )}
                         <PixelButton variant="outline" size="sm" className={battle.author === currentUser?.name || currentUser.role === 'coach' ? "w-full" : ""}><Share2 className="w-4 h-4"/></PixelButton>
                      </div>
                   </div>
                   );
                })}
             </div>
          </div>
        )}

        {/* ADMIN TAB */}
        {/* ADMIN TAB (Regular Coach & Admin Personal View) */}
        {activeTab === 'admin' && currentUser.role === 'coach' && (
           <div className="space-y-6 animate-in slide-in-from-right-4 duration-500">
                <div className="space-y-6">
                  <div className="flex justify-between items-center border-b-4 border-black pb-4">
                     <h2 className="text-2xl font-bold text-[#4ecdc4] flex items-center gap-2">
                        <User className="w-8 h-8" /> 我的學員 (My Students)
                     </h2>
                     <PixelBadge variant="accent" className="text-lg">
                       {users.filter(u => u.coachId === currentUser.id).length} Students
                     </PixelBadge>
                  </div>

                  <div className="grid md:grid-cols-2 gap-6">
                     {users.filter(u => u.coachId === currentUser.id).length === 0 ? (
                         <div className="col-span-2 text-center py-10 border-4 border-dashed border-gray-300 rounded bg-gray-50">
                           <User className="w-12 h-12 mx-auto text-gray-300 mb-2" />
                           <p className="text-gray-500 font-bold">目前尚未指派學員給您</p>
                           <p className="text-xs text-gray-400 mt-1">請聯繫管理員 (iisa) 進行分發</p>
                         </div>
                     ) : (
                         users.filter(u => u.coachId === currentUser.id).map(u => (
                           <div key={u.id} className={`bg-white border-4 border-black p-4 shadow-[4px_4px_0_0_rgba(0,0,0,0.1)] relative overflow-hidden ${u.status === 'disabled' ? 'grayscale opacity-75' : ''}`}>
                               {u.status === 'disabled' && (
                                 <div className="absolute top-0 right-0 bg-red-500 text-white text-[10px] px-2 py-1 font-bold">
                                   DISABLED
                                 </div>
                               )}
                               
                               <div className="flex items-center gap-4 mb-4">
                                 <div className={`w-12 h-12 rounded-full border-2 border-black flex items-center justify-center font-bold text-xl ${u.status === 'active' ? 'bg-[#4ecdc4] text-white' : 'bg-gray-300 text-gray-500'}`}>
                                   {u.name[0].toUpperCase()}
                                 </div>
                                 <div>
                                   <h3 className="font-bold text-lg">{u.name}</h3>
                                   <div className="flex items-center gap-2 text-xs font-mono mt-1">
                                      <div className={`w-2 h-2 rounded-full ${u.status === 'active' ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`}></div>
                                      <span className="uppercase">{u.status}</span>
                                   </div>
                                 </div>
                               </div>

                               <div className="bg-gray-100 p-3 text-xs space-y-2 border border-gray-200">
                                 <div className="flex justify-between">
                                   <span className="text-gray-500">最近運動:</span>
                                   <span className="font-bold">
                                     {getVisibleLogs().filter(l => l.studentId === u.id).length > 0 
                                       ? format(getVisibleLogs().filter(l => l.studentId === u.id)[0].date, 'MM/dd')
                                       : 'N/A'
                                     }
                                   </span>
                                 </div>
                                 <div className="flex justify-between">
                                   <span className="text-gray-500">總記錄:</span>
                                   <span className="font-bold">{getVisibleLogs().filter(l => l.studentId === u.id).length}</span>
                                 </div>
                               </div>
                               
                               <div className="mt-4 pt-4 border-t-2 border-black">
                                 <PixelButton size="sm" className="w-full" onClick={() => setActiveTab('log')}>
                                   查看日記 (View Logs)
                                 </PixelButton>
                               </div>
                           </div>
                         ))
                     )}
                  </div>
                </div>
           </div>
        )}

        {/* SUPER ADMIN - Account Management (Coaches + Students) */}
        {activeTab === 'admin_accounts' && currentUser.name === 'iisa' && (
           <div className="space-y-6 animate-in slide-in-from-right-4 duration-500">
             
             {/* 1. Coach Management Section */}
             <div className="space-y-6 border-b-4 border-black pb-8">
                <h2 className="text-2xl font-bold text-[#ffcd38] flex items-center gap-2">
                   <Trophy className="w-8 h-8" /> 教練管理區 (Coach Management)
                </h2>
                
                <div className="grid md:grid-cols-2 gap-6">
                  {/* Pending Coaches */}
                  <div className="space-y-4">
                    <h3 className="font-bold text-lg border-b-2 border-gray-300 pb-1">待審核教練 (Pending)</h3>
                    {users.filter(u => u.status === 'pending' && u.role === 'coach').length === 0 ? (
                        <div className="bg-gray-100 p-4 text-center text-gray-400 text-sm">無待審核申請</div>
                    ) : (
                        users.filter(u => u.status === 'pending' && u.role === 'coach').map(u => (
                          <div key={u.id} className="bg-white border-2 border-[#ffcd38] p-3 flex justify-between items-center shadow-sm">
                              <span className="font-bold">{u.name}</span>
                              <div className="flex gap-2">
                                <PixelButton size="sm" variant="accent" onClick={() => approveUser(u.id)}>核准</PixelButton>
                                <PixelButton size="sm" variant="secondary" onClick={() => deleteUser(u.id)}><Trash2 size={16}/></PixelButton>
                              </div>
                          </div>
                        ))
                    )}
                  </div>

                  {/* Active Coaches */}
                  <div className="space-y-4">
                    <h3 className="font-bold text-lg border-b-2 border-gray-300 pb-1">正式教練名單 (Active)</h3>
                    {users.filter(u => u.role === 'coach' && u.status !== 'pending' && u.name !== 'iisa').length === 0 ? (
                        <div className="bg-gray-100 p-4 text-center text-gray-400 text-sm">無其他教練</div>
                    ) : (
                        users.filter(u => u.role === 'coach' && u.status !== 'pending' && u.name !== 'iisa').map(u => (
                          <div key={u.id} className={`bg-white border-2 border-black p-3 flex justify-between items-center ${u.status === 'disabled' ? 'opacity-50 grayscale' : ''}`}>
                              <div>
                                <span className="font-bold block">{u.name}</span>
                                <span className={`text-[10px] uppercase font-bold px-1 ${u.status === 'active' ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'}`}>
                                  {u.status}
                                </span>
                              </div>
                              <div className="flex gap-2">
                                <PixelButton size="sm" variant="outline" onClick={() => toggleUserStatus(u.id)}>
                                  {u.status === 'active' ? '停用' : '啟用'}
                                </PixelButton>
                                <button onClick={() => deleteUser(u.id)} className="text-gray-400 hover:text-red-500"><Trash2 size={16}/></button>
                              </div>
                          </div>
                        ))
                    )}
                  </div>
                </div>
             </div>

             {/* 2. Student Management Section */}
             <div className="space-y-6">
                <div className="flex justify-between items-center">
                  <h2 className="text-2xl font-bold text-[#4ecdc4] flex items-center gap-2">
                     <User className="w-8 h-8" /> 學員管理區 (Student Management)
                  </h2>
                  <div className="flex gap-2">
                      <button 
                        onClick={() => setAdminManageFilter('all')}
                        className={`px-3 py-1 text-xs font-bold border-2 border-black ${adminManageFilter === 'all' ? 'bg-[#4ecdc4] text-black' : 'bg-white text-gray-500'}`}
                      >
                        全部學員
                      </button>
                      <button 
                        onClick={() => setAdminManageFilter('my')}
                        className={`px-3 py-1 text-xs font-bold border-2 border-black ${adminManageFilter === 'my' ? 'bg-[#4ecdc4] text-black' : 'bg-white text-gray-500'}`}
                      >
                        我的學員
                      </button>
                  </div>
                </div>

                <div className="grid md:grid-cols-2 gap-6">
                  {/* Pending Students */}
                  {adminManageFilter === 'all' && (
                  <div className="space-y-4">
                    <h3 className="font-bold text-lg border-b-2 border-gray-300 pb-1">待審核學員 (Pending)</h3>
                    {users.filter(u => u.status === 'pending' && u.role === 'student').length === 0 ? (
                        <div className="bg-gray-100 p-4 text-center text-gray-400 text-sm">無待審核申請</div>
                    ) : (
                        users.filter(u => u.status === 'pending' && u.role === 'student').map(u => (
                          <div key={u.id} className="bg-white border-2 border-[#4ecdc4] p-3 flex justify-between items-center shadow-sm">
                              <span className="font-bold">{u.name}</span>
                              <div className="flex gap-2">
                                <PixelButton size="sm" variant="accent" onClick={() => approveUser(u.id)}>核准</PixelButton>
                                <PixelButton size="sm" variant="secondary" onClick={() => deleteUser(u.id)}><Trash2 size={16}/></PixelButton>
                              </div>
                          </div>
                        ))
                    )}
                  </div>
                  )}

                  {/* Active Students */}
                  <div className={`space-y-4 ${adminManageFilter === 'my' ? 'col-span-2' : ''}`}>
                    <h3 className="font-bold text-lg border-b-2 border-gray-300 pb-1">
                      {adminManageFilter === 'my' ? '我的學員 (My Students)' : '正式學員名單 (Active)'}
                    </h3>
                    {users.filter(u => {
                        const isStudent = u.role === 'student';
                        const isNotPending = u.status !== 'pending';
                        const matchesFilter = adminManageFilter === 'all' ? true : u.coachId === currentUser.id;
                        return isStudent && isNotPending && matchesFilter;
                    }).length === 0 ? (
                        <div className="bg-gray-100 p-4 text-center text-gray-400 text-sm">無符合條件的學員</div>
                    ) : (
                        users.filter(u => {
                            const isStudent = u.role === 'student';
                            const isNotPending = u.status !== 'pending';
                            const matchesFilter = adminManageFilter === 'all' ? true : u.coachId === currentUser.id;
                            return isStudent && isNotPending && matchesFilter;
                        }).map(u => {
                          const assignedCoach = users.find(c => c.id === u.coachId);
                          return (
                            <div key={u.id} className={`bg-white border-2 border-black p-3 space-y-2 ${u.status === 'disabled' ? 'opacity-50' : ''}`}>
                                <div className="flex justify-between items-center">
                                  <div>
                                    <span className="font-bold block">{u.name}</span>
                                    <span className={`text-[10px] uppercase font-bold px-1 ${u.status === 'active' ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'}`}>
                                      {u.status}
                                    </span>
                                  </div>
                                  <div className="flex gap-2">
                                    <PixelButton size="sm" variant="outline" onClick={() => toggleUserStatus(u.id)}>
                                      {u.status === 'active' ? '停用' : '啟用'}
                                    </PixelButton>
                                    <button onClick={() => deleteUser(u.id)} className="text-gray-400 hover:text-red-500"><Trash2 size={16}/></button>
                                  </div>
                                </div>
                                
                                <div className="flex items-center gap-2 text-sm bg-gray-50 p-2 border border-gray-200">
                                  <span className="text-gray-500 font-bold whitespace-nowrap">教練:</span>
                                  <select 
                                    className="bg-white border border-gray-300 p-1 w-full text-sm outline-none focus:border-[#4ecdc4]"
                                    value={u.coachId || ''}
                                    onChange={(e) => assignCoach(u.id, e.target.value)}
                                    disabled={u.status === 'disabled'}
                                  >
                                    <option value="">-- 未分配 --</option>
                                    {users.filter(c => c.role === 'coach' && c.status === 'active').map((c, _, allCoaches) => {
                                      const isDuplicate = allCoaches.filter(oc => oc.name === c.name).length > 1;
                                      return (
                                        <option key={c.id} value={c.id}>
                                          {c.name} {c.name === 'iisa' ? '(Admin)' : ''} {isDuplicate ? `(#${c.id.slice(-4)})` : ''}
                                        </option>
                                      );
                                    })}
                                  </select>
                                </div>
                            </div>
                          );
                        })
                    )}
                  </div>
                </div>
             </div>
           </div>
        )}
        {/* ADMIN EXPORT TAB */}
        {activeTab === 'export' && currentUser.name === 'iisa' && (
          <div className="space-y-6 animate-in slide-in-from-right-4 duration-500">
             <div className="border-b-4 border-black pb-4 mb-6">
                <h2 className="text-2xl font-bold text-[#9333ea] flex items-center gap-2">
                   <Share2 className="w-8 h-8" /> 學員成就匯出 (Export Center)
                </h2>
                <p className="text-gray-500 text-sm mt-1">產生學員的個人成就卡片與運動數據統計</p>
             </div>

             <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
               {users.filter(u => u.role === 'student').map(student => {
                 const studentLogs = logs.filter(l => l.studentId === student.id);
                 const totalWorkouts = studentLogs.length;
                 const lastWorkout = studentLogs.length > 0 ? studentLogs[0].date : null;
                 
                 // Calculate Badges
                 const badges = [];
                 if (totalWorkouts >= 1) badges.push({ icon: '🏅', name: '新手上路', color: 'bg-green-100 text-green-700' });
                 if (totalWorkouts >= 10) badges.push({ icon: '🥉', name: '持之以恆', color: 'bg-orange-100 text-orange-700' });
                 if (totalWorkouts >= 30) badges.push({ icon: '🥈', name: '健身運動員', color: 'bg-gray-100 text-gray-700' });
                 if (totalWorkouts >= 50) badges.push({ icon: '🥇', name: '健身菁英', color: 'bg-yellow-100 text-yellow-700' });
                 
                 // Heavy Lifter Check
                 const maxWeight = studentLogs.reduce((max, log) => {
                    const logMax = log.items.reduce((m, i) => Math.max(m, i.weight), 0);
                    return Math.max(max, logMax);
                 }, 0);
                 
                 if (maxWeight >= 100) badges.push({ icon: '💪', name: '大力士', color: 'bg-red-100 text-red-700' });

                 return (
                   <PixelCard key={student.id} className="relative group hover:-translate-y-1 transition-transform">
                      {/* Card Header */}
                      <div className="flex items-center gap-4 mb-4 border-b-2 border-dashed border-gray-300 pb-4">
                         <div className="w-16 h-16 bg-[#9333ea] border-2 border-black rounded-full flex items-center justify-center text-white text-2xl font-bold">
                            {student.name[0].toUpperCase()}
                         </div>
                         <div>
                            <h3 className="text-xl font-bold">{student.name}</h3>
                            <div className="text-xs text-gray-500 font-mono">ID: {student.id.slice(0, 8)}</div>
                         </div>
                      </div>

                      {/* Stats */}
                      <div className="grid grid-cols-2 gap-2 mb-4 text-center">
                         <div className="bg-gray-50 p-2 border border-gray-200">
                            <div className="text-xs text-gray-400 font-bold uppercase">Workouts</div>
                            <div className="text-xl font-bold text-[#9333ea]">{totalWorkouts}</div>
                         </div>
                         <div className="bg-gray-50 p-2 border border-gray-200">
                            <div className="text-xs text-gray-400 font-bold uppercase">Max Weight</div>
                            <div className="text-xl font-bold text-gray-700">{maxWeight}kg</div>
                         </div>
                      </div>

                      {/* Badges Area */}
                      <div className="mb-6">
                         <div className="text-xs font-bold text-gray-400 mb-2 uppercase">Achievements ({badges.length})</div>
                         <div className="flex flex-wrap gap-2">
                            {badges.length === 0 ? (
                               <span className="text-xs text-gray-300 italic">尚無成就...</span>
                            ) : (
                               badges.map((b, i) => (
                                  <span key={i} className={`text-xs font-bold px-2 py-1 rounded border border-black/10 flex items-center gap-1 ${b.color}`}>
                                     <span>{b.icon}</span> {b.name}
                                  </span>
                               ))
                            )}
                         </div>
                      </div>

                      <PixelButton 
                        className="w-full" 
                        variant="outline"
                        onClick={() => {
                           alert(`
=== PIXEL GYM REPORT ===
Student: ${student.name}
Total Workouts: ${totalWorkouts}
Max Weight: ${maxWeight}kg
Badges: ${badges.map(b => b.name).join(', ')}
Last Active: ${lastWorkout ? format(lastWorkout, 'yyyy-MM-dd') : 'Never'}
========================
(已傳送至後台列印佇列)
                           `);
                        }}
                      >
                         <Share2 className="w-4 h-4" /> 匯出數據卡 (Export)
                      </PixelButton>
                   </PixelCard>
                 );
               })}
             </div>
          </div>
        )}

      </main>
    </div>
  );
}
