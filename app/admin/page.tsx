'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Users, Truck, Activity, TrendingUp, MessageSquare, Phone, MessageCircle, CheckCircle, Loader2, ArrowUpRight, Crown } from 'lucide-react';

export default function StockMarketAdmin() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [password, setPassword] = useState('');

  const [orders, setOrders] = useState<any[]>([]);
  const [pendingHostels, setPendingHostels] = useState<any[]>([]);
  const [problems, setProblems] = useState<any[]>([]);
  const [sellers, setSellers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  // FIX: Initialized as empty string to avoid Next.js hydration error
  const [tickerTime, setTickerTime] = useState('');

  useEffect(() => {
    // FIX: Set the time only after the component mounts on the client
    setTickerTime(new Date().toLocaleTimeString());

    if (isAuthenticated) {
      fetchData();
      const interval = setInterval(() => setTickerTime(new Date().toLocaleTimeString()), 10000);
      return () => clearInterval(interval);
    }
  }, [isAuthenticated]);

  async function fetchData() {
    setLoading(true);
    const { data: ordersData } = await supabase.from('orders').select('*, hostels(name), sellers(name, phone, has_smartphone)').order('created_at', { ascending: false });
    if (ordersData) setOrders(ordersData);

    const { data: hostelsData } = await supabase.from('hostels').select('*').eq('status', 'pending');
    if (hostelsData) setPendingHostels(hostelsData);

    const { data: problemsData } = await supabase.from('community_posts').select('*').order('created_at', { ascending: false });
    if (problemsData) setProblems(problemsData);

    const { data: sellersData } = await supabase.from('sellers').select('*');
    if (sellersData) setSellers(sellersData);
    
    setLoading(false);
  }

  async function approveHostel(id: string) {
    await supabase.from('hostels').update({ status: 'approved' }).eq('id', id);
    setPendingHostels(pendingHostels.filter(h => h.id !== id));
  }

  async function solveProblem(id: string) {
    await supabase.from('community_posts').update({ status: 'solved' }).eq('id', id);
    fetchData();
  }

  const totalDrums = orders.reduce((sum, order) => sum + order.drums, 0);
  const totalProfit = totalDrums * 0.50; 
  const escrowHeld = orders.filter(o => o.status === 'pending_payment' || o.status === 'paid').reduce((sum, order) => sum + order.total_price, 0);
  const onlineDrivers = sellers.length; 

  // 🔐 LOGIN SCREEN
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-[#0A0D14] flex items-center justify-center p-5">
        <div className="bg-[#121824] p-8 rounded-2xl border border-slate-800 max-w-sm w-full shadow-2xl">
          <div className="flex justify-center mb-4">
            <Crown size={48} className="text-[#FFD700]" />
          </div>
          <h1 className="text-2xl font-black text-white mb-6 text-center tracking-widest">AMANAH TECH</h1>
          <input 
            type="password" 
            placeholder="Enter Founder Password" 
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full p-3 rounded-xl bg-[#0A0D14] border border-slate-700 text-white mb-4 text-center tracking-widest"
          />
          <button 
            onClick={() => {
              if (password === 'OHU2026') { 
                setIsAuthenticated(true);
              } else {
                alert('Incorrect Password');
              }
            }}
            className="w-full py-3 bg-[#1E90FF] text-white font-bold rounded-xl hover:bg-blue-600 transition-colors"
          >
            Access Command Center
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0A0D14] text-slate-300 font-sans pb-20">
      
      {/* 🔴 TOP LIVE TICKER */}
      <div className="bg-[#121824] border-b border-slate-800 p-2 overflow-hidden flex items-center shadow-lg sticky top-0 z-50">
        <div className="flex items-center gap-2 bg-red-500/10 text-red-500 px-3 py-1 rounded-md text-xs font-bold shrink-0 mr-4">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
          </span>
          LIVE NOW
        </div>
        <div className="flex-1 overflow-hidden whitespace-nowrap">
          <div className="animate-pulse text-sm font-mono text-slate-400">
            {tickerTime} | {onlineDrivers} Drivers Online | {orders.length} Total Orders | Escrow: GHS {escrowHeld.toFixed(2)} | Profit: GHS {totalProfit.toFixed(2)} | System Status: OPTIMAL 🟢
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-5 pt-8">
        <div className="flex justify-between items-end mb-8">
          <div>
            <h1 className="text-3xl font-black text-white tracking-tight flex items-center gap-3">
              <Crown size={32} className="text-[#FFD700]" /> Amanah Tech Terminal
            </h1>
            <p className="text-slate-500 font-mono text-sm mt-1">WaterNow Tamale | Founder Dashboard</p>
          </div>
          <button onClick={fetchData} className="text-xs font-bold text-[#1E90FF] hover:text-white transition-colors flex items-center gap-1 bg-[#1E90FF]/10 px-3 py-1.5 rounded-lg">
            <Activity size={14} /> Refresh Data
          </button>
        </div>

        {loading ? (
          <div className="flex justify-center py-32"><Loader2 className="animate-spin text-[#1E90FF]" size={48} /></div>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
              <div className="bg-[#121824] border border-slate-800 p-5 rounded-2xl relative overflow-hidden">
                <div className="flex justify-between items-start mb-2">
                  <div className="p-2 bg-blue-500/10 rounded-lg"><Users className="text-blue-500" size={20} /></div>
                  <span className="flex items-center text-xs font-bold text-green-400 bg-green-400/10 px-2 py-1 rounded-md"><ArrowUpRight size={14} className="mr-1"/> +18 today</span>
                </div>
                <p className="text-sm text-slate-400 font-medium">People Joined</p>
                <h2 className="text-3xl font-black text-white mt-1">212</h2>
              </div>

              <div className="bg-[#121824] border border-slate-800 p-5 rounded-2xl">
                <div className="flex justify-between items-start mb-2">
                  <div className="p-2 bg-purple-500/10 rounded-lg"><Activity className="text-purple-500" size={20} /></div>
                  <span className="flex items-center text-xs font-bold text-slate-400">● LIVE</span>
                </div>
                <p className="text-sm text-slate-400 font-medium">People Online Now</p>
                <h2 className="text-3xl font-black text-white mt-1">14</h2>
              </div>

              <div className="bg-[#121824] border border-slate-800 p-5 rounded-2xl">
                <div className="flex justify-between items-start mb-2">
                  <div className="p-2 bg-orange-500/10 rounded-lg"><Truck className="text-orange-500" size={20} /></div>
                  <span className="flex items-center text-xs font-bold text-green-400 bg-green-400/10 px-2 py-1 rounded-md"><ArrowUpRight size={14} className="mr-1"/> +2</span>
                </div>
                <p className="text-sm text-slate-400 font-medium">Active Drivers</p>
                <h2 className="text-3xl font-black text-white mt-1">{onlineDrivers}<span className="text-lg text-slate-500">/10</span></h2>
              </div>

              <div className="bg-[#121824] border border-slate-800 p-5 rounded-2xl relative overflow-hidden">
                <div className="flex justify-between items-start mb-2">
                  <div className="p-2 bg-green-500/10 rounded-lg"><TrendingUp className="text-green-500" size={20} /></div>
                  <span className="flex items-center text-xs font-bold text-green-400 bg-green-400/10 px-2 py-1 rounded-md"><ArrowUpRight size={14} className="mr-1"/> +12.5%</span>
                </div>
                <p className="text-sm text-slate-400 font-medium">Orders Today</p>
                <h2 className="text-3xl font-black text-white mt-1">{orders.length}</h2>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
               <div className="bg-[#121824] border border-slate-800 p-6 rounded-2xl flex items-center justify-between">
                  <div>
                    <p className="text-sm text-slate-400 font-medium mb-1">Escrow Held (Safe)</p>
                    <h2 className="text-4xl font-black text-white">GHS {escrowHeld.toFixed(2)}</h2>
                  </div>
                  <div className="text-right">
                    <span className="inline-flex items-center text-sm font-bold text-green-400 bg-green-400/10 px-3 py-1 rounded-lg"><ArrowUpRight size={16} className="mr-1"/> +8.4%</span>
                  </div>
               </div>

               <div className="bg-[#121824] border border-slate-800 p-6 rounded-2xl flex items-center justify-between">
                  <div>
                    <p className="text-sm text-slate-400 font-medium mb-1">Total Platform Profit</p>
                    <h2 className="text-4xl font-black text-[#FFD700]">GHS {totalProfit.toFixed(2)}</h2>
                  </div>
                  <div className="text-right">
                    <span className="inline-flex items-center text-sm font-bold text-green-400 bg-green-400/10 px-3 py-1 rounded-lg"><ArrowUpRight size={16} className="mr-1"/> +12.5%</span>
                  </div>
               </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="md:col-span-1 bg-[#121824] border border-slate-800 rounded-2xl overflow-hidden">
                <div className="p-4 border-b border-slate-800 bg-[#161D2B] flex items-center gap-2">
                  <Truck size={18} className="text-orange-500" />
                  <h2 className="font-bold text-white text-sm">Driver Dispatch</h2>
                </div>
                <div className="p-4 space-y-4">
                  {sellers.map((driver, i) => (
                    <div key={i} className="flex justify-between items-center pb-3 border-b border-slate-800/50 last:border-0">
                      <div>
                        <p className="font-bold text-white text-sm flex items-center gap-2">
                          {driver.name} <span className="w-2 h-2 rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)]"></span>
                        </p>
                        <p className="text-xs text-slate-500 font-mono mt-1">{driver.phone}</p>
                      </div>
                      <div className="flex gap-2">
                        <a href={`sms:${driver.phone}`} className="p-2 bg-slate-800 hover:bg-slate-700 rounded-lg text-blue-400" title="SMS Driver"><MessageCircle size={14} /></a>
                        <a href={`tel:${driver.phone}`} className="p-2 bg-slate-800 hover:bg-slate-700 rounded-lg text-green-400" title="Call Driver"><Phone size={14} /></a>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="md:col-span-2 bg-[#121824] border border-slate-800 rounded-2xl overflow-hidden">
                <div className="p-4 border-b border-slate-800 bg-[#161D2B] flex justify-between items-center">
                  <h2 className="font-bold text-white text-sm flex items-center gap-2"><Activity size={18} className="text-[#1E90FF]"/> Live Order Feed</h2>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm text-slate-300">
                    <thead className="bg-[#0A0D14] text-xs uppercase text-slate-500">
                      <tr>
                        <th className="p-4 font-semibold">Hostel</th>
                        <th className="p-4 font-semibold">Drums</th>
                        <th className="p-4 font-semibold">Total</th>
                        <th className="p-4 font-semibold">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/50">
                      {orders.slice(0, 8).map((order) => (
                        <tr key={order.id} className="hover:bg-slate-800/20">
                          <td className="p-4 font-bold text-white">{order.hostels?.name || 'Unknown'}</td>
                          <td className="p-4">{order.drums}</td>
                          <td className="p-4 font-mono text-[#1E90FF]">GHS {order.total_price.toFixed(2)}</td>
                          <td className="p-4">
                            <span className={`px-2 py-1 rounded-md text-[10px] font-bold tracking-wide ${
                              order.status === 'delivered' ? 'bg-green-500/10 text-green-500' :
                              order.status === 'paid' ? 'bg-blue-500/10 text-blue-500' : 'bg-amber-500/10 text-amber-500'
                            }`}>
                              {order.status.replace('_', ' ').toUpperCase()}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="md:col-span-1 bg-[#121824] border border-slate-800 rounded-2xl overflow-hidden">
                <div className="p-4 border-b border-slate-800 bg-[#161D2B]">
                  <h2 className="font-bold text-white text-sm">Pending Hostels</h2>
                </div>
                <div className="p-4 space-y-2">
                   {pendingHostels.length === 0 ? <p className="text-xs text-slate-500 text-center py-4">No pending hostels.</p> : 
                     pendingHostels.map(h => (
                       <div key={h.id} className="flex justify-between items-center bg-[#0A0D14] p-3 rounded-lg border border-slate-800">
                         <span className="text-sm font-bold text-white">{h.name}</span>
                         <button onClick={() => approveHostel(h.id)} className="p-1.5 bg-green-500/10 text-green-500 rounded hover:bg-green-500/20"><CheckCircle size={16}/></button>
                       </div>
                     ))
                   }
                </div>
              </div>

              <div className="md:col-span-2 bg-[#121824] border border-slate-800 rounded-2xl overflow-hidden">
                <div className="p-4 border-b border-slate-800 bg-[#161D2B]">
                  <h2 className="font-bold text-white text-sm flex items-center gap-2"><MessageSquare size={18} className="text-purple-500"/> Community Requests</h2>
                </div>
                <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-3 max-h-64 overflow-y-auto">
                  {problems.length === 0 ? <p className="text-xs text-slate-500 text-center col-span-2 py-4">No requests yet.</p> : 
                    problems.map(prob => (
                      <div key={prob.id} className="bg-[#0A0D14] p-3 rounded-lg border border-slate-800">
                        <div className="flex justify-between items-start mb-2">
                          <span className="text-[10px] font-bold bg-slate-800 text-slate-300 px-2 py-0.5 rounded">{prob.category}</span>
                          {prob.status === 'solved' ? <span className="text-[10px] text-green-500 font-bold">SOLVED</span> : 
                            <button onClick={() => solveProblem(prob.id)} className="text-[10px] bg-purple-500/10 text-purple-400 px-2 py-0.5 rounded hover:bg-purple-500/20">Solve</button>
                          }
                        </div>
                        <p className="text-xs text-slate-300">{prob.problem_text}</p>
                      </div>
                    ))
                  }
                </div>
              </div>

            </div>
          </>
        )}
      </div>
    </div>
  );
}