'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Moon, Sun, ShieldAlert, Loader2, Crown, MessageSquare, ThumbsUp, Send, Calendar, User, Truck, CheckCircle } from 'lucide-react';
import Script from 'next/script';
import Link from 'next/link';

declare global {
  interface Window { PaystackPop: any; }
}

type Hostel = { id: string; name: string };
type Driver = { id: string; full_name: string }; // Now pulling from profiles
type Suggestion = { id: string; title: string; votes: number };

export default function Home() {
  const [dark, setDark] = useState(false);
  const [hostels, setHostels] = useState<Hostel[]>([]);
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [myOrders, setMyOrders] = useState<any[]>([]);
  
  const [selectedHostel, setSelectedHostel] = useState('');
  const [selectedDriver, setSelectedDriver] = useState('');
  const [showCustomHostel, setShowCustomHostel] = useState(false);
  const [customHostel, setCustomHostel] = useState('');
  const [drums, setDrums] = useState(1);
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [newSuggestion, setNewSuggestion] = useState('');
  const [posting, setPosting] = useState(false);

  const PRICE_PER_DRUM = 3.0;
  const PAYSTACK_PUBLIC_KEY = process.env.NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY!;

  useEffect(() => {
    fetchHostels();
    fetchDrivers();
    fetchSuggestions();
    fetchMyOrders();
  }, []);

  async function fetchHostels() {
    const { data } = await supabase.from('hostels').select('id, name').order('name');
    if (data) setHostels(data);
  }

  async function fetchDrivers() {
    // Pull REAL drivers who registered via the Login page
    const { data } = await supabase.from('profiles').select('id, full_name').eq('role', 'driver');
    if (data) setDrivers(data);
  }

  async function fetchSuggestions() {
    const { data } = await supabase.from('suggestions').select('*').order('votes', { ascending: false });
    if (data) setSuggestions(data);
  }

  async function fetchMyOrders() {
    // For MVP without forced student login, fetch recent orders to show the confirm button
    const { data } = await supabase.from('orders').select('*, hostels(name), profiles(full_name)').order('created_at', { ascending: false }).limit(5);
    if (data) setMyOrders(data);
  }

  async function handleOrder() {
    setMessage('');
    if (!phone || phone.length < 10) return setMessage('Enter a valid phone number.');
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
      // Save driver_id (from profiles) into orders table
      const { error: orderError } = await supabase.from('orders').insert({
        hostel_id: hostelId, 
        driver_id: selectedDriver, // Linked to real profile
        drums, 
        phone, 
        total_price: total, 
        status: 'pending_payment',
      });
      if (orderError) throw new Error("Database failed to save order.");

      if (typeof window !== 'undefined' && window.PaystackPop) {
        const handler = window.PaystackPop.setup({
          key: PAYSTACK_PUBLIC_KEY,
          email: 'guest@waternow.com',
          amount: total * 100, 
          currency: 'GHS',
          phone: phone,
          callback: function (response: any) {
            setMessage(`✅ Payment Successful! Water is on the way.`);
            setDrums(1); setPhone(''); setCustomHostel(''); setSelectedHostel(''); setShowCustomHostel(false); setSelectedDriver('');
            fetchMyOrders();
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

  // This is the Escrow Release Button
  async function confirmDelivery(orderId: string) {
    const { error } = await supabase.from('orders').update({ status: 'delivered' }).eq('id', orderId);
    if (!error) {
      alert("Delivery Confirmed! The driver has been paid.");
      fetchMyOrders();
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

  return (
    <main className={dark ? 'dark' : ''}>
      <Script src="https://js.paystack.co/v1/inline.js" strategy="beforeInteractive" />
      <div className="min-h-screen bg-slate-50 dark:bg-[#0A1931] text-slate-900 dark:text-white transition-colors pb-20 relative font-sans">
        
        <div className="bg-[#0A1931] text-white shadow-lg sticky top-0 z-10 px-5 py-4 border-b-2 border-[#FFD700]">
          <div className="max-w-md mx-auto flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="bg-[#13294B] p-2 rounded-full border border-[#FFD700]">
                <Crown size={20} className="text-[#FFD700]" />
              </div>
              <div>
                <h1 className="text-lg font-black text-[#FFD700] tracking-widest uppercase">Amanah Tech</h1>
              </div>
            </div>
            <div className="flex gap-2">
              <Link href="/login" className="p-2 rounded-full bg-[#13294B] border border-slate-600 hover:border-[#FFD700]">
                <User size={18} className="text-[#FFD700]" />
              </Link>
              <button onClick={() => setDark(!dark)} className="p-2 rounded-full bg-[#13294B] border border-slate-600 hover:border-[#FFD700]">
                {dark ? <Sun size={18} className="text-[#FFD700]" /> : <Moon size={18} className="text-[#FFD700]" />}
              </button>
            </div>
          </div>
        </div>

        <div className="max-w-md mx-auto px-5 py-6">
          
          <div className="bg-white dark:bg-[#13294B] p-5 rounded-2xl shadow-lg border border-slate-200 dark:border-slate-700 mb-8">
            <div className="flex gap-3 p-3 mb-5 rounded-xl bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800">
              <ShieldAlert className="text-amber-600 shrink-0 mt-0.5" size={16} />
              <p className="text-xs text-amber-800 dark:text-amber-200 leading-relaxed">
                <strong>Escrow Protection:</strong> Your money is held safely. Driver gets paid only after you click "Confirm Delivery".
              </p>
            </div>

            <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1 uppercase">Deliver To</label>
            <select
              value={selectedHostel}
              onChange={(e) => { setSelectedHostel(e.target.value); setShowCustomHostel(false); }}
              disabled={showCustomHostel}
              className="w-full p-3 rounded-xl bg-slate-50 dark:bg-[#0A1931] border border-slate-200 dark:border-slate-700 mb-2 font-medium"
            >
              <option value="">Select hostel...</option>
              {hostels.map((h) => <option key={h.id} value={h.id}>{h.name}</option>)}
            </select>

            <button
              onClick={() => { setShowCustomHostel(!showCustomHostel); setSelectedHostel(''); }}
              className="text-xs text-[#1E90FF] font-semibold mb-4 hover:underline"
            >
              {showCustomHostel ? '← Back to list' : "+ My hostel isn't listed"}
            </button>

            {showCustomHostel && (
              <input
                type="text" placeholder="Enter your hostel name..." value={customHostel}
                onChange={(e) => setCustomHostel(e.target.value)}
                className="w-full p-3 rounded-xl bg-slate-50 dark:bg-[#0A1931] border border-slate-200 dark:border-slate-700 mb-4"
              />
            )}

            {/* REAL DRIVER SELECTION */}
            <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1 uppercase mt-2">Choose Your Driver</label>
            <select
              value={selectedDriver}
              onChange={(e) => setSelectedDriver(e.target.value)}
              className="w-full p-3 rounded-xl bg-slate-50 dark:bg-[#0A1931] border border-slate-200 dark:border-slate-700 mb-4 font-medium"
            >
              <option value="">Select driver...</option>
              {drivers.map((d) => <option key={d.id} value={d.id}>{d.full_name}</option>)}
            </select>

            <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1 uppercase">Quantity (Drums)</label>
            <div className="flex items-center gap-4 mb-4">
              <input
                type="range" min={1} max={10} value={drums}
                onChange={(e) => setDrums(Number(e.target.value))}
                className="w-full accent-[#1E90FF]"
              />
              <span className="bg-[#1E90FF] text-white font-bold px-3 py-1 rounded-lg">{drums}</span>
            </div>

            <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1 uppercase">Phone Number</label>
            <input
              type="tel" placeholder="024XXXXXXX" value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="w-full p-3 rounded-xl bg-slate-50 dark:bg-[#0A1931] border border-slate-200 dark:border-slate-700 mb-6"
            />

            <div className="flex items-center justify-between mb-4 border-t border-slate-200 dark:border-slate-700 pt-4">
              <span className="text-sm font-medium text-slate-500">Total to pay</span>
              <span className="text-2xl font-black text-[#1E90FF]">GHS {(drums * PRICE_PER_DRUM).toFixed(2)}</span>
            </div>

            <button
              onClick={handleOrder} disabled={loading}
              className="w-full py-4 rounded-xl bg-[#1E90FF] hover:bg-[#1a7fd6] text-white font-bold text-lg shadow-lg flex items-center justify-center gap-2 transition-transform active:scale-95 disabled:opacity-50"
            >
              {loading && <Loader2 className="animate-spin" size={20} />}
              {loading ? 'Processing...' : 'Pay & Order Now'}
            </button>
            {message && <p className="mt-4 text-center text-sm font-bold p-2 bg-slate-100 dark:bg-[#0A1931] rounded-lg">{message}</p>}
          </div>

          {/* MY ORDERS - ESCROW CONFIRMATION */}
          {myOrders.length > 0 && (
            <div className="bg-white dark:bg-[#13294B] p-5 rounded-2xl shadow-lg border border-slate-200 dark:border-slate-700 mb-8">
              <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
                <Truck className="text-[#1E90FF]" size={20} /> My Recent Orders
              </h2>
              <div className="space-y-3">
                {myOrders.map((order) => (
                  <div key={order.id} className="flex flex-col p-3 bg-slate-50 dark:bg-[#0A1931] rounded-xl border border-slate-200 dark:border-slate-700">
                    <div className="flex justify-between items-center mb-1">
                      <p className="text-sm font-bold">{order.hostels?.name} ({order.drums} Drums)</p>
                      <span className={`text-[10px] font-bold px-2 py-1 rounded-md ${order.status === 'delivered' ? 'bg-green-500/20 text-green-500' : 'bg-amber-500/20 text-amber-500'}`}>
                        {order.status.toUpperCase()}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 mb-2">Driver: {order.profiles?.full_name || 'Assigned'}</p>
                    
                    {/* The Escrow Release Button */}
                    {order.status !== 'delivered' && (
                      <button onClick={() => confirmDelivery(order.id)} className="mt-2 bg-green-500 text-white py-2 rounded-lg text-sm font-bold flex items-center justify-center gap-2">
                        <CheckCircle size={16} /> Confirm Delivery & Release Funds
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

        </div>
      </div>
    </main>
  );
}