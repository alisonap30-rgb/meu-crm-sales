import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { createClient } from '@supabase/supabase-js';
import { 
  TrendingUp, PlusCircle, Trash2, BarChart2,
  Target, AlertCircle, Archive, 
  RotateCcw, Tag as TagIcon, Info,
  CheckCircle2, ChevronRight, DollarSign,
  User, Calendar, FileText, ClipboardList,
  ShieldCheck, Zap, ArrowRight,
  Clock, Award, BarChart, Grab, Search, Filter,
  Settings, RefreshCw, Layers, ArrowDownWideNarrow, 
  PieChart, Activity, X
} from 'lucide-react';

// --- CONFIGURAÇÃO CORE ---
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || "";
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || "";
const supabase = (SUPABASE_URL && SUPABASE_KEY) ? createClient(SUPABASE_URL, SUPABASE_KEY) : null;

const STAGES = [
  { id: 'contato', label: 'Primeiro Contato', color: 'bg-slate-400' },
  { id: 'orcamento', label: 'Orçamento/Proposta', color: 'bg-blue-500' },
  { id: 'negociacao', label: 'Em Negociação', color: 'bg-amber-500' },
  { id: 'fechado', label: 'Contrato Fechado', color: 'bg-emerald-500' },
  { id: 'perdido', label: 'Oportunidade Perdida', color: 'bg-rose-500' }
];

const AVAILABLE_TAGS = [
  { id: 'proposta', label: 'PROPOSTA', color: 'bg-blue-500', light: 'bg-blue-50 text-blue-600 border-blue-100' },
  { id: 'followup', label: 'FOLLOW-UP', color: 'bg-amber-500', light: 'bg-amber-50 text-amber-700 border-amber-100' },
  { id: 'urgente', label: 'URGENTE', color: 'bg-red-500', light: 'bg-red-50 text-red-600 border-red-100' },
  { id: 'reuniao', label: 'REUNIÃO', color: 'bg-emerald-500', light: 'bg-emerald-50 text-emerald-600 border-emerald-100' },
];

export default function CRMEnterpriseSystem() {
  // --- ESTADOS DE DADOS ---
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentWeek, setCurrentWeek] = useState(1);
  const [activeTab, setActiveTab] = useState('pipeline');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  // --- PARAMETRIZAÇÃO DE METAS ---
  const [goals, setGoals] = useState({
    revenue: 100000, 
    ticket: 5000, 
    contacts: 400, 
    followUp: 90, 
    crossSell: 40, 
    upSell: 15, 
    postSale: 100, 
    reactivated: 20, 
    conversion: 5
  });

  const [commSettings, setCommSettings] = useState({
    weeks: {
      1: { revenue: 0, ticket: 0 },
      2: { revenue: 0, ticket: 0 },
      3: { revenue: 0, ticket: 0 },
      4: { revenue: 0, ticket: 0 }
    },
    profitMargin: 15
  });

  const [newLead, setNewLead] = useState({
    name: '', value: '', vendor: 'Vendedor 1', notes: '', stage: 'contato', tags: '',
    followUp: false, postSale: false, hasCrossSell: false, hasUpSell: false, reactivated: false
  });

  // --- PERSISTÊNCIA E REALTIME ---
  const fetchLeads = useCallback(async () => {
    if (!supabase) return;
    const { data, error } = await supabase.from('leads').select('*').order('lastUpdate', { ascending: false });
    if (!error) setLeads(data || []);
    setLoading(false);
  }, []);

// --- BUSCA DE DADOS COM TRAVA DE SEGURANÇA ---
useEffect(() => {
  // Correção: Verifica o supabase ANTES de qualquer chamada
  if (!supabase) {
    setLoading(false);
    return;
  }

  // Agora é seguro chamar a busca de dados
  fetchLeads();

  const channel = supabase.channel('crm_ultra_sync')
    .on('postgres_changes', 
      { event: '*', schema: 'public', table: 'leads' }, 
      () => fetchLeads()
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}, []);

  // Nomeamos o canal de forma única para evitar conflitos de assinatura
  const subscription = supabase.channel('leads_realtime_sync')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'leads' }, fetchLeads)
    .subscribe((status) => {
      if (status !== 'SUBSCRIBED') {
        console.warn("Realtime ainda não conectado...");
      }
    });

  return () => {
    if (supabase) supabase.removeChannel(subscription);
  };
}, []);

// --- WRAPPER DE SEGURANÇA PARA UPSERT ---
const handleSaveLead = async (leadData) => {
  if (!supabase) return toast.error("Sem conexão com o banco de dados");
  
  const { error } = await supabase.from('leads').upsert({
    ...leadData,
    lastUpdate: new Date().toISOString()
  });

  if (error) {
    console.error("Erro Supabase:", error);
    toast.error("Erro ao salvar: " + error.message);
  }
};

  // Substitua ou mantenha apenas UMA instância desta função:
const handleSaveLead = async (leadData: any) => {
  if (!supabase) return; // Proteção contra conexão nula
  setIsSaving(true);
  
  const { error } = await supabase.from('leads').upsert({
    ...leadData,
    lastUpdate: new Date().toISOString()
  });

  if (error) {
    console.error("Erro ao salvar:", error);
  }
  setIsSaving(false);
};

  const deleteLead = async (id) => {
    if (!window.confirm("Deseja deletar este lead permanentemente?")) return;
    const { error } = await supabase.from('leads').delete().eq('id', id);
    if (!error) fetchLeads();
  };

  // --- LÓGICA DE ETIQUETAS ---
  const toggleTag = (lead, tagId) => {
    let currentTags = lead.tags ? lead.tags.split(',') : [];
    if (currentTags.includes(tagId)) {
      currentTags = currentTags.filter(t => t !== tagId);
    } else {
      currentTags.push(tagId);
    }
    handleSaveLead({ ...lead, tags: currentTags.join(',') });
  };

  // --- MOTOR DE DRAG & DROP ---
  const onDragStart = (e, id) => {
    e.dataTransfer.setData("leadId", id);
    e.dataTransfer.effectAllowed = "move";
  };

  const onDragOver = (e) => {
    e.preventDefault();
    e.currentTarget.classList.add('bg-slate-200', 'border-blue-300');
  };

  const onDragLeave = (e) => {
    e.preventDefault();
    e.currentTarget.classList.remove('bg-slate-200', 'border-blue-300');
  };

  const onDrop = async (e, targetStage) => {
    e.preventDefault();
    e.currentTarget.classList.remove('bg-slate-200', 'border-blue-300');
    const id = e.dataTransfer.getData("leadId");
    const lead = leads.find(l => l.id === id);
    if (lead && lead.stage !== targetStage) {
      await handleSaveLead({ ...lead, stage: targetStage });
    }
  };

  // --- MOTOR ANALÍTICO ---
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
      c2o: funnel.contato > 0 ? (funnel.orcamento / funnel.contato) * 100 : 0,
      o2n: funnel.orcamento > 0 ? (funnel.negociacao / funnel.orcamento) * 100 : 0,
      n2f: funnel.negociacao > 0 ? (funnel.fechado / funnel.negociacao) * 100 : 0,
      total: funnel.contato > 0 ? (funnel.fechado / funnel.contato) * 100 : 0
    };

    const totalRev = Object.values(commSettings.weeks).reduce((a, b) => a + Number(b.revenue), 0);
    const avgTicket = (Object.values(commSettings.weeks).filter(w => Number(w.ticket) > 0).length > 0)
      ? (Object.values(commSettings.weeks).reduce((a, b) => a + Number(b.ticket), 0) / Object.values(commSettings.weeks).filter(w => Number(w.ticket) > 0).length)
      : 0;

    const revPerf = (totalRev / goals.revenue) * 100;
    
    let baseRate = 0;
    if (revPerf >= 110) baseRate = 3.5;
    else if (revPerf >= 100) baseRate = 2.5;
    else if (revPerf >= 90) baseRate = 1.5;

    const kpis = {
      cross: won.length > 0 ? (won.filter(l => l.hasCrossSell).length / won.length) * 100 : 0,
      up: won.length > 0 ? (won.filter(l => l.hasUpSell).length / won.length) * 100 : 0,
      post: won.length > 0 ? (won.filter(l => l.postSale).length / won.length) * 100 : 0,
      fup: active.length > 0 ? (active.filter(l => l.followUp).length / active.length) * 100 : 0
    };

    const accelerators = (Number(commSettings.profitMargin) > 0) ? (
      (avgTicket >= goals.ticket ? 0.5 : 0) +
      (kpis.cross >= goals.crossSell ? 0.5 : 0) +
      (kpis.up >= goals.upSell ? 0.5 : 0)
    ) : 0;

    const bonusFixoHabilitado = active.length >= goals.contacts && kpis.fup >= goals.followUp;
    const finalRate = baseRate + accelerators;
    const finalCommission = (totalRev * (finalRate / 100)) + (bonusFixoHabilitado ? 300 : 0);

    return { funnel, rates, totalRev, avgTicket, revPerf, kpis, finalRate, finalCommission, bonusFixoHabilitado };
  }, [leads, commSettings, goals]);

  if (loading) return (
    <div className="h-screen bg-slate-900 flex items-center justify-center font-black text-blue-500 tracking-tighter italic animate-pulse">
      BOOTING SALESPRO ENTERPRISE ENGINE...
    </div>
  );

  return (
    <div className="min-h-screen bg-[#F1F5F9] p-4 md:p-8 font-sans selection:bg-blue-600 selection:text-white">
      
      {/* HEADER DINÂMICO */}
      <header className="max-w-[1600px] mx-auto mb-10 flex flex-col xl:flex-row justify-between items-center gap-8">
        <div className="flex items-center gap-6">
          <div className="bg-slate-900 p-5 rounded-[2.5rem] shadow-2xl shadow-blue-200">
            <TrendingUp className="text-blue-500" size={32} />
          </div>
          <div>
            <h1 className="text-4xl font-black tracking-tighter text-slate-900 italic">SALES<span className="text-blue-600">PRO</span> CORE</h1>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.4em] flex items-center gap-2">
              <span className="w-2 h-2 bg-emerald-500 rounded-full"></span> Multi-Cycle Control System v5.2
            </p>
          </div>
        </div>

        <div className="flex flex-wrap justify-center gap-3 bg-white p-3 rounded-[3rem] shadow-xl border border-white">
          <div className="flex bg-slate-100 p-1.5 rounded-2xl mr-4">
            {[1, 2, 3, 4].map(w => (
              <button key={w} onClick={() => setCurrentWeek(w)} className={`px-5 py-2.5 rounded-xl font-black text-xs transition-all ${currentWeek === w ? 'bg-white text-blue-600 shadow-md scale-110' : 'text-slate-400 hover:text-slate-600'}`}>S{w}</button>
            ))}
          </div>
          <nav className="flex gap-1">
            {[
              { id: 'pipeline', label: 'Pipeline', icon: <Layers size={14}/> },
              { id: 'funnel', label: 'Funil', icon: <ArrowDownWideNarrow size={14}/> },
              { id: 'metrics', label: 'KPIs', icon: <BarChart size={14}/> },
              { id: 'commission', label: 'Financeiro', icon: <DollarSign size={14}/> },
              { id: 'archive', label: 'Histórico', icon: <Archive size={14}/> }
            ].map(tab => (
              <button key={tab.id} onClick={() => setActiveTab(tab.id)} className={`px-6 py-3 rounded-2xl font-black text-[10px] uppercase transition-all ${activeTab === tab.id ? 'bg-slate-900 text-white shadow-2xl' : 'text-slate-500 hover:bg-slate-50'}`}>
                <span className="flex items-center gap-2">{tab.icon} {tab.label}</span>
              </button>
            ))}
          </nav>
          <div className="flex gap-2 border-l pl-4 border-slate-100">
             <button onClick={() => setIsModalOpen(true)} className="bg-blue-600 text-white p-4 rounded-full shadow-lg hover:scale-110 active:scale-95 transition-all"><PlusCircle size={22} /></button>
          </div>
        </div>
      </header>

      <main className="max-w-[1600px] mx-auto">
        
        {/* PIPELINE VIEW */}
        {activeTab === 'pipeline' && (
          <>
            <div className="max-w-7xl mx-auto mb-6 flex flex-wrap gap-4 p-5 bg-white rounded-[2rem] border shadow-sm items-center">
              <div className="flex items-center gap-2 text-[10px] font-black text-slate-400 uppercase mr-4 tracking-widest"><Info size={16} className="text-blue-500"/> Legenda de Prioridades:</div>
              {AVAILABLE_TAGS.map(tag => (
                <div key={tag.id} className={`flex items-center gap-3 px-4 py-2 rounded-full border ${tag.light} text-[9px] font-black shadow-sm`}>
                  <div className={`w-2.5 h-2.5 rounded-full ${tag.color}`} /> {tag.label}
                </div>
              ))}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-5 gap-6 animate-in fade-in slide-in-from-bottom-4">
              {STAGES.map(stage => {
                const stageLeads = leads.filter(l => l.stage === stage.id && Number(l.week) === currentWeek && !l.isArchived);
                const columnValue = stageLeads.reduce((acc, curr) => acc + (Number(curr.value) || 0), 0);
                
                return (
                  <div 
                    key={stage.id} 
                    onDragOver={onDragOver}
                    onDragLeave={onDragLeave}
                    onDrop={(e) => onDrop(e, stage.id)}
                    className="bg-slate-200/40 p-6 rounded-[3rem] border-2 border-dashed border-slate-300/50 min-h-[800px] transition-all"
                  >
                    <div className="mb-8 px-2 flex justify-between items-start">
                      <div>
                        <h3 className="font-black text-[10px] uppercase text-slate-400 tracking-[0.2em] mb-1">{stage.label}</h3>
                        <p className="text-xl font-black text-slate-800 tracking-tighter">R$ {columnValue.toLocaleString()}</p>
                      </div>
                      <div className="bg-white px-3 py-1 rounded-xl text-[10px] font-black text-blue-600 shadow-sm border">{stageLeads.length}</div>
                    </div>

                    <div className="space-y-5">
                      {stageLeads.map(lead => {
                        const isStale = (Date.now() - new Date(lead.lastUpdate).getTime()) > (3 * 24 * 60 * 60 * 1000) && stage.id !== 'fechado';
                        return (
                          <div 
                            key={lead.id} 
                            draggable 
                            onDragStart={(e) => onDragStart(e, lead.id)}
                            className={`bg-white p-6 rounded-[2.5rem] shadow-sm border-2 transition-all hover:shadow-2xl relative group cursor-grab active:cursor-grabbing ${isStale ? 'border-rose-100 bg-rose-50/20' : 'border-white'}`}
                          >
                            <button onClick={() => deleteLead(lead.id)} className="absolute -right-2 -top-2 bg-white text-rose-500 p-2.5 rounded-full shadow-xl border opacity-0 group-hover:opacity-100 transition-all hover:bg-rose-500 hover:text-white z-10"><Trash2 size={14}/></button>
                            
                            <div className="flex flex-wrap gap-1.5 mb-4">
                              {lead.tags?.split(',').filter(t => t).map(tagId => {
                                const tag = AVAILABLE_TAGS.find(at => at.id === tagId);
                                return tag ? <div key={tagId} className={`px-2.5 py-1 rounded-full text-[7px] font-black ${tag.light} border shadow-sm uppercase`}>{tag.label}</div> : null;
                              })}
                            </div>

                            <div className="flex justify-between items-center mb-4">
                              <span className="text-[9px] font-black text-blue-600 bg-blue-50 px-2.5 py-1 rounded-lg border border-blue-100 uppercase">{lead.vendor}</span>
                              <Grab size={14} className="text-slate-200" />
                            </div>

                            <h4 className="font-black text-xs text-slate-800 uppercase mb-1 leading-tight">{lead.name}</h4>
                            <div className="text-emerald-600 font-black text-sm mb-4">R$ {Number(lead.value).toLocaleString()}</div>
                            
                            <textarea 
                              className="w-full text-[10px] p-3.5 bg-slate-50 border-none rounded-2xl resize-none font-medium text-slate-500 mb-4 focus:ring-2 focus:ring-blue-100"
                              rows="2" placeholder="Notas..." value={lead.notes || ''}
                              onChange={(e) => handleSaveLead({...lead, notes: e.target.value})}
                            />

                            <div className="pt-4 border-t border-slate-50 space-y-4">
                              <div className="flex gap-2.5">
                                {AVAILABLE_TAGS.map(tag => (
                                  <button key={tag.id} onClick={() => toggleTag(lead, tag.id)}
                                    className={`w-4 h-4 rounded-full border-2 transition-all ${lead.tags?.includes(tag.id) ? `${tag.color} border-white shadow-md scale-125` : 'border-slate-100 bg-slate-50 hover:border-slate-300'}`}
                                  />
                                ))}
                              </div>
                              <div className="grid grid-cols-2 gap-2">
                                <QuickAction label="Follow-Up" active={lead.followUp} onClick={()=>handleSaveLead({...lead, followUp: !lead.followUp})} color="bg-amber-500" />
                                <QuickAction label="Pós-Venda" active={lead.postSale} onClick={()=>handleSaveLead({...lead, postSale: !lead.postSale})} color="bg-indigo-600" />
                                <QuickAction label="Cross-Sell" active={lead.hasCrossSell} onClick={()=>handleSaveLead({...lead, hasCrossSell: !lead.hasCrossSell})} color="bg-blue-600" />
                                <QuickAction label="Up-Sell" active={lead.hasUpSell} onClick={()=>handleSaveLead({...lead, hasUpSell: !lead.hasUpSell})} color="bg-emerald-600" />
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}

        {/* FUNNEL VIEW */}
        {activeTab === 'funnel' && (
          <div className="bg-white p-12 rounded-[4rem] shadow-2xl border border-white max-w-6xl mx-auto">
            <div className="flex items-center gap-4 mb-12">
              <div className="bg-blue-50 p-4 rounded-3xl text-blue-600"><PieChart size={32}/></div>
              <h3 className="text-3xl font-black tracking-tighter uppercase">Análise de Conversão</h3>
            </div>
            <div className="flex flex-col gap-4 max-w-4xl mx-auto">
              <FunnelStep label="Lead Captado" count={analytics.funnel.contato} percent={100} color="bg-slate-400" />
              <FunnelRate value={analytics.rates.c2o} />
              <FunnelStep label="Orçamento" count={analytics.funnel.orcamento} percent={analytics.rates.c2o} color="bg-blue-500" />
              <FunnelRate value={analytics.rates.o2n} />
              <FunnelStep label="Negociação" count={analytics.funnel.negociacao} percent={analytics.rates.o2n} color="bg-amber-500" />
              <FunnelRate value={analytics.rates.n2f} />
              <FunnelStep label="Contrato Fechado" count={analytics.funnel.fechado} percent={analytics.rates.total} color="bg-emerald-600" />
            </div>
            <div className="mt-16 grid grid-cols-4 gap-8">
              <ConversionCard label="Conversão Final" value={analytics.rates.total.toFixed(1) + "%"} sub="Total Funil" />
              <ConversionCard label="Ticket Médio" value={"R$ " + analytics.avgTicket.toLocaleString()} sub="Global" />
              <ConversionCard label="Health Score" value="A+" sub="Saúde Pipeline" />
              <ConversionCard label="Reativação" value={goals.reactivated + "%"} sub="Meta Ciclo" />
            </div>
          </div>
        )}

        {/* KPI VIEW */}
        {activeTab === 'metrics' && (
          <div className="bg-white rounded-[4rem] shadow-2xl border overflow-hidden max-w-[1600px] mx-auto">
            <div className="p-14 border-b bg-slate-50/50 flex justify-between items-center">
              <h3 className="text-3xl font-black uppercase flex items-center gap-4"><Activity className="text-blue-600" size={32}/> Dashboard de KPIs</h3>
              <div className="flex gap-4">
                <div className="bg-white p-6 rounded-3xl border shadow-sm min-w-[160px]">
                  <p className="text-[10px] font-black text-slate-400 uppercase mb-1">Performance</p>
                  <p className="text-3xl font-black text-slate-800">{analytics.revPerf.toFixed(1)}%</p>
                </div>
              </div>
            </div>
            <table className="w-full text-left">
              <thead className="bg-slate-900 text-white text-[11px] font-black uppercase tracking-widest">
                <tr>
                  <th className="p-12">Métrica</th>
                  <th className="p-12 text-center">Meta Ciclo</th>
                  {[1,2,3,4].map(w => <th key={w} className="p-12 text-center">S{w}</th>)}
                  <th className="p-12 text-center bg-blue-900">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y font-bold text-xs uppercase text-slate-600">
                <KPIRow title="Novos Contatos" meta={goals.contacts} field="contato" data={leads} total={analytics.funnel.contato} format={v=>v} />
                <KPIRow title="Taxa Follow-up" meta={goals.followUp+"%"} field="fup" data={leads} total={analytics.kpis.fup.toFixed(1)+"%"} format={v=>v.toFixed(1)+"%"} isPercent />
                <KPIRow title="Cross-Sell" meta={goals.crossSell+"%"} field="cross" data={leads} total={analytics.kpis.cross.toFixed(1)+"%"} format={v=>v.toFixed(1)+"%"} isPercent />
                <KPIRow title="Pós-Venda" meta={goals.postSale+"%"} field="post" data={leads} total={analytics.kpis.post.toFixed(1)+"%"} format={v=>v.toFixed(1)+"%"} isPercent />
              </tbody>
            </table>
          </div>
        )}

        {/* FINANCE VIEW */}
        {activeTab === 'commission' && (
          <div className="space-y-12 pb-20 max-w-[1600px] mx-auto">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
              <div className="bg-slate-900 p-16 rounded-[4.5rem] text-white shadow-2xl relative overflow-hidden group">
                <DollarSign className="absolute -right-10 -top-10 opacity-10 group-hover:rotate-12 transition-all duration-1000" size={300}/>
                <p className="text-[12px] font-black uppercase tracking-[0.4em] text-blue-500 mb-4">Receita Consolidada</p>
                <h3 className="text-8xl font-black tracking-tighter mb-12 font-mono">R$ {analytics.totalRev.toLocaleString()}</h3>
                <div className="grid grid-cols-2 gap-10 pt-10 border-t border-white/10">
                  <div><p className="text-[10px] font-black opacity-50 mb-1 tracking-widest uppercase">Meta Atingida</p><p className="text-3xl font-black">{analytics.revPerf.toFixed(1)}%</p></div>
                  <div><p className="text-[10px] font-black opacity-50 mb-1 tracking-widest uppercase">Ticket Médio</p><p className="text-3xl font-black">R$ {analytics.avgTicket.toLocaleString()}</p></div>
                </div>
              </div>

              <div className="bg-white p-16 rounded-[4.5rem] border-[10px] border-emerald-500 shadow-2xl flex flex-col justify-center items-center text-center">
                <div className="bg-emerald-50 p-6 rounded-full mb-8 text-emerald-600"><Award size={64}/></div>
                <p className="text-[14px] text-slate-400 font-black uppercase tracking-[0.4em] mb-4">Comissão Líquida Prevista</p>
                <h3 className="text-9xl text-emerald-600 font-black tracking-tighter font-mono">R$ {analytics.finalCommission.toLocaleString()}</h3>
                <div className="mt-10 bg-emerald-600 text-white px-12 py-4 rounded-[2rem] font-black text-xs uppercase shadow-xl">Taxa Aplicada: {analytics.finalRate.toFixed(1)}%</div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <FinanceBox title="Regras de Escada" icon={<ShieldCheck className="text-blue-500"/>}>
                <FinanceRule label="Meta 90-99%" val="1.5%" active={analytics.revPerf >= 90 && analytics.revPerf < 100}/>
                <FinanceRule label="Meta 100-109%" val="2.5%" active={analytics.revPerf >= 100 && analytics.revPerf < 110}/>
                <FinanceRule label="Meta 110%+" val="3.5%" active={analytics.revPerf >= 110}/>
              </FinanceBox>
              
              <FinanceBox title="Aceleradores" icon={<Zap className="text-amber-500"/>}>
                <FinanceRule label="Ticket Médio" val="+0.5%" active={analytics.avgTicket >= goals.ticket}/>
                <FinanceRule label="Cross-Sell" val="+0.5%" active={analytics.kpis.cross >= goals.crossSell}/>
                <FinanceRule label="Up-Sell" val="+0.5%" active={analytics.kpis.up >= goals.upSell}/>
              </FinanceBox>

              <div className="bg-slate-900 p-12 rounded-[3.5rem] text-white shadow-xl flex flex-col justify-between">
                <div>
                  <h4 className="text-xs font-black uppercase mb-4 flex items-center gap-3"><Award className="text-emerald-500"/> Bônus R$ 300</h4>
                  <p className="text-[10px] text-slate-400 italic">Habilitado com: Meta Contatos ({goals.contacts}) + Follow-up ({goals.followUp}%).</p>
                </div>
                <div className={`p-8 rounded-[2rem] border-2 text-center ${analytics.bonusFixoHabilitado ? 'bg-emerald-500/20 border-emerald-500 shadow-lg' : 'bg-white/5 border-white/5 opacity-30'}`}>
                  <p className="text-2xl font-black">{analytics.bonusFixoHabilitado ? 'LIBERADO' : 'BLOQUEADO'}</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-[4rem] border shadow-2xl p-16">
              <div className="flex justify-between items-center mb-16">
                <h4 className="text-2xl font-black uppercase flex items-center gap-4"><Settings className="text-blue-600"/> Configuração de Metas</h4>
                <div className="flex gap-4">
                   <ParamInput label="Meta Faturamento" val={goals.revenue} onChange={v=>setGoals({...goals, revenue:v})}/>
                   <ParamInput label="Meta Ticket" val={goals.ticket} onChange={v=>setGoals({...goals, ticket:v})}/>
                </div>
              </div>
              <table className="w-full text-left">
                <thead><tr className="text-[11px] font-black text-slate-400 uppercase border-b"><th className="pb-8">Semana</th><th className="pb-8">Faturamento (R$)</th><th className="pb-8">Ticket (R$)</th></tr></thead>
                <tbody className="divide-y">
                  {[1,2,3,4].map(w => (
                    <tr key={w} className="group hover:bg-slate-50 transition-all">
                      <td className="py-10 font-black text-slate-400 text-xs">SEMANA {w}</td>
                      <td className="py-4"><input type="number" className="w-full max-w-xs p-5 bg-slate-100 rounded-3xl font-black border-2 border-transparent focus:border-blue-500 outline-none" value={commSettings.weeks[w].revenue} onChange={e => setCommSettings({...commSettings, weeks: {...commSettings.weeks, [w]: {...commSettings.weeks[w], revenue: e.target.value}}})} /></td>
                      <td className="py-4"><input type="number" className="w-full max-w-xs p-5 bg-slate-100 rounded-3xl font-black border-2 border-transparent focus:border-blue-500 outline-none" value={commSettings.weeks[w].ticket} onChange={e => setCommSettings({...commSettings, weeks: {...commSettings.weeks, [w]: {...commSettings.weeks[w], ticket: e.target.value}}})} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ARCHIVE VIEW */}
        {activeTab === 'archive' && (
          <div className="max-w-[1600px] mx-auto animate-in fade-in">
             <div className="bg-white p-14 rounded-[4rem] border shadow-sm flex flex-col md:flex-row justify-between items-center gap-8 mb-10">
                <div className="flex items-center gap-6">
                   <div className="bg-slate-900 p-6 rounded-[2.5rem] text-white shadow-2xl"><Archive size={36}/></div>
                   <div><h3 className="text-3xl font-black uppercase italic">Leads Arquivados</h3><p className="text-xs text-slate-400 font-black tracking-widest uppercase">Histórico encerrado</p></div>
                </div>
                <div className="relative w-full md:w-[450px]">
                   <Search className="absolute left-7 top-1/2 -translate-y-1/2 text-slate-300" size={24}/>
                   <input type="text" placeholder="Buscar no arquivo..." className="w-full p-7 pl-20 rounded-[2.5rem] border-2 bg-slate-50 font-black outline-none focus:border-blue-600 transition-all shadow-inner" onChange={e => setSearchTerm(e.target.value)} />
                </div>
             </div>
             <div className="bg-white rounded-[4rem] shadow-2xl border overflow-hidden">
                <table className="w-full text-left">
                   <thead className="bg-slate-900 text-white font-black uppercase text-[10px] tracking-widest">
                      <tr><th className="p-14">Empresa</th><th className="p-14">Vendedor</th><th className="p-14 text-center">Valor</th><th className="p-14 text-center">Ação</th></tr>
                   </thead>
                   <tbody className="divide-y font-bold uppercase text-slate-600 text-xs">
                      {leads.filter(l => l.isArchived).filter(l => l.name.toLowerCase().includes(searchTerm.toLowerCase())).map(lead => (
                        <tr key={lead.id} className="hover:bg-slate-50 transition-colors">
                           <td className="p-14 font-black text-slate-800 text-sm">{lead.name}</td>
                           <td className="p-14"><span className="bg-blue-50 text-blue-600 px-5 py-2 rounded-xl border border-blue-100">{lead.vendor}</span></td>
                           <td className="p-14 text-center text-emerald-600 font-black text-base">R$ {Number(lead.value).toLocaleString()}</td>
                           <td className="p-14 text-center">
                              <button onClick={() => handleSaveLead({...lead, isArchived: false})} className="bg-white p-5 rounded-[1.5rem] shadow-md border hover:bg-blue-600 hover:text-white transition-all"><RotateCcw size={22}/></button>
                           </td>
                        </tr>
                      ))}
                   </tbody>
                </table>
             </div>
          </div>
        )}
      </main>

      {/* MODAL DE ADIÇÃO (STRICT-MODE) */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/90 backdrop-blur-xl flex items-center justify-center p-4 z-[200]">
          <div className="bg-white rounded-[4.5rem] p-20 max-w-3xl w-full shadow-2xl border-t-[24px] border-blue-600 relative">
            <button onClick={() => setIsModalOpen(false)} className="absolute top-10 right-10 text-slate-300 hover:text-rose-500"><X size={40}/></button>
            <h2 className="text-5xl font-black mb-14 uppercase italic tracking-tighter text-slate-800">Nova Oportunidade</h2>
            <div className="space-y-10">
               <div className="space-y-4">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.4em] ml-6">Nome do Lead</label>
                  <input className="w-full p-8 rounded-[2.5rem] border-2 bg-slate-50 font-black outline-none focus:border-blue-500 transition-all text-lg shadow-inner" value={newLead.name} onChange={e => setNewLead({...newLead, name: e.target.value})} placeholder="Ex: Empresa X" />
               </div>
               <div className="grid grid-cols-2 gap-10">
                  <div className="space-y-4">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.4em] ml-6">Valor Esperado</label>
                    <input type="number" className="w-full p-8 rounded-[2.5rem] border-2 bg-slate-50 font-black outline-none focus:border-blue-500 transition-all text-lg shadow-inner" value={newLead.value} onChange={e => setNewLead({...newLead, value: e.target.value})} placeholder="0,00" />
                  </div>
                  <div className="space-y-4">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.4em] ml-6">Vendedor</label>
                    <select className="w-full p-8 rounded-[2.5rem] border-2 bg-slate-50 font-black outline-none focus:border-blue-500 transition-all text-lg shadow-inner appearance-none" value={newLead.vendor} onChange={e => setNewLead({...newLead, vendor: e.target.value})}>
                      <option>Vendedor 1</option>
                      <option>Vendedor 2</option>
                    </select>
                  </div>
               </div>
               <div className="pt-10 border-t">
                  <button disabled={isSaving || !newLead.name} onClick={async () => {
                      await handleSaveLead({...newLead, week: currentWeek, isArchived: false, tags: ''});
                      setIsModalOpen(false);
                      setNewLead({name: '', value: '', vendor: 'Vendedor 1', notes: '', stage: 'contato', tags: ''});
                    }} 
                    className="w-full bg-blue-600 text-white p-10 rounded-[3rem] font-black uppercase shadow-2xl hover:scale-[1.02] active:scale-95 transition-all text-xl flex items-center justify-center gap-6"
                  >
                    {isSaving ? 'REGISTRANDO...' : 'ATIVAR LEAD AGORA'} <ArrowRight size={32}/>
                  </button>
               </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// --- SUBCOMPONENTES DE UI ---

const QuickAction = ({ label, active, color, onClick }) => (
  <button onClick={onClick} className={`p-4 rounded-[1.5rem] border-2 text-[9px] font-black uppercase transition-all shadow-sm ${active ? `${color} text-white border-transparent scale-105 shadow-md` : 'bg-white text-slate-300 border-slate-100 hover:border-slate-300'}`}>{label}</button>
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

const ConversionCard = ({ label, value, sub }) => (
  <div className="bg-slate-50 p-10 rounded-[3rem] border-2 border-white text-center shadow-inner">
    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">{label}</p>
    <p className="text-4xl font-black text-slate-800 tracking-tighter mb-1">{value}</p>
    <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest">{sub}</p>
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

const ParamInput = ({ label, val, onChange }) => (
  <div className="flex flex-col gap-3">
    <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-6">{label}</label>
    <input type="number" className="w-48 p-6 border-2 rounded-[2rem] font-black bg-slate-50 outline-none focus:border-blue-600 transition-all text-sm shadow-inner" value={val} onChange={e => onChange(e.target.value)} />
  </div>
);

const KPIRow = ({ title, meta, total, field, data, format, isPercent=false }) => {
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
    if (field === 'fup') return sLeads.length > 0 ? (sLeads.filter(l=>l.followUp).length / sLeads.length) * 100 : 0;
    if (field === 'cross') return won.length > 0 ? (won.filter(l=>l.hasCrossSell).length / won.length) * 100 : 0;
    if (field === 'post') return won.length > 0 ? (won.filter(l=>l.postSale).length / won.length) * 100 : 0;
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
              <div className={`w-4 h-4 rounded-full ${getStatusColor(v)} shadow-lg ring-4 ring-slate-100 transition-all`}></div>
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
