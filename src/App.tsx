import React, { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import { PlusCircle, X, ArrowRight, Settings, TrendingUp } from 'lucide-react';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
const supabase = (supabaseUrl && supabaseAnonKey) ? createClient(supabaseUrl, supabaseAnonKey) : null;

export default function SalesProUltra() {
  const [leads, setLeads] = useState([]);
  const [activeTab, setActiveTab] = useState('pipeline');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [goals, setGoals] = useState({ revenue: 100000, ticket: 5000 });
  const [newLead, setNewLead] = useState({ name: '', value: '', vendor: 'Vendedor 1', stage: 'contato' });

  const fetchLeads = async () => {
    if (!supabase) return;
    const { data } = await supabase.from('leads').select('*').order('created_at', { ascending: false });
    if (data) setLeads(data);
  };

  useEffect(() => { fetchLeads(); }, []);

  const handleSaveLead = async () => {
    if (!supabase || !newLead.name) return;
    await supabase.from('leads').insert([{ ...newLead, lastUpdate: new Date().toISOString() }]);
    fetchLeads();
    setIsModalOpen(false);
  };

  return (
    <div className="min-h-screen bg-[#F1F5F9] p-8 text-slate-900">
      <header className="flex justify-between items-center mb-10 max-w-7xl mx-auto">
        <h1 className="text-3xl font-black italic text-slate-900">SALESPRO <span className="text-blue-600">ULTRA</span></h1>
        <div className="flex gap-4">
          <button onClick={() => setActiveTab('pipeline')} className={`px-6 py-2 rounded-full font-bold ${activeTab === 'pipeline' ? 'bg-slate-900 text-white' : 'bg-white text-slate-500'}`}>Pipeline</button>
          <button onClick={() => setActiveTab('metrics')} className={`px-6 py-2 rounded-full font-bold ${activeTab === 'metrics' ? 'bg-slate-900 text-white' : 'bg-white text-slate-500'}`}>Metas</button>
          <button onClick={() => setIsModalOpen(true)} className="bg-blue-600 text-white p-2 rounded-full shadow-lg hover:scale-110 transition-transform"><PlusCircle/></button>
        </div>
      </header>

      {/* TELA DE METAS COM ALTO CONTRASTE */}
      {activeTab === 'metrics' && (
        <div className="max-w-4xl mx-auto bg-white p-12 rounded-[3rem] shadow-2xl border-2 border-slate-200">
          <h2 className="text-xl font-black mb-8 flex items-center gap-2 text-slate-900 uppercase tracking-widest"><Settings/> CONFIGURAÇÃO DE METAS</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
            <div className="space-y-4">
              <label className="text-[11px] font-black text-slate-600 uppercase ml-2">Faturamento Alvo (R$)</label>
              <input 
                type="number" 
                className="w-full p-6 border-4 border-slate-900 rounded-2xl bg-white text-slate-900 font-black text-3xl outline-none focus:ring-4 focus:ring-blue-200"
                value={goals.revenue}
                onChange={e => setGoals({...goals, revenue: e.target.value})}
              />
            </div>
            <div className="space-y-4">
              <label className="text-[11px] font-black text-slate-600 uppercase ml-2">Ticket Médio Alvo (R$)</label>
              <input 
                type="number" 
                className="w-full p-6 border-4 border-slate-900 rounded-2xl bg-white text-slate-900 font-black text-3xl outline-none focus:ring-4 focus:ring-blue-200"
                value={goals.ticket}
                onChange={e => setGoals({...goals, ticket: e.target.value})}
              />
            </div>
          </div>
        </div>
      )}

      {/* MODAL DE NOVO LEAD COM ALTO CONTRASTE */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/90 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-[3rem] p-12 max-w-xl w-full shadow-2xl border-t-[12px] border-blue-600 relative">
            <button onClick={() => setIsModalOpen(false)} className="absolute top-8 right-8 text-slate-900 hover:text-rose-500"><X size={32}/></button>
            <h2 className="text-3xl font-black mb-8 italic text-slate-900">NOVA OPORTUNIDADE</h2>
            <div className="space-y-6">
              <div className="space-y-2">
                <label className="text-xs font-black text-slate-500 uppercase ml-2">Nome do Lead</label>
                <input 
                  className="w-full p-6 border-4 border-slate-900 rounded-2xl bg-white text-slate-900 font-bold text-xl outline-none"
                  placeholder="EX: EMPRESA X"
                  value={newLead.name}
                  onChange={e => setNewLead({...newLead, name: e.target.value})}
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-black text-slate-500 uppercase ml-2">Valor Esperado (R$)</label>
                <input 
                  type="number"
                  className="w-full p-6 border-4 border-slate-900 rounded-2xl bg-white text-slate-900 font-black text-xl outline-none"
                  value={newLead.value}
                  onChange={e => setNewLead({...newLead, value: e.target.value})}
                />
              </div>
              <button onClick={handleSaveLead} className="w-full bg-blue-600 text-white p-6 rounded-2xl font-black text-xl hover:bg-blue-700 transition-all flex items-center justify-center gap-3">
                ATIVAR LEAD AGORA <ArrowRight/>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
