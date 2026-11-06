'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Truck, CheckCircle, Loader2, Phone } from 'lucide-react';

export default function SellerDashboard() {
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchOrders();
  }, []);

  async function fetchOrders() {
    setLoading(true);
    // SECURITY: Only fetch orders that have been PAID for
    const { data, error } = await supabase
      .from('orders')
      .select(`
        *,
        hostels (name)
      `)
      .eq('status', 'paid') // We only show paid orders to drivers
      .order('created_at', { ascending: true });
      
    if (data) setOrders(data);
    setLoading(false);
  }

  async function markAsDelivered(orderId: string) {
    const { error } = await supabase
      .from('orders')
      .update({ status: 'delivered' })
      .eq('id', orderId);

    if (!error) {
      // Remove it from the screen instantly
      setOrders(orders.filter((o) => o.id !== orderId));
    } else {
      alert('Error updating order: ' + error.message);
    }
  }

  return (
    <div className="min-h-screen bg-[#0A1931] text-white p-5">
      <div className="max-w-md mx-auto">
        
        <div className="flex items-center gap-3 mb-8 border-b border-slate-700 pb-4">
          <div className="bg-[#1E90FF] p-2 rounded-full">
            <Truck size={24} className="text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold">Driver Portal</h1>
            <p className="text-sm text-slate-400">WaterNow Tamale</p>
          </div>
        </div>

        <h2 className="text-lg font-semibold mb-4">Active Deliveries</h2>

        {loading ? (
          <div className="flex justify-center py-10">
            <Loader2 className="animate-spin text-[#1E90FF]" size={32} />
          </div>
        ) : orders.length === 0 ? (
          <div className="text-center py-10 bg-slate-800 rounded-xl border border-slate-700">
            <p className="text-slate-400">No active paid orders right now.</p>
            <p className="text-sm text-slate-500 mt-2">Waiting for students to pay...</p>
          </div>
        ) : (
          <div className="space-y-4">
            {orders.map((order) => (
              <div key={order.id} className="bg-slate-800 p-4 rounded-xl border border-slate-700 shadow-lg">
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <h3 className="font-bold text-lg text-white">
                      {order.hostels?.name || 'Unknown Hostel'}
                    </h3>
                    <a href={`tel:${order.phone}`} className="text-sm text-[#1E90FF] flex items-center gap-1 mt-1">
                      <Phone size={14} /> {order.phone}
                    </a>
                  </div>
                  <div className="bg-[#1E90FF]/20 text-[#1E90FF] px-3 py-1 rounded-full text-sm font-bold">
                    {order.drums} Drums
                  </div>
                </div>

                <div className="flex justify-between items-center mt-4 pt-4 border-t border-slate-700">
                  <span className="text-green-400 font-bold">
                    GHS {order.total_price.toFixed(2)}
                  </span>
                  <button
                    onClick={() => markAsDelivered(order.id)}
                    className="flex items-center gap-2 bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-lg text-sm font-semibold transition-colors"
                  >
                    <CheckCircle size={16} /> Delivered
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}