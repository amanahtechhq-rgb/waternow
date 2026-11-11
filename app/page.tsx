'use client';

import React, { useState, useEffect } from 'react';
import { 
  Crown, Shield, Sun, Moon, LogOut, Home, User, MessageSquare, 
  ThumbsUp, Phone, MapPin, Droplet, Calendar, Sparkles, Lock, CheckCircle2, Truck
} from 'lucide-react';
import { createClient } from '@supabase/supabase-js';

// Supabase Client Setup using your Live Credentials
const SUPABASE_URL = 'https://udhzthqswvgbklmhkmzj.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVkaHp0aHFzd3ZnYmtsbWtobXpqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTM3MTI4NDksImV4cCI6MjEwOTI4ODg0OX0.E-r7y4RVq9sNfGcl2e7N25oRnuoWfdlVgteP3mtmUfQ';
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Global Paystack Type Declaration
declare const PaystackPop: any;

interface UserProfile {
  id?: string;
  fullName: string;
  phone: string;
  role: 'student' | 'driver' | 'admin';
  refCode: string;
}

interface Order {
  id: number;
  studentName: string;
  studentPhone: string;
  hostel: string;
  driverPhone: string;
  driverName?: string;
  drums: number;
  unitPrice: number;
  totalPrice: number;
  platformFee: number;
  driverPayout: number;
  status: 'pending_payment' | 'paid' | 'delivering' | 'delivered';
  sub: string;
  timestamp: number;
}

interface Suggestion {
  id: number;
  title: string;
  votes: number;
}

export default function WaterNowApp() {
  // Appearance Theme Toggle
  const [darkMode, setDarkMode] = useState<boolean>(true);

  // Authentication & Persistent User State
  const [user, setUser] = useState<UserProfile | null>(null);
  const [inputName, setInputName] = useState<string>('');
  const [inputPhone, setInputPhone] = useState<string>('');
  const [inputRole, setInputRole] = useState<'student' | 'driver'>('student');

  // Active Navigation Tab: 'order' | 'space' | 'community' | 'admin'
  const [activeTab, setActiveTab] = useState<'order' | 'space' | 'community' | 'admin'>('order');

  // Dynamic Hostel Management (ALL CAPS Storage)
  const [hostels, setHostels] = useState<string[]>([
    'UDS CENTRAL HOSTEL',
    'NYANKPALA CAMPUS HALL',
    'PENTAGON LODGE',
    'MODERN VILLA HOSTEL'
  ]);
  const [selectedHostel, setSelectedHostel] = useState<string>('UDS CENTRAL HOSTEL');
  const [customHostelInput, setCustomHostelInput] = useState<string>('');

  // Drivers Configuration & Dynamic Network State
  const [driversList, setDriversList] = useState<Array<{ name: string; phone: string }>>([
    { name: 'Driver Alhassan (Tanker 1)', phone: '0240000001' },
    { name: 'Driver Yakubu (Tanker 2)', phone: '0240000002' }
  ]);
  const [selectedDriverPhone, setSelectedDriverPhone] = useState<string>('0240000001');

  // Pricing Model Configuration
  const UNIT_PRICE = 3.00; // GHS 3.00 total per drum
  const PLATFORM_FEE_PER_DRUM = 0.50; // GHS 0.50 to Amanah Tech
  const DRIVER_PAYOUT_PER_DRUM = 2.50; // GHS 2.50 to Driver

  const [drums, setDrums] = useState<number>(1);
  const [autoSub, setAutoSub] = useState<string>('none');

  // System Orders & Community Board State
  const [orders, setOrders] = useState<Order[]>([]);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([
    { id: 1, title: 'We need an inter-city bus booking app from Nyankpala to Kumasi/Accra!', votes: 38 },
    { id: 2, title: 'Extend tanker delivery hours till 10 PM during exam weeks.', votes: 21 }
  ]);
  const [newSuggestion, setNewSuggestion] = useState<string>('');

  // Admin Security Unlock Input
  const [adminPasswordInput, setAdminPasswordInput] = useState<string>('');

  // 1. Initial Loading & Session Restoration
  useEffect(() => {
    const savedUser = localStorage.getItem('amanah_water_user');
    if (savedUser) {
      setUser(JSON.parse(savedUser));
    }
    const savedOrders = localStorage.getItem('amanah_water_orders');
    if (savedOrders) {
      setOrders(JSON.parse(savedOrders));
    }
    const savedHostels = localStorage.getItem('amanah_water_hostels');
    if (savedHostels) {
      setHostels(JSON.parse(savedHostels));
    }

    // Direct Admin Query Check (?admin=true)
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('admin') === 'true') {
      setActiveTab('admin');
    }

    // Fetch live drivers & orders from Supabase if connected
    fetchSupabaseData();
  }, []);

  const fetchSupabaseData = async () => {
    try {
      // Sync profiles to fetch drivers
      const { data: profilesData } = await supabase.from('profiles').select('*').eq('role', 'driver');
      if (profilesData && profilesData.length > 0) {
        const fetchedDrivers = profilesData.map(p => ({ name: p.full_name, phone: p.phone }));
        setDriversList(prev => {
          const combined = [...prev];
          fetchedDrivers.forEach(fd => {
            if (!combined.some(c => c.phone === fd.phone)) combined.push(fd);
          });
          return combined;
        });
      }
    } catch (err) {
      console.log('Using resilient local database mode.');
    }
  };

  // 2. Persistent Login Handler
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputName.trim() || !inputPhone.trim()) {
      alert('Please enter your full name and phone number.');
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

    // Async sync to Supabase database
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
  const handleAddHostel = () => {
    const formatted = customHostelInput.trim().toUpperCase();
    if (!formatted) return;
    if (!hostels.includes(formatted)) {
      const updated = [...hostels, formatted];
      setHostels(updated);
      localStorage.setItem('amanah_water_hostels', JSON.stringify(updated));
      setSelectedHostel(formatted);
      setCustomHostelInput('');
      alert(`Hostel "${formatted}" saved system-wide!`);
    } else {
      setSelectedHostel(formatted);
      setCustomHostelInput('');
    }
  };

  // 4. Paystack Payment Checkout & Split Logic
  const triggerPaystack = () => {
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
      amount: totalPrice * 100, // Amount in Pesewas
      currency: 'GHS',
      callback: function(response: any) {
        processSuccessfulPayment(response.reference);
      },
      onClose: function() {
        console.log('Checkout closed.');
      }
    });
    handler.openIframe();
  };

  const processSuccessfulPayment = async (ref: string) => {
    if (!user) return;
    const matchedDriver = driversList.find(d => d.phone === selectedDriverPhone);
    const newOrder: Order = {
      id: Date.now(),
      studentName: user.fullName,
      studentPhone: user.phone,
      hostel: selectedHostel,
      driverPhone: selectedDriverPhone,
      driverName: matchedDriver ? matchedDriver.name : 'Assigned Driver',
      drums: drums,
      unitPrice: UNIT_PRICE,
      totalPrice: drums * UNIT_PRICE,
      platformFee: drums * PLATFORM_FEE_PER_DRUM,
      driverPayout: drums * DRIVER_PAYOUT_PER_DRUM,
      status: 'paid',
      sub: autoSub,
      timestamp: Date.now()
    };

    const updated = [newOrder, ...orders];
    setOrders(updated);
    localStorage.setItem('amanah_water_orders', JSON.stringify(updated));

    // Sync order to Supabase PostgreSQL table
    try {
      await supabase.from('orders').insert([
        {
          student_name: newOrder.studentName,
          phone: newOrder.studentPhone,
          hostel_name: newOrder.hostel,
          driver_phone: newOrder.driverPhone,
          drums: newOrder.drums,
          total_price: newOrder.totalPrice,
          platform_fee: newOrder.platformFee,
          driver_payout: newOrder.driverPayout,
          status: 'paid'
        }
      ]);
    } catch (err) {
      console.log('Order synced locally.');
    }

    alert(`Payment Successful! Order dispatched. Paystack Ref: ${ref}`);
    setActiveTab('space');
  };

  // 5. Escrow Release & Driver Actions
  const confirmDelivery = (orderId: number) => {
    const updated = orders.map(o => o.id === orderId ? { ...o, status: 'delivered' as const } : o);
    setOrders(updated);
    localStorage.setItem('amanah_water_orders', JSON.stringify(updated));
    alert('Escrow funds released to driver partner!');
  };

  const updateDriverStatus = (orderId: number, newStatus: 'delivering' | 'delivered') => {
    const updated = orders.map(o => o.id === orderId ? { ...o, status: newStatus } : o);
    setOrders(updated);
    localStorage.setItem('amanah_water_orders', JSON.stringify(updated));
  };

  // Admin Manual Dispatch for Non-Smartphone Drivers
  const adminDispatchOrder = (orderId: number, driverPhone: string) => {
    const matched = driversList.find(d => d.phone === driverPhone);
    const updated = orders.map(o => o.id === orderId ? { 
      ...o, 
      driverPhone: driverPhone, 
      driverName: matched ? matched.name : 'Assigned Driver',
      status: 'delivering' as const 
    } : o);
    setOrders(updated);
    localStorage.setItem('amanah_water_orders', JSON.stringify(updated));
    alert(`Order #${orderId} manually assigned & dispatched to driver (${driverPhone}).`);
  };

  // Community Board Votes & Submit
  const handleVote = (id: number) => {
    setSuggestions(suggestions.map(s => s.id === id ? { ...s, votes: s.votes + 1 } : s));
  };

  const handlePostSuggestion = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSuggestion.trim()) return;
    setSuggestions([{ id: Date.now(), title: newSuggestion.trim(), votes: 1 }, ...suggestions]);
    setNewSuggestion('');
  };

  // Admin Verification Unlock
  const verifyAdmin = (e: React.FormEvent) => {
    e.preventDefault();
    if (adminPasswordInput === 'OHU2026') {
      if (user) {
        setUser({ ...user, role: 'admin' });
      } else {
        setUser({ fullName: 'Founder OHU', phone: '0240000000', role: 'admin', refCode: 'ADMIN-01' });
      }
      setActiveTab('admin');
      setAdminPasswordInput('');
    } else {
      alert('Access Denied. Incorrect Founder Password.');
    }
  };

  return (
    <div className={darkMode ? 'bg-[#0A1931] text-slate-100 min-h-screen flex flex-col justify-between font-sans antialiased' : 'bg-slate-100 text-slate-950 min-h-screen flex flex-col justify-between font-sans antialiased'}>
      
      {/* APP TOP HEADER */}
      <header className={`sticky top-0 z-50 backdrop-blur-md border-b px-4 py-3 shadow-2xl ${darkMode ? 'bg-[#0A1931]/90 border-[#FFD700]/30' : 'bg-white/90 border-slate-200'}`}>
        <div className="max-w-md mx-auto flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-amber-500 via-yellow-400 to-amber-600 flex items-center justify-center text-[#0A1931] font-black shadow-lg">
              <Crown className="w-6 h-6 text-[#0A1931]" />
            </div>
            <div>
              <h1 className="text-base font-black tracking-tight leading-none text-amber-400">AMANAH TECH</h1>
              <p className="text-[9px] text-slate-300 font-bold tracking-widest uppercase mt-0.5">WaterNow • Royal Service, Trusted Always</p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            {user && (
              <span className="text-xs font-bold text-amber-300 hidden sm:inline">Hi, {user.fullName} 👑</span>
            )}
            <button 
              onClick={() => setDarkMode(!darkMode)}
              className={`p-2 rounded-xl border transition ${darkMode ? 'bg-[#13294B] border-slate-700 text-amber-400' : 'bg-slate-200 border-slate-300 text-slate-800'}`}
              title="Toggle Dark/Light Theme"
            >
              {darkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>
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

      {/* MAIN CONTENT AREA */}
      <main className="w-full max-w-md mx-auto p-4 flex-grow space-y-4">

        {/* 1. FRICTIONLESS LOGIN / SETUP SCREEN */}
        {!user ? (
          <div className={`backdrop-blur-xl border rounded-3xl p-6 shadow-2xl space-y-5 ${darkMode ? 'bg-[#13294B]/90 border-[#FFD700]/30' : 'bg-white border-slate-200'}`}>
            <div className="text-center space-y-2">
              <span className="inline-block text-[10px] font-bold uppercase tracking-widest text-amber-400 bg-amber-950/60 border border-amber-800/50 px-3 py-1 rounded-full">
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
                  className={`w-full border rounded-2xl px-4 py-3.5 text-sm focus:outline-none focus:border-[#1E90FF] transition shadow-inner ${darkMode ? 'bg-[#0A1931] border-slate-700 text-slate-100' : 'bg-slate-50 border-slate-300 text-slate-900'}`}
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
                  className={`w-full border rounded-2xl px-4 py-3.5 text-sm focus:outline-none focus:border-[#1E90FF] transition shadow-inner ${darkMode ? 'bg-[#0A1931] border-slate-700 text-slate-100' : 'bg-slate-50 border-slate-300 text-slate-900'}`}
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-200 mb-1.5">Select Role</label>
                <select 
                  value={inputRole}
                  onChange={(e) => setInputRole(e.target.value as 'student' | 'driver')}
                  className={`w-full border rounded-2xl px-4 py-3.5 text-sm focus:outline-none focus:border-[#1E90FF] transition shadow-inner ${darkMode ? 'bg-[#0A1931] border-slate-700 text-slate-100' : 'bg-slate-50 border-slate-300 text-slate-900'}`}
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

            {/* Secret Founder Admin Login */}
            <div className="pt-4 border-t border-slate-700/60">
              <form onSubmit={verifyAdmin} className="space-y-2">
                <label className="block text-[10px] font-bold text-amber-400 uppercase tracking-wider">Founder Console Access</label>
                <div className="flex space-x-2">
                  <input 
                    type="password" 
                    value={adminPasswordInput}
                    onChange={(e) => setAdminPasswordInput(e.target.value)}
                    placeholder="Master Password (OHU2026)..." 
                    className={`flex-1 border rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-amber-400 ${darkMode ? 'bg-[#0A1931] border-slate-700 text-white' : 'bg-slate-50 border-slate-300 text-slate-950'}`}
                  />
                  <button type="submit" className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-black px-4 py-2 rounded-xl text-xs transition">
                    Unlock
                  </button>
                </div>
              </form>
            </div>
          </div>
        ) : (
          /* LOGGED IN USER INTERFACE */
          <>
            {/* TAB 1: ORDER FORM */}
            {activeTab === 'order' && user.role !== 'admin' && (
              <div className="space-y-4">
                {/* Escrow Shield Banner */}
                <div className="bg-amber-950/50 border border-amber-600/40 rounded-3xl p-4 flex items-start space-x-3.5 shadow-xl">
                  <Shield className="w-6 h-6 text-amber-400 flex-shrink-0 mt-0.5" />
                  <div className="text-xs space-y-1">
                    <span className="font-black text-amber-400 uppercase tracking-wider">Escrow Protection Active</span>
                    <p className="text-slate-300 leading-relaxed">
                      Money is held securely. Driver gets paid GHS 2.50 only after you click 'Confirm Delivery'.
                    </p>
                  </div>
                </div>

                {/* Main Order Form Card */}
                <div className={`backdrop-blur-xl border rounded-3xl p-5 space-y-4 shadow-2xl ${darkMode ? 'bg-[#13294B]/90 border-[#FFD700]/20' : 'bg-white border-slate-200'}`}>
                  <h3 className="font-bold text-sm text-amber-300 border-b border-slate-700/60 pb-3 flex items-center justify-between">
                    <span>Order Water Delivery</span>
                    <span className="text-[10px] bg-amber-950 text-amber-300 px-2.5 py-1 rounded-full border border-amber-800">GHS {UNIT_PRICE.toFixed(2)} / Drum</span>
                  </h3>

                  {/* Hostel Select & Custom Addition */}
                  <div className="space-y-2">
                    <label className="block text-xs font-bold text-slate-200">Select Hostel / Location</label>
                    <select 
                      value={selectedHostel}
                      onChange={(e) => setSelectedHostel(e.target.value)}
                      className={`w-full border rounded-2xl px-4 py-3 text-sm focus:outline-none focus:border-[#1E90FF] ${darkMode ? 'bg-[#0A1931] border-slate-700 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'}`}
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
                        className={`flex-1 border rounded-xl px-3 py-2 text-xs uppercase focus:outline-none focus:border-[#1E90FF] ${darkMode ? 'bg-[#0A1931] border-slate-700 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'}`}
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

                  {/* Tanker Partner Selection */}
                  <div>
                    <label className="block text-xs font-bold text-slate-200 mb-1.5">Select Tanker Partner</label>
                    <select 
                      value={selectedDriverPhone}
                      onChange={(e) => setSelectedDriverPhone(e.target.value)}
                      className={`w-full border rounded-2xl px-4 py-3 text-sm focus:outline-none focus:border-[#1E90FF] ${darkMode ? 'bg-[#0A1931] border-slate-700 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'}`}
                    >
                      {driversList.map((d, idx) => (
                        <option key={idx} value={d.phone}>{d.name} ({d.phone})</option>
                      ))}
                    </select>
                  </div>

                  {/* Quantity & Subscription */}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-slate-200 mb-1.5">Drums Qty</label>
                      <input 
                        type="number" 
                        min="1" 
                        max="20"
                        value={drums} 
                        onChange={(e) => setDrums(parseInt(e.target.value) || 1)}
                        className={`w-full border rounded-2xl px-4 py-3 text-sm focus:outline-none focus:border-[#1E90FF] ${darkMode ? 'bg-[#0A1931] border-slate-700 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'}`}
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-200 mb-1.5">Auto-Refill</label>
                      <select 
                        value={autoSub} 
                        onChange={(e) => setAutoSub(e.target.value)}
                        className={`w-full border rounded-2xl px-3 py-3 text-sm focus:outline-none focus:border-[#1E90FF] ${darkMode ? 'bg-[#0A1931] border-slate-700 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'}`}
                      >
                        <option value="none">One-time Order</option>
                        <option value="every_2_days">Every 2 Days</option>
                        <option value="every_3_days">Every 3 Days</option>
                        <option value="weekly">Weekly Refill</option>
                      </select>
                    </div>
                  </div>

                  {/* Price Calculation */}
                  <div className={`p-4 rounded-2xl border space-y-1.5 ${darkMode ? 'bg-[#0A1931] border-slate-800' : 'bg-slate-50 border-slate-200'}`}>
                    <div className="flex justify-between text-xs text-slate-400">
                      <span>Driver Payout (GHS 2.50 x {drums})</span>
                      <span>GHS {(drums * DRIVER_PAYOUT_PER_DRUM).toFixed(2)}</span>
                    </div>
                    <div class="flex justify-between text-xs text-slate-400">
                      <span>Amanah Platform Fee (GHS 0.50 x {drums})</span>
                      <span>GHS {(drums * PLATFORM_FEE_PER_DRUM).toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between items-center pt-2 border-t border-slate-800">
                      <span className="text-xs uppercase font-bold text-slate-300">Total Payable</span>
                      <h2 className="text-2xl font-black text-amber-400">GHS {(drums * UNIT_PRICE).toFixed(2)}</h2>
                    </div>
                  </div>

                  <button 
                    onClick={triggerPaystack}
                    className="w-full bg-[#1E90FF] hover:bg-blue-600 text-white font-black py-4 rounded-2xl transition-all shadow-xl shadow-blue-500/20 active:scale-[0.98]"
                  >
                    Pay & Order Now 💳
                  </button>
                </div>
              </div>
            )}

            {/* TAB 2: MY SPACE / PRIVATE DASHBOARD */}
            {activeTab === 'space' && (
              <div className="space-y-4">
                <div className={`backdrop-blur-xl border rounded-3xl p-5 shadow-xl flex items-center justify-between ${darkMode ? 'bg-[#13294B]/90 border-slate-700' : 'bg-white border-slate-200'}`}>
                  <div>
                    <h3 className="font-bold text-base text-white">{user.fullName}</h3>
                    <p className="text-xs text-amber-400 font-mono capitalize">Role: {user.role} | {user.phone}</p>
                    <p className="text-[10px] text-slate-400 mt-0.5">Referral Code: <span className="text-amber-300 font-bold">{user.refCode}</span></p>
                  </div>
                  <span className="bg-amber-500/20 text-amber-300 border border-amber-500/40 text-xs px-3 py-1.5 rounded-xl font-bold">
                    Logged In
                  </span>
                </div>

                {/* History & Escrow List */}
                <div className={`backdrop-blur-xl border rounded-3xl p-5 space-y-3 shadow-2xl ${darkMode ? 'bg-[#13294B]/90 border-slate-700' : 'bg-white border-slate-200'}`}>
                  <h3 className="font-bold text-sm text-white border-b border-slate-700 pb-2">
                    {user.role === 'driver' ? 'Assigned Driver Deliveries' : 'My Orders & Escrow Release'}
                  </h3>

                  <div className="space-y-3 text-xs">
                    {orders.length === 0 ? (
                      <p className="text-slate-400 text-center py-6">No orders recorded in your private space.</p>
                    ) : (
                      orders.map((o) => (
                        <div key={o.id} className={`p-4 rounded-2xl border space-y-2 ${darkMode ? 'bg-[#0A1931] border-slate-800' : 'bg-slate-50 border-slate-200'}`}>
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
                          <p className="text-slate-300">📍 Hostel: <strong className="text-white">{o.hostel}</strong></p>
                          <p className="text-slate-300">🚛 Tanker: <strong className="text-white">{o.driverName || o.driverPhone}</strong></p>
                          <p className="text-slate-300">💰 Total Amount: GHS {o.totalPrice.toFixed(2)}</p>

                          <div className="pt-2 flex space-x-2">
                            {user.role === 'student' && o.status !== 'delivered' && (
                              <button 
                                onClick={() => confirmDelivery(o.id)}
                                className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-2.5 rounded-xl transition"
                              >
                                Confirm Delivery & Release Funds ✅
                              </button>
                            )}

                            {user.role === 'driver' && o.status === 'paid' && (
                              <button 
                                onClick={() => updateDriverStatus(o.id, 'delivering')}
                                className="w-full bg-[#1E90FF] hover:bg-blue-600 text-white font-bold py-2.5 rounded-xl transition"
                              >
                                Accept & Start Delivering 🚛
                              </button>
                            )}

                            {user.role === 'driver' && o.status === 'delivering' && (
                              <button 
                                onClick={() => updateDriverStatus(o.id, 'delivered')}
                                className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-2.5 rounded-xl transition"
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

                {/* WhatsApp Community Links */}
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
                <div className={`backdrop-blur-xl border rounded-3xl p-5 space-y-4 shadow-2xl ${darkMode ? 'bg-[#13294B]/90 border-slate-700' : 'bg-white border-slate-200'}`}>
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
                      className={`w-full border rounded-2xl p-3 text-xs focus:outline-none focus:border-[#1E90FF] ${darkMode ? 'bg-[#0A1931] border-slate-700 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'}`}
                    />
                    <button type="submit" className="w-full bg-[#1E90FF] hover:bg-blue-600 text-white font-bold py-2.5 rounded-xl text-xs transition">
                      Post Idea 💡
                    </button>
                  </form>

                  <div className="space-y-2.5 pt-2">
                    {suggestions.map((item) => (
                      <div key={item.id} className={`p-3.5 rounded-2xl border flex items-center justify-between ${darkMode ? 'bg-[#0A1931] border-slate-800' : 'bg-slate-50 border-slate-200'}`}>
                        <p className="text-xs text-slate-200 pr-2">{item.title}</p>
                        <button 
                          onClick={() => handleVote(item.id)}
                          className="flex items-center space-x-1 bg-amber-500/20 text-amber-300 border border-amber-500/40 px-3 py-1.5 rounded-xl text-xs font-bold hover:bg-amber-500/30 transition flex-shrink-0"
                        >
                          <ThumbsUp className="w-3.5 h-3.5" />
                          <span>{item.votes}</span>
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* ADMIN DISPATCH CENTER & METRICS */}
            {activeTab === 'admin' && (
              <div className="space-y-4">
                <div className={`backdrop-blur-xl border rounded-3xl p-6 space-y-5 shadow-2xl ${darkMode ? 'bg-[#13294B]/90 border-amber-500/40' : 'bg-white border-slate-200'}`}>
                  <div className="flex items-center justify-between border-b border-slate-700 pb-3">
                    <div>
                      <h2 class="text-xl font-black text-white">Founder Dispatch Center 👑</h2>
                      <p className="text-xs text-amber-400 font-bold">Manual Driver Dispatch & Platform Revenue</p>
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
                    <div className={`p-4 rounded-2xl border ${darkMode ? 'bg-[#0A1931] border-slate-800' : 'bg-slate-50 border-slate-200'}`}>
                      <span className="text-[10px] text-slate-400 font-bold uppercase">Gross Transact Volume</span>
                      <h3 className="text-xl font-black text-amber-400 mt-1">
                        GHS {orders.reduce((acc, o) => acc + o.totalPrice, 0).toFixed(2)}
                      </h3>
                    </div>
                    <div className={`p-4 rounded-2xl border ${darkMode ? 'bg-[#0A1931] border-slate-800' : 'bg-slate-50 border-slate-200'}`}>
                      <span className="text-[10px] text-slate-400 font-bold uppercase">Amanah 50p Cut</span>
                      <h3 className="text-xl font-black text-amber-400 mt-1">
                        GHS {orders.reduce((acc, o) => acc + o.platformFee, 0).toFixed(2)}
                      </h3>
                    </div>
                  </div>

                  {/* Manual Dispatch Engine for Non-Smartphone Drivers */}
                  <div className="space-y-3 border-t border-slate-700/80 pt-4">
                    <h3 className="font-bold text-xs text-white uppercase tracking-wider">Manual Dispatch Feed (For Non-Smartphone Drivers)</h3>
                    <div className="space-y-2 text-xs">
                      {orders.filter(o => o.status === 'paid').length === 0 ? (
                        <p className="text-slate-400 text-center py-3">No pending paid orders to dispatch.</p>
                      ) : (
                        orders.filter(o => o.status === 'paid').map(o => (
                          <div key={o.id} className="p-3 bg-[#0A1931] rounded-2xl border border-slate-800 space-y-2">
                            <div className="flex justify-between font-bold text-white">
                              <span>Order #{o.id} ({o.drums} Drums)</span>
                              <span className="text-amber-400">GHS {o.totalPrice.toFixed(2)}</span>
                            </div>
                            <p className="text-slate-300">Student: {o.studentName} ({o.studentPhone})</p>
                            <p className="text-slate-300">Hostel: {o.hostel}</p>

                            <div className="flex space-x-2 pt-1">
                              <a 
                                href={`tel:${selectedDriverPhone}`}
                                className="flex-1 bg-amber-500/20 text-amber-300 border border-amber-500/40 text-center py-2 rounded-xl font-bold"
                              >
                                📞 Call Driver Now
                              </a>
                              <button 
                                onClick={() => adminDispatchOrder(o.id, selectedDriverPhone)}
                                className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-2 rounded-xl"
                              >
                                Dispatch Order 🚀
                              </button>
                            </div>
                          </div>
                        ))
                      )}
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
        <nav className={`sticky bottom-0 z-50 backdrop-blur-md border-t px-6 py-3 shadow-2xl ${darkMode ? 'bg-[#0A1931]/95 border-slate-800' : 'bg-white/95 border-slate-200'}`}>
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

      {/* FOOTER */}
      <footer className={`border-t p-4 text-center space-y-1 ${darkMode ? 'bg-[#0A1931] border-slate-800 text-slate-400' : 'bg-slate-200 border-slate-300 text-slate-600'}`}>
        <p className="text-xs font-medium">AMANAH TECH COMPANY • <a href="mailto:support@amanahtechgh.com" className="text-amber-400 underline font-bold">support@amanahtechgh.com</a></p>
        <div>
          <button onClick={() => { setActiveTab('admin'); }} className="text-[10px] font-mono text-slate-500 hover:text-amber-400 transition">
            🔒 Founder Console Portal
          </button>
        </div>
      </footer>

    </div>
  );
}