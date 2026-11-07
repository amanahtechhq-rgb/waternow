'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import { Moon, Sun, ShieldAlert, Loader2, Crown, MessageSquare, ThumbsUp, Send, Calendar, User, LogOut } from 'lucide-react';
import Script from 'next/script';
import Link from 'next/link';

declare global {
  interface Window { PaystackPop: any; }
}

type Hostel = { id: string; name: string };
type Suggestion = { id: string; title: string; votes: number };

export default function Home() {
  const router = useRouter();
  const [dark, setDark] = useState(false);
  const [session, setSession] = useState<any>(null);
  const [checkingAuth, setCheckingAuth] = useState(true);
  
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
  const PAYSTACK_PUBLIC_KEY = process.env.NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY!;

  useEffect(() => {
    // 1. Check if user is logged in
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        router.push('/login');
      } else {
        setSession(session);
        // 2. Check role (Kick drivers out of student page)
        supabase.from('profiles').select('role').eq('id', session.user.id).single().then(({ data }) => {
          if (data?.role === 'driver') {
            router.push('/driver');
          } else {
            setCheckingAuth(false);
            fetchHostels();
            fetchSuggestions();
          }
        });
      }
    });
  }, [router]);

  async function fetchHostels() {
    const { data } = await supabase.from('hostels').select('id, name').order('name');
    if (data) setHostels(data);
  }

  async function fetchSuggestions() {
    const { data } = await supabase.from('suggestions').select('*').order('votes', { ascending: false });
    if (data) setSuggestions(data);
  }

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push('/login');
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
        if (hostelErr) throw new Error("Database failed to save hostel.");
        hostelId = newHostel.id;
      }

      const total = drums * PRICE_PER_DRUM;
      const { error: orderError } = await supabase.from('orders').insert({
        hostel_id: hostelId, drums, phone, total_price: total, status: 'pending_payment',
      });
      if (orderError) throw new Error("Database failed to save order.");

      if (typeof window !== 'undefined' && window.PaystackPop) {
        const handler = window.PaystackPop.setup({
          key: PAYSTACK_PUBLIC_KEY,
          email: session.user.email,
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
      }
    } catch (err: any) {
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

  if (checkingAuth) {
    return <div className="min-h-screen bg-[#0A1931] flex justify-center items-center"><Loader2 className="animate-spin text-[#1E90FF]" size={48}/></div>;
  }

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
              </div>
            </div>
            <div className="flex gap-2">
              <button onClick={handleLogout} className="p-2 rounded-full bg-[#13294B] border border-red-500/50 hover:bg-red-500/20 text-red-400">
                <LogOut size={18} />
              </button>
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
        </div>
      </div>
    </main>
  );
}