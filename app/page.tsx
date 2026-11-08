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

  const [setupName, setSetupName] = useState('');
  const [setupPhone, setSetupPhone] = useState('');
  const [setupRole, setSetupRole] = useState('student');
  const [setupLoading, setSetupLoading] = useState(false);

  const [hostels, setHostels] = useState<any[]>([]);
  const [drivers, setDrivers] = useState<any[]>([]);
  const [myOrders, setMyOrders] = useState<any[]>([]);
  const [suggestions, setSuggestions] = useState<any[]>([]);
  
  const [selectedHostel, setSelectedHostel] = useState('');
  const [selectedDriver, setSelectedDriver] = useState('');
  const [showCustomHostel, setShowCustomHostel] = useState(false);
  const [customHostel, setCustomHostel] = useState('');
  const [drums, setDrums] = useState(1);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [subDays, setSubDays] = useState('5');

  const [newSuggestion, setNewSuggestion] = useState('');
  const [posting, setPosting] = useState(false);

  const PRICE_PER_DRUM = 3.0;
  const PAYSTACK_PUBLIC_KEY = process.env.NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY!;

  useEffect(() => {
    const savedUser = localStorage.getItem('waternow_user');
    if (savedUser) {
      const parsed = JSON.parse(savedUser);
      setUser(parsed);
      setActiveTab(parsed.role === 'driver' ? 'space' : 'order');
    }
    setCheckingAuth(false);
  }, []);

  useEffect(() => {
    if (user) {
      fetchHostels();
      fetchDrivers();
      fetchSuggestions();
      fetchMyOrders(user);
      
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

  async function checkForNewOrders(currentUser: any) {
    const { data } = await supabase
      .from('orders')
      .select('id')
      .eq('driver_id', currentUser.id)
      .eq('status', 'paid');
      
    if (data && data.length > myOrders.length) {
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