import React, { useState, useEffect, useMemo } from 'react';
import { createClient } from '@supabase/supabase-js';
import { 
  TrendingUp, Layers, ArrowDownWideNarrow, BarChart, 
  DollarSign, Archive, PlusCircle, Trash2, X, ArrowRight, Settings, Search, RotateCcw
} from 'lucide-react';
import { Toaster, toast } from 'sonner';

// --- CONFIGURAÇÃO ---
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
const supabase = (supabaseUrl && supabaseAnonKey) ? createClient(supabaseUrl, supabaseAnonKey) : null;

export default function SalesProCore() {
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('pipeline');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [goals, setGoals] = useState({ revenue: 100000, ticket: 5000 });
  const [newLead, setNewLead] = useState({ name: '', value: '', vendor: 'Vendedor 1', stage: 'contato' });

  // --- BUSCA DE DADOS (CORREÇÃO DE SEGURANÇA) ---
  const fetchLeads = async () => {
    if (!supabase) return; //
    const { data, error } = await supabase.from('leads').select('*').order('created_at', { ascending: false });
    if (error) console.error("Erro ao buscar:", error);
    if (data) setLeads(data);
    setLoading(false);
  };

  useEffect(() => {
    if (!supabase) {
      setLoading(false);
      return;
    }
    fetchLeads();
    // Realtime Sync
    const channel = supabase.channel('crm_sync').on('postgres_changes', 
      { event: '*', schema: 'public', table: 'leads' }, () => fetchLeads()).subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  // --- FUNÇÃO ÚNICA DE SALVAMENTO (RESOLVE DUPLICIDADE) ---
  const handleSaveLead = async (leadData) => {
    if (!supabase) return;
    const { error } = await supabase.from('leads').upsert({
      ...leadData,
      lastUpdate: new Date().toISOString()
    });
    if (error) toast.error("Erro na sincronização");
    else {
      toast.success("Dados atualizados!");
      fetchLeads();
      if (isModalOpen) setIsModalOpen(false);
    }
  };

  if (loading) return <div className="h-screen flex items-center justify-center font-black text-slate-900">CARREGANDO SISTEMA...</div>;

  return (
    <div className="min-h-screen bg-[#F8FAFC] p-8 text-slate-900">
      <Toaster richColors />
      
      {/* HEADER */}
      <header className="flex justify-between items-center mb-10 max-w-7xl mx-auto">
        <h1 className="text-3xl font-black italic text-slate-900">SALESPRO <span className="text-blue-600">ULTRA</span></h1>
        <div className="flex gap-4 bg-white p-2 rounded-full shadow-sm">
          <button onClick={() => setActiveTab('pipeline')} className={`px-6 py-2 rounded-full font-bold transition-all ${activeTab === 'pipeline' ? 'bg-slate-900 text-white shadow-lg' : 'text-slate-400 hover:bg-slate-50'}`}>Pipeline</button>
          <button onClick={() => setActiveTab('config')} className={`px-6 py-2 rounded-full font-bold transition-all ${activeTab === 'config' ? 'bg-slate-900 text-white shadow-lg' : 'text-slate-400 hover:bg-slate-50'}`}>Metas</button>
          <button onClick={() => setIsModalOpen(true)} className="bg-blue-600 text-white p-2 rounded-full hover:scale-110 active:scale-95 transition-all"><PlusCircle/></button>
        </div>
      </header>

      {/* VIEW: METAS (ALTO CONTRASTE APLICADO) */}
      {activeTab === 'config' && (
        <div className="max-w-2xl mx-auto bg-white p-12 rounded-[3rem] shadow-xl border-2 border-slate-100 animate-in fade-in duration-500">
          <h2 className="text-xl font-black mb-8 flex items-center gap-2"><Settings className="text-blue-600"/> CONFIGURAR METAS DO CICLO</h2>
          <div className="space-y-8">
            <div className="flex flex-col gap-3">
              <label className="text-[11px] font-black text-slate-500 uppercase tracking-widest ml-4">Faturamento Alvo (R$)</label>
              <input 
                type="number" 
                className="w-full p-6 border-2 border-slate-200 rounded-[1.5rem] font-black text-3xl bg-slate-50 text-slate-900 outline-none focus:border-blue-600 focus:ring-4 focus:ring-blue-50 transition-all shadow-inner" 
                value={goals.revenue} 
                onChange={e => setGoals({...goals, revenue: e.target.value})} 
              />
            </div>
            <div className="flex flex-col gap-3">
              <label className="text-[11px] font-black text-slate-500 uppercase tracking-widest ml-4">Ticket Médio Alvo (R$)</label>
              <input 
                type="number" 
                className="w-full p-6 border-2 border-slate-200 rounded-[1.5rem] font-black text-3xl bg-slate-50 text-slate-900 outline-none focus:border-blue-600 focus:ring-4 focus:ring-blue-50 transition-all shadow-inner" 
                value={goals.ticket} 
                onChange={e => setGoals({...goals, ticket: e.target.value})} 
              />
            </div>
          </div>
        </div>
      )}

      {/* MODAL: NOVA OPORTUNIDADE (ALTO CONTRASTE) */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-md flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-[3rem] p-12 max-w-xl w-full shadow-2xl relative border-t-[12px] border-blue-600">
            <button onClick={() => setIsModalOpen(false)} className="absolute top-8 right-8 text-slate-400 hover:text-rose-500 transition-colors"><X size={28}/></button>
            <h2 className="text-3xl font-black mb-10 italic tracking-tighter">NOVA OPORTUNIDADE</h2>
            
            <div className="space-y-8">
              <div className="space-y-3">
                <label className="text-[11px] font-black text-slate-500 uppercase tracking-widest ml-2">Nome do Lead / Empresa</label>
                <input 
                  className="w-full p-6 rounded-2xl border-2 border-slate-200 bg-slate-50 text-slate-900 font-bold text-xl outline-none focus:border-blue-600 focus:bg-white transition-all"
                  placeholder="Ex: Clínica Sorria Sempre"
                  value={newLead.name}
                  onChange={e => setNewLead({...newLead, name: e.target.value})}
                />
              </div>

              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-3">
                  <label className="text-[11px] font-black text-slate-500 uppercase tracking-widest ml-2">Valor (R$)</label>
                  <input 
                    type="number"
                    className="w-full p-6 rounded-2xl border-2 border-slate-200 bg-slate-50 text-slate-900 font-black text-xl outline-none focus:border-blue-600 focus:bg-white transition-all"
                    placeholder="0,00"
                    value={newLead.value}
                    onChange={e => setNewLead({...newLead, value: e.target.value})}
                  />
                </div>
                <div className="space-y-3">
                  <label className="text-[11px] font-black text-slate-500 uppercase tracking-widest ml-2">Vendedor</label>
                  <select 
                    className="w-full p-6 rounded-2xl border-2 border-slate-200 bg-slate-50 text-slate-900 font-bold text-xl outline-none focus:border-blue-600"
                    value={newLead.vendor}
                    onChange={e => setNewLead({...newLead, vendor: e.target.value})}
                  >
                    <option>Vendedor 1</option>
                    <option>Vendedor 2</option>
                  </select>
                </div>
              </div>

              <button 
                onClick={() => handleSaveLead(newLead)}
                className="w-full bg-blue-600 text-white p-7 rounded-2xl font-black text-xl hover:bg-blue-700 hover:shadow-xl active:scale-95 transition-all flex items-center justify-center gap-3"
              >
                ATIVAR LEAD AGORA <ArrowRight size={24}/>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
