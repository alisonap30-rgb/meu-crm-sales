import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { createClient } from '@supabase/supabase-js';
import { 
  TrendingUp, PlusCircle, Trash2, BarChart2, Target, AlertCircle, Archive, 
  RotateCcw, Tag as TagIcon, Info, CheckCircle2, ChevronRight, DollarSign,
  User, Calendar, FileText, ClipboardList, ShieldCheck, Zap, ArrowRight,
  Clock, Award, BarChart, Grab, Search, Filter, Settings, RefreshCw,
  Layers, ArrowDownWideNarrow, PieChart, Activity, Gauge, MousePointer2
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
  { id: 'proposta', label: 'PROPOSTA ENVIADA', color: 'bg-blue-500', light: 'bg-blue-50 text-blue-600 border-blue-100' },
  { id: 'followup', label: 'AGUARDANDO RETORNO', color: 'bg-amber-500', light: 'bg-amber-50 text-amber-700 border-amber-100' },
  { id: 'urgente', label: 'PRIORIDADE ALTA', color: 'bg-red-500', light: 'bg-red-50 text-red-600 border-red-100' },
  { id: 'reuniao', label: 'REUNIÃO AGENDADA', color: 'bg-emerald-500', light: 'bg-emerald-50 text-emerald-600 border-emerald-100' },
];

export default function CRMMasterSystem() {
  // --- ESTADOS DE DADOS ---
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentWeek, setCurrentWeek] = useState(1);
  const [activeTab, setActiveTab] = useState('pipeline');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCycle, setFilterCycle] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  // --- PARAMETRIZAÇÃO DE METAS (CONFORME TABELA TÉCNICA) ---
  const [goals, setGoals] = useState({
    revenue: 100000, 
    ticket: 5000, 
    contacts: 400, 
    followUp: 90, 
    crossSell: 40, 
    upSell: 15, 
    postSale: 100, 
    reactivated: 8, 
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

  // --- PERSISTÊNCIA E SINCRONIZAÇÃO ---
  const fetchLeads = useCallback(async () => {
    if (!supabase) return;
    const { data, error } = await supabase.from('leads').select('*').order('lastUpdate', { ascending: false });
    if (!error) setLeads(data || []);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchLeads();
    if (!supabase) return;
    const channel = supabase.channel('crm_global_sync')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'leads' }, fetchLeads)
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [fetchLeads]);

  const handleSaveLead = async (leadData) => {
    if (!supabase) return;
    setIsSaving(true);
    const payload = { 
      ...leadData, 
      value: Number(leadData.value) || 0, 
      lastUpdate: new Date().toISOString() 
    };
    const { error } = await supabase.from('leads').upsert(payload);
    if (error) alert("Erro ao sincronizar: " + error.message);
    setIsSaving(false);
  };

  const deleteLead = async (id) => {
    if (!supabase || !window.confirm("Excluir permanentemente este registro?")) return;
    await supabase.from('leads').delete().eq('id', id);
    fetchLeads();
  };

  const toggleTag = (lead, tagId) => {
    let currentTags = lead.tags ? lead.tags.split(',') : [];
    currentTags = currentTags.includes(tagId) ? currentTags.filter(t => t !== tagId) : [...currentTags, tagId];
    handleSaveLead({ ...lead, tags: currentTags.join(',') });
  };

  const handleArchiveCycle = async () => {
    const cycle = window.prompt("Nome do Ciclo (Ex: Jan/26):");
    if (!cycle) return;
    const activeLeads = leads.filter(l => !l.isArchived);
    for (const lead of activeLeads) {
      await supabase.from('leads').update({ isArchived: true, cycle_name: cycle }).eq('id', lead.id);
    }
    fetchLeads();
    alert("Ciclo arquivado com sucesso.");
  };

  // --- ENGINE DE CÁLCULO FINANCEIRO (ALTA PRECISÃO) ---
  const analytics = useMemo(() => {
    const active = leads.filter(l => !l.isArchived);
    const won = active.filter(l => l.stage === 'fechado');
    
    const funnel = {
      contato: active.length,
      orcamento: active.filter(l => ['orcamento', 'negociacao', 'fechado'].includes(l.stage)).length,
      fechado: won.length
    };

    const rates = {
      total: funnel.contato > 0 ? (funnel.fechado / funnel.contato) * 100 : 0,
      c2o: funnel.contato > 0 ? (funnel.orcamento / funnel.contato) * 100 : 0,
      n2f: funnel.orcamento > 0 ? (funnel.fechado / funnel.orcamento) * 100 : 0
    };

    const totalRev = Object.values(commSettings.weeks).reduce((a, b) => a + Number(b.revenue), 0);
    const avgTicket = (Object.values(commSettings.weeks).reduce((a, b) => a + Number(b.ticket), 0)) / 4;

    const kpis = {
      cross: won.length > 0 ? (won.filter(l => l.hasCrossSell).length / won.length) * 100 : 0,
      up: won.length > 0 ? (won.filter(l => l.hasUpSell).length / won.length) * 100 : 0,
      post: won.length > 0 ? (won.filter(l => l.postSale).length / won.length) * 100 : 0,
      fup: funnel.orcamento > 0 ? (active.filter(l => l.followUp).length / funnel.orcamento) * 100 : 0,
      react: active.filter(l => l.reactivated).length
    };

    const revPerf = (totalRev / goals.revenue) * 100;
    let baseRate = 0;
    if (revPerf >= 110) baseRate = 3.5;
    else if (revPerf >= 100) baseRate = 2.5;
    else if (revPerf >= 90) baseRate = 1.5;

    const isMarginOk = Number(commSettings.profitMargin) > 0;
    const accel_conv = (rates.total >= goals.conversion) ? 0.5 : 0;
    const accel_cross = (kpis.cross >= goals.crossSell) ? 0.5 : 0;
    const accel_up = (kpis.up >= goals.upSell) ? 0.5 : 0;

    const finalRate = isMarginOk ? (baseRate + accel_conv + accel_cross + accel_up) : 0;
    const bonusHabilitado = 
      funnel.contato >= goals.contacts && 
      kpis.fup >= goals.followUp && 
      kpis.post >= goals.postSale && 
      kpis.react >= goals.reactivated;

    const totalCommission = (totalRev * (finalRate / 100)) + (bonusHabilitado ? 300 : 0);

    return { funnel, rates, totalRev, avgTicket, revPerf, kpis, finalRate, totalCommission, bonusHabilitado, isMarginOk };
  }, [leads, commSettings, goals]);

  // Lógica de Lead Frio (3 dias)
  const isStale = (date) => {
    if (!date) return false;
    return (Date.now() - new Date(date).getTime()) > (3 * 24 * 60 * 60 * 1000);
  };

  if (loading) return (
    <div className="h-screen bg-slate-900 flex flex-col items-center justify-center">
      <RefreshCw className="text-blue-500 animate-spin mb-4" size={48} />
      <h2 className="text-white font-black tracking-widest uppercase text-xs">Sincronizando Engine Pro...</h2>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#F8FAFC] p-4 md:p-10 font-sans selection:bg-blue-600 selection:text-white">
      
      {/* HEADER MASTER INTEGRAL */}
      <header className="max-w-[1750px] mx-auto mb-12 flex flex-col xl:flex-row justify-between items-center gap-8">
        <div className="flex items-center gap-6">
          <div className="bg-slate-900 p-6 rounded-[2.5rem] shadow-2xl shadow-blue-100">
            <TrendingUp className="text-blue-500" size={36} />
          </div>
          <div>
            <h1 className="text-5xl font-black tracking-tighter text-slate-900 italic">SALES<span className="text-blue-600">PRO</span> <span className="text-[20px] not-italic text-slate-300 ml-2">v5.0</span></h1>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.5em] flex items-center gap-2">
              <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></span> Enterprise Data Management
            </p>
          </div>
        </div>

        <div className="flex flex-wrap justify-center gap-4 bg-white p-4 rounded-[3.5rem] shadow-xl border border-white/50">
          <div className="flex bg-slate-100 p-1.5 rounded-[2rem] mr-2">
            {[1, 2, 3, 4].map(w => (
              <button key={w} onClick={() => setCurrentWeek(w)} className={`px-6 py-3 rounded-2xl font-black text-[11px] transition-all ${currentWeek === w ? 'bg-white text-blue-600 shadow-md scale-110' : 'text-slate-400 hover:text-slate-600'}`}>S{w}</button>
            ))}
          </div>
          <nav className="flex gap-2">
            {[
              { id: 'pipeline', label: 'Pipeline', icon: <Layers size={14}/> },
              { id: 'funnel', label: 'Funil', icon: <ArrowDownWideNarrow size={14}/> },
              { id: 'metrics', label: 'KPIs', icon: <Target size={14}/> },
              { id: 'commission', label: 'Financeiro', icon: <DollarSign size={14}/> },
              { id: 'archive', label: 'Arquivo', icon: <Archive size={14}/> }
            ].map(tab => (
              <button key={tab.id} onClick={() => setActiveTab(tab.id)} className={`px-8 py-4 rounded-2xl font-black text-[11px] uppercase transition-all flex items-center gap-3 ${activeTab === tab.id ? 'bg-slate-900 text-white shadow-2xl scale-105' : 'text-slate-500 hover:bg-slate-50'}`}>
                {tab.icon} {tab.label}
              </button>
            ))}
          </nav>
          <div className="w-px h-10 bg-slate-100 mx-2"></div>
          <button onClick={handleArchiveCycle} className="bg-rose-50 text-rose-600 p-4 rounded-full hover:bg-rose-600 hover:text-white transition-all"><Archive size={20}/></button>
          <button onClick={() => setIsModalOpen(true)} className="bg-blue-600 text-white p-4 rounded-full shadow-lg hover:rotate-90 transition-all duration-500 hover:scale-110"><PlusCircle size={24} /></button>
        </div>
      </header>

      <main className="max-w-[1750px] mx-auto">
        
        {/* ABA 1: PIPELINE INTEGRAL COM REGRAS DE LEAD FRIO */}
        {activeTab === 'pipeline' && (
          <div className="grid grid-cols-1 md:grid-cols-5 gap-8">
            {STAGES.map(stage => {
              const stageLeads = leads.filter(l => l.stage === stage.id && !l.isArchived && Number(l.week || 1) === currentWeek);
              return (
                <div key={stage.id} 
                  onDragOver={(e)=>e.preventDefault()}
                  onDrop={(e)=>{
                    const id = e.dataTransfer.getData("leadId");
                    const lead = leads.find(l => l.id === id);
                    if(lead) handleSaveLead({...lead, stage: stage.id});
                  }}
                  className="bg-slate-200/40 p-6 rounded-[3.5rem] min-h-[900px] border-2 border-dashed border-slate-300/30">
                  <div className="mb-8 flex justify-between items-center px-4">
                    <h3 className="font-black text-[11px] uppercase text-slate-400 tracking-widest">{stage.label}</h3>
                    <span className="bg-white text-blue-600 px-3 py-1 rounded-lg text-[10px] font-black shadow-sm border">{stageLeads.length}</span>
                  </div>
                  <div className="space-y-6">
                    {stageLeads.map(lead => {
                      const expired = isStale(lead.lastUpdate) && stage.id !== 'fechado' && stage.id !== 'perdido';
                      return (
                        <div key={lead.id} draggable onDragStart={(e)=>e.dataTransfer.setData("leadId", lead.id)} className={`bg-white p-7 rounded-[3rem] shadow-sm border-2 transition-all hover:shadow-2xl hover:scale-[1.02] cursor-grab active:cursor-grabbing group relative ${expired ? 'border-rose-200 ring-4 ring-rose-50' : 'border-white'}`}>
                          
                          {expired && <div className="absolute -left-2 top-10 bg-rose-500 text-white p-2 rounded-full shadow-lg animate-bounce" title="Lead Frio: Sem contato há 3 dias"><Clock size={14}/></div>}
                          
                          <button onClick={() => deleteLead(lead.id)} className="absolute -right-2 -top-2 bg-white text-rose-400 p-3 rounded-full shadow-xl border opacity-0 group-hover:opacity-100 transition-all hover:bg-rose-600 hover:text-white"><Trash2 size={14}/></button>

                          <div className="flex flex-wrap gap-1.5 mb-4">
                            {lead.tags?.split(',').filter(t=>t).map(tId => {
                              const tag = AVAILABLE_TAGS.find(at => at.id === tId);
                              return tag && <span key={tId} className={`px-2.5 py-1 rounded-full text-[7px] font-black uppercase ${tag.light}`}>{tag.label}</span>;
                            })}
                          </div>

                          <div className="flex items-center justify-between mb-2">
                             <h4 className="font-black text-[13px] text-slate-800 uppercase leading-tight">{lead.name}</h4>
                             <span className="text-[9px] font-black text-slate-300 flex items-center gap-1"><User size={10}/> {lead.vendor}</span>
                          </div>
                          
                          <div className="text-emerald-600 font-black text-lg mb-5">R$ {Number(lead.value).toLocaleString()}</div>
                          
                          <textarea 
                            className="w-full text-[10px] p-4 bg-slate-50 border-none rounded-[1.5rem] mb-4 font-medium text-slate-500 resize-none outline-none focus:ring-2 ring-blue-100"
                            placeholder="Notas de negociação..."
                            value={lead.notes || ''}
                            onChange={(e) => handleSaveLead({...lead, notes: e.target.value})}
                            rows={2}
                          />

                          <div className="grid grid-cols-4 gap-2 border-t pt-5 mb-4">
                            {AVAILABLE_TAGS.map(tag => (
                              <button key={tag.id} onClick={()=>toggleTag(lead, tag.id)} className={`w-4 h-4 rounded-full border-2 transition-all ${lead.tags?.includes(tag.id) ? `${tag.color} border-white shadow-md scale-125` : 'bg-slate-50 border-slate-100 hover:border-slate-300'}`} />
                            ))}
                          </div>

                          <div className="grid grid-cols-2 gap-2">
                            <QuickAction label="Follow-Up" active={lead.followUp} onClick={()=>handleSaveLead({...lead, followUp: !lead.followUp})} color="bg-amber-500" />
                            <QuickAction label="Pós-Venda" active={lead.postSale} onClick={()=>handleSaveLead({...lead, postSale: !lead.postSale})} color="bg-indigo-600" />
                            <QuickAction label="Cross-Sell" active={lead.hasCrossSell} onClick={()=>handleSaveLead({...lead, hasCrossSell: !lead.hasCrossSell})} color="bg-blue-600" />
                            <QuickAction label="Reativado" active={lead.reactivated} onClick={()=>handleSaveLead({...lead, reactivated: !lead.reactivated})} color="bg-emerald-600" />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* ABA 2: FUNIL DE CONVERSÃO INTEGRAL */}
        {activeTab === 'funnel' && (
          <div className="bg-white p-20 rounded-[5rem] shadow-2xl border animate-in fade-in zoom-in">
             <div className="flex items-center gap-6 mb-20">
                <div className="bg-blue-50 p-6 rounded-[2.5rem] text-blue-600"><PieChart size={48}/></div>
                <div>
                   <h3 className="text-5xl font-black tracking-tighter uppercase">Análise de Fluxo Operacional</h3>
                   <p className="text-xs font-black text-slate-400 uppercase tracking-[0.3em]">Eficiência de conversão por etapa</p>
                </div>
             </div>
             <div className="max-w-5xl mx-auto space-y-8">
                <FunnelStep label="Lead Captado (Início)" count={analytics.funnel.contato} percent={100} color="bg-slate-300" />
                <FunnelRate value={analytics.rates.c2o} label="Taxa de Orçamento" />
                <FunnelStep label="Orçamento/Proposta" count={analytics.funnel.orcamento} percent={analytics.rates.c2o} color="bg-blue-500" />
                <FunnelRate value={analytics.rates.n2f} label="Taxa de Fechamento" />
                <FunnelStep label="Contrato Fechado" count={analytics.funnel.fechado} percent={analytics.rates.total} color="bg-emerald-600" />
             </div>
          </div>
        )}

        {/* ABA 3: KPIs TÉCNICOS DETALHADOS */}
        {activeTab === 'metrics' && (
           <div className="bg-white rounded-[4rem] shadow-2xl border overflow-hidden animate-in slide-in-from-bottom-10">
              <div className="p-10 border-b bg-slate-50/50 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="bg-slate-900 p-4 rounded-3xl text-white"><BarChart2 size={28}/></div>
                  <h3 className="text-2xl font-black uppercase tracking-tighter">Indicadores de Conversão Mensal</h3>
                </div>
              </div>
              <table className="w-full text-left">
                <thead className="bg-slate-900 text-white text-[10px] uppercase font-black tracking-[0.2em]">
                  <tr>
                    <th className="p-10">Métrica Estratégica</th>
                    <th className="p-10 text-center">Meta Ciclo</th>
                    {[1, 2, 3, 4].map(w => <th key={w} className="p-10 text-center">S{w} Performance</th>)}
                    <th className="p-10 text-center bg-blue-900">Total Consolidado</th>
                  </tr>
                </thead>
                <tbody className="divide-y font-bold text-xs uppercase text-slate-600">
                  <KPIEntry title="Volume de Contatos" meta={goals.contacts} total={analytics.funnel.contato} leads={leads} goals={goals} field="contacts" format={(v)=>v} />
                  <KPIEntry title="Efetividade Follow-up" meta={goals.followUp+"%"} total={analytics.kpis.fup.toFixed(1)+"%"} leads={leads} goals={goals} field="fup" format={(v)=>v.toFixed(1)+"%"} isPercent />
                  <KPIEntry title="Conversão Total" meta={goals.conversion+"%"} total={analytics.rates.total.toFixed(1)+"%"} leads={leads} goals={goals} field="conv" format={(v)=>v.toFixed(1)+"%"} isPercent />
                  <KPIEntry title="Taxa Cross-Sell" meta={goals.crossSell+"%"} total={analytics.kpis.cross.toFixed(1)+"%"} leads={leads} goals={goals} field="cross" format={(v)=>v.toFixed(1)+"%"} isPercent />
                  <KPIEntry title="Taxa Up-Sell" meta={goals.upSell+"%"} total={analytics.kpis.up.toFixed(1)+"%"} leads={leads} goals={goals} field="up" format={(v)=>v.toFixed(1)+"%"} isPercent />
                </tbody>
              </table>
           </div>
        )}

        {/* ABA 4: FINANCEIRO E REGRAS DE COMISSÃO */}
        {activeTab === 'commission' && (
          <div className="space-y-12 animate-in slide-in-from-bottom-10">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
              <div className="bg-slate-900 p-20 rounded-[5rem] text-white shadow-2xl relative overflow-hidden group">
                 <DollarSign className="absolute -right-20 -top-20 opacity-5 group-hover:rotate-12 transition-all duration-1000" size={400}/>
                 <p className="text-blue-500 font-black uppercase tracking-[0.5em] text-xs mb-6">Faturamento Realizado (Ciclo)</p>
                 <h3 className="text-9xl font-black tracking-tighter mb-10 font-mono">R$ {analytics.totalRev.toLocaleString()}</h3>
                 <div className="flex gap-12 border-t border-white/10 pt-10">
                    <div><p className="text-[10px] font-black opacity-40 uppercase mb-1">Ticket Médio Ciclo</p><p className="text-3xl font-black">R$ {analytics.avgTicket.toLocaleString()}</p></div>
                    <div><p className="text-[10px] font-black opacity-40 uppercase mb-1">Performance Meta</p><p className="text-3xl font-black">{analytics.revPerf.toFixed(1)}%</p></div>
                 </div>
              </div>

              <div className="bg-white p-20 rounded-[5rem] border-[12px] border-emerald-500 shadow-2xl text-center flex flex-col justify-center items-center">
                 <div className="bg-emerald-50 p-8 rounded-full mb-8 text-emerald-600 shadow-inner"><Award size={80}/></div>
                 <p className="text-slate-400 font-black uppercase tracking-[0.4em] mb-4 text-sm">Comissão Líquida Calculada</p>
                 <h3 className="text-9xl text-emerald-600 font-black tracking-tighter font-mono">R$ {analytics.totalCommission.toLocaleString()}</h3>
                 <div className="mt-8 bg-emerald-600 text-white px-10 py-3 rounded-full font-black text-xs uppercase tracking-widest shadow-xl">Taxa Aplicada: {analytics.finalRate.toFixed(2)}%</div>
              </div>
            </div>

            {/* TABELA DE CONFERÊNCIA RIGOROSA */}
            <div className="bg-white rounded-[4rem] shadow-2xl border overflow-hidden">
               <div className="bg-slate-900 p-10 text-white flex justify-between items-center">
                  <div className="flex items-center gap-6">
                    <Gauge className="text-blue-500" size={32}/>
                    <div>
                      <h4 className="font-black uppercase tracking-widest">Painel de Conferência de Metas</h4>
                      <p className="text-[10px] opacity-40 font-black uppercase tracking-widest">Regras v5.0 Master Integration</p>
                    </div>
                  </div>
                  {!analytics.isMarginOk && <div className="bg-rose-500 border-2 border-rose-500 text-white px-6 py-2 rounded-2xl font-black text-[10px] animate-pulse">MARGEM ZERO: COMISSÃO BLOQUEADA</div>}
               </div>
               
               <table className="w-full text-left">
                  <thead className="bg-slate-50 border-b">
                     <tr className="text-[11px] font-black text-slate-400 uppercase tracking-widest">
                        <th className="p-10">Indicador Estratégico</th>
                        <th className="p-10">Regra de Pagamento</th>
                        <th className="p-10 text-center">Meta Ciclo</th>
                        <th className="p-10 text-center">Realizado</th>
                        <th className="p-10 text-center">Status</th>
                     </tr>
                  </thead>
                  <tbody className="divide-y font-bold text-xs uppercase text-slate-600">
                     <IndicatorRow label="Conversão Total" rule="Acelerador: ≥ 5,0% → +0,5% na Taxa" meta={goals.conversion+"%"} real={analytics.rates.total.toFixed(1)+"%"} ok={analytics.rates.total >= goals.conversion} />
                     <IndicatorRow label="Taxa Cross Sell" rule="Acelerador: ≥ 40,0% → +0,5% na Taxa" meta={goals.crossSell+"%"} real={analytics.kpis.cross.toFixed(1)+"%"} ok={analytics.kpis.cross >= goals.crossSell} />
                     <IndicatorRow label="Taxa Up Sell" rule="Acelerador: ≥ 15,0% → +0,5% na Taxa" meta={goals.upSell+"%"} real={analytics.kpis.up.toFixed(1)+"%"} ok={analytics.kpis.up >= goals.upSell} />
                     <IndicatorRow label="Volume de Contatos" rule="Bônus Fixo: ≥ 400 contatos/mês" meta={goals.contacts} real={analytics.funnel.contato} ok={analytics.funnel.contato >= goals.contacts} />
                     <IndicatorRow label="Efetividade Follow-up" rule="Bônus Fixo: ≥ 90,0%" meta={goals.followUp+"%"} real={analytics.kpis.fup.toFixed(1)+"%"} ok={analytics.kpis.fup >= goals.followUp} />
                     <IndicatorRow label="Cobertura Pós-venda" rule="Bônus Fixo: 100,0%" meta={goals.postSale+"%"} real={analytics.kpis.post.toFixed(1)+"%"} ok={analytics.kpis.post >= goals.postSale} />
                     <IndicatorRow label="Clientes Reativados" rule="Bônus Fixo: ≥ 8 reativações" meta={goals.reactivated} real={analytics.kpis.react} ok={analytics.kpis.react >= goals.reactivated} />
                  </tbody>
               </table>

               <div className="p-12 bg-slate-50 border-t flex flex-col md:flex-row justify-between items-center gap-10">
                  <div className="flex items-center gap-6">
                     <div className={`w-20 h-20 rounded-3xl flex items-center justify-center text-white shadow-xl ${analytics.bonusHabilitado ? 'bg-emerald-500' : 'bg-slate-300'}`}>
                        {analytics.bonusHabilitado ? <CheckCircle2 size={36}/> : <AlertCircle size={36}/>}
                     </div>
                     <div>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Status Bônus Fixo (R$ 300,00)</p>
                        <p className={`text-2xl font-black ${analytics.bonusHabilitado ? 'text-emerald-600' : 'text-slate-400'}`}>
                           {analytics.bonusHabilitado ? 'LIBERADO PARA PAGAMENTO' : 'PENDÊNCIA EM METAS FIXAS'}
                        </p>
                     </div>
                  </div>
                  <div className="flex gap-6">
                     <ParamInput label="Margem Lucro %" val={commSettings.profitMargin} onChange={v=>setCommSettings({...commSettings, profitMargin: v})}/>
                     <ParamInput label="Meta Receita" val={goals.revenue} onChange={v=>setGoals({...goals, revenue: v})}/>
                  </div>
               </div>

               {/* LANÇAMENTOS SEMANAIS */}
               <div className="p-10 border-t overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="text-[11px] font-black uppercase text-slate-400">
                        <th className="p-6 text-left">Calendário Semanal</th>
                        <th className="p-6 text-left">Faturamento Realizado (R$)</th>
                        <th className="p-6 text-left">Ticket Médio (R$)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {[1,2,3,4].map(w => (
                        <tr key={w}>
                          <td className="p-6 font-black text-slate-400 uppercase text-xs">Semana {w}</td>
                          <td className="p-6">
                            <input type="number" className="w-full p-4 bg-slate-100/50 rounded-2xl font-black border-none focus:ring-4 ring-blue-500/10" value={commSettings.weeks[w].revenue} onChange={e => setCommSettings({...commSettings, weeks: {...commSettings.weeks, [w]: {...commSettings.weeks[w], revenue: e.target.value}}})} />
                          </td>
                          <td className="p-6">
                            <input type="number" className="w-full p-4 bg-slate-100/50 rounded-2xl font-black border-none focus:ring-4 ring-blue-500/10" value={commSettings.weeks[w].ticket} onChange={e => setCommSettings({...commSettings, weeks: {...commSettings.weeks, [w]: {...commSettings.weeks[w], ticket: e.target.value}}})} />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
               </div>
            </div>
          </div>
        )}

        {/* ABA 5: HISTÓRICO / ARQUIVO */}
        {activeTab === 'archive' && (
           <div className="space-y-8 animate-in slide-in-from-right-10">
              <div className="bg-white p-12 rounded-[3rem] border shadow-sm flex flex-col lg:flex-row justify-between items-center gap-10">
                <div className="flex items-center gap-6">
                  <div className="bg-slate-900 p-6 rounded-[2rem] text-white shadow-xl"><Archive size={36}/></div>
                  <div><h3 className="text-3xl font-black tracking-tighter uppercase">Histórico de Performance</h3></div>
                </div>
                <input type="text" placeholder="Filtrar por ciclo (Ex: Janeiro)..." className="w-full lg:w-[450px] p-6 border-2 rounded-3xl font-black bg-slate-50 outline-none focus:border-blue-500 shadow-inner" onChange={(e)=>setFilterCycle(e.target.value)} />
              </div>
              <div className="bg-white rounded-[3rem] shadow-2xl border overflow-hidden">
                <table className="w-full text-left">
                  <thead className="bg-slate-900 text-white font-black uppercase text-[10px] tracking-widest">
                    <tr>
                      <th className="p-10">Organização</th>
                      <th className="p-10">Vendedor</th>
                      <th className="p-10 text-center">Valor</th>
                      <th className="p-10 text-center">Ciclo</th>
                      <th className="p-10 text-center">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y font-bold uppercase text-slate-600">
                    {leads.filter(l => l.isArchived).filter(l => !filterCycle || l.cycle_name?.includes(filterCycle)).map(lead => (
                      <tr key={lead.id} className="hover:bg-slate-50 transition-all">
                        <td className="p-10 font-black text-slate-800">{lead.name}</td>
                        <td className="p-10 font-black">{lead.vendor}</td>
                        <td className="p-10 text-center text-emerald-600">R$ {Number(lead.value).toLocaleString()}</td>
                        <td className="p-10 text-center text-[10px]">{lead.cycle_name}</td>
                        <td className="p-10 text-center">
                          <button onClick={()=>handleSaveLead({...lead, isArchived: false})} className="text-blue-500 hover:scale-125 transition-all"><RotateCcw size={20}/></button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
           </div>
        )}
      </main>

      {/* MODAL DE CADASTRO MASTER */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/90 backdrop-blur-xl flex items-center justify-center p-6 z-[300] animate-in fade-in">
          <div className="bg-white rounded-[5rem] p-20 max-w-3xl w-full shadow-2xl border-t-[20px] border-blue-600 animate-in zoom-in duration-300 relative">
            <h2 className="text-5xl font-black mb-14 uppercase italic tracking-tighter">Nova Oportunidade</h2>
            <div className="space-y-10">
              <input className="w-full p-8 rounded-[3rem] bg-slate-50 border-2 border-transparent focus:border-blue-500 font-black outline-none text-xl" value={newLead.name} onChange={e=>setNewLead({...newLead, name: e.target.value})} placeholder="Nome do Lead / Empresa" />
              <div className="grid grid-cols-2 gap-10">
                <input type="number" className="w-full p-8 rounded-[3rem] bg-slate-50 border-2 border-transparent focus:border-blue-500 font-black outline-none text-xl" value={newLead.value} onChange={e=>setNewLead({...newLead, value: e.target.value})} placeholder="Valor R$" />
                <select className="w-full p-8 rounded-[3rem] bg-slate-50 border-2 border-transparent focus:border-blue-500 font-black outline-none text-xl appearance-none" value={newLead.vendor} onChange={e=>setNewLead({...newLead, vendor: e.target.value})}>
                   <option>Vendedor 1</option>
                   <option>Vendedor 2</option>
                   <option>Vendedor 3</option>
                </select>
              </div>
              <button 
                disabled={isSaving || !newLead.name}
                onClick={async ()=>{
                  await handleSaveLead({...newLead, week: currentWeek, isArchived: false});
                  setIsModalOpen(false);
                  setNewLead({name: '', value: '', vendor: 'Vendedor 1', notes: '', stage: 'contato', tags: '', followUp: false, postSale: false, hasCrossSell: false, hasUpSell: false, reactivated: false});
                }} 
                className="w-full bg-blue-600 text-white p-10 rounded-[3.5rem] font-black uppercase tracking-[0.4em] text-xl shadow-2xl hover:scale-105 transition-all flex items-center justify-center gap-6"
              >
                {isSaving ? 'PROCESSANDO...' : 'ATIVAR OPORTUNIDADE'} <ArrowRight size={32}/>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// --- SUBCOMPONENTES DE ARQUITETURA ---

const QuickAction = ({ label, active, color, onClick }) => (
  <button onClick={onClick} className={`p-4 rounded-[1.8rem] border-2 text-[8px] font-black uppercase transition-all ${active ? `${color} text-white border-transparent shadow-md scale-105` : 'bg-white text-slate-200 border-slate-50 hover:border-slate-200'}`}>{label}</button>
);

const IndicatorRow = ({ label, rule, meta, real, ok }) => (
  <tr className={`group transition-all ${!ok ? 'bg-rose-50/10' : 'hover:bg-slate-50'}`}>
    <td className="p-10 font-black text-slate-800 text-sm">{label}</td>
    <td className="p-10 text-slate-400 italic text-[11px] normal-case">{rule}</td>
    <td className="p-10 text-center font-black text-slate-400">{meta}</td>
    <td className="p-10 text-center font-black text-blue-600 text-base">{real}</td>
    <td className="p-10 text-center">
       <div className={`inline-flex items-center gap-3 px-6 py-2 rounded-full font-black text-[9px] ${ok ? 'bg-emerald-100 text-emerald-600' : 'bg-rose-100 text-rose-600'}`}>
          <div className={`w-2 h-2 rounded-full ${ok ? 'bg-emerald-500' : 'bg-rose-500'}`}></div>
          {ok ? 'CUMPRIDO' : 'PENDENTE'}
       </div>
    </td>
  </tr>
);

const KPIEntry = ({ title, meta, total, leads, goals, field, format, isPercent }) => {
  const getWeeklyVal = (w) => {
    const f = leads.filter(l => !l.isArchived && Number(l.week || 1) === w);
    const won = f.filter(l => l.stage === 'fechado');
    if (field === 'contacts') return f.length;
    if (field === 'fup') return f.length > 0 ? (f.filter(l => l.followUp).length / f.length) * 100 : 0;
    if (field === 'conv') return f.length > 0 ? (won.length / f.length) * 100 : 0;
    if (field === 'cross') return won.length > 0 ? (won.filter(l => l.hasCrossSell).length / won.length) * 100 : 0;
    if (field === 'up') return won.length > 0 ? (won.filter(l => l.hasUpSell).length / won.length) * 100 : 0;
    return 0;
  };

  const getFarol = (val) => {
    const target = isPercent ? parseFloat(meta) : parseFloat(meta) / 4;
    return val >= target ? 'bg-emerald-500' : 'bg-rose-500';
  };

  return (
    <tr>
      <td className="p-10 font-black text-slate-700">{title}</td>
      <td className="p-10 text-center text-slate-300 italic">Meta: {meta}</td>
      {[1, 2, 3, 4].map(w => (
        <td key={w} className="p-10 text-center">
          <div className="flex flex-col items-center gap-2">
            <div className={`w-4 h-4 rounded-full ${getFarol(getWeeklyVal(w))} shadow-lg`} />
            <span className="text-[10px] text-slate-400">{format(getWeeklyVal(w))}</span>
          </div>
        </td>
      ))}
      <td className="p-10 text-center bg-blue-50/50">
        <span className="text-lg font-black text-blue-900">{total}</span>
      </td>
    </tr>
  );
};

const FunnelStep = ({ label, count, percent, color }) => (
  <div className="flex items-center gap-8">
    <div className={`h-24 ${color} rounded-[3rem] flex items-center justify-between px-12 text-white shadow-2xl`} style={{ width: `${Math.max(percent, 30)}%` }}>
      <span className="font-black uppercase tracking-[0.2em] text-sm">{label}</span>
      <span className="font-black text-4xl font-mono">{count}</span>
    </div>
    <div className="text-slate-300 font-black text-2xl italic">{percent.toFixed(0)}%</div>
  </div>
);

const FunnelRate = ({ value, label }) => (
  <div className="flex flex-col items-center py-4 border-l-4 border-dashed border-slate-100 ml-16">
    <div className="bg-white border-2 border-slate-100 px-6 py-2 rounded-full shadow-sm">
       <span className="text-blue-600 font-black text-[10px] uppercase tracking-widest">{label}: {value.toFixed(1)}%</span>
    </div>
  </div>
);

const ParamInput = ({ label, val, onChange }) => (
  <div className="flex flex-col gap-2">
    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-6">{label}</label>
    <input type="number" className="w-44 p-6 border-2 rounded-[2.5rem] font-black bg-white outline-none focus:border-blue-600 text-sm shadow-inner" value={val} onChange={e => onChange(e.target.value)} />
  </div>
);
