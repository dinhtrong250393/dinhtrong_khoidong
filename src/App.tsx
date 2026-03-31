import React, { useState, useMemo } from 'react';
import { VennDiagram } from './components/VennDiagram';
import { Check, Send, BarChart3, Users, BookOpen, Calculator, Languages, Sparkles, Trash2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

type Submission = {
  id: string;
  math: boolean;
  lit: boolean;
  eng: boolean;
};

export default function App() {
  const [submissions, setSubmissions] = useState<Submission[]>([
    { id: '1', math: true, lit: false, eng: false },
    { id: '2', math: false, lit: true, eng: false },
    { id: '3', math: false, lit: false, eng: true },
    { id: '4', math: true, lit: true, eng: false },
    { id: '5', math: true, lit: false, eng: true },
    { id: '6', math: false, lit: true, eng: true },
    { id: '7', math: true, lit: true, eng: true },
    { id: '8', math: false, lit: false, eng: false },
  ]);
  const [math, setMath] = useState(false);
  const [lit, setLit] = useState(false);
  const [eng, setEng] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmissions([
      ...submissions,
      { id: Date.now().toString(), math, lit, eng }
    ]);
    // Reset form
    setMath(false);
    setLit(false);
    setEng(false);
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
          <h1 className="text-4xl md:text-6xl font-black tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-blue-700 via-indigo-700 to-violet-700 pb-2">
            Khảo sát sở thích môn học
          </h1>
          <p className="text-lg text-slate-600 max-w-2xl mx-auto font-medium">
            Hãy chọn những môn học mà bạn yêu thích. Kết quả sẽ được hiển thị trực quan qua biểu đồ Venn sinh động.
          </p>
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
              <div className="space-y-4">
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

              <motion.button 
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                type="submit"
                className="w-full py-4 px-6 bg-gradient-to-r from-slate-800 to-slate-900 hover:from-slate-900 hover:to-black text-white rounded-2xl font-bold text-lg flex items-center justify-center gap-3 transition-all shadow-xl shadow-slate-900/20"
              >
                <Send size={20} />
                Gửi lựa chọn
              </motion.button>
            </form>

            <div className="mt-8 pt-6 border-t border-slate-100">
              <div className="flex justify-between items-center text-sm text-slate-500 mb-5 bg-slate-50 px-4 py-3 rounded-xl">
                <span className="font-medium">Tổng số lượt tham gia:</span>
                <span className="font-black text-slate-900 text-xl">{stats.total}</span>
              </div>
              <button
                onClick={() => setSubmissions([])}
                className="w-full py-3 px-4 bg-white border-2 border-slate-200 hover:border-red-200 hover:bg-red-50 hover:text-red-600 text-slate-600 rounded-xl font-bold transition-colors flex items-center justify-center gap-2"
              >
                <Trash2 size={18} />
                Xóa toàn bộ dữ liệu
              </button>
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
            
            <VennDiagram data={vennData} noneCount={stats.noneCount} />

            {/* Legend / Stats */}
            <AnimatePresence>
              {stats.total > 0 && (
                <motion.div 
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  className="mt-8 grid grid-cols-2 sm:grid-cols-4 gap-4"
                >
                  <motion.div whileHover={{ y: -4 }} className="p-5 bg-gradient-to-br from-blue-50 to-blue-100/50 rounded-2xl border border-blue-100/50 text-center shadow-sm">
                    <div className="text-xs text-blue-600 uppercase font-black tracking-widest mb-2">Toán</div>
                    <div className="text-4xl font-black text-blue-900">{stats.mathCount}</div>
                  </motion.div>
                  <motion.div whileHover={{ y: -4 }} className="p-5 bg-gradient-to-br from-rose-50 to-rose-100/50 rounded-2xl border border-rose-100/50 text-center shadow-sm">
                    <div className="text-xs text-rose-600 uppercase font-black tracking-widest mb-2">Văn</div>
                    <div className="text-4xl font-black text-rose-900">{stats.litCount}</div>
                  </motion.div>
                  <motion.div whileHover={{ y: -4 }} className="p-5 bg-gradient-to-br from-emerald-50 to-emerald-100/50 rounded-2xl border border-emerald-100/50 text-center shadow-sm">
                    <div className="text-xs text-emerald-600 uppercase font-black tracking-widest mb-2">Anh</div>
                    <div className="text-4xl font-black text-emerald-900">{stats.engCount}</div>
                  </motion.div>
                  <motion.div whileHover={{ y: -4 }} className="p-5 bg-gradient-to-br from-violet-50 to-violet-100/50 rounded-2xl border border-violet-100/50 text-center shadow-sm relative overflow-hidden">
                    <div className="absolute -right-4 -top-4 text-violet-200 opacity-50">
                      <Sparkles size={64} />
                    </div>
                    <div className="relative z-10">
                      <div className="text-xs text-violet-600 uppercase font-black tracking-widest mb-2">Cả 3 môn</div>
                      <div className="text-4xl font-black text-violet-900">{stats.allCount}</div>
                    </div>
                  </motion.div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>

        </div>
      </div>
    </div>
  );
}
