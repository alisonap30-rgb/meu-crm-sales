import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { createClient } from '@supabase/supabase-js';
import { 
  TrendingUp, PlusCircle, Trash2, BarChart2, Target, AlertCircle, Archive, 
  RotateCcw, Tag as TagIcon, Info, CheckCircle2, ChevronRight, DollarSign,
  User, Calendar, FileText, ClipboardList, ShieldCheck, Zap, ArrowRight,
  Clock, Award, BarChart, Grab, Search, Filter, Settings, RefreshCw,
  Layers, ArrowDownWideNarrow, PieChart, Activity, Gauge, MousePointer2,
  Lock, Unlock, ChevronDown, Check, X, HelpCircle, Briefcase, Wallet, 
  Percent, ChevronUp, AlertTriangle, Monitor, Database, Terminal, Cpu,
  BriefcaseIcon, Globe, LayoutDashboard, ListChecks, MessageSquare,
  Navigation, PlayCircle, Power, Save, Share2, Shield, Smartphone, 
  ToggleLeft, UserPlus, Users, Wand2
} from 'lucide-react';

// =============================================================================
// --- CONFIGURAÇÃO E TIPAGEM DE ALTO NÍVEL ---
// =============================================================================

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || "";
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || "";
const supabase = (SUPABASE_URL && SUPABASE_KEY) ? createClient(SUPABASE_URL, SUPABASE_KEY) : null;

interface Lead {
  id: string;
  name: string;
  value: number;
  stage: 'contato' | 'orcamento' | 'negociacao' | 'fechado' | 'perdido';
  vendor: string;
  notes: string;
  tags: string;
  week: number;
  priority: 'baixa' | 'media' | 'alta';
  followUp: boolean;
  postSale: boolean;
  hasCrossSell: boolean;
  hasUpSell: boolean;
  reactivated: boolean;
  isArchived: boolean;
  lastUpdate: string;
  createdAt: string;
  expectedCloseDate?: string;
}

interface Goals {
  revenue: number;
  ticket: number;
  contacts: number;
  followUp: number;
  crossSell: number;
  upSell: number;
  postSale: number;
  reactivated: number;
  conversion: number;
}

// =============================================================================
// --- DICIONÁRIOS E ESTRUTURAS ---
// =============================================================================

const STAGES = [
  { id: 'contato', label: 'Primeiro Contato', color: 'bg-slate-400', border: 'border-slate-400', shadow: 'shadow-slate-200', desc: 'Leads frios ou recém-captados' },
  { id: 'orcamento', label: 'Proposta Enviada', color: 'bg-blue-500', border: 'border-blue-500', shadow: 'shadow-blue-200', desc: 'Em análise pelo cliente' },
  { id: 'negociacao', label: 'Em Negociação', color: 'bg-amber-500', border: 'border-amber-500', shadow: 'shadow-amber-200', desc: 'Ajuste de escopo e valores' },
  { id: 'fechado', label: 'Contrato Fechado', color: 'bg-emerald-500', border: 'border-emerald-500', shadow: 'shadow-emerald-200', desc: 'Venda convertida' },
  { id: 'perdido', label: 'Oportunidade Perdida', color: 'bg-rose-500', border: 'border-rose-500', shadow: 'shadow-rose-200', desc: 'Lead descartado' }
] as const;

const AVAILABLE_TAGS = [
  { id: 'proposta', label: 'PROPOSTA ENVIADA', color: 'bg-blue-600', light: 'bg-blue-50 text-blue-700 border-blue-200' },
  { id: 'followup', label: 'AGUARDANDO RETORNO', color: 'bg-amber-600', light: 'bg-amber-50 text-amber-800 border-amber-200' },
  { id: 'urgente', label: 'PRIORIDADE ALTA', color: 'bg-red-600', light: 'bg-red-50 text-red-700 border-red-200' },
  { id: 'reuniao', label: 'REUNIÃO AGENDADA', color: 'bg-emerald-600', light: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  { id: 'recorrente', label: 'CLIENTE RECORRENTE', color: 'bg-purple-600', light: 'bg-purple-50 text-purple-700 border-purple-200' },
  { id: 'indicacao', label: 'INDICAÇÃO DIRETA', color: 'bg-indigo-600', light: 'bg-indigo-50 text-indigo-700 border-indigo-200' }
];

// =============================================================================
// --- COMPONENTE PRINCIPAL ---
// =============================================================================

export default function CRMMasterUltimateEnterprise() {
  // --- ESTADOS DE DADOS ---
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncStatus, setSyncStatus] = useState<'online' | 'syncing' | 'error' | 'offline'>('online');
  const [currentWeek, setCurrentWeek] = useState<number>(1);
  const [activeTab, setActiveTab] = useState<string>('pipeline');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  
  // --- ESTADOS DE NEGÓCIO ---
  const [goals, setGoals] = useState<Goals>({
    revenue: 100000, ticket: 5000, contacts: 400, followUp: 90, 
    crossSell: 40, upSell: 15, postSale: 100, reactivated: 8, conversion: 5
  });

  const [commSettings, setCommSettings] = useState({
    weeks: {
      1: { revenue: 0 }, 2: { revenue: 0 }, 3: { revenue: 0 }, 4: { revenue: 0 }
    } as Record<number, { revenue: number | string }>,
    profitMargin: 15,
    selectedVendor: 'Geral'
  });

  const [newLead, setNewLead] = useState<Partial<Lead>>({
    name: '', value: 0, vendor: 'Vendedor Principal', notes: '', stage: 'contato', tags: '',
    followUp: false, postSale: false, hasCrossSell: false, hasUpSell: false, reactivated: false,
    priority: 'media'
  });

  // --- PERSISTÊNCIA E SINCRONIZAÇÃO EM TEMPO REAL ---
  const fetchLeads = useCallback(async () => {
    if (!supabase) {
      setSyncStatus('offline');
      setLoading(false);
      return;
    }
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
    const channel = supabase.channel('crm_ultimate_stream')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'leads' }, fetchLeads)
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [fetchLeads]);

  // --- FUNÇÕES DE MANIPULAÇÃO ---
  const handleSaveLead = async (leadData: any) => {
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
      await fetchLeads();
    } catch (e) {
      alert("Erro ao salvar no banco. Verifique sua conexão.");
    } finally {
      setIsSaving(false);
    }
  };

  const deleteLead = async (id: string) => {
    if (!supabase || !window.confirm("PERIGO: Esta ação é irreversível. Confirmar exclusão?")) return;
    try {
      await supabase.from('leads').delete().eq('id', id);
      fetchLeads();
    } catch (e) {
      console.error(e);
    }
  };

  const toggleTag = (lead: Lead, tagId: string) => {
    let currentTags = lead.tags ? lead.tags.split(',') : [];
    if (currentTags.includes(tagId)) {
      currentTags = currentTags.filter(t => t !== tagId);
    } else {
      currentTags = [...currentTags, tagId];
    }
    handleSaveLead({ ...lead, tags: currentTags.join(',') });
  };

  // ===========================================================================
  // --- MOTOR ANALYTICS E REGRAS DE PAGAMENTO COMPLETAS ---
  // ===========================================================================
  
  const analytics = useMemo(() => {
    const active = leads.filter(l => !l.isArchived);
    
    // CORREÇÃO DO BOTÃO DE PESQUISA (Aplica-se aos leads visíveis)
    const filteredLeads = active.filter(l => 
      l.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (l.notes && l.notes.toLowerCase().includes(searchTerm.toLowerCase()))
    );

    const won = active.filter(l => l.stage === 'fechado');
    const lost = active.filter(l => l.stage === 'perdido');
    
    const funnel = {
      contato: active.length,
      orcamento: active.filter(l => ['orcamento', 'negociacao', 'fechado'].includes(l.stage)).length,
      negociacao: active.filter(l => ['negociacao', 'fechado'].includes(l.stage)).length,
      fechado: won.length,
      perdido: lost.length
    };

    const rates = {
      total: funnel.contato > 0 ? (funnel.fechado / funnel.contato) * 100 : 0,
      c2o: funnel.contato > 0 ? (funnel.orcamento / funnel.contato) * 100 : 0,
      o2n: funnel.orcamento > 0 ? (funnel.negociacao / funnel.orcamento) * 100 : 0,
      n2f: funnel.negociacao > 0 ? (funnel.fechado / funnel.negociacao) * 100 : 0
    };

    const totalRev = Object.values(commSettings.weeks).reduce((a, b) => a + Number(b.revenue || 0), 0);
    const revPerf = (totalRev / goals.revenue) * 100;

    const kpis = {
      cross: won.length > 0 ? (won.filter(l => l.hasCrossSell).length / won.length) * 100 : 0,
      up: won.length > 0 ? (won.filter(l => l.hasUpSell).length / won.length) * 100 : 0,
      post: won.length > 0 ? (won.filter(l => l.postSale).length / won.length) * 100 : 0,
      fup: funnel.orcamento > 0 ? (active.filter(l => l.followUp).length / funnel.orcamento) * 100 : 0,
      react: active.filter(l => l.reactivated).length
    };

    // --- ALGORITMO DE COMISSÃO (TODAS AS REGRAS REINSERIDAS) ---
    const isMarginOk = Number(commSettings.profitMargin) >= 12;
    let baseRate = 0;
    
    // Regra 1: Alíquota Base por faturamento
    if (revPerf >= 110) baseRate = 3.5;
    else if (revPerf >= 100) baseRate = 2.5;
    else if (revPerf >= 90) baseRate = 1.5;

    // Regra 2: Aceleradores (Bonus de Performance +0.5% cada)
    const accel_conv = (rates.total >= goals.conversion) ? 0.5 : 0;
    const accel_cross = (kpis.cross >= goals.crossSell) ? 0.5 : 0;
    const accel_up = (kpis.up >= goals.upSell) ? 0.5 : 0;

    // Regra 3: Cálculo Final da Alíquota
    const finalRate = isMarginOk ? (baseRate + accel_conv + accel_cross + accel_up) : 0;
    
    // Regra 4: Bônus Fixo por Volume de Captação
    const bonusHabilitado = funnel.contato >= goals.contacts && kpis.fup >= goals.followUp;
    const totalCommission = (totalRev * (finalRate / 100)) + (bonusHabilitado ? 300 : 0);

    return { 
      funnel, rates, totalRev, revPerf, kpis, 
      finalRate, totalCommission, bonusHabilitado, isMarginOk,
      filteredLeads, actualMargin: commSettings.profitMargin
    };
  }, [leads, commSettings, goals, searchTerm]);

  // ===========================================================================
  // --- RENDERIZAÇÃO DE UI (COM FONTES REDUZIDAS E ALTA DENSIDADE) ---
  // ===========================================================================

  if (loading) return (
    <div className="h-screen bg-slate-950 flex flex-col items-center justify-center font-black text-blue-500 italic">
      <Terminal size={60} className="mb-6 animate-pulse" />
      <div className="text-xl uppercase tracking-[0.5em] mb-4">RESTORE SYSTEM DATA</div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#F1F5F9] p-4 lg:p-6 font-sans text-slate-900">
      
      {/* HEADER ULTRA REDUZIDO EM ESCALA */}
      <header className="max-w-[1920px] mx-auto mb-6 flex flex-col 2xl:flex-row justify-between items-center gap-4">
        <div className="flex items-center gap-6 group">
          <div className="bg-slate-900 p-5 rounded-[2rem] shadow-xl text-blue-400">
            <Cpu size={36} />
          </div>
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className={`h-2 w-2 rounded-full ${syncStatus === 'online' ? 'bg-emerald-500' : 'bg-rose-500'} animate-pulse`}></span>
              <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">LIVE SYNC: {syncStatus}</p>
            </div>
            <h1 className="text-5xl font-black tracking-tighter italic leading-none text-slate-900">
              CRM<span className="text-blue-600">ULTRA</span>
              <span className="text-sm not-italic text-slate-300 ml-4 font-bold border-l-2 pl-4 border-slate-200 uppercase tracking-widest">Enterprise Hardcore</span>
            </h1>
          </div>
        </div>

        {/* CONTROLES CENTRAIS COMPACTOS */}
        <div className="flex flex-wrap justify-center gap-4 bg-white p-3 rounded-[3rem] shadow-lg border border-slate-200">
          <div className="flex bg-slate-100 p-1 rounded-[1.5rem] mr-2">
            {[1, 2, 3, 4].map(w => (
              <button key={w} onClick={() => setCurrentWeek(w)} className={`px-6 py-2 rounded-[1.2rem] font-black text-[10px] transition-all ${currentWeek === w ? 'bg-white text-blue-600 shadow-md' : 'text-slate-400'}`}>W0{w}</button>
            ))}
          </div>
          
          <nav className="flex gap-1">
            {[
              { id: 'pipeline', label: 'Pipeline', icon: <LayoutDashboard size={14}/> },
              { id: 'metrics', label: 'KPI Monitor', icon: <Activity size={14}/> },
              { id: 'funnel', label: 'Funnel', icon: <PieChart size={14}/> },
              { id: 'commission', label: 'Auditoria', icon: <Wallet size={14}/> }
            ].map(tab => (
              <button key={tab.id} onClick={() => setActiveTab(tab.id)} className={`px-6 py-3 rounded-[2rem] font-black text-[9px] uppercase transition-all flex items-center gap-3 ${activeTab === tab.id ? 'bg-slate-900 text-white shadow-lg' : 'text-slate-500 hover:bg-slate-50'}`}>
                {tab.icon} {tab.label}
              </button>
            ))}
          </nav>

          <div className="relative ml-2">
             <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={14}/>
             <input 
               type="text" 
               placeholder="Localizar lead..." 
               className="bg-slate-100 border-none rounded-full py-3 pl-10 pr-6 text-[10px] font-bold w-48 focus:w-64 transition-all outline-none"
               value={searchTerm}
               onChange={(e) => setSearchTerm(e.target.value)}
             />
          </div>

          <button onClick={() => setIsModalOpen(true)} className="bg-blue-600 text-white p-3 rounded-full shadow-lg hover:bg-blue-700 transition-all ml-2">
            <PlusCircle size={20} />
          </button>
        </div>
      </header>

      {/* CONTEÚDO DINÂMICO */}
      <main className="max-w-[1920px] mx-auto">
        
        {activeTab === 'pipeline' && (
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            {STAGES.map(stage => {
              const stageLeads = analytics.filteredLeads.filter(l => l.stage === stage.id && Number(l.week || 1) === currentWeek);
              return (
                <div key={stage.id} className="bg-slate-200/40 p-5 rounded-[2.5rem] min-h-[850px] border border-slate-300/40">
                  <div className="mb-6 flex justify-between items-start px-2">
                    <div>
                      <h3 className="font-black text-[10px] uppercase text-slate-800 tracking-widest mb-1">{stage.label}</h3>
                      <p className="text-[8px] text-slate-400 font-bold uppercase leading-tight">{stage.desc}</p>
                    </div>
                    <span className="bg-white text-slate-900 px-3 py-1 rounded-lg text-[9px] font-black shadow-sm border">{stageLeads.length}</span>
                  </div>

                  <div className="space-y-4">
                    {stageLeads.map(lead => (
                      <div key={lead.id} className="bg-white p-5 rounded-[2rem] shadow-md border-2 border-white transition-all hover:scale-[1.02] group relative cursor-pointer">
                        <button onClick={(e) => { e.stopPropagation(); deleteLead(lead.id); }} className="absolute -right-2 -top-2 bg-white text-rose-500 p-2.5 rounded-full shadow-md opacity-0 group-hover:opacity-100 transition-all hover:bg-rose-600 hover:text-white z-50 border">
                          <Trash2 size={12}/>
                        </button>

                        <div className="flex flex-wrap gap-1 mb-4">
                          {lead.tags?.split(',').filter(t=>t).map(tId => {
                            const tag = AVAILABLE_TAGS.find(at => at.id === tId);
                            return tag && <span key={tId} className={`px-2 py-0.5 rounded-full text-[7px] font-black uppercase tracking-wider border ${tag.light}`}>{tag.label}</span>;
                          })}
                        </div>

                        <h4 className="font-black text-[12px] text-slate-900 uppercase mb-2 leading-tight tracking-tight">{lead.name}</h4>
                        <div className="text-emerald-600 font-black text-lg mb-6 italic">R$ {Number(lead.value).toLocaleString('pt-BR')}</div>

                        <div className="bg-slate-50 p-3 rounded-[1.2rem] mb-4 border border-slate-100">
                             <textarea 
                               className="w-full text-[9px] bg-transparent border-none font-bold text-slate-700 resize-none outline-none h-12"
                               placeholder="Briefing do lead..."
                               value={lead.notes || ''}
                               onChange={(e) => {
                                 const updatedLeads = leads.map(l => l.id === lead.id ? {...l, notes: e.target.value} : l);
                                 setLeads(updatedLeads);
                               }}
                               onBlur={() => handleSaveLead(leads.find(l => l.id === lead.id))}
                             />
                        </div>

                        <div className="flex gap-1.5 mb-6 justify-center">
                          {AVAILABLE_TAGS.map(tag => (
                            <button key={tag.id} onClick={() => toggleTag(lead, tag.id)} className={`w-5 h-5 rounded-full border-2 transition-all ${lead.tags?.includes(tag.id) ? `${tag.color} border-white shadow-md scale-110` : 'bg-slate-100 border-transparent'}`} />
                          ))}
                        </div>

                        <div className="grid grid-cols-2 gap-2">
                          <QuickActionBtn label="Follow" active={lead.followUp} onClick={()=>handleSaveLead({...lead, followUp: !lead.followUp})} color="bg-amber-500" icon={<RefreshCw size={10}/>}/>
                          <QuickActionBtn label="Cross" active={lead.hasCrossSell} onClick={()=>handleSaveLead({...lead, hasCrossSell: !lead.hasCrossSell})} color="bg-blue-600" icon={<Zap size={10}/>}/>
                          <QuickActionBtn label="Up" active={lead.hasUpSell} onClick={()=>handleSaveLead({...lead, hasUpSell: !lead.hasUpSell})} color="bg-purple-600" icon={<TrendingUp size={10}/>}/>
                          <QuickActionBtn label="Pós" active={lead.postSale} onClick={()=>handleSaveLead({...lead, postSale: !lead.postSale})} color="bg-emerald-600" icon={<CheckCircle2 size={10}/>}/>
                        </div>

                        <div className="mt-4 pt-4 border-t border-slate-50 flex justify-between items-center opacity-30 group-hover:opacity-100 transition-all">
                             <div className="flex items-center gap-1"><Clock size={10}/><span className="text-[8px] font-black">{new Date(lead.lastUpdate).toLocaleDateString()}</span></div>
                             <div className="flex items-center gap-1"><User size={10}/><span className="text-[8px] font-black uppercase">Vend. 01</span></div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* VIEW FINANCEIRA (MOTOR COMPLETO) */}
        {activeTab === 'commission' && (
          <div className="space-y-8 animate-in slide-in-from-bottom-5 duration-700">
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
              <div className="bg-slate-900 p-12 rounded-[3.5rem] text-white shadow-2xl relative overflow-hidden group">
                 <DollarSign className="absolute -right-12 -bottom-12 opacity-5 group-hover:scale-110 transition-transform" size={400}/>
                 <div className="relative z-10">
                    <p className="text-blue-400 font-black uppercase tracking-[0.5em] text-[9px] mb-6">Faturamento Realizado</p>
                    <h3 className="text-7xl font-black tracking-tighter mb-10 font-mono italic">R$ {analytics.totalRev.toLocaleString('pt-BR')}</h3>
                    <div className="flex gap-12 border-t border-white/10 pt-8">
                       <div><p className="text-[8px] font-black opacity-40 uppercase mb-2">Meta</p><p className="text-4xl font-black">{analytics.revPerf.toFixed(1)}%</p></div>
                       <div><p className="text-[8px] font-black opacity-40 uppercase mb-2">Alíquota Aplicada</p><p className="text-4xl font-black">{analytics.finalRate.toFixed(2)}%</p></div>
                    </div>
                 </div>
              </div>

              <div className={`p-12 rounded-[3.5rem] border-[12px] shadow-2xl flex flex-col justify-center items-center transition-all ${analytics.isMarginOk ? 'bg-white border-emerald-500' : 'bg-slate-100 border-rose-500 opacity-80'}`}>
                 <p className="text-slate-400 font-black uppercase tracking-[0.4em] mb-6 text-[10px] italic">Variável de Performance Final</p>
                 <h3 className={`text-7xl font-black tracking-tighter font-mono leading-none italic ${analytics.isMarginOk ? 'text-emerald-600' : 'text-slate-300 line-through'}`}>
                    R$ {analytics.totalCommission.toLocaleString('pt-BR')}
                 </h3>
                 {!analytics.isMarginOk && <div className="mt-6 bg-rose-600 text-white px-6 py-2 rounded-full font-black text-[9px] uppercase animate-pulse flex items-center gap-2 shadow-lg"><Lock size={14}/> Bloqueio de Margem: {analytics.actualMargin}%</div>}
                 {analytics.bonusHabilitado && <div className="mt-4 text-emerald-600 font-black text-[9px] uppercase flex items-center gap-3 bg-emerald-50 px-6 py-3 rounded-full shadow-sm"><Award size={18}/> Bônus Fixo R$ 300 Habilitado</div>}
              </div>
            </div>

            {/* PAINEL DE PARÂMETROS E REGRAS */}
            <div className="bg-white rounded-[3.5rem] shadow-xl border-2 border-white overflow-hidden">
               <div className="bg-slate-900 p-8 text-white flex justify-between items-center">
                  <div className="flex items-center gap-6">
                    <div className="bg-blue-600 p-4 rounded-[1.5rem] shadow-lg"><Gauge size={30}/></div>
                    <h4 className="text-2xl font-black uppercase tracking-tighter italic">Algoritmo de Pagamento</h4>
                  </div>
               </div>
               
               <div className="p-10 bg-slate-50 flex flex-col xl:flex-row gap-12 items-center justify-between">
                  <div className="flex flex-wrap justify-center gap-10">
                     <div className="space-y-4">
                        <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-4">Margem Bruta %</label>
                        <input type="number" className="w-32 p-6 rounded-[2rem] font-black bg-white shadow-md outline-none text-2xl text-center border-2 border-transparent focus:border-blue-500" value={commSettings.profitMargin} onChange={e => setCommSettings({...commSettings, profitMargin: Number(e.target.value)})} />
                     </div>
                     <div className="space-y-4">
                        <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-4">Meta Mensal (R$)</label>
                        <input type="number" className="w-64 p-6 rounded-[2rem] font-black bg-white shadow-md outline-none text-2xl text-center border-2 border-transparent focus:border-blue-500" value={goals.revenue} onChange={e => setGoals({...goals, revenue: Number(e.target.value)})} />
                     </div>
                  </div>

                  {/* LANÇAMENTO SEMANAL */}
                  <div className="flex flex-wrap justify-center gap-4 bg-white p-8 rounded-[3rem] shadow-lg">
                    {[1, 2, 3, 4].map(w => (
                       <div key={w} className="space-y-2">
                          <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest text-center block">Semana 0{w}</label>
                          <input type="number" className="w-32 p-4 border-2 border-slate-50 rounded-[1.5rem] font-black bg-slate-50 focus:border-blue-500 outline-none text-center text-lg transition-all" value={commSettings.weeks[w].revenue} onChange={e => setCommSettings({...commSettings, weeks: {...commSettings.weeks, [w]: {revenue: e.target.value}}})} />
                       </div>
                    ))}
                  </div>
               </div>
            </div>
          </div>
        )}

        {/* MONITOR DE KPIs (RESTAURADO) */}
        {activeTab === 'metrics' && (
           <div className="space-y-8 animate-in slide-in-from-bottom-5">
              <div className="bg-white rounded-[3rem] shadow-xl border-2 border-white overflow-hidden">
                 <div className="bg-slate-900 p-10 text-white flex justify-between items-center">
                    <div className="flex items-center gap-6">
                       <div className="bg-blue-600 p-4 rounded-[1.5rem] shadow-lg"><Activity size={30}/></div>
                       <h3 className="text-2xl font-black uppercase tracking-tighter italic">Monitoramento de Ciclo</h3>
                    </div>
                 </div>
                 
                 <table className="w-full text-left">
                   <thead className="bg-slate-50 text-[10px] uppercase font-black tracking-widest text-slate-400 border-b">
                     <tr>
                       <th className="p-10">Métrica Estratégica</th>
                       <th className="p-10 text-center">Meta do Ciclo</th>
                       {[1, 2, 3, 4].map(w => <th key={w} className="p-10 text-center">Week 0{w}</th>)}
                       <th className="p-10 text-center bg-blue-50 text-blue-900 font-black">Consolidado</th>
                     </tr>
                   </thead>
                   <tbody className="divide-y divide-slate-100 font-bold text-[11px] uppercase text-slate-600">
                     <KPIRow title="Novos Contatos / Captação" meta={goals.contacts} total={analytics.funnel.contato} leads={leads} field="contacts" format={(v: any)=>v} />
                     <KPIRow title="Taxa de Conversão Real" meta={goals.conversion+"%"} total={analytics.rates.total.toFixed(1)+"%"} leads={leads} field="conv" format={(v: any)=>v.toFixed(1)+"%"} isPercent />
                     <KPIRow title="Aproveitamento Cross-Sell" meta={goals.crossSell+"%"} total={analytics.kpis.cross.toFixed(1)+"%"} leads={leads} field="cross" format={(v: any)=>v.toFixed(1)+"%"} isPercent />
                     <KPIRow title="Follow-up Ativo" meta={goals.followUp+"%"} total={analytics.kpis.fup.toFixed(1)+"%"} leads={leads} field="fup" format={(v: any)=>v.toFixed(1)+"%"} isPercent />
                     <KPIRow title="Recuperação de Inativos" meta={goals.reactivated} total={analytics.kpis.react} leads={leads} field="react" format={(v: any)=>v} />
                   </tbody>
                 </table>
              </div>
           </div>
        )}

        {/* FUNNEL GEOMÉTRICO (RESTAURADO) */}
        {activeTab === 'funnel' && (
          <div className="bg-white p-16 rounded-[4rem] shadow-2xl border-2 border-white animate-in zoom-in-95 duration-1000 mb-10">
             <div className="flex items-center gap-8 mb-16">
                <div className="bg-slate-900 p-6 rounded-[2rem] text-blue-500 shadow-xl"><PieChart size={40}/></div>
                <div>
                   <h3 className="text-5xl font-black tracking-tighter uppercase italic leading-tight">Funnel Analysis</h3>
                   <p className="text-[10px] font-black text-slate-300 uppercase tracking-[0.5em] mt-2">Conversão Geométrica</p>
                </div>
             </div>
             <div className="max-w-[1200px] mx-auto space-y-12">
                <FunnelTier label="Oportunidades Totais" count={analytics.funnel.contato} percent={100} color="bg-slate-300" icon={<Globe size={24}/>} />
                <FunnelTier label="Propostas Realizadas" count={analytics.funnel.orcamento} percent={analytics.rates.c2o} color="bg-blue-600" icon={<FileText size={24}/>} />
                <FunnelTier label="Vendas Convertidas" count={analytics.funnel.fechado} percent={analytics.rates.total} color="bg-emerald-600" icon={<CheckCircle2 size={24}/>} />
             </div>
          </div>
        )}
      </main>

      {/* MODAL SUPREMO DE CADASTRO (FONTES AJUSTADAS) */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-950/98 backdrop-blur-2xl flex items-center justify-center p-4 z-[9999] animate-in fade-in duration-500">
          <div className="bg-white rounded-[4rem] p-16 max-w-4xl w-full shadow-2xl border-t-[20px] border-blue-600 relative">
            <button onClick={() => setIsModalOpen(false)} className="absolute top-10 right-10 text-slate-200 hover:text-rose-500 transition-all scale-150"><X size={32}/></button>
            <div className="flex items-center gap-6 mb-12">
              <div className="bg-blue-50 p-6 rounded-[1.5rem] text-blue-600 shadow-inner"><Briefcase size={40}/></div>
              <h2 className="text-6xl font-black uppercase italic tracking-tighter text-slate-900 leading-none">Nova<br/>Oportunidade</h2>
            </div>

            <div className="grid gap-10">
               <div className="space-y-4">
                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-8">Nome da Organização</label>
                  <input className="w-full p-8 rounded-[2.5rem] bg-slate-50 border-4 border-transparent focus:border-blue-600 font-black outline-none text-2xl" value={newLead.name} onChange={e=>setNewLead({...newLead, name: e.target.value})} placeholder="EMPRESA" />
               </div>

               <div className="grid grid-cols-2 gap-10">
                  <div className="space-y-4">
                     <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-8">Valor Estimado (R$)</label>
                     <input type="number" className="w-full p-8 rounded-[2.5rem] bg-slate-50 border-4 border-transparent focus:border-blue-600 font-black outline-none text-2xl text-center" value={newLead.value} onChange={e=>setNewLead({...newLead, value: Number(e.target.value)})} placeholder="0,00" />
                  </div>
                  <div className="space-y-4">
                     <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-8">Origem do Lead</label>
                     <button onClick={() => setNewLead({...newLead, reactivated: !newLead.reactivated})} className={`w-full p-8 rounded-[2.5rem] font-black uppercase text-xs border-4 transition-all flex items-center justify-center gap-4 ${newLead.reactivated ? 'bg-emerald-600 border-emerald-600 text-white shadow-xl' : 'bg-slate-50 border-transparent text-slate-400'}`}>
                       {newLead.reactivated ? <RotateCcw size={18}/> : <PlusCircle size={18}/>}
                       {newLead.reactivated ? 'REATIVAÇÃO' : 'NOVA PROSPECÇÃO'}
                     </button>
                  </div>
               </div>

               <button disabled={!newLead.name || isSaving} onClick={async () => { await handleSaveLead({...newLead, isArchived: false}); setIsModalOpen(false); setNewLead({name: '', value: 0, stage: 'contato', notes: '', tags: '', followUp: false, postSale: false, hasCrossSell: false, hasUpSell: false, reactivated: false}); }} className="w-full p-10 rounded-[3rem] bg-blue-600 text-white font-black uppercase tracking-[0.6em] text-xl shadow-xl hover:scale-[1.02] transition-all flex items-center justify-center gap-8 mt-4">PUBLICAR NO PIPELINE <ArrowRight size={32}/></button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// =============================================================================
// --- SUBCOMPONENTES DE APOIO ---
// =============================================================================

const QuickActionBtn = ({ label, active, color, onClick, icon }: any) => (
  <button onClick={(e) => { e.stopPropagation(); onClick(); }} className={`p-3 rounded-[1.2rem] border text-[8px] font-black uppercase transition-all flex items-center justify-center gap-2 ${active ? `${color} text-white border-transparent shadow-md scale-105` : 'bg-white text-slate-300 border-slate-100 hover:text-slate-500'}`}>
    {icon} {label}
  </button>
);

const KPIRow = ({ title, meta, total, leads, field, format, isPercent }: any) => {
  const getWeeklyVal = (w: number) => {
    const weekLeads = leads.filter((l: any) => !l.isArchived && Number(l.week || 1) === w);
    const won = weekLeads.filter((l: any) => l.stage === 'fechado');
    if (field === 'contacts') return weekLeads.length;
    if (field === 'conv') return weekLeads.length > 0 ? (won.length / weekLeads.length) * 100 : 0;
    if (field === 'cross') return won.length > 0 ? (won.filter((l: any) => l.hasCrossSell).length / won.length) * 100 : 0;
    if (field === 'fup') return weekLeads.length > 0 ? (weekLeads.filter((l: any) => l.followUp).length / weekLeads.length) * 100 : 0;
    if (field === 'react') return weekLeads.filter((l: any) => l.reactivated).length;
    return 0;
  };
  
  const getFarolColor = (val: number) => {
    const target = isPercent ? parseFloat(meta) : parseFloat(meta) / 4;
    if (val >= target) return 'bg-emerald-500';
    if (val >= target * 0.7) return 'bg-amber-400';
    return 'bg-rose-500';
  };

  return (
    <tr className="hover:bg-slate-50 transition-all">
      <td className="p-8 font-black text-slate-900 text-[12px] tracking-tight">{title}</td>
      <td className="p-8 text-center text-slate-300 italic font-bold">Target: {meta}</td>
      {[1, 2, 3, 4].map(w => (
        <td key={w} className="p-8 text-center">
          <div className="flex flex-col items-center gap-2">
            <div className={`w-5 h-5 rounded-full ${getFarolColor(getWeeklyVal(w))} shadow-sm`} />
            <span className="text-[8px] text-slate-400 font-black">{format(getWeeklyVal(w))}</span>
          </div>
        </td>
      ))}
      <td className="p-8 text-center bg-blue-50/50"><span className="text-xl font-black text-blue-950 font-mono italic tracking-tighter">{total}</span></td>
    </tr>
  );
};

const FunnelTier = ({ label, count, percent, color, icon }: any) => (
  <div className="flex items-center gap-10">
    <div className={`h-24 ${color} rounded-[3rem] flex items-center justify-between px-12 text-white shadow-xl transition-all hover:scale-[1.01]`} style={{ width: `${Math.max(percent, 35)}%`, minWidth: '450px' }}>
      <div className="flex items-center gap-6">
        <div className="opacity-40">{icon}</div>
        <span className="font-black uppercase tracking-[0.3em] text-[10px] italic">{label}</span>
      </div>
      <div className="text-right">
        <span className="font-black text-4xl font-mono leading-none tracking-tighter">{count}</span>
        <p className="text-[7px] opacity-60 font-black uppercase mt-1 tracking-widest">Leads</p>
      </div>
    </div>
    <div className="text-slate-200 font-black text-4xl italic">{percent.toFixed(0)}%</div>
  </div>
);
