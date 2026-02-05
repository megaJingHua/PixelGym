import React, { useState, useEffect } from 'react';
import { PixelCard } from '@/app/components/PixelCard';
import { PixelButton } from '@/app/components/PixelButton';
import { PixelInput } from '@/app/components/PixelInput';
import { PixelBadge } from '@/app/components/PixelBadge';
import { PixelToast, ToastType } from '@/app/components/PixelToast';
import { Dumbbell, Trophy, BookOpen, User, Plus, Sword, LogOut, Flame, Share2, Camera, Eye, EyeOff, Trash2, MessageSquare, Star, Settings, X, CheckCircle, ChevronDown, ChevronUp, Calendar, Search, Edit, Target } from 'lucide-react';
import { format } from 'date-fns';
import { ImageWithFallback } from '@/app/components/figma/ImageWithFallback';
import { ExerciseImage } from '@/app/components/ExerciseImage';
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
  customBadges?: { icon: string, name: string, color: string }[];
  selectedBadgeIds?: string[];
  definedAchievements?: Achievement[]; // Coach created achievements
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
  coachCommentDate?: Date;
  isHidden?: boolean;
  isPlan?: boolean;
  isPlanCompleted?: boolean;
  duration?: number; // Minutes
  isShared?: boolean;
  sharedFrom?: string; // ID of the student who shared this log
}

interface Exercise {
  id: string;
  name: string;
  muscle: string;
  guide: string;
  imageUrl: string;
  author: string;
  level?: number; // 1-5
  tools?: string;
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
  createdAt?: Date;
  targetStudentId?: string; // 'all' or specific student ID
  records?: BattleRecord[];
}

type AchievementType = 'log_count' | 'max_weight' | 'plan_count' | 'total_time';

interface Achievement {
  id: string;
  creatorId: string; // 'admin' or coach ID
  targetAudience: 'all' | 'students'; // 'all' only for admin
  title: string;
  description: string;
  icon: string;
  criteriaType: AchievementType;
  criteriaValue: number;
  criteriaExercise?: string; // Required if criteriaType is 'max_weight'
}

interface BattleRecord {
  id: string;
  studentId: string;
  studentName: string;
  completedAt: string;
  content: string;
}

// API Helper
const api = {
  signup: async (data: any) => {
    const res = await fetch(`${API_URL}/signup`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json', 
        Authorization: `Bearer ${publicAnonKey}`,
        apikey: publicAnonKey
      },
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
        Authorization: `Bearer ${session.access_token}`,
        apikey: publicAnonKey
      },
      body: JSON.stringify(updates)
    });
    return res.json();
  },
  getUsers: async () => {
    const res = await fetch(`${API_URL}/users`, { 
      headers: { 
        Authorization: `Bearer ${publicAnonKey}`,
        apikey: publicAnonKey
      } 
    });
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  },
  createUser: async (user: UserAccount) => {
    const res = await fetch(`${API_URL}/users`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json', 
        Authorization: `Bearer ${publicAnonKey}`,
        apikey: publicAnonKey
      },
      body: JSON.stringify(user)
    });
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  },
  deleteUser: async (id: string) => {
    await fetch(`${API_URL}/users/${id}`, { 
      method: 'DELETE', 
      headers: { 
        Authorization: `Bearer ${publicAnonKey}`,
        apikey: publicAnonKey
      } 
    });
  },
  getLogs: async () => {
    const res = await fetch(`${API_URL}/logs`, { 
      headers: { 
        Authorization: `Bearer ${publicAnonKey}`,
        apikey: publicAnonKey
      } 
    });
    if (!res.ok) throw new Error(await res.text());
    const data = await res.json();
    return data.map((log: any) => ({ ...log, date: new Date(log.date) }));
  },
  createLog: async (log: Log) => {
    const res = await fetch(`${API_URL}/logs`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json', 
        Authorization: `Bearer ${publicAnonKey}`,
        apikey: publicAnonKey
      },
      body: JSON.stringify(log)
    });
    return res.json();
  },
  updateLog: async (id: string, updates: Partial<Log>) => {
    const res = await fetch(`${API_URL}/logs/${id}`, {
      method: 'PUT',
      headers: { 
        'Content-Type': 'application/json', 
        Authorization: `Bearer ${publicAnonKey}`,
        apikey: publicAnonKey
      },
      body: JSON.stringify(updates)
    });
    return res.json();
  },
  deleteLog: async (id: string) => {
    await fetch(`${API_URL}/logs/${id}`, { 
      method: 'DELETE', 
      headers: { 
        Authorization: `Bearer ${publicAnonKey}`,
        apikey: publicAnonKey
      } 
    });
  },
  getExercises: async () => {
    const res = await fetch(`${API_URL}/exercises`, { 
      headers: { 
        Authorization: `Bearer ${publicAnonKey}`,
        apikey: publicAnonKey
      } 
    });
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  },
  createExercise: async (ex: Exercise) => {
    const res = await fetch(`${API_URL}/exercises`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json', 
        Authorization: `Bearer ${publicAnonKey}`,
        apikey: publicAnonKey
      },
      body: JSON.stringify(ex)
    });
    return res.json();
  },
  updateExercise: async (id: string, updates: Partial<Exercise>) => {
    const res = await fetch(`${API_URL}/exercises/${id}`, {
      method: 'PUT',
      headers: { 
        'Content-Type': 'application/json', 
        Authorization: `Bearer ${publicAnonKey}`,
        apikey: publicAnonKey
      },
      body: JSON.stringify(updates)
    });
    return res.json();
  },
  deleteExercise: async (id: string) => {
    await fetch(`${API_URL}/exercises/${id}`, { 
      method: 'DELETE', 
      headers: { 
        Authorization: `Bearer ${publicAnonKey}`,
        apikey: publicAnonKey
      } 
    });
  },
  getBattles: async () => {
    const res = await fetch(`${API_URL}/battles`, { 
      headers: { 
        Authorization: `Bearer ${publicAnonKey}`,
        apikey: publicAnonKey
      } 
    });
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  },
  createBattle: async (battle: Battle) => {
    const res = await fetch(`${API_URL}/battles`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json', 
        Authorization: `Bearer ${publicAnonKey}`,
        apikey: publicAnonKey
      },
      body: JSON.stringify(battle)
    });
    return res.json();
  },
  deleteBattle: async (id: string) => {
    await fetch(`${API_URL}/battles/${id}`, { 
      method: 'DELETE', 
      headers: { 
        Authorization: `Bearer ${publicAnonKey}`,
        apikey: publicAnonKey
      } 
    });
  },
  likeBattle: async (id: string) => {
    const { data: { session } } = await supabase.auth.getSession();
    const token = session?.access_token || publicAnonKey;
    const res = await fetch(`${API_URL}/battles/${id}/like`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
        apikey: publicAnonKey
      }
    });
    return res.json();
  },
  addBattleComment: async (id: string, comment: { author: string, content: string }) => {
    const res = await fetch(`${API_URL}/battles/${id}/comments`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json', 
        Authorization: `Bearer ${publicAnonKey}`,
        apikey: publicAnonKey
      },
      body: JSON.stringify(comment)
    });
    return res.json();
  },
  submitBattleRecord: async (id: string, record: { studentId: string, studentName: string, content: string }) => {
    const res = await fetch(`${API_URL}/battles/${id}/records`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json', 
        Authorization: `Bearer ${publicAnonKey}`,
        apikey: publicAnonKey
      },
      body: JSON.stringify(record)
    });
    return res.json();
  },
  uploadFile: async (file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    
    const res = await fetch(`${API_URL}/upload`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${publicAnonKey}`,
        apikey: publicAnonKey
      },
      body: formData
    });
    return res.json();
  }
};

const DEFAULT_SYSTEM_ACHIEVEMENTS = [
  { id: 'newbie', name: '新手上路', icon: '🏅', color: 'bg-green-100 text-green-700', description: '完成 1 次訓練', type: 'log_count', threshold: 1 },
  { id: 'persistent', name: '持之以恆', icon: '🥉', color: 'bg-orange-100 text-orange-700', description: '完成 10 次訓練', type: 'log_count', threshold: 10 },
  { id: 'athlete', name: '健身運動員', icon: '🥈', color: 'bg-gray-100 text-gray-700', description: '完成 30 次訓練', type: 'log_count', threshold: 30 },
  { id: 'elite', name: '健身菁英', icon: '🥇', color: 'bg-yellow-100 text-yellow-700', description: '完成 50 次訓練', type: 'log_count', threshold: 50 },
  { id: 'heavy_lifter', name: '大力士', icon: '💪', color: 'bg-red-100 text-red-700', description: '單次舉重超過 100kg', type: 'max_weight', threshold: 100 },
];

export default function App() {
  // Global State
  const [users, setUsers] = useState<UserAccount[]>([]);
  const [currentUser, setCurrentUser] = useState<UserAccount | null>(null);
  const [systemAchievements, setSystemAchievements] = useState(DEFAULT_SYSTEM_ACHIEVEMENTS);
  const [coachCustomTemplates, setCoachCustomTemplates] = useState<{ id: string, name: string, icon: string, description: string }[]>([
     { id: 'custom_1', name: '全勤寶寶', icon: '🌞', description: '連續一週出席' },
     { id: 'custom_2', name: '核心殺手', icon: '🔥', description: '完成核心訓練挑戰' }
  ]);

  const getAchievementProgress = (ach: Achievement, logs: Log[]) => {
    let current = 0;
    if (ach.type === 'log_count') {
        current = logs.length;
    } else if (ach.type === 'max_weight') {
        current = logs.reduce((max, log) => {
           const logMax = log.items.reduce((m, i) => Math.max(m, i.weight), 0);
           return Math.max(max, logMax);
        }, 0);
    } else if (ach.type === 'plan_count') {
        current = logs.filter(l => l.isPlanCompleted).length;
    } else if (ach.type === 'total_time') {
        current = logs.reduce((total, log) => total + (log.duration || 0), 0);
    }

    return {
        current,
        threshold: ach.threshold,
        progressText: `${current}/${ach.threshold} ${ach.type === 'total_time' ? 'mins' : ''}`,
        isUnlocked: current >= ach.threshold
    };
  };

  const handleToggleBadgeSelection = async (badgeId: string) => {
      if (!currentUser) return;
      
      const currentSelection = currentUser.selectedBadgeIds || [];
      let newSelection = [];
      
      if (currentSelection.includes(badgeId)) {
          newSelection = currentSelection.filter(id => id !== badgeId);
      } else {
          if (currentSelection.length >= 3) {
              alert("最多只能選擇 3 個徽章展示 (Max 3 badges)");
              return;
          }
          newSelection = [...currentSelection, badgeId];
      }
      
      const updatedUser = { ...currentUser, selectedBadgeIds: newSelection };
      setCurrentUser(updatedUser);
      setUsers(users.map(u => u.id === currentUser.id ? updatedUser : u));
      
      try {
          await api.createUser(updatedUser);
      } catch (err) {
          console.error("Failed to update badge selection", err);
      }
  };

  const checkAchievement = (ach: Achievement, logs: Log[]) => {
    return getAchievementProgress(ach, logs).isUnlocked;
  };

  const [isLoading, setIsLoading] = useState(true);

  // UI State
  const [activeTab, setActiveTab] = useState<'log' | 'wiki' | 'pk' | 'admin' | 'admin_accounts' | 'export'>('log');
  const [isRegistering, setIsRegistering] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [settingsForm, setSettingsForm] = useState({ email: '', password: '' });
  const [adminManageFilter, setAdminManageFilter] = useState<'all' | 'my'>('all');
  const [expandedLogs, setExpandedLogs] = useState<string[]>([]);
  const [viewingStudentId, setViewingStudentId] = useState<string | null>(null);
  const hasInitializedLogState = React.useRef(false);

  // Achievement State
  const [achievements, setAchievements] = useState<Achievement[]>([
    ...DEFAULT_SYSTEM_ACHIEVEMENTS.map(a => ({ ...a, creatorId: 'admin', criteriaType: a.type as AchievementType, criteriaValue: a.threshold, targetAudience: 'all' as const }))
  ]);
  const [isAchievementModalOpen, setIsAchievementModalOpen] = useState(false);
  const [newAchievement, setNewAchievement] = useState<Partial<Achievement>>({
    title: '', description: '', icon: '🏆', criteriaType: 'log_count', criteriaValue: 5, targetAudience: 'students'
  });

  const toggleLogExpansion = (id: string) => {
     setExpandedLogs(prev => 
       prev.includes(id) ? [] : [id]
     );
  };
  
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
  const [newItem, setNewItem] = useState({ exercise: '', weight: '', reps: '10', sets: '3', muscle: '' });
  const [sessionNotes, setSessionNotes] = useState('');
  const [sessionDuration, setSessionDuration] = useState<number | ''>('');
  const [currentSessionItems, setCurrentSessionItems] = useState<LogItem[]>([]);
  
  const [newExercise, setNewExercise] = useState({ name: '', muscle: '', guide: '', imageUrl: '', level: 1, tools: '' });
  const [editingExerciseId, setEditingExerciseId] = useState<string | null>(null);
  const [exerciseImageFile, setExerciseImageFile] = useState<File | null>(null);
  const [wikiSearchTerm, setWikiSearchTerm] = useState('');
  
  // Battle Form State
  const [isCreatingBattle, setIsCreatingBattle] = useState(false);
  const [isSelectingLog, setIsSelectingLog] = useState(false);
  const [isLogModalOpen, setIsLogModalOpen] = useState(false);
  const [newBattle, setNewBattle] = useState({ title: '', routine: '', targetStudentId: '' });
  const [battleCommentInputs, setBattleCommentInputs] = useState<Record<string, string>>({});
  const [battleRecordInput, setBattleRecordInput] = useState('');
  const [selectedBattleForRecord, setSelectedBattleForRecord] = useState<Battle | null>(null);
  const [battleFilter, setBattleFilter] = useState<'all' | 'received' | 'sent'>('all');
  const [isCoachZoneOpen, setIsCoachZoneOpen] = useState(false);
  const [adminSelectedStudentId, setAdminSelectedStudentId] = useState<string | null>(null);
  
  // Assign Plan State
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  const [assignSelectedStudents, setAssignSelectedStudents] = useState<string[]>([]);
  const [activeLogId, setActiveLogId] = useState<string | null>(null);
  const [planExecutionDate, setPlanExecutionDate] = useState<string>(format(new Date(), 'yyyy-MM-dd'));
  const [studentLogDate, setStudentLogDate] = useState<string>(format(new Date(), 'yyyy-MM-dd'));

  // Toast State
  const [toast, setToast] = useState<{ message: string; type: ToastType; isVisible: boolean }>({
    message: '',
    type: 'info',
    isVisible: false
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const showToast = (message: string, type: ToastType = 'info') => {
    setToast({ message, type, isVisible: true });
  };

  const hideToast = () => {
    setToast(prev => ({ ...prev, isVisible: false }));
  };

  // Initial Data Fetch
  const fetchInitialData = async () => {
    setIsLoading(true);
    try {
      // Helper for graceful fetch
      const safeFetch = async <T,>(promise: Promise<T>, fallback: T, name: string): Promise<T> => {
        try {
          return await promise;
        } catch (e) {
          console.error(`Failed to fetch ${name}:`, e);
          return fallback;
        }
      };

      // Fetch Data and Session in parallel
      // We use safeFetch to prevent one failure from crashing the whole app
      const [sessionRes, usersData, logsData, exercisesData, battlesData] = await Promise.all([
        supabase.auth.getSession(),
        safeFetch(api.getUsers(), [], 'users'),
        safeFetch(api.getLogs(), [], 'logs'),
        safeFetch(api.getExercises(), [], 'exercises'),
        safeFetch(api.getBattles(), [], 'battles')
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
           try {
             const res = await fetch(`${API_URL}/users/${userId}`, { headers: { Authorization: `Bearer ${publicAnonKey}` } });
             if (res.ok) {
               const userProfile = await res.json();
               setCurrentUser(userProfile);
             }
           } catch (e) {
             console.error("Failed to fetch current user profile:", e);
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
      alert("帳號資料已更新！");
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
                throw new Error("此 Email 已被註冊，請直接登入");
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

  const updateBadges = async (studentId: string, newBadges: { icon: string, name: string, color: string }[]) => {
    const user = users.find(u => u.id === studentId);
    if (!user) return;
    const updated = { ...user, customBadges: newBadges };
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
    setNewItem({ exercise: '', weight: '', reps: '10', sets: '3', muscle: '' });
  };

  const handleRemoveItem = (id: string) => {
    setCurrentSessionItems(currentSessionItems.filter(i => i.id !== id));
  };

  const handleUpdateItem = (id: string, field: keyof LogItem, value: any) => {
    setCurrentSessionItems(prev => prev.map(item => 
      item.id === id ? { ...item, [field]: value } : item
    ));
  };

  const toggleAssignStudent = (studentId: string) => {
    setAssignSelectedStudents(prev => 
        prev.includes(studentId) 
        ? prev.filter(id => id !== studentId)
        : [...prev, studentId]
    );
  };

  const handleAssignPlan = async () => {
    if (currentSessionItems.length === 0) {
        alert("請至少新增一個項目！");
        return;
    }
    if (assignSelectedStudents.length === 0) {
        alert("請至少選擇一位學員！");
        return;
    }

    const newLogs: Log[] = [];
    
    // Create a plan for each student
    for (const studentId of assignSelectedStudents) {
        const log: Log = {
            id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
            studentId: studentId,
            date: new Date(),
            items: currentSessionItems,
            notes: sessionNotes || 'Coach Assigned Plan',
            isHidden: false,
            isPlan: true
        };
        
        await api.createLog(log);
        newLogs.push(log);
    }
    
    setLogs([...newLogs, ...logs]);
    
    // Reset
    setCurrentSessionItems([]);
    setSessionNotes('');
    setAssignSelectedStudents([]);
    setIsAssignModalOpen(false);
    alert("課表已派發！");
  };

  const handleSubmitSession = async (e: React.FormEvent) => {
    e.preventDefault();
    if (currentSessionItems.length === 0) {
      showToast("請至少新增一個項目！", 'error');
      return;
    }
    
    if (activeLogId) {
        // Update existing plan to become a real log
        const updatedDate = new Date();
        await api.updateLog(activeLogId, {
            items: currentSessionItems,
            notes: sessionNotes,
            isPlan: false,
            isPlanCompleted: true,
            duration: Number(sessionDuration) || 0,
            date: updatedDate
        });
        
        setLogs(logs.map(l => l.id === activeLogId ? {
            ...l, 
            items: currentSessionItems, 
            notes: sessionNotes, 
            isPlan: false,
            isPlanCompleted: true,
            duration: Number(sessionDuration) || 0,
            date: updatedDate
        } : l));
        
        setActiveLogId(null);
        showToast("日記已更新！", 'success');
    } else {
        const targetId = (currentUser?.role === 'coach' && viewingStudentId) ? viewingStudentId : (currentUser?.id || '');
        const isCoach = currentUser?.role === 'coach';
        
        const log: Log = {
          id: Date.now().toString(),
          studentId: targetId,
          date: isCoach ? new Date(planExecutionDate) : new Date(studentLogDate),
          items: currentSessionItems,
          notes: sessionNotes,
          isHidden: false,
          isPlan: isCoach,
          duration: isCoach ? 0 : (Number(sessionDuration) || 0)
        };
        
        await api.createLog(log);
        setLogs([log, ...logs]);
        setExpandedLogs([log.id]);
        
        if (isCoach) {
           showToast("課表已指派！", 'success');
        } else {
           showToast("日記已儲存！", 'success');
        }
    }
    
    // Reset form
    setCurrentSessionItems([]);
    setSessionNotes('');
    setSessionDuration('');
    setIsLogModalOpen(false);
  };

  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [shareSelectedStudentIds, setShareSelectedStudentIds] = useState<string[]>([]);
  const [logIdToShare, setLogIdToShare] = useState<string | null>(null);

  const handleShareLog = async () => {
     if (!logIdToShare || shareSelectedStudentIds.length === 0) {
        showToast("請選擇要分享的對象", 'error');
        return;
     }

     const sourceLog = logs.find(l => l.id === logIdToShare);
     if (!sourceLog) return;

     const newLogs: Log[] = [];
     
     for (const studentId of shareSelectedStudentIds) {
        const studentName = users.find(u => u.id === studentId)?.name || 'Unknown';
        
        // Create a COPY of the log for the target student
        // It will be created as a PLAN (isPlan: true) so they can choose to execute it
        // but it is fully editable and deletable by them.
        const log: Log = {
            id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
            studentId: studentId,
            date: new Date(), // Shared today
            items: sourceLog.items.map(item => ({...item, id: Date.now().toString() + Math.random().toString(36).substr(2, 5)})), // New Item IDs
            notes: `[Shared by ${currentUser?.name}] ${sourceLog.notes || ''}`,
            isHidden: false,
            isPlan: true, // It appears as a "Plan" or "Challenge" in their feed
            duration: 0,
            sharedFrom: currentUser?.id
        };
        
        await api.createLog(log);
        newLogs.push(log);
     }
     
     // Update local state if I am sharing to myself (unlikely but possible) or if I can see their logs
     // Actually, just append to logs to be safe, filtering will handle visibility
     setLogs([...newLogs, ...logs]);
     
     setIsShareModalOpen(false);
     setShareSelectedStudentIds([]);
     setLogIdToShare(null);
     showToast(`已分享給 ${shareSelectedStudentIds.length} 位學員！`, 'success');
  };

  const handleStartEditExercise = (ex: Exercise) => {
      setNewExercise({
          name: ex.name,
          muscle: ex.muscle,
          guide: ex.guide,
          imageUrl: ex.imageUrl,
          level: ex.level || 1,
          tools: ex.tools || ''
      });
      setEditingExerciseId(ex.id);
      setIsCoachZoneOpen(true);
  };

  const handleUploadExercise = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newExercise.name || !newExercise.muscle) {
      showToast("請填寫完整資訊", 'error');
      return;
    }

    // Check for duplicate names
    const isDuplicate = exercises.some(ex => 
        ex.name.trim() === newExercise.name.trim() && 
        ex.id !== editingExerciseId
    );

    if (isDuplicate) {
        showToast("動作名稱已存在，請勿重複建立", 'error');
        return;
    }

    setIsSubmitting(true);
    // Keep info toast visible until success or error
    // We don't use auto-hide for loading state usually, but here I'll just show it.
    // The success/error toast will override it.
    showToast("正在處理中... ", 'info');

    try {
        let uploadedImageUrl = editingExerciseId 
            ? exercises.find(e => e.id === editingExerciseId)?.imageUrl || ''
            : 'https://images.unsplash.com/photo-1608067008273-aaff95eca6ce?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxwaXhlbCUyMGFydCUyMGd5bSUyMGVxdWlwbWVudHxlbnwxfHx8fDE3Njk2NTA1MDl8MA&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral';

        if (exerciseImageFile) {
            try {
                const uploadRes = await api.uploadFile(exerciseImageFile);
                if (uploadRes.url) {
                    uploadedImageUrl = uploadRes.url;
                }
            } catch (err) {
                console.error("Upload error:", err);
                showToast("圖片上傳失敗，將使用預設圖片", 'error');
            }
        }

        if (editingExerciseId) {
            const updates = {
                name: newExercise.name,
                muscle: newExercise.muscle,
                guide: newExercise.guide || '',
                imageUrl: uploadedImageUrl,
                level: newExercise.level || 1,
                tools: newExercise.tools || '無器材'
            };
            await api.updateExercise(editingExerciseId, updates);
            setExercises(exercises.map(ex => ex.id === editingExerciseId ? { ...ex, ...updates } : ex));
            showToast("動作更新成功！", 'success');
        } else {
            const exercise: Exercise = {
              id: Date.now().toString(),
              name: newExercise.name,
              muscle: newExercise.muscle,
              guide: newExercise.guide || '',
              imageUrl: uploadedImageUrl,
              author: currentUser?.name || 'Unknown',
              level: newExercise.level || 1,
              tools: newExercise.tools || '無器材'
            };
        
            await api.createExercise(exercise);
            setExercises([exercise, ...exercises]);
            showToast("更新成功！", 'success');
        }

        setNewExercise({ name: '', muscle: '', guide: '', imageUrl: '', level: 1, tools: '' });
        setExerciseImageFile(null);
        setEditingExerciseId(null);
        setIsCoachZoneOpen(false);
    } catch (error) {
        console.error("Operation failed:", error);
        showToast("操作失敗 (Failed)", 'error');
    } finally {
        setIsSubmitting(false);
    }
  };

  const handleDeleteExercise = async (id: string) => {
    if (window.confirm('確定要刪除這個動作嗎？此操作無法復原。')) {
      await api.deleteExercise(id);
      setExercises(exercises.filter(ex => ex.id !== id));
    }
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
    if (window.confirm('確定要刪除這條記錄嗎？')) {
      await api.deleteLog(id);
      setLogs(logs.filter(log => log.id !== id));
    }
  };

  const handleDuplicateLog = (log: Log) => {
    // Fill the Add Log form with this log's items and notes
    setCurrentSessionItems(log.items.map(item => ({
        ...item,
        id: Date.now().toString() + Math.random().toString(36).substr(2, 5) // New IDs
    })));
    setSessionNotes(log.notes);
    setIsLogModalOpen(true);
    showToast("日記內容已複製到新增畫面", 'success');
  };



  const updateLogFeedback = async (id: string, comment: string) => {
    const now = new Date();
    await api.updateLog(id, { coachComment: comment, coachIdWhoCommented: currentUser?.id, coachCommentDate: now });
    setLogs(logs.map(log => 
      log.id === id ? { 
        ...log, 
        coachComment: comment,
        coachIdWhoCommented: currentUser?.id,
        coachCommentDate: now
      } : log
    ));
    showToast('教練留言已更新！', 'success');
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
      routine: newBattle.routine.split('\n').filter(line => line.trim() !== ''),
      createdAt: new Date(),
      targetStudentId: newBattle.targetStudentId || 'all',
      records: []
    };

    await api.createBattle(battle);
    setBattles([battle, ...battles]);
    setIsCreatingBattle(false);
    setNewBattle({ title: '', routine: '', targetStudentId: '' });
  };

  const handleSubmitBattleRecord = async () => {
    if (!selectedBattleForRecord || !battleRecordInput.trim() || !currentUser) return;
    
    const record = {
       studentId: currentUser.id,
       studentName: currentUser.name,
       content: battleRecordInput
    };

    const res = await api.submitBattleRecord(selectedBattleForRecord.id, record);
    
    if (res.success) {
      setBattles(battles.map(b => b.id === selectedBattleForRecord.id ? res.battle : b));
      setSelectedBattleForRecord(null);
      setBattleRecordInput('');
    }
  };

  const handleDeleteBattle = async (id: string) => {
    if (!window.confirm('確定要刪除此挑戰嗎？')) return;
    await api.deleteBattle(id);
    setBattles(battles.filter(b => b.id !== id));
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

    let filteredLogs = [];

    if (currentUser.role === 'student') {
      // Show own logs AND shared logs from students with same coach
      filteredLogs = logs.filter(log => {
          if (log.studentId === currentUser.id) return true;
          if (log.isShared) {
              const logOwner = users.find(u => u.id === log.studentId);
              // Check if logOwner exists and shares the same coach
              if (logOwner && logOwner.coachId && logOwner.coachId === currentUser.coachId) {
                  return true;
              }
          }
          return false;
      });
    } else {
      // Coach (including Super Admin iisa acting as Coach)
      // Only see logs from students assigned to this coach
      filteredLogs = logs.filter(log => {
        const student = users.find(u => u.id === log.studentId);
        return student && student.coachId === currentUser.id;
      });
    }
    
    // If coach is viewing a specific student, filter further
    if (viewingStudentId && currentUser.role === 'coach') {
       filteredLogs = filteredLogs.filter(log => log.studentId === viewingStudentId);
    }

    // Sort by date descending (Newest first)
    return filteredLogs.sort((a, b) => {
        const dateA = new Date(a.date).getTime();
        const dateB = new Date(b.date).getTime();
        return dateB - dateA;
    });
  };

  useEffect(() => {
    if (!isLoading && currentUser && logs.length > 0 && !hasInitializedLogState.current) {
      const visible = getVisibleLogs();
      if (visible.length > 0) {
         setExpandedLogs([visible[0].id]);
      }
      hasInitializedLogState.current = true;
    }
  }, [isLoading, currentUser, logs]);

  // Helper to filter visible exercises
  const getVisibleExercises = () => {
    if (!currentUser) return [];
    
    let filteredExercises = [];

    // If student, filter by their coach's name
    if (currentUser.role === 'student') {
       if (!currentUser.coachId) {
          filteredExercises = [];
       } else {
          const myCoach = users.find(u => u.id === currentUser.coachId);
          filteredExercises = myCoach ? exercises.filter(ex => ex.author === myCoach.name) : [];
       }
    } else if (currentUser.role === 'coach') {
       // If coach, filter by their own name
       filteredExercises = exercises.filter(ex => ex.author === currentUser.name);
    } else {
       filteredExercises = exercises;
    }

    // Apply Search Filter
    if (wikiSearchTerm.trim()) {
      const lowerTerm = wikiSearchTerm.toLowerCase();
      filteredExercises = filteredExercises.filter(ex => 
        ex.name.toLowerCase().includes(lowerTerm) || 
        ex.muscle.toLowerCase().includes(lowerTerm) ||
        ex.guide.toLowerCase().includes(lowerTerm)
      );
    }
    
    return filteredExercises;
  };

  // Helper to get all available exercise names (Wiki + User History)
  const getAvailableExerciseNames = () => {
    const wikiNames = getVisibleExercises().map(ex => ex.name);
    let historyNames: string[] = [];
    
    if (currentUser) {
      // Get all unique exercise names from user's logs
      const targetId = (currentUser.role === 'coach' && viewingStudentId) ? viewingStudentId : currentUser.id;
      const myLogs = logs.filter(l => l.studentId === targetId);
      myLogs.forEach(log => {
        log.items.forEach(item => {
           if (item.exercise) historyNames.push(item.exercise);
        });
      });
    }
    
    // Combine and deduplicate, ignoring case
    const allNames = [...wikiNames, ...historyNames];
    const uniqueNames = Array.from(new Set(allNames.map(n => n.trim()))); // simple dedup first
    // improved dedup (case insensitive)
    const finalNames: string[] = [];
    const seenLower = new Set<string>();
    
    uniqueNames.forEach(name => {
      if (!seenLower.has(name.toLowerCase())) {
        seenLower.add(name.toLowerCase());
        finalNames.push(name);
      }
    });
    
    return finalNames.sort();
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
              label="密碼" 
              type="password"
              value={passwordInput}
              onChange={(e) => setPasswordInput(e.target.value)}
              placeholder="Enter your password..."
            />
            
            {isRegistering && (
              <div className="space-y-2">
                <label className="font-bold text-gray-900 uppercase text-sm">角色</label>
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

  // Block Student View if no coach assigned or coach is disabled
  const assignedCoach = users.find(u => u.id === currentUser.coachId);
  const isCoachDisabled = assignedCoach?.status === 'disabled';

  if (currentUser.role === 'student' && (!currentUser.coachId || isCoachDisabled)) {
    return (
      <div className="min-h-screen bg-[#f0f0f0] flex flex-col font-[DotGothic16]">
        <header className="bg-gray-900 text-white p-4 border-b-4 border-black sticky top-0 z-50">
          <div className="max-w-4xl mx-auto flex justify-between items-center">
            <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-[#ffcd38] border-2 border-white flex items-center justify-center text-black font-bold">P</div>
                <h1 className="text-xl font-bold text-[#ffcd38]">PIXEL GYM</h1>
            </div>
            <PixelButton variant="outline" size="sm" onClick={handleLogout} className="bg-gray-800 border-gray-600 text-white hover:bg-gray-700">
              <LogOut className="w-4 h-4" /> 登出
            </PixelButton>
          </div>
        </header>
        <div className="flex-1 flex items-center justify-center p-4">
          <PixelCard className="max-w-md text-center border-4 border-black shadow-[8px_8px_0_0_rgba(0,0,0,1)]">
            <div className="mb-6 flex justify-center">
              <div className="w-20 h-20 bg-[#ffcd38] rounded-full flex items-center justify-center border-4 border-black animate-bounce">
                <User className="w-10 h-10 text-black" />
              </div>
            </div>
            <h2 className="text-2xl font-bold mb-2 text-black">
              {isCoachDisabled ? '教練暫停服務' : '等待教練分發'}
              <br/>
              <span className="text-lg text-gray-500">
                {isCoachDisabled ? '(Coach Suspended)' : '(Waiting for Coach)'}
              </span>
            </h2>
            <p className="text-gray-600 mb-6 font-bold leading-relaxed">
              {isCoachDisabled 
                ? '您的教練帳號目前已被停用，請等待恢復或重新分配。' 
                : '您的帳號已啟用，但尚未分配專屬教練。'}
              <br/>
              <span className="text-sm font-normal">
                {isCoachDisabled 
                  ? 'Your coach account is currently disabled.' 
                  : 'Your account is active, but no coach has been assigned yet.'}
              </span>
            </p>
            <div className="bg-[#fffbeb] border-2 border-black p-4 text-sm text-black font-bold mb-6 shadow-[4px_4px_0_0_rgba(0,0,0,0.1)]">
              請聯繫管理員 (iisa) 為您安排教練後即可開始使用完整功能。<br/>
              <span className="text-xs text-gray-500 font-normal">Please contact admin (iisa) to assign a coach to unlock full features.</span>
            </div>
            <div className="flex justify-center">
                <span className="text-xs bg-gray-200 px-2 py-1 rounded text-gray-500 font-mono border border-gray-300">
                  STATUS: {isCoachDisabled ? 'COACH_SUSPENDED' : 'PENDING_ASSIGNMENT'}
                </span>
            </div>
          </PixelCard>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f0f0f0] flex flex-col font-[DotGothic16]">
      <PixelToast 
        message={toast.message} 
        type={toast.type} 
        isVisible={toast.isVisible} 
        onClose={hideToast}
      />
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
                {currentUser.name === 'iisa' ? 'Super Admin' : `${currentUser.name} (${currentUser.role === 'coach' ? 'Coach' : 'Student'})`}
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
              <Settings className="w-6 h-6" /> 帳號設定
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
                label="更新密碼" 
                type="password"
                placeholder="New Password..."
                value={settingsForm.password}
                onChange={e => setSettingsForm({...settingsForm, password: e.target.value})}
              />
              <div className="pt-2">
                <PixelButton type="submit" className="w-full" variant="accent">
                  確認更新
                </PixelButton>
              </div>
            </form>
          </PixelCard>
        </div>
      )}

      {/* Student Details Modal (Admin) */}
      {adminSelectedStudentId && (
        <div className="fixed inset-0 bg-black/80 z-[60] flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="w-full max-w-4xl max-h-[90vh] bg-white border-4 border-black shadow-[8px_8px_0_0_rgba(0,0,0,0.5)] flex flex-col relative animate-in zoom-in duration-200">
            <button 
              onClick={() => setAdminSelectedStudentId(null)}
              className="absolute top-4 right-4 text-gray-400 hover:text-black z-10"
            >
              <X className="w-8 h-8" />
            </button>

            {(() => {
              const student = users.find(u => u.id === adminSelectedStudentId);
              if (!student) return null;
              
              const studentLogs = logs.filter(l => l.studentId === student.id).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
              
              return (
                <>
                  <div className="p-6 pr-16 border-b-4 border-black bg-gray-50 flex items-center gap-4">
                     <div className={`w-16 h-16 rounded-full border-4 border-black flex items-center justify-center font-bold text-3xl ${student.status === 'active' ? 'bg-[#9333ea] text-white' : 'bg-gray-300 text-gray-500'}`}>
                       {student.name[0].toUpperCase()}
                     </div>
                     <div>
                       <h2 className="text-2xl font-bold flex items-center gap-2">
                         {student.name}
                         <span className={`text-xs px-2 py-1 rounded border-2 border-black ${student.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                           {student.status.toUpperCase()}
                         </span>
                       </h2>
                       <div className="text-sm text-gray-500 font-mono mt-1">
                         {studentLogs.length} 紀錄 • Coach: {users.find(u => u.id === student.coachId)?.name || 'None'}
                       </div>
                     </div>
                     
                     <div className="ml-auto flex gap-2">
                        <PixelButton 
                          variant="outline"
                          onClick={() => {
                             const headers = ['Date', 'Exercise', 'Weight(kg)', 'Sets', 'Reps', 'Tags', 'Notes', 'Coach Comment', 'Score'];
                             const csvRows = [headers.join(',')];
                             
                             studentLogs.forEach(log => {
                                log.items.forEach(item => {
                                   const row = [
                                      format(new Date(log.date), 'yyyy-MM-dd HH:mm'),
                                      `"${item.exercise.replace(/"/g, '""')}"`,
                                      item.weight,
                                      item.sets,
                                      item.reps,
                                      `"${item.muscle}"`,
                                      `"${(log.notes || '').replace(/"/g, '""')}"`,
                                      `"${(log.coachComment || '').replace(/"/g, '""')}"`,
                                      log.score || ''
                                   ];
                                   csvRows.push(row.join(','));
                                });
                             });
                             
                             const csvString = '\uFEFF' + csvRows.join('\n');
                             const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
                             const url = URL.createObjectURL(blob);
                             const link = document.createElement('a');
                             link.href = url;
                             link.setAttribute('download', `pixel_gym_${student.name}_logs.csv`);
                             document.body.appendChild(link);
                             link.click();
                             document.body.removeChild(link);
                          }}
                        >
                          <Share2 className="w-4 h-4 mr-2" /> 匯出 CSV
                        </PixelButton>
                     </div>
                  </div>

                  <div className="flex-1 overflow-y-auto p-6 bg-gray-100">
                     {studentLogs.length === 0 ? (
                       <div className="text-center py-20 text-gray-400">
                         <Dumbbell className="w-16 h-16 mx-auto mb-4 opacity-20" />
                         <p className="font-bold">尚無健身紀錄</p>
                       </div>
                     ) : (
                       <div className="space-y-4">
                         {studentLogs.map(log => (
                           <div key={log.id} className="bg-white border-2 border-black p-4 shadow-sm relative">
                              <div className="flex justify-between items-start mb-4 border-b-2 border-dashed border-gray-200 pb-2">
                                 <div>
                                    <div className="font-bold text-lg flex items-center gap-2">
                                      <Calendar className="w-5 h-5 text-gray-400" />
                                      {format(new Date(log.date), 'yyyy-MM-dd (EEEE)')}
                                    </div>
                                    {log.notes && <p className="text-sm text-gray-500 mt-1 italic">"{log.notes}"</p>}
                                 </div>
                                 {log.feedback && (
                                   <div className="bg-[#fff5f5] border border-[#ff6b6b] px-3 py-1 text-sm text-[#ff6b6b] rounded max-w-[200px]">
                                     <span className="font-bold block text-xs">Coach Feedback:</span>
                                     {log.feedback}
                                   </div>
                                 )}
                              </div>
                              
                              <div className="space-y-2">
                                {log.items.map((item, idx) => (
                                  <div key={idx} className="flex justify-between items-center bg-gray-50 p-2 rounded">
                                     <div className="font-bold">{item.exercise}</div>
                                     <div className="font-mono text-sm">
                                       <span className="text-[#9333ea] font-bold">{item.weight}kg</span>
                                       <span className="mx-2 text-gray-300">|</span>
                                       {item.sets} x {item.reps}
                                     </div>
                                  </div>
                                ))}
                              </div>
                           </div>
                         ))}
                       </div>
                     )}
                  </div>
                </>
              );
            })()}
          </div>
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
            onClick={() => setActiveTab('achievements')}
            className={`flex items-center gap-2 px-6 py-3 font-bold border-4 transition-all relative ${activeTab === 'achievements' ? 'bg-[#ff6b6b] border-black shadow-[4px_4px_0_0_black] -translate-y-1 text-white' : 'bg-gray-100 border-transparent text-gray-500 hover:bg-gray-200'}`}
          >
            <Trophy className="w-5 h-5" />
            成就
          </button>
          {currentUser.name === 'iisa' && (
             <button 
             onClick={() => setActiveTab('admin')}
             className={`flex items-center gap-2 px-6 py-3 font-bold border-4 transition-all ${activeTab === 'admin' ? 'bg-gray-800 text-white border-black shadow-[4px_4px_0_0_black] -translate-y-1' : 'bg-gray-100 border-transparent text-gray-500 hover:bg-gray-200'}`}
           >
             <User className="w-5 h-5" />
             全校學員
           </button>
          )}

          {currentUser.name === 'iisa' && (
            <>
               <button 
               onClick={() => setActiveTab('admin_accounts')}
               className={`flex items-center gap-2 px-6 py-3 font-bold border-4 transition-all ${activeTab === 'admin_accounts' ? 'bg-[#ffcd38] border-black shadow-[4px_4px_0_0_black] -translate-y-1' : 'bg-gray-100 border-transparent text-gray-500 hover:bg-gray-200'}`}
             >
               <User className="w-5 h-5" />
               全校教練
             </button>
            </>
          )}
        </div>
      </nav>

      {/* Content Area */}
      <main className="flex-1 max-w-4xl mx-auto w-full p-4 md:p-6 space-y-6">
        
        {/* LOG TAB */}
        {activeTab === 'log' && (
          <div className={`gap-6 animate-in slide-in-from-bottom-4 duration-500 ${currentUser.role !== 'coach' ? 'flex flex-col-reverse md:grid md:grid-cols-[1fr_300px]' : 'block'}`}>
            <div className="space-y-6">
              
              {/* MEMBER VIEW: Add Log */}
              {currentUser.role === 'student' && (
                <>
                  <PixelCard 
                    variant="accent"
                    className="p-4 md:p-6 flex flex-row md:flex-col items-center justify-center gap-4 cursor-pointer group mb-6 shadow-[6px_6px_0_0_black] hover:shadow-[2px_2px_0_0_black] hover:translate-x-1 hover:translate-y-1 transition-all border-4 border-black" 
                    onClick={() => setIsLogModalOpen(true)}
                  >
                    <div className="w-12 h-12 md:w-16 md:h-16 rounded-full bg-white border-4 border-black flex items-center justify-center group-hover:scale-110 transition-transform flex-shrink-0">
                      <Plus className="w-5 h-5 md:w-8 md:h-8 text-black" />
                    </div>
                    <h3 className="font-bold text-base md:text-xl text-black">記錄今日戰果</h3>
                  </PixelCard>

                  {/* Pinned Achievements */}
                  {currentUser.selectedBadgeIds && currentUser.selectedBadgeIds.length > 0 && (
                     <div className="mb-6 animate-in slide-in-from-top-2 duration-300">
                        <h3 className="font-bold text-lg mb-2 flex items-center gap-2 border-b-2 border-black pb-1">
                           <Trophy className="w-5 h-5 text-[#ffcd38]" /> 
                           我的榮耀 (My Glory)
                        </h3>
                        <div className="flex flex-wrap gap-2">
                           {systemAchievements
                              .filter(ach => currentUser.selectedBadgeIds?.includes(ach.id))
                              .map(ach => (
                                 <div key={ach.id} className="bg-white border-4 border-black px-4 py-2 shadow-[4px_4px_0_0_black] flex items-center gap-2">
                                    <span className="text-2xl">{ach.icon}</span>
                                    <span className="font-bold text-sm">{ach.name}</span>
                                 </div>
                              ))
                           }
                        </div>
                     </div>
                  )}
                </>
              )}

              {/* COACH VIEW: Student Logs List */}
              {currentUser.role === 'coach' ? (
                <div className="space-y-8">
                  {/* Mode 1: Student Grid (Entry View) */}
                  {!viewingStudentId ? (
                     <div className="space-y-6">
                        <div className="flex justify-between items-center border-b-4 border-black pb-4">
                           <h3 className="font-bold text-lg text-[#ff6b6b] flex items-center gap-2">
                              <User className="w-5 h-5"/> 我的學員
                           </h3>
                           <div className="flex items-center gap-2">

                                <PixelBadge>{users.filter(u => u.coachId === currentUser.id).length} Students</PixelBadge>
                           </div>
                        </div>

                        {(() => {
                           const myStudents = users.filter(u => u.coachId === currentUser.id);
                           
                           if (myStudents.length === 0) {
                              return (
                                 <PixelCard className="text-center text-gray-400 py-10 border-dashed">
                                    目前無學員
                                 </PixelCard>
                              );
                           }

                           return (
                              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                                 {myStudents.map(student => {
                                    const studentLogs = logs.filter(l => l.studentId === student.id);
                                    const totalWorkouts = studentLogs.length;
                                    const lastWorkout = studentLogs.length > 0 ? studentLogs[0].date : null;
                                    const pendingReviewCount = studentLogs.filter(l => !l.coachComment && l.score === undefined).length;
                                    
                                    // Calculate Badges
                                    const badges: any[] = [];
                                    
                                    // System Badges
                                    systemAchievements.forEach(ach => {
                                       if (student.name === 'mega' && ach.id === 'newbie') return;
                                       if (checkAchievement(ach, studentLogs)) {
                                          badges.push({ icon: ach.icon, name: ach.name, color: ach.color, id: ach.id });
                                       }
                                    });

                                    // Coach Defined Badges
                                    const coach = users.find(u => u.id === student.coachId);
                                    if (coach && coach.definedAchievements) {
                                        coach.definedAchievements.forEach(ach => {
                                            if (checkAchievement(ach, studentLogs)) {
                                                badges.push({ icon: ach.icon, name: ach.title, color: 'bg-blue-100 text-blue-700', id: ach.id });
                                            }
                                        });
                                    }
                                    
                                    // Calculate Max Weight (for stats)
                                    const maxWeight = studentLogs.reduce((max, log) => {
                                       const logMax = log.items.reduce((m, i) => Math.max(m, i.weight), 0);
                                       return Math.max(max, logMax);
                                    }, 0);

                                    // Add Custom Badges
                                    if (student.customBadges) {
                                       badges.push(...student.customBadges);
                                    }

                                    // Sort by Selection (Pinned First)
                                    if (student.selectedBadgeIds && student.selectedBadgeIds.length > 0) {
                                        badges.sort((a, b) => {
                                            const aSelected = a.id && student.selectedBadgeIds?.includes(a.id);
                                            const bSelected = b.id && student.selectedBadgeIds?.includes(b.id);
                                            if (aSelected && !bSelected) return -1;
                                            if (!aSelected && bSelected) return 1;
                                            return 0;
                                        });
                                    }

                                    return (
                                       <div key={student.id} 
                                       className={`bg-white border-4 border-black p-4 shadow-[4px_4px_0_0_rgba(0,0,0,0.1)] relative overflow-hidden group hover:-translate-y-1 transition-transform cursor-pointer flex flex-col`}
                                       onClick={() => setViewingStudentId(student.id)}
                                       >
                                          {pendingReviewCount > 0 && (
                                             <div className="absolute top-0 right-0 bg-[#ff6b6b] text-white text-xs font-bold px-2 py-1 animate-pulse z-10">
                                                {pendingReviewCount} 待查看
                                             </div>
                                          )}
                                          
                                          {student.status === 'disabled' && (
                                            <div className="absolute top-0 right-0 bg-red-500 text-white text-[10px] px-2 py-1 font-bold z-10">
                                              DISABLED
                                            </div>
                                          )}

                                          <div className="flex items-center gap-4 mb-4 border-b-2 border-dashed border-gray-200 pb-4">
                                            <div className={`w-12 h-12 rounded-full border-2 border-black flex items-center justify-center font-bold text-xl ${student.status === 'active' ? 'bg-[#9333ea] text-white' : 'bg-gray-300 text-gray-500'}`}>
                                              {student.name[0].toUpperCase()}
                                            </div>
                                            <div>
                                              <h3 className="font-bold text-lg group-hover:text-[#4ecdc4] transition-colors">{student.name}</h3>
                                              <div className="flex items-center gap-2 text-xs font-mono mt-1">
                                                 <div className={`w-2 h-2 rounded-full ${student.status === 'active' ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`}></div>
                                                 <span className="uppercase">{student.status}</span>
                                              </div>
                                            </div>
                                          </div>
                                          
                                          {/* Stats Grid */}
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
                                          
                                          {/* Badges Preview */}
                                          <div className="mb-4 flex-1">
                                            <div className="text-xs font-bold text-gray-400 mb-2 uppercase">Achievements</div>
                                            <div className="flex flex-wrap gap-1">
                                               {badges.length === 0 ? (
                                                  <span className="text-xs text-gray-300 italic">尚無成就</span>
                                               ) : (
                                                  badges.map((b, i) => (
                                                     <span key={i} className={`text-[10px] font-bold px-1.5 py-0.5 rounded border border-black/10 flex items-center gap-1 ${b.color}`} title={b.name}>
                                                        {b.icon} {b.name}
                                                     </span>
                                                  ))
                                               )}
                                            </div>
                                          </div>

                                          <div className="mt-auto pt-4 border-t-2 border-black">
                                            <PixelButton size="sm" className="w-full group-hover:bg-[#4ecdc4] group-hover:border-black group-hover:text-black transition-colors" onClick={(e) => {
                                               e.stopPropagation();
                                               setViewingStudentId(student.id);
                                            }}>
                                              <BookOpen className="w-4 h-4 mr-2" /> {student.status === 'disabled' ? '檢視紀錄' : '查看日記'}
                                            </PixelButton>
                                          </div>
                                       </div>
                                    );
                                 })}
                              </div>
                           );
                        })()}
                     </div>
                  ) : (
                     /* Mode 2: Log List (Detail View) */
                     <div className="space-y-6 animate-in slide-in-from-right-4">
                        <div className="flex justify-between items-center border-b-4 border-black pb-4">
                           <div className="flex items-center gap-4">
                              <button 
                                 onClick={() => setViewingStudentId(null)}
                                 className="bg-white border-2 border-black p-2 hover:bg-gray-100 transition-colors"
                              >
                                 <ChevronDown className="w-5 h-5 rotate-90" />
                              </button>
                              <div className="flex items-center gap-3">
                                 <div className="w-10 h-10 bg-[#4ecdc4] rounded-full border-2 border-white flex items-center justify-center text-black font-bold shadow-md">
                                    {users.find(u => u.id === viewingStudentId)?.name[0] || '?'}
                                 </div>
                                 <div>
                                    <h3 className="font-bold text-xl leading-none flex items-center gap-2">
                                       {users.find(u => u.id === viewingStudentId)?.name}
                                       {users.find(u => u.id === viewingStudentId)?.status === 'disabled' && (
                                          <span className="text-xs bg-red-100 text-red-600 px-2 py-0.5 rounded border border-red-200 font-bold whitespace-nowrap">
                                             ⚠️ 帳號已停用
                                          </span>
                                       )}
                                    </h3>
                                    <span className="text-xs text-gray-500 font-mono">
                                       {getVisibleLogs().length} 篇日記
                                    </span>
                                 </div>
                              </div>
                           </div>
                        </div>

                        {/* Stats & Actions Grid - Moved Up & Enhanced */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                           {/* Assign Plan Button - Matching Student's "Record Result" style */}
                           <PixelCard 
                             variant="accent"
                             className="p-4 flex items-center justify-center gap-4 cursor-pointer group shadow-[4px_4px_0_0_black] hover:shadow-[2px_2px_0_0_black] hover:translate-x-1 hover:translate-y-1 transition-all border-4 border-black" 
                             onClick={() => {
                                setNewItem({ exercise: '', weight: '', reps: '10', sets: '3', muscle: '' });
                                setIsLogModalOpen(true);
                             }}
                           >
                             <div className="w-12 h-12 rounded-full bg-white border-4 border-black flex items-center justify-center group-hover:scale-110 transition-transform flex-shrink-0">
                               <Plus className="w-6 h-6 text-black" />
                             </div>
                             <h3 className="font-bold text-xl text-black">指派課表</h3>
                           </PixelCard>

                           {/* Stats - Moved from sidebar */}
                           <PixelCard className="bg-white border-4 border-gray-200 p-4">
                             <div className="flex flex-row gap-4 justify-center items-center">
                                <div className="flex-1 text-center">
                                   <Flame className="w-8 h-8 mx-auto mb-1 text-gray-300" />
                                   <div className="text-2xl font-bold text-gray-800">{getVisibleLogs().length}</div>
                                   <div className="text-xs font-bold uppercase text-gray-400">Total Workouts</div>
                                </div>
                                <div className="w-0.5 h-12 bg-gray-200 dashed self-center"></div>
                                <div className="flex-1 text-center">
                                   <div className="w-8 h-8 mx-auto mb-1 flex items-center justify-center text-gray-300 font-black text-xl">M</div>
                                   <div className="text-2xl font-bold text-black flex justify-center items-baseline gap-0.5">
                                      {Math.max(0, ...getVisibleLogs().flatMap(l => l.items).map(i => Number(i.weight) || 0))} 
                                      <span className="text-[10px] text-gray-400">kg</span>
                                   </div>
                                   <div className="text-xs text-gray-400 uppercase font-bold">History Max</div>
                                </div>
                             </div>
                           </PixelCard>
                        </div>

                        {getVisibleLogs().length === 0 ? (
                           <PixelCard className="text-center text-gray-400 py-10 border-dashed">
                              此學員尚無日記
                           </PixelCard>
                        ) : (
                           <div className="space-y-4">
                              {getVisibleLogs().map(log => {
                                 const student = users.find(u => u.id === log.studentId);
                                 const commentingCoach = users.find(u => u.id === log.coachIdWhoCommented);
                                 const isExpanded = expandedLogs.includes(log.id);
                                 const isDisabled = student?.status === 'disabled';
                                 
                                 return (
                                   <div key={log.id} className={`bg-white border-2 border-black shadow-[4px_4px_0_0_rgba(0,0,0,0.1)] overflow-hidden transition-all ${log.isHidden ? 'opacity-50 grayscale' : ''} ${isDisabled ? 'grayscale opacity-80' : ''}`}>
                                      {/* Header Bar */}
                                      <div 
                                        className="flex justify-between items-center p-4 border-b border-gray-100 cursor-pointer hover:bg-gray-50 transition-colors"
                                           onClick={() => toggleLogExpansion(log.id)}
                                         >
                                         <div className="flex flex-col gap-1">
                                            <div className="flex items-center gap-2">
                                               <span className="font-bold text-lg text-gray-800">{format(new Date(log.date), 'yyyy-MM-dd')}</span>
                                               <span className="ml-2 text-xs bg-black text-[#ffcd38] px-2 py-0.5 font-bold border border-black">
                                                  MAX {log.items.length > 0 ? Math.max(...log.items.map(i => Number(i.weight) || 0)) : 0}kg
                                               </span>
                                               {!isExpanded && (
                                                 <span className="text-xs text-gray-400 font-mono hidden md:inline-block">
                                                    • {log.items.length} Items ({log.items.map(i => i.exercise).slice(0, 2).join(', ')}{log.items.length > 2 ? '...' : ''})
                                                 </span>
                                               )}
                                            </div>
                                            
                                            {/* Mobile Summary */}
                                            {!isExpanded && (
                                               <div className="text-xs text-gray-400 font-mono md:hidden mt-1">
                                                  {log.items.length} Items: {log.items.map(i => i.exercise).slice(0, 1).join(', ')}{log.items.length > 1 ? '...' : ''}
                                               </div>
                                            )}
                                         </div>
                                         
                                         <div className="flex items-center gap-3">
                                            <button 
                                              onClick={(e) => { e.stopPropagation(); handleDuplicateLog(log); }}
                                              className="text-gray-300 hover:text-black transition-colors"
                                              title="複製到新課表"
                                            >
                                              <Plus className="w-4 h-4" />
                                            </button>
                                            <button onClick={(e) => { e.stopPropagation(); toggleHideLog(log.id); }} className="text-gray-300 hover:text-[#4ecdc4] transition-colors" title={log.isHidden ? "顯示" : "隱藏"}>
                                               {log.isHidden ? <EyeOff size={18} /> : <Eye size={18} />}
                                            </button>
                                            <button onClick={(e) => { e.stopPropagation(); deleteLog(log.id); }} className="text-gray-300 hover:text-red-500 transition-colors" title="刪除">
                                               <Trash2 size={18} />
                                            </button>
                                            <div className="text-gray-400">
                                               {isExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                                            </div>
                                         </div>
                                         </div>
                                         
                                         {/* Content */}
                                         {isExpanded && (
                                         <div className="p-4 animate-in slide-in-from-top-2 duration-200">
                                            <div className="space-y-2 mb-4">
                                               {log.items.map((item, idx) => (
                                                 <div key={item.id} className="flex justify-between items-center text-sm border-b border-gray-100 last:border-0 py-1">
                                                    <div className="flex items-center gap-2">
                                                       <span className="text-gray-300 font-bold w-4">{idx + 1}.</span>
                                                       <span className="font-bold">{item.exercise}</span>
                                                       <span className="text-xs bg-gray-100 px-1 rounded text-gray-500">{item.muscle}</span>
                                                    </div>
                                                    <div className="font-mono font-bold text-gray-600">
                                                       {item.weight}kg x {item.sets}組 x {item.reps}
                                                    </div>
                                                 </div>
                                               ))}
                                            </div>
                                            
                                            {log.notes && (
                                               <div className="text-xs text-gray-500 bg-gray-50 p-2 border border-gray-200 italic mb-2">
                                                  "{log.notes}"
                                               </div>
                                            )}

                                            {/* Coach Feedback Section */}
                                            {(() => {
                                              const isGraded = !!log.coachComment;
                                              const isDisabled = student?.status === 'disabled';
                                              
                                              return (
                                                <div className={`border-t-2 border-dashed ${isGraded ? 'border-[#4ecdc4] bg-[#e6fffa]' : 'border-gray-300'} pt-4 mt-2 p-3 -mx-3 transition-colors`}>
                                                   <div className="flex flex-col gap-3">
                                                      {isGraded && (
                                                         <div className="flex items-center gap-2 mb-1 text-[#2c7a7b] font-bold text-xs uppercase tracking-wider">
                                                            <CheckCircle className="w-4 h-4" /> 
                                                            <span>已完成留言</span>
                                                            {log.coachCommentDate && (
                                                               <span className="text-gray-400 font-normal normal-case text-[10px] ml-auto">
                                                                  {format(new Date(log.coachCommentDate), 'MM/dd HH:mm')}
                                                               </span>
                                                            )}
                                                         </div>
                                                      )}
                                                      

                                                      <div className="flex gap-2">
                                                         <input 
                                                            type="text" 
                                                            defaultValue={log.coachComment}
                                                            disabled={isDisabled}
                                                            className={`flex-1 border-2 ${isGraded ? 'border-[#38b2ac]' : 'border-gray-300'} p-2 text-sm focus:border-black outline-none bg-white disabled:bg-gray-100 disabled:text-gray-400 disabled:border-gray-300`}
                                                            placeholder="給予指導建議..."
                                                            id={`comment-${log.id}`}
                                                         />
                                                         <PixelButton 
                                                            size="sm" 
                                                            variant={isGraded ? 'outline' : 'primary'}
                                                            disabled={isDisabled}
                                                            className={`${isGraded ? 'bg-white text-[#2c7a7b] border-[#2c7a7b] hover:bg-[#e6fffa]' : ''} ${isDisabled ? 'opacity-50 cursor-not-allowed' : ''}`}
                                                            onClick={() => {
                                                               if (isDisabled) return;
                                                               const commentInput = document.getElementById(`comment-${log.id}`) as HTMLInputElement;
                                                               updateLogFeedback(log.id, commentInput.value);
                                                            }}
                                                         >
                                                            {isGraded ? (
                                                              <><MessageSquare className="w-4 h-4" /> 更新</>
                                                            ) : (
                                                              <><MessageSquare className="w-4 h-4" /> 留言</>
                                                            )}
                                                         </PixelButton>
                                                      </div>
                                                   </div>
                                                </div>
                                              );
                                            })()}
                                         </div>
                                         )}
                                   </div>
                                 );
                              })}
                           </div>
                        )}
                     </div>
                  )}
                </div>
              ) : (
                /* MEMBER VIEW: Log History */
                <div className="space-y-4">
                  <h3 className="font-bold text-lg text-gray-500">紀錄</h3>
                  {getVisibleLogs().length === 0 ? (
                    <div className="text-center py-10 border-4 border-dashed border-gray-300 text-gray-400">
                      尚無記錄，快開始鍛鍊吧！
                    </div>
                  ) : (
                    getVisibleLogs().map(log => {
                      // Check if it's a plan
                      if (log.isPlan) {
                          return (
                              <PixelCard 
                                key={log.id} 
                                className={`border-dashed ${log.sharedFrom ? 'border-[#4ecdc4]' : 'border-[#ffcd38]'} bg-[#fffff0] p-4 cursor-pointer hover:scale-[1.02] transition-transform relative overflow-hidden group mb-4`}
                                onClick={() => {
                                    setCurrentSessionItems(log.items);
                                    setSessionNotes(log.notes);
                                    setActiveLogId(log.id);
                                    setIsLogModalOpen(true);
                                }}
                              >
                                 <div className={`absolute top-0 right-0 ${log.sharedFrom ? 'bg-[#4ecdc4]' : 'bg-[#ffcd38]'} text-black text-xs font-bold px-3 py-1 z-10`}>
                                    {log.sharedFrom ? '學員分享課表 (Shared)' : '待執行課表 (Assigned)'}
                                 </div>
                                 <div className="flex items-center gap-4 mb-2">
                                    <div className={`w-12 h-12 rounded-full bg-white border-4 ${log.sharedFrom ? 'border-[#4ecdc4]' : 'border-[#ffcd38]'} flex items-center justify-center shrink-0`}>
                                       {log.sharedFrom ? <Share2 className="w-6 h-6 text-[#4ecdc4]" /> : <Dumbbell className="w-6 h-6 text-[#ffcd38]" />}
                                    </div>
                                    <div>
                                       <h3 className="font-bold text-lg">
                                           {log.sharedFrom ? '學員分享課表 (Shared Plan)' : '教練指派課表 (Coach Assigned)'}
                                       </h3>
                                       <div className="text-xs text-gray-500 font-mono">{log.items.length} 項目 • {format(new Date(log.date), 'yyyy/MM/dd')}</div>
                                    </div>
                                 </div>
                                 <div className="pl-16 space-y-1 mb-3">
                                    {log.items.slice(0, 3).map((item, i) => (
                                       <div key={i} className="text-sm text-gray-600 font-mono">
                                          • <span className="font-bold">{item.exercise}</span> <span className="text-xs text-gray-400">({item.sets} x {item.reps})</span>
                                       </div>
                                    ))}
                                    {log.items.length > 3 && <div className="text-xs text-gray-400">...and {log.items.length - 3} more</div>}
                                 </div>
                                 
                                 {log.notes && (
                                    <div className={`ml-16 mb-3 bg-white/50 p-2 text-xs italic text-gray-500 border-l-2 ${log.sharedFrom ? 'border-[#4ecdc4]' : 'border-[#ffcd38]'}`}>
                                       {log.sharedFrom ? '分享備註' : '教練筆記'}: "{log.notes}"
                                    </div>
                                 )}
                                 
                                 <div className={`mt-2 pt-2 border-t-2 border-dashed ${log.sharedFrom ? 'border-[#4ecdc4]/30' : 'border-[#ffcd38]/30'} flex justify-end gap-2`}>
                                     <button 
                                        className="text-gray-400 hover:text-red-500 p-2"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            deleteLog(log.id);
                                        }}
                                     >
                                        <Trash2 className="w-4 h-4" />
                                     </button>
                                     <button className={`${log.sharedFrom ? 'bg-[#4ecdc4]' : 'bg-[#ffcd38]'} text-black font-bold px-4 py-2 border-2 border-black shadow-[2px_2px_0_0_black] hover:translate-y-[1px] hover:shadow-[1px_1px_0_0_black] transition-all text-sm flex items-center gap-2`}>
                                        <Plus className="w-4 h-4" /> 開始鍛鍊
                                     </button>
                                 </div>
                              </PixelCard>
                          );
                      }

                      const isExpanded = expandedLogs.includes(log.id);
                      
                       return (
                       <div key={log.id} className={`bg-white border-2 border-black shadow-[4px_4px_0_0_rgba(0,0,0,0.1)] overflow-hidden ${log.isShared ? 'border-l-8 border-l-[#4ecdc4]' : ''}`}>
                         {/* Header / Summary - Always Visible */}
                         <div 
                            className="flex justify-between items-center p-4 border-b border-gray-100 cursor-pointer hover:bg-gray-50 transition-colors"
                            onClick={() => toggleLogExpansion(log.id)}
                         >
                            <div className="flex flex-col gap-1">
                               <div className="flex items-center gap-2">
                                  {log.isShared && log.studentId !== currentUser.id && (
                                      <span className="text-[10px] bg-[#4ecdc4] text-black px-1.5 py-0.5 rounded-full font-bold flex items-center gap-1">
                                          <Share2 className="w-3 h-3" />
                                          {users.find(u => u.id === log.studentId)?.name}
                                      </span>
                                  )}
                                  <span className="font-bold text-lg text-gray-800">{format(new Date(log.date), 'yyyy-MM-dd')}</span>
                                  <span className="ml-2 text-xs bg-black text-[#ffcd38] px-2 py-0.5 font-bold border border-black">
                                     MAX {log.items.length > 0 ? Math.max(...log.items.map(i => Number(i.weight) || 0)) : 0}kg
                                  </span>
                                  {!isExpanded && (
                                    <span className="text-xs text-gray-400 font-mono hidden md:inline-block">
                                       • {log.items.length} Items ({log.items.map(i => i.exercise).slice(0, 2).join(', ')}{log.items.length > 2 ? '...' : ''})
                                    </span>
                                  )}
                               </div>
                               
                               {/* Mobile Summary */}
                               {!isExpanded && (
                                  <div className="text-xs text-gray-400 font-mono md:hidden mt-1">
                                     {log.items.length} Items: {log.items.map(i => i.exercise).slice(0, 1).join(', ')}{log.items.length > 1 ? '...' : ''}
                                  </div>
                               )}
                            </div>
                            
                            <div className="flex items-center gap-3">
                               <button 
                                 onClick={(e) => { e.stopPropagation(); handleDuplicateLog(log); }}
                                 className="text-gray-300 hover:text-black transition-colors"
                                 title="複製到新日記"
                               >
                                 <Plus className="w-4 h-4" />
                               </button>

                               {currentUser.id === log.studentId && (
                                   <button 
                                     onClick={(e) => { 
                                         e.stopPropagation(); 
                                         setLogIdToShare(log.id);
                                         setShareSelectedStudentIds([]);
                                         setIsShareModalOpen(true);
                                     }}
                                     className="text-gray-300 hover:text-[#4ecdc4] transition-colors"
                                     title="分享給同學"
                                   >
                                     <Share2 className="w-4 h-4" />
                                   </button>
                               )}

                               {/* Always show delete button for owner if needed, or hide inside expanded? Keeping it accessible is good but might clutter. Let's keep it here. */}
                               {(currentUser.id === log.studentId || currentUser.role === 'coach') && (
                                 <button 
                                   onClick={(e) => { e.stopPropagation(); deleteLog(log.id); }}
                                   className="text-gray-300 hover:text-red-500 transition-colors"
                                   title="Delete Log"
                                 >
                                   <Trash2 className="w-4 h-4" />
                                 </button>
                               )}
                               <div className="text-gray-400">
                                  {isExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                               </div>
                            </div>
                         </div>
                        
                        {/* Expanded Content */}
                        {isExpanded && (
                        <div className="p-4 animate-in slide-in-from-top-2 duration-200">
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
                                    <span className="font-bold text-sm text-[#ff6b6b]">教練回饋</span>
                                    {users.find(u => u.id === log.coachIdWhoCommented) && (
                                       <span className="text-gray-500 font-normal normal-case text-xs ml-1">
                                          by {users.find(u => u.id === log.coachIdWhoCommented)?.name}
                                       </span>
                                    )}
                                    {log.coachCommentDate && (
                                       <span className="text-gray-400 font-normal normal-case text-[10px] ml-auto">
                                          {format(new Date(log.coachCommentDate), 'MM/dd HH:mm')}
                                       </span>
                                    )}
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
                        )}
                      </div>
                    )})
                  )}
                </div>
              )}
            </div>


           </div>
         )}


          {/* SHARED LOG MODAL */}
          {isLogModalOpen && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
              <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto">
                <PixelCard className="relative shadow-[8px_8px_0_0_#4ecdc4] border-4 border-black">
                  <button 
                    onClick={() => {
                       setIsLogModalOpen(false);
                       setCurrentSessionItems([]);
                       setSessionNotes('');
                       setActiveLogId(null);
                       setNewItem({ exercise: '', weight: '', reps: '10', sets: '3', muscle: '' });
                    }}
                    className="absolute top-4 right-4 text-gray-400 hover:text-black bg-white border-2 border-black p-1 hover:bg-red-100"
                  >
                    <X className="w-6 h-6" />
                  </button>

                  <h2 className="text-xl font-bold mb-4 flex items-center gap-2 border-b-4 border-black pb-2 text-[#ff6b6b]">
                    <Dumbbell className="w-6 h-6" /> 
                    {currentUser.role === 'coach' && viewingStudentId 
                      ? `新增課表` 
                      : '戰果'}
                  </h2>
                  
                  {/* Coach: Plan Execution Date */}
                  {currentUser.role === 'coach' && (
                     <div className="mb-6 bg-[#fffff0] border-2 border-[#ffcd38] p-4">
                        <label className="block text-sm font-bold text-gray-700 mb-2 uppercase flex items-center gap-2">
                           <Calendar className="w-4 h-4" /> 預計執行時間
                        </label>
                        <input 
                           type="date"
                           value={planExecutionDate}
                           onChange={(e) => setPlanExecutionDate(e.target.value)}
                           className="w-full border-4 border-black p-2 font-bold focus:outline-none focus:shadow-[4px_4px_0_0_black] bg-white"
                        />
                     </div>
                  )}

                  {/* Student: Log Date */}
                  {currentUser.role !== 'coach' && (
                     <div className="mb-6 bg-gray-100 border-2 border-gray-300 p-4">
                        <label className="block text-sm font-bold text-gray-700 mb-2 uppercase flex items-center gap-2">
                           <Calendar className="w-4 h-4" /> 執行日期 (Date)
                        </label>
                        <input 
                           type="date"
                           value={studentLogDate}
                           onChange={(e) => setStudentLogDate(e.target.value)}
                           className="w-full border-4 border-black p-2 font-bold focus:outline-none focus:shadow-[4px_4px_0_0_black] bg-white"
                        />
                     </div>
                  )}
                  
                  {/* Current Items List */}
                  {currentSessionItems.length > 0 && (
                    <div className="mb-6 space-y-2">
                      <h4 className="font-bold text-gray-500 text-sm uppercase">本次項目</h4>
                      {currentSessionItems.map((item, idx) => (
                        <div key={item.id} className="bg-gray-100 border-2 border-gray-300 p-2 flex flex-col gap-2 text-sm">
                           <div className="flex justify-between items-center">
                              <div className="flex gap-2 items-center">
                                 <span className="bg-black text-white w-5 h-5 flex items-center justify-center text-xs font-bold rounded-full">{idx + 1}</span>
                                 <span className="font-bold">{item.exercise}</span>
                                 <PixelBadge variant="warning" className="text-[10px] py-0">{item.muscle}</PixelBadge>
                              </div>
                              {(currentUser.role === 'coach' || !activeLogId || !logs.find(l => l.id === activeLogId)?.isPlan) && (
                                <button onClick={() => handleRemoveItem(item.id)} className="text-red-500 hover:text-red-700">
                                   <Trash2 size={16} />
                                </button>
                              )}
                           </div>
                           
                           {/* Editable Inputs */}
                           <div className="flex items-center gap-2">
                              <div className="flex-1 flex items-center gap-1">
                                <input 
                                   type="number" 
                                   value={item.weight}
                                   onChange={(e) => handleUpdateItem(item.id, 'weight', e.target.value)} 
                                   className="w-full border-2 border-gray-300 p-1 font-bold text-center focus:border-black outline-none"
                                   placeholder="0"
                                />
                                <span className="text-xs text-gray-500">kg</span>
                              </div>
                              <span className="text-gray-300">x</span>
                              <div className="flex-1 flex items-center gap-1">
                                <input 
                                   type="number" 
                                   value={item.sets}
                                   onChange={(e) => handleUpdateItem(item.id, 'sets', e.target.value)} 
                                   className="w-full border-2 border-gray-300 p-1 font-bold text-center focus:border-black outline-none"
                                   placeholder="0"
                                />
                                <span className="text-xs text-gray-500">組</span>
                              </div>
                              <span className="text-gray-300">x</span>
                              <div className="flex-1 flex items-center gap-1">
                                <input 
                                   type="number" 
                                   value={item.reps}
                                   onChange={(e) => handleUpdateItem(item.id, 'reps', e.target.value)} 
                                   className="w-full border-2 border-gray-300 p-1 font-bold text-center focus:border-black outline-none"
                                   placeholder="0"
                                />
                                <span className="text-xs text-gray-500">次</span>
                              </div>
                           </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {(currentUser.role === 'coach' || !activeLogId || !logs.find(l => l.id === activeLogId)?.isPlan) && (
                  <div className="space-y-4 border-b-4 border-dotted border-gray-300 pb-6 mb-6">
                    
                    {/* Exercise Name */}
                    <div>
                        <PixelInput 
                          label="項目" 
                          placeholder="e.g. Bench Press" 
                          value={newItem.exercise}
                          list="exercise-list"
                          onChange={e => {
                            const val = e.target.value;
                            // Only search within visible exercises to maintain consistency
                            const existingExercise = getVisibleExercises().find(ex => ex.name.toLowerCase() === val.toLowerCase());
                            
                            // Try to find muscle from history if not in Wiki
                            let muscleToFill = existingExercise ? existingExercise.muscle : newItem.muscle;
                            
                            if (!existingExercise && currentUser && val.trim()) {
                               // Context aware history search
                               const targetId = (currentUser.role === 'coach' && viewingStudentId) ? viewingStudentId : currentUser.id;
                               const myLogs = logs.filter(l => l.studentId === targetId);
                               
                               for (const log of myLogs) {
                                  const foundItem = log.items.find(item => item.exercise.toLowerCase() === val.toLowerCase());
                                  if (foundItem && foundItem.muscle) {
                                     muscleToFill = foundItem.muscle;
                                     break; // Use the most recent muscle info
                                  }
                               }
                            }

                            setNewItem(prev => ({
                              ...prev,
                              exercise: val,
                              muscle: muscleToFill
                            }));
                          }}
                        />
                        <datalist id="exercise-list">
                          {getAvailableExerciseNames().map((name, i) => (
                            <option key={i} value={name} />
                          ))}
                        </datalist>
                        {(() => {
                           const matched = getVisibleExercises().find(ex => ex.name.toLowerCase() === newItem.exercise.toLowerCase());
                           if (matched && matched.level) {
                              return (
                                 <div className="mt-1 flex justify-end">
                                    <div className="bg-black text-[#ffcd38] border-2 border-white px-2 py-0.5 font-bold text-xs rounded shadow-sm flex items-center gap-1 animate-pulse">
                                        <span className="text-white">LV.{matched.level}</span> 
                                        <span>{Array(matched.level).fill('★').join('')}</span>
                                    </div>
                                 </div>
                              );
                           }
                           return null;
                        })()}
                    </div>

                    {/* Tags */}
                    <PixelInput 
                      label="動作標籤" 
                      placeholder="e.g. Chest" 
                      value={newItem.muscle}
                      onChange={e => setNewItem({...newItem, muscle: e.target.value})}
                    />

                    {/* Weight */}
                    <PixelInput 
                      label="重量 (Kg)" 
                      type="number" 
                      placeholder="0" 
                      value={newItem.weight}
                      onChange={e => setNewItem({...newItem, weight: e.target.value})}
                    />

                    {/* Sets & Reps */}
                    <div className="grid grid-cols-2 gap-4">
                      <PixelInput 
                        label="組數" 
                        type="number" 
                        placeholder="0" 
                        value={newItem.sets}
                        onChange={e => setNewItem({...newItem, sets: e.target.value})}
                        onFocus={() => {
                           if (newItem.sets === '3') setNewItem(prev => ({ ...prev, sets: '' }));
                        }}
                      />
                      <PixelInput 
                        label="次數" 
                        type="number" 
                        placeholder="0" 
                        value={newItem.reps}
                        onChange={e => setNewItem({...newItem, reps: e.target.value})}
                        onFocus={() => {
                           if (newItem.reps === '10') setNewItem(prev => ({ ...prev, reps: '' }));
                        }}
                      />
                    </div>
                    
                    <PixelButton type="button" onClick={handleAddItem} variant="primary" className="w-full border-4 border-black text-lg py-4 shadow-[4px_4px_0px_0px_#000]">
                      <Plus className="w-5 h-5 mr-2" /> 增加項目
                    </PixelButton>
                  </div>
                  )}
                  
                  <div className="space-y-4">
                    {currentUser.role !== 'coach' && (
                        <>
                          <PixelInput 
                            label="整組心得/筆記" 
                            placeholder="今天的狀況如何？" 
                            value={sessionNotes}
                            onChange={e => setSessionNotes(e.target.value)}
                          />
                          <PixelInput 
                             label="本次訓練總時長 (mins)" 
                             type="number"
                             placeholder="e.g. 60"
                             value={sessionDuration.toString()}
                             onChange={e => setSessionDuration(Number(e.target.value) || '')}
                          />
                        </>
                    )}
                    <div className="flex gap-2">
                        <PixelButton onClick={handleSubmitSession} className="flex-1" variant="primary">
                           {currentUser.role === 'coach' ? (viewingStudentId ? '指派課表' : '建立課表') : '完成今日鍛鍊'}
                        </PixelButton>
                        {currentUser.role === 'coach' && (
                            <PixelButton 
                                type="button" 
                                variant="secondary"
                                onClick={() => setIsAssignModalOpen(true)}
                                className="bg-[#4ecdc4] text-black border-black border-4"
                            >
                                多人指派
                            </PixelButton>
                        )}
                    </div>
                  </div>
                </PixelCard>
              </div>
            </div>
          )}

          {/* BULK ASSIGN MODAL */}
          {isAssignModalOpen && (
             <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
                <div className="w-full max-w-md bg-white border-4 border-black shadow-[8px_8px_0_0_#4ecdc4] p-6 relative">
                   <button 
                     onClick={() => setIsAssignModalOpen(false)}
                     className="absolute top-4 right-4 text-gray-400 hover:text-black"
                   >
                     <X className="w-6 h-6" />
                   </button>
                   
                   <h3 className="text-xl font-bold mb-4 flex items-center gap-2 border-b-4 border-black pb-2 text-[#4ecdc4]">
                      <User className="w-6 h-6" /> 選擇指派學員
                   </h3>
                   
                   <div className="mb-4">
                       <div className="flex justify-between items-center mb-2">
                           <span className="font-bold text-sm">我的學員 ({assignSelectedStudents.length})</span>
                           <button 
                             type="button"
                             className="text-xs underline text-blue-500 font-bold"
                             onClick={() => {
                                 const allMyStudentIds = users.filter(u => u.coachId === currentUser.id).map(u => u.id);
                                 if (assignSelectedStudents.length === allMyStudentIds.length) {
                                     setAssignSelectedStudents([]);
                                 } else {
                                     setAssignSelectedStudents(allMyStudentIds);
                                 }
                             }}
                           >
                             {assignSelectedStudents.length === users.filter(u => u.coachId === currentUser.id).length ? '取消全選' : '全選'}
                           </button>
                       </div>
                       
                       <div className="max-h-60 overflow-y-auto border-2 border-gray-200 p-2 space-y-2">
                           {users.filter(u => u.coachId === currentUser.id).length === 0 ? (
                               <div className="text-center text-gray-400 py-4">無學員</div>
                           ) : (
                               users.filter(u => u.coachId === currentUser.id).map(student => (
                                   <label key={student.id} className="flex items-center gap-2 p-2 hover:bg-gray-50 cursor-pointer border border-transparent hover:border-gray-200">
                                       <input 
                                          type="checkbox" 
                                          checked={assignSelectedStudents.includes(student.id)}
                                          onChange={() => toggleAssignStudent(student.id)}
                                          className="w-5 h-5 accent-[#4ecdc4]"
                                       />
                                       <span className="font-bold">{student.name}</span>
                                       {student.status === 'disabled' && <span className="text-xs text-red-500">(Disabled)</span>}
                                   </label>
                               ))
                           )}
                       </div>
                   </div>
                   
                   <PixelButton onClick={handleAssignPlan} className="w-full" variant="primary">
                       確認指派 ({assignSelectedStudents.length} 位)
                   </PixelButton>
                </div>
             </div>
          )}

          {/* STUDENT SHARE MODAL */}
          {isShareModalOpen && (
             <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
                <div className="w-full max-w-md bg-white border-4 border-black shadow-[8px_8px_0_0_#4ecdc4] p-6 relative">
                   <button 
                     onClick={() => {
                         setIsShareModalOpen(false);
                         setShareSelectedStudentIds([]);
                         setLogIdToShare(null);
                     }}
                     className="absolute top-4 right-4 text-gray-400 hover:text-black"
                   >
                     <X className="w-6 h-6" />
                   </button>
                   
                   <h3 className="text-xl font-bold mb-4 flex items-center gap-2 border-b-4 border-black pb-2 text-[#4ecdc4]">
                      <Share2 className="w-6 h-6" /> 分享給同教練學員
                   </h3>
                   
                   <div className="mb-4">
                       <div className="flex justify-between items-center mb-2">
                           <span className="font-bold text-sm">選擇同學</span>
                           <button 
                             type="button"
                             className="text-xs underline text-blue-500 font-bold"
                             onClick={() => {
                                 // Filter students with SAME coach, excluding self
                                 const peers = users.filter(u => 
                                     u.coachId === currentUser.coachId && 
                                     u.id !== currentUser.id &&
                                     u.role === 'student'
                                 ).map(u => u.id);
                                 
                                 if (shareSelectedStudentIds.length === peers.length) {
                                     setShareSelectedStudentIds([]);
                                 } else {
                                     setShareSelectedStudentIds(peers);
                                 }
                             }}
                           >
                             {shareSelectedStudentIds.length > 0 ? '取消全選' : '全選'}
                           </button>
                       </div>
                       
                       <div className="max-h-60 overflow-y-auto border-2 border-gray-200 p-2 space-y-2">
                           {users.filter(u => u.coachId === currentUser.coachId && u.id !== currentUser.id && u.role === 'student').length === 0 ? (
                               <div className="text-center text-gray-400 py-4">無其他同門師兄弟/姐妹</div>
                           ) : (
                               users.filter(u => u.coachId === currentUser.coachId && u.id !== currentUser.id && u.role === 'student').map(student => (
                                   <label key={student.id} className="flex items-center gap-2 p-2 hover:bg-gray-50 cursor-pointer border border-transparent hover:border-gray-200">
                                       <input 
                                          type="checkbox" 
                                          checked={shareSelectedStudentIds.includes(student.id)}
                                          onChange={() => {
                                              if (shareSelectedStudentIds.includes(student.id)) {
                                                  setShareSelectedStudentIds(prev => prev.filter(id => id !== student.id));
                                              } else {
                                                  setShareSelectedStudentIds(prev => [...prev, student.id]);
                                              }
                                          }}
                                          className="w-5 h-5 accent-[#4ecdc4]"
                                       />
                                       <span className="font-bold">{student.name}</span>
                                   </label>
                               ))
                           )}
                       </div>
                   </div>
                   
                   <PixelButton onClick={handleShareLog} className="w-full" variant="primary">
                       確認分享 ({shareSelectedStudentIds.length} 位)
                   </PixelButton>
                </div>
             </div>
          )}


        {/* WIKI TAB */}
        {activeTab === 'wiki' && (
          <div className="space-y-6 animate-in slide-in-from-right-4 duration-500">

             {/* Stats Block - Copied from Workout Diary */}
             <div className="mb-6">
                <PixelCard className="bg-white border-4 border-gray-200 p-4">
                   <div className="flex flex-row gap-4 justify-center items-center">
                      <div className="flex-1 text-center">
                         <BookOpen className="w-8 h-8 mx-auto mb-1 text-gray-300" />
                         <div className="text-2xl font-bold text-gray-800">{getVisibleExercises().length}</div>
                         <div className="text-xs font-bold uppercase text-gray-400">Total Exercises</div>
                      </div>
                      <div className="w-0.5 h-12 bg-gray-200 dashed self-center"></div>
                      <div className="flex-1 text-center">
                         <div className="w-8 h-8 mx-auto mb-1 flex items-center justify-center text-gray-300 font-black text-xl">
                            <Target className="w-6 h-6" />
                         </div>
                         <div className="text-2xl font-bold text-black flex justify-center items-baseline gap-0.5">
                            {new Set(getVisibleExercises().map(e => e.muscle)).size}
                            <span className="text-[10px] text-gray-400">types</span>
                         </div>
                         <div className="text-xs text-gray-400 uppercase font-bold">Muscle Groups</div>
                      </div>
                   </div>
                </PixelCard>
             </div>
             
             {/* Search & Actions Bar */}
             <div className="flex flex-col md:flex-row gap-4 justify-between items-start md:items-center mb-6">
                <div className="relative w-full md:w-auto flex-1 max-w-md">
                   <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Search className="h-5 w-5 text-gray-400" />
                   </div>
                   <input
                      type="text"
                      className="block w-full pl-10 pr-3 py-3 border-4 border-black font-bold placeholder-gray-400 focus:outline-none focus:shadow-[4px_4px_0_0_#4ecdc4]"
                      placeholder="搜尋動作..."
                      value={wikiSearchTerm}
                      onChange={(e) => setWikiSearchTerm(e.target.value)}
                   />
                </div>

                {currentUser.role === 'coach' && (
                   <div className="flex gap-2">
                     <PixelButton 
                       variant="accent" 
                       onClick={() => {
                          setEditingExerciseId(null);
                          setNewExercise({ name: '', muscle: '', guide: '', imageUrl: '', level: 1, tools: '' });
                          setIsCoachZoneOpen(true);
                       }}
                       className="shadow-[4px_4px_0_0_black] hover:translate-y-1 hover:shadow-none transition-all whitespace-nowrap"
                     >
                       <Camera className="w-5 h-5 mr-2" /> 教練上傳區
                     </PixelButton>
                   </div>
                )}
             </div>

            {/* Coach Zone Modal */}
            {isCoachZoneOpen && (
               <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
                 <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto">
                   <PixelCard className="relative shadow-[8px_8px_0_0_#4ecdc4] border-4 border-black">
                      <button 
                        onClick={() => setIsCoachZoneOpen(false)}
                        className="absolute top-4 right-4 text-gray-400 hover:text-black bg-white border-2 border-black p-1 hover:bg-red-100"
                      >
                        <X className="w-6 h-6" />
                      </button>
                      <h3 className="text-xl font-bold mb-4 text-[#ff6b6b] flex items-center gap-2 border-b-4 border-black pb-2">
                        <Camera className="w-6 h-6" /> {editingExerciseId ? '編輯動作' : '教練上傳區'}
                      </h3>
                      <form onSubmit={handleUploadExercise} className="grid md:grid-cols-2 gap-4">
                        <PixelInput 
                          label="動作名稱" 
                          value={newExercise.name} 
                          onChange={e => setNewExercise({...newExercise, name: e.target.value})}
                          placeholder="e.g. Barbell Squat"
                        />
                        <PixelInput 
                          label="動作標籤" 
                          value={newExercise.muscle} 
                          onChange={e => setNewExercise({...newExercise, muscle: e.target.value})}
                          placeholder="e.g. Legs"
                        />
                        <div className="md:col-span-2">
                          <PixelInput 
                            label="所需器材" 
                            value={newExercise.tools} 
                            onChange={e => setNewExercise({...newExercise, tools: e.target.value})}
                            placeholder="e.g. Dumbbell, Barbell, None"
                          />
                        </div>
                        <div className="md:col-span-2">
                           <label className="font-bold text-gray-900 uppercase text-sm mb-1 block">難度等級</label>
                           <div className="flex gap-4 items-center">
                              <div className="flex text-3xl cursor-pointer gap-1 bg-white border-4 border-black px-4 py-2 shadow-[4px_4px_0_0_black]">
                                 {[1, 2, 3, 4, 5].map((star) => (
                                    <span 
                                       key={star}
                                       onClick={() => setNewExercise({...newExercise, level: star})}
                                       className={`transition-all duration-200 hover:scale-110 active:scale-95 ${
                                          star <= (newExercise.level || 1) ? 'text-[#ffcd38] drop-shadow-[2px_2px_0_rgba(0,0,0,1)]' : 'text-gray-300'
                                       }`}
                                    >
                                       ★
                                    </span>
                                 ))}
                              </div>
                              <div className="font-bold text-xl text-[#ff6b6b] ml-2">
                                 LV.{newExercise.level || 1}
                              </div>
                           </div>
                        </div>
                        <div className="md:col-span-2">
                           <label className="font-bold text-gray-900 uppercase text-sm mb-1 block">動作圖片</label>
                           <input 
                              type="file" 
                              accept="image/*"
                              onChange={(e) => {
                                 if (e.target.files && e.target.files[0]) {
                                    setExerciseImageFile(e.target.files[0]);
                                 }
                              }}
                              className="w-full border-4 border-black p-2 font-bold focus:outline-none focus:shadow-[4px_4px_0_0_black] bg-white file:mr-4 file:py-2 file:px-4 file:border-2 file:border-black file:text-sm file:font-bold file:bg-gray-100 hover:file:bg-gray-200"
                           />
                           {editingExerciseId && (
                                <p className="text-xs text-gray-500 mt-1">* 留空則保留原圖</p>
                           )}
                        </div>
                        <div className="md:col-span-2">
                           <PixelInput 
                            label="姿勢介紹 / 重點" 
                            value={newExercise.guide} 
                            onChange={e => setNewExercise({...newExercise, guide: e.target.value})}
                            placeholder="描述動作要領..."
                          />
                        </div>
                        <div className="md:col-span-2 pt-2">
                          <PixelButton 
                            variant="secondary" 
                            type="submit" 
                            className="w-full font-bold text-lg shadow-[4px_4px_0_0_rgba(0,0,0,1)] hover:shadow-[2px_2px_0_0_rgba(0,0,0,1)] hover:translate-x-[2px] hover:translate-y-[2px] transition-all border-2 border-black"
                            isLoading={isSubmitting}
                          >
                             {editingExerciseId ? <CheckCircle className="w-5 h-5 mr-2" /> : <Plus className="w-5 h-5 mr-2" />} 
                             {editingExerciseId ? '更新動作' : '發布新動作'}
                          </PixelButton>
                        </div>
                      </form>
                   </PixelCard>
                 </div>
               </div>
            )}

            <div className="grid md:grid-cols-2 gap-6">
              {getVisibleExercises().length === 0 ? (
                <div className="md:col-span-2 text-center py-10 border-4 border-dashed border-gray-300 text-gray-400">
                   {wikiSearchTerm ? "找不到符合的動作" : (currentUser.role === 'coach' ? "您尚未發布任何動作" : "教練尚未發布任何動作")}
                </div>
              ) : (
                getVisibleExercises().map(ex => (
                <PixelCard key={ex.id} className="p-0 overflow-hidden flex flex-col">
                  <ExerciseImage src={ex.imageUrl} alt={ex.name} />
                  <div className="p-4 flex-1 flex flex-col">
                    <h3 className="text-xl font-bold mb-2">{ex.name}</h3>
                    
                    {/* Metadata Badges */}
                    <div className="flex flex-wrap gap-2 mb-3">
                        {ex.level && (
                           <div className="bg-black text-[#ffcd38] border-2 border-white px-2 py-0.5 font-bold text-xs shadow-sm flex items-center gap-1">
                              <span className="text-white">LV.{ex.level}</span> 
                              <span>{Array(ex.level).fill('★').join('')}</span>
                           </div>
                        )}
                        <PixelBadge variant="warning">{ex.muscle}</PixelBadge>
                        {ex.tools && (
                           <PixelBadge variant="outline" className="flex items-center gap-1 bg-white">
                              <Dumbbell className="w-3 h-3" />
                              {ex.tools}
                           </PixelBadge>
                        )}
                    </div>

                    <div className="flex-1 mb-4">
                        {ex.guide && ex.guide !== '無介紹' && (
                            <p className="text-sm text-gray-600 whitespace-pre-wrap">{ex.guide}</p>
                        )}
                    </div>
                    <div className="mt-4 pt-4 border-t-2 border-dashed border-gray-300 flex justify-between items-center text-xs text-gray-500">
                      <div className="flex items-center gap-1 font-bold text-gray-700">
                        <User className="w-3 h-3" />
                        <span>Coach {ex.author}</span>
                      </div>
                      <div className="flex items-center gap-3">
                         {ex.author === currentUser.name && (
                           <>
                               <button 
                                   onClick={() => handleStartEditExercise(ex)}
                                   className="text-gray-400 hover:text-blue-500 transition-colors"
                                   title="編輯此動作"
                               >
                                   <Edit className="w-4 h-4" />
                               </button>
                               <button 
                                   onClick={() => handleDeleteExercise(ex.id)}
                                   className="text-gray-400 hover:text-[#ff6b6b] transition-colors"
                                   title="刪除此動作"
                               >
                                   <Trash2 className="w-4 h-4" />
                               </button>
                           </>
                         )}
                      </div>
                    </div>
                  </div>
                </PixelCard>
              )))}
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
                     {isCreatingBattle ? '取消' : <><Plus className="w-4 h-4 mr-1"/> 發起挑戰</>}
                   </PixelButton>
                )}
             </div>

             {/* Battle Filters */}
             <div className="flex gap-2 mb-6 border-b-2 border-dashed border-gray-300 pb-4 overflow-x-auto">
                <PixelButton 
                   size="sm" 
                   variant={battleFilter === 'all' ? 'primary' : 'outline'}
                   onClick={() => setBattleFilter('all')}
                   className="whitespace-nowrap"
                >
                   🌍 觀看全部 (All)
                </PixelButton>
                <PixelButton 
                   size="sm" 
                   variant={battleFilter === 'received' ? 'primary' : 'outline'}
                   onClick={() => setBattleFilter('received')}
                   className="whitespace-nowrap relative"
                >
                   {currentUser.role === 'coach' ? '👨‍🎓 學生收到的挑戰 (Student Received)' : '📩 我收到的挑戰 (Received)'}
                   {currentUser.role !== 'coach' && battles.filter(b => b.targetStudentId === currentUser.id).length > 0 && (
                      <span className="ml-2 bg-black text-white px-1.5 py-0.5 rounded-full text-[10px]">
                        {battles.filter(b => b.targetStudentId === currentUser.id).length}
                      </span>
                   )}
                </PixelButton>
                <PixelButton 
                   size="sm" 
                   variant={battleFilter === 'sent' ? 'primary' : 'outline'}
                   onClick={() => setBattleFilter('sent')}
                   className="whitespace-nowrap"
                >
                   {currentUser.role === 'coach' ? '👨‍🎓 學生發起的挑戰 (Student Sent)' : '📤 我發起的挑戰 (Sent)'}
                </PixelButton>
             </div>

             {isCreatingBattle && currentUser.role !== 'coach' && (
                <PixelCard className="mb-6 border-dashed border-[#ff6b6b] bg-[#fff5f5]">
                  <div className="flex justify-between items-center mb-4">
                     <h3 className="font-bold">發起挑戰</h3>
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
                      <label className="font-bold text-gray-900 uppercase text-sm mb-1 block">指定挑戰對象</label>
                      <select 
                         className="w-full border-4 border-black p-2 font-bold focus:outline-none focus:shadow-[4px_4px_0_0_black] bg-white"
                         value={newBattle.targetStudentId}
                         onChange={e => setNewBattle({...newBattle, targetStudentId: e.target.value})}
                      >
                         <option value="">🌍 全員挑戰</option>
                         {users.filter(u => u.role === 'student' && u.name !== currentUser?.name).map(u => (
                            <option key={u.id} value={u.id}>👉 {u.name}</option>
                         ))}
                      </select>
                    </div>

                    <div>
                      <label className="font-bold text-gray-900 uppercase text-sm mb-1 block">菜單內容</label>
                      <textarea 
                        readOnly
                        className="w-full border-4 border-gray-200 p-2 font-mono focus:border-black outline-none min-h-[100px] bg-gray-100 text-gray-500 cursor-not-allowed"
                        placeholder="請點擊上方「從日記匯入」按鈕來選擇挑戰內容..."
                        value={newBattle.routine}
                      />
                    </div>
                    <PixelButton type="submit" variant="primary" className="w-full">發布挑戰</PixelButton>
                  </form>
                </PixelCard>
             )}

             <div className="space-y-4">
                {battles
                  .filter(battle => {
                     if (battleFilter === 'all') return true;
                     
                     if (currentUser.role === 'coach') {
                        if (battleFilter === 'received') {
                            // Battles where target is one of my students
                            return users.some(u => u.id === battle.targetStudentId && u.coachId === currentUser.id);
                        }
                        if (battleFilter === 'sent') {
                            // Battles created by one of my students
                            return users.some(u => u.name === battle.author && u.coachId === currentUser.id);
                        }
                     } else {
                        if (battleFilter === 'received') return battle.targetStudentId === currentUser.id;
                        if (battleFilter === 'sent') return battle.author === currentUser.name;
                     }
                     return true;
                  })
                  .map(battle => {
                   const isMyBattle = battle.author === currentUser?.name;
                   return (
                   <div key={battle.id} className={`bg-white border-4 p-4 hover:-translate-y-1 transition-transform cursor-pointer relative ${
                        isMyBattle 
                          ? 'border-[#4ecdc4] shadow-[6px_6px_0px_0px_#2d7a75]' 
                          : 'border-black shadow-[6px_6px_0px_0px_#ff6b6b]'
                      }`}>
                      <div className={`absolute -top-3 -right-3 border-2 border-black px-2 py-1 font-bold text-xs shadow-sm flex items-center gap-1 ${
                        isMyBattle ? 'bg-[#4ecdc4] text-white' : 'bg-[#fff] text-gray-500'
                      }`}>
                        {isMyBattle ? 'MY BATTLE' : (battle.createdAt ? format(new Date(battle.createdAt), 'yyyy/MM/dd') : 'CHALLENGE')}
                        {battle.targetStudentId && battle.targetStudentId !== 'all' && (
                           <span className="ml-1 bg-black text-white px-1 text-[10px] rounded">
                              To: {users.find(u => u.id === battle.targetStudentId)?.name || 'Unknown'}
                           </span>
                        )}
                      </div>
                      
                      <div className="flex justify-between items-start mb-4">
                         <div>
                            <h3 className="text-xl font-bold mb-1 flex items-center gap-2">
                               {battle.title}
                               {currentUser.name === 'iisa' && (
                                  <button 
                                    onClick={(e) => {
                                       e.stopPropagation();
                                       handleDeleteBattle(battle.id);
                                    }}
                                    className="text-gray-300 hover:text-red-500 transition-colors"
                                    title="刪除 (Delete)"
                                  >
                                    <Trash2 className="w-5 h-5" />
                                  </button>
                               )}
                            </h3>
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
                          <MessageSquare className="w-3 h-3" /> 留言 ({battle.comments?.length || 0})
                        </h4>
                        
                        {/* Existing Comments */}
                        {battle.comments && battle.comments.length > 0 ? (
                          <div className="space-y-2 mb-3 max-h-40 overflow-y-auto pr-2 custom-scrollbar">
                            {battle.comments.map(comment => (
                              <div key={comment.id} className="bg-gray-50 p-2 text-xs border border-gray-200 rounded-sm">
                                <div className="flex justify-between items-center mb-1 border-b border-gray-100 pb-1">
                                   <div className="flex items-center gap-2">
                                       <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold text-white ${
                                           comment.author === currentUser?.name ? 'bg-[#ff6b6b]' : 'bg-gray-400'
                                       }`}>
                                           {comment.author[0].toUpperCase()}
                                       </div>
                                       <span className={`font-bold ${comment.author === currentUser?.name ? 'text-[#ff6b6b]' : 'text-gray-700'}`}>
                                          {comment.author}:
                                       </span>
                                   </div>
                                   <span className="text-gray-400 text-[10px]">
                                     {format(new Date(comment.date), 'MM/dd HH:mm')}
                                   </span>
                                </div>
                                <p className="text-gray-600 break-words pl-7 font-medium">{comment.content}</p>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="text-xs text-gray-400 italic mb-3">尚無留言</div>
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
                      
                      {/* Records / Leaderboard */}
                      {battle.records && battle.records.length > 0 && (
                        <div className="mb-4 bg-gray-50 border-2 border-black p-3">
                           <h5 className="font-bold text-xs uppercase mb-2 flex items-center gap-1">
                              <Trophy className="w-3 h-3 text-[#ffcd38]" /> 
                              挑戰紀錄
                           </h5>
                           <div className="space-y-2">
                              {battle.records.map((record) => (
                                 <div key={record.id} className="flex justify-between items-start text-xs border-b border-gray-200 last:border-0 pb-2 last:pb-0">
                                    <div>
                                       <span className="font-bold text-[#9333ea] mr-2">{record.studentName}</span>
                                       <span className="text-gray-600">{record.content}</span>
                                    </div>
                                    <div className="text-gray-400 text-[10px] whitespace-nowrap ml-2">
                                       {format(new Date(record.completedAt), 'MM/dd')}
                                    </div>
                                 </div>
                              ))}
                           </div>
                        </div>
                      )}

                      <div className="flex gap-2">
                         {battle.author !== currentUser?.name && currentUser.role !== 'coach' && (
                            <PixelButton 
                               className="w-full" 
                               size="sm" 
                               onClick={() => setSelectedBattleForRecord(battle)}
                            >
                               接受挑戰
                            </PixelButton>
                         )}
                      </div>
                   </div>
                   );
                })}
             </div>
             
             {/* Record Submission Modal */}
             {selectedBattleForRecord && (
               <div className="fixed inset-0 bg-black/80 z-[60] flex items-center justify-center p-4 backdrop-blur-sm">
                  <div className="w-full max-w-md bg-white border-4 border-black shadow-[8px_8px_0_0_rgba(0,0,0,0.5)] flex flex-col relative animate-in zoom-in duration-200 p-6">
                     <button 
                        onClick={() => setSelectedBattleForRecord(null)}
                        className="absolute top-4 right-4 text-gray-400 hover:text-black"
                     >
                        <X className="w-6 h-6" />
                     </button>
                     
                     <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
                        <Sword className="w-6 h-6 text-[#ff6b6b]" />
                        提交挑戰成績
                     </h3>
                     
                     <div className="bg-gray-100 p-3 mb-4 border-l-4 border-[#ff6b6b] text-sm text-gray-600 italic">
                        {selectedBattleForRecord.title}
                     </div>

                     <div className="space-y-4">
                        <PixelInput 
                           label="完成內容 (Result: Kg, Reps, Sets)"
                           placeholder="e.g. 50kg, 12 reps, 3 sets"
                           value={battleRecordInput}
                           onChange={e => setBattleRecordInput(e.target.value)}
                        />
                        <PixelButton className="w-full" onClick={handleSubmitBattleRecord}>
                           提交
                        </PixelButton>
                     </div>
                  </div>
               </div>
             )}
          </div>
        )}


        {/* ACHIEVEMENTS TAB */}
        {activeTab === 'achievements' && (
           <div className="space-y-8 animate-in slide-in-from-right-4 duration-500">
             {/* STUDENT VIEW */}
             {currentUser.role === 'student' && (
                <>
                   {/* System Achievements */}
                   <div>
                      <h2 className="text-2xl font-bold mb-4 flex items-center gap-2 border-b-4 border-black pb-2 text-[#ff6b6b]">
                        <Trophy className="w-6 h-6" /> 系統成就
                      </h2>
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                         {systemAchievements.map(ach => {
                            const { isUnlocked, current, threshold, progressText } = getAchievementProgress(ach, logs.filter(l => l.studentId === currentUser.id));
                            const isSelected = currentUser.selectedBadgeIds?.includes(ach.id);

                            return (
                               <div 
                                  key={ach.id} 
                                  onClick={() => isUnlocked && handleToggleBadgeSelection(ach.id)}
                                  className={`border-4 p-4 relative transition-all ${
                                     isUnlocked 
                                     ? `bg-white border-black shadow-[4px_4px_0_0_black] cursor-pointer hover:-translate-y-1 hover:shadow-[6px_6px_0_0_black] ${isSelected ? 'ring-4 ring-[#ffcd38] ring-offset-2' : ''}` 
                                     : 'bg-gray-100 border-gray-300 text-gray-400 grayscale'
                                  }`}
                               >
                                  {isSelected && (
                                      <div className="absolute top-2 right-2 text-[#ffcd38]">
                                          <CheckCircle className="w-6 h-6 fill-black" />
                                      </div>
                                  )}
                                  
                                  <div className="text-3xl mb-2">{ach.icon}</div>
                                  <h3 className="font-bold">{ach.name}</h3>
                                  <p className="text-xs mt-1 mb-2">{ach.description}</p>
                                  
                                  {/* Progress Bar */}
                                  <div className="w-full bg-gray-200 h-2 mt-2 rounded-full overflow-hidden border border-black/10">
                                      <div 
                                          className={`h-full ${isUnlocked ? 'bg-[#9333ea]' : 'bg-gray-400'}`} 
                                          style={{ width: `${Math.min((current / threshold) * 100, 100)}%` }}
                                      />
                                  </div>
                                  <div className="flex justify-between items-center mt-1">
                                       <span className="text-[10px] font-bold font-mono">{progressText}</span>
                                       {!isUnlocked && (
                                          <span className="text-[10px] font-bold bg-black text-white px-1.5 py-0.5">LOCKED</span>
                                       )}
                                       {isUnlocked && !isSelected && (
                                          <span className="text-[10px] text-gray-400">Click to Select</span>
                                       )}
                                  </div>
                               </div>
                            );
                         })}
                      </div>
                   </div>

                   {/* Coach Achievements */}
                   <div>
                      <h2 className="text-2xl font-bold mb-4 flex items-center gap-2 border-b-4 border-black pb-2 text-[#4ecdc4]">
                        <Star className="w-6 h-6" /> 教練成就 (Coach Challenges)
                      </h2>
                      
                      {(() => {
                         // Combine Legacy Custom Badges + Defined Achievements
                         const coach = users.find(u => u.id === currentUser.coachId);
                         
                         // Legacy Badges
                         const legacyBadges = currentUser.customBadges || [];

                         return (
                            <div className="space-y-6">
                                {/* Coach Defined Challenges */}
                                {coach && coach.definedAchievements && coach.definedAchievements.length > 0 && (
                                   <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                                      {coach.definedAchievements.map(ach => {
                                           const { isUnlocked, current, threshold, progressText } = getAchievementProgress(ach, logs.filter(l => l.studentId === currentUser.id));
                                           const isSelected = currentUser.selectedBadgeIds?.includes(ach.id);

                                           return (
                                              <div 
                                                 key={ach.id} 
                                                 onClick={() => isUnlocked && handleToggleBadgeSelection(ach.id)}
                                                 className={`border-4 p-4 relative transition-all ${
                                                    isUnlocked 
                                                    ? `bg-white border-black shadow-[4px_4px_0_0_black] cursor-pointer hover:-translate-y-1 hover:shadow-[6px_6px_0_0_black] ${isSelected ? 'ring-4 ring-[#ffcd38] ring-offset-2' : ''}` 
                                                    : 'bg-gray-100 border-gray-300 text-gray-400 grayscale'
                                                 }`}
                                              >
                                                 {isSelected && (
                                                     <div className="absolute top-2 right-2 text-[#ffcd38]">
                                                         <CheckCircle className="w-6 h-6 fill-black" />
                                                     </div>
                                                 )}
                                                 
                                                 <div className="text-3xl mb-2">{ach.icon}</div>
                                                 <h3 className="font-bold">{ach.title}</h3>
                                                 <p className="text-xs mt-1 mb-2">{ach.description}</p>
                                                 
                                                 {/* Progress Bar */}
                                                 <div className="w-full bg-gray-200 h-2 mt-2 rounded-full overflow-hidden border border-black/10">
                                                     <div 
                                                         className={`h-full ${isUnlocked ? 'bg-[#4ecdc4]' : 'bg-gray-400'}`} 
                                                         style={{ width: `${Math.min((current / threshold) * 100, 100)}%` }}
                                                     />
                                                 </div>
                                                 <div className="flex justify-between items-center mt-1">
                                                      <span className="text-[10px] font-bold font-mono">{progressText}</span>
                                                      {!isUnlocked && (
                                                         <span className="text-[10px] font-bold bg-black text-white px-1.5 py-0.5">LOCKED</span>
                                                      )}
                                                 </div>
                                              </div>
                                           );
                                      })}
                                   </div>
                                )}

                                {/* Legacy Manual Badges */}
                                {legacyBadges.length > 0 && (
                                   <>
                                      <h3 className="text-sm font-bold text-gray-400 uppercase mt-4">Legacy Awards</h3>
                                      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                                         {legacyBadges.map((badge, idx) => (
                                            <div key={idx} className={`border-4 border-black p-4 bg-white shadow-[4px_4px_0_0_black] ${badge.color}`}>
                                               <div className="text-3xl mb-2">{badge.icon}</div>
                                               <h3 className="font-bold">{badge.name}</h3>
                                               <p className="text-xs mt-1">來自教練的獎勵</p>
                                            </div>
                                         ))}
                                      </div>
                                   </>
                                )}
                                
                                {(!coach?.definedAchievements?.length && !legacyBadges.length) && (
                                    <div className="p-8 border-4 border-dashed border-gray-300 text-center text-gray-400 rounded-lg bg-gray-50">
                                        尚未獲得教練成就
                                    </div>
                                )}
                            </div>
                         );
                      })()}
                   </div>
                </>
             )}

             {/* COACH/ADMIN VIEW */}
             {currentUser.role === 'coach' && (
                <>
                   {/* System Achievements Management */}
                   <div>
                      <h2 className="text-2xl font-bold mb-4 flex items-center gap-2 border-b-4 border-black pb-2 text-[#ff6b6b]">
                        <Trophy className="w-6 h-6" /> 系統成就
                      </h2>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                         {systemAchievements.map(ach => (
                            <div key={ach.id} className="border-4 border-black p-4 bg-white shadow-[4px_4px_0_0_black] flex justify-between items-center">
                               <div>
                                  <div className="flex items-center gap-2 mb-1">
                                     <span className="text-2xl">{ach.icon}</span>
                                     <h3 className="font-bold">{ach.name}</h3>
                                  </div>
                                  <p className="text-sm text-gray-600">{ach.description}</p>
                                  <p className="text-xs text-gray-400 mt-1 font-mono">Condition: {ach.type} {'>='} {ach.threshold}</p>
                               </div>
                               {currentUser.name === 'iisa' && (
                                  <PixelButton size="sm" variant="outline" onClick={() => {
                                     const newThreshold = prompt(`Update threshold for ${ach.name}`, ach.threshold.toString());
                                     if (newThreshold) {
                                        setSystemAchievements(prev => prev.map(p => p.id === ach.id ? { ...p, threshold: Number(newThreshold) } : p));
                                     }
                                  }}>
                                     <Edit className="w-4 h-4" />
                                  </PixelButton>
                               )}
                            </div>
                         ))}
                      </div>
                      {currentUser.name === 'iisa' && (
                         <p className="text-xs text-gray-500 mt-2">* Admin can edit thresholds by clicking the edit icon.</p>
                      )}
                   </div>

                   {/* Custom Tasks / Badges Management */}
                   <div>
                      <h2 className="text-2xl font-bold mb-4 flex items-center gap-2 border-b-4 border-black pb-2 text-[#4ecdc4]">
                        <Star className="w-6 h-6" /> 自訂成就任務 (My Student Challenges)
                      </h2>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                         {currentUser.definedAchievements?.map(ach => (
                            <div key={ach.id} className="border-4 border-black p-4 bg-white flex justify-between items-center relative overflow-hidden group">
                               <div>
                                  <div className="flex items-center gap-2 mb-1">
                                     <span className="text-2xl">{ach.icon}</span>
                                     <h3 className="font-bold">{ach.title}</h3>
                                  </div>
                                  <p className="text-sm text-gray-600">{ach.description}</p>
                                  <div className="text-[10px] bg-gray-100 text-gray-500 inline-block px-1 mt-1 font-mono">
                                     {ach.criteriaType} {'>='} {ach.criteriaValue}
                                  </div>
                               </div>
                               <PixelButton 
                                  size="sm" 
                                  variant="secondary"
                                  className="text-red-500 hover:bg-red-50"
                                  onClick={async () => {
                                      if (confirm("Delete this challenge?")) {
                                          const newDefined = currentUser.definedAchievements?.filter(a => a.id !== ach.id);
                                          const updatedUser = { ...currentUser, definedAchievements: newDefined };
                                          setCurrentUser(updatedUser);
                                          setUsers(users.map(u => u.id === currentUser.id ? updatedUser : u));
                                          await api.updateAccount({ definedAchievements: newDefined });
                                      }
                                  }}
                               >
                                  <Trash2 className="w-4 h-4" />
                               </PixelButton>
                            </div>
                         ))}
                         
                         <button 
                            className="border-4 border-dashed border-gray-300 p-4 flex flex-col items-center justify-center text-gray-400 hover:border-black hover:text-black transition-colors"
                            onClick={() => {
                               setIsAchievementModalOpen(true);
                               setNewAchievement({
                                   title: '', description: '', icon: '🏆', criteriaType: 'log_count', criteriaValue: 5, targetAudience: 'students'
                               });
                            }}
                         >
                            <Plus className="w-8 h-8 mb-2" />
                            <span className="font-bold">Create New Challenge</span>
                         </button>
                      </div>
                   </div>

                   {/* Create Achievement Modal */}
                   {isAchievementModalOpen && (
                      <div className="fixed inset-0 bg-black/80 z-[60] flex items-center justify-center p-4 backdrop-blur-sm">
                         <div className="w-full max-w-md bg-white border-4 border-black shadow-[8px_8px_0_0_rgba(0,0,0,0.5)] flex flex-col relative animate-in zoom-in duration-200 p-6">
                            <button 
                               onClick={() => setIsAchievementModalOpen(false)}
                               className="absolute top-4 right-4 text-gray-400 hover:text-black"
                            >
                               <X className="w-6 h-6" />
                            </button>
                            
                            <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
                               <Star className="w-6 h-6 text-[#4ecdc4]" />
                               建立新挑戰
                            </h3>
                            
                            <div className="space-y-4">
                               <PixelInput 
                                  label="成就名稱 (Title)" 
                                  value={newAchievement.title} 
                                  onChange={e => setNewAchievement({...newAchievement, title: e.target.value})} 
                                  placeholder="e.g. 核心殺手"
                               />
                               <PixelInput 
                                  label="描述 (Description)" 
                                  value={newAchievement.description} 
                                  onChange={e => setNewAchievement({...newAchievement, description: e.target.value})} 
                                  placeholder="e.g. 完成 10 次核心訓練"
                               />
                               <div className="flex gap-2">
                                   <div className="w-1/3">
                                       <PixelInput 
                                          label="圖示 (Emoji)" 
                                          value={newAchievement.icon} 
                                          onChange={e => setNewAchievement({...newAchievement, icon: e.target.value})} 
                                       />
                                   </div>
                                   <div className="flex-1">
                                       <label className="text-xs font-bold mb-1 block uppercase text-gray-500">條件類型 (Criteria)</label>
                                       <select 
                                          className="w-full border-2 border-black p-2 font-bold bg-white"
                                          value={newAchievement.criteriaType}
                                          onChange={e => setNewAchievement({...newAchievement, criteriaType: e.target.value as any})}
                                       >
                                           <option value="log_count">訓練次數 (Log Count)</option>
                                           <option value="max_weight">最大重量 (Max Weight)</option>
                                           <option value="total_time">訓練總時間 (Total Time)</option>
                                           <option value="plan_count">完成課表數 (Completed Plans)</option>
                                       </select>
                                   </div>
                               </div>
                               
                               <div className="flex gap-2">
                                   <div className="flex-1">
                                      <PixelInput 
                                         label="目標數值 (Threshold)" 
                                         type="number"
                                         value={newAchievement.criteriaValue?.toString()} 
                                         onChange={e => setNewAchievement({...newAchievement, criteriaValue: Number(e.target.value)})} 
                                      />
                                   </div>
                                   {newAchievement.criteriaType === 'max_weight' && (
                                       <div className="flex-1">
                                           <PixelInput 
                                              label="指定動作 (Optional)" 
                                              value={newAchievement.criteriaExercise || ''} 
                                              onChange={e => setNewAchievement({...newAchievement, criteriaExercise: e.target.value})} 
                                              placeholder="Any"
                                           />
                                       </div>
                                   )}
                               </div>

                               <PixelButton className="w-full" onClick={async () => {
                                   if (!newAchievement.title || !newAchievement.criteriaValue) return;
                                   
                                   const ach: Achievement = {
                                       id: `coach_${Date.now()}`,
                                       creatorId: currentUser.id,
                                       targetAudience: 'students',
                                       title: newAchievement.title!,
                                       description: newAchievement.description || '',
                                       icon: newAchievement.icon || '🏆',
                                       criteriaType: newAchievement.criteriaType as any,
                                       criteriaValue: newAchievement.criteriaValue!,
                                       criteriaExercise: newAchievement.criteriaExercise
                                   };
                                   
                                   const newDefined = [...(currentUser.definedAchievements || []), ach];
                                   const updatedUser = { ...currentUser, definedAchievements: newDefined };
                                   
                                   setCurrentUser(updatedUser);
                                   setUsers(users.map(u => u.id === currentUser.id ? updatedUser : u));
                                   await api.updateAccount({ definedAchievements: newDefined });
                                   
                                   setIsAchievementModalOpen(false);
                                   showToast("新挑戰已建立！", 'success');
                               }}>
                                  建立挑戰
                               </PixelButton>
                            </div>
                         </div>
                      </div>
                   )}
                </>
             )}
           </div>
        )}

        {/* ADMIN TAB */}
        {/* ADMIN TAB (Regular Coach & Admin Personal View) */}
        {activeTab === 'admin' && (currentUser.role === 'coach' || currentUser.name === 'iisa') && (
           <div className="space-y-6 animate-in slide-in-from-right-4 duration-500">
                <div className="space-y-6">
                  <div className="flex justify-between items-center border-b-4 border-black pb-4">
                     <h2 className="text-2xl font-bold text-[#4ecdc4] flex items-center gap-2">
                        <User className="w-8 h-8" /> {currentUser.name === 'iisa' ? '全校學員' : '我的學員'}
                     </h2>
                     
                     <div className="flex items-center gap-3">
                       <PixelBadge variant="accent" className="text-lg">
                         {currentUser.name === 'iisa' 
                           ? users.filter(u => u.role === 'student').length 
                           : users.filter(u => u.coachId === currentUser.id).length} Students
                       </PixelBadge>
                     </div>
                  </div>

                  <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                     {(() => {
                       const targetStudents = currentUser.name === 'iisa' 
                         ? users.filter(u => u.role === 'student')
                         : users.filter(u => u.coachId === currentUser.id);

                       if (targetStudents.length === 0) {
                         return (
                           <div className="col-span-3 text-center py-10 border-4 border-dashed border-gray-300 rounded bg-gray-50">
                             <User className="w-12 h-12 mx-auto text-gray-300 mb-2" />
                             <p className="text-gray-500 font-bold">目前無學員 (No Students)</p>
                           </div>
                         );
                       }

                       return targetStudents.map(student => {
                         const studentLogs = logs.filter(l => l.studentId === student.id);
                         const totalWorkouts = studentLogs.length;
                         const lastWorkout = studentLogs.length > 0 ? studentLogs[0].date : null;
                         
                         // Calculate Badges
                         const badges: any[] = [];
                         systemAchievements.forEach(ach => {
                             if (checkAchievement(ach, studentLogs)) {
                                 badges.push({ icon: ach.icon, name: ach.name, color: ach.color, id: ach.id });
                             }
                         });
                         
                         // Calculate Max Weight (for stats)
                         const maxWeight = studentLogs.reduce((max, log) => {
                            const logMax = log.items.reduce((m, i) => Math.max(m, i.weight), 0);
                            return Math.max(max, logMax);
                         }, 0);
                         
                         // Add Custom Badges
                         if (student.customBadges) {
                            badges.push(...student.customBadges);
                         }

                         // Sort by Selection (Pinned First)
                         if (student.selectedBadgeIds && student.selectedBadgeIds.length > 0) {
                             badges.sort((a, b) => {
                                 const aSelected = a.id && student.selectedBadgeIds?.includes(a.id);
                                 const bSelected = b.id && student.selectedBadgeIds?.includes(b.id);
                                 if (aSelected && !bSelected) return -1;
                                 if (!aSelected && bSelected) return 1;
                                 return 0;
                             });
                         }

                         return (
                           <div key={student.id} className={`bg-white border-4 border-black p-4 shadow-[4px_4px_0_0_rgba(0,0,0,0.1)] relative overflow-hidden flex flex-col`}>
                               {student.status === 'disabled' && (
                                 <div className="absolute inset-0 bg-gray-100/50 backdrop-grayscale z-0 pointer-events-none" />
                               )}
                               
                               <div className="relative z-10 flex flex-col h-full">
                                  {student.status === 'disabled' && (
                                    <div className="absolute top-0 right-0 bg-red-500 text-white text-[10px] px-2 py-1 font-bold z-20">
                                      DISABLED
                                    </div>
                                  )}
                                  
                                  <div className="flex items-center gap-4 mb-4 border-b-2 border-dashed border-gray-200 pb-4">
                                    <div className={`w-12 h-12 rounded-full border-2 border-black flex items-center justify-center font-bold text-xl ${student.status === 'active' ? 'bg-[#9333ea] text-white' : 'bg-gray-300 text-gray-500'}`}>
                                      {student.name[0].toUpperCase()}
                                    </div>
                                    <div>
                                      <h3 className="font-bold text-lg">{student.name}</h3>
                                      <div className="flex items-center gap-2 text-xs font-mono mt-1">
                                         <div className={`w-2 h-2 rounded-full ${student.status === 'active' ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`}></div>
                                         <span className="uppercase">{student.status}</span>
                                         {currentUser.name === 'iisa' && student.coachId && (
                                           <span className="bg-gray-100 px-1 rounded text-gray-500 ml-1">
                                             Coach: {users.find(u => u.id === student.coachId)?.name}
                                           </span>
                                         )}
                                      </div>
                                    </div>
                                  </div>

                                  {/* Stats Grid */}
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
                                  
                                  {/* Badges Preview (Mini) */}
                                  <div className="mb-4 flex-1">
                                    <div className="text-xs font-bold text-gray-400 mb-2 uppercase">Achievements</div>
                                    <div className="flex flex-wrap gap-1">
                                       {badges.length === 0 ? (
                                          <span className="text-xs text-gray-300 italic">尚無成就</span>
                                       ) : (
                                          badges.map((b, i) => (
                                             <span key={i} className={`text-[10px] font-bold px-1.5 py-0.5 rounded border border-black/10 flex items-center gap-1 ${b.color}`} title={b.name}>
                                                {b.icon} {b.name}
                                             </span>
                                          ))
                                       )}
                                    </div>
                                  </div>

                                  <div className="mt-auto space-y-2 pt-4 border-t-2 border-black">
                                    {currentUser.name === 'iisa' && (
                                      <div className="space-y-2 mb-2 pb-2 border-b border-dashed border-gray-300">
                                         <div className="flex items-center gap-2 mb-1">
                                            <label className="text-xs font-bold whitespace-nowrap">教練:</label>
                                            <select 
                                               className="flex-1 text-xs border-2 border-black p-1 bg-gray-50 font-bold focus:outline-none focus:ring-2 focus:ring-[#ffcd38]"
                                            value={student.coachId || ''}
                                            onChange={(e) => assignCoach(student.id, e.target.value)}
                                         >
                                            <option value="">⚠️ 未分配教練 (Unassigned)</option>
                                            {users.filter(u => u.role === 'coach').map(c => (
                                               <option key={c.id} value={c.id}>
                                                  👨‍🏫 {c.name} {c.status === 'disabled' ? '(停用)' : ''}
                                               </option>
                                            ))}
                                         </select>
                                         </div>

                                         <div className="flex gap-2">
                                            <PixelButton 
                                              size="sm" 
                                              variant={student.status === 'active' ? 'outline' : 'accent'} 
                                              className={`flex-1 text-[10px] font-bold ${student.status === 'disabled' ? 'bg-green-500 hover:bg-green-600 text-white border-green-700' : ''}`}
                                              onClick={() => toggleUserStatus(student.id)}
                                            >
                                              {student.status === 'active' ? '🚫 停用帳號' : '✅ 啟用帳號'}
                                            </PixelButton>
                                            <PixelButton 
                                              size="sm" 
                                              variant="secondary" 
                                              className={`px-2 ${student.status === 'disabled' ? 'bg-red-100 hover:bg-red-200 text-red-600 border-red-300' : ''}`}
                                              onClick={() => deleteUser(student.id)}
                                            >
                                              <Trash2 className="w-4 h-4" />
                                            </PixelButton>
                                         </div>
                                      </div>
                                    )}
                                    <PixelButton size="sm" className="w-full" onClick={() => setAdminSelectedStudentId(student.id)}>
                                      <BookOpen className="w-4 h-4 mr-2" /> 查看日記
                                    </PixelButton>
                                  </div>
                               </div>
                           </div>
                         );
                       });
                     })()}
                  </div>
                </div>
           </div>
        )}

        {/* SUPER ADMIN - Account Management (Coaches) */}
        {activeTab === 'admin_accounts' && currentUser.name === 'iisa' && (
           <div className="space-y-6 animate-in slide-in-from-right-4 duration-500">
              
              {/* Header */}
              <div className="flex justify-between items-center border-b-4 border-black pb-4">
                 <h2 className="text-2xl font-bold text-[#ffcd38] flex items-center gap-2">
                    <Trophy className="w-8 h-8" /> 全校教練
                 </h2>
                 <div className="flex items-center gap-3">
                    <PixelBadge variant="accent" className="text-lg bg-[#ffcd38] text-black border-black">
                      {users.filter(u => u.role === 'coach').length} Coaches
                    </PixelBadge>
                 </div>
              </div>

              {/* Grid */}
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                 {users.filter(u => u.role === 'coach').length === 0 ? (
                     <div className="col-span-3 text-center py-10 border-4 border-dashed border-gray-300 rounded bg-gray-50">
                       <Trophy className="w-12 h-12 mx-auto text-gray-300 mb-2" />
                       <p className="text-gray-500 font-bold">目前無教練</p>
                     </div>
                 ) : (
                     users.filter(u => u.role === 'coach').map(coach => {
                        const studentsCount = users.filter(u => u.coachId === coach.id).length;

                        return (
                           <div key={coach.id} className={`bg-white border-4 border-black p-4 shadow-[4px_4px_0_0_rgba(0,0,0,0.1)] relative overflow-hidden flex flex-col`}>
                                {/* Disabled Overlay */}
                                {coach.status === 'disabled' && (
                                  <div className="absolute inset-0 bg-gray-100/50 backdrop-grayscale z-0 pointer-events-none" />
                                )}
                                
                                {/* Content */}
                                <div className="relative z-10 flex flex-col h-full">
                                   {/* Disabled Banner */}
                                   {coach.status === 'disabled' && (
                                     <div className="absolute top-0 right-0 bg-red-500 text-white text-[10px] px-2 py-1 font-bold z-20">
                                       DISABLED
                                     </div>
                                   )}

                                   {/* Header */}
                                   <div className="flex items-center gap-4 mb-4 border-b-2 border-dashed border-gray-200 pb-4">
                                     <div className={`w-12 h-12 rounded-full border-2 border-black flex items-center justify-center font-bold text-xl ${coach.status === 'active' ? 'bg-[#ffcd38] text-black' : 'bg-gray-300 text-gray-500'}`}>
                                       {coach.name[0].toUpperCase()}
                                     </div>
                                     <div>
                                       <h3 className="font-bold text-lg">{coach.name} {coach.name === 'iisa' && '(Admin)'}</h3>
                                       <div className="flex items-center gap-2 text-xs font-mono mt-1">
                                          <div className={`w-2 h-2 rounded-full ${coach.status === 'active' ? 'bg-green-500 animate-pulse' : coach.status === 'pending' ? 'bg-yellow-500' : 'bg-red-500'}`}></div>
                                          <span className="uppercase">{coach.status}</span>
                                       </div>
                                     </div>
                                   </div>

                                   {/* Stats */}
                                   <div className="grid grid-cols-2 gap-2 mb-4 text-center">
                                     <div className="bg-gray-50 p-2 border border-gray-200">
                                        <div className="text-xs text-gray-400 font-bold uppercase">Students</div>
                                        <div className="text-xl font-bold text-[#ffcd38] text-shadow-sm">{studentsCount}</div>
                                     </div>
                                     <div className="bg-gray-50 p-2 border border-gray-200">
                                        <div className="text-xs text-gray-400 font-bold uppercase">Role</div>
                                        <div className="text-sm font-bold text-gray-700 py-1">{coach.role}</div>
                                     </div>
                                   </div>

                                   {/* Actions */}
                                   <div className="mt-auto space-y-2 pt-4 border-t-2 border-black">
                                     {coach.name !== 'iisa' ? (
                                       <div className="flex gap-2">
                                          {coach.status === 'pending' ? (
                                             <PixelButton 
                                                size="sm" 
                                                variant="accent" 
                                                className="flex-1 bg-green-500 hover:bg-green-600 text-white border-green-700"
                                                onClick={() => approveUser(coach.id)}
                                             >
                                                ✅ 核准 (Approve)
                                             </PixelButton>
                                          ) : (
                                             <PixelButton 
                                                size="sm" 
                                                variant={coach.status === 'active' ? 'outline' : 'accent'} 
                                                className={`flex-1 text-[10px] font-bold ${coach.status === 'disabled' ? 'bg-green-500 hover:bg-green-600 text-white border-green-700' : ''}`}
                                                onClick={() => toggleUserStatus(coach.id)}
                                             >
                                                {coach.status === 'active' ? '🚫 停用帳號' : '✅ 啟用帳號'}
                                             </PixelButton>
                                          )}
                                          
                                          <PixelButton 
                                            size="sm" 
                                            variant="secondary" 
                                            className={`px-2 ${coach.status === 'disabled' ? 'bg-red-100 hover:bg-red-200 text-red-600 border-red-300' : ''}`}
                                            onClick={() => deleteUser(coach.id)}
                                          >
                                            <Trash2 className="w-4 h-4" />
                                          </PixelButton>
                                       </div>
                                     ) : (
                                         <div className="text-center text-xs text-gray-400 font-mono py-2 bg-gray-50 border border-dashed">
                                             System Administrator
                                         </div>
                                     )}
                                   </div>
                                </div>
                           </div>
                        );
                     })
                 )}
              </div>
           </div>
        )}

      </main>
    </div>
  );
}
