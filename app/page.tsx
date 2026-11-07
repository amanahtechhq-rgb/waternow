'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Moon, Sun, ShieldAlert, Loader2, Crown, MessageSquare, ThumbsUp, Send, Calendar, Home, User, Truck, CheckCircle, LogOut } from 'lucide-react';
import Script from 'next/script';

declare global {
  interface Window { PaystackPop: any; }
}

type Hostel = { id: string; name: string };
type Driver = { id: string; full_name: string };
type Suggestion = { id: string; title: string; votes: number };

export default function App() {
  const [dark, setDark] = useState(false);
  const [activeTab, setActiveTab] = useState('order'); // 'order', 'space', 'community'
  
  // User State
  const [user, setUser] = useState<{ id: string, name: string, role: string, phone: string } | null>(null);
  const [checkingAuth, setCheckingAuth] = useState(true);

  // Setup State
  const [setupName, setSetupName] = useState('');
  const [setupPhone, setSetupPhone] = useState('');
  const [setupRole, setSetupRole] = useState('student');
  const [setupLoading, setSetupLoading] = useState(false);

  // App Data State
  const [hostels, setHostels] = useState<Hostel[]>([]);
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [myOrders, setMyOrders] = useState<any[]>([]);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  
  // Order Form State
  const [selectedHostel, setSelectedHostel] = useState('');
  const [selectedDriver, setSelectedDriver] = useState('');
  const [showCustomHostel, setShowCustomHostel] = useState(false);
  const [customHostel, setCustomHostel] = useState('');
  const [drums, setDrums] = useState(1);
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  
  // Community State
  const [newSuggestion, setNewSuggestion] = useState('');
  const [posting, setPosting] = useState(false);

  const PRICE_PER_DRUM = 3.0;
  const PAYSTACK_PUBLIC_KEY = process.env.NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY!;

  useEffect(() => {
    // Check if user is saved in local storage
    const savedUser = localStorage.getItem('waternow_user');
    if (savedUser) {
      setUser(JSON.parse(savedUser));
    }
    setCheckingAuth(false);
  }, []);

  useEffect(() => {
    if (user) {
      fetchHostels();
      fetchDrivers();
      fetchSuggestions();
      fetchMyOrders(user);
    }
  }, [user]);

  // --- QUICK SETUP (LOGIN) ---
  async function handleSetup(e: React.FormEvent) {
    e.preventDefault();
    setSetupLoading(true);
    try {
      // 1. Check if phone exists
      const { data: existing } = await supabase.from('profiles').select('*').eq('phone', setupPhone).single();
      
      let userData;
      if (existing) {
        userData = { id: existing.id, name: existing.full_name, role: existing.role, phone: existing.phone };
      } else {
        // Create new profile
        const { data: newProfile, error } = await supabase.from('profiles').insert({
          full_name: setupName,
          phone: setupPhone,
          role: setupRole,
        }).select().single();
        
        if (error) throw new Error("Could not save to database: " + error.message);
        userData = { id: newProfile.id, name: newProfile.full_name, role: newProfile.role, phone: newProfile.phone };
      }

      // Save to localStorage so they don't have to do this again
      localStorage.setItem('waternow_user', JSON.stringify(userData));
      setUser(userData);
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

  // --- DATA FETCHING ---
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
    
    // If student, fetch their orders. If driver, fetch assigned orders.
    if (currentUser.role === 'student') {
      query = query.eq('phone', currentUser.phone);
    } else {
      query = query.eq('driver_id', currentUser.id);
    }

    const { data } = await query;
    if (data) setMyOrders(data);
  }

  // --- ORDERING ---
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
        if (hostelErr) throw new Error("Database failed to save hostel.");
        hostelId = newHostel.id;
      }

      const total = drums * PRICE_PER_DRUM;
      const { error: orderError } = await supabase.from('orders').insert({
        hostel_id: hostelId, driver_id: selectedDriver, drums, phone: user?.phone, total_price: total, status: 'pending_payment',
      });
      if (orderError) throw new Error("Database failed to save order.");

      if (typeof window !== 'undefined' && window.PaystackPop) {
        const handler = window.PaystackPop.setup({
          key: PAYSTACK_PUBLIC_KEY,
          email: 'guest@waternow.com',
          amount: total * 100, 
          currency: 'GHS',
          phone: user?.phone,
          callback: function (response: any) {
            setMessage(`✅ Payment Successful! Water is on the way.`);
            setDrums(1); setCustomHostel(''); setSelectedHostel(''); setShowCustomHostel(false); setSelectedDriver('');
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

  // --- ACTIONS ---
  async function confirmDelivery(orderId: string) {
    const { error } = await supabase.from('orders').update({ status: 'delivered' }).eq('id', orderId);
    if (!error) {
      alert("Delivery Confirmed! Funds released to driver.");
      if (user) fetchMyOrders(user);
    }
  }

  async function markAsDeliveredByDriver(orderId: string) {
    const { error } = await supabase.from('orders').update({ status: 'delivering' }).eq('id', orderId);
    if (!error) {
      alert("Marked as delivered! Waiting for student to confirm.");
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
    await supabase.from('suggestions').update({ votes: currentVotes + 1 }).eq('id', id);
    fetchSuggestions();
  }

  // --- RENDER ---
  if (checkingAuth) return <div className="min-h-screen bg-[#0A1931]"></div>;

  // 1. QUICK SETUP SCREEN
  if (!user) {
    return (
      <div className="min-h-screen bg-[#0A1931] flex flex-col items-center justify-center p-5 font-sans">
        <div className="bg-[#13294B] p-8 rounded-2xl border border-slate-700 w-full max-w-md shadow-2xl">
          <div className="flex flex-col items-center mb-8">
            <div className="bg-[#0A1931] p-3 rounded-full border border-[#FFD700] mb-3">
              <Crown size={32} className="text-[#FFD700]" />
            </div>
            <h1 className="text-2xl font-black text-white tracking-widest uppercase">Amanah Tech</h1>
            <p className="text-[10px] text-[#FFD700] tracking-widest uppercase mt-1">Fast. Simple. Trusted.</p>
          </div>

          <form onSubmit={handleSetup} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-400 mb-1 uppercase">Your Full Name</label>
              <input type="text" required value={setupName} onChange={e => setSetupName(e.target.value)} className="w-full p-3 rounded-xl bg-[#0A1931] border border-slate-700 text-white outline-none" placeholder="e.g. Othaimeen Umar" />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-400 mb-1 uppercase">Phone Number</label>
              <input type="tel" required value={setupPhone} onChange={e => setSetupPhone(e.target.value)} className="w-full p-3 rounded-xl bg-[#0A1931] border border-slate-700 text-white outline-none" placeholder="024XXXXXXX" />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-400 mb-1 uppercase">I am a...</label>
              <select value={setupRole} onChange={e => setSetupRole(e.target.value)} className="w-full p-3 rounded-xl bg-[#0A1931] border border-slate-700 text-white outline-none">
                <option value="student">Student (I want to buy water)</option>
                <option value="driver">Driver (I want to deliver water)</option>
              </select>
            </div>
            <button disabled={setupLoading} type="submit" className="w-full py-4 mt-2 rounded-xl bg-[#1E90FF] hover:bg-[#1a7fd6] text-white font-bold text-lg flex justify-center items-center">
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
      
      <div className="min-h-screen bg-slate-50 dark:bg-[#0A1931] text-slate-900 dark:text-white transition-colors pb-20 relative font-sans">
        
        {/* Header */}
        <div className="bg-[#0A1931] text-white shadow-lg sticky top-0 z-10 px-5 py-4 border-b-2 border-[#FFD700]">
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
              <button onClick={() => setDark(!dark)} className="p-2 rounded-full bg-[#13294B] border border-slate-600">
                {dark ? <Sun size={18} className="text-[#FFD700]" /> : <Moon size={18} className="text-[#FFD700]" />}
              </button>
              <button onClick={handleLogout} className="p-2 rounded-full bg-[#13294B] border border-red-500/50 text-red-400">
                <LogOut size={18} />
              </button>
            </div>
          </div>
        </div>

        {/* MAIN CONTENT AREA */}
        <div className="max-w-md mx-auto px-5 py-6">
          
          {/* TAB 1: ORDER (STUDENT ONLY) */}
          {activeTab === 'order' && user.role === 'student' && (
            <div className="bg-white dark:bg-[#13294B] p-5 rounded-2xl shadow-lg border border-slate-200 dark:border-slate-700">
              <div className="flex gap-3 p-3 mb-5 rounded-xl bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800">
                <ShieldAlert className="text-amber-600 shrink-0 mt-0.5" size={16} />
                <p className="text-xs text-amber-800 dark:text-amber-200 leading-relaxed">
                  <strong>Escrow Protection:</strong> Money is held. Driver gets paid only after you click "Confirm Delivery".
                </p>
              </div>

              <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1 uppercase">Deliver To</label>
              <select value={selectedHostel} onChange={(e) => { setSelectedHostel(e.target.value); setShowCustomHostel(false); }} disabled={showCustomHostel} className="w-full p-3 rounded-xl bg-slate-50 dark:bg-[#0A1931] border border-slate-200 dark:border-slate-700 mb-2 font-medium">
                <option value="">Select hostel...</option>
                {hostels.map((h) => <option key={h.id} value={h.id}>{h.name}</option>)}
              </select>
              <button onClick={() => { setShowCustomHostel(!showCustomHostel); setSelectedHostel(''); }} className="text-xs text-[#1E90FF] font-semibold mb-4 hover:underline">
                {showCustomHostel ? '← Back to list' : "+ My hostel isn't listed"}
              </button>
              {showCustomHostel && (
                <input type="text" placeholder="Enter your hostel name..." value={customHostel} onChange={(e) => setCustomHostel(e.target.value)} className="w-full p-3 rounded-xl bg-slate-50 dark:bg-[#0A1931] border border-slate-200 dark:border-slate-700 mb-4" />
              )}

              <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1 uppercase mt-2">Choose Your Driver</label>
              <select value={selectedDriver} onChange={(e) => setSelectedDriver(e.target.value)} className="w-full p-3 rounded-xl bg-slate-50 dark:bg-[#0A1931] border border-slate-200 dark:border-slate-700 mb-4 font-medium">
                <option value="">Select driver...</option>
                {drivers.map((d) => <option key={d.id} value={d.id}>{d.full_name}</option>)}
              </select>

              <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1 uppercase">Quantity (Drums)</label>
              <div className="flex items-center gap-4 mb-4">
                <input type="range" min={1} max={10} value={drums} onChange={(e) => setDrums(Number(e.target.value))} className="w-full accent-[#1E90FF]" />
                <span className="bg-[#1E90FF] text-white font-bold px-3 py-1 rounded-lg">{drums}</span>
              </div>

              <div className="flex items-center justify-between mb-4 border-t border-slate-200 dark:border-slate-700 pt-4">
                <span className="text-sm font-medium text-slate-500">Total to pay</span>
                <span className="text-2xl font-black text-[#1E90FF]">GHS {(drums * PRICE_PER_DRUM).toFixed(2)}</span>
              </div>

              <button onClick={handleOrder} disabled={loading} className="w-full py-4 rounded-xl bg-[#1E90FF] hover:bg-[#1a7fd6] text-white font-bold text-lg shadow-lg flex items-center justify-center gap-2">
                {loading ? <Loader2 className="animate-spin" size={20} /> : 'Pay & Order Now'}
              </button>
              {message && <p className="mt-4 text-center text-sm font-bold p-2 bg-slate-100 dark:bg-[#0A1931] rounded-lg">{message}</p>}
            </div>
          )}

          {/* TAB 2: MY SPACE (STUDENT & DRIVER) */}
          {activeTab === 'space' && (
            <div className="bg-white dark:bg-[#13294B] p-5 rounded-2xl shadow-lg border border-slate-200 dark:border-slate-700">
              <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
                <User className="text-[#1E90FF]" size={20} /> {user.role === 'student' ? 'My Orders' : 'My Deliveries'}
              </h2>
              
              {myOrders.length === 0 ? (
                <p className="text-slate-500 text-center py-6">No {user.role === 'student' ? 'orders' : 'deliveries'} yet.</p>
              ) : (
                <div className="space-y-3">
                  {myOrders.map((order) => (
                    <div key={order.id} className="flex flex-col p-4 bg-slate-50 dark:bg-[#0A1931] rounded-xl border border-slate-200 dark:border-slate-700">
                      <div className="flex justify-between items-center mb-1">
                        <p className="text-sm font-bold">{order.hostels?.name} ({order.drums} Drums)</p>
                        <span className={`text-[10px] font-bold px-2 py-1 rounded-md ${order.status === 'delivered' ? 'bg-green-500/20 text-green-500' : 'bg-amber-500/20 text-amber-500'}`}>
                          {order.status.toUpperCase()}
                        </span>
                      </div>
                      
                      {/* If Student, show Driver Name */}
                      {user.role === 'student' && <p className="text-xs text-slate-500 mb-2">Driver: {order.profiles?.full_name || 'Assigned'}</p>}
                      {/* If Driver, show Student Phone */}
                      {user.role === 'driver' && <p className="text-xs text-slate-500 mb-2">Student Phone: {order.phone}</p>}
                      
                      {/* Action Buttons */}
                      {user.role === 'student' && order.status !== 'delivered' && (
                        <button onClick={() => confirmDelivery(order.id)} className="mt-2 bg-green-500 text-white py-2 rounded-lg text-sm font-bold flex items-center justify-center gap-2">
                          <CheckCircle size={16} /> Confirm Delivery & Release Funds
                        </button>
                      )}
                      
                      {user.role === 'driver' && order.status === 'paid' && (
                        <button onClick={() => markAsDeliveredByDriver(order.id)} className="mt-2 bg-[#1E90FF] text-white py-2 rounded-lg text-sm font-bold flex items-center justify-center gap-2">
                          <Truck size={16} /> Mark as Delivered
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 3: COMMUNITY */}
          {activeTab === 'community' && (
            <div className="bg-white dark:bg-[#13294B] p-5 rounded-2xl shadow-lg border border-slate-200 dark:border-slate-700">
              <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
                <MessageSquare className="text-[#1E90FF]" size={20} /> Community Board
              </h2>
              <p className="text-xs text-slate-500 mb-4">Drop your problem. If 10 people agree, we build the solution.</p>
              
              <div className="flex gap-2 mb-6">
                <input type="text" placeholder="I need a bus to Kumasi..." value={newSuggestion} onChange={(e) => setNewSuggestion(e.target.value)} className="flex-1 p-3 rounded-xl bg-slate-50 dark:bg-[#0A1931] border border-slate-200 dark:border-slate-700 text-sm" />
                <button onClick={submitSuggestion} disabled={posting} className="bg-[#1E90FF] text-white p-3 rounded-xl disabled:opacity-50">
                  {posting ? <Loader2 className="animate-spin" size={18} /> : <Send size={18} />}
                </button>
              </div>
              
              <div className="space-y-3">
                {suggestions.map((s) => (
                  <div key={s.id} className="flex items-center justify-between p-3 bg-slate-50 dark:bg-[#0A1931] rounded-xl border border-slate-200 dark:border-slate-700">
                    <p className="text-sm font-medium pr-4">{s.title}</p>
                    <button onClick={() => upvote(s.id, s.