import React, { useState, useMemo, useEffect } from 'react';
import { VennDiagram } from './components/VennDiagram';
import { Check, Send, BarChart3, Users, BookOpen, Calculator, Languages, Sparkles, Trash2, User as UserIcon, LogIn, LogOut } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { collection, doc, setDoc, onSnapshot, query, deleteDoc, getDocFromServer, getDoc, getDocs } from 'firebase/firestore';
import { signInWithPopup, signOut, onAuthStateChanged, User } from 'firebase/auth';
import { db, auth, googleProvider } from './firebase';

enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId: string | undefined;
    email: string | null | undefined;
    emailVerified: boolean | undefined;
    isAnonymous: boolean | undefined;
    tenantId: string | null | undefined;
    providerInfo: {
      providerId: string;
      displayName: string | null;
      email: string | null;
      photoUrl: string | null;
    }[];
  }
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: undefined,
      email: undefined,
      emailVerified: undefined,
      isAnonymous: undefined,
      tenantId: undefined,
      providerInfo: []
    },
    operationType,
    path
  }
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

type Submission = {
  id: string;
  math: boolean;
  lit: boolean;
  eng: boolean;
  name: string;
  timestamp: string;
};

export default function App() {
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [name, setName] = useState('');
  const [math, setMath] = useState(false);
  const [lit, setLit] = useState(false);
  const [eng, setEng] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [localSubmissionId, setLocalSubmissionId] = useState<string | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showClearAllConfirm, setShowClearAllConfirm] = useState(false);

  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
    });
    return () => unsubscribeAuth();
  }, []);

  const handleLogin = async () => {
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (error) {
      console.error("Error signing in with Google", error);
    }
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error("Error signing out", error);
    }
  };

  useEffect(() => {
    // Check if user has a submission ID in local storage
    const storedId = localStorage.getItem('submissionId');
    if (storedId) {
      setLocalSubmissionId(storedId);
    }

    async function testConnection() {
      try {
        await getDocFromServer(doc(db, 'test', 'connection'));
      } catch (error) {
        if(error instanceof Error && error.message.includes('the client is offline')) {
          console.error("Please check your Firebase configuration. ");
        }
      }
    }
    testConnection();

    const q = query(collection(db, 'submissions'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const subs: Submission[] = [];
      snapshot.forEach((doc) => {
        subs.push({ id: doc.id, ...doc.data() } as Submission);
      });
      setSubmissions(subs);
    }, (error) => {
      if (error.message.includes('Missing or insufficient permissions')) {
        // This is expected for unauthenticated users trying to list submissions
        // We just clear the submissions for them
        setSubmissions([]);
      } else {
        handleFirestoreError(error, OperationType.GET, 'submissions');
      }
    });

    return () => unsubscribe();
  }, [user]);

  // Pre-fill form if user already submitted
  useEffect(() => {
    async function fetchUserSubmission() {
      if (localSubmissionId) {
        try {
          const docRef = doc(db, 'submissions', localSubmissionId);
          const docSnap = await getDoc(docRef);
          if (docSnap.exists()) {
            const data = docSnap.data() as Submission;
            setName(data.name);
            setMath(data.math);
            setLit(data.lit);
            setEng(data.eng);
          }
        } catch (error) {
          console.error("Error fetching user submission:", error);
        }
      }
    }
    
    fetchUserSubmission();
  }, [localSubmissionId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setErrorMsg("Vui lòng nhập tên của bạn!");
      setTimeout(() => setErrorMsg(null), 3000);
      return;
    }
    
    setIsSubmitting(true);
    try {
      const generateId = () => {
        if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
          return crypto.randomUUID();
        }
        return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
      };

      const submissionId = localSubmissionId || generateId();
      const submissionRef = doc(db, 'submissions', submissionId);
      await setDoc(submissionRef, {
        name: name.trim(),
        math,
        lit,
        eng,
        timestamp: new Date().toISOString()
      });
      
      if (!localSubmissionId) {
        localStorage.setItem('submissionId', submissionId);
        setLocalSubmissionId(submissionId);
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `submissions/${localSubmissionId}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResetForm = () => {
    setLocalSubmissionId(null);
    localStorage.removeItem('submissionId');
    setName('');
    setMath(false);
    setLit(false);
    setEng(false);
  };

  const handleDeleteAll = async () => {
    if (!localSubmissionId) return;
    try {
      await deleteDoc(doc(db, 'submissions', localSubmissionId));
      localStorage.removeItem('submissionId');
      setLocalSubmissionId(null);
      setName('');
      setMath(false);
      setLit(false);
      setEng(false);
      setShowDeleteConfirm(false);
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `submissions/${localSubmissionId}`);
    }
  };

  const handleClearAllData = async () => {
    if (!user) return;
    try {
      const q = query(collection(db, 'submissions'));
      const snapshot = await getDocs(q);
      const deletePromises = snapshot.docs.map(docSnap => deleteDoc(docSnap.ref));
      await Promise.all(deletePromises);
      
      // Clear local state if they had one
      localStorage.removeItem('submissionId');
      setLocalSubmissionId(null);
      setName('');
      setMath(false);
      setLit(false);
      setEng(false);
      setShowDeleteConfirm(false);
      setShowClearAllConfirm(false);
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, 'submissions');
    }
  };

  const stats = useMemo(() => {
    const mathCount = submissions.filter(s => s.math).length;
    const litCount = submissions.filter(s => s.lit).length;
    const engCount = submissions.filter(s => s.eng).length;
    const mathLitCount = submissions.filter(s => s.math && s.lit).length;
    const mathEngCount = submissions.filter(s => s.math && s.eng).length;
    const litEngCount = submissions.filter(s => s.lit && s.eng).length;
    const allCount = submissions.filter(s => s.math && s.lit && s.eng).length;
    const noneCount = submissions.filter(s => !s.math && !s.lit && !s.eng).length;

    const onlyMath = mathCount - mathLitCount - mathEngCount + allCount;
    const onlyLit = litCount - mathLitCount - litEngCount + allCount;
    const onlyEng = engCount - mathEngCount - litEngCount + allCount;
    const onlyMathLit = mathLitCount - allCount;
    const onlyMathEng = mathEngCount - allCount;
    const onlyLitEng = litEngCount - allCount;

    return {
      mathCount, litCount, engCount,
      mathLitCount, mathEngCount, litEngCount,
      allCount, noneCount,
      onlyMath, onlyLit, onlyEng,
      onlyMathLit, onlyMathEng, onlyLitEng,
      total: submissions.length
    };
  }, [submissions]);

  const vennData = useMemo(() => {
    const data = [];
    if (stats.mathCount > 0) {
      data.push({ sets: ['Toán'], size: stats.mathCount, label: `Toán\n${stats.onlyMath}` });
    }
    if (stats.litCount > 0) {
      data.push({ sets: ['Văn'], size: stats.litCount, label: `Văn\n${stats.onlyLit}` });
    }
    if (stats.engCount > 0) {
      data.push({ sets: ['Anh'], size: stats.engCount, label: `Anh\n${stats.onlyEng}` });
    }
    if (stats.mathLitCount > 0) {
      data.push({ sets: ['Toán', 'Văn'], size: stats.mathLitCount, label: stats.onlyMathLit > 0 ? `${stats.onlyMathLit}` : '' });
    }
    if (stats.mathEngCount > 0) {
      data.push({ sets: ['Toán', 'Anh'], size: stats.mathEngCount, label: stats.onlyMathEng > 0 ? `${stats.onlyMathEng}` : '' });
    }
    if (stats.litEngCount > 0) {
      data.push({ sets: ['Văn', 'Anh'], size: stats.litEngCount, label: stats.onlyLitEng > 0 ? `${stats.onlyLitEng}` : '' });
    }
    if (stats.allCount > 0) {
      data.push({ sets: ['Toán', 'Văn', 'Anh'], size: stats.allCount, label: `${stats.allCount}` });
    }
    return data;
  }, [stats]);

  return (
    <div className="min-h-screen bg-[#f8fafc] bg-[radial-gradient(#cbd5e1_1px,transparent_1px)] [background-size:24px_24px] text-slate-900 font-sans p-4 md:p-8 lg:p-12 overflow-hidden relative">
      
      {/* Decorative background blobs */}
      <div className="absolute top-0 left-0 w-[500px] h-[500px] bg-blue-400/20 rounded-full mix-blend-multiply filter blur-[80px] opacity-70 animate-blob"></div>
      <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-rose-400/20 rounded-full mix-blend-multiply filter blur-[80px] opacity-70 animate-blob animation-delay-2000"></div>
      <div className="absolute -bottom-32 left-20 w-[500px] h-[500px] bg-emerald-400/20 rounded-full mix-blend-multiply filter blur-[80px] opacity-70 animate-blob animation-delay-4000"></div>

      <div className="max-w-6xl mx-auto space-y-10 relative z-10">
        
        {/* Header */}
        <motion.header 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          className="text-center space-y-4 pt-8"
        >
          <div className="inline-flex items-center justify-center p-3 bg-white rounded-2xl text-blue-600 mb-2 shadow-sm border border-slate-100">
            <Sparkles size={28} className="text-blue-500" />
          </div>
          <h1 className="text-4xl md:text-6xl font-black tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-blue-700 via-indigo-700 to-violet-700 pb-2 leading-tight">
            Khảo sát sở thích môn học<br/>
            <span className="text-3xl md:text-5xl bg-clip-text bg-gradient-to-r from-rose-500 to-orange-500">CỦA LỚP 11A4</span>
          </h1>
          
          <div className="pt-4 flex flex-col sm:flex-row justify-center items-center gap-4">
            <div className="flex items-center gap-3 bg-white/80 backdrop-blur-md px-6 py-3 rounded-full shadow-sm border border-slate-200">
              <Sparkles size={20} className="text-blue-500" />
              <span className="font-medium text-slate-700">Dữ liệu được cập nhật theo thời gian thực</span>
            </div>
            
            {user ? (
              <div className="flex flex-col items-center gap-3">
                {!showClearAllConfirm ? (
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => setShowClearAllConfirm(true)}
                      className="flex items-center gap-2 bg-red-50 hover:bg-red-100 text-red-600 px-5 py-3 rounded-full shadow-sm border border-red-200 transition-colors font-medium"
                      title="Xóa toàn bộ dữ liệu khảo sát"
                    >
                      <Trash2 size={18} />
                      Làm mới khảo sát
                    </button>
                    <button
                      onClick={handleLogout}
                      className="flex items-center gap-2 bg-white hover:bg-slate-50 text-slate-700 px-6 py-3 rounded-full shadow-sm border border-slate-200 transition-colors font-medium"
                    >
                      <LogOut size={18} />
                      Đăng xuất
                    </button>
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-3 bg-red-50 px-6 py-4 rounded-3xl border border-red-200 shadow-sm animate-in fade-in zoom-in duration-200">
                    <p className="text-red-700 font-bold text-center">CẢNH BÁO: Xóa TOÀN BỘ dữ liệu của lớp 11A4?</p>
                    <div className="flex gap-3">
                      <button
                        onClick={() => setShowClearAllConfirm(false)}
                        className="px-6 py-2 bg-white border border-slate-300 text-slate-700 rounded-full font-bold hover:bg-slate-50 transition-colors"
                      >
                        Hủy
                      </button>
                      <button
                        onClick={handleClearAllData}
                        className="px-6 py-2 bg-red-600 text-white rounded-full font-bold hover:bg-red-700 transition-colors shadow-md shadow-red-600/20"
                      >
                        Xác nhận Xóa
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <button
                onClick={handleLogin}
                className="flex items-center gap-2 bg-white hover:bg-blue-50 text-blue-600 px-6 py-3 rounded-full shadow-sm border border-blue-200 transition-colors font-medium"
              >
                <LogIn size={18} />
                Đăng nhập (Dành cho Giáo viên)
              </button>
            )}
          </div>
        </motion.header>

        <div className="grid lg:grid-cols-12 gap-8 items-start">
          
          {/* Form Section */}
          <motion.div 
            initial={{ opacity: 0, x: -30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6, delay: 0.2, ease: "easeOut" }}
            className="lg:col-span-4 bg-white/80 backdrop-blur-xl p-8 rounded-[2rem] shadow-xl shadow-slate-200/50 border border-white"
          >
            <h2 className="text-2xl font-bold mb-8 flex items-center gap-3 text-slate-800">
              <div className="p-2 bg-blue-100 text-blue-600 rounded-xl">
                <Users size={20} />
              </div>
              Lựa chọn của bạn
            </h2>
            
            <form onSubmit={handleSubmit} className="space-y-6">
              <AnimatePresence>
                {errorMsg && (
                  <motion.div 
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="p-3 bg-red-50 border border-red-200 text-red-600 rounded-xl text-sm font-medium text-center"
                  >
                    {errorMsg}
                  </motion.div>
                )}
              </AnimatePresence>
              
              <div className="space-y-4">
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <UserIcon className="h-5 w-5 text-slate-400" />
                  </div>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Nhập tên của bạn..."
                    className="w-full pl-11 pr-4 py-4 bg-white border-2 border-slate-200 rounded-2xl focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all outline-none font-medium text-slate-700 placeholder:text-slate-400"
                    required
                  />
                </div>

                <motion.label 
                  whileHover={{ scale: 1.02, y: -2 }}
                  whileTap={{ scale: 0.98 }}
                  className={`flex items-center p-5 border-2 rounded-2xl cursor-pointer transition-all duration-300 ${math ? 'border-blue-500 bg-blue-50/80 shadow-lg shadow-blue-500/10' : 'border-slate-200 hover:border-blue-300 hover:bg-slate-50 hover:shadow-md'}`}
                >
                  <div className={`w-7 h-7 rounded-lg border-2 flex items-center justify-center mr-4 transition-colors ${math ? 'bg-blue-500 border-blue-500' : 'border-slate-300'}`}>
                    <AnimatePresence>
                      {math && <motion.div initial={{scale:0}} animate={{scale:1}} exit={{scale:0}}><Check size={16} className="text-white" /></motion.div>}
                    </AnimatePresence>
                  </div>
                  <input type="checkbox" className="hidden" checked={math} onChange={(e) => setMath(e.target.checked)} />
                  <div className="flex items-center gap-3">
                    <Calculator className={math ? "text-blue-600" : "text-slate-400"} size={22} />
                    <span className={`font-bold text-lg ${math ? 'text-blue-900' : 'text-slate-600'}`}>Thích học Toán</span>
                  </div>
                </motion.label>

                <motion.label 
                  whileHover={{ scale: 1.02, y: -2 }}
                  whileTap={{ scale: 0.98 }}
                  className={`flex items-center p-5 border-2 rounded-2xl cursor-pointer transition-all duration-300 ${lit ? 'border-rose-500 bg-rose-50/80 shadow-lg shadow-rose-500/10' : 'border-slate-200 hover:border-rose-300 hover:bg-slate-50 hover:shadow-md'}`}
                >
                  <div className={`w-7 h-7 rounded-lg border-2 flex items-center justify-center mr-4 transition-colors ${lit ? 'bg-rose-500 border-rose-500' : 'border-slate-300'}`}>
                    <AnimatePresence>
                      {lit && <motion.div initial={{scale:0}} animate={{scale:1}} exit={{scale:0}}><Check size={16} className="text-white" /></motion.div>}
                    </AnimatePresence>
                  </div>
                  <input type="checkbox" className="hidden" checked={lit} onChange={(e) => setLit(e.target.checked)} />
                  <div className="flex items-center gap-3">
                    <BookOpen className={lit ? "text-rose-600" : "text-slate-400"} size={22} />
                    <span className={`font-bold text-lg ${lit ? 'text-rose-900' : 'text-slate-600'}`}>Thích học Văn</span>
                  </div>
                </motion.label>

                <motion.label 
                  whileHover={{ scale: 1.02, y: -2 }}
                  whileTap={{ scale: 0.98 }}
                  className={`flex items-center p-5 border-2 rounded-2xl cursor-pointer transition-all duration-300 ${eng ? 'border-emerald-500 bg-emerald-50/80 shadow-lg shadow-emerald-500/10' : 'border-slate-200 hover:border-emerald-300 hover:bg-slate-50 hover:shadow-md'}`}
                >
                  <div className={`w-7 h-7 rounded-lg border-2 flex items-center justify-center mr-4 transition-colors ${eng ? 'bg-emerald-500 border-emerald-500' : 'border-slate-300'}`}>
                    <AnimatePresence>
                      {eng && <motion.div initial={{scale:0}} animate={{scale:1}} exit={{scale:0}}><Check size={16} className="text-white" /></motion.div>}
                    </AnimatePresence>
                  </div>
                  <input type="checkbox" className="hidden" checked={eng} onChange={(e) => setEng(e.target.checked)} />
                  <div className="flex items-center gap-3">
                    <Languages className={eng ? "text-emerald-600" : "text-slate-400"} size={22} />
                    <span className={`font-bold text-lg ${eng ? 'text-emerald-900' : 'text-slate-600'}`}>Thích học Anh Văn</span>
                  </div>
                </motion.label>
              </div>

              <div className="space-y-3">
                <motion.button 
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  type="submit"
                  disabled={isSubmitting || !name.trim()}
                  className={`w-full py-4 px-6 rounded-2xl font-bold text-lg flex items-center justify-center gap-3 transition-all shadow-xl ${!name.trim() ? 'bg-slate-200 text-slate-400 cursor-not-allowed shadow-none' : 'bg-gradient-to-r from-slate-800 to-slate-900 hover:from-slate-900 hover:to-black text-white shadow-slate-900/20'}`}
                >
                  <Send size={20} />
                  {isSubmitting ? 'Đang lưu...' : (localSubmissionId ? 'Cập nhật lựa chọn' : 'Gửi lựa chọn')}
                </motion.button>

                {localSubmissionId && (
                  <motion.button
                    type="button"
                    onClick={handleResetForm}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    className="w-full py-4 px-6 rounded-2xl font-bold text-lg flex items-center justify-center gap-3 transition-all bg-blue-50 text-blue-600 hover:bg-blue-100 border border-blue-200"
                  >
                    <Users size={20} />
                    Thêm học sinh khác
                  </motion.button>
                )}
              </div>
            </form>

            <div className="mt-8 pt-6 border-t border-slate-100">
              {user && (
                <div className="flex justify-between items-center text-sm text-slate-500 mb-5 bg-slate-50 px-4 py-3 rounded-xl">
                  <span className="font-medium">Tổng số lượt tham gia:</span>
                  <span className="font-black text-slate-900 text-xl">{stats.total}</span>
                </div>
              )}
              {localSubmissionId && (
                <div className="space-y-3">
                  {!showDeleteConfirm ? (
                    <button
                      onClick={() => setShowDeleteConfirm(true)}
                      className="w-full py-3 px-4 bg-white border-2 border-slate-200 hover:border-red-200 hover:bg-red-50 hover:text-red-600 text-slate-600 rounded-xl font-bold transition-colors flex items-center justify-center gap-2"
                    >
                      <Trash2 size={18} />
                      Xóa lựa chọn hiện tại
                    </button>
                  ) : (
                    <div className="p-4 bg-red-50 border-2 border-red-200 rounded-xl space-y-3">
                      <p className="text-red-700 font-medium text-center text-sm">Bạn có chắc chắn muốn xóa lựa chọn của mình?</p>
                      <div className="flex gap-3">
                        <button
                          onClick={() => setShowDeleteConfirm(false)}
                          className="flex-1 py-2 bg-white border border-slate-300 text-slate-700 rounded-lg font-bold hover:bg-slate-50 transition-colors"
                        >
                          Hủy
                        </button>
                        <button
                          onClick={handleDeleteAll}
                          className="flex-1 py-2 bg-red-600 text-white rounded-lg font-bold hover:bg-red-700 transition-colors"
                        >
                          Xóa
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </motion.div>

          {/* Visualization Section */}
          <motion.div 
            initial={{ opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6, delay: 0.4, ease: "easeOut" }}
            className="lg:col-span-8 bg-white/80 backdrop-blur-xl p-8 rounded-[2rem] shadow-xl shadow-slate-200/50 border border-white"
          >
            <h2 className="text-2xl font-bold mb-8 flex items-center gap-3 text-slate-800">
              <div className="p-2 bg-indigo-100 text-indigo-600 rounded-xl">
                <BarChart3 size={20} />
              </div>
              Biểu đồ kết quả trực quan
            </h2>
            
            {user ? (
              <>
                <VennDiagram data={vennData} noneCount={stats.noneCount} />

                {/* Legend / Stats */}
                <AnimatePresence>
                  {stats.total > 0 && (
                    <motion.div 
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -20 }}
                      className="mt-12 space-y-6"
                    >
                      <h3 className="text-xl font-bold text-slate-800 border-b border-slate-200 pb-3 flex items-center gap-2">
                        <BarChart3 size={20} className="text-indigo-500" />
                        Chi tiết từng môn
                      </h3>
                      
                      <div className="grid md:grid-cols-3 gap-6">
                        {/* Math Card */}
                        <motion.div whileHover={{ y: -4 }} className="bg-white rounded-2xl p-6 shadow-sm border border-blue-100 relative overflow-hidden">
                          <div className="absolute top-0 left-0 w-1.5 h-full bg-blue-500"></div>
                          <h4 className="text-lg font-bold text-blue-900 mb-4 flex items-center justify-between">
                            <span className="flex items-center gap-2"><Calculator size={18} className="text-blue-500" /> Thích Toán</span>
                            <span className="text-3xl font-black">{stats.mathCount}</span>
                          </h4>
                          <ul className="space-y-3 text-sm text-slate-600">
                            <li className="flex justify-between items-center">
                              <span>Chỉ thích Toán:</span> 
                              <span className="font-bold text-slate-900 bg-slate-100 px-2 py-0.5 rounded-md">{stats.onlyMath}</span>
                            </li>
                            <li className="flex justify-between items-center">
                              <span>Cùng với Văn:</span> 
                              <span className="font-bold text-slate-900 bg-slate-100 px-2 py-0.5 rounded-md">{stats.onlyMathLit}</span>
                            </li>
                            <li className="flex justify-between items-center">
                              <span>Cùng với Anh:</span> 
                              <span className="font-bold text-slate-900 bg-slate-100 px-2 py-0.5 rounded-md">{stats.onlyMathEng}</span>
                            </li>
                            <li className="flex justify-between items-center pt-2 border-t border-slate-100">
                              <span className="font-medium text-violet-600">Thích cả 3 môn:</span> 
                              <span className="font-black text-violet-700 bg-violet-100 px-2 py-0.5 rounded-md">{stats.allCount}</span>
                            </li>
                          </ul>
                        </motion.div>

                        {/* Lit Card */}
                        <motion.div whileHover={{ y: -4 }} className="bg-white rounded-2xl p-6 shadow-sm border border-rose-100 relative overflow-hidden">
                          <div className="absolute top-0 left-0 w-1.5 h-full bg-rose-500"></div>
                          <h4 className="text-lg font-bold text-rose-900 mb-4 flex items-center justify-between">
                            <span className="flex items-center gap-2"><BookOpen size={18} className="text-rose-500" /> Thích Văn</span>
                            <span className="text-3xl font-black">{stats.litCount}</span>
                          </h4>
                          <ul className="space-y-3 text-sm text-slate-600">
                            <li className="flex justify-between items-center">
                              <span>Chỉ thích Văn:</span> 
                              <span className="font-bold text-slate-900 bg-slate-100 px-2 py-0.5 rounded-md">{stats.onlyLit}</span>
                            </li>
                            <li className="flex justify-between items-center">
                              <span>Cùng với Toán:</span> 
                              <span className="font-bold text-slate-900 bg-slate-100 px-2 py-0.5 rounded-md">{stats.onlyMathLit}</span>
                            </li>
                            <li className="flex justify-between items-center">
                              <span>Cùng với Anh:</span> 
                              <span className="font-bold text-slate-900 bg-slate-100 px-2 py-0.5 rounded-md">{stats.onlyLitEng}</span>
                            </li>
                            <li className="flex justify-between items-center pt-2 border-t border-slate-100">
                              <span className="font-medium text-violet-600">Thích cả 3 môn:</span> 
                              <span className="font-black text-violet-700 bg-violet-100 px-2 py-0.5 rounded-md">{stats.allCount}</span>
                            </li>
                          </ul>
                        </motion.div>

                        {/* Eng Card */}
                        <motion.div whileHover={{ y: -4 }} className="bg-white rounded-2xl p-6 shadow-sm border border-emerald-100 relative overflow-hidden">
                          <div className="absolute top-0 left-0 w-1.5 h-full bg-emerald-500"></div>
                          <h4 className="text-lg font-bold text-emerald-900 mb-4 flex items-center justify-between">
                            <span className="flex items-center gap-2"><Languages size={18} className="text-emerald-500" /> Thích Anh</span>
                            <span className="text-3xl font-black">{stats.engCount}</span>
                          </h4>
                          <ul className="space-y-3 text-sm text-slate-600">
                            <li className="flex justify-between items-center">
                              <span>Chỉ thích Anh:</span> 
                              <span className="font-bold text-slate-900 bg-slate-100 px-2 py-0.5 rounded-md">{stats.onlyEng}</span>
                            </li>
                            <li className="flex justify-between items-center">
                              <span>Cùng với Toán:</span> 
                              <span className="font-bold text-slate-900 bg-slate-100 px-2 py-0.5 rounded-md">{stats.onlyMathEng}</span>
                            </li>
                            <li className="flex justify-between items-center">
                              <span>Cùng với Văn:</span> 
                              <span className="font-bold text-slate-900 bg-slate-100 px-2 py-0.5 rounded-md">{stats.onlyLitEng}</span>
                            </li>
                            <li className="flex justify-between items-center pt-2 border-t border-slate-100">
                              <span className="font-medium text-violet-600">Thích cả 3 môn:</span> 
                              <span className="font-black text-violet-700 bg-violet-100 px-2 py-0.5 rounded-md">{stats.allCount}</span>
                            </li>
                          </ul>
                        </motion.div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </>
            ) : (
              <div className="flex flex-col items-center justify-center py-16 text-center space-y-4">
                <div className="p-4 bg-slate-100 rounded-full text-slate-400">
                  <BarChart3 size={48} />
                </div>
                <h3 className="text-xl font-bold text-slate-700">Biểu đồ đang bị khóa</h3>
                <p className="text-slate-500 max-w-md">
                  Chỉ giáo viên mới có thể xem kết quả tổng hợp. Vui lòng đăng nhập bằng tài khoản Google để xem biểu đồ.
                </p>
                <button
                  onClick={handleLogin}
                  className="mt-4 flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-xl shadow-md transition-colors font-bold"
                >
                  <LogIn size={18} />
                  Đăng nhập ngay
                </button>
              </div>
            )}
          </motion.div>

        </div>
      </div>
    </div>
  );
}
