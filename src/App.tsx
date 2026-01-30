import React, { useState, useEffect, useMemo } from 'react';
import { createClient } from '@supabase/supabase-js';
import { 
  TrendingUp, Layers, ArrowDownWideNarrow, BarChart, 
  DollarSign, Archive, PlusCircle, Trash2, X, ArrowRight, Settings, Zap, Award
} from 'lucide-react';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
const supabase = (supabaseUrl && supabaseAnonKey) ? createClient(supabaseUrl, supabaseAnonKey) : null;

export default function SalesProUltra() {
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('pipeline');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [goals, setGoals] = useState({ revenue: 100000, ticket: 5000 });
  const [newLead, setNewLead] = useState({ name: '', value: '', vendor: 'Vendedor 1', stage: 'contato' });

  const fetchLeads = async () => {
    if (!supabase) return;
    const { data, error } = await supabase.from('leads').select('*').order('created_at', { ascending: false });
    if (!error && data) setLeads(data);
    setLoading(false);
  };

  useEffect(() => {
    if (!supabase) {
      setLoading(false);
      return;
    }
    fetchLeads();
    const channel = supabase.channel('ultra_sync').on('postgres_changes', 
      { event: '*', schema: 'public', table: 'leads' }, fetchLeads).subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  const handleSaveLead = async (leadData) => {
    if (!supabase) return;
    const { error } = await supabase.from('leads').upsert({
      ...leadData,
      lastUpdate: new Date().toISOString()
    });
    if (!error) {
      fetchLeads();
      setIsModalOpen(false);
    }
  };

  if (loading) return <div className="h-screen flex items-center justify-center font-black text-slate-900">INICIALIZANDO...</div>;

  return (
    <div className="min-h-screen bg-[#F1F5F9] p-4 md:p-8 text-slate-900">
      <header className="max-w-7xl mx-auto mb-10 flex justify-between items-center">
        <h1 className="text-3xl font-black italic">SALESPRO <span className="text-blue-600">ULTRA</span></h1>
        <div className="flex gap-2 bg-white p-2 rounded-full shadow-xl">
          <button onClick={() => setActiveTab('pipeline')} className={`px-6 py-2 rounded-full font-bold transition-all ${activeTab === 'pipeline' ? 'bg-slate-900 text-white' : 'text-slate-400'}`}>Pipeline</button>
          <button onClick={() => setActiveTab('metrics')} className={`px-6 py-2 rounded-full font-bold transition-all ${activeTab === 'metrics' ? 'bg-slate-900 text-white' : 'text-slate-400'}`}>Metas</button>
          <button onClick={() => setIsModalOpen(true)} className="bg-blue-600 text-white p-2 rounded-full hover:scale-110 transition-all"><PlusCircle/></button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto">
        {activeTab === 'metrics' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 animate-in fade-in duration-500">
            <div className="bg-white p-10 rounded-[3rem] shadow-2xl border-2 border-slate-100">
              <h2 className="text-xl font-black mb-8 flex items-center gap-2 text-slate-400 uppercase tracking-widest"><Settings size={18}/> Painel de Metas</h2>
              <div className="space-y-8">
                <div className="space-y-3">
                  <label className="text-[11px] font-black text-slate-500 uppercase ml-4 tracking-tighter">Faturamento Alvo (R$)</label>
                  <input 
                    type="number" 
                    className="w-full p-6 border-4 border-slate-400 rounded-[1.5rem] font-black text-3xl bg-white text-slate-900 outline-none focus:border-blue-600 shadow-sm" 
                    value={goals.revenue} 
                    onChange={e => setGoals({...goals, revenue: e.target.value})} 
                  />
                </div>
                <div className="space-y-3">
                  <label className="text-[11px] font-black text-slate-500 uppercase ml-4 tracking-tighter">Ticket Médio (R$)</label>
                  <input 
                    type="number" 
                    className="w-full p-6 border-4 border-slate-400 rounded-[1.5rem] font-black text-3xl bg-white text-slate-900 outline-none focus:border-blue-600 shadow-sm" 
                    value={goals.ticket} 
                    onChange={e => setGoals({...goals, ticket: e.target.value})} 
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Adicione aqui o restante da sua lógica de Pipeline/Cards conforme o original */}
      </main>

      {/* MODAL: ALTO CONTRASTE TOTAL */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/90 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-[3rem] p-12 max-w-xl w-full shadow-2xl border-t-[12px] border-blue-600 relative">
            <button onClick={() => setIsModalOpen(false)} className="absolute top-8 right-8 text-slate-400 hover:text-rose-500 transition-colors"><X size={28}/></button>
            <h2 className="text-3xl font-black mb-10 italic uppercase">Novo Lead</h2>
            <div className="space-y-8">
              <input 
                className="w-full p-6 rounded-2xl border-4 border-slate-400 bg-white text-slate-900 font-black text-xl outline-none focus:border-blue-600"
                placeholder="NOME DO LEAD"
                value={newLead.name}
                onChange={e => setNewLead({...newLead, name: e.target.value})}
              />
              <div className="grid grid-cols-2 gap-6">
                <input 
                  type="number"
                  className="w-full p-6 rounded-2xl border-4 border-slate-400 bg-white text-slate-900 font-black text-xl outline-none focus:border-blue-600"
                  placeholder="VALOR R$"
                  value={newLead.value}
                  onChange={e => setNewLead({...newLead, value: e.target.value})}
                />
                <select 
                  className="w-full p-6 rounded-2xl border-4 border-slate-400 bg-white text-slate-900 font-black text-xl outline-none"
                  value={newLead.vendor}
                  onChange={e => setNewLead({...newLead, vendor: e.target.value})}
                >
                  <option>Vendedor 1</option>
                  <option>Vendedor 2</option>
                </select>
              </div>
              <button 
                onClick={() => handleSaveLead(newLead)}
                className="w-full bg-blue-600 text-white p-7 rounded-2xl font-black text-xl hover:bg-blue-700 active:scale-95 transition-all flex items-center justify-center gap-3"
              >
                ATIVAR AGORA <ArrowRight size={24}/>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
