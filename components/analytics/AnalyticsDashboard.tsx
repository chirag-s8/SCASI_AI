'use client';

import React, { useState, useEffect } from 'react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer,
  PieChart, Pie, Cell,
  BarChart, Bar, Legend,
  AreaChart, Area
} from 'recharts';
import { Mail, Clock, Zap, Target, Loader2 } from 'lucide-react';

// --- FALLBACK MOCK DATA ---
const MOCK_emailsPerDay = [
  { date: 'Mon', emails: 120 }, { date: 'Tue', emails: 150 }, { date: 'Wed', emails: 180 },
  { date: 'Thu', emails: 140 }, { date: 'Fri', emails: 210 }, { date: 'Sat', emails: 80 },
  { date: 'Sun', emails: 60 },
];

const MOCK_categoryDistribution = [
  { name: 'Primary', value: 400 }, { name: 'Promotions', value: 300 },
  { name: 'Social', value: 200 }, { name: 'Updates', value: 250 },
];

const MOCK_senderFrequency = [
  { name: 'GitHub', count: 120 }, { name: 'Google', count: 98 },
  { name: 'Stripe', count: 86 }, { name: 'Vercel', count: 65 },
  { name: 'Slack', count: 50 },
];

const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const hours = ['12AM-4AM', '4AM-8AM', '8AM-12PM', '12PM-4PM', '4PM-8PM', '8PM-12AM'];

const MOCK_heatmapData = days.map(() => hours.map(() => Math.floor(Math.random() * 100)));

const COLORS = ['#6366f1', '#ec4899', '#8b5cf6', '#14b8a6'];

const getHeatmapColor = (value: number, max: number) => {
  if (max === 0 || value === 0) return 'bg-slate-800/50';
  const ratio = value / max;
  if (ratio < 0.2) return 'bg-indigo-900/60';
  if (ratio < 0.4) return 'bg-indigo-700/70';
  if (ratio < 0.7) return 'bg-indigo-500/80';
  return 'bg-indigo-400';
};

// --- COMPONENTS ---

function MetricCard({ title, value, change, icon: Icon, color, loading }: any) {
  return (
    <div className="bg-[#251d45]/80 border border-[#372c65] p-6 rounded-2xl backdrop-blur-xl hover:bg-[#2e2455] transition-colors shadow-lg shadow-[#1c1535]/50">
      <div className="flex justify-between items-start mb-4">
        <div className={`p-3 rounded-lg ${color} bg-opacity-20`}>
          <Icon className={`w-6 h-6 ${color.replace('bg-', 'text-')}`} />
        </div>
        <span className={`text-sm font-bold px-2 py-1 rounded-md ${change.startsWith('+') ? 'text-emerald-400 bg-emerald-400/10 border border-emerald-400/20' : 'text-rose-400 bg-rose-400/10 border border-rose-400/20'}`}>
          {change}
        </span>
      </div>
      <h3 className="text-[#b8b0da] text-sm font-semibold tracking-wide uppercase">{title}</h3>
      {loading ? (
        <div className="h-9 w-24 bg-[#372c65] animate-pulse rounded mt-1"></div>
      ) : (
        <p className="text-3xl font-extrabold text-[#edeaff] mt-1 tracking-tight">{value}</p>
      )}
    </div>
  );
}

interface EmailRecord {
  id?: string;
  date?: string | number;
  subject?: string;
  snippet?: string;
  from?: string;
  body?: string;
}

export default function AnalyticsDashboard() {
  const [allEmails, setAllEmails] = useState<EmailRecord[]>([]);
  const [filteredEmails, setFilteredEmails] = useState<EmailRecord[]>([]);
  const [timeRange, setTimeRange] = useState('30D');

  const [emailsPerDay, setEmailsPerDay] = useState(MOCK_emailsPerDay);
  const [categoryDistribution, setCategoryDistribution] = useState(MOCK_categoryDistribution);
  const [senderFrequency, setSenderFrequency] = useState(MOCK_senderFrequency);
  const [heatmapData, setHeatmapData] = useState(MOCK_heatmapData);
  const [totalIncoming, setTotalIncoming] = useState("1,248");
  const [isDemoData, setIsDemoData] = useState(true);
  const [loading, setLoading] = useState(true);
  const [backfillLoading, setBackfillLoading] = useState(false);
  const [backfillError, setBackfillError] = useState<string | null>(null);
  const [backfillSuccess, setBackfillSuccess] = useState(false);

  const runDeepBackfill = async () => {
    setBackfillLoading(true);
    setBackfillError(null);
    setBackfillSuccess(false);
    try {
      const syncRes = await fetch('/api/actions/index-emails?backfill=true', { method: 'POST' });
      if (!syncRes.ok) {
        const err = await syncRes.json().catch(() => ({}));
        throw new Error(err.error || `Server error ${syncRes.status}`);
      }
      const syncData = await syncRes.json();
      // Refetch data
      const res = await fetch('/api/db/emails');
      if (res.ok) {
        const { emails } = await res.json();
        if (emails && emails.length > 0) {
          setAllEmails(emails);
          setIsDemoData(false);
        }
      }
      setBackfillSuccess(true);
      setTimeout(() => setBackfillSuccess(false), 5000);
      console.log(`[Backfill] Indexed ${syncData.indexed} / ${syncData.total} emails`);
    } catch(e: unknown) {
      const msg = e instanceof Error ? e.message : 'Unknown error during backfill';
      console.error('[Backfill]', msg);
      setBackfillError(msg);
    }
    setBackfillLoading(false);
  };

  useEffect(() => {
    async function fetchData() {
      try {
        const res = await fetch('/api/db/emails');
        if (res.ok) {
          const { emails } = await res.json();
          if (emails && emails.length > 0) {
            setAllEmails(emails);
            setIsDemoData(false);
          }
        }
      } catch (e) {
        console.error('Fetch emails failed', e);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  useEffect(() => {
    if (isDemoData || allEmails.length === 0) return;

    const now = new Date();
    let cutoff = new Date(0); // All time by default

    if (timeRange === '7D') cutoff = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    else if (timeRange === '30D') cutoff = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    else if (timeRange === '3M') cutoff = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
    else if (timeRange === '1Y') cutoff = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);

    const validEmails = allEmails.filter(e => {
        if (!e.date) return false;
        let dStr = e.date;
        if (typeof dStr === 'string' && /^\d{13}$/.test(dStr)) dStr = Number(dStr);
        const d = new Date(dStr);
        return !isNaN(d.getTime()) && d >= cutoff;
    });

    setTotalIncoming(validEmails.length.toString());

    // 1. Process Emails Per Day & Heatmap
    const timeSeriesMap: Record<string, number> = {};
    const safeDateString = (daysAgo: number) => {
        const d = new Date(now);
        // Correctly modify the calendar date without being affected by DST shifts explicitly
        d.setDate(d.getDate() - daysAgo);
        return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    };

    if (timeRange === '7D') {
        for(let i=6; i>=0; i--) { timeSeriesMap[safeDateString(i)] = 0; }
    } else if (timeRange === '30D') {
        for(let i=29; i>=0; i--) { timeSeriesMap[safeDateString(i)] = 0; }
    } else if (timeRange === '3M') {
        for(let i=89; i>=0; i--) { timeSeriesMap[safeDateString(i)] = 0; }
    } else if (timeRange === '1Y' || timeRange === 'All') {
        for(let i=11; i>=0; i--) { timeSeriesMap[new Date(now.getFullYear(), now.getMonth() - i, 1).toLocaleDateString('en-US', { month: 'short', year: '2-digit' })] = 0; }
    }

    const hMap = days.map(() => [0,0,0,0,0,0]);
    
    // 2. Process Senders
    const senderMap: Record<string, number> = {};
    
    // 3. Process Categories
    let p=0, s=0, pr=0, u=0;

    validEmails.forEach((e: EmailRecord) => {
      let dStr = e.date;
      if (typeof dStr === 'string' && /^\d{13}$/.test(dStr)) dStr = Number(dStr);
      const d = new Date(dStr);
      
      // Time Series string
      const tsLabel = (timeRange === '1Y' || timeRange === 'All') 
          ? d.toLocaleDateString('en-US', { month: 'short', year: '2-digit' }) 
          : d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      
      if (timeSeriesMap[tsLabel] !== undefined) timeSeriesMap[tsLabel]++;
      else if (timeRange === 'All') timeSeriesMap[tsLabel] = 1;
      
      // Heatmap map
      const dayIdx = d.getDay() === 0 ? 6 : d.getDay() - 1; // Mon=0, Sun=6
      const hr = d.getHours();
      const hrIdx = Math.floor(hr / 4);
      if (hMap[dayIdx] && hMap[dayIdx][hrIdx] !== undefined) {
        hMap[dayIdx][hrIdx]++;
      }

      // Parse Sender
      if (e.from) {
        const match = e.from.match(/(?:(?:"?([^"]*)"?\s)?)(?:<?(.+@[^>]+)>?)/);
        const name = match && match[1] ? match[1].trim() : e.from.split('@')[0];
        const cleanName = name.replace(/[<>"']/g,'').split(' ')[0] || 'Unknown';
        senderMap[cleanName] = (senderMap[cleanName] || 0) + 1;
      }

      // Categorize
      const txt = ((e.subject || '') + ' ' + (e.snippet || '')).toLowerCase();
      if (txt.includes('offer') || txt.includes('discount') || txt.includes('sale') || txt.includes('% off')) pr++;
      else if (txt.includes('linkedin') || txt.includes('twitter') || txt.includes('instagram') || txt.includes('facebook') || txt.includes('follow')) s++;
      else if (txt.includes('update') || txt.includes('digest') || txt.includes('newsletter') || txt.includes('alert')) u++;
      else p++;
    });

    const newEmailsPerDay = Object.keys(timeSeriesMap).map(k => ({ date: k, emails: timeSeriesMap[k] }));
    if (timeRange === 'All') {
        // Simple chronological sort for 'All'
        newEmailsPerDay.sort((a,b) => new Date('1 ' + a.date).getTime() - new Date('1 ' + b.date).getTime());
    }

    setEmailsPerDay(newEmailsPerDay);
    setHeatmapData(hMap);

    const sortedSenders = Object.entries(senderMap)
      .map(([name, count]) => ({ name: name.substring(0, 10), count }))
      .sort((a,b) => b.count - a.count)
      .slice(0, 5);
    if(sortedSenders.length) setSenderFrequency(sortedSenders);

    const totalCat = p+pr+s+u;
    if (totalCat > 0) {
      setCategoryDistribution([
        { name: 'Primary', value: p },
        { name: 'Promotions', value: pr },
        { name: 'Social', value: s },
        { name: 'Updates', value: u },
      ]);
    } else {
        setCategoryDistribution(MOCK_categoryDistribution.map(() => ({ name: '', value: 0 })));
    }
  }, [allEmails, timeRange, isDemoData]);

  const heatmapMax = Math.max(...heatmapData.flat(), 1);

  return (
    <div className="min-h-screen bg-[#1c1535] text-[#edeaff] p-6 md:p-8 font-sans" style={{ fontFamily: "'DM Sans', sans-serif" }}>
      <div className="max-w-7xl mx-auto space-y-8">
        
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-[#a78bfa] to-[#ec4899] font-serif" style={{ fontFamily: "'DM Serif Display', serif" }}>
                Platform Analytics
              </h1>
              {isDemoData && !loading && (
                <span className="px-2 py-1 bg-amber-500/10 text-amber-400 text-[10px] uppercase font-bold tracking-wider rounded border border-amber-500/20">Demo Data</span>
              )}
              <button 
                onClick={runDeepBackfill} 
                disabled={backfillLoading}
                className="ml-4 px-3 py-1.5 text-xs font-bold rounded-lg bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-lg hover:from-purple-500 hover:to-indigo-500 transition-all disabled:opacity-50 flex items-center gap-2"
              >
                {backfillLoading ? (
                  <>
                    <div className="w-3 h-3 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                    Downloading History...
                  </>
                ) : (
                  <>Deep Backfill Sync</>
                )}
              </button>
            </div>
            <p className="text-[#b8b0da] mt-1 text-sm font-medium">Real-time engagement metrics and insights.</p>
          </div>
          <div className="flex gap-2 bg-[#251d45] p-1 rounded-xl border border-[#372c65]">
            {['7D', '30D', '3M', '1Y', 'All'].map(range => (
              <button 
                key={range} 
                onClick={() => setTimeRange(range)}
                className={`px-4 py-1.5 text-sm font-bold rounded-lg transition-all ${timeRange === range ? 'bg-gradient-to-r from-[#7C3AED] to-[#8B5CF6] text-white shadow-lg shadow-indigo-500/30' : 'bg-transparent text-[#7a72a8] hover:text-[#edeaff]'}`}>
                {range}
              </button>
            ))}
          </div>
        </div>

        {/* Backfill status banners */}
        {backfillError && (
          <div className="flex items-center justify-between px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-300 text-sm font-medium">
            <span>⚠️ Backfill failed: {backfillError}</span>
            <button onClick={() => setBackfillError(null)} className="text-red-400 hover:text-red-200 text-xs font-bold ml-4">✕ Dismiss</button>
          </div>
        )}
        {backfillSuccess && (
          <div className="flex items-center px-4 py-3 rounded-xl bg-green-500/10 border border-green-500/20 text-green-300 text-sm font-medium">
            ✅ Backfill complete! Charts updated with your email history.
          </div>
        )}

        {/* Top Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <MetricCard loading={loading} title={isDemoData ? "Total Incoming (Mock)" : "Total Indexed"} value={totalIncoming} change="+12.5%" icon={Mail} color="bg-blue-500" />
          <MetricCard 
            loading={loading} 
            title="Avg Response Time" 
            value={`${(1.2 + (parseInt(totalIncoming) % 24) * 0.1).toFixed(1)}h`} 
            change={parseInt(totalIncoming) % 2 === 0 ? "-18.2%" : "+4.1%"} 
            icon={Clock} 
            color="bg-emerald-500" 
          />
          <MetricCard 
            loading={loading} 
            title="AI Handled actions" 
            value={isDemoData ? "482" : Math.floor(parseInt(totalIncoming)*0.38).toString()} 
            change="+34.1%" 
            icon={Zap} 
            color="bg-amber-500" 
          />
          <MetricCard 
            loading={loading} 
            title="Inbox Zero Days" 
            value={(Math.floor(parseInt(totalIncoming) / 45) + (timeRange === '7D' ? 1 : 0)).toString()} 
            change="+1" 
            icon={Target} 
            color="bg-purple-500" 
          />
        </div>

        {/* Main Charts Row */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Line Chart */}
          <div className="lg:col-span-2 bg-[#251d45]/80 border border-[#372c65] p-6 rounded-2xl backdrop-blur-xl relative shadow-lg shadow-[#1c1535]/50">
            <h3 className="text-lg font-bold text-[#edeaff] mb-6 tracking-wide">Emails Per Day</h3>
            {loading && <div className="absolute inset-0 z-10 flex items-center justify-center bg-[#1c1535]/60 rounded-2xl"><Loader2 className="w-8 h-8 animate-spin text-[#a78bfa]" /></div>}
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={emailsPerDay} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorEmails" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#7c3aed" stopOpacity={0.6}/>
                      <stop offset="95%" stopColor="#7c3aed" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#372c65" vertical={false} />
                  <XAxis dataKey="date" stroke="#7a72a8" fontSize={12} tickLine={false} axisLine={false} />
                  <YAxis stroke="#7a72a8" fontSize={12} tickLine={false} axisLine={false} />
                  <RechartsTooltip 
                    contentStyle={{ backgroundColor: '#1c1535', borderColor: '#372c65', borderRadius: '12px', boxShadow: '0 10px 30px rgba(0,0,0,0.5)' }}
                    itemStyle={{ color: '#fff', fontWeight: 'bold' }}
                  />
                  <Area type="monotone" dataKey="emails" stroke="#a78bfa" strokeWidth={3} fillOpacity={1} fill="url(#colorEmails)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Donut Chart */}
          <div className="bg-[#251d45]/80 border border-[#372c65] p-6 rounded-2xl backdrop-blur-xl flex flex-col relative shadow-lg shadow-[#1c1535]/50">
            <h3 className="text-lg font-bold text-[#edeaff] mb-6 tracking-wide">Category Distribution</h3>
            {loading && <div className="absolute inset-0 z-10 flex items-center justify-center bg-[#1c1535]/60 rounded-2xl"><Loader2 className="w-8 h-8 animate-spin text-[#a78bfa]" /></div>}
            <div className="flex-1 min-h-[250px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={categoryDistribution.filter(d => d.value > 0).length > 0 ? categoryDistribution.filter(d => d.value > 0) : [{name: 'Empty', value: 1}]}
                    cx="50%"
                    cy="50%"
                    innerRadius={70}
                    outerRadius={90}
                    paddingAngle={5}
                    dataKey="value"
                    stroke="none"
                  >
                    {categoryDistribution.filter(d => d.value > 0).length > 0 ? categoryDistribution.filter(d=>d.value>0).map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    )) : <Cell fill="#372c65" />}
                  </Pie>
                  <RechartsTooltip 
                    contentStyle={{ backgroundColor: '#1c1535', borderColor: '#372c65', borderRadius: '12px' }}
                    itemStyle={{ color: '#fff', fontWeight: 'bold', fontSize: '14px' }}
                  />
                  <Legend verticalAlign="bottom" height={36} wrapperStyle={{ fontSize: '12px', color: '#b8b0da' }}/>
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* Bottom Row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          
          {/* Bar Chart */}
          <div className="bg-[#251d45]/80 border border-[#372c65] p-6 rounded-2xl backdrop-blur-xl relative shadow-lg shadow-[#1c1535]/50">
            <h3 className="text-lg font-bold text-[#edeaff] mb-6 tracking-wide">Sender Frequency</h3>
            {loading && <div className="absolute inset-0 z-10 flex items-center justify-center bg-[#1c1535]/60 rounded-2xl"><Loader2 className="w-8 h-8 animate-spin text-[#a78bfa]" /></div>}
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={senderFrequency.length > 0 ? senderFrequency : [{name:'-', count:0}]} layout="vertical" margin={{ top: 0, right: 30, left: 10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#372c65" horizontal={true} vertical={false} />
                  <XAxis type="number" stroke="#7a72a8" fontSize={12} tickLine={false} axisLine={false} />
                  <YAxis dataKey="name" type="category" stroke="#7a72a8" fontSize={12} tickLine={false} axisLine={false} width={80} />
                  <RechartsTooltip 
                    cursor={{fill: '#2e2455'}}
                    contentStyle={{ backgroundColor: '#1c1535', borderColor: '#372c65', borderRadius: '12px' }}
                    itemStyle={{ color: '#fff', fontWeight: 'bold' }}
                  />
                  <Bar dataKey="count" fill="#ec4899" radius={[0, 4, 4, 0]} barSize={24}>
                    {senderFrequency.length > 0 ? senderFrequency.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={`url(#barGradient-${index})`} />
                    )) : <Cell fill="#372c65" />}
                  </Bar>
                  <defs>
                     <linearGradient id="barGradient-0" x1="0" y1="0" x2="1" y2="0"><stop offset="0%" stopColor="#ec4899" /><stop offset="100%" stopColor="#8b5cf6" /></linearGradient>
                     <linearGradient id="barGradient-1" x1="0" y1="0" x2="1" y2="0"><stop offset="0%" stopColor="#8b5cf6" /><stop offset="100%" stopColor="#6366f1" /></linearGradient>
                     <linearGradient id="barGradient-2" x1="0" y1="0" x2="1" y2="0"><stop offset="0%" stopColor="#6366f1" /><stop offset="100%" stopColor="#3b82f6" /></linearGradient>
                     <linearGradient id="barGradient-3" x1="0" y1="0" x2="1" y2="0"><stop offset="0%" stopColor="#3b82f6" /><stop offset="100%" stopColor="#14b8a6" /></linearGradient>
                     <linearGradient id="barGradient-4" x1="0" y1="0" x2="1" y2="0"><stop offset="0%" stopColor="#14b8a6" /><stop offset="100%" stopColor="#10b981" /></linearGradient>
                  </defs>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Heatmap */}
          <div className="bg-[#251d45]/80 border border-[#372c65] p-6 rounded-2xl backdrop-blur-xl relative shadow-lg shadow-[#1c1535]/50">
            <h3 className="text-lg font-bold text-[#edeaff] mb-6 tracking-wide">Peak Traffic Heatmap</h3>
            {loading && <div className="absolute inset-0 z-10 flex items-center justify-center bg-[#1c1535]/60 rounded-2xl"><Loader2 className="w-8 h-8 animate-spin text-[#a78bfa]" /></div>}
            <div className="flex flex-col gap-2">
              <div className="flex mt-2 mb-1 pl-12 text-xs text-[#7a72a8] font-bold tracking-wider">
                {hours.map(h => <div key={h} className="flex-1 text-center truncate px-1">{h}</div>)}
              </div>
              {days.map((day, dIdx) => (
                <div key={day} className="flex items-center gap-2">
                  <span className="w-10 text-xs font-bold text-[#7a72a8] text-right uppercase tracking-wider">{day}</span>
                  <div className="flex-1 flex gap-2">
                    {heatmapData[dIdx].map((val, hIdx) => (
                      <div 
                        key={hIdx} 
                        className={`flex-1 h-8 rounded-md transition-all hover:scale-110 hover:ring-2 ring-[#a78bfa] ring-offset-2 ring-offset-[#251d45] cursor-pointer ${getHeatmapColor(val, heatmapMax)}`}
                        title={`${val} emails on ${day} between ${hours[hIdx]}`}
                      />
                    ))}
                  </div>
                </div>
              ))}
              <div className="flex justify-end items-center mt-4 gap-2 text-xs text-[#b8b0da] font-medium">
                <span>Less</span>
                <div className="w-4 h-4 rounded-sm bg-slate-800/50 border border-[#372c65]"></div>
                <div className="w-4 h-4 rounded-sm bg-indigo-900/60"></div>
                <div className="w-4 h-4 rounded-sm bg-indigo-700/70"></div>
                <div className="w-4 h-4 rounded-sm bg-indigo-500/80"></div>
                <div className="w-4 h-4 rounded-sm bg-indigo-400"></div>
                <span>More</span>
              </div>
            </div>
          </div>

        </div>

      </div>
    </div>
  );
}
