import React, { useState, useEffect, useMemo } from 'react';
import { createClient } from '@supabase/supabase-js';
import { 
  TrendingUp, Layers, ArrowDownWideNarrow, BarChart, 
  DollarSign, Archive, PlusCircle, Trash2, Info, 
  ShieldCheck, Zap, Award, Settings, 
  Search, RotateCcw, X, ArrowRight, Activity, PieChart
} from 'lucide-react';

// --- CONFIGURAÇÃO SUPABASE ---
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

const AVAILABLE_TAGS = [
  { id: 'hot', label: 'Lead Quente', color: 'bg-rose-500' },
  { id: 'vibe', label: 'Boa Vibe', color: 'bg-emerald-500' },
  { id: 'priority', label: 'Urgente', color: 'bg-amber-500' }
];

// --- COMPONENTES DE UI ---

const QuickAction = ({ label, active, color, onClick }) => (
  <button 
    onClick={onClick} 
    className={`p-4 rounded-[1.5rem] border-2 text-[10px] font-black uppercase transition-all shadow-sm ${
      active 
        ? `${color} text-white border-transparent scale-105 shadow-md` 
        : 'bg-white text-slate-400 border-slate-200 hover:border-slate-400'
    }`}
  >
    {label}
  </button>
);

const FunnelStep = ({ label, count, percent, color }) => (
  <div className="flex items-center gap-6">
    <div 
      className={`h-24 ${color} rounded-[2rem] flex items-center justify-between px-10 text-white shadow-xl transition-all`} 
      style={{ width: `${Math.max(percent, 30)}%` }}
    >
      <span className="font-black uppercase tracking-widest text-sm">{label}</span>
      <span className="font-black text-3xl font-mono">{count}</span>
    </div>
    <div className="text-slate-500 font-black text-xl italic">{percent.toFixed(0)}%</div>
  </div>
);

const FinanceBox = ({ title, icon, children }) => (
  <div className="bg-slate-900 p-12 rounded-[4rem] text-white shadow-xl flex flex-col h-full">
    <h4 className="text-xs font-black uppercase mb-10 border-b border-white/10 pb-8 flex items-center gap-4">{icon} {title}</h4>
    <div className="space-y-6">{children}</div>
  </div>
);

const FinanceRule = ({ label, val, active }) => (
  <div className={`flex justify-between items-center p-6 rounded-[2rem] border-2 transition-all ${
    active ? 'bg-white/10 border-emerald-500 shadow-lg' : 'bg-white/5 border-transparent opacity-30'
  }`}>
    <span className="text-[10px] font-black uppercase tracking-widest text-white">{label}</span>
    <span className={`text-sm font-black ${active ? 'text-emerald-400' : 'text-slate-100'}`}>{val}</span>
  </div>
);

const KPIRow = ({ title, meta, total, field, data, format, isPercent = false }) => {
  const getStatusColor = (v) => {
    const target = isPercent ? parseFloat(meta) : (parseFloat(meta) / 4);
    if (v >= target) return 'bg-emerald-500';
    if (v >= target * 0.7) return 'bg-amber-500';
    return 'bg-rose-500';
  };

  const getWeekValue = (w) => {
    const sLeads = data.filter(l => Number(l.week) === w && !l.isArchived);
    const won = sLeads.filter(l => l.stage === 'fechado');
    if (field === 'contato') return sLeads.length;
    if (field === 'fup') return sLeads.length > 0 ? (sLeads.filter(l => l.followUp).length / sLeads.length) * 100 : 0;
    if (field === 'post') return won.length > 0 ? (won.filter(l => l.postSale).length / won.length) * 100 : 0;
    return 0;
  };

  return (
    <tr className="hover:bg-slate-50 border-b border-slate-100">
      <td className="p-10 font-black text-slate-800 text-sm tracking-tight uppercase">{title}</td>
      <td className="p-10 text-center italic text-slate-500 font-bold">{meta}</td>
      {[1, 2, 3, 4].map(w => {
        const v = getWeekValue(w);
        return (
          <td key={w} className="p-10 text-center">
            <div className="flex flex-col items-center gap-2">
              <div className={`w-3 h-3 rounded-full ${getStatusColor(v)} shadow-md`}></div>
              <span className="text-[12px] font-black text-slate-900">{format(v)}</span>
            </div>
          </td>
        );
      })}
      <td className="p-10 text-center bg-blue-50/30">
        <div className="flex flex-col items-center gap-2">
          <div className={`w-5 h-5 rounded-full ${getStatusColor(parseFloat(total))} shadow-lg`}></div>
          <span className="text-xl font-black text-blue-900">{total}</span>
        </div>
      </td>
    </tr>
  );
};

export default function SalesProCore() {
  // --- ESTADOS ---
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('pipeline');
  const [currentWeek, setCurrentWeek] = useState(1);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  const [goals, setGoals] = useState({
    revenue: 50000, ticket: 1500, contacts: 40, followUp: 80,
    crossSell: 20, upSell: 15, postSale: 90, reactivated: 10
  });

  const [newLead, setNewLead] = useState({
    name: '', value: '', vendor: 'Vendedor 1', notes: '', 
    stage: 'contato', tags: '', followUp: false, 
    postSale: false, hasCrossSell: false, hasUpSell: false, reactivated: false
  });

  // --- NOTIFICAÇÃO DO SISTEMA (Substituto do Sonner) ---
  const sysNotify = (msg) => {
    console.log(`[SYSTEM]: ${msg}`);
  };

  // --- PERSISTÊNCIA ---
  const fetchLeads = async () => {
    if (!supabase) return;
    const { data, error } = await supabase.from('leads').select('*').order('created_at', { ascending: false });
    if (!error && data) setLeads(data);
    setLoading(false);
  };

  const handleSaveLead = async (leadData) => {
    if (!supabase) return;
    setIsSaving(true);
    const { error } = await supabase.from('leads').upsert({
      ...leadData,
      lastUpdate: new Date().toISOString()
    });
    if (error) sysNotify("Erro de Sincronização");
    setIsSaving(false);
  };

  const handleCreateLead = async () => {
    if (!newLead.name.trim() || !newLead.value) {
      alert("Preencha Nome e Valor!");
      return;
    }
    await handleSaveLead({ ...newLead, week: currentWeek, isArchived: false });
    setIsModalOpen(false);
    setNewLead({ name: '', value: '', vendor: 'Vendedor 1', notes: '', stage: 'contato', tags: '', followUp: false, postSale: false, hasCrossSell: false, hasUpSell: false, reactivated: false });
    sysNotify("Lead Ativado!");
  };

  const deleteLead = async (id) => {
    if (!supabase) return;
    if(confirm("Deseja deletar permanentemente?")) {
      const { error } = await supabase.from('leads').delete().eq('id', id);
      if (!error) fetchLeads();
    }
  };

  useEffect(() => {
    if (!supabase) { setLoading(false); return; }
    fetchLeads();
    const sub = supabase.channel('ultra_sync').on('postgres_changes', { event: '*', schema: 'public', table: 'leads' }, fetchLeads).subscribe();
    return () => { supabase.removeChannel(sub); };
  }, []);

  // --- ANALYTICS ---
  const analytics = useMemo(() => {
    const active = leads.filter(l => !l.isArchived);
    const won = active.filter(l => l.stage === 'fechado');
    
    const funnel = {
      contato: active.length,
      orcamento: active.filter(l => ['orcamento', 'negociacao', 'fechado'].includes(l.stage)).length,
      negociacao: active.filter(l => ['negociacao', 'fechado'].includes(l.stage)).length,
      fechado: won.length
    };

    const rates = {
      total: funnel.contato > 0 ? (funnel.fechado / funnel.contato) * 100 : 0,
      c2o: funnel.contato > 0 ? (funnel.orcamento / funnel.contato) * 100 : 0,
      o2n: funnel.orcamento > 0 ? (funnel.negociacao / funnel.orcamento) * 100 : 0,
      n2f: funnel.negociacao > 0 ? (funnel.fechado / funnel.negociacao) * 100 : 0,
    };

    const totalRev = won.reduce((acc, curr) => acc + Number(curr.value), 0);
    const avgTicket = won.length > 0 ? totalRev / won.length : 0;
    const revPerf = (totalRev / goals.revenue) * 100;

    const kpis = {
      fup: active.length > 0 ? (active.filter(l => l.followUp).length / active.length) * 100 : 0,
      post: won.length > 0 ? (won.filter(l => l.postSale).length / won.length) * 100 : 0,
      cross: won.length > 0 ? (won.filter(l => l.hasCrossSell).length / won.length) * 100 : 0,
      up: won.length > 0 ? (won.filter(l => l.hasUpSell).length / won.length) * 100 : 0,
      react: active.length > 0 ? (active.filter(l => l.reactivated).length / active.length) * 100 : 0
    };

    let baseRate = revPerf >= 110 ? 3.5 : revPerf >= 100 ? 2.5 : revPerf >= 90 ? 1.5 : 0;
    const accelerators = (avgTicket >= goals.ticket ? 0.5 : 0) + (kpis.cross >= goals.crossSell ? 0.5 : 0) + (kpis.up >= goals.upSell ? 0.5 : 0);
    const bonusFixoHabilitado = active.length >= goals.contacts && kpis.fup >= goals.followUp && kpis.post >= goals.postSale && kpis.react >= goals.reactivated;

    const finalRate = baseRate + accelerators;
    const finalCommission = (totalRev * (finalRate / 100)) + (bonusFixoHabilitado ? 300 : 0);

    return { funnel, rates, totalRev, avgTicket, revPerf, kpis, finalRate, finalCommission, bonusFixoHabilitado };
  }, [leads, goals]);

  if (loading) return <div className="h-screen bg-slate-900 flex items-center justify-center font-black text-blue-500 italic">CARREGANDO ULTRA...</div>;

  return (
    <div className="min-h-screen bg-[#F1F5F9] p-4 md:p-8 font-sans text-slate-900">
      
      {/* HEADER */}
      <header className="max-w-[1600px] mx-auto mb-10 flex flex-col xl:flex-row justify-between items-center gap-8">
        <div className="flex items-center gap-6">
          <div className="bg-slate-900 p-5 rounded-[2.5rem] shadow-2xl">
            <TrendingUp className="text-blue-500" size={32} />
          </div>
          <div>
            <h1 className="text-4xl font-black tracking-tighter text-slate-900 italic uppercase">Sales<span className="text-blue-600">Pro</span> Ultra</h1>
            <p className="text-[11px] font-black text-slate-500 uppercase tracking-[0.4em]">Dashboard de Performance</p>
          </div>
        </div>

        <div className="flex flex-wrap justify-center gap-3 bg-white p-3 rounded-[3rem] shadow-xl border">
          <div className="flex bg-slate-100 p-1.5 rounded-2xl mr-4">
            {[1, 2, 3, 4].map(w => (
              <button key={w} onClick={() => setCurrentWeek(w)} className={`px-5 py-2.5 rounded-xl font-black text-xs transition-all ${currentWeek === w ? 'bg-white text-blue-600 shadow-md' : 'text-slate-400'}`}>S{w}</button>
            ))}
          </div>
          <nav className="flex gap-1">
            {['pipeline', 'funnel', 'metrics', 'commission', 'archive'].map(tab => (
              <button key={tab} onClick={() => setActiveTab(tab)} className={`px-6 py-3 rounded-2xl font-black text-[10px] uppercase transition-all ${activeTab === tab ? 'bg-slate-900 text-white shadow-2xl' : 'text-slate-500 hover:bg-slate-50'}`}>
                {tab}
              </button>
            ))}
          </nav>
          <button onClick={() => setIsModalOpen(true)} className="bg-blue-600 text-white p-4 rounded-full shadow-lg hover:scale-110 active:scale-95 transition-all ml-2">
            <PlusCircle size={22} />
          </button>
        </div>
      </header>

      <main className="max-w-[1600px] mx-auto">
        {/* VIEW: PIPELINE */}
        {activeTab === 'pipeline' && (
          <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
            {STAGES.map(stage => {
              const stageLeads = leads.filter(l => l.stage === stage.id && Number(l.week) === currentWeek && !l.isArchived);
              const columnValue = stageLeads.reduce((acc, curr) => acc + (Number(curr.value) || 0), 0);
              return (
                <div key={stage.id} onDragOver={(e) => e.preventDefault()} onDrop={(e) => {
                  const id = e.dataTransfer.getData("leadId");
                  const lead = leads.find(l => String(l.id) === String(id));
                  if (lead) handleSaveLead({ ...lead, stage: stage.id });
                }} className="bg-slate-200/50 p-6 rounded-[3rem] border-2 border-dashed border-slate-300 min-h-[600px]">
                  <div className="mb-8 px-2 flex justify-between items-start">
                    <div>
                      <h3 className="font-black text-[10px] uppercase text-slate-500 tracking-[0.2em] mb-1">{stage.label}</h3>
                      <p className="text-xl font-black text-slate-900 tracking-tighter">R$ {columnValue.toLocaleString()}</p>
                    </div>
                  </div>
                  <div className="space-y-5">
                    {stageLeads.map(lead => (
                      <div key={lead.id} draggable onDragStart={(e) => e.dataTransfer.setData("leadId", lead.id)} className="bg-white p-6 rounded-[2.5rem] shadow-md border-2 border-white hover:border-blue-400 transition-all relative group">
                        <button onClick={() => deleteLead(lead.id)} className="absolute -right-2 -top-2 bg-white text-rose-500 p-2 rounded-full shadow-xl border opacity-0 group-hover:opacity-100 transition-all"><Trash2 size={12}/></button>
                        <h4 className="font-black text-xs text-slate-900 uppercase mb-1">{lead.name}</h4>
                        <div className="text-emerald-600 font-black text-sm mb-4 italic">R$ {Number(lead.value).toLocaleString()}</div>
                        <div className="grid grid-cols-2 gap-2 mb-4">
                           <QuickAction label="FUP" active={lead.followUp} color="bg-blue-600" onClick={() => handleSaveLead({...lead, followUp: !lead.followUp})} />
                           <QuickAction label="PÓS" active={lead.postSale} color="bg-emerald-600" onClick={() => handleSaveLead({...lead, postSale: !lead.postSale})} />
                        </div>
                        <div className="flex justify-between items-center pt-4 border-t border-slate-50">
                           <button onClick={() => handleSaveLead({...lead, isArchived: true})} className="text-[9px] font-black text-slate-400 hover:text-slate-900 uppercase transition-colors">Arquivar</button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* VIEW: FINANCEIRO (ALTO CONTRASTE NOS INPUTS) */}
        {activeTab === 'commission' && (
          <div className="space-y-10">
             <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
                <div className="lg:col-span-2 bg-slate-900 p-16 rounded-[4.5rem] text-white shadow-2xl relative">
                   <p className="text-blue-500 font-black uppercase tracking-[0.3em] mb-4">Receita Consolidada</p>
                   <h3 className="text-8xl font-black font-mono tracking-tighter mb-10">R$ {analytics.totalRev.toLocaleString()}</h3>
                   <div className="grid grid-cols-3 gap-10 pt-10 border-t border-white/10">
                      <div><p className="text-[10px] opacity-40 uppercase">Ticket Médio</p><p className="text-3xl font-black italic">R$ {analytics.avgTicket.toLocaleString()}</p></div>
                      <div><p className="text-[10px] opacity-40 uppercase">Performance Meta</p><p className="text-3xl font-black text-emerald-400">{analytics.revPerf.toFixed(1)}%</p></div>
                      <div><p className="text-[10px] opacity-40 uppercase">Taxa Comis.</p><p className="text-3xl font-black">{analytics.finalRate.toFixed(1)}%</p></div>
                   </div>
                </div>
                <div className="bg-white p-16 rounded-[4.5rem] border-[12px] border-emerald-500 shadow-2xl text-center">
                   <Award className="mx-auto mb-6 text-emerald-600" size={64}/>
                   <h3 className="text-7xl text-slate-900 font-black font-mono tracking-tighter">R$ {analytics.finalCommission.toLocaleString()}</h3>
                </div>
             </div>

             <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
                <FinanceBox title="Aceleradores" icon={<Zap size={18}/>}>
                   <FinanceRule label="Ticket > Meta" val="+0.5%" active={analytics.avgTicket >= goals.ticket} />
                   <FinanceRule label="Cross-Sell > Meta" val="+0.5%" active={analytics.kpis.cross >= goals.crossSell} />
                </FinanceBox>
                <div className="bg-white p-12 rounded-[4rem] shadow-2xl border">
                   <h4 className="text-xs font-black uppercase mb-10 text-slate-500 flex items-center gap-4"><Settings size={18}/> Parametrização</h4>
                   <div className="space-y-8">
                      <div className="space-y-3">
                         <label className="text-[11px] font-black text-slate-700 uppercase ml-4">Meta Faturamento (R$)</label>
                         <input 
                            type="number" 
                            className="w-full p-8 border-4 border-slate-400 rounded-[2rem] font-black bg-white text-slate-900 text-2xl outline-none focus:border-blue-600 shadow-md" 
                            value={goals.revenue} 
                            onChange={e => setGoals({...goals, revenue: e.target.value})} 
                         />
                      </div>
                      <div className="space-y-3">
                         <label className="text-[11px] font-black text-slate-700 uppercase ml-4">Meta Ticket Médio (R$)</label>
                         <input 
                            type="number" 
                            className="w-full p-8 border-4 border-slate-400 rounded-[2rem] font-black bg-white text-slate-900 text-2xl outline-none focus:border-blue-600 shadow-md" 
                            value={goals.ticket} 
                            onChange={e => setGoals({...goals, ticket: e.target.value})} 
                         />
                      </div>
                   </div>
                </div>
             </div>
          </div>
        )}
      </main>

      {/* MODAL: NOVO LEAD (ALTO CONTRASTE) */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/90 flex items-center justify-center p-4 z-[300]">
          <div className="bg-white rounded-[4rem] p-16 max-w-2xl w-full shadow-2xl border-t-[16px] border-blue-600 relative">
            <button onClick={() => setIsModalOpen(false)} className="absolute top-10 right-10 text-slate-400"><X size={36}/></button>
            <h2 className="text-4xl font-black mb-12 uppercase italic text-slate-900 underline decoration-blue-500">Nova Oportunidade</h2>
            <div className="space-y-10">
               <div className="space-y-4">
                  <label className="text-[11px] font-black text-slate-700 uppercase ml-4">Nome do Lead</label>
                  <input className="w-full p-8 border-4 border-slate-400 rounded-[2.5rem] bg-white text-slate-900 font-black text-2xl outline-none focus:border-blue-600" value={newLead.name} onChange={e => setNewLead({...newLead, name: e.target.value})} />
               </div>
               <div className="grid grid-cols-2 gap-10">
                  <div className="space-y-4">
                     <label className="text-[11px] font-black text-slate-700 uppercase ml-4">Valor (R$)</label>
                     <input type="number" className="w-full p-8 border-4 border-slate-400 rounded-[2.5rem] bg-white text-slate-900 font-black text-2xl outline-none focus:border-blue-600" value={newLead.value} onChange={e => setNewLead({...newLead, value: e.target.value})} />
                  </div>
                  <div className="space-y-4">
                     <label className="text-[11px] font-black text-slate-700 uppercase ml-4">Vendedor</label>
                     <select className="w-full p-8 border-4 border-slate-400 rounded-[2.5rem] bg-white text-slate-900 font-black text-2xl outline-none" value={newLead.vendor} onChange={e => setNewLead({...newLead, vendor: e.target.value})}>
                        <option>Vendedor 1</option>
                        <option>Vendedor 2</option>
                     </select>
                  </div>
               </div>
               <button onClick={handleCreateLead} className="w-full bg-blue-600 text-white p-10 rounded-[3rem] font-black uppercase shadow-2xl text-xl flex items-center justify-center gap-4">
                  ATIVAR LEAD <ArrowRight size={28}/>
               </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
