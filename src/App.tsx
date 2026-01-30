import React, { useState, useEffect, useMemo } from 'react';
import { createClient } from '@supabase/supabase-js';
import { 
  TrendingUp, Layers, ArrowDownWideNarrow, BarChart, 
  DollarSign, Archive, PlusCircle, Trash2, Info, 
  ShieldCheck, Zap, Award, Settings, 
  Search, RotateCcw, X, ArrowRight
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

// --- SUBCOMPONENTES DE UI ---
const QuickAction = ({ label, active, color, onClick }) => (
  <button onClick={onClick} className={`p-4 rounded-[1.5rem] border-2 text-[9px] font-black uppercase transition-all shadow-sm ${active ? `${color} text-white border-transparent scale-105 shadow-md` : 'bg-white text-slate-300 border-slate-100 hover:border-slate-300'}`}>
    {label}
  </button>
);

const FunnelStep = ({ label, count, percent, color }) => (
  <div className="flex items-center gap-6">
    <div className={`h-24 ${color} rounded-[2rem] flex items-center justify-between px-10 text-white shadow-xl transition-all`} style={{ width: `${Math.max(percent, 30)}%` }}>
      <span className="font-black uppercase tracking-widest text-sm">{label}</span>
      <span className="font-black text-3xl font-mono">{count}</span>
    </div>
    <div className="text-slate-400 font-black text-xl italic">{percent.toFixed(0)}%</div>
  </div>
);

const FunnelRate = ({ value }) => (
  <div className="flex justify-center w-full py-1">
    <div className="flex flex-col items-center gap-1">
      <div className="w-1 h-8 bg-gradient-to-b from-slate-200 to-transparent rounded-full"></div>
      <span className="bg-white border text-[10px] font-black px-3 py-1 rounded-full shadow-sm text-blue-600">{value.toFixed(1)}% Conv.</span>
      <div className="w-1 h-8 bg-gradient-to-t from-slate-200 to-transparent rounded-full"></div>
    </div>
  </div>
);

const FinanceBox = ({ title, icon, children }) => (
  <div className="bg-slate-900 p-12 rounded-[4rem] text-white shadow-xl flex flex-col h-full">
    <h4 className="text-xs font-black uppercase mb-10 border-b border-white/10 pb-8 flex items-center gap-4">{icon} {title}</h4>
    <div className="space-y-6">{children}</div>
  </div>
);

const FinanceRule = ({ label, val, active }) => (
  <div className={`flex justify-between items-center p-6 rounded-[2rem] border-2 transition-all ${active ? 'bg-white/10 border-emerald-500 shadow-lg' : 'bg-white/5 border-transparent opacity-30'}`}>
    <span className="text-[10px] font-black uppercase tracking-widest text-white">{label}</span>
    <span className={`text-sm font-black ${active ? 'text-emerald-400' : 'text-slate-50'}`}>{val}</span>
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
    <tr className="hover:bg-slate-50 transition-all">
      <td className="p-14 font-black text-slate-800 text-sm tracking-tight uppercase">{title}</td>
      <td className="p-14 text-center italic text-slate-400 font-bold">{meta}</td>
      {[1, 2, 3, 4].map(w => {
        const v = getWeekValue(w);
        return (
          <td key={w} className="p-14 text-center">
            <div className="flex flex-col items-center gap-3">
              <div className={`w-4 h-4 rounded-full ${getStatusColor(v)} shadow-lg ring-4 ring-slate-100`}></div>
              <span className="text-[11px] font-black">{format(v)}</span>
            </div>
          </td>
        );
      })}
      <td className="p-14 text-center bg-blue-50/50">
        <div className="flex flex-col items-center gap-3">
          <div className={`w-6 h-6 rounded-full ${getStatusColor(parseFloat(total))} shadow-xl`}></div>
          <span className="text-2xl font-black text-blue-900 tracking-tighter">{total}</span>
        </div>
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
  const [isSaving, setIsSaving] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  const [goals, setGoals] = useState({
    revenue: 50000, ticket: 1500, contacts: 40, followUp: 80,
    crossSell: 20, upSell: 15, postSale: 90, reactivated: 10
  });

  const [commSettings, setCommSettings] = useState({
    profitMargin: 20,
    weeks: {
      1: { revenue: 0, ticket: 0 }, 2: { revenue: 0, ticket: 0 },
      3: { revenue: 0, ticket: 0 }, 4: { revenue: 0, ticket: 0 }
    }
  });

  const [newLead, setNewLead] = useState({
    name: '', value: '', vendor: 'Vendedor 1', notes: '', 
    stage: 'contato', tags: '', followUp: false, 
    postSale: false, hasCrossSell: false, hasUpSell: false, reactivated: false
  });

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
    setIsSaving(false);
  };

  const handleCreateLead = async () => {
    if (!newLead.name.trim() || !newLead.value) {
      return;
    }
    await handleSaveLead({ ...newLead, week: currentWeek, isArchived: false });
    setIsModalOpen(false);
    setNewLead({ name: '', value: '', vendor: 'Vendedor 1', notes: '', stage: 'contato', tags: '', followUp: false, postSale: false, hasCrossSell: false, hasUpSell: false, reactivated: false });
    toast.success("Lead ativado com sucesso!");
  };

  const deleteLead = async (id) => {
    if (!supabase) return;
    const { error } = await supabase.from('leads').delete().eq('id', id);
    if (!error) toast.success("Lead removido permanentemente");
  };

  useEffect(() => {
    if (!supabase) {
      setLoading(false);
      return;
    }
    fetchLeads();
    const channel = supabase.channel('sync').on('postgres_changes', { event: '*', schema: 'public', table: 'leads' }, fetchLeads).subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

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

    const totalRev = won.reduce((acc, curr) => acc + (Number(curr.value) || 0), 0);
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

  if (loading) return (
    <div className="h-screen bg-slate-900 flex items-center justify-center font-black text-blue-500 italic animate-pulse">
      BOOTING CRM ULTRA SYSTEM...
    </div>
  );

  return (
    <div className="min-h-screen bg-[#F1F5F9] p-4 md:p-8 font-sans">
      <Toaster position="top-right" richColors />
      
      {/* HEADER DINÂMICO */}
      <header className="max-w-[1600px] mx-auto mb-10 flex flex-col xl:flex-row justify-between items-center gap-8">
        <div className="flex items-center gap-6">
          <div className="bg-slate-900 p-5 rounded-[2.5rem] shadow-2xl">
            <TrendingUp className="text-blue-500" size={32} />
          </div>
          <div>
            <h1 className="text-4xl font-black tracking-tighter text-slate-900 italic">SALES<span className="text-blue-600">PRO</span> CORE</h1>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.4em] flex items-center gap-2">
              <span className="w-2 h-2 bg-emerald-500 rounded-full animate-ping"></span> Real-time Sync Active
            </p>
          </div>
        </div>

        <div className="flex flex-wrap justify-center gap-3 bg-white p-3 rounded-[3rem] shadow-xl border border-white">
          <div className="flex bg-slate-100 p-1.5 rounded-2xl mr-4">
            {[1, 2, 3, 4].map(w => (
              <button key={w} onClick={() => setCurrentWeek(w)} className={`px-5 py-2.5 rounded-xl font-black text-xs transition-all ${currentWeek === w ? 'bg-white text-blue-600 shadow-md' : 'text-slate-400 hover:text-slate-600'}`}>
                S{w}
              </button>
            ))}
          </div>
          <nav className="flex gap-1">
            {[
              { id: 'pipeline', label: 'Pipeline', icon: <Layers size={14}/> },
              { id: 'funnel', label: 'Funil', icon: <ArrowDownWideNarrow size={14}/> },
              { id: 'metrics', label: 'Indicadores', icon: <BarChart size={14}/> },
              { id: 'commission', label: 'Financeiro', icon: <DollarSign size={14}/> },
              { id: 'archive', label: 'Arquivo', icon: <Archive size={14}/> }
            ].map(tab => (
              <button key={tab.id} onClick={() => setActiveTab(tab.id)} className={`px-6 py-3 rounded-2xl font-black text-[10px] uppercase transition-all ${activeTab === tab.id ? 'bg-slate-900 text-white shadow-2xl' : 'text-slate-500 hover:bg-slate-50'}`}>
                <span className="flex items-center gap-2">{tab.icon} {tab.label}</span>
              </button>
            ))}
          </nav>
          <button onClick={() => setIsModalOpen(true)} className="bg-blue-600 text-white p-4 rounded-full shadow-lg hover:scale-110 transition-all ml-2">
            <PlusCircle size={22} />
          </button>
        </div>
      </header>

      <main className="max-w-[1600px] mx-auto">
        {/* VIEW: PIPELINE */}
        {activeTab === 'pipeline' && (
          <div className="grid grid-cols-1 md:grid-cols-5 gap-6 animate-in fade-in duration-500">
            {STAGES.map(stage => {
              const stageLeads = leads.filter(l => l.stage === stage.id && Number(l.week) === currentWeek && !l.isArchived);
              const columnValue = stageLeads.reduce((acc, curr) => acc + (Number(curr.value) || 0), 0);
              return (
                <div key={stage.id} onDragOver={(e) => e.preventDefault()} onDrop={(e) => {
                  const id = e.dataTransfer.getData("leadId");
                  const lead = leads.find(l => String(l.id) === String(id));
                  if (lead) handleSaveLead({ ...lead, stage: stage.id });
                }} className="bg-slate-200/40 p-6 rounded-[3rem] border-2 border-dashed border-slate-300/50 min-h-[600px]">
                  <div className="mb-8 px-2 flex justify-between items-start">
                    <div>
                      <h3 className="font-black text-[10px] uppercase text-slate-400 tracking-[0.2em] mb-1">{stage.label}</h3>
                      <p className="text-xl font-black text-slate-800 tracking-tighter">R$ {columnValue.toLocaleString()}</p>
                    </div>
                    <span className="bg-white px-3 py-1 rounded-full text-[10px] font-black text-slate-400 shadow-sm border border-slate-100">{stageLeads.length}</span>
                  </div>
                  <div className="space-y-5">
                    {stageLeads.map(lead => (
                      <div key={lead.id} draggable onDragStart={(e) => e.dataTransfer.setData("leadId", lead.id)} className="bg-white p-6 rounded-[2.5rem] shadow-sm border-2 border-white hover:shadow-2xl relative group cursor-grab active:cursor-grabbing transition-all">
                        <button onClick={() => deleteLead(lead.id)} className="absolute -right-2 -top-2 bg-white text-rose-500 p-2 rounded-full shadow-xl border opacity-0 group-hover:opacity-100 transition-all"><Trash2 size={12}/></button>
                        <h4 className="font-black text-xs text-slate-800 uppercase mb-1">{lead.name}</h4>
                        <div className="text-emerald-600 font-black text-sm mb-4">R$ {Number(lead.value).toLocaleString()}</div>
                        <div className="grid grid-cols-2 gap-2 mb-4">
                           <QuickAction label="FUP" active={lead.followUp} color="bg-blue-600" onClick={() => handleSaveLead({...lead, followUp: !lead.followUp})} />
                           <QuickAction label="PÓS" active={lead.postSale} color="bg-emerald-600" onClick={() => handleSaveLead({...lead, postSale: !lead.postSale})} />
                        </div>
                        <div className="flex justify-between items-center pt-4 border-t">
                           <button onClick={() => handleSaveLead({...lead, isArchived: true})} className="text-[9px] font-black text-slate-300 hover:text-slate-600 uppercase">Arquivar</button>
                           <div className="flex gap-1">
                             {AVAILABLE_TAGS.map(tag => (
                               <div key={tag.id} className={`w-3 h-3 rounded-full ${lead.tags?.includes(tag.id) ? tag.color : 'bg-slate-100 hover:bg-slate-200'}`} />
                             ))}
                           </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* VIEW: FUNIL E KPIS INTEGRADOS */}
        {activeTab === 'funnel' && (
          <div className="max-w-4xl mx-auto space-y-2 animate-in slide-in-from-bottom-10">
            <FunnelStep label="Primeiros Contatos" count={analytics.funnel.contato} percent={100} color="bg-slate-900" />
            <FunnelRate value={analytics.rates.c2o} />
            <FunnelStep label="Propostas Geradas" count={analytics.funnel.orcamento} percent={analytics.rates.c2o} color="bg-blue-600" />
            <FunnelRate value={analytics.rates.o2n} />
            <FunnelStep label="Negociações Ativas" count={analytics.funnel.negociacao} percent={analytics.rates.o2n * (analytics.rates.c2o/100)} color="bg-indigo-600" />
            <FunnelRate value={analytics.rates.n2f} />
            <FunnelStep label="Vendas Ganhas" count={analytics.funnel.fechado} percent={analytics.rates.total} color="bg-emerald-500" />
            
            <div className="grid grid-cols-3 gap-6 mt-20">
               <div className="bg-white p-10 rounded-[3rem] text-center shadow-xl border-t-8 border-blue-600">
                  <p className="text-[10px] font-black text-slate-400 uppercase mb-2">Conversão Geral</p>
                  <p className="text-4xl font-black">{analytics.rates.total.toFixed(1)}%</p>
               </div>
               <div className="bg-white p-10 rounded-[3rem] text-center shadow-xl border-t-8 border-emerald-500">
                  <p className="text-[10px] font-black text-slate-400 uppercase mb-2">Eficiência Comercial</p>
                  <p className="text-4xl font-black">{analytics.rates.n2f.toFixed(1)}%</p>
               </div>
               <div className="bg-white p-10 rounded-[3rem] text-center shadow-xl border-t-8 border-indigo-500">
                  <p className="text-[10px] font-black text-slate-400 uppercase mb-2">Engajamento Lead</p>
                  <p className="text-4xl font-black">{analytics.rates.c2o.toFixed(1)}%</p>
               </div>
            </div>
          </div>
        )}

        {/* VIEW: INDICADORES TÉCNICOS */}
        {activeTab === 'metrics' && (
          <div className="bg-white rounded-[4rem] shadow-2xl border overflow-hidden animate-in zoom-in-95 duration-500">
             <table className="w-full">
                <thead className="bg-slate-900 text-white font-black uppercase text-[10px] tracking-widest">
                   <tr>
                      <th className="p-14 text-left">Fator Crítico de Sucesso</th>
                      <th className="p-14">Meta</th>
                      <th className="p-14">Semana 1</th>
                      <th className="p-14">Semana 2</th>
                      <th className="p-14">Semana 3</th>
                      <th className="p-14">Semana 4</th>
                      <th className="p-14 bg-blue-600">Total Mensal</th>
                   </tr>
                </thead>
                <tbody className="divide-y">
                   <KPIRow title="Novos Contatos Realizados" meta={goals.contacts} total={analytics.funnel.contato} field="contato" data={leads} format={v => v} />
                   <KPIRow title="Taxa de Follow-up (80%)" meta={`${goals.followUp}%`} total={`${analytics.kpis.fup.toFixed(1)}%`} field="fup" data={leads} format={v => `${v.toFixed(0)}%`} isPercent />
                   <KPIRow title="Pós-Venda Ativo (90%)" meta={`${goals.postSale}%`} total={`${analytics.kpis.post.toFixed(1)}%`} field="post" data={leads} format={v => `${v.toFixed(0)}%`} isPercent />
                   <KPIRow title="Oportunidades Reativadas" meta={goals.reactivated} total={leads.filter(l => l.reactivated).length} field="react" data={leads} format={v => v} />
                </tbody>
             </table>
          </div>
        )}

        {/* VIEW: FINANCEIRO E REGRAS DE COMISSÃO */}
        {activeTab === 'commission' && (
          <div className="space-y-10 animate-in fade-in duration-500">
             <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
                <div className="lg:col-span-2 bg-slate-900 p-16 rounded-[4.5rem] text-white shadow-2xl relative overflow-hidden">
                   <div className="relative z-10">
                      <p className="text-blue-500 font-black uppercase tracking-[0.3em] mb-4">Receita Total Acumulada</p>
                      <h3 className="text-8xl font-black font-mono tracking-tighter mb-10">R$ {analytics.totalRev.toLocaleString()}</h3>
                      <div className="grid grid-cols-3 gap-10 pt-10 border-t border-white/10">
                         <div><p className="text-[10px] opacity-40 uppercase mb-2">Ticket Médio</p><p className="text-3xl font-black italic">R$ {analytics.avgTicket.toLocaleString()}</p></div>
                         <div><p className="text-[10px] opacity-40 uppercase mb-2">Performance Meta</p><p className="text-3xl font-black text-emerald-400">{analytics.revPerf.toFixed(1)}%</p></div>
                         <div><p className="text-[10px] opacity-40 uppercase mb-2">Acelerador</p><p className="text-3xl font-black">+{analytics.finalRate.toFixed(1)}%</p></div>
                      </div>
                   </div>
                </div>
                <div className="bg-white p-16 rounded-[4.5rem] border-[10px] border-emerald-500 shadow-2xl flex flex-col justify-center text-center">
                   <Award className="mx-auto mb-6 text-emerald-600" size={64}/>
                   <p className="text-slate-400 font-black uppercase tracking-widest mb-2">Sua Remuneração Variável</p>
                   <h3 className="text-7xl text-slate-900 font-black font-mono tracking-tighter">R$ {analytics.finalCommission.toLocaleString()}</h3>
                   <div className={`mt-10 p-4 rounded-2xl font-black text-[10px] uppercase ${analytics.bonusFixoHabilitado ? 'bg-emerald-100 text-emerald-700 ring-4 ring-emerald-50' : 'bg-slate-100 text-slate-400'}`}>
                      {analytics.bonusFixoHabilitado ? '🚀 Bônus Especial R$ 300 Ativado' : '🔒 Travas de Bônus Pendentes'}
                   </div>
                </div>
             </div>
             <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
                <FinanceBox title="Aceleradores de Comissão" icon={<Zap size={18}/>}>
                   <FinanceRule label="Ticket > R$ 1.500" val="+ 0.5%" active={analytics.avgTicket >= goals.ticket} />
                   <FinanceRule label="Cross-Sell > 20%" val="+ 0.5%" active={analytics.kpis.cross >= goals.crossSell} />
                   <FinanceRule label="Up-Sell > 15%" val="+ 0.5%" active={analytics.kpis.up >= goals.upSell} />
                </FinanceBox>
                <FinanceBox title="Checklist de Bônus Fixo" icon={<ShieldCheck size={18}/>}>
                   <FinanceRule label="Mínimo 40 Contatos" val={analytics.funnel.contato} active={analytics.funnel.contato >= goals.contacts} />
                   <FinanceRule label="Follow-up > 80%" val={`${analytics.kpis.fup.toFixed(0)}%`} active={analytics.kpis.fup >= goals.followUp} />
                   <FinanceRule label="Pós-Venda > 90%" val={`${analytics.kpis.post.toFixed(0)}%`} active={analytics.kpis.post >= goals.postSale} />
                </FinanceBox>
                <div className="bg-white p-12 rounded-[4rem] border-2 shadow-xl">
                   <h4 className="text-xs font-black uppercase mb-10 text-slate-400 flex items-center gap-4"><Settings size={18}/> Parâmetros do Ciclo</h4>
                   <div className="space-y-6">
                      <div className="flex flex-col gap-2">
                         <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4">Meta Mensal (R$)</label>
                         <input type="number" className="w-full p-6 border-2 rounded-[2rem] font-black bg-slate-50 outline-none focus:border-blue-600 transition-all shadow-inner" value={goals.revenue} onChange={e => setGoals({...goals, revenue: Number(e.target.value)})} />
                      </div>
                      <div className="flex flex-col gap-2">
                         <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4">Meta Ticket Médio</label>
                         <input type="number" className="w-full p-6 border-2 rounded-[2rem] font-black bg-slate-50 outline-none focus:border-blue-600 transition-all shadow-inner" value={goals.ticket} onChange={e => setGoals({...goals, ticket: Number(e.target.value)})} />
                      </div>
                   </div>
                </div>
             </div>
          </div>
        )}

        {/* VIEW: HISTÓRICO E ARQUIVO */}
        {activeTab === 'archive' && (
          <div className="space-y-10 animate-in fade-in duration-500">
             <div className="bg-white p-10 rounded-[3rem] border flex justify-between items-center shadow-lg">
                <div className="flex items-center gap-6">
                   <div className="bg-slate-900 p-4 rounded-2xl text-white shadow-xl"><Archive size={24}/></div>
                   <div>
                      <h3 className="text-2xl font-black uppercase italic tracking-tighter">Arquivo Geral</h3>
                      <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest">Memória de Operação</p>
                   </div>
                </div>
                <div className="relative w-96">
                   <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-300" size={18}/>
                   <input type="text" placeholder="Pesquisar no arquivo..." className="w-full p-5 pl-14 rounded-2xl border bg-slate-50 font-black outline-none focus:border-blue-600 shadow-inner transition-all" onChange={e => setSearchTerm(e.target.value)} />
                </div>
             </div>
             <div className="bg-white rounded-[3rem] shadow-2xl border overflow-hidden">
                <table className="w-full text-left border-collapse">
                   <thead className="bg-slate-50 text-slate-400 font-black uppercase text-[10px] tracking-widest border-b">
                      <tr>
                         <th className="p-10">Lead / Empresa</th>
                         <th className="p-10 text-center">Valor Base</th>
                         <th className="p-10 text-center">Status Final</th>
                         <th className="p-10 text-center">Data Saída</th>
                         <th className="p-10 text-center">Recuperar</th>
                      </tr>
                   </thead>
                   <tbody className="divide-y font-bold text-slate-600 text-xs">
                      {leads.filter(l => l.isArchived).filter(l => l.name.toLowerCase().includes(searchTerm.toLowerCase())).map(lead => (
                        <tr key={lead.id} className="hover:bg-slate-50 transition-all uppercase">
                           <td className="p-10 font-black text-slate-800">{lead.name}</td>
                           <td className="p-10 text-center text-emerald-600 font-black font-mono">R$ {Number(lead.value).toLocaleString()}</td>
                           <td className="p-10 text-center">
                              <span className={`px-4 py-1.5 rounded-full text-[9px] font-black border ${lead.stage === 'fechado' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-rose-50 text-rose-600 border-rose-100'}`}>
                                 {lead.stage === 'fechado' ? 'GANHO' : 'PERDIDO'}
                              </span>
                           </td>
                           <td className="p-10 text-center opacity-40 font-mono text-[10px] italic">
                              {new Date(lead.lastUpdate || Date.now()).toLocaleDateString()}
                           </td>
                           <td className="p-10 text-center">
                              <button onClick={() => handleSaveLead({...lead, isArchived: false})} className="p-4 rounded-xl border-2 border-slate-100 hover:border-blue-600 hover:bg-blue-600 hover:text-white transition-all shadow-sm">
                                 <RotateCcw size={18}/>
                              </button>
                           </td>
                        </tr>
                      ))}
                   </tbody>
                </table>
             </div>
          </div>
        )}
      </main>

      {/* MODAL ADIÇÃO DE LEADS */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/90 backdrop-blur-xl flex items-center justify-center p-4 z-[200] animate-in fade-in duration-300">
          <div className="bg-white rounded-[4rem] p-16 max-w-2xl w-full shadow-2xl border-t-[16px] border-blue-600 relative overflow-hidden">
            <button onClick={() => setIsModalOpen(false)} className="absolute top-8 right-8 text-slate-300 hover:text-rose-500 hover:rotate-90 transition-all duration-300"><X size={32}/></button>
            <h2 className="text-4xl font-black mb-10 uppercase italic tracking-tighter text-slate-800">Nova Oportunidade <span className="text-blue-600">Ultra</span></h2>
            <div className="space-y-8">
               <div className="space-y-3">
                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-4 italic">Nome do Lead / Empresa</label>
                  <input className="w-full p-7 rounded-[2rem] border-2 bg-slate-50 font-black outline-none focus:border-blue-500 transition-all text-lg shadow-inner" value={newLead.name} onChange={e => setNewLead({...newLead, name: e.target.value})} placeholder="Ex: Corporativo Internacional S.A" />
               </div>
               <div className="grid grid-cols-2 gap-8">
                  <div className="space-y-3">
                     <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-4 italic">Valor do Negócio (R$)</label>
                     <input type="number" className="w-full p-7 rounded-[2rem] border-2 bg-slate-50 font-black outline-none focus:border-blue-500 transition-all text-lg shadow-inner" value={newLead.value} onChange={e => setNewLead({...newLead, value: e.target.value})} placeholder="0,00" />
                  </div>
                  <div className="space-y-3">
                     <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-4 italic">Origem do Lead</label>
                     <select className="w-full p-7 rounded-[2rem] border-2 bg-slate-50 font-black outline-none focus:border-blue-500 transition-all text-lg shadow-inner appearance-none" value={newLead.vendor} onChange={e => setNewLead({...newLead, vendor: e.target.value})}>
                        <option>Vendedor 1</option>
                        <option>Vendedor 2</option>
                        <option>Canal Digital</option>
                     </select>
                  </div>
               </div>
               <div className="p-8 bg-blue-50 rounded-[2.5rem] border-2 border-blue-100 flex items-center justify-between">
                  <div className="flex items-center gap-4">
                     <div className={`p-4 rounded-full transition-all ${newLead.reactivated ? 'bg-blue-600 text-white' : 'bg-white text-slate-300'}`} onClick={() => setNewLead({...newLead, reactivated: !newLead.reactivated})}>
                        <Activity size={24}/>
                     </div>
                     <div>
                        <p className="text-[10px] font-black uppercase tracking-widest text-blue-600 italic">Lead Reativado?</p>
                        <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest">Soma bônus de reativação</p>
                     </div>
                  </div>
                  <div className={`w-14 h-8 rounded-full border-2 p-1 transition-all cursor-pointer ${newLead.reactivated ? 'bg-blue-600 border-blue-600' : 'bg-slate-200 border-slate-200'}`} onClick={() => setNewLead({...newLead, reactivated: !newLead.reactivated})}>
                     <div className={`w-5 h-5 bg-white rounded-full shadow-md transition-all ${newLead.reactivated ? 'translate-x-6' : 'translate-x-0'}`}></div>
                  </div>
               </div>
               <button disabled={isSaving || !newLead.name || !newLead.value} onClick={handleCreateLead} className="w-full bg-blue-600 text-white p-8 rounded-[2.5rem] font-black uppercase shadow-2xl hover:scale-[1.02] active:scale-95 transition-all text-lg flex items-center justify-center gap-4 group">
                  {isSaving ? 'SINCRONIZANDO...' : 'ATIVAR OPORTUNIDADE'} <ArrowRight size={24} className="group-hover:translate-x-2 transition-all"/>
               </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
