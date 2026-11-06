'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Moon, Sun, ShieldAlert, Loader2 } from 'lucide-react';
import Script from 'next/script';

declare global {
  interface Window { PaystackPop: any; }
}

type Hostel = { id: string; name: string };

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

  const PRICE_PER_DRUM = 3.0;
  
  // I have hardcoded your Public Key here to bypass the .env.local issue
  const PAYSTACK_PUBLIC_KEY = 'pk_test_c7db46c73d705ea270a61b50c29c1fb99d4ad4ba';

  useEffect(() => {
    fetchHostels();
  }, []);

  async function fetchHostels() {
    const { data } = await supabase
      .from('hostels')
      .select('id, name')
      .order('name');
    if (data) setHostels(data);
  }

  async function handleOrder() {
    setMessage('');
    if (!phone || phone.length < 10) return setMessage('Enter a valid phone number.');
    if (!selectedHostel && !customHostel.trim())
      return setMessage('Select or enter your hostel.');

    setLoading(true);
    try {
      let hostelId = selectedHostel;

      if (showCustomHostel && customHostel.trim()) {
        const { data: newHostel, error: hostelErr } = await supabase
          .from('hostels')
          .insert({ name: customHostel.trim(), status: 'pending' })
          .select('id')
          .single();
        if (hostelErr) throw hostelErr;
        hostelId = newHostel.id;
      }

      const total = drums * PRICE_PER_DRUM;

      // 1. Save order to Supabase
      const { error } = await supabase.from('orders').insert({
        hostel_id: hostelId,
        drums,
        phone,
        total_price: total,
        status: 'pending_payment',
      });

      if (error) throw error;

      // 2. Trigger Paystack directly
      if (typeof window !== 'undefined' && window.PaystackPop) {
        const handler = window.PaystackPop.setup({
          key: PAYSTACK_PUBLIC_KEY, // Using the hardcoded key here
          email: 'student@waternow.com',
          amount: total * 100, 
          currency: 'GHS',
          phone: phone,
          callback: function (response: any) {
            setMessage(`✅ Payment Successful! Ref: ${response.reference}`);
            setDrums(1);
            setPhone('');
            setCustomHostel('');
            setSelectedHostel('');
            setShowCustomHostel(false);
            setLoading(false);
          },
          onClose: function () {
            setMessage('❌ Payment window closed.');
            setLoading(false);
          },
        });
        handler.openIframe();
      } else {
        throw new Error('Paystack script is still loading. Please refresh and try again.');
      }

    } catch (err: any) {
      setMessage('❌ ' + (err.message || 'Something went wrong.'));
      setLoading(false);
    }
  }

  return (
    <main className={dark ? 'dark' : ''}>
      <Script src="https://js.paystack.co/v1/inline.js" strategy="beforeInteractive" />
      
      <div className="min-h-screen bg-white dark:bg-[#0A1931] text-slate-900 dark:text-white transition-colors">
        <div className="max-w-md mx-auto px-5 py-6">
          
          <div className="flex items-center justify-between mb-6">
            <h1 className="text-2xl font-bold text-[#1E90FF]">WaterNow Tamale</h1>
            <button onClick={() => setDark(!dark)} className="p-2 rounded-lg bg-slate-100 dark:bg-slate-800">
              {dark ? <Sun size={18} /> : <Moon size={18} />}
            </button>
          </div>

          <div className="flex gap-3 p-4 mb-6 rounded-xl bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800">
            <ShieldAlert className="text-amber-600 shrink-0" size={20} />
            <p className="text-sm text-amber-800 dark:text-amber-200">
              Money held in escrow. Driver gets paid only after you confirm delivery within 90 mins. Otherwise, auto-refund.
            </p>
          </div>

          <label className="block text-sm font-medium mb-2">Your Hostel</label>
          <select
            value={selectedHostel}
            onChange={(e) => { setSelectedHostel(e.target.value); setShowCustomHostel(false); }}
            disabled={showCustomHostel}
            className="w-full p-3 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 mb-2"
          >
            <option value="">Select hostel...</option>
            {hostels.map((h) => (
              <option key={h.id} value={h.id}>{h.name}</option>
            ))}
          </select>

          <button
            onClick={() => { setShowCustomHostel(!showCustomHostel); setSelectedHostel(''); }}
            className="text-sm text-[#1E90FF] mb-4 underline"
          >
            {showCustomHostel ? '← Back to list' : "+ My hostel isn't listed"}
          </button>

          {showCustomHostel && (
            <input
              type="text"
              placeholder="Type your hostel name..."
              value={customHostel}
              onChange={(e) => setCustomHostel(e.target.value)}
              className="w-full p-3 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 mb-4"
            />
          )}

          <label className="block text-sm font-medium mb-2">
            Drums: <span className="text-[#1E90FF] font-bold">{drums}</span>
          </label>
          <input
            type="range" min={1} max={10} value={drums}
            onChange={(e) => setDrums(Number(e.target.value))}
            className="w-full mb-4 accent-[#1E90FF]"
          />

          <label className="block text-sm font-medium mb-2">Phone Number</label>
          <input
            type="tel" placeholder="024XXXXXXX" value={phone}
            onChange={(e) => setPhone(e.target.value)}
            className="w-full p-3 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 mb-4"
          />

          <div className="flex items-center justify-between mb-4">
            <span className="text-sm text-slate-500">Total</span>
            <span className="text-xl font-bold text-[#1E90FF]">GHS {(drums * PRICE_PER_DRUM).toFixed(2)}</span>
          </div>

          <button
            onClick={handleOrder} disabled={loading}
            className="w-full py-3 rounded-xl bg-[#1E90FF] hover:bg-[#1a7fd6] text-white font-semibold flex items-center justify-center gap-2 disabled:opacity-60"
          >
            {loading && <Loader2 className="animate-spin" size={18} />}
            {loading ? 'Processing...' : 'Pay & Order'}
          </button>

          {message && <p className="mt-4 text-center text-sm font-medium">{message}</p>}
        </div>
      </div>
    </main>
  );
}