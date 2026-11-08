// @ts-nocheck
'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { 
  Moon, Sun, ShieldAlert, Loader2, Crown, MessageSquare, 
  ThumbsUp, Send, Home, User, Truck, CheckCircle, LogOut, ChevronRight, Calendar 
} from 'lucide-react';
import Script from 'next/script';

declare global {
  interface Window { PaystackPop: any; }
}

export default function App() {
  const [dark, setDark] = useState(false);
  const [activeTab, setActiveTab] = useState('order'); 
  
  const [user, setUser] = useState<any>(null);
  const [checkingAuth, setCheckingAuth] = useState(true);

  // Setup State
  const [setupName, setSetupName] = useState('');
  const [setupPhone, setSetupPhone] = useState('');
  const [setupRole, setSetupRole] = useState('student');
  const [setupLoading, setSetupLoading] = useState(false);

  // Data State
  const [hostels, setHostels] = useState<any[]>([]);
  const [drivers, setDrivers] = useState<any[]>([]);
  const [myOrders, setMyOrders] = useState<any[]>([]);
  const [suggestions, setSuggestions] = useState<any[]>([]);
  
  // Order State
  const [selectedHostel, setSelectedHostel] = useState('');
  const [selectedDriver, setSelectedDriver] = useState('');
  const [showCustomHostel, setShowCustomHostel] = useState(false);
  const [customHostel, setCustomHostel] = useState('');
  const [drums, setDrums] = useState(1);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  
  // Auto-Subscription State
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [subDays, setSubDays] = useState('5');

  // Community State
  const [newSuggestion, setNewSuggestion] = useState('');
  const [posting, setPosting] = useState(false);

  const PRICE_PER_DRUM = 3.0;
  const PAYSTACK_PUBLIC_KEY = process.env.NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY!;

  // 1. Load User & Set Initial Tab
  useEffect(() => {
    const savedUser = localStorage.getItem('waternow_user');
    if (savedUser) {
      const parsed = JSON.parse(savedUser);
      setUser(parsed);
      setActiveTab(parsed.role === 'driver' ? 'space' : 'order');
    }
    setCheckingAuth(false);
  }, []);

  // 2. Fetch Data when user loads
  useEffect(() => {
    if (user) {
      fetchHostels();
      fetchDrivers();
      fetchSuggestions();
      fetchMyOrders(user);
      
      // Driver Alert Polling (Checks for new orders every 15 seconds)
      let interval: NodeJS.Timeout;
      if (user.role === 'driver') {
        interval = setInterval(() => {
          checkForNewOrders(user);
        }, 15000);
      }
      return () => clearInterval(interval);
    }
  }, [user]);

  async function handleSetup(e: React.FormEvent) {
    e.preventDefault();
    setSetupLoading(true);
    try {
      const { data: existing } = await supabase.from('profiles').select('*').eq('phone', setupPhone).single();
      
      let userData;
      if (existing) {
        userData = { id: existing.id, name: existing.full_name, role: existing.role, phone: existing.phone };
      } else {
        const { data: newProfile, error } = await supabase.from('profiles').insert({
          full_name: setupName,
          phone: setupPhone,
          role: setupRole,
        }).select().single();
        
        if (error) throw new Error('Could not save to database: ' + error.message);
        userData = { id: newProfile.id, name: newProfile.full_name, role: newProfile.role, phone: newProfile.phone };
      }

      localStorage.setItem('waternow_user', JSON.stringify(userData));
      setUser(userData);
      setActiveTab(userData.role === 'driver' ? 'space' : 'order');
    } catch (err: any) {
      alert(err.message);
    } finally {
      setSetupLoading(false);
    }
  }

  function handleLogout() {
    localStorage.removeItem('waternow_user');
    setUser(null);
  }

  async function fetchHostels() {
    const { data } = await supabase.from('hostels').select('id, name').order('name');
    if (data) setHostels(data);
  }

  async function fetchDrivers() {
    const { data } = await supabase.from('profiles').select('id, full_name').eq('role', 'driver');
    if (data) setDrivers(data);
  }

  async function fetchSuggestions() {
    const { data } = await supabase.from('suggestions').select('*').order('votes', { ascending: false });
    if (data) setSuggestions(data);
  }

  async function fetchMyOrders(currentUser: any) {
    let query = supabase.from('orders').select('*, hostels(name), profiles!orders_driver_id_fkey(full_name)').order('created_at', { ascending: false });
    
    if (currentUser.role === 'student') {
      query = query.eq('phone', currentUser.phone);
    } else {
      query = query.eq('driver_id', currentUser.id).in('status', ['paid', 'delivering']);
    }

    const { data } = await query;
    if (data) setMyOrders(data);
  }

  // Driver Alert System (Simple Polling)
  async function checkForNewOrders(currentUser: any) {
    const { data } = await supabase
      .from('orders')
      .select('id')
      .eq('driver_id', currentUser.id)
      .eq('status', 'paid');
      
    if (data && data.length > myOrders.length) {
      // Play a sound and show an alert
      alert("🚨 NEW ORDER RECEIVED! 🚨\nCheck your dashboard to see the details.");
      fetchMyOrders(currentUser);
    }
  }

  async function handleOrder() {
    setMessage('');
    if (!selectedHostel && !customHostel.trim()) return setMessage('Select or enter your hostel.');
    if (!selectedDriver) return setMessage('Please select a driver.');

    setLoading(true);
    try {
      let hostelId = selectedHostel;
      if (showCustomHostel && customHostel.trim()) {
        const { data: newHostel, error: hostelErr } = await supabase
          .from('hostels').insert({ name: customHostel.trim(), status: 'pending' }).select('id').single();
        if (hostelErr) throw new Error('Database failed to save hostel.');
        hostelId = newHostel.id;
      }

      const total = drums * PRICE_PER_DRUM;
      const { error: orderError } = await supabase.from('orders').insert({
        hostel_id: hostelId, driver_id: selectedDriver, drums, phone: user?.phone, total_price: total, status: 'pending_payment',
      });
      if (orderError) throw new Error('Database failed to save order.');

      if (typeof window !== 'undefined' && window.PaystackPop) {
        const handler = window.PaystackPop.setup({
          key: PAYSTACK_PUBLIC_KEY,
          email: 'guest@waternow.com',
          amount: total * 100, 
          currency: 'GHS',
          phone: user?.phone,
          callback: function (response: any) {
            setMessage(`✅ Payment Successful! Water is on the way.`);
            setDrums(1); setCustomHostel(''); setSelectedHostel(''); setShowCustomHostel(false); setSelectedDriver(''); setIsSubscribed(false);
            if(user) fetchMyOrders(user);
            setLoading(false);
          },
          onClose: function () {
            setMessage('❌ Payment window closed.'); setLoading(false);
          },
        });
        handler.openIframe();
      }
    } catch (err: any) {
      setMessage('❌ ' + (err.message || 'Something went wrong.'));
      setLoading(false);
    }
  }

  async function confirmDelivery(orderId: string) {
    const { error } = await supabase.from('orders').update({ status: 'delivered' }).eq('id', orderId);
    if (!error) {
      alert('Delivery Confirmed! Funds released to driver.');
      if (user) fetchMyOrders(user);
    }
  }

  async function markAsDeliveredByDriver(orderId: string) {
    const { error } = await supabase.from('orders').update({ status: 'delivering' }).eq('id', orderId);
    if (!error) {
      alert('Marked as delivered! Waiting for student to confirm.');
      if (user) fetchMyOrders(user);
    }
  }

  async function submitSuggestion() {
    if (!newSuggestion.trim()) return;
    setPosting(true);
    await supabase.from('suggestions').insert({ title: newSuggestion, votes: 1 });
    setNewSuggestion('');
    fetchSuggestions();
    setPosting(false);
  }

  async function upvote(id: string, currentVotes: number) {
    await supabase.from('suggestions').update({ votes: Number(currentVotes) + 1 }).eq('id', id);
    fetchSuggestions();
  }

  if (checkingAuth) return <div className="min-h-screen bg-[#0A1931]"></div>;

  // 1. QUICK SETUP SCREEN
  if (!user) {
    return (
      <div className="min-h-screen bg-[#0A1931] flex flex-col items-center justify-center p-5 font-sans">
        <div className="bg-[#13294B] p-8 rounded-2xl border border-slate-700 w-full max-w-md shadow-[0_0_40px_rgba(30,144,255,0.15)]">
          <div className="flex flex-col items-center mb-8">
            <div className="bg-[#0A1931] p-4 rounded-full border border-[#FFD700] shadow-[0_0_15px_rgba(255,215,0,0.3)] mb-4">
              <Crown size={40} className="text-[#FFD700]" />
            </div>
            <h1 className="text-2xl font-black text-white tracking-widest uppercase">Amanah Tech</h1>
            <p className="text-[10px] text-[#FFD700] tracking-widest uppercase mt-1">Fast. Simple. Trusted.</p>
          </div>

          <form onSubmit={handleSetup} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-400 mb-1 uppercase tracking-wider">Your Full Name</label>
              <input type="text" required value={setupName} onChange={e => setSetupName(e.target.value)} className="w-full p-4 rounded-xl bg-[#0A1931] border border-slate-700 text-white outline-none focus:border-[#1E90FF] transition-colors" placeholder="e.g. Othaimeen Umar" />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-400 mb-1 uppercase tracking-wider">Phone Number</label>
              <input type="tel" required value={setupPhone} onChange={e => setSetupPhone(e.target.value)} className="w-full p-4 rounded-xl bg-[#0A1931] border border-slate-700 text-white outline-none focus:border-[#1E90FF] transition-colors" placeholder="024XXXXXXX" />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-400 mb-1 uppercase tracking-wider">I am a...</label>
              <select value={setupRole} onChange={e => setSetupRole(e.target.value)} className="w-full p-4 rounded-xl bg-[#0A1931] border border-slate-700 text-white outline-none focus:border-[#1E90FF] transition-colors">
                <option value="student">Student (I want to buy water)</option>
                <option value="driver">Driver (I want to deliver water)</option>
              </select>
            </div>
            <button disabled={setupLoading} type="submit" className="w-full py-4 mt-4 rounded-xl bg-[#1E90FF] hover:bg-[#1a7fd6] text-white font-bold text-lg shadow-[0_0_20px_rgba(30,144,255,0.4)] flex justify-center items-center transition-all active:scale-95">
              {setupLoading ? <Loader2 className="animate-spin" /> : 'Continue to App'}
            </button>
          </form>
        </div>
      </div>
    );
  }

  // 2. MAIN APP
  return (
    <main className={dark ? 'dark' : ''}>
      <Script src="https://js.paystack.co/v1/inline.js" strategy="beforeInteractive" />
      
      <div className="min-h-screen bg-slate-50 dark:bg-[#0A1931] text-slate-900 dark:text-white transition-colors pb-24 relative font-sans">
        
        {/* Header */}
        <div className="bg-[#0A1931] text-white shadow-md sticky top-0 z-40 px-5 py-4 border-b border-[#FFD700]/30">
          <div className="max-w-md mx-auto flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="bg-[#13294B] p-2 rounded-full border border-[#FFD700]">
                <Crown size={20} className="text-[#FFD700]" />
              </div>
              <div>
                <h1 className="text-lg font-black text-[#FFD700] tracking-widest uppercase">Amanah Tech</h1>
                <p className="text-[10px] text-slate-300">Hi, {user.name} 👑</p>
              </div>
            </div>
            <div className="flex gap-2">
              <button onClick={() => setDark(!dark)} className="p-2 rounded-full bg-[#13294B] border border-slate-600 hover:border-[#1E90FF] transition-colors">
                {dark ? <Sun size={18} className="text-[#FFD700]" /> : <Moon size={18} className="text-[#FFD700]" />}
              </button>
              <button onClick={handleLogout} className="p-2 rounded-full bg-[#13294B] border border-red-500/30 text-red-400 hover:bg-red-500/10 transition-colors">
                <LogOut size={18} />
              </button>
            </div>
          </div>
        </div>

        <div className="max-w-md mx-auto px-5 py-6">
          
          {/* TAB 1: ORDER (STUDENT ONLY) */}
          {activeTab === 'order' && user.role === 'student' && (
            <div className="bg-white dark:bg-[#13294B] p-6 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-700/50">
              <div className="flex gap-3 p-4 mb-6 rounded-xl bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-800/50">
                <ShieldAlert className="text-amber-600 shrink-0 mt-0.5" size={18} />
                <p className="text-xs text-amber-800 dark:text-amber-200/90 leading-relaxed font-medium">
                  <strong className="font-bold">Escrow Protection:</strong> Money is held securely. Driver gets paid only after you click &quot;Confirm Delivery&quot;.
                </p>
              </div>

              <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-2 uppercase tracking-wider">Deliver To</label>
              <div className="relative mb-3">
                <select value={selectedHostel} onChange={(e) => { setSelectedHostel(e.target.value); setShowCustomHostel(false); }} disabled={showCustomHostel} className="w-full p-4 appearance-none rounded-xl bg-slate-50 dark:bg-[#0A1931] border border-slate-200 dark:border-slate-700 font-medium outline-none focus:border-[#1E90FF]">
                  <option value="">Select hostel...</option>
                  {hostels.map((h) => <option key={h.id} value={h.id}>{h.name}</option>)}
                </select>
                <ChevronRight size={18} className="absolute right-4 top-4 text-slate-400 rotate-90 pointer-events-none" />
              </div>
              
              <button onClick={() => { setShowCustomHostel(!showCustomHostel); setSelectedHostel(''); }} className="text-xs text-[#1E90FF] font-bold mb-5 hover:underline">
                {showCustomHostel ? '← Back to list' : '+ My hostel is not listed'}
              </button>
              
              {showCustomHostel && (
                <input type="text" placeholder="Enter your hostel name..." value={customHostel} onChange={(e) => setCustomHostel(e.target.value)} className="w-full p-4 rounded-xl bg-slate-50 dark:bg-[#0A1931] border border-slate-200 dark:border-slate-700 mb-5 outline-none focus:border-[#1E90FF]" />
              )}

              <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-2 uppercase tracking-wider">Choose Your Driver</label>
              <div className="relative mb-5">
                <select value={selectedDriver} onChange={(e) => setSelectedDriver(e.target.value)} className="w-full p-4 appearance-none rounded-xl bg-slate-50 dark:bg-[#0A1931] border border-slate-200 dark:border-slate-700 font-medium outline-none focus:border-[#1E90FF]">
                  <option value="">Select driver...</option>
                  {drivers.map((d) => <option key={d.id} value={d.id}>{d.full_name}</option>)}
                </select>
                <ChevronRight size={18} className="absolute right-4 top-4 text-slate-400 rotate-90 pointer-events-none" />
              </div>

              <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-2 uppercase tracking-wider">Quantity (Drums)</label>
              <div className="flex items-center gap-4 mb-5">
                <input type="range" min={1} max={10} value={drums} onChange={(e) => setDrums(Number(e.target.value))} className="w-full accent-[#1E90FF] h-2 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer" />
                <span className="bg-[#1E90FF] text-white font-bold px-3 py-1.5 rounded-lg shadow-md">{drums}</span>
              </div>

              {/* Auto-Delivery Section */}
              <div className="mb-6 bg-blue-50 dark:bg-[#0A1931] p-4 rounded-xl border border-blue-100 dark:border-slate-700">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold text-blue-900 dark:text-blue-200 flex items-center gap-2">
                    <Calendar size={16} /> Auto-Delivery Subscription
                  </span>
                  <input 
                    type="checkbox" 
                    checked={isSubscribed} 
                    onChange={(e) => setIsSubscribed(e.target.checked)}
                    className="w-5 h-5 accent-[#1E90FF] cursor-pointer" 
                  />
                </div>
                {isSubscribed && (
                  <select 
                    value={subDays} 
                    onChange={(e) => setSubDays(e.target.value)}
                    className="w-full p-3 rounded-lg text-sm bg-white dark:bg-[#13294B] border border-blue-200 dark:border-slate-700 mt-2 outline-none"
                  >
                    <option value="1">Deliver Every 1 Day (Everyday)</option>
                    <option value="2">Deliver Every 2 Days</option>
                    <option value="3">Deliver Every 3 Days</option>
                    <option value="4">Deliver Every 4 Days</option>
                    <option value="5">Deliver Every 5 Days</option>
                    <option value="6">Deliver Every 6 Days</option>
                    <option value="7">Deliver Every 7 Days (Weekly)</option>
                  </select>
                )}
              </div>

              <div className="flex items-center justify-between mb-6 border-t border-slate-200 dark:border-slate-700 pt-5">
                <span className="text-sm font-medium text-slate-500">Total to pay</span>
                <span className="text-3xl font-black text-[#1E90FF]">GHS {(drums * PRICE_PER_DRUM).toFixed(2)}</span>
              </div>

              <button onClick={handleOrder} disabled={loading} className="w-full py-4 rounded-xl bg-[#1E90FF] hover:bg-[#1a7fd6] text-white font-bold text-lg shadow-[0_0_20px_rgba(30,144,255,0.3)] flex items-center justify-center gap-2 transition-all active:scale-95">
                {loading ? <Loader2 className="animate-spin" size={20} /> : 'Pay & Order Now'}
              </button>
              {message && <p className="mt-4 text-center text-sm font-bold p-3 bg-slate-100 dark:bg-[#0A1931] rounded-lg text-slate-700 dark:text-slate-300">{message}</p>}
            </div>
          )}

          {/* TAB 2: MY SPACE */}
          {activeTab === 'space' && (
            <div className="space-y-6">
              <div className="bg-white dark:bg-[#13294B] p-6 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-700/50">
                <h2 className="text-xl font-bold mb-5 flex items-center gap-2">
                  {user.role === 'driver' ? <Truck className="text-[#1E90FF]" size={22} /> : <User className="text-[#1E90FF]" size={22} />} 
                  {user.role === 'student' ? 'My Orders' : 'My Deliveries'}
                </h2>
                
                {myOrders.length === 0 ? (
                  <div className="text-center py-10">
                    <ShieldAlert size={48} className="mx-auto text-slate-300 dark:text-slate-600 mb-3" />
                    <p className="text-slate-500 font-medium">No {user.role === 'student' ? 'orders' : 'deliveries'} yet.</p>
                  </div>
                ) : (
                  <div classN