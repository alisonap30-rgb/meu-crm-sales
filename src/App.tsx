import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { createClient } from '@supabase/supabase-js';
import { 
  TrendingUp, PlusCircle, Trash2, BarChart2, Target, AlertCircle, Archive, 
  RotateCcw, Tag as TagIcon, Info, CheckCircle2, ChevronRight, DollarSign,
  User, Calendar, FileText, ClipboardList, ShieldCheck, Zap, ArrowRight,
  Clock, Award, BarChart, Grab, Search, Filter, Settings, RefreshCw,
  Layers, ArrowDownWideNarrow, PieChart, Activity, Gauge, MousePointer2,
  Lock, Unlock, ChevronDown, Check, X, HelpCircle, Briefcase, Wallet, 
  Percent, ChevronUp, AlertTriangle, Monitor, Database, Terminal
} from 'lucide-react';

// --- CONFIGURAÇÃO CORE E CONEXÃO SEGURA ---
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || "";
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || "";
const supabase = (SUPABASE_URL && SUPABASE_KEY) ? createClient(SUPABASE_URL, SUPABASE_KEY) : null;

// --- ESTRUTURA DE DADOS E DICIONÁRIOS ---
const STAGES = [
  { id: 'contato', label: 'Primeiro Contato', color: 'bg-slate-400', border: 'border-slate-400', desc: 'Leads frios ou recém-captados' },
  { id: 'orcamento', label: 'Orçamento/Proposta', color: 'bg-blue-500', border: 'border-blue-500', desc: 'Proposta comercial enviada' },
  { id: 'negociacao', label: 'Em Negociação', color: 'bg-amber-500', border: 'border-amber-500', desc: 'Ajuste de escopo e valores' },
  { id: 'fechado', label: 'Contrato Fechado', color: 'bg-emerald-500', border: 'border-emerald-500', desc: 'Venda convertida com sucesso' },
  { id: 'perdido', label: 'Oportunidade Perdida', color: 'bg-rose-500', border: 'border-rose-500', desc: 'Lead descartado ou perdido' }
];

const AVAILABLE_TAGS = [
  { id: 'proposta', label: 'PROPOSTA ENVIADA', color: 'bg-blue-600', light: 'bg-blue-50 text-blue-700 border-blue-200' },
  { id: 'followup', label: 'AGUARDANDO RETORNO', color: 'bg-amber-600', light: 'bg-amber-50 text-amber-800 border-amber-200' },
  { id: 'urgente', label: 'PRIORIDADE ALTA', color: 'bg-red-600', light: 'bg-red-50 text-red-700 border-red-200' },
  { id: 'reuniao', label: 'REUNIÃO AGENDADA', color: 'bg-emerald-600', light: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  { id: 'recorrente', label: 'CLIENTE RECORRENTE', color: 'bg-purple-600', light: 'bg-purple-50 text-purple-700 border-purple-200' }
];

export default function CRMMasterSystemEnterprise() {
  // --- ESTADOS DE DADOS (DATABASE) ---
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [syncStatus, setSyncStatus] = useState('online');
  const [currentWeek, setCurrentWeek] = useState(1);
  const [activeTab, setActiveTab] = useState('pipeline');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  
  // --- ESTADOS DE NEGÓCIO (BUSINESS LOGIC) ---
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
      1: { revenue: 0, ticket: 0, contacts: 0 },
      2: { revenue: 0, ticket: 0, contacts: 0 },
      3: { revenue: 0, ticket: 0, contacts: 0 },
      4: { revenue: 0, ticket: 0, contacts: 0 }
    },
    profitMargin: 15,
    selectedVendor: 'Geral'
  });

  const [newLead, setNewLead] = useState({
    name: '', value: '', vendor: 'Vendedor Principal', notes: '', stage: 'contato', tags: '',
    followUp: false, postSale: false, hasCrossSell: false, hasUpSell: false, reactivated: false,
    priority: 'media'
  });

  // --- PERSISTÊNCIA E SINCRONIZAÇÃO EM TEMPO REAL ---
  const fetchLeads = useCallback(async () => {
    if (!supabase) return;
    try {
      setSyncStatus('syncing');
      const { data, error } = await supabase.from('leads').select('*').order('lastUpdate', { ascending: false });
      if (error) throw error;
      setLeads(data || []);
      setSyncStatus('online');
    } catch (e) {
      console.error("Erro Crítico de Conexão:", e);
      setSyncStatus('error');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchLeads();
    if (!supabase) return;
    const channel = supabase.channel('crm_master_v5')
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
      lastUpdate: new Date().toISOString(),
      week: leadData.week || currentWeek
    };
    try {
      const { error } = await supabase.from('leads').upsert(payload);
      if (error) throw error;
    } catch (e) {
      alert("Erro ao salvar no banco. Verifique sua conexão.");
    } finally {
      setIsSaving(false);
    }
  };

  const deleteLead = async (id) => {
    if (!supabase || !window.confirm("PERIGO: Esta ação é irreversível. Confirmar exclusão?")) return;
    await supabase.from('leads').delete().eq('id', id);
    fetchLeads();
  };

  const toggleTag = (lead, tagId) => {
    let currentTags = lead.tags ? lead.tags.split(',') : [];
    currentTags = currentTags.includes(tagId) ? currentTags.filter(t => t !== tagId) : [...currentTags, tagId];
    handleSaveLead({ ...lead, tags: currentTags.join(',') });
  };

  // --- MOTOR ANALYTICS ULTRA (CÁLCULOS TÉCNICOS DE ALTA PRECISÃO) ---
  const analytics = useMemo(() => {
    const active = leads.filter(l => !l.isArchived);
    const won = active.filter(l => l.stage === 'fechado');
    const lost = active.filter(l => l.stage === 'perdido');
    
    // Funil de Conversão
    const funnel = {
      contato: active.length,
      orcamento: active.filter(l => ['orcamento', 'negociacao', 'fechado'].includes(l.stage)).length,
      fechado: won.length,
      perdido: lost.length
    };

    // Taxas de Eficiência
    const rates = {
      total: funnel.contato > 0 ? (funnel.fechado / funnel.contato) * 100 : 0,
      c2o: funnel.contato > 0 ? (funnel.orcamento / funnel.contato) * 100 : 0,
      n2f: funnel.orcamento > 0 ? (funnel.fechado / funnel.orcamento) * 100 : 0,
      lost: funnel.contato > 0 ? (funnel.perdido / funnel.contato) * 100 : 0
    };

    // Faturamento e Metas
    const totalRev = Object.values(commSettings.weeks).reduce((a, b) => a + Number(b.revenue), 0);
    const avgTicket = totalRev > 0 ? (totalRev / won.length) || 0 : 0;
    const revPerf = (totalRev / goals.revenue) * 100;

    // KPIs Operacionais
    const kpis = {
      cross: won.length > 0 ? (won.filter(l => l.hasCrossSell).length / won.length) * 100 : 0,
      up: won.length > 0 ? (won.filter(l => l.hasUpSell).length / won.length) * 100 : 0,
      post: won.length > 0 ? (won.filter(l => l.postSale).length / won.length) * 100 : 0,
      fup: funnel.orcamento > 0 ? (active.filter(l => l.followUp).length / funnel.orcamento) * 100 : 0,
      react: active.filter(l => l.reactivated).length
    };

    // --- ALGORITMO DE COMISSÃO NÍVEL HARD ---
    // 1. Escada de Performance Base
    let baseRate = 0;
    if (revPerf >= 110) baseRate = 3.5;
    else if (revPerf >= 100) baseRate = 2.5;
    else if (revPerf >= 90) baseRate = 1.5;

    // 2. Aceleradores de Bônus (Incremental +0.5% cada)
    const isMarginOk = Number(commSettings.profitMargin) >= 12;
    const accel_conv = (rates.total >= goals.conversion) ? 0.5 : 0;
    const accel_cross = (kpis.cross >= goals.crossSell) ? 0.5 : 0;
    const accel_up = (kpis.up >= goals.upSell) ? 0.5 : 0;

    const finalRate = isMarginOk ? (baseRate + accel_conv + accel_cross + accel_up) : 0;

    // 3. Bônus Operacional Fixo (Pacote All-In)
    const bonusHabilitado = 
      funnel.contato >= goals.contacts && 
      kpis.fup >= goals.followUp && 
      kpis.post >= goals.postSale && 
      kpis.react >= goals.reactivated;

    const totalCommission = (totalRev * (finalRate / 100)) + (bonusHabilitado ? 300 : 0);

    return { 
      funnel, rates, totalRev, avgTicket, revPerf, kpis, 
      finalRate, totalCommission, bonusHabilitado, isMarginOk,
      actualMargin: commSettings.profitMargin
    };
  }, [leads, commSettings, goals]);

  // Detector de Inatividade (Lead parado há mais de 72h)
  const isStale = (date) => {
    if (!date) return false;
    return (Date.now() - new Date(date).getTime()) > (3 * 24 * 60 * 60 * 1000);
  };

  if (loading) return (
    <div className="h-screen bg-slate-950 flex flex-col items-center justify-center font-black text-blue-500 italic">
      <Terminal size={64} className="mb-6 animate-pulse" />
      <div className="text-2xl uppercase tracking-[0.5em] mb-4">CRITICAL BOOTING...</div>
      <div className="w-64 h-2 bg-slate-800 rounded-full overflow-hidden">
        <div className="h-full bg-blue-500 animate-[loading_2s_ease-in-out_infinite]"></div>
      </div>
      <style>{`@keyframes loading { 0% { width: 0% } 50% { width: 70% } 100% { width: 100% } }`}</style>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#F8FAFC] p-6 lg:p-12 font-sans text-slate-900 selection:bg-blue-500 selection:text-white">
      
      {/* HEADER MASTER v5.0 */}
      <header className="max-w-[1900px] mx-auto mb-12 flex flex-col xl:flex-row justify-between items-end gap-10">
        <div className="flex items-center gap-10 group">
          <div className="bg-slate-900 p-8 rounded-[3rem] shadow-2xl transition-all duration-500 group-hover:rotate-12 group-hover:scale-110">
            <TrendingUp className="text-blue-400" size={48} />
          </div>
          <div>
            <div className="flex items-center gap-4 mb-2">
              <span className={`h-3 w-3 rounded-full ${syncStatus === 'online' ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'}`}></span>
              <p className="text-[11px] font-black text-slate-400 uppercase tracking-[0.4em]">Real-Time Database: {syncStatus.toUpperCase()}</p>
            </div>
            <h1 className="text-7xl font-black tracking-tighter italic leading-none text-slate-900">
              SALES<span className="text-blue-600">PRO</span>
              <span className="text-2xl not-italic text-slate-300 ml-6 font-bold border-l-4 pl-6 border-slate-200 uppercase">Enterprise Hard-Core</span>
            </h1>
          </div>
        </div>

        {/* CONTROLES DE NAVEGAÇÃO SUPERIOR */}
        <div className="flex flex-wrap justify-center gap-6 bg-white/80 backdrop-blur-md p-5 rounded-[4rem] shadow-2xl border-4 border-white">
          <div className="flex bg-slate-100 p-2 rounded-[2.5rem] mr-2">
            {[1, 2, 3, 4].map(w => (
              <button 
                key={w} 
                onClick={() => setCurrentWeek(w)} 
                className={`px-10 py-4 rounded-2xl font-black text-xs transition-all duration-300 ${currentWeek === w ? 'bg-white text-blue-600 shadow-xl scale-110 z-10' : 'text-slate-400 hover:text-slate-600'}`}
              >
                WEEK {w}
              </button>
            ))}
          </div>
          <nav className="flex gap-2">
            {[
              { id: 'pipeline', label: 'Dashboard', icon: <Layers size={18}/> },
              { id: 'metrics', label: 'Monitoramento', icon: <Activity size={18}/> },
              { id: 'funnel', label: 'Estrutura Funil', icon: <ArrowDownWideNarrow size={18}/> },
              { id: 'commission', label: 'Auditoria Fin.', icon: <Wallet size={18}/> }
            ].map(tab => (
              <button 
                key={tab.id} 
                onClick={() => setActiveTab(tab.id)} 
                className={`px-12 py-5 rounded-[2.5rem] font-black text-xs uppercase transition-all duration-300 flex items-center gap-4 ${activeTab === tab.id ? 'bg-slate-900 text-white shadow-2xl translate-y-[-4px]' : 'text-slate-500 hover:bg-slate-50'}`}
              >
                {tab.icon} {tab.label}
              </button>
            ))}
          </nav>
          <button 
            onClick={() => setIsModalOpen(true)} 
            className="bg-blue-600 text-white p-6 rounded-full shadow-2xl hover:rotate-180 transition-all duration-1000 active:scale-90"
          >
            <PlusCircle size={32} />
          </button>
        </div>
      </header>

      <main className="max-w-[1900px] mx-auto">
        
        {/* VIEW 1: PIPELINE DINÂMICO (CONTROLE DE CARDS) */}
        {activeTab === 'pipeline' && (
          <div className="grid grid-cols-1 md:grid-cols-5 gap-10">
            {STAGES.map(stage => {
              const stageLeads = leads.filter(l => l.stage === stage.id && !l.isArchived && Number(l.week || 1) === currentWeek);
              return (
                <div 
                  key={stage.id} 
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => {
                    const id = e.dataTransfer.getData("leadId");
                    const lead = leads.find(l => l.id === id);
                    if(lead) handleSaveLead({...lead, stage: stage.id});
                  }}
                  className="bg-slate-200/50 p-8 rounded-[4rem] min-h-[1000px] border-2 border-dashed border-slate-300/40 relative group/column transition-all hover:bg-slate-200/70"
                >
                  <div className="mb-10 flex justify-between items-start px-4">
                    <div>
                      <h3 className="font-black text-sm uppercase text-slate-800 tracking-[0.2em] mb-2">{stage.label}</h3>
                      <p className="text-[10px] text-slate-400 font-bold uppercase leading-tight max-w-[150px]">{stage.desc}</p>
                    </div>
                    <span className="bg-white text-slate-900 px-5 py-2 rounded-2xl text-xs font-black shadow-lg border-2 border-slate-100">{stageLeads.length}</span>
                  </div>

                  <div className="space-y-8">
                    {stageLeads.map(lead => {
                      const expired = isStale(lead.lastUpdate) && !['fechado', 'perdido'].includes(stage.id);
                      return (
                        <div 
                          key={lead.id} 
                          draggable 
                          onDragStart={(e) => e.dataTransfer.setData("leadId", lead.id)}
                          className={`bg-white p-8 rounded-[3.5rem] shadow-xl border-4 transition-all duration-300 hover:shadow-[0_30px_60px_-15px_rgba(0,0,0,0.15)] hover:scale-[1.03] group relative cursor-grab active:cursor-grabbing ${expired ? 'border-rose-300 ring-8 ring-rose-50' : 'border-white'}`}
                        >
                          {/* ALERTA DE INATIVIDADE */}
                          {expired && (
                            <div className="absolute -left-4 top-10 bg-rose-600 text-white p-4 rounded-full shadow-2xl animate-bounce z-50">
                              <AlertTriangle size={20} />
                            </div>
                          )}
                          
                          {/* BOTÃO DELETE FAST */}
                          <button 
                            onClick={() => deleteLead(lead.id)} 
                            className="absolute -right-3 -top-3 bg-white text-rose-500 p-5 rounded-full shadow-2xl opacity-0 group-hover:opacity-100 transition-all hover:bg-rose-600 hover:text-white z-50 border-2"
                          >
                            <Trash2 size={18}/>
                          </button>

                          {/* TAGS DE CATEGORIZAÇÃO */}
                          <div className="flex flex-wrap gap-2 mb-8">
                            {lead.tags?.split(',').filter(t=>t).map(tId => {
                              const tag = AVAILABLE_TAGS.find(at => at.id === tId);
                              return tag && (
                                <span key={tId} className={`px-4 py-2 rounded-full text-[9px] font-black uppercase tracking-wider border ${tag.light}`}>
                                  {tag.label}
                                </span>
                              );
                            })}
                          </div>

                          {/* INFO PRINCIPAL */}
                          <h4 className="font-black text-lg text-slate-900 uppercase mb-3 leading-tight tracking-tighter">{lead.name}</h4>
                          <div className="text-emerald-600 font-black text-3xl mb-8 flex items-baseline gap-2 italic">
                            <span className="text-sm not-italic opacity-40">R$</span> 
                            {Number(lead.value).toLocaleString('pt-BR')}
                          </div>
                          
                          {/* NOTES / BRIEFING */}
                          <div className="bg-slate-50 p-6 rounded-[2.5rem] mb-8 border-2 border-slate-100 focus-within:border-blue-200 transition-all">
                             <div className="flex items-center gap-3 mb-4">
                                <FileText size={14} className="text-slate-400"/>
                                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Anotações Estratégicas</span>
                             </div>
                             <textarea 
                               className="w-full text-xs bg-transparent border-none font-bold text-slate-700 resize-none outline-none placeholder:text-slate-300 min-h-[80px]"
                               placeholder="Clique para adicionar o briefing..."
                               value={lead.notes || ''}
                               onChange={(e) => {
                                 const updatedLeads = leads.map(l => l.id === lead.id ? {...l, notes: e.target.value} : l);
                                 setLeads(updatedLeads);
                               }}
                               onBlur={() => handleSaveLead(leads.find(l => l.id === lead.id))}
                             />
                          </div>

                          {/* TAG SELECTOR (PONTOS COLORIDOS) */}
                          <div className="flex gap-3 mb-8 px-2">
                            {AVAILABLE_TAGS.map(tag => (
                              <button 
                                key={tag.id} 
                                onClick={() => toggleTag(lead, tag.id)} 
                                className={`w-7 h-7 rounded-full border-4 transition-all duration-300 ${lead.tags?.includes(tag.id) ? `${tag.color} border-white shadow-xl scale-125` : 'bg-slate-100 border-slate-50 hover:border-slate-300'}`}
                                title={tag.label}
                              />
                            ))}
                          </div>

                          {/* CHECKLIST DE INDICADORES (AÇÕES RÁPIDAS) */}
                          <div className="grid grid-cols-2 gap-4">
                            <QuickActionBtn label="Follow-Up" active={lead.followUp} onClick={()=>handleSaveLead({...lead, followUp: !lead.followUp})} color="bg-amber-500" icon={<RefreshCw size={12}/>}/>
                            <QuickActionBtn label="Pós-Venda" active={lead.postSale} onClick={()=>handleSaveLead({...lead, postSale: !lead.postSale})} color="bg-indigo-600" icon={<CheckCircle2 size={12}/>}/>
                            <QuickActionBtn label="Cross-Sell" active={lead.hasCrossSell} onClick={()=>handleSaveLead({...lead, hasCrossSell: !lead.hasCrossSell})} color="bg-blue-600" icon={<Zap size={12}/>}/>
                            <QuickActionBtn label="Up-Sell" active={lead.hasUpSell} onClick={()=>handleSaveLead({...lead, hasUpSell: !lead.hasUpSell})} color="bg-purple-600" icon={<TrendingUp size={12}/>}/>
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

        {/* VIEW 2: INDICADORES E FAROL DE PERFORMANCE */}
        {activeTab === 'metrics' && (
           <div className="space-y-12 animate-in slide-in-from-bottom-10 duration-700 pb-20">
              <div className="bg-white rounded-[4rem] shadow-2xl border-4 border-white overflow-hidden">
                 <div className="bg-slate-900 p-16 text-white flex flex-col md:flex-row justify-between items-center gap-8">
                    <div className="flex items-center gap-10">
                       <div className="bg-blue-600 p-8 rounded-[3rem] shadow-2xl rotate-6"><Activity size={48}/></div>
                       <div>
                          <h3 className="text-4xl font-black uppercase tracking-tighter italic">Monitoramento de Metas Semanais</h3>
                          <p className="text-xs font-black text-slate-400 uppercase tracking-[0.6em] mt-2">Farol de Operação por Ciclo</p>
                       </div>
                    </div>
                    <div className="flex gap-8">
                       <div className="text-center bg-slate-800 p-6 px-12 rounded-[2.5rem] border border-slate-700">
                          <p className="text-[10px] font-black text-slate-500 uppercase mb-2">Leads Totais</p>
                          <p className="text-4xl font-black">{analytics.funnel.contato}</p>
                       </div>
                       <div className="text-center bg-slate-800 p-6 px-12 rounded-[2.5rem] border border-slate-700">
                          <p className="text-[10px] font-black text-slate-500 uppercase mb-2">Conversão Geral</p>
                          <p className="text-4xl font-black text-emerald-400">{analytics.rates.total.toFixed(1)}%</p>
                       </div>
                    </div>
                 </div>
                 
                 <div className="overflow-x-auto">
                   <table className="w-full text-left">
                     <thead>
                       <tr className="bg-slate-50 text-[12px] uppercase font-black tracking-widest text-slate-400 border-b">
                         <th className="p-16">KPI Estratégico</th>
                         <th className="p-16 text-center">Meta do Ciclo</th>
                         {[1, 2, 3, 4].map(w => <th key={w} className="p-16 text-center">W{w} Perf.</th>)}
                         <th className="p-16 text-center bg-blue-50 text-blue-950 font-black">Total Acumulado</th>
                       </tr>
                     </thead>
                     <tbody className="divide-y font-bold text-sm uppercase text-slate-600">
                       <KPIRow title="Novos Contatos / Captação" meta={goals.contacts} total={analytics.funnel.contato} leads={leads} field="contacts" format={(v)=>v} />
                       <KPIRow title="Taxa de Conversão Real" meta={goals.conversion+"%"} total={analytics.rates.total.toFixed(1)+"%"} leads={leads} field="conv" format={(v)=>v.toFixed(1)+"%"} isPercent />
                       <KPIRow title="Aproveitamento Cross-Sell" meta={goals.crossSell+"%"} total={analytics.kpis.cross.toFixed(1)+"%"} leads={leads} field="cross" format={(v)=>v.toFixed(1)+"%"} isPercent />
                       <KPIRow title="Follow-up Ativo" meta={goals.followUp+"%"} total={analytics.kpis.fup.toFixed(1)+"%"} leads={leads} field="fup" format={(v)=>v.toFixed(1)+"%"} isPercent />
                       <KPIRow title="Recuperação de Inativos" meta={goals.reactivated} total={analytics.kpis.react} leads={leads} field="react" format={(v)=>v} />
                     </tbody>
                   </table>
                 </div>
              </div>
           </div>
        )}

        {/* VIEW 3: AUDITORIA FINANCEIRA E COMISSÕES (MOTOR HARD) */}
        {activeTab === 'commission' && (
          <div className="space-y-12 animate-in slide-in-from-bottom-10 duration-700 pb-24">
            {/* CARDS DE RESUMO FINANCEIRO */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
              <div className="bg-slate-900 p-24 rounded-[6rem] text-white shadow-2xl relative overflow-hidden group">
                 <DollarSign className="absolute -right-20 -bottom-20 opacity-5 group-hover:scale-110 transition-transform duration-1000" size={600}/>
                 <div className="relative z-10">
                    <div className="flex items-center gap-4 mb-10">
                       <div className="h-2 w-20 bg-blue-500 rounded-full"></div>
                       <p className="text-blue-400 font-black uppercase tracking-[0.6em] text-xs">Faturamento Bruto Consolidado</p>
                    </div>
                    <h3 className="text-[130px] font-black tracking-tighter mb-14 font-mono leading-none">R$ {analytics.totalRev.toLocaleString('pt-BR')}</h3>
                    <div className="flex gap-20 border-t border-white/10 pt-14">
                       <div>
                          <p className="text-[11px] font-black opacity-40 uppercase tracking-widest mb-3">Atingimento da Meta</p>
                          <p className={`text-6xl font-black ${analytics.revPerf >= 100 ? 'text-emerald-400' : 'text-white'}`}>{analytics.revPerf.toFixed(1)}%</p>
                       </div>
                       <div>
                          <p className="text-[11px] font-black opacity-40 uppercase tracking-widest mb-3">Ticket Médio Real</p>
                          <p className="text-6xl font-black">R$ {analytics.avgTicket.toLocaleString('pt-BR', { maximumFractionDigits: 0 })}</p>
                       </div>
                    </div>
                 </div>
              </div>

              <div className={`p-24 rounded-[6rem] border-[20px] shadow-2xl text-center flex flex-col justify-center items-center transition-all duration-500 ${analytics.isMarginOk ? 'bg-white border-emerald-500' : 'bg-slate-100 border-rose-500 opacity-80'}`}>
                 {!analytics.isMarginOk && (
                    <div className="mb-8 bg-rose-600 text-white px-8 py-3 rounded-full font-black text-xs uppercase animate-pulse flex items-center gap-3">
                       <AlertCircle size={16}/> Pagamento Suspenso: Margem Baixa ({analytics.actualMargin}%)
                    </div>
                 )}
                 <p className="text-slate-400 font-black uppercase tracking-[0.5em] mb-8 text-sm">Remuneração Variável Calculada</p>
                 <h3 className={`text-[130px] font-black tracking-tighter font-mono leading-none ${analytics.isMarginOk ? 'text-emerald-600' : 'text-slate-400 line-through'}`}>
                    R$ {analytics.totalCommission.toLocaleString('pt-BR')}
                 </h3>
                 <div className="mt-16 flex flex-col items-center gap-8">
                    <div className={`px-14 py-6 rounded-[3rem] font-black text-base uppercase tracking-[0.2em] shadow-2xl flex items-center gap-6 ${analytics.isMarginOk ? 'bg-emerald-600 text-white' : 'bg-slate-300 text-slate-500'}`}>
                       Taxa de Performance Final: {analytics.finalRate.toFixed(2)}%
                    </div>
                    {analytics.bonusHabilitado && (
                       <div className="text-emerald-600 font-black text-sm uppercase flex items-center gap-4 bg-emerald-50 px-8 py-3 rounded-2xl border border-emerald-100">
                          <Award size={24}/> + Bônus Operacional (R$ 300,00) Conquistado
                       </div>
                    )}
                 </div>
              </div>
            </div>

            {/* TABELA DE AUDITORIA TÉCNICA */}
            <div className="bg-white rounded-[5rem] shadow-2xl border-4 border-white overflow-hidden">
               <div className="bg-slate-900 p-16 text-white flex flex-col md:flex-row justify-between items-center gap-10">
                  <div className="flex items-center gap-10">
                    <div className="bg-blue-600 p-8 rounded-[3.5rem] shadow-2xl"><Gauge size={48}/></div>
                    <div>
                      <h4 className="text-4xl font-black uppercase tracking-tighter italic leading-tight">Painel de Auditoria de Regras</h4>
                      <p className="text-[12px] opacity-40 font-black uppercase tracking-[0.5em] mt-2">Algoritmo de Remuneração Enterprise Hard v5.0</p>
                    </div>
                  </div>
                  {!analytics.isMarginOk && (
                    <div className="bg-rose-500/20 border-4 border-rose-500 text-rose-500 px-14 py-6 rounded-[3rem] font-black text-sm animate-pulse flex items-center gap-6 uppercase tracking-widest shadow-2xl">
                       <Lock size={24}/> Pagamento Travado por Margem
                    </div>
                  )}
               </div>
               
               <div className="overflow-x-auto">
                 <table className="w-full text-left">
                    <thead className="bg-slate-50 border-b">
                       <tr className="text-[12px] font-black text-slate-400 uppercase tracking-[0.2em]">
                          <th className="p-16">Métrica de Comissão</th>
                          <th className="p-16">Regra de Negócio Aplicada</th>
                          <th className="p-16 text-center">Meta do Ciclo</th>
                          <th className="p-16 text-center">Realizado</th>
                          <th className="p-16 text-center">Status</th>
                       </tr>
                    </thead>
                    <tbody className="divide-y font-bold text-sm uppercase text-slate-700">
                       <AuditRow 
                          label="Performance Faturamento" 
                          rule={`Base: ${analytics.revPerf >= 90 ? 'ATIVADA' : 'ZERA (Abaixo de 90%)'}`} 
                          meta="90/100/110%" 
                          real={analytics.revPerf.toFixed(1)+"%"} 
                          ok={analytics.revPerf >= 90} 
                       />
                       <AuditRow 
                          label="Taxa de Conversão" 
                          rule="Acelerador: ≥ 5% → +0,5% na Alíquota" 
                          meta={goals.conversion+"%"} 
                          real={analytics.rates.total.toFixed(1)+"%"} 
                          ok={analytics.rates.total >= goals.conversion} 
                       />
                       <AuditRow 
                          label="Aproveitamento Cross-Sell" 
                          rule="Acelerador: ≥ 40% → +0,5% na Alíquota" 
                          meta={goals.crossSell+"%"} 
                          real={analytics.kpis.cross.toFixed(1)+"%"} 
                          ok={analytics.kpis.cross >= goals.crossSell} 
                       />
                       <AuditRow 
                          label="Aproveitamento Up-Sell" 
                          rule="Acelerador: ≥ 15% → +0,5% na Alíquota" 
                          meta={goals.upSell+"%"} 
                          real={analytics.kpis.up.toFixed(1)+"%"} 
                          ok={analytics.kpis.up >= goals.upSell} 
                       />
                       <AuditRow 
                          label="Pacote Bônus: Atendimento" 
                          rule="Requisito para os R$ 300,00 Fixos" 
                          meta={goals.contacts} 
                          real={analytics.funnel.contato} 
                          ok={analytics.funnel.contato >= goals.contacts} 
                       />
                       <AuditRow 
                          label="Pacote Bônus: Pós-Venda" 
                          rule="Requisito para os R$ 300,00 Fixos" 
                          meta={goals.postSale+"%"} 
                          real={analytics.kpis.post.toFixed(1)+"%"} 
                          ok={analytics.kpis.post >= goals.postSale} 
                       />
                    </tbody>
                 </table>
               </div>

               {/* PAINEL DE EDIÇÃO DE METAS E FATURAMENTO SEMANAL */}
               <div className="p-20 bg-slate-50 border-t flex flex-col xl:flex-row gap-20 items-center justify-between">
                  <div className="flex flex-wrap justify-center gap-12">
                     <div className="space-y-4">
                        <label className="text-[11px] font-black text-slate-400 uppercase tracking-[0.3em] ml-6">Margem de Lucro Bruta %</label>
                        <div className="relative">
                          <Percent size={20} className="absolute left-8 top-1/2 -translate-y-1/2 text-slate-300"/>
                          <input 
                            type="number" 
                            className="w-56 p-8 pl-16 border-4 border-white rounded-[3rem] font-black bg-white shadow-2xl outline-none focus:border-blue-500 transition-all text-2xl" 
                            value={commSettings.profitMargin} 
                            onChange={e => setCommSettings({...commSettings, profitMargin: e.target.value})} 
                          />
                        </div>
                     </div>
                     <div className="space-y-4">
                        <label className="text-[11px] font-black text-slate-400 uppercase tracking-[0.3em] ml-6">Meta Global Faturamento (R$)</label>
                        <div className="relative">
                          <DollarSign size={20} className="absolute left-8 top-1/2 -translate-y-1/2 text-slate-300"/>
                          <input 
                            type="number" 
                            className="w-80 p-8 pl-16 border-4 border-white rounded-[3rem] font-black bg-white shadow-2xl outline-none focus:border-blue-500 transition-all text-2xl" 
                            value={goals.revenue} 
                            onChange={e => setGoals({...goals, revenue: e.target.value})} 
                          />
                        </div>
                     </div>
                  </div>

                  <div className="flex flex-wrap justify-center gap-6 bg-white p-8 rounded-[4rem] shadow-xl border-4 border-slate-100">
                    {[1, 2, 3, 4].map(w => (
                       <div key={w} className="space-y-3">
                          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest text-center block">Semana {w} (R$)</label>
                          <input 
                            type="number" 
                            className="w-44 p-6 border-2 border-slate-100 rounded-[2.5rem] font-black bg-slate-50 focus:bg-white focus:border-blue-500 outline-none text-center text-lg transition-all" 
                            value={commSettings.weeks[w].revenue} 
                            onChange={e => setCommSettings({...commSettings, weeks: {...commSettings.weeks, [w]: {...commSettings.weeks[w], revenue: e.target.value}}})} 
                          />
                       </div>
                    ))}
                  </div>
               </div>
            </div>
          </div>
        )}

        {/* VIEW 4: ESTRUTURA VISUAL DO FUNIL */}
        {activeTab === 'funnel' && (
          <div className="bg-white p-24 rounded-[6rem] shadow-2xl border-4 border-white animate-in zoom-in-95 duration-700">
             <div className="flex items-center gap-12 mb-28">
                <div className="bg-slate-900 p-10 rounded-[3.5rem] text-blue-500 shadow-2xl rotate-6"><PieChart size={64}/></div>
                <div>
                   <h3 className="text-7xl font-black tracking-tighter uppercase italic leading-tight">Gargalos e Conversão</h3>
                   <p className="text-base font-black text-slate-300 uppercase tracking-[0.6em]">Visão Geométrica do Fluxo Comercial</p>
                </div>
             </div>
             <div className="max-w-[1200px] mx-auto space-y-16">
                <FunnelTier label="Oportunidades Totais" count={analytics.funnel.contato} percent={100} color="bg-slate-300" />
                <FunnelTransition value={analytics.rates.c2o} label="Qualificação p/ Proposta" />
                <FunnelTier label="Apresentação Técnica" count={analytics.funnel.orcamento} percent={analytics.rates.c2o} color="bg-blue-600" />
                <FunnelTransition value={analytics.rates.n2f} label="Conversão / Fechamento" />
                <FunnelTier label="Clientes Conquistados" count={analytics.funnel.fechado} percent={analytics.rates.total} color="bg-emerald-600" />
             </div>
          </div>
        )}
      </main>

      {/* MODAL SUPREMO DE CADASTRO (NEW OPPORTUNITY) */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-950/98 backdrop-blur-3xl flex items-center justify-center p-8 z-[9999] animate-in fade-in duration-500">
          <div className="bg-white rounded-[6rem] p-24 max-w-5xl w-full shadow-[0_100px_150px_-30px_rgba(0,0,0,0.5)] border-t-[32px] border-blue-600 animate-in zoom-in-95 duration-500 relative">
            <button 
              onClick={() => setIsModalOpen(false)} 
              className="absolute top-16 right-16 text-slate-300 hover:text-rose-500 hover:rotate-90 transition-all duration-500"
            >
              <X size={64}/>
            </button>
            <div className="flex items-center gap-8 mb-20">
              <div className="bg-blue-50 p-6 rounded-[2.5rem] text-blue-600"><Briefcase size={48}/></div>
              <div>
                <h2 className="text-7xl font-black uppercase italic tracking-tighter text-slate-900">Nova Oportunidade</h2>
                <p className="text-xs font-black text-slate-400 uppercase tracking-[0.5em] mt-2">Sincronização imediata com banco de dados</p>
              </div>
            </div>

            <div className="grid gap-12">
              <div className="space-y-4">
                 <label className="text-[11px] font-black text-slate-400 uppercase tracking-[0.4em] ml-10">Identificação do Lead / Empresa</label>
                 <input 
                   className="w-full p-12 rounded-[4rem] bg-slate-50 border-4 border-transparent focus:border-blue-600 font-black outline-none text-3xl shadow-inner transition-all placeholder:text-slate-200" 
                   value={newLead.name} 
                   onChange={e=>setNewLead({...newLead, name: e.target.value})} 
                   placeholder="NOME DA EMPRESA" 
                 />
              </div>

              <div className="grid grid-cols-2 gap-12">
                <div className="space-y-4">
                   <label className="text-[11px] font-black text-slate-400 uppercase tracking-[0.4em] ml-10">Valor Estimado (R$)</label>
                   <input 
                     type="number" 
                     className="w-full p-12 rounded-[4rem] bg-slate-50 border-4 border-transparent focus:border-blue-600 font-black outline-none text-3xl shadow-inner transition-all" 
                     value={newLead.value} 
                     onChange={e=>setNewLead({...newLead, value: e.target.value})} 
                     placeholder="0,00" 
                   />
                </div>
                <div className="space-y-4">
                   <label className="text-[11px] font-black text-slate-400 uppercase tracking-[0.4em] ml-10">Tipo de Negócio</label>
                   <button 
                     onClick={() => setNewLead({...newLead, reactivated: !newLead.reactivated})} 
                     className={`w-full p-12 rounded-[4rem] font-black uppercase text-base border-4 transition-all duration-500 flex items-center justify-center gap-6 ${newLead.reactivated ? 'bg-emerald-600 border-emerald-600 text-white shadow-2xl scale-105' : 'bg-slate-50 border-transparent text-slate-400 hover:bg-slate-100'}`}
                   >
                     {newLead.reactivated ? <Check size={28}/> : <RotateCcw size={28}/>}
                     {newLead.reactivated ? 'CLIENTE REATIVADO' : 'NOVA CAPTAÇÃO'}
                   </button>
                </div>
              </div>

              <div className="space-y-4">
                 <label className="text-[11px] font-black text-slate-400 uppercase tracking-[0.4em] ml-10">Briefing Inicial / Contexto</label>
                 <textarea 
                   className="w-full p-12 rounded-[4rem] bg-slate-50 border-4 border-transparent focus:border-blue-600 font-black outline-none text-xl shadow-inner transition-all placeholder:text-slate-200 min-h-[150px]" 
                   value={newLead.notes} 
                   onChange={e=>setNewLead({...newLead, notes: e.target.value})} 
                   placeholder="Descreva aqui o que o cliente busca..." 
                 />
              </div>

              <button 
                disabled={!newLead.name || isSaving}
                onClick={async () => {
                  await handleSaveLead({...newLead, week: currentWeek, isArchived: false});
                  setIsModalOpen(false);
                  setNewLead({name: '', value: '', vendor: 'Vendedor Principal', notes: '', stage: 'contato', tags: '', followUp: false, postSale: false, hasCrossSell: false, hasUpSell: false, reactivated: false});
                }} 
                className={`w-full p-14 rounded-[5rem] font-black uppercase tracking-[0.6em] text-2xl shadow-2xl transition-all flex items-center justify-center gap-10 mt-10 ${!newLead.name || isSaving ? 'bg-slate-100 text-slate-300' : 'bg-blue-600 text-white hover:scale-[1.02] hover:bg-blue-700 active:scale-95'}`}
              >
                {isSaving ? 'PROCESSANDO...' : 'LANÇAR NO PIPELINE'} <ArrowRight size={48}/>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// --- SUBCOMPONENTES HARD-CORE (MODULARIZAÇÃO DE UI) ---

const QuickActionBtn = ({ label, active, color, onClick, icon }) => (
  <button 
    onClick={onClick} 
    className={`p-5 rounded-[2.2rem] border-2 text-[9px] font-black uppercase transition-all duration-300 flex items-center justify-center gap-3 ${active ? `${color} text-white border-transparent shadow-xl scale-110 z-10` : 'bg-white text-slate-300 border-slate-100 hover:border-slate-300 hover:text-slate-500'}`}
  >
    {icon} {label}
  </button>
);

const AuditRow = ({ label, rule, meta, real, ok }) => (
  <tr className={`group transition-all duration-300 ${!ok ? 'bg-rose-50/30' : 'hover:bg-slate-50'}`}>
    <td className="p-16 font-black text-slate-900 text-lg tracking-tighter">{label}</td>
    <td className="p-16 text-slate-400 italic text-[12px] normal-case font-bold">{rule}</td>
    <td className="p-16 text-center font-black text-slate-400 text-lg">{meta}</td>
    <td className="p-16 text-center font-black text-blue-600 text-2xl font-mono">{real}</td>
    <td className="p-16 text-center">
       <div className={`inline-flex items-center gap-5 px-10 py-4 rounded-full font-black text-[11px] border-2 ${ok ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-rose-50 text-rose-600 border-rose-100'}`}>
          <div className={`w-3 h-3 rounded-full ${ok ? 'bg-emerald-500' : 'bg-rose-500 animate-pulse'}`}></div>
          {ok ? 'CUMPRIDO' : 'DÉBITO TÉCNICO'}
       </div>
    </td>
  </tr>
);

const KPIRow = ({ title, meta, total, leads, field, format, isPercent }) => {
  const getWeeklyVal = (w) => {
    const weekLeads = leads.filter(l => !l.isArchived && Number(l.week || 1) === w);
    const won = weekLeads.filter(l => l.stage === 'fechado');
    if (field === 'contacts') return weekLeads.length;
    if (field === 'conv') return weekLeads.length > 0 ? (won.length / weekLeads.length) * 100 : 0;
    if (field === 'cross') return won.length > 0 ? (won.filter(l => l.hasCrossSell).length / won.length) * 100 : 0;
    if (field === 'fup') return weekLeads.filter(l => l.stage !== 'contato').length > 0 ? (weekLeads.filter(l => l.followUp).length / weekLeads.filter(l => l.stage !== 'contato').length) * 100 : 0;
    if (field === 'react') return weekLeads.filter(l => l.reactivated).length;
    return 0;
  };
  
  const getFarolColor = (val) => {
    const target = isPercent ? parseFloat(meta) : parseFloat(meta) / 4;
    if (val >= target) return 'bg-emerald-500 shadow-[0_0_20px_rgba(16,185,129,0.4)]';
    if (val >= target * 0.7) return 'bg-amber-400 shadow-[0_0_20px_rgba(251,191,36,0.4)]';
    return 'bg-rose-500 shadow-[0_0_20px_rgba(244,63,94,0.4)]';
  };

  return (
    <tr className="hover:bg-slate-50/80 transition-all">
      <td className="p-16 font-black text-slate-800 text-lg tracking-tighter">{title}</td>
      <td className="p-16 text-center text-slate-300 italic font-bold">Ref: {meta}</td>
      {[1, 2, 3, 4].map(w => (
        <td key={w} className="p-16 text-center">
          <div className="flex flex-col items-center gap-4 group/kpi">
            <div className={`w-8 h-8 rounded-full ${getFarolColor(getWeeklyVal(w))} transition-all duration-500 group-hover/kpi:scale-125 ring-4 ring-white shadow-xl`} />
            <span className="text-[11px] text-slate-400 font-black tracking-widest">{format(getWeeklyVal(w))}</span>
          </div>
        </td>
      ))}
      <td className="p-16 text-center bg-blue-50/50 border-l-4 border-white">
        <span className="text-3xl font-black text-blue-900 font-mono tracking-tighter">{total}</span>
      </td>
    </tr>
  );
};

const FunnelTier = ({ label, count, percent, color }) => (
  <div className="flex items-center gap-14 group">
    <div 
      className={`h-32 ${color} rounded-[4.5rem] flex items-center justify-between px-20 text-white shadow-2xl transition-all duration-700 hover:scale-[1.02] hover:-rotate-1`} 
      style={{ width: `${Math.max(percent, 30)}%`, minWidth: '350px' }}
    >
      <span className="font-black uppercase tracking-[0.4em] text-sm italic">{label}</span>
      <div className="flex flex-col items-end">
        <span className="font-black text-6xl font-mono leading-none tracking-tighter">{count}</span>
        <span className="text-[11px] opacity-60 font-black uppercase mt-2 tracking-widest">Registros</span>
      </div>
    </div>
    <div className="text-slate-200 font-black text-5xl italic transition-all group-hover:text-blue-500 group-hover:translate-x-4 duration-500">
      {percent.toFixed(0)}%
    </div>
  </div>
);

const FunnelTransition = ({ value, label }) => (
  <div className="flex flex-col items-center py-10 border-l-8 border-dotted border-slate-100 ml-40 relative">
    <div className="absolute left-[-14px] top-1/2 -translate-y-1/2 w-4 h-4 bg-slate-100 rounded-full"></div>
    <div className="bg-white border-4 border-slate-50 px-14 py-6 rounded-[3rem] shadow-2xl flex items-center gap-6 group hover:border-blue-200 transition-all">
       <div className="p-3 bg-blue-50 rounded-2xl text-blue-600 group-hover:rotate-180 transition-transform duration-700">
          <RefreshCw size={24}/>
       </div>
       <div>
          <span className="text-slate-400 font-black text-[10px] uppercase tracking-[0.3em] block mb-1">{label}</span>
          <span className="text-slate-900 font-black text-2xl font-mono italic">{value.toFixed(1)}%</span>
       </div>
    </div>
  </div>
);
