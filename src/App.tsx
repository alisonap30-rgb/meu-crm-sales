import React, { useState, useEffect, useMemo } from 'react';
import { createClient } from '@supabase/supabase-js';
import { 
  TrendingUp, Layers, ArrowDownWideNarrow, BarChart, 
  DollarSign, Archive, PlusCircle, Trash2, Info, 
  ShieldCheck, Zap, Award, Settings, 
  Search, RotateCcw, X, ArrowRight, Activity, PieChart
} from 'lucide-react';

// --- MOTOR DE DADOS ---
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
const supabase = (supabaseUrl && supabaseAnonKey) ? createClient(supabaseUrl, supabaseAnonKey) : null;

// --- CONSTANTES ---
const STAGES = [
  { id: 'contato', label: 'Primeiro Contato' },
  { id: 'orcamento', label: 'Orçamento/Proposta' },
  { id: 'negociacao', label: 'Em Negociação' },
  { id: 'fechado', label: 'Contrato Fechado' },
  { id: 'perdido', label: 'Oportunidade Perdida' }
];

// --- COMPONENTES COM CONTRASTE REFORÇADO ---

const FunnelStep = ({ label, count, percent, color }) => (
  <div className="flex items-center gap-6">
    <div 
      className={`h-24 ${color} rounded-[2rem] flex items-center justify-between px-10 text-white shadow-xl`} 
      style={{ width: `${Math.max(percent, 30)}%` }}
    >
      <span className="font-black uppercase tracking-widest text-sm">{label}</span>
      <span className="font-black text-3xl font-mono">{count}</span>
    </div>
    <div className="text-slate-900 font-black text-xl italic">{percent.toFixed(0)}%</div>
  </div>
);

const FinanceRule = ({ label, val, active }) => (
  <div className={`flex justify-between items-center p-6 rounded-[2rem] border-2 transition-all ${
    active ? 'bg-slate-900 border-blue-500 shadow-lg' : 'bg-slate-100 border-transparent opacity-40'
  }`}>
    <span className="text-[10px] font-black uppercase tracking-widest text-white">{label}</span>
    <span className={`text-sm font-black ${active ? 'text-blue-400' : 'text-slate-500'}`}>{val}</span>
  </div>
);

const KPIRow = ({ title, meta, total, field, data, format, isPercent = false }) => {
  const getStatusColor = (v) => {
    const target = isPercent ? parseFloat(meta) : (parseFloat(meta) / 4);
    if (v >= target) return 'bg-emerald-600';
    if (v >= target * 0.7) return 'bg-amber-500';
    return 'bg-rose-600';
  };

  const getWeekValue = (w) => {
    const sLeads = data.filter(l => Number(l.week) === w && !l.isArchived);
    if (field === 'contato') return sLeads.length;
    if (field === 'fup') return sLeads.length > 0 ? (sLeads.filter(l => l.followUp).length / sLeads.length) * 100 : 0;
    return 0;
  };

  return (
    <tr className="hover:bg-blue-50/50 border-b-2 border-slate-200">
      <td className="p-10 font-black text-slate-900 text-sm uppercase">{title}</td>
      <td className="p-10 text-center italic text-slate-600 font-bold">{meta}</td>
      {[1, 2, 3, 4].map(w => (
        <td key={w} className="p-10 text-center">
          <span className="text-lg font-black text-slate-900">{format(getWeekValue(w))}</span>
        </td>
      ))}
      <td className="p-10 text-center bg-slate-900 text-white rounded-r-3xl">
        <span className="text-2xl font-black">{total}</span>
      </td>
    </tr>
  );
};

export default function SalesProCore() {
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('pipeline');
  const [currentWeek, setCurrentWeek] = useState(1);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  const [goals, setGoals] = useState({
    revenue: 50000, ticket: 1500, contacts: 40, followUp: 80,
    crossSell: 20, upSell: 15, postSale: 90, reactivated: 10
  });

  const [newLead, setNewLead] = useState({
    name: '', value: '', vendor: 'Vendedor 1', stage: 'contato', followUp: false, postSale: false
  });

  // --- LOGICA DE SINCRONISMO ---
  const fetchLeads = async () => {
    if (!supabase) return;
    const { data } = await supabase.from('leads').select('*').order('created_at', { ascending: false });
    if (data) setLeads(data);
    setLoading(false);
  };

  useEffect(() => {
    fetchLeads();
    if (supabase) {
      const sub = supabase.channel('ultra_v3').on('postgres_changes', { event: '*', schema: 'public', table: 'leads' }, fetchLeads).subscribe();
      return () => { supabase.removeChannel(sub); };
    }
  }, []);

  const handleSaveLead = async (leadData) => {
    if (!supabase) return;
    const { error } = await supabase.from('leads').upsert({ ...leadData, lastUpdate: new Date().toISOString() });
    if (!error) fetchLeads();
  };

  const handleCreateLead = async () => {
    if (!newLead.name || !newLead.value) return alert("Preencha Nome e Valor!");
    await handleSaveLead({ ...newLead, week: currentWeek, isArchived: false });
    setIsModalOpen(false);
    setNewLead({ name: '', value: '', vendor: 'Vendedor 1', stage: 'contato', followUp: false, postSale: false });
  };

  const analytics = useMemo(() => {
    const active = leads.filter(l => !l.isArchived);
    const won = active.filter(l => l.stage === 'fechado');
    const totalRev = won.reduce((acc, curr) => acc + Number(curr.value), 0);
    const avgTicket = won.length > 0 ? totalRev / won.length : 0;
    const revPerf = (totalRev / goals.revenue) * 100;
    
    return {
      totalRev, avgTicket, revPerf,
      funnel: { contato: active.length, fechado: won.length },
      kpis: { fup: active.length > 0 ? (active.filter(l => l.followUp).length / active.length) * 100 : 0 }
    };
  }, [leads, goals]);

  if (loading) return <div className="h-screen flex items-center justify-center font-black text-slate-900 bg-white">SISTEMA INICIANDO...</div>;

  return (
    <div className="min-h-screen bg-[#F8FAFC] p-8 text-slate-900">
      
      {/* HEADER */}
      <header className="max-w-[1400px] mx-auto mb-10 flex flex-col lg:flex-row justify-between items-center gap-6">
        <div className="flex items-center gap-4">
          <div className="bg-slate-900 p-4 rounded-3xl shadow-xl">
             <TrendingUp className="text-blue-500" size={28} />
          </div>
          <h1 className="text-3xl font-black italic tracking-tighter uppercase">SalesPro <span className="text-blue-600">Ultra</span></h1>
        </div>

        <div className="flex gap-2 bg-white p-2 rounded-full shadow-2xl border border-slate-200">
           {['pipeline', 'metrics', 'commission', 'archive'].map(tab => (
             <button key={tab} onClick={() => setActiveTab(tab)} className={`px-6 py-2 rounded-full font-black text-[10px] uppercase transition-all ${activeTab === tab ? 'bg-slate-900 text-white shadow-lg' : 'text-slate-400 hover:bg-slate-50'}`}>
               {tab}
             </button>
           ))}
           <button onClick={() => setIsModalOpen(true)} className="bg-blue-600 text-white p-3 rounded-full hover:scale-110 active:scale-95 transition-all ml-4">
             <PlusCircle size={20} />
           </button>
        </div>
      </header>

      <main className="max-w-[1400px] mx-auto">
        {/* VIEW: PIPELINE */}
        {activeTab === 'pipeline' && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            {STAGES.slice(0, 4).map(stage => {
              const stageLeads = leads.filter(l => l.stage === stage.id && !l.isArchived);
              return (
                <div key={stage.id} className="bg-slate-100 p-6 rounded-[3rem] border-2 border-slate-200 min-h-[500px]">
                  <h3 className="font-black text-[11px] uppercase text-slate-500 mb-6 px-4">{stage.label}</h3>
                  <div className="space-y-4">
                    {stageLeads.map(lead => (
                      <div key={lead.id} className="bg-white p-6 rounded-[2rem] shadow-md border-2 border-white hover:border-blue-500 transition-all">
                        <h4 className="font-black text-xs text-slate-900 uppercase mb-1">{lead.name}</h4>
                        <p className="text-emerald-600 font-black text-sm italic">R$ {Number(lead.value).toLocaleString()}</p>
                        <div className="flex gap-2 mt-4 pt-4 border-t border-slate-50">
                          <button onClick={() => handleSaveLead({...lead, followUp: !lead.followUp})} className={`text-[9px] font-black px-3 py-1 rounded-full border-2 ${lead.followUp ? 'bg-blue-600 text-white border-blue-600' : 'text-slate-400 border-slate-200'}`}>FUP</button>
                          <button onClick={() => handleSaveLead({...lead, isArchived: true})} className="text-[9px] font-black px-3 py-1 rounded-full border-2 text-slate-300 hover:text-rose-500 border-slate-100 transition-colors">ARQUIVAR</button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* VIEW: FINANCEIRO (ONDE ESTAVA O ERRO DE VISIBILIDADE) */}
        {activeTab === 'commission' && (
          <div className="space-y-10">
             <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
                <div className="lg:col-span-2 bg-slate-900 p-16 rounded-[4rem] text-white shadow-2xl">
                   <p className="text-blue-400 font-black uppercase text-xs tracking-widest mb-4">Receita Mensal</p>
                   <h3 className="text-7xl font-black font-mono">R$ {analytics.totalRev.toLocaleString()}</h3>
                   <div className="flex gap-10 mt-10 opacity-60 font-black text-sm uppercase">
                      <span>Ticket: R$ {analytics.avgTicket.toLocaleString()}</span>
                      <span>Meta: {analytics.revPerf.toFixed(1)}%</span>
                   </div>
                </div>
                
                {/* CAMPO DE CONFIGURAÇÃO COM ALTO CONTRASTE */}
                <div className="bg-white p-12 rounded-[4rem] shadow-2xl border-4 border-white ring-2 ring-slate-100">
                   <h4 className="text-[11px] font-black uppercase text-slate-500 mb-10 flex items-center gap-2 italic">
                     <Settings size={18} className="text-blue-600"/> Ajuste de Metas
                   </h4>
                   <div className="space-y-8">
                      <div className="space-y-3">
                         <label className="text-[11px] font-black text-slate-900 uppercase ml-4">Faturamento Alvo (R$)</label>
                         {/* INPUT CORRIGIDO: TEXTO PRETO, BORDA ESCURA, FUNDO BRANCO */}
                         <input 
                            type="number" 
                            className="w-full p-8 border-[3px] border-slate-400 rounded-[2rem] font-black bg-white text-slate-900 text-3xl outline-none focus:border-blue-600 focus:ring-4 focus:ring-blue-100 shadow-inner" 
                            value={goals.revenue} 
                            onChange={e => setGoals({...goals, revenue: e.target.value})} 
                         />
                      </div>
                      <div className="space-y-3">
                         <label className="text-[11px] font-black text-slate-900 uppercase ml-4">Ticket Médio Alvo (R$)</label>
                         <input 
                            type="number" 
                            className="w-full p-8 border-[3px] border-slate-400 rounded-[2rem] font-black bg-white text-slate-900 text-3xl outline-none focus:border-blue-600 focus:ring-4 focus:ring-blue-100 shadow-inner" 
                            value={goals.ticket} 
                            onChange={e => setGoals({...goals, ticket: e.target.value})} 
                         />
                      </div>
                   </div>
                </div>
             </div>
          </div>
        )}

        {/* VIEW: KPIs */}
        {activeTab === 'metrics' && (
          <div className="bg-white rounded-[3rem] shadow-2xl overflow-hidden border-2 border-slate-100">
             <table className="w-full">
                <thead className="bg-slate-900 text-white font-black uppercase text-[10px] tracking-widest">
                   <tr>
                      <th className="p-10 text-left">Indicador</th>
                      <th className="p-10">Meta</th>
                      <th className="p-10">S1</th><th className="p-10">S2</th><th className="p-10">S3</th><th className="p-10">S4</th>
                      <th className="p-10 bg-blue-600">Total</th>
                   </tr>
                </thead>
                <tbody>
                   <KPIRow title="Novos Contatos" meta={goals.contacts} total={analytics.funnel.contato} field="contato" data={leads} format={v => v} />
                   <KPIRow title="Taxa Follow-up (%)" meta={`${goals.followUp}%`} total={`${analytics.kpis.fup.toFixed(0)}%`} field="fup" data={leads} format={v => `${v.toFixed(0)}%`} isPercent />
                </tbody>
             </table>
          </div>
        )}
      </main>

      {/* MODAL: NOVO LEAD COM ALTO CONTRASTE */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/95 flex items-center justify-center p-4 z-[500]">
          <div className="bg-white rounded-[4rem] p-16 max-w-2xl w-full shadow-2xl border-t-[16px] border-blue-600 relative">
            <button onClick={() => setIsModalOpen(false)} className="absolute top-10 right-10 text-slate-900 hover:text-rose-600 transition-colors">
              <X size={36} strokeWidth={3}/>
            </button>
            <h2 className="text-4xl font-black mb-12 uppercase italic text-slate-900 tracking-tighter underline decoration-blue-500 underline-offset-8">Nova Oportunidade</h2>
            <div className="space-y-10">
               <div className="space-y-4">
                  <label className="text-[12px] font-black text-slate-900 uppercase ml-4">Nome da Empresa</label>
                  <input 
                    className="w-full p-8 border-[3px] border-slate-400 rounded-[2.5rem] bg-white text-slate-900 font-black text-2xl outline-none focus:border-blue-600 shadow-md" 
                    value={newLead.name} 
                    onChange={e => setNewLead({...newLead, name: e.target.value})} 
                    placeholder="DIGITE O NOME AQUI"
                  />
               </div>
               <div className="grid grid-cols-2 gap-10">
                  <div className="space-y-4">
                     <label className="text-[12px] font-black text-slate-900 uppercase ml-4">Valor Estimado (R$)</label>
                     <input 
                        type="number" 
                        className="w-full p-8 border-[3px] border-slate-400 rounded-[2.5rem] bg-white text-slate-900 font-black text-2xl outline-none focus:border-blue-600 shadow-md" 
                        value={newLead.value} 
                        onChange={e => setNewLead({...newLead, value: e.target.value})} 
                        placeholder="0.00"
                     />
                  </div>
                  <div className="space-y-4">
                     <label className="text-[12px] font-black text-slate-900 uppercase ml-4">Responsável</label>
                     <select className="w-full p-8 border-[3px] border-slate-400 rounded-[2.5rem] bg-white text-slate-900 font-black text-2xl outline-none" value={newLead.vendor} onChange={e => setNewLead({...newLead, vendor: e.target.value})}>
                        <option>Vendedor 1</option>
                        <option>Vendedor 2</option>
                     </select>
                  </div>
               </div>
               <button onClick={handleCreateLead} className="w-full bg-blue-600 text-white p-10 rounded-[3rem] font-black uppercase shadow-2xl text-xl flex items-center justify-center gap-4 hover:bg-blue-700 active:scale-95 transition-all">
                  ATIVAR LEAD NO SISTEMA <ArrowRight size={28}/>
               </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
