import { useState, useEffect } from 'react';
import { 
  Shield, Users, BookOpen, DollarSign, Activity, Terminal, 
  RefreshCw, AlertTriangle, Info, CheckCircle2, Award, Download, Sparkles,
  Trash2, Palette, Zap, FileText, Check, Search, ArrowUpDown, ChevronLeft, ChevronRight, Edit2
} from 'lucide-react';
import { SystemLog, Book, User } from '../types';

import { 
  collection, 
  onSnapshot, 
  query, 
  orderBy, 
  doc, 
  updateDoc, 
  deleteDoc, 
  increment
} from 'firebase/firestore';
import { db, logActivity } from '../utils/firebase';

interface UserStats {
  uid: string;
  email: string;
  displayName: string;
  photoURL: string;
  plan: 'Free' | 'Creator' | 'Publisher' | 'Admin';
  enabled: boolean;
  role: 'user' | 'admin';
  usageCount: number;
  createdAt: string;
  lastLogin: string;
  lastActivity: string;
  notes: string;
  booksCount: number;
  downloadsCount: number;
  permissions?: {
    bookGenerator: boolean;
    coverGenerator: boolean;
    aiCredits: boolean;
  };
  books?: { id: string; title: string; topic: string; createdAt: string }[];
}

interface AdminPanelProps {
  books: Book[];
  currentUserUid: string;
  onPlanUpdated: (newPlan: 'free' | 'creator' | 'publisher' | 'admin') => void;
}

export default function AdminPanel({ books: parentBooks, currentUserUid, onPlanUpdated }: AdminPanelProps) {
  const [logs, setLogs] = useState<SystemLog[]>([]);
  const [usersList, setUsersList] = useState<UserStats[]>([]);
  const [activeTab, setActiveTab] = useState<'analytics' | 'users' | 'logs'>('users');
  
  // Search and filter states
  const [searchQuery, setSearchQuery] = useState('');
  const [planFilter, setPlanFilter] = useState<'all' | 'free' | 'creator' | 'publisher' | 'admin' | 'enabled' | 'disabled'>('all');
  const [sortBy, setSortBy] = useState<'email' | 'createdAt' | 'lastLogin' | 'booksCreated' | 'usageCount'>('createdAt');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [logFilter, setLogFilter] = useState<'all' | 'info' | 'warn' | 'error'>('all');
  
  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  
  // Interaction/Action UI states
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isUpdatingPlan, setIsUpdatingPlan] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Modals and dialog states
  const [showConfirmDelete, setShowConfirmDelete] = useState<string | null>(null); // User UID to delete
  const [isDeletingWorkspace, setIsDeletingWorkspace] = useState(false);
  
  const [editingNotesUid, setEditingNotesUid] = useState<string | null>(null);
  const [notesValue, setNotesValue] = useState('');
  const [isSavingNotes, setIsSavingNotes] = useState(false);

  // New View Books and View Activity states
  const [viewBooksUser, setViewBooksUser] = useState<UserStats | null>(null);
  const [selectedUserBooks, setSelectedUserBooks] = useState<Book[]>([]);
  const [isLoadingUserBooks, setIsLoadingUserBooks] = useState(false);
  const [viewActivityUser, setViewActivityUser] = useState<UserStats | null>(null);

  // 1. Subscribe to users collection in Firestore in real-time
  useEffect(() => {
    setIsRefreshing(true);
    const usersQuery = query(collection(db, 'users'));
    const unsubscribe = onSnapshot(usersQuery, (snapshot) => {
      const users: UserStats[] = [];
      snapshot.forEach((docSnap) => {
        const data = docSnap.data();
        users.push({
          uid: docSnap.id,
          email: data.email || '',
          displayName: data.displayName || data.email?.split('@')[0] || 'User',
          photoURL: data.photoURL || `https://api.dicebear.com/7.x/bottts/svg?seed=${docSnap.id}`,
          plan: data.plan || 'Free',
          enabled: data.enabled !== false,
          role: data.role || 'user',
          usageCount: data.usage || 0,
          createdAt: data.createdAt || new Date().toISOString(),
          lastLogin: data.lastLogin || new Date().toISOString(),
          lastActivity: data.lastActivity || new Date().toISOString(),
          notes: data.notes || '',
          booksCount: data.booksCreated || 0,
          downloadsCount: data.booksDownloaded || 0,
          permissions: data.permissions || {
            bookGenerator: data.enabled !== false,
            coverGenerator: data.enabled !== false,
            aiCredits: data.enabled !== false
          },
          books: data.books || []
        });
      });
      setUsersList(users);
      setIsRefreshing(false);
    }, (error) => {
      console.error("Error subscribing to users in Firestore:", error);
      setIsRefreshing(false);
    });

    return () => unsubscribe();
  }, []);

  // 2. Subscribe to activity logs in Firestore in real-time
  useEffect(() => {
    const logsQuery = query(collection(db, 'activity_logs'), orderBy('timestamp', 'desc'));
    const unsubscribe = onSnapshot(logsQuery, (snapshot) => {
      const fetchedLogs: SystemLog[] = [];
      snapshot.forEach((docSnap) => {
        const data = docSnap.data();
        fetchedLogs.push({
          id: docSnap.id,
          timestamp: data.timestamp || new Date().toISOString(),
          level: data.level || 'info',
          message: data.message || '',
          category: data.category || 'system'
        });
      });
      setLogs(fetchedLogs);
    }, (error) => {
      console.error("Error subscribing to activity logs in Firestore:", error);
    });

    return () => unsubscribe();
  }, []);

  const handleRefreshAll = async () => {
    setIsRefreshing(true);
    // Realtime listeners automatically sync, but we can animate a brief spin for visual satisfaction
    setTimeout(() => {
      setIsRefreshing(false);
    }, 600);
  };

  const handleUpdatePlan = async (uid: string, targetPlan: 'Free' | 'Creator' | 'Publisher' | 'Admin') => {
    setIsUpdatingPlan(uid);
    setErrorMessage(null);
    setSuccessMessage(null);
    try {
      // Find user email to log it properly
      const targetUser = usersList.find(u => u.uid === uid);
      
      // Update plan in Firestore
      await updateDoc(doc(db, 'users', uid), {
        plan: targetPlan,
        role: targetPlan === 'Admin' ? 'admin' : 'user',
        lastActivity: new Date().toISOString()
      });

      // Synchronize changes to Express backend local database
      await fetch(`/api/admin/users/${uid}/plan`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-uid': currentUserUid
        },
        body: JSON.stringify({ plan: targetPlan.toLowerCase() })
      });
      
      // Log event
      await logActivity(
        currentUserUid,
        'ramjitinvestments@gmail.com',
        'info',
        `Superuser updated plan for ${targetUser?.email || uid} to ${targetPlan.toUpperCase()}`,
        'admin'
      );

      setSuccessMessage(`Successfully updated ${targetUser?.email || 'user'} to ${targetPlan.toUpperCase()}`);
      setTimeout(() => setSuccessMessage(null), 3500);

      // If updated user is the current operator, bubble up change instantly!
      if (uid === currentUserUid) {
        onPlanUpdated(targetPlan.toLowerCase() as any);
      }
    } catch (e: any) {
      console.error('Plan update failed:', e);
      setErrorMessage(e.message || 'Failed to update plan.');
    }
    setIsUpdatingPlan(null);
  };

  const handleToggleUser = async (uid: string) => {
    setErrorMessage(null);
    setSuccessMessage(null);
    try {
      const targetUser = usersList.find(u => u.uid === uid);
      if (!targetUser) return;

      // Prevent disabling own account
      if (uid === currentUserUid) {
        setErrorMessage('Safety constraint: You cannot disable your own administrator account.');
        setTimeout(() => setErrorMessage(null), 4000);
        return;
      }

      const nextStatus = !targetUser.enabled;
      
      // Update enabled status in Firestore
      await updateDoc(doc(db, 'users', uid), {
        enabled: nextStatus,
        lastActivity: new Date().toISOString()
      });

      // Synchronize changes to Express backend local database
      await fetch(`/api/admin/users/${uid}/toggle`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-uid': currentUserUid
        },
        body: JSON.stringify({ enabled: nextStatus })
      });
      
      // Log event
      await logActivity(
        currentUserUid,
        'ramjitinvestments@gmail.com',
        'info',
        `Admin account access for ${targetUser.email} set to: ${nextStatus ? 'ENABLED' : 'DISABLED'}`,
        'admin'
      );

      setSuccessMessage(`User account ${targetUser.email} is now ${nextStatus ? 'ENABLED' : 'DISABLED'}`);
      setTimeout(() => setSuccessMessage(null), 3500);
    } catch (e: any) {
      console.error('Error toggling user account status:', e);
      setErrorMessage(e.message || 'Failed to toggle account access.');
    }
  };

  const handleTogglePermission = async (uid: string, key: 'bookGenerator' | 'coverGenerator' | 'aiCredits') => {
    setErrorMessage(null);
    setSuccessMessage(null);
    try {
      const targetUser = usersList.find(u => u.uid === uid);
      if (!targetUser) return;
      
      const currentPerms = targetUser.permissions || { bookGenerator: true, coverGenerator: true, aiCredits: true };
      const nextPerms = {
        ...currentPerms,
        [key]: !currentPerms[key]
      };

      await updateDoc(doc(db, 'users', uid), {
        permissions: nextPerms,
        lastActivity: new Date().toISOString()
      });

      // Synchronize changes to Express backend local database
      await fetch(`/api/admin/users/${uid}/permissions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-uid': currentUserUid
        },
        body: JSON.stringify({ permissions: nextPerms })
      });

      // Log event
      await logActivity(
        currentUserUid,
        'ramjitinvestments@gmail.com',
        'info',
        `Admin updated permission ${key} for ${targetUser.email} to: ${nextPerms[key] ? 'ENABLED' : 'DISABLED'}`,
        'admin'
      );

      setSuccessMessage(`Updated permission ${key} for ${targetUser.email} to: ${nextPerms[key] ? 'ENABLED' : 'DISABLED'}`);
      setTimeout(() => setSuccessMessage(null), 3500);
    } catch (e: any) {
      console.error('Error updating user permissions:', e);
      setErrorMessage(e.message || 'Failed to update user permissions.');
    }
  };

  const handleResetUsage = async (uid: string) => {
    setErrorMessage(null);
    setSuccessMessage(null);
    try {
      const targetUser = usersList.find(u => u.uid === uid);
      await updateDoc(doc(db, 'users', uid), {
        usage: 0,
        lastActivity: new Date().toISOString()
      });

      // Synchronize changes to Express backend local database
      await fetch(`/api/admin/users/${uid}/usage`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-uid': currentUserUid
        },
        body: JSON.stringify({ usageCount: 0 })
      });

      await logActivity(
        currentUserUid,
        'ramjitinvestments@gmail.com',
        'info',
        `Reset AI usage credits to 0 for ${targetUser?.email || uid}`,
        'admin'
      );

      setSuccessMessage(`Usage reset to 0 for ${targetUser?.email || 'user'}`);
      setTimeout(() => setSuccessMessage(null), 3500);
    } catch (e: any) {
      setErrorMessage('Failed to reset usage.');
    }
  };

  const handleGrantUnlimited = async (uid: string) => {
    setErrorMessage(null);
    setSuccessMessage(null);
    try {
      const targetUser = usersList.find(u => u.uid === uid);
      await updateDoc(doc(db, 'users', uid), {
        usage: 999999,
        lastActivity: new Date().toISOString()
      });

      // Synchronize changes to Express backend local database
      await fetch(`/api/admin/users/${uid}/usage`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-uid': currentUserUid
        },
        body: JSON.stringify({ usageCount: 999999 })
      });

      await logActivity(
        currentUserUid,
        'ramjitinvestments@gmail.com',
        'info',
        `Granted unlimited AI credits (999,999) to ${targetUser?.email || uid}`,
        'admin'
      );

      setSuccessMessage(`Unlimited AI credits granted to ${targetUser?.email || 'user'}`);
      setTimeout(() => setSuccessMessage(null), 3500);
    } catch (e: any) {
      setErrorMessage('Failed to grant unlimited credits.');
    }
  };

  const handleRemoveUnlimited = async (uid: string) => {
    setErrorMessage(null);
    setSuccessMessage(null);
    try {
      const targetUser = usersList.find(u => u.uid === uid);
      await updateDoc(doc(db, 'users', uid), {
        usage: 0,
        lastActivity: new Date().toISOString()
      });

      // Synchronize changes to Express backend local database
      await fetch(`/api/admin/users/${uid}/usage`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-uid': currentUserUid
        },
        body: JSON.stringify({ usageCount: 0 })
      });

      await logActivity(
        currentUserUid,
        'ramjitinvestments@gmail.com',
        'info',
        `Removed unlimited AI status and reset credits to 0 for ${targetUser?.email || uid}`,
        'admin'
      );

      setSuccessMessage(`Unlimited status removed and reset to 0 for ${targetUser?.email || 'user'}`);
      setTimeout(() => setSuccessMessage(null), 3500);
    } catch (e: any) {
      setErrorMessage('Failed to remove unlimited status.');
    }
  };

  const handleViewBooks = async (user: UserStats) => {
    setIsLoadingUserBooks(true);
    setErrorMessage(null);
    try {
      const res = await fetch('/api/books', {
        headers: { 'x-user-uid': user.uid }
      });
      if (res.ok) {
        const data = await res.json();
        setSelectedUserBooks(data);
        setViewBooksUser(user);
      } else {
        setErrorMessage(`Failed to load books for ${user.email}`);
      }
    } catch (e) {
      console.error(e);
      setErrorMessage(`Error loading books for ${user.email}`);
    } finally {
      setIsLoadingUserBooks(false);
    }
  };

  const handleViewActivity = (user: UserStats) => {
    setViewActivityUser(user);
  };

  const handleOpenNotes = (uid: string, currentNotes: string) => {
    setEditingNotesUid(uid);
    setNotesValue(currentNotes);
  };

  const handleSaveNotes = async () => {
    if (!editingNotesUid) return;
    setIsSavingNotes(true);
    setErrorMessage(null);
    try {
      await updateDoc(doc(db, 'users', editingNotesUid), {
        notes: notesValue,
        lastActivity: new Date().toISOString()
      });
      
      setSuccessMessage("Account notes updated successfully.");
      setTimeout(() => setSuccessMessage(null), 3500);
      setEditingNotesUid(null);
    } catch (e: any) {
      setErrorMessage(e.message || "Failed to save notes.");
    } finally {
      setIsSavingNotes(false);
    }
  };

  const handleDeleteWorkspace = async (uid: string) => {
    setIsDeletingWorkspace(true);
    setErrorMessage(null);
    try {
      const targetUser = usersList.find(u => u.uid === uid);
      if (!targetUser) return;

      // Prevent deleting self
      if (uid === currentUserUid) {
        setErrorMessage('Safety constraint: You cannot delete your own administrator account.');
        setIsDeletingWorkspace(false);
        return;
      }

      // Check if this is the final Admin
      const admins = usersList.filter(u => u.role === 'admin' || u.plan === 'Admin');
      if (admins.length <= 1 && (targetUser.role === 'admin' || targetUser.plan === 'Admin')) {
        setErrorMessage('Safety constraint: Cannot delete the final Administrator account in the database.');
        setIsDeletingWorkspace(false);
        return;
      }

      // 1. Delete associated books & downloads in Express backend
      const res = await fetch(`/api/admin/users/${uid}`, {
        method: 'DELETE',
        headers: {
          'x-user-uid': currentUserUid
        }
      });
      
      if (res.ok) {
        // 2. Delete the user document in Firestore
        await deleteDoc(doc(db, 'users', uid));
        
        // Log event
        await logActivity(
          currentUserUid,
          'ramjitinvestments@gmail.com',
          'warn',
          `Admin permanently deleted account & workspace of ${targetUser.email} (UID: ${uid})`,
          'admin'
        );
        
        setSuccessMessage(`Workspace and account for ${targetUser.email} deleted successfully.`);
        setTimeout(() => setSuccessMessage(null), 4000);
        setShowConfirmDelete(null);
      } else {
        const err = await res.json();
        setErrorMessage(err.error || 'Failed to delete workspace.');
      }
    } catch (e: any) {
      console.error('Error deleting workspace:', e);
      setErrorMessage(e.message || 'An error occurred during deletion.');
    } finally {
      setIsDeletingWorkspace(false);
    }
  };

  const toggleSort = (field: typeof sortBy) => {
    if (sortBy === field) {
      setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortOrder('desc');
    }
    setCurrentPage(1);
  };

  // Filter logs
  const filteredLogs = logs.filter((log) => {
    const matchesSearch = log.message.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          log.category.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesLevel = logFilter === 'all' || log.level === logFilter;
    return matchesSearch && matchesLevel;
  });

  // Filter and sort users
  const filteredUsers = usersList.filter((u) => {
    const matchesSearch = u.email.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          u.uid.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          u.displayName.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          u.notes.toLowerCase().includes(searchQuery.toLowerCase());
    
    let matchesPlan = true;
    if (planFilter !== 'all') {
      if (planFilter === 'enabled') {
        matchesPlan = u.enabled === true;
      } else if (planFilter === 'disabled') {
        matchesPlan = u.enabled === false;
      } else {
        matchesPlan = u.plan.toLowerCase() === planFilter;
      }
    }
    
    return matchesSearch && matchesPlan;
  }).sort((a, b) => {
    let fieldA: any = a[sortBy];
    let fieldB: any = b[sortBy];

    if (typeof fieldA === 'string') {
      fieldA = fieldA.toLowerCase();
      fieldB = fieldB.toLowerCase();
    }

    if (fieldA < fieldB) return sortOrder === 'asc' ? -1 : 1;
    if (fieldA > fieldB) return sortOrder === 'asc' ? 1 : -1;
    return 0;
  });

  // Pagination calculations
  const totalItems = filteredUsers.length;
  const totalPages = Math.ceil(totalItems / itemsPerPage) || 1;
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentUsers = filteredUsers.slice(indexOfFirstItem, indexOfLastItem);

  // Calculate dynamic metrics based on real database records
  const totalUsers = usersList.length;
  const activeUsers = usersList.filter(u => u.enabled !== false).length;
  const disabledUsers = usersList.filter(u => u.enabled === false).length;
  const totalBooksCount = usersList.reduce((acc, curr) => acc + curr.booksCount, 0);
  const totalDownloadsCount = usersList.reduce((acc, curr) => acc + curr.downloadsCount, 0);
  
  const creatorCount = usersList.filter(u => u.plan === 'Creator').length;
  const publisherCount = usersList.filter(u => u.plan === 'Publisher').length;
  const adminCount = usersList.filter(u => u.plan === 'Admin').length;
  
  // Real-time pricing MRR simulation ($19 for Creator, $49 for Publisher, $99 for Admin)
  const dynamicMRR = (creatorCount * 19) + (publisherCount * 49) + (adminCount * 99);
  const cumulativeGross = dynamicMRR * 1.8 + 120.00;

  // Today's signups
  const todaySignups = usersList.filter(u => {
    const createdDate = new Date(u.createdAt);
    const today = new Date();
    return createdDate.toDateString() === today.toDateString();
  }).length;

  return (
    <div className="bg-[#04150e] border border-emerald-950/80 rounded-3xl overflow-hidden shadow-2xl max-w-6xl mx-auto p-6">
      
      {/* HEADER SECTION */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center border-b border-emerald-950/80 pb-5 mb-6 gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 text-xs font-extrabold text-[#D4AF37] bg-amber-500/10 px-2.5 py-1 rounded-full border border-amber-500/20">
            <Shield className="w-3.5 h-3.5 animate-pulse" /> Superuser Admin Panel
          </div>
          <h2 className="text-xl font-black text-white mt-1.5 font-sans">
            RiddimRoom Publisher Operations
          </h2>
          <p className="text-xs text-zinc-400 mt-0.5">
            Real-time subscriber database, workspace control logs, plan privileges, and AI billing metrics.
          </p>
        </div>

        <div className="flex items-center gap-2 self-stretch md:self-auto">
          <button
            onClick={handleRefreshAll}
            disabled={isRefreshing}
            className="p-2.5 bg-emerald-950/40 hover:bg-emerald-950/80 rounded-xl border border-emerald-900/20 text-zinc-300 transition shrink-0"
            title="Refresh database collections"
          >
            <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin text-[#10B981]' : ''}`} />
          </button>

          <div className="flex bg-[#020906] p-1 rounded-xl border border-emerald-950/50 w-full md:w-auto">
            {(['users', 'analytics', 'logs'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => {
                  setActiveTab(tab);
                  setSearchQuery('');
                  setCurrentPage(1);
                }}
                className={`px-4 py-1.5 rounded-lg text-xs font-black capitalize transition-all w-full md:w-auto ${
                  activeTab === tab
                    ? 'bg-[#10B981] text-[#030805] shadow-md shadow-emerald-950/20 font-sans'
                    : 'hover:bg-emerald-950/30 text-zinc-300'
                }`}
              >
                {tab}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* GLOBAL SUCCESS & ERROR MESSAGES */}
      {successMessage && (
        <div className="mb-4 p-3 bg-emerald-500/10 border border-emerald-500/30 text-[#10B981] rounded-xl text-xs font-bold flex items-center gap-2 animate-in fade-in duration-150">
          <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
          <span>{successMessage}</span>
        </div>
      )}

      {errorMessage && (
        <div className="mb-4 p-3 bg-red-500/10 border border-red-500/30 text-red-400 rounded-xl text-xs font-bold flex items-center gap-2 animate-in fade-in duration-150">
          <AlertTriangle className="w-4 h-4 shrink-0 text-red-400" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* USERS MONITORING TAB */}
      {activeTab === 'users' && (
        <div className="space-y-4">
          
          {/* SEARCH, FILTERS & ACTION BAR */}
          <div className="flex flex-col lg:flex-row justify-between items-stretch lg:items-center gap-4">
            
            {/* Search Input */}
            <div className="relative flex-1">
              <span className="absolute left-3 top-2.5 text-emerald-600">
                <Search className="w-4 h-4" />
              </span>
              <input
                type="text"
                placeholder="Search email, name, notes, UID..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full pl-9 pr-4 py-2 bg-[#020906] border border-emerald-900/30 rounded-xl text-xs focus:outline-none text-white focus:ring-1 focus:ring-[#10B981] font-medium"
              />
            </div>

            {/* Filter by plan */}
            <div className="flex flex-wrap gap-2">
              <span className="text-[10px] text-zinc-500 font-bold self-center mr-1 uppercase tracking-wider">Filter:</span>
              {(['all', 'free', 'creator', 'publisher', 'admin', 'enabled', 'disabled'] as const).map((filter) => (
                <button
                  key={filter}
                  onClick={() => {
                    setPlanFilter(filter);
                    setCurrentPage(1);
                  }}
                  className={`px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase transition border ${
                    planFilter === filter
                      ? 'bg-emerald-800/30 text-[#10B981] border-emerald-500/35'
                      : 'bg-[#020906]/60 text-zinc-400 border-emerald-950/40 hover:text-white'
                  }`}
                >
                  {filter}
                </button>
              ))}
            </div>
          </div>

          {/* TABLE */}
          <div className="border border-emerald-950/80 rounded-2xl overflow-hidden bg-[#010503]/50">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs whitespace-nowrap">
                <thead>
                  <tr className="bg-[#020906] border-b border-emerald-950/80 text-zinc-400 font-bold uppercase tracking-wider text-[10px] select-none">
                    <th className="p-4 cursor-pointer hover:text-white transition" onClick={() => toggleSort('email')}>
                      <div className="flex items-center gap-1">
                        <span>Subscriber Info</span>
                        <ArrowUpDown className="w-3 h-3 text-zinc-500" />
                      </div>
                    </th>
                    <th className="p-4">Workspace ID</th>
                    <th className="p-4">Membership Plan</th>
                    <th className="p-4 cursor-pointer hover:text-white text-center transition" onClick={() => toggleSort('usageCount')}>
                      <div className="flex items-center justify-center gap-1">
                        <span>Usage</span>
                        <ArrowUpDown className="w-3 h-3 text-zinc-500" />
                      </div>
                    </th>
                    <th className="p-4 cursor-pointer hover:text-white text-center transition" onClick={() => toggleSort('booksCreated' as any)}>
                      <div className="flex items-center justify-center gap-1">
                        <span>Books</span>
                        <ArrowUpDown className="w-3 h-3 text-zinc-500" />
                      </div>
                    </th>
                    <th className="p-4 text-center">Downloads</th>
                    <th className="p-4 text-center">App Access</th>
                    <th className="p-4 text-center">Permissions</th>
                    <th className="p-4 text-right">Allow Free Upgrades</th>
                    <th className="p-4 text-center">Notes / Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-emerald-950/40 text-zinc-300">
                  {currentUsers.length === 0 ? (
                    <tr>
                      <td colSpan={10} className="p-8 text-center text-zinc-500 font-mono">
                        No active subscribers found matching current selection.
                      </td>
                    </tr>
                  ) : (
                    currentUsers.map((u) => {
                      const isCurrent = u.uid === currentUserUid;
                      const isAdmin = u.email.toLowerCase() === 'ramjitinvestments@gmail.com' || u.role === 'admin';
                      return (
                        <tr 
                          key={u.uid} 
                          className={`hover:bg-emerald-950/10 transition ${
                            isCurrent ? 'bg-emerald-950/20 border-l-2 border-l-[#D4AF37]' : ''
                          }`}
                        >
                           <td className="p-4">
                            <div className="flex items-center gap-3">
                              <img 
                                src={u.photoURL} 
                                alt={u.email}
                                referrerPolicy="no-referrer"
                                className="w-8 h-8 rounded-full bg-zinc-950 border border-emerald-900/30 object-cover"
                              />
                              <div>
                                <p className="font-extrabold text-white text-xs flex items-center gap-1.5">
                                  {u.email}
                                  {isAdmin && (
                                    <span className="px-1.5 py-0.2 bg-[#D4AF37]/10 text-[#D4AF37] text-[8px] tracking-widest font-black rounded uppercase border border-amber-500/20">
                                      ADMIN
                                    </span>
                                  )}
                                </p>
                                <span className="text-[10px] text-zinc-500 block">
                                  {u.displayName} • Joined {new Date(u.createdAt).toLocaleDateString()}
                                  {u.lastLogin && ` • Login: ${new Date(u.lastLogin).toLocaleDateString()}`}
                                </span>
                                <div className="flex gap-2 mt-1">
                                  <button 
                                    onClick={() => handleViewActivity(u)}
                                    className="text-[9px] px-1.5 py-0.5 bg-emerald-950/40 hover:bg-emerald-950 border border-emerald-900/30 text-[#10B981] rounded-lg transition font-black uppercase tracking-wider"
                                    title="View Activity Logs"
                                  >
                                    Activity
                                  </button>
                                  <button 
                                    onClick={() => handleViewBooks(u)}
                                    className="text-[9px] px-1.5 py-0.5 bg-emerald-950/40 hover:bg-emerald-950 border border-emerald-900/30 text-[#10B981] rounded-lg transition font-black uppercase tracking-wider"
                                    title="View User's Books"
                                  >
                                    Books ({u.booksCount})
                                  </button>
                                </div>
                              </div>
                            </div>
                          </td>
                          <td className="p-4 font-mono text-zinc-500 text-[10px]" title={u.uid}>
                            {u.uid.substring(0, 10)}...
                          </td>
                          <td className="p-4">
                            <span className={`px-2.5 py-0.5 rounded-full font-extrabold text-[9px] uppercase tracking-wider border ${
                              u.plan === 'Admin'
                                ? 'bg-amber-500/10 text-[#D4AF37] border-amber-500/20' 
                                : u.plan === 'Publisher'
                                  ? 'bg-emerald-500/10 text-[#10B981] border-emerald-500/20' 
                                  : u.plan === 'Creator'
                                    ? 'bg-blue-500/10 text-blue-400 border-blue-500/20'
                                    : 'bg-zinc-800/50 text-zinc-400 border-zinc-700/20'
                            }`}>
                              {u.plan} plan
                            </span>
                          </td>
                          <td className="p-4 text-center font-mono">
                            <div className="flex flex-col items-center">
                              <span className="text-amber-400 font-extrabold text-sm">
                                {u.usageCount === 999999 ? '∞' : u.usageCount}
                              </span>
                              <div className="flex gap-1.5 mt-1 select-none">
                                <button 
                                  onClick={() => handleResetUsage(u.uid)}
                                  className="text-[8px] px-1 py-0.2 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-400 rounded hover:text-white transition uppercase font-bold"
                                  title="Reset credits usage to 0"
                                >
                                  Reset
                                </button>
                                {u.usageCount === 999999 ? (
                                  <button 
                                    onClick={() => handleRemoveUnlimited(u.uid)}
                                    className="text-[8px] px-1 py-0.2 bg-red-950 hover:bg-red-900 border border-red-900 text-red-400 rounded hover:text-white transition uppercase font-bold"
                                    title="Remove Unlimited status"
                                  >
                                    Remove ∞
                                  </button>
                                ) : (
                                  <button 
                                    onClick={() => handleGrantUnlimited(u.uid)}
                                    className="text-[8px] px-1 py-0.2 bg-emerald-950 hover:bg-emerald-900 border border-emerald-900 text-[#10B981] rounded hover:text-white transition uppercase font-bold"
                                    title="Grant Unlimited credits"
                                  >
                                    Grant ∞
                                  </button>
                                )}
                              </div>
                            </div>
                          </td>
                          <td className="p-4 text-center font-mono text-white">
                            {u.booksCount}
                          </td>
                          <td className="p-4 text-center font-mono text-zinc-400">
                            {u.downloadsCount}
                          </td>
                          <td className="p-4 text-center">
                            <button
                              onClick={() => handleToggleUser(u.uid)}
                              disabled={isCurrent}
                              className={`relative inline-flex h-5 w-10 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                                u.enabled ? 'bg-[#10B981]' : 'bg-zinc-800'
                              } ${isCurrent ? 'opacity-40 cursor-not-allowed' : ''}`}
                              title={isCurrent ? 'You cannot disable your own administrator account' : `Toggle access for ${u.email}`}
                            >
                              <span
                                className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-[#030805] shadow ring-0 transition duration-200 ease-in-out ${
                                  u.enabled ? 'translate-x-5' : 'translate-x-0'
                                }`}
                              />
                            </button>
                          </td>
                          <td className="p-4 text-center">
                            <div className="flex flex-col gap-1.5">
                              <button
                                onClick={() => handleTogglePermission(u.uid, 'bookGenerator')}
                                className={`px-2 py-0.5 rounded text-[8px] font-black flex items-center justify-center gap-1 border transition ${
                                  u.permissions?.bookGenerator !== false
                                    ? 'bg-emerald-500/10 text-[#10B981] border-emerald-500/20'
                                    : 'bg-zinc-800/50 text-zinc-500 border-zinc-700/20'
                                }`}
                                title="Toggle Book Generator Permission"
                              >
                                <span>BOOK GEN</span>
                              </button>
                              <button
                                onClick={() => handleTogglePermission(u.uid, 'coverGenerator')}
                                className={`px-2 py-0.5 rounded text-[8px] font-black flex items-center justify-center gap-1 border transition ${
                                  u.permissions?.coverGenerator !== false
                                    ? 'bg-emerald-500/10 text-[#10B981] border-emerald-500/20'
                                    : 'bg-zinc-800/50 text-zinc-500 border-zinc-700/20'
                                }`}
                                title="Toggle Cover Generator Permission"
                              >
                                <span>COVER GEN</span>
                              </button>
                            </div>
                          </td>
                          <td className="p-4 text-right">
                            <div className="inline-flex bg-[#020906] p-1 rounded-xl border border-emerald-950/80 gap-1">
                              {(['Free', 'Creator', 'Publisher', 'Admin'] as const).map((level) => {
                                const isActive = u.plan === level;
                                return (
                                  <button
                                    key={level}
                                    onClick={() => handleUpdatePlan(u.uid, level)}
                                    disabled={isUpdatingPlan === u.uid}
                                    className={`px-1.5 py-0.5 rounded text-[8px] uppercase font-black transition ${
                                      isActive
                                        ? level === 'Admin'
                                          ? 'bg-[#D4AF37] text-black font-extrabold'
                                          : level === 'Publisher'
                                            ? 'bg-[#10B981] text-black font-extrabold'
                                            : level === 'Creator'
                                              ? 'bg-blue-500 text-black font-extrabold'
                                              : 'bg-zinc-700 text-white font-extrabold'
                                        : 'hover:bg-emerald-950/40 text-zinc-400 hover:text-white'
                                    }`}
                                  >
                                    {level}
                                  </button>
                                );
                              })}
                            </div>
                          </td>
                          <td className="p-4 text-center">
                            <div className="flex items-center justify-center gap-2">
                              <button
                                onClick={() => handleOpenNotes(u.uid, u.notes)}
                                className={`p-1.5 rounded-lg border border-transparent hover:border-zinc-800 hover:bg-zinc-900 transition ${
                                  u.notes ? 'text-emerald-400 hover:text-emerald-300' : 'text-zinc-500 hover:text-zinc-300'
                                }`}
                                title="Add/Edit notes"
                              >
                                <FileText className="w-3.5 h-3.5" />
                              </button>
                              
                              <button
                                onClick={() => setShowConfirmDelete(u.uid)}
                                disabled={isCurrent}
                                className={`p-1.5 rounded-lg text-red-500 hover:text-red-400 hover:bg-red-500/10 transition border border-transparent hover:border-red-500/20 ${
                                  isCurrent ? 'opacity-30 cursor-not-allowed' : ''
                                }`}
                                title={isCurrent ? 'Administrator account cannot be deleted' : 'Delete Workspace & Data'}
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* PAGINATION CONTROLS */}
          {totalPages > 1 && (
            <div className="flex justify-between items-center bg-[#020906]/30 px-4 py-3 rounded-2xl border border-emerald-950/30">
              <span className="text-zinc-500 text-xs">
                Showing <strong className="text-zinc-300">{indexOfFirstItem + 1}</strong> to <strong className="text-zinc-300">{Math.min(indexOfLastItem, totalItems)}</strong> of <strong className="text-zinc-300">{totalItems}</strong> accounts
              </span>
              <div className="flex gap-2">
                <button
                  onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                  disabled={currentPage === 1}
                  className="p-1.5 bg-emerald-950/30 border border-emerald-950 text-zinc-400 hover:text-white hover:bg-emerald-950/70 rounded-xl transition disabled:opacity-30 disabled:pointer-events-none"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                {Array.from({ length: totalPages }).map((_, idx) => (
                  <button
                    key={idx}
                    onClick={() => setCurrentPage(idx + 1)}
                    className={`px-3 py-1 text-xs font-bold rounded-xl transition border ${
                      currentPage === idx + 1
                        ? 'bg-[#10B981] text-[#030805] border-[#10B981]'
                        : 'bg-[#020906] text-zinc-400 border-emerald-950 hover:text-white'
                    }`}
                  >
                    {idx + 1}
                  </button>
                ))}
                <button
                  onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                  disabled={currentPage === totalPages}
                  className="p-1.5 bg-emerald-950/30 border border-emerald-950 text-zinc-400 hover:text-white hover:bg-emerald-950/70 rounded-xl transition disabled:opacity-30 disabled:pointer-events-none"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* PRIVILEGES SUMMARY HERO CARD */}
          <div className="p-4 rounded-2xl bg-amber-500/5 border border-amber-500/10 flex items-start gap-3 select-none">
            <Info className="w-4 h-4 text-[#D4AF37] shrink-0 mt-0.5 animate-bounce" />
            <p className="text-[11px] text-zinc-400 leading-relaxed">
              <strong>Real-Time Synchronization Engine</strong>: All subscription tier elevation or app access toggles update in Firestore immediately. 
              The target user's active session will dynamically listen and adapt to privileges (unlocking cover designs, increasing credits, or locking them out instantly if disabled) with <strong>zero page refreshes</strong> required.
            </p>
          </div>
        </div>
      )}

      {/* SYSTEM ANALYTICS METRICS */}
      {activeTab === 'analytics' && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-5 bg-[#020906]/60 border border-emerald-950/60 rounded-2xl relative overflow-hidden">
              <span className="p-2 bg-amber-500/10 text-[#D4AF37] rounded-xl inline-flex mb-3 border border-amber-500/20">
                <Users className="w-5 h-5" />
              </span>
              <p className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider">TOTAL ACTIVE USERS</p>
              <h3 className="text-2xl font-black text-white mt-1">{totalUsers}</h3>
              <p className="text-[10px] text-[#10B981] font-bold mt-1">↑ {todaySignups} new signup(s) today</p>
            </div>

            <div className="p-5 bg-[#020906]/60 border border-emerald-950/60 rounded-2xl relative overflow-hidden">
              <span className="p-2 bg-emerald-500/15 text-[#10B981] rounded-xl inline-flex mb-3 border border-emerald-500/20">
                <BookOpen className="w-5 h-5" />
              </span>
              <p className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider">BOOKS GENERATED</p>
              <h3 className="text-2xl font-black text-white mt-1">{totalBooksCount}</h3>
              <p className="text-[10px] text-[#D4AF37] font-bold mt-1">
                {creatorCount + publisherCount} creators are premium tier
              </p>
            </div>

            <div className="p-5 bg-[#020906]/60 border border-emerald-950/60 rounded-2xl relative overflow-hidden">
              <span className="p-2 bg-amber-500/10 text-[#D4AF37] rounded-xl inline-flex mb-3 border border-amber-500/20">
                <DollarSign className="w-5 h-5" />
              </span>
              <p className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider">RUNNING EST MRR</p>
              <h3 className="text-2xl font-black text-white mt-1">${dynamicMRR} <span className="text-xs text-zinc-500">/mo</span></h3>
              <p className="text-[10px] text-[#10B981] font-bold mt-1">
                Est. ${cumulativeGross.toFixed(2)} total gross ledger
              </p>
            </div>

            <div className="p-5 bg-[#020906]/60 border border-emerald-950/60 rounded-2xl relative overflow-hidden">
              <span className="p-2 bg-emerald-500/15 text-[#10B981] rounded-xl inline-flex mb-3 border border-emerald-500/20">
                <Activity className="w-5 h-5" />
              </span>
              <p className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider">BOOKS EXPORTED</p>
              <h3 className="text-2xl font-black text-white mt-1">
                {totalDownloadsCount}
              </h3>
              <p className="text-[10px] text-zinc-400 mt-1">Direct PDF & DOCX compile downloads</p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="border border-emerald-950/80 p-5 rounded-2xl bg-[#020906]/25">
              <h4 className="text-sm font-bold text-white mb-4">Gemini AI Model Registry</h4>
              <div className="space-y-3.5">
                <div className="flex justify-between items-center text-xs">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 bg-emerald-500 rounded-full animate-ping" />
                    <span className="font-extrabold text-zinc-300">gemini-2.5-flash (AI Studio default)</span>
                  </div>
                  <span className="font-mono text-zinc-500">Active (Latency: 1.8s)</span>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 bg-emerald-500 rounded-full" />
                    <span className="font-extrabold text-zinc-300">gemini-2.5-pro</span>
                  </div>
                  <span className="font-mono text-zinc-500">Ready (Publisher interior compiler)</span>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 bg-emerald-400 rounded-full" />
                    <span className="font-extrabold text-zinc-300">imagen-3</span>
                  </div>
                  <span className="font-mono text-zinc-500">Active (KDP Front cover artist)</span>
                </div>
              </div>
            </div>

            <div className="border border-emerald-950/80 p-5 rounded-2xl bg-[#020906]/25">
              <h4 className="text-sm font-bold text-white mb-4">Subscriber Database Breakdown</h4>
              <div className="grid grid-cols-2 gap-4 text-xs font-mono">
                <div className="p-3 bg-zinc-950/40 rounded-xl border border-zinc-900 flex justify-between items-center">
                  <span className="text-zinc-400">Free Accounts</span>
                  <strong className="text-zinc-100">{usersList.filter(u => u.plan === 'Free').length}</strong>
                </div>
                <div className="p-3 bg-blue-950/15 rounded-xl border border-blue-950/40 flex justify-between items-center">
                  <span className="text-blue-400">Creator</span>
                  <strong className="text-blue-100">{creatorCount}</strong>
                </div>
                <div className="p-3 bg-emerald-950/15 rounded-xl border border-emerald-950/40 flex justify-between items-center">
                  <span className="text-emerald-400">Publisher</span>
                  <strong className="text-emerald-100">{publisherCount}</strong>
                </div>
                <div className="p-3 bg-amber-950/15 rounded-xl border border-amber-950/40 flex justify-between items-center">
                  <span className="text-amber-400">Admin</span>
                  <strong className="text-amber-100">{adminCount}</strong>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ENGINE TRACE LOGS TAB */}
      {activeTab === 'logs' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-3">
            <div className="relative flex-1">
              <span className="absolute left-3 top-2.5 text-emerald-600">
                <Terminal className="w-4 h-4" />
              </span>
              <input
                type="text"
                placeholder="Search activity logs by message keyword..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2 bg-[#020906] border border-emerald-900/30 rounded-xl text-xs focus:outline-none text-white focus:ring-1 focus:ring-[#10B981] font-medium"
              />
            </div>

            <div className="flex gap-2">
              <select
                value={logFilter}
                onChange={(e: any) => setLogFilter(e.target.value)}
                className="bg-[#020906] border border-emerald-900/30 px-3 py-2 rounded-xl text-xs text-zinc-300 focus:outline-none focus:ring-1 focus:ring-[#10B981] font-medium"
              >
                <option value="all">All Levels</option>
                <option value="info">Info</option>
                <option value="warn">Warnings</option>
                <option value="error">Errors</option>
              </select>
            </div>
          </div>

          <div className="bg-[#010503] text-zinc-300 font-mono text-[11px] rounded-2xl p-4 border border-emerald-950/80 max-h-[400px] overflow-y-auto space-y-2">
            {filteredLogs.length === 0 ? (
              <div className="text-center text-zinc-600 py-6">
                No matching system trace logs found in Firestore.
              </div>
            ) : (
              filteredLogs.map((log) => {
                const isErr = log.level === 'error';
                const isWarn = log.level === 'warn';
                return (
                  <div key={log.id || log.timestamp} className="flex items-start gap-2 leading-relaxed border-b border-emerald-950/20 pb-1.5 last:border-b-0">
                    <span className="text-zinc-500 font-light select-none shrink-0">
                      {new Date(log.timestamp).toLocaleTimeString()}
                    </span>

                    <span className={`px-1.5 py-0.2 rounded font-bold uppercase text-[9px] shrink-0 ${
                      isErr 
                        ? 'bg-red-500/20 text-red-400 border border-red-500/20' 
                        : isWarn
                          ? 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/20'
                          : 'bg-zinc-800 text-zinc-400'
                    }`}>
                      {log.level}
                    </span>

                    <span className="text-emerald-400 font-bold uppercase text-[9px] border border-emerald-500/20 px-1 py-0.2 rounded bg-emerald-500/5 shrink-0">
                      {log.category || 'system'}
                    </span>

                    <span className={isErr ? 'text-red-300' : isWarn ? 'text-yellow-200' : 'text-zinc-300'}>
                      {log.message}
                    </span>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* EDIT NOTES DIALOG MODAL */}
      {editingNotesUid && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#030d08] border border-emerald-900/40 rounded-3xl max-w-md w-full p-6 text-zinc-100 shadow-2xl relative overflow-hidden animate-in fade-in duration-150">
            <h4 className="text-sm font-black text-white flex items-center gap-2 mb-3">
              <FileText className="w-4 h-4 text-[#10B981]" />
              <span>Edit Account Notes</span>
            </h4>
            
            <p className="text-[11px] text-zinc-400 mb-4">
              Add internal operational logs, notes, or flags for user (UID: {editingNotesUid.substring(0, 10)}...).
            </p>
            
            <textarea
              value={notesValue}
              onChange={(e) => setNotesValue(e.target.value)}
              placeholder="e.g. Needs custom cover size evaluation. Upgraded manually via invoice #3412."
              className="w-full h-28 p-3 bg-[#020906] border border-emerald-900/30 rounded-2xl text-xs focus:outline-none focus:ring-1 focus:ring-[#10B981] text-zinc-200 font-medium"
            />
            
            <div className="flex gap-2 justify-end mt-4">
              <button
                onClick={() => setEditingNotesUid(null)}
                className="px-4 py-2 rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white hover:bg-zinc-800 transition text-xs font-bold"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveNotes}
                disabled={isSavingNotes}
                className="px-4 py-2 rounded-xl bg-emerald-600 text-white hover:bg-emerald-500 transition text-xs font-bold flex items-center gap-1.5"
              >
                {isSavingNotes ? 'Saving...' : 'Save Notes'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* DELETE CONFIRMATION DIALOG MODAL */}
      {showConfirmDelete && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#030d08] border border-red-950 rounded-3xl max-w-md w-full p-6 text-zinc-100 shadow-2xl relative overflow-hidden animate-in fade-in duration-150">
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-red-600 via-orange-500 to-red-600"></div>
            
            <div className="text-center">
              <AlertTriangle className="w-12 h-12 text-red-500 mx-auto animate-pulse mb-4" />
              <h4 className="text-base font-black text-white">Delete User Workspace?</h4>
              <p className="text-xs text-zinc-400 mt-2 leading-relaxed">
                This action is irreversible. Deleting the user account will permanently purge:
              </p>
              
              <div className="my-4 p-3 bg-red-950/10 border border-red-900/30 rounded-xl text-left text-[11px] text-zinc-300 space-y-1 font-mono">
                <p>• Account Document & System Metadata</p>
                <p>• All Associated Generated Books & Manuscripts</p>
                <p>• Download Logs & PDF Compile Exports</p>
                <p>• Custom Front & Back Cover Canvas layouts</p>
              </div>

              <div className="flex gap-3 justify-end mt-6">
                <button
                  onClick={() => {
                    setShowConfirmDelete(null);
                    setErrorMessage(null);
                  }}
                  disabled={isDeletingWorkspace}
                  className="px-4 py-2 rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white hover:bg-zinc-800 transition text-xs font-bold"
                >
                  Cancel
                </button>
                <button
                  onClick={() => handleDeleteWorkspace(showConfirmDelete)}
                  disabled={isDeletingWorkspace}
                  className="px-4 py-2 rounded-xl bg-red-600 text-white hover:bg-red-500 transition text-xs font-bold flex items-center gap-1.5"
                >
                  {isDeletingWorkspace ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Deleting...</span>
                    </>
                  ) : (
                    <>
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Delete Workspace</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* VIEW BOOKS MODAL */}
      {viewBooksUser && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#030d08] border border-emerald-900/40 rounded-3xl max-w-2xl w-full p-6 text-zinc-100 shadow-2xl relative overflow-hidden animate-in fade-in duration-150 flex flex-col max-h-[85vh]">
            <div className="flex justify-between items-center border-b border-emerald-950/80 pb-3 mb-4">
              <h4 className="text-sm font-black text-white flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-[#10B981]" />
                <span>Books generated by {viewBooksUser.email}</span>
              </h4>
              <span className="px-2.5 py-0.5 rounded-full font-extrabold text-[9px] bg-emerald-500/10 text-[#10B981] uppercase tracking-wider border border-emerald-500/20">
                {selectedUserBooks.length} Books
              </span>
            </div>

            <div className="overflow-y-auto flex-1 space-y-3 pr-1">
              {isLoadingUserBooks ? (
                <div className="flex flex-col items-center justify-center py-12 gap-3">
                  <RefreshCw className="w-6 h-6 animate-spin text-[#10B981]" />
                  <span className="text-[10px] text-zinc-500 font-mono">Loading user books from database...</span>
                </div>
              ) : selectedUserBooks.length === 0 ? (
                <div className="text-center text-zinc-500 font-mono py-12 text-xs">
                  This user has not generated any book volumes yet.
                </div>
              ) : (
                selectedUserBooks.map((book) => (
                  <div key={book.id} className="p-3.5 rounded-xl bg-[#020906] border border-emerald-950/60 flex justify-between items-center hover:border-emerald-900/50 transition">
                    <div>
                      <h5 className="text-xs font-extrabold text-white">{book.title || 'Untitled Volume'}</h5>
                      <p className="text-[10px] text-zinc-400 mt-1">
                        Topic: <strong className="text-zinc-300 font-medium">{book.topic || 'N/A'}</strong> • Pages: <strong className="text-[#10B981]">{book.pages || 0}</strong> • Format: <span className="font-mono text-zinc-500">{book.format || '6x9'}</span>
                      </p>
                      <span className="text-[9px] text-zinc-500 block mt-1 font-mono">
                        ID: {book.id} • Created: {new Date(book.createdAt).toLocaleString()}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="flex justify-end mt-4 pt-3 border-t border-emerald-950/50">
              <button
                onClick={() => setViewBooksUser(null)}
                className="px-4 py-2 rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white hover:bg-zinc-800 transition text-xs font-bold"
              >
                Close View
              </button>
            </div>
          </div>
        </div>
      )}

      {/* VIEW ACTIVITY MODAL */}
      {viewActivityUser && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#030d08] border border-emerald-900/40 rounded-3xl max-w-2xl w-full p-6 text-zinc-100 shadow-2xl relative overflow-hidden animate-in fade-in duration-150 flex flex-col max-h-[85vh]">
            <div className="flex justify-between items-center border-b border-emerald-950/80 pb-3 mb-4">
              <h4 className="text-sm font-black text-white flex items-center gap-2">
                <Activity className="w-4 h-4 text-[#10B981]" />
                <span>Activity logs for {viewActivityUser.email}</span>
              </h4>
              <span className="text-[10px] text-zinc-400 font-mono">
                UID: {viewActivityUser.uid.substring(0, 10)}...
              </span>
            </div>

            <div className="overflow-y-auto flex-1 space-y-2 pr-1 bg-[#010503] border border-emerald-950 rounded-xl p-3 max-h-[50vh] font-mono text-[11px]">
              {(() => {
                const userLogs = logs.filter(l => 
                  l.message.toLowerCase().includes(viewActivityUser.email.toLowerCase()) || 
                  l.message.includes(viewActivityUser.uid)
                );
                return userLogs.length === 0 ? (
                  <div className="text-center text-zinc-500 py-12">
                    No activity logs recorded in Firestore for this user.
                  </div>
                ) : (
                  userLogs.map((log) => {
                    const isErr = log.level === 'error';
                    const isWarn = log.level === 'warn';
                    return (
                      <div key={log.id || log.timestamp} className="flex items-start gap-2 leading-relaxed border-b border-emerald-950/10 pb-1.5 last:border-b-0">
                        <span className="text-zinc-500 font-light select-none shrink-0">
                          {new Date(log.timestamp).toLocaleTimeString()}
                        </span>
                        <span className={`px-1.5 py-0.2 rounded font-bold uppercase text-[8px] shrink-0 ${
                          isErr 
                            ? 'bg-red-500/20 text-red-400 border border-red-500/20' 
                            : isWarn
                              ? 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/20'
                              : 'bg-zinc-800 text-zinc-400'
                        }`}>
                          {log.level}
                        </span>
                        <span className="text-zinc-300">
                          {log.message}
                        </span>
                      </div>
                    );
                  })
                );
              })()}
            </div>

            <div className="flex justify-end mt-4 pt-3 border-t border-emerald-950/50">
              <button
                onClick={() => setViewActivityUser(null)}
                className="px-4 py-2 rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white hover:bg-zinc-800 transition text-xs font-bold"
              >
                Close View
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
