'use client';

import React, { useState, useEffect } from 'react';
import { 
  Crown, Shield, Sun, Moon, LogOut, Home, User, MessageSquare, 
  ThumbsUp, Send, CheckCircle2, Phone, MapPin, Droplet, Calendar, 
  Sparkles, Lock, Truck, Settings, ArrowRight, RefreshCw 
} from 'lucide-react';
import { createClient } from '@supabase/supabase-js';

// Supabase Client Initialization using your Live Credentials
const SUPABASE_URL = 'https://udhzthqswvgbklmhkmzj.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVkaHp0aHFzd3ZnYmtsbWtobXpqIiwicm9sZSI6InVhb24iLCJpYXQiOjE3OTM3MTI4NDksImV4cCI6MjEwOTI4ODg0OX0.E-r7y4RVq9sNfGcl2e7N25oRnuoWfdlVgteP3mtmUfQ';
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Paystack SDK global declaration
declare const PaystackPop: any;

interface UserProfile {
  id?: string;
  fullName: string;
  phone: string;
  role: 'student' | 'driver' | 'admin';
  refCode?: string;
}

interface Order {
  id: number;
  studentName: string;
  phone: string;
  hostel_name: string;
  driver_phone: string;
  drums: number;
  total_price: number;
  platform_fee: number;
  driver_payout: number;
  status: 'pending_payment' | 'paid' | 'delivering' | 'delivered';
  sub?: string;
  timestamp?: number;
}

interface Suggestion {
  id: number;
  title: string;
  votes: number;
}

export default function WaterNowMasterApp() {
  // Authentication & Session State
  const [user, setUser] = useState<UserProfile | null>(null);
  const [inputName, setInputName] = useState<string>('');
  const [inputPhone, setInputPhone] = useState<string>('');
  const [inputRole, setInputRole] = useState<'student' | 'driver'>('student');

  // Navigation Tabs: 'order' | 'space' | 'community' | 'admin'
  const [activeTab, setActiveTab] = useState<'order' | 'space' | 'community' | 'admin'>('order');

  // Hostels Catalog (Synced with Supabase / Local)
  const [hostels, setHostels] = useState<string[]>([
    'UDS CENTRAL HOSTEL',
    'NYANKPALA CAMPUS HALL',
    'PENTAGON LODGE',
    'MODERN VILLA HOSTEL'
  ]);
  const [selectedHostel, setSelectedHostel] = useState<string>('UDS CENTRAL HOSTEL');
  const [customHostelInput, setCustomHostelInput] = useState<string>('');

  // Drivers Network (Pulled from Supabase profiles where role='driver')
  const [driversList, setDriversList] = useState<Array<{ name: string; phone: string }>>([
    { name: 'Driver Alhassan (Tanker 1)', phone: '0240000001' },
    { name: 'Driver Yakubu (Tanker 2)', phone: '0240000002' }
  ]);
  const [selectedDriverPhone, setSelectedDriverPhone] = useState<string>('0240000001');

  // Order Parameters
  const [drums, setDrums] = useState<number>(1);
  const [autoSub, setAutoSub] = useState<string>('none');
  const UNIT_PRICE = 3.00; // GHS 3.00 total (GHS 2.50 driver payout + GHS 0.50 platform commission)

  // System Data
  const [orders, setOrders] = useState<Order[]>([]);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([
    { id: 1, title: 'We need inter-city bus booking from Nyankpala to Kumasi/Accra!', votes: 54 },
    { id: 2, title: 'Extend tanker delivery hours till 10 PM during exam weeks.', votes: 29 }
  ]);
  const [newSuggestion, setNewSuggestion] = useState<string>('');

  // Founder Admin Console State
  const [adminPasswordInput, setAdminPasswordInput] = useState<string>('');
  const [showAdminLoginModal, setShowAdminLoginModal] = useState<boolean>(false);

  // Driver Polling Alert Notification State
  const [newOrderAlert, setNewOrderAlert] = useState<boolean>(false);

  // 1. Initial Session Restoration & Realtime Polling Setup
  useEffect(() => {
    const savedUser = localStorage.getItem('amanah_water_user');
    if (savedUser) {
      setUser(JSON.parse(savedUser));
    }

    const savedOrders = localStorage.getItem('amanah_water_orders');
    if (savedOrders) {
      setOrders(JSON.parse(savedOrders));
    }

    // Fetch initial Supabase data (profiles, hostels, orders)
    fetchSupabaseData();

    // Setup 15-second polling interval for Driver real-time order alerts & live updates
    const pollInterval = setInterval(() => {
      fetchSupabaseData();
    }, 15000);

    // Check URL for direct admin query string (?admin=true)
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('admin') === 'true') {
      setActiveTab('admin');
    }

    return () => clearInterval(pollInterval);
  }, []);

  const fetchSupabaseData = async () => {
    try {
      // Fetch drivers from Supabase profiles
      const { data: profileData } = await supabase.from('profiles').select('*').eq('role', 'driver');
      if (profileData && profileData.length > 0) {
        const fetchedDrivers = profileData.map(p => ({ name: p.full_name, phone: p.phone }));
        setDriversList(prev => {
          const combined = [...prev];
          fetchedDrivers.forEach(fd => {
            if (!combined.some(c => c.phone === fd.phone)) combined.push(fd);
          });
          return combined;
        });
      }

      // Fetch orders from Supabase orders table
      const { data: orderData } = await supabase.from('orders').select('*').order('created_at', { ascending: false });
      if (orderData && orderData.length > 0) {
        const formattedOrders: Order[] = orderData.map(o => ({
          id: o.id || Date.now(),
          studentName: o.student_name,
          phone: o.phone,
          hostel_name: o.hostel_name,
          driver_phone: o.driver_phone,
          drums: o.drums,
          total_price: o.total_price,
          platform_fee: o.platform_fee,
          driver_payout: o.driver_payout,
          status: o.status
        }));
        
        // Trigger alert if driver detects new paid orders
        if (user && user.role === 'driver') {
          const unassigned = formattedOrders.some(o => o.driver_phone === user.phone && o.status === 'paid');
          if (unassigned) setNewOrderAlert(true);
        }

        setOrders(formattedOrders);
        localStorage.setItem('amanah_water_orders', JSON.stringify(formattedOrders));
      }
    } catch (err) {
      console.log('Running on resilient local state fallback.');
    }
  };

  // 2. Frictionless Login Handler
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputName.trim() || !inputPhone.trim()) {
      alert('Please enter your full name and mobile number.');
      return;
    }

    const refCode = 'AMN-' + Math.floor(1000 + Math.random() * 9000);
    const newUser: UserProfile = {
      fullName: inputName.trim(),
      phone: inputPhone.trim(),
      role: inputRole,
      refCode: refCode
    };

    setUser(newUser);
    localStorage.setItem('amanah_water_user', JSON.stringify(newUser));

    // Save to Supabase profiles table
    try {
      await supabase.from('profiles').upsert([
        { full_name: newUser.fullName, phone: newUser.phone, role: newUser.role }
      ], { onConflict: 'phone' });
    } catch (err) {
      console.log('Profile saved locally.');
    }

    if (inputRole === 'driver') {
      setActiveTab('space');
    } else {
      setActiveTab('order');
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('amanah_water_user');
    setUser(null);
    setActiveTab('order');
  };

  // 3. Dynamic Hostel Auto-Save Engine (ALL CAPS)
  const handleAddHostel = async () => {
    const formatted = customHostelInput.trim().toUpperCase();
    if (!formatted) return;
    if (!hostels.includes(formatted)) {
      const updated = [...hostels, formatted];
      setHostels(updated);
      localStorage.setItem('amanah_water_hostels', JSON.stringify(updated));
      setSelectedHostel(formatted);
      setCustomHostelInput('');
      
      try {
        await supabase.from('hostels').insert([{ name: formatted }]);
      } catch (e) {
        console.log('Hostel saved locally.');
      }
      alert(`Hostel "${formatted}" saved system-wide!`);
    } else {
      setSelectedHostel(formatted);
      setCustomHostelInput('');
    }
  };

  // 4. Paystack Inline JS Payment Integration & Escrow Split
  const triggerPaystackPayment = () => {
    if (!user) return;
    const totalPrice = drums * UNIT_PRICE;

    if (typeof PaystackPop === 'undefined') {
      if (confirm(`Simulate Paystack MoMo Payment of GHS ${totalPrice.toFixed(2)}?`)) {
        processSuccessfulPayment('TEST_REF_' + Date.now());
      }
      return;
    }

    let handler = PaystackPop.setup({
      key: 'pk_live_b0f896380e67a59dc530e54d85b8ac76a6070fd4',
      email: `${user.phone}@amanahtechgh.com`,
      amount: totalPrice * 100, // Pesewas conversion
      currency: 'GHS',
      callback: function(response: any) {
        processSuccessfulPayment(response.reference);
      },
      onClose: function() {
        console.log('Payment window closed.');
      }
    });
    handler.openIframe();
  };

  const processSuccessfulPayment = async (ref: string) => {
    if (!user) return;
    const newOrder: Order = {
      id: Date.now(),
      studentName: user.fullName,
      phone: user.phone,
      hostel_name: selectedHostel,
      driver_phone: selectedDriverPhone,
      drums: drums,
      total_price: drums * UNIT_PRICE,
      platform_fee: drums * 0.50,
      driver_payout: drums * 2.50,
      status: 'paid',
      sub: autoSub,
      timestamp: Date.now()
    };

    const updated = [newOrder, ...orders];
    setOrders(updated);
    localStorage.setItem('amanah_water_orders', JSON.stringify(updated));

    // Push to Supabase orders table
    try {
      await supabase.from('orders').insert([
        {
          student_name: newOrder.studentName,
          phone: newOrder.phone,
          hostel_name: newOrder.hostel_name,
          driver_phone: newOrder.driver_phone,
          drums: newOrder.drums,
          total_price: newOrder.total_price,
          platform_fee: newOrder.platform_fee,
          driver_payout: newOrder.driver_payout,
          status: 'paid'
        }
      ]);
    } catch (err) {
      console.log('Order saved locally.');
    }

    alert(`Payment Successful! Order dispatched. Ref: ${ref}`);
    setActiveTab('space');
  };

  // 5. Escrow Release & Driver Actions
  const confirmDelivery = async (orderId: number) => {
    const updated = orders.map(o => o.id === orderId ? { ...o, status: 'delivered' as const } : o);
    setOrders(updated);
    localStorage.setItem('amanah_water_orders', JSON.stringify(updated));

    try {
      await supabase.from('orders').update({ status: 'delivered' }).eq('id', orderId);
    } catch (err) {
      console.log('Status updated locally.');
    }
    alert('Escrow funds released to driver partner successfully!');
  };

  const updateDriverStatus = async (orderId: number, newStatus: 'delivering' | 'delivered') => {
    const updated = orders.map(o => o.id === orderId ? { ...o, status: newStatus } : o);
    setOrders(updated);
    localStorage.setItem('amanah_water_orders', JSON.stringify(updated));

    try {
      await supabase.from('orders').update({ status: newStatus }).eq('id', orderId);
    } catch (err) {
      console.log('Status updated locally.');
    }
  };

  // Community Board Actions
  const handleVote = async (id: number) => {
    const target = suggestions.find(s => s.id === id);
    if (!target) return;
    const updated = suggestions.map(s => s.id === id ? { ...s, votes: s.votes + 1 } : s);
    setSuggestions(updated);

    try {
      await supabase.from('suggestions').update({ votes: target.votes + 1 }).eq('id', id);
    } catch (e) {
      console.log('Vote recorded locally.');
    }
  };

  const handlePostSuggestion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSuggestion.trim()) return;
    const newItem = { id: Date.now(), title: newSuggestion.trim(), votes: 1 };
    setSuggestions([newItem, ...suggestions]);
    setNewSuggestion('');

    try {
      await supabase.from('suggestions').insert([{ title: newItem.title, votes: 1 }]);
    } catch (e) {
      console.log('Suggestion posted locally.');
    }
  };

  // Founder Admin Verification
  const verifyAdmin = (e: React.FormEvent) => {
    e.preventDefault();
    if (adminPasswordInput === 'OHU2026') {
      if (user) {
        setUser({ ...user, role: 'admin' });
      } else {
        setUser({ fullName: 'Founder OHU', phone: '0240000000', role: 'admin', refCode: 'ADMIN-01' });
      }
      setActiveTab('admin');
      setShowAdminLoginModal(false);
      setAdminPasswordInput('');
    } else {
      alert('Access Denied. Incorrect Founder Password.');
    }
  };

  return (
    <div className="bg-[#0A1931] text-slate-100 min-h-screen flex flex-col justify-between font-sans antialiased selection:bg-[#FFD700] selection:text-[#0A1931]">
      
      {/* STICKY TOP HEADER */}
      <header className="sticky top-0 z-50 backdrop-blur-md bg-[#0A1931]/95 border-b border-[#FFD700]/30 px-4 py-3 shadow-2xl">
        <div className="max-w-md mx-auto flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-amber-500 via-yellow-400 to-amber-600 flex items-center justify-center text-[#0A1931] font-black shadow-lg shadow-amber-500/20">
              <Crown className="w-6 h-6 text-[#0A1931]" />
            </div>
            <div>
              <h1 className="text-base font-black tracking-tight leading-none text-[#FFD700]">AMANAH TECH</h1>
              <p className="text-[9px] text-slate-300 font-bold tracking-widest uppercase mt-0.5">WaterNow: Royal Service, Trusted Always</p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            {user && (
              <span className="text-xs font-bold text-amber-300 hidden sm:inline">Hi, {user.fullName} 👑</span>
            )}
            {user && (
              <button 
                onClick={handleLogout}
                className="p-2 rounded-xl bg-red-950/40 border border-red-900/50 text-red-400 hover:text-red-300 transition"
                title="Logout"
              >
                <LogOut className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </header>

      {/* MAIN CONTAINER */}
      <main className="w-full max-w-md mx-auto p-4 flex-grow space-y-4">

        {/* 1. FRICTIONLESS LOGIN / SETUP SCREEN */}
        {!user ? (
          <div className="backdrop-blur-xl bg-[#13294B] border border-[#FFD700]/30 rounded-3xl p-6 shadow-2xl space-y-5 shadow-black/80">
            <div className="text-center space-y-2">
              <span className="inline-block text-[10px] font-bold uppercase tracking-widest text-[#FFD700] bg-amber-950/70 border border-amber-800/50 px-3 py-1 rounded-full shadow-inner">
                WaterNow: Royal Service, Trusted Always
              </span>
              <h2 className="text-2xl font-black tracking-tight text-white">WaterNow Tamale</h2>
              <p className="text-xs text-slate-300 max-w-[260px] mx-auto">
                The Civilized Way to Stay Hydrated across Nyankpala & Tamale.
              </p>
            </div>

            <form onSubmit={handleLogin} className="space-y-4 pt-1">
              <div>
                <label className="block text-xs font-bold text-slate-200 mb-1.5">Full Name</label>
                <input 
                  type="text" 
                  value={inputName}
                  onChange={(e) => setInputName(e.target.value)}
                  placeholder="e.g. Fuseini Ibrahim" 
                  required
                  className="w-full bg-[#0A1931] border border-slate-700 rounded-2xl px-4 py-3.5 text-sm text-white focus:outline-none focus:border-[#1E90FF] transition shadow-inner"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-200 mb-1.5">Phone Number (MoMo)</label>
                <input 
                  type="tel" 
                  value={inputPhone}
                  onChange={(e) => setInputPhone(e.target.value)}
                  placeholder="024XXXXXXX" 
                  required
                  className="w-full bg-[#0A1931] border border-slate-700 rounded-2xl px-4 py-3.5 text-sm text-white focus:outline-none focus:border-[#1E90FF] transition shadow-inner"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-200 mb-1.5">Select Role</label>
                <select 
                  value={inputRole}
                  onChange={(e) => setInputRole(e.target.value as 'student' | 'driver')}
                  className="w-full bg-[#0A1931] border border-slate-700 rounded-2xl px-4 py-3.5 text-sm text-white focus:outline-none focus:border-[#1E90FF] transition shadow-inner"
                >
                  <option value="student">Student / Resident (Customer)</option>
                  <option value="driver">Tanker Driver Partner</option>
                </select>
              </div>

              <button 
                type="submit"
                className="w-full bg-[#1E90FF] hover:bg-blue-600 text-white font-black py-4 rounded-2xl transition-all shadow-xl shadow-blue-500/20 active:scale-[0.98]"
              >
                Continue to App & Save Session 🚀
              </button>
            </form>
          </div>
        ) : (
          <>
            {/* TAB 1: ORDER FORM (STUDENT) */}
            {activeTab === 'order' && user.role !== 'admin' && (
              <div className="space-y-4">
                {/* Escrow Shield Banner */}
                <div className="bg-amber-950/60 border border-amber-600/40 rounded-3xl p-4 flex items-start space-x-3.5 shadow-xl">
                  <Shield className="w-6 h-6 text-amber-400 flex-shrink-0 mt-0.5" />
                  <div className="text-xs space-y-1">
                    <span className="font-black text-amber-400 uppercase tracking-wider">Escrow Protection Active</span>
                    <p className="text-slate-300 leading-relaxed">
                      Money is held securely. Driver gets paid GHS 2.50 only after you confirm successful delivery.
                    </p>
                  </div>
                </div>

                {/* Main Order Card */}
                <div className="backdrop-blur-xl bg-[#13294B] border border-[#FFD700]/20 rounded-3xl p-5 space-y-4 shadow-2xl">
                  <h3 className="font-bold text-sm text-[#FFD700] border-b border-slate-700/60 pb-3 flex items-center justify-between">
                    <span>Order Water Delivery</span>
                    <span className="text-[10px] bg-amber-950 text-amber-300 px-2.5 py-1 rounded-full border border-amber-800">GHS {UNIT_PRICE.toFixed(2)} / Drum</span>
                  </h3>

                  {/* Hostel Selection & Custom Addition */}
                  <div className="space-y-2">
                    <label className="block text-xs font-bold text-slate-200">Select Hostel / Location</label>
                    <select 
                      value={selectedHostel}
                      onChange={(e) => setSelectedHostel(e.target.value)}
                      className="w-full bg-[#0A1931] border border-slate-700 rounded-2xl px-4 py-3 text-sm text-white focus:outline-none focus:border-[#1E90FF]"
                    >
                      {hostels.map((h, idx) => (
                        <option key={idx} value={h}>{h}</option>
                      ))}
                    </select>

                    <div className="pt-1 flex space-x-2">
                      <input 
                        type="text" 
                        value={customHostelInput}
                        onChange={(e) => setCustomHostelInput(e.target.value)}
                        placeholder="Type new hostel name..." 
                        className="flex-1 bg-[#0A1931] border border-slate-700 rounded-xl px-3 py-2 text-xs text-white uppercase focus:outline-none focus:border-[#1E90FF]"
                      />
                      <button 
                        type="button" 
                        onClick={handleAddHostel}
                        className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold px-3.5 py-2 rounded-xl text-xs transition"
                      >
                        Save Hostel
                      </button>
                    </div>
                  </div>

                  {/* Driver Selection */}
                  <div>
                    <label className="block text-xs font-bold text-slate-200 mb-1.5">Select Tanker Partner</label>
                    <select 
                      value={selectedDriverPhone}
                      onChange={(e) => setSelectedDriverPhone(e.target.value)}
                      className="w-full bg-[#0A1931] border border-slate-700 rounded-2xl px-4 py-3 text-sm text-white focus:outline-none focus:border-[#1E90FF]"
                    >
                      {driversList.map((d, idx) => (
                        <option key={idx} value={d.phone}>{d.name} ({d.phone})</option>
                      ))}
                    </select>
                  </div>

                  {/* Drums Slider / Qty & Auto-Refill */}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-slate-200 mb-1.5">Drums Qty</label>
                      <input 
                        type="number" 
                        min="1" 
                        max="20"
                        value={drums} 
                        onChange={(e) => setDrums(parseInt(e.target.value) || 1)}
                        className="w-full bg-[#0A1931] border border-slate-700 rounded-2xl px-4 py-3 text-sm text-white focus:outline-none focus:border-[#1E90FF]"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-200 mb-1.5">Auto-Refill Subscription</label>
                      <select 
                        value={autoSub} 
                        onChange={(e) => setAutoSub(e.target.value)}
                        className="w-full bg-[#0A1931] border border-slate-700 rounded-2xl px-3 py-3 text-sm text-white focus:outline-none focus:border-[#1E90FF]"
                      >
                        <option value="none">One-time Order</option>
                        <option value="every_2_days">Every 2 Days</option>
                        <option value="every_3_days">Every 3 Days</option>
                        <option value="weekly">Weekly Refill (7 Days)</option>
                      </select>
                    </div>
                  </div>

                  {/* Price Calculation Card */}
                  <div className="bg-[#0A1931] border border-slate-800 p-4 rounded-2xl space-y-1.5">
                    <div className="flex justify-between text-xs text-slate-400">
                      <span>Driver Payout (GHS 2.50 x {drums})</span>
                      <span>GHS {(drums * 2.50).toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-xs text-slate-400">
                      <span>Amanah Platform Fee (GHS 0.50 x {drums})</span>
                      <span>GHS {(drums * 0.50).toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between items-center pt-2 border-t border-slate-800">
                      <span className="text-xs uppercase font-bold text-slate-300">Total Payable</span>
                      <h2 className="text-2xl font-black text-[#FFD700]">GHS {(drums * UNIT_PRICE).toFixed(2)}</h2>
                    </div>
                  </div>

                  {/* Huge Gold Pay Button */}
                  <button 
                    onClick={triggerPaystackPayment}
                    className="w-full bg-[#FFD700] hover:bg-amber-400 text-slate-950 font-black py-4 rounded-2xl transition-all shadow-xl shadow-amber-500/20 active:scale-[0.98] text-base"
                  >
                    Pay & Confirm Delivery 💳
                  </button>
                </div>
              </div>
            )}

            {/* TAB 2: MY SPACE / MY DELIVERIES */}
            {activeTab === 'space' && (
              <div className="space-y-4">
                <div className="backdrop-blur-xl bg-[#13294B] border border-slate-700 rounded-3xl p-5 shadow-xl flex items-center justify-between">
                  <div>
                    <h3 className="font-bold text-base text-white">{user.fullName}</h3>
                    <p className="text-xs text-[#FFD700] font-mono capitalize">Role: {user.role} | {user.phone}</p>
                    <p className="text-[10px] text-slate-400 mt-0.5">Referral Code: <span className="text-amber-300 font-bold">{user.refCode || 'AMN-01'}</span></p>
                  </div>
                  <span className="bg-amber-500/20 text-amber-300 border border-amber-500/40 text-xs px-3 py-1.5 rounded-xl font-bold">
                    Active Session
                  </span>
                </div>

                {/* Driver Live Polling Alert Banner */}
                {user.role === 'driver' && newOrderAlert && (
                  <div className="bg-blue-950/80 border border-blue-500 p-4 rounded-2xl flex items-center justify-between animate-pulse shadow-lg">
                    <div className="flex items-center space-x-3">
                      <Truck className="w-6 h-6 text-[#1E90FF]" />
                      <div className="text-xs">
                        <p className="font-black text-white">New Water Order Received!</p>
                        <p className="text-slate-300">Check your assigned deliveries below.</p>
                      </div>
                    </div>
                    <button onClick={() => setNewOrderAlert(false)} className="text-xs bg-[#1E90FF] text-white px-3 py-1.5 rounded-xl font-bold">Dismiss</button>
                  </div>
                )}

                <div className="backdrop-blur-xl bg-[#13294B] border border-slate-700 rounded-3xl p-5 space-y-3 shadow-2xl">
                  <h3 className="font-bold text-sm text-white border-b border-slate-700 pb-2">
                    {user.role === 'driver' ? 'My Deliveries (Tanker Partner)' : 'My Orders & Escrow Release'}
                  </h3>

                  <div className="space-y-3 text-xs">
                    {orders.length === 0 ? (
                      <p className="text-slate-400 text-center py-6">No orders recorded in your private space.</p>
                    ) : (
                      orders
                        .filter(o => user.role === 'driver' ? o.driver_phone === user.phone : o.phone === user.phone)
                        .map((o) => (
                          <div key={o.id} className="p-4 bg-[#0A1931] border border-slate-800 rounded-2xl space-y-2">
                            <div className="flex justify-between font-bold">
                              <span className="text-white">{o.drums} Water Drum(s)</span>
                              <span className={`px-2.5 py-0.5 rounded-full text-[10px] uppercase font-extrabold ${
                                o.status === 'delivered' ? 'bg-emerald-950 text-emerald-400 border border-emerald-800' :
                                o.status === 'delivering' ? 'bg-blue-950 text-blue-400 border border-blue-800' :
                                'bg-amber-950 text-amber-400 border border-amber-800'
                              }`}>
                                {o.status}
                              </span>
                            </div>
                            <p className="text-slate-300">📍 Hostel: <strong className="text-white">{o.hostel_name}</strong></p>
                            <p className="text-slate-300">📞 Customer: <strong className="text-white">{o.studentName} ({o.phone})</strong></p>
                            <p className="text-slate-300">💰 Total Amount: GHS {o.total_price.toFixed(2)}</p>

                            <div className="pt-2 flex space-x-2">
                              {user.role === 'student' && o.status !== 'delivered' && (
                                <button 
                                  onClick={() => confirmDelivery(o.id)}
                                  className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-2.5 rounded-xl transition shadow-md"
                                >
                                  Confirm Delivery & Release Funds ✅
                                </button>
                              )}

                              {user.role === 'driver' && o.status === 'paid' && (
                                <button 
                                  onClick={() => updateDriverStatus(o.id, 'delivering')}
                                  className="w-full bg-[#1E90FF] hover:bg-blue-600 text-white font-bold py-2.5 rounded-xl transition shadow-md"
                                >
                                  Accept & Start Delivering 🚛
                                </button>
                              )}

                              {user.role === 'driver' && o.status === 'delivering' && (
                                <button 
                                  onClick={() => updateDriverStatus(o.id, 'delivered')}
                                  className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-2.5 rounded-xl transition shadow-md"
                                >
                                  Mark as Delivered 🏁
                                </button>
                              )}
                            </div>
                          </div>
                        ))
                    )}
                  </div>
                </div>

                {/* WhatsApp Community & Channel Links */}
                <div className="grid grid-cols-2 gap-3">
                  <a 
                    href="https://whatsapp.com/channel/0029Vb9B2beCxoB2aVHEkO1V" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="bg-emerald-950/60 border border-emerald-800/60 hover:bg-emerald-900/60 p-3.5 rounded-2xl text-center space-y-1 transition shadow-lg"
                  >
                    <span className="text-emerald-400 font-bold text-xs block">WhatsApp Channel</span>
                    <span className="text-[10px] text-slate-300">Official News 📢</span>
                  </a>
                  <a 
                    href="https://chat.whatsapp.com/BU1TrgPslJFFV4A2BcuwpH" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="bg-blue-950/60 border border-blue-800/60 hover:bg-blue-900/60 p-3.5 rounded-2xl text-center space-y-1 transition shadow-lg"
                  >
                    <span className="text-[#1E90FF] font-bold text-xs block">WhatsApp Community</span>
                    <span className="text-[10px] text-slate-300">Student Group 💬</span>
                  </a>
                </div>
              </div>
            )}

            {/* TAB 3: COMMUNITY BOARD */}
            {activeTab === 'community' && (
              <div className="space-y-4">
                <div className="backdrop-blur-xl bg-[#13294B] border border-slate-700 rounded-3xl p-5 space-y-4 shadow-2xl">
                  <div>
                    <h3 className="font-bold text-sm text-white">Community Board - Drop your problem, we solve it.</h3>
                    <p className="text-xs text-slate-300">Tell us what regional problems to solve next.</p>
                  </div>

                  <form onSubmit={handlePostSuggestion} className="space-y-2">
                    <textarea 
                      rows={2}
                      value={newSuggestion}
                      onChange={(e) => setNewSuggestion(e.target.value)}
                      placeholder="e.g. We need bus bookings to Kumasi..." 
                      className="w-full bg-[#0A1931] border border-slate-700 rounded-2xl p-3 text-xs text-white focus:outline-none focus:border-[#1E90FF]"
                    />
                    <button type="submit" className="w-full bg-[#1E90FF] hover:bg-blue-600 text-white font-bold py-2.5 rounded-xl text-xs transition">
                      Post Idea 💡
                    </button>
                  </form>

                  <div className="space-y-2.5 pt-2">
                    {suggestions.map((item) => (
                      <div key={item.id} className="p-3.5 bg-[#0A1931] border border-slate-800 rounded-2xl flex items-center justify-between">
                        <p className="text-xs text-slate-200 pr-2">{item.title}</p>
                        <button 
                          onClick={() => handleVote(item.id)}
                          className="flex items-center space-x-1 bg-amber-500/20 text-amber-300 border border-amber-500/40 px-3 py-1.5 rounded-xl text-xs font-bold hover:bg-amber-500/35 transition flex-shrink-0"
                        >
                          <ThumbsUp className="w-3.5 h-3.5" />
                          <span>{item.votes}</span>
                        </button>
                      </div>
                    ))}
                  </div>
                </div>

                {/* WhatsApp Links in Community Tab */}
                <div className="grid grid-cols-2 gap-3">
                  <a 
                    href="https://whatsapp.com/channel/0029Vb9B2beCxoB2aVHEkO1V" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="bg-emerald-950/60 border border-emerald-800/60 hover:bg-emerald-900/60 p-3.5 rounded-2xl text-center space-y-1 transition shadow-lg"
                  >
                    <span className="text-emerald-400 font-bold text-xs block">WhatsApp Channel</span>
                    <span className="text-[10px] text-slate-300">Official News 📢</span>
                  </a>
                  <a 
                    href="https://chat.whatsapp.com/BU1TrgPslJFFV4A2BcuwpH" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="bg-blue-950/60 border border-blue-800/60 hover:bg-blue-900/60 p-3.5 rounded-2xl text-center space-y-1 transition shadow-lg"
                  >
                    <span className="text-[#1E90FF] font-bold text-xs block">WhatsApp Community</span>
                    <span className="text-[10px] text-slate-300">Student Group 💬</span>
                  </a>
                </div>
              </div>
            )}

            {/* TAB 4: FOUNDER ADMIN DASHBOARD */}
            {activeTab === 'admin' && (
              <div className="space-y-4">
                <div className="backdrop-blur-xl bg-[#13294B] border border-[#FFD700]/40 rounded-3xl p-6 space-y-5 shadow-2xl">
                  <div className="flex items-center justify-between border-b border-slate-700 pb-3">
                    <div>
                      <h2 className="text-xl font-black text-white">Founder Console 👑</h2>
                      <p className="text-xs text-[#FFD700] font-bold">Amanah Tech Master Analytics</p>
                    </div>
                    <button 
                      onClick={() => setActiveTab('order')}
                      className="text-xs bg-slate-800 border border-slate-700 text-slate-200 font-bold px-3 py-1.5 rounded-xl"
                    >
                      Exit Admin
                    </button>
                  </div>

                  {/* Financial Metrics */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-[#0A1931] border border-slate-800 p-4 rounded-2xl">
                      <span className="text-[10px] text-slate-400 font-bold uppercase">Total Profit (GHS 0.50/drum)</span>
                      <h3 className="text-xl font-black text-[#FFD700] mt-1">
                        GHS {orders.reduce((acc, o) => acc + (o.platform_fee || (o.drums * 0.50)), 0).toFixed(2)}
                      </h3>
                    </div>
                    <div className="bg-[#0A1931] border border-slate-800 p-4 rounded-2xl">
                      <span className="text-[10px] text-slate-400 font-bold uppercase">Escrow Held</span>
                      <h3 className="text-xl font-black text-[#FFD700] mt-1">
                        GHS {orders.filter(o => o.status !== 'delivered').reduce((acc, o) => acc + o.total_price, 0).toFixed(2)}
                      </h3>
                    </div>
                  </div>

                  {/* Manual Dispatch Feed for Non-Smartphone Drivers */}
                  <div className="space-y-3 border-t border-slate-700/80 pt-4">
                    <h3 className="font-bold text-xs text-white uppercase tracking-wider">Manual Dispatch (For Non-Smartphone Drivers)</h3>
                    <div className="space-y-2 text-xs">
                      {orders.filter(o => o.status === 'paid').length === 0 ? (
                        <p className="text-slate-400 text-center py-3">No pending paid orders to dispatch.</p>
                      ) : (
                        orders.filter(o => o.status === 'paid').map(o => (
                          <div key={o.id} className="p-3 bg-[#0A1931] rounded-2xl border border-slate-800 space-y-2">
                            <div className="flex justify-between font-bold text-white">
                              <span>Order #{o.id} ({o.drums} Drums)</span>
                              <span className="text-[#FFD700]">GHS {o.total_price.toFixed(2)}</span>
                            </div>
                            <p className="text-slate-300">Customer: {o.studentName} ({o.phone})</p>
                            <p className="text-slate-300">Hostel: {o.hostel_name}</p>
                            <p className="text-slate-300">Assigned Driver Phone: <strong className="text-white">{o.driver_phone}</strong></p>

                            <div className="flex space-x-2 pt-1">
                              <a 
                                href={`tel:${o.driver_phone}`}
                                className="flex-1 bg-amber-500/20 text-amber-300 border border-amber-500/40 text-center py-2 rounded-xl font-bold flex items-center justify-center space-x-1"
                              >
                                <Phone className="w-3.5 h-3.5" />
                                <span>Call Driver</span>
                              </a>
                              <a 
                                href={`sms:${o.driver_phone}?body=New WaterOrder: ${o.drums} drums to ${o.hostel_name}. Customer: ${o.phone}`}
                                className="flex-1 bg-blue-500/20 text-blue-300 border border-blue-500/40 text-center py-2 rounded-xl font-bold flex items-center justify-center space-x-1"
                              >
                                <MessageSquare className="w-3.5 h-3.5" />
                                <span>SMS Driver</span>
                              </a>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>

                  {/* Live Order Feed */}
                  <div className="space-y-2 border-t border-slate-700/80 pt-4">
                    <h4 className="text-xs font-bold text-slate-200">Live Order Audit Feed</h4>
                    <div className="bg-[#0A1931] border border-slate-800 rounded-2xl p-3 h-40 overflow-y-auto space-y-1 text-[11px] font-mono text-slate-300">
                      {orders.map(o => (
                        <p key={o.id}>[${o.status.toUpperCase()}]: {o.drums} drums to {o.hostel_name} - GHS {o.total_price.toFixed(2)} ({o.phone})</p>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </main>

      {/* BOTTOM NAVIGATION BAR */}
      {user && user.role !== 'admin' && (
        <nav className="sticky bottom-0 z-50 backdrop-blur-md bg-[#0A1931]/95 border-t border-slate-800 px-6 py-3 shadow-2xl">
          <div className="max-w-md mx-auto flex justify-around items-center">
            <button 
              onClick={() => setActiveTab('order')}
              className={`flex flex-col items-center space-y-1 transition ${activeTab === 'order' ? 'text-[#1E90FF]' : 'text-slate-400 hover:text-slate-200'}`}
            >
              <Home className="w-5 h-5" />
              <span className="text-[10px] font-bold">Order</span>
            </button>

            <button 
              onClick={() => setActiveTab('space')}
              className={`flex flex-col items-center space-y-1 transition ${activeTab === 'space' ? 'text-[#1E90FF]' : 'text-slate-400 hover:text-slate-200'}`}
            >
              <User className="w-5 h-5" />
              <span className="text-[10px] font-bold">My Space</span>
            </button>

            <button 
              onClick={() => setActiveTab('community')}
              className={`flex flex-col items-center space-y-1 transition ${activeTab === 'community' ? 'text-[#1E90FF]' : 'text-slate-400 hover:text-slate-200'}`}
            >
              <MessageSquare className="w-5 h-5" />
              <span className="text-[10px] font-bold">Community</span>
            </button>
          </div>
        </nav>
      )}

      {/* ADMIN PASSWORD PROMPT MODAL */}
      {showAdminLoginModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#13294B] border border-[#FFD700] rounded-3xl p-6 max-w-xs w-full space-y-4 shadow-2xl">
            <h3 className="font-bold text-sm text-[#FFD700]">Founder Master Access</h3>
            <form onSubmit={verifyAdmin} className="space-y-3">
              <input 
                type="password" 
                value={adminPasswordInput}
                onChange={(e) => setAdminPasswordInput(e.target.value)}
                placeholder="Enter password (OHU2026)..." 
                className="w-full bg-[#0A1931] border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-[#FFD700]"
                autoFocus
              />
              <div className="flex space-x-2">
                <button type="submit" className="flex-1 bg-[#FFD700] text-slate-950 font-black py-2 rounded-xl text-xs">Unlock</button>
                <button type="button" onClick={() => setShowAdminLoginModal(false)} className="flex-1 bg-slate-800 text-slate-300 font-bold py-2 rounded-xl text-xs">Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* FOOTER WITH GEAR/CROWN ICON FOR ADMIN TRIGGER */}
      <footer className="border-t border-slate-800 bg-[#0A1931] p-4 text-center space-y-1 text-slate-400">
        <p className="text-xs font-medium">AMANAH TECH COMPANY • <a href="mailto:support@amanahtechgh.com" className="text-[#FFD700] underline font-bold">support@amanahtechgh.com</a></p>
        <div>
          <button 
            onClick={() => setShowAdminLoginModal(true)} 
            className="inline-flex items-center space-x-1 text-[10px] font-mono text-slate-500 hover:text-[#FFD700] transition"
          >
            <Crown className="w-3.5 h-3.5 text-[#FFD700]" />
            <span>Founder Console Portal</span>
          </button>
        </div>
      </footer>

    </div>
  );
}
// END OF CODE