'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { DollarSign, Droplets, MapPin, CheckCircle, Loader2 } from 'lucide-react';

export default function AdminDashboard() {
  const [orders, setOrders] = useState<any[]>([]);
  const [pendingHostels, setPendingHostels] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    setLoading(true);
    
    // 1. Fetch all orders to calculate profit
    const { data: ordersData } = await supabase
      .from('orders')
      .select('*, hostels(name)')
      .order('created_at', { ascending: false });
    if (ordersData) setOrders(ordersData);

    // 2. Fetch pending hostels
    const { data: hostelsData } = await supabase
      .from('hostels')
      .select('*')
      .eq('status', 'pending');
    if (hostelsData) setPendingHostels(hostelsData);

    setLoading(false);
  }

  async function approveHostel(hostelId: string) {
    const { error } = await supabase
      .from('hostels')
      .update({ status: 'approved' })
      .eq('id', hostelId);

    if (!error) {
      setPendingHostels(pendingHostels.filter((h) => h.id !== hostelId));
    }
  }

  // Calculate Metrics
  const totalDrums = orders.reduce((sum, order) => sum + order.drums, 0);
  const totalProfit = totalDrums * 0.50; // Your GHS 0.50 per drum cut
  const totalRevenue = orders.reduce((sum, order) => sum + order.total_price, 0);
  const escrowHeld = orders.filter(o => o.status === 'pending_payment' || o.status === 'paid').reduce((sum, order) => sum + order.total_price, 0);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 p-5">
      <div className="max-w-4xl mx-auto">
        
        <div className="mb-8 border-b pb-4">
          <h1 className="text-3xl font-bold text-[#0A1931]">Amanah Tech Admin</h1>
          <p className="text-slate-500">WaterNow Tamale - Command Center</p>
        </div>

        {loading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="animate-spin text-[#1E90FF]" size={40} />
          </div>
        ) : (
          <>
            {/* Metrics Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
              <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                <div className="flex items-center gap-3 mb-2">
                  <div className="p-2 bg-green-100 rounded-lg"><DollarSign className="text-green-600" size={20} /></div>
                  <h2 className="font-semibold text-slate-600">Total Profit</h2>
                </div>
                <p className="text-3xl font-bold text-green-600">GHS {totalProfit.toFixed(2)}</p>
              </div>

              <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                <div className="flex items-center gap-3 mb-2">
                  <div className="p-2 bg-blue-100 rounded-lg"><Droplets className="text-blue-600" size={20} /></div>
                  <h2 className="font-semibold text-slate-600">Total Drums Sold</h2>
                </div>
                <p className="text-3xl font-bold text-[#1E90FF]">{totalDrums}</p>
              </div>

              <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                <div className="flex items-center gap-3 mb-2">
                  <div className="p-2 bg-amber-100 rounded-lg"><MapPin className="text-amber-600" size={20} /></div>
                  <h2 className="font-semibold text-slate-600">Escrow Held</h2>
                </div>
                <p className="text-3xl font-bold text-amber-600">GHS {escrowHeld.toFixed(2)}</p>
              </div>
            </div>

            {/* Pending Hostels Section */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 mb-8">
              <div className="p-4 border-b border-slate-200 bg-slate-50 rounded-t-xl">
                <h2 className="font-bold text-lg text-[#0A1931]">Pending Hostel Approvals</h2>
              </div>
              <div className="p-4">
                {pendingHostels.length === 0 ? (
                  <p className="text-slate-500 text-sm">No pending hostels to approve.</p>
                ) : (
                  <div className="space-y-2">
                    {pendingHostels.map((hostel) => (
                      <div key={hostel.id} className="flex justify-between items-center p-3 bg-amber-50 border border-amber-100 rounded-lg">
                        <span className="font-medium">{hostel.name}</span>
                        <button
                          onClick={() => approveHostel(hostel.id)}
                          className="flex items-center gap-1 bg-green-500 hover:bg-green-600 text-white px-3 py-1.5 rounded-lg text-sm font-semibold"
                        >
                          <CheckCircle size={16} /> Approve
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Recent Orders */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200">
              <div className="p-4 border-b border-slate-200 bg-slate-50 rounded-t-xl">
                <h2 className="font-bold text-lg text-[#0A1931]">Recent Orders</h2>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-slate-50 text-slate-500">
                    <tr>
                      <th className="p-3">Hostel</th>
                      <th className="p-3">Drums</th>
                      <th className="p-3">Total</th>
                      <th className="p-3">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {orders.slice(0, 10).map((order) => (
                      <tr key={order.id}>
                        <td className="p-3 font-medium">{order.hostels?.name || 'Unknown'}</td>
                        <td className="p-3">{order.drums}</td>
                        <td className="p-3 text-[#1E90FF] font-semibold">GHS {order.total_price.toFixed(2)}</td>
                        <td className="p-3">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                            order.status === 'delivered' ? 'bg-green-100 text-green-700' :
                            order.status === 'paid' ? 'bg-blue-100 text-blue-700' :
                            'bg-amber-100 text-amber-700'
                          }`}>
                            {order.status.replace('_', ' ').toUpperCase()}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}