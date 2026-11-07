'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Truck, CheckCircle, Loader2 } from 'lucide-react';

export default function DriverPortal() {
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchOrders();
  }, []);

  async function fetchOrders() {
    setLoading(true);
    // Fetch ONLY paid orders
    const { data } = await supabase
      .from('orders')
      .select('*, hostels(name)')
      .eq('status', 'paid')
      .order('created_at');
    
    if (data) setOrders(data);
    setLoading(false);
  }

  async function markDelivered(orderId: string) {
    const { error } = await supabase
      .from('orders')
      .update({ status: 'delivered' })
      .eq('id', orderId);
      
    if (!error) {
      setOrders(orders.filter(o => o.id !== orderId));
      alert("Order marked as delivered! Please collect your cash.");
    }
  }

  if (loading) return <div className="min-h-screen bg-[#0A1931] flex justify-center items-center"><Loader2 className="animate-spin text-[#1E90FF]" size={48}/></div>;

  return (
    <div className="min-h-screen bg-[#0A1931] text-white p-5 pb-20 font-sans">
      <div className="max-w-md mx-auto">
        
        <div className="flex justify-between items-center mb-8 border-b border-slate-700 pb-4">
          <div>
            <h1 className="text-2xl font-black text-[#FFD700] uppercase tracking-widest">Driver Portal</h1>
            <p className="text-slate-400 text-sm">Amanah Tech Dispatch</p>
          </div>
        </div>

        <h2 className="text-lg font-bold mb-4 flex items-center gap-2"><Truck className="text-[#1E90FF]" /> Ready for Delivery</h2>
        
        {orders.length === 0 ? <p className="text-slate-400 text-center py-10 bg-[#13294B] rounded-xl border border-slate-700">No paid orders right now. Wait for the next one!</p> : (
          <div className="space-y-4 mb-8">
            {orders.map(order => (
              <div key={order.id} className="bg-[#13294B] p-4 rounded-xl border border-slate-700 shadow-lg">
                <div className="flex justify-between items-start mb-2">
                   <h3 className="font-bold text-lg text-white">{order.hostels?.name}</h3>
                   <span className="bg-[#1E90FF]/20 text-[#1E90FF] px-2 py-1 rounded text-xs font-bold">{order.drums} Drums</span>
                </div>
                <p className="text-sm text-slate-300 mb-4">Student Phone: <span className="font-mono text-white">{order.phone}</span></p>
                
                <button onClick={() => markDelivered(order.id)} className="w-full bg-green-500 hover:bg-green-600 text-white py-3 rounded-lg font-bold flex items-center justify-center gap-2 transition-transform active:scale-95">
                  <CheckCircle size={18} /> Mark Delivered
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}