'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@supabase/supabase-js'; // Hardcoded Supabase import
import { Moon, Sun, ShieldAlert, Loader2, Crown, MessageSquare, ThumbsUp, Send, Calendar } from 'lucide-react';
import Script from 'next/script';

declare global {
  interface Window { PaystackPop: any; }
}

// 🔥 HARDCODED SUPABASE KEYS (Temporary fix for Vercel issue)
const supabaseUrl = 'https://udhzthqswvgbklmhkmzj.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVkaHp0aHFzd3ZnYmtsbWtobXpqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTM3MTI4NDksImV4cCI6MjEwOTI4ODg0OX0.E-r7y4RVq9sNfGcl2e7N25oRnuoWfdlVgteP3mtmUfQ';
const supabase = createClient(supabaseUrl, supabaseKey);

type Hostel = { id: string; name: string };
type Suggestion = { id: string; title: string; votes: number };

export default function Home() {
  const [dark, setDark] = useState(false);
  
  const [hostels, setHostels] = useState<Hostel[]>([]);
  const [selectedHostel, setSelectedHostel] = useState('');
  const [showCustomHostel, setShowCustomHostel] = useState(false);
  const [customHostel, setCustomHostel] = useState('');
  const [drums, setDrums] = useState(1);
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [subDays, setSubDays] = useState('5');

  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [newSuggestion, setNewSuggestion] = useState('');
  const [posting, setPosting] = useState(false);

  const PRICE_PER_DRUM = 3.0;
  
  // 🔥 HARDCODED PAYSTACK KEY (Temporary fix for Vercel issue)
  const PAYSTACK_PUBLIC_KEY = 'pk_live_b0f896380e67a59dc530e54d85b8ac76a6070fd4';

  useEffect(() => {
    fetchHostels();
    fetchSuggestions();
  }, []);

  async function fetchHostels() {
    const { data, error } = await supabase.from('hostels').select('id, name').order('name');
    if (error) console.error("Hostel Fetch Error:", error);
    if (data) setHostels(data);
  }

  async function fetchSuggestions() {
    const { data } = await supabase.from('suggestions').select('*').order('votes', { ascending: false });
    if (data) setSuggestions(data);
  }

  async function handleOrder() {
    setMessage('');
    if (!phone || phone.length < 10) return setMessage('Enter a valid phone number.');
    if (!selectedHostel && !customHostel.trim()) return setMessage('Select or enter your hostel.');

    setLoading(true);
    try {
      let hostelId = selectedHostel;
      if (showCustomHostel && customHostel.trim()) {
        const { data: newHostel, error: hostelErr } = await supabase
          .from('hostels').insert({ name: customHostel.trim(), status: 'pending' }).select('id').single();
        if (hostelErr) throw new Error("Database failed to save hostel. Check Supabase RLS.");
        hostelId = newHostel.id;
      }

      const total = drums * PRICE_PER_DRUM;
      
      const { error: orderError } = await supabase.from('orders').insert({
        hostel_id: hostelId, drums, phone, total_price: total, status: 'pending_payment',
      });
      if (orderError) throw new Error("Database failed to save order. Check Supabase RLS.");

      if (typeof window !== 'undefined' && window.PaystackPop) {
        const handler = window.PaystackPop.setup({
          key: PAYSTACK_PUBLIC_KEY,
          email: 'student@waternow.com',
          amount: total * 100, 
          currency: 'GHS',
          phone: phone,
          callback: function (response: any) {
            setMessage(`✅ Payment Successful! Ref: ${response.reference}`);
            setDrums(1); setPhone(''); setCustomHostel(''); setSelectedHostel(''); setShowCustomHostel(false);
            setLoading(false);
          },
          onClose: function () {
            setMessage('❌ Payment window closed.'); setLoading(false);
          },
        });
        handler.openIframe();
      } else {
        throw new Error("Paystack library not loaded. Check internet.");
      }
    } catch (err: any) {
      console.error("🚨 FULL ERROR:", err);
      setMessage('❌ ' + (err.message || 'Something went wrong.'));
      setLoading(false);
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
                <p className="text-[10px] text-slate-300 tracking-widest uppercase">Amanah = Trust</p>
              </div>
            </div>
            <button onClick={() => setDark(!dark)} className="p-2 rounded-full bg-[#13294B] border border-slate-600 hover:border-[#FFD700] transition-colors">
              {dark ? <Sun size={18} className="text-[#FFD700]" /> : <Moon size={18} className="text-[#FFD700]" />}
            </button>
          </div>
        </div>

        <div className="max-w-md mx-auto px-5 py-6">
          
          <div className="bg-white dark:bg-[#13294B] p-5 rounded-2xl shadow-lg border border-slate-200 dark:border-slate-700 mb-8">
            <div className="flex gap-3 p-3 mb-5 rounded-xl bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800">
              <ShieldAlert className="text-amber-600 shrink-0 mt-0.5" size={16} />
              <p className="text-xs text-amber-800 dark:text-amber-200 leading-relaxed">
                <strong>Escrow Protection:</strong> Driver gets paid only after you confirm delivery within 90 mins.
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

            <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1 uppercase">Quantity (Drums)</label>
            <div className="flex items-center gap-4 mb-4">
              <input
                type="range" min={1} max={10} value={drums}
                onChange={(e) => setDrums(Number(e.target.value))}
                className="w-full accent-[#1E90FF]"
              />
              <span className="bg-[#1E90FF] text-white font-bold px-3 py-1 rounded-lg">{drums}</span>
            </div>

            <div className="mb-4 bg-blue-50 dark:bg-[#0A1931] p-3 rounded-xl border border-blue-100 dark:border-slate-700">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-blue-900 dark:text-blue-200 flex items-center gap-1">
                  <Calendar size={14} /> Auto-Delivery
                </span>
                <input 
                  type="checkbox" 
                  checked={isSubscribed} 
                  onChange={(e) => setIsSubscribed(e.target.checked)}
                  className="w-4 h-4 accent-[#1E90FF]" 
                />
              </div>
              {isSubscribed && (
                <select 
                  value={subDays} 
                  onChange={(e) => setSubDays(e.target.value)}
                  className="w-full p-2 rounded-lg text-xs bg-white dark:bg-[#13294B] border border-blue-200 dark:border-slate-700 mt-1"
                >
                  <option value="1">Deliver every 1 Day (Everyday)</option>
                  <option value="2">Deliver every 2 Days</option>
                  <option value="3">Deliver every 3 Days</option>
                  <option value="4">Deliver every 4 Days</option>
                  <option value="5">Deliver every 5 Days</option>
                  <option value="6">Deliver every 6 Days</option>
                  <option value="7">Deliver every 7 Days (Every Week)</option>
                </select>
              )}
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

          <div className="bg-white dark:bg-[#13294B] p-5 rounded-2xl shadow-lg border border-slate-200 dark:border-slate-700 mb-6">
            <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
              <MessageSquare className="text-[#1E90FF]" size={20} /> Community Board
            </h2>
            <div className="flex gap-2 mb-6">
              <input
                type="text" placeholder="I need a bus to Kumasi..."
                value={newSuggestion} onChange={(e) => setNewSuggestion(e.target.value)}
                className="flex-1 p-3 rounded-xl bg-slate-50 dark:bg-[#0A1931] border border-slate-200 dark:border-slate-700 text-sm"
              />
              <button onClick={submitSuggestion} disabled={posting} className="bg-[#1E90FF] text-white p-3 rounded-xl disabled:opacity-50">
                {posting ? <Loader2 className="animate-spin" size={18} /> : <Send size={18} />}
              </button>
            </div>
            <div className="space-y-3">
              {suggestions.map((s) => (
                <div key={s.id} className="flex items-center justify-between p-3 bg-slate-50 dark:bg-[#0A1931] rounded-xl border border-slate-200 dark:border-slate-700">
                  <p className="text-sm font-medium pr-4">{s.title}</p>
                  <button onClick={() => upvote(s.id, s.votes)} className="flex flex-col items-center justify-center bg-white dark:bg-[#13294B] px-3 py-1 rounded-lg border border-slate-200 dark:border-slate-700 hover:border-[#1E90FF]">
                    <ThumbsUp size={14} className="text-[#1E90FF] mb-1" />
                    <span className="text-xs font-bold">{s.votes}</span>
                  </button>
                </div>
              ))}
            </div>
          </div>

          <div className="text-center pb-8">
            <p className="text-xs text-slate-500 mb-3 font-bold uppercase tracking-widest">Join the Royal Community</p>
            <div className="flex justify-center gap-3">
              <a href="https://whatsapp.com/channel/0029Vb9B2beCxoB2aVHEkO1V" target="_blank" rel="noreferrer" className="text-xs bg-green-100 text-green-700 font-bold px-4 py-2 rounded-full border border-green-200 hover:bg-green-200 transition-colors">
                WhatsApp Channel
              </a>
              <a href="https://chat.whatsapp.com/BU1TrgPslJFFV4A2BcuwpH" target="_blank" rel="noreferrer" className="text-xs bg-blue-100 text-blue-700 font-bold px-4 py-2 rounded-full border border-blue-200 hover:bg-blue-200 transition-colors">
                Join Community
              </a>
            </div>
          </div>
        </div>

        <button 
          onClick={() => alert("👑 Welcome Royal! I am Princess AI.")}
          className="fixed bottom-6 right-6 bg-gradient-to-r from-[#FFD700] to-yellow-500 text-[#0A1930] p-4 rounded-full shadow-[0_0_20px_rgba(255,215,0,0.6)] hover:scale-110 transition-transform z-50 flex items-center justify-center border-2 border-white"
        >
          <Crown size={28} />
        </button>
      </div>
    </main>
  );
}