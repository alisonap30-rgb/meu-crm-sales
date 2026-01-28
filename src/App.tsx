import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { createClient } from '@supabase/supabase-js';
import { 
  TrendingUp, PlusCircle, Trash2, BarChart2, Target, AlertCircle, Archive, 
  RotateCcw, Tag as TagIcon, Info, CheckCircle2, ChevronRight, DollarSign,
  User, Calendar, FileText, ClipboardList, ShieldCheck, Zap, ArrowRight,
  Clock, Award, BarChart, Grab, Search, Filter, Settings, RefreshCw,
  Layers, ArrowDownWideNarrow, PieChart, Activity, Gauge, MousePointer2,
  Lock, Unlock, ChevronDown, Check, X, HelpCircle
} from 'lucide-react';

// --- ARQUITETURA DE DADOS & CORE ---
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || "";
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || "";
const supabase = (SUPABASE_URL && SUPABASE_KEY) ? createClient(SUPABASE_URL, SUPABASE_KEY) : null;

// Estágios Reais do Funil de Vendas
const STAGES = [
  { id: 'contato', label: 'Primeiro Contato', color: 'bg-slate-400', desc: 'Leads recém captados' },
  { id: 'orcamento', label: 'Orçamento/Proposta', color: 'bg-blue-500', desc: 'Proposta técnica enviada' },
  { id: 'negociacao', label: 'Em Negociação', color: 'bg-amber-500', desc: 'Discussão de valores' },
  { id: 'fechado', label: 'Contrato Fechado', color: 'bg-emerald-500', desc: 'Venda concretizada' },
  { id: 'perdido', label: 'Oportunidade Perdida', color: 'bg-rose-500', desc: 'Lead descartado' }
];

// Etiquetas Operacionais Integradas
const AVAILABLE_TAGS = [
  { id: 'proposta', label: 'PROPOSTA ENVIADA', color: 'bg-blue-500', light: 'bg-blue-50 text-blue-600 border-blue-100' },
  { id: 'followup', label: 'AGUARDANDO RETORNO', color: 'bg-amber-500', light: 'bg-amber-50 text-amber-700 border-amber-100' },
  { id: 'urgente', label: 'PRIORIDADE ALTA', color: 'bg-red-500', light: 'bg-red-50 text-red-600 border-red-100' },
  { id: 'reuniao', label: 'REUNIÃO AGENDADA', color: 'bg-emerald-500', light: 'bg-emerald-50 text-emerald-600 border-emerald-100' },
];

export default function CRMMasterSystemV5() {
  // --- ESTADOS GLOBAIS ---
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentWeek, setCurrentWeek] = useState(1);
  const [activeTab, setActiveTab] = useState('pipeline');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [draggedLead, setDraggedLead] = useState(null);

  // --- PARAMETRIZAÇÃO DE REGRAS DE NEGÓCIO (TABELA DE COMISSÃO) ---
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
    profitMargin: 15 // Trava de segurança: Margem precisa ser > 0
  });

  const [newLead, setNewLead] = useState({
    name: '', value: '', vendor: 'Vendedor 1', notes: '', stage: 'contato', tags: '',
    followUp: false, postSale: false, hasCrossSell: false, hasUpSell: false, reactivated: false
  });

  // --- MÓDULO DE PERSISTÊNCIA (SUPABASE REAL-TIME) ---
  const fetchLeads = useCallback(async () => {
    if (!supabase) return;
    try {
      const { data, error } = await supabase
        .from('leads')
        .select('*')
        .order('lastUpdate', { ascending: false });
      if (!error) setLeads(data || []);
    } catch (e) {
      console.error("Falha na conexão Supabase:", e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchLeads();
    if (!supabase) return;
    const channel = supabase
      .channel('crm_global_sync')
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
    const { error } = await supabase.from('leads').upsert(payload);
    if (error) alert("Erro ao sincronizar dados: " + error.message);
    setIsSaving(false);
  };

  const deleteLead = async (id) => {
    if (!supabase || !window.confirm("⚠️ EXCLUSÃO DEFINITIVA: Deseja apagar este lead do banco de dados?")) return;
    await supabase.from('leads').delete().eq('id', id);
    fetchLeads();
  };

  const toggleTag = (lead, tagId) => {
    let currentTags = lead.tags ? lead.tags.split(',') : [];
    currentTags = currentTags.includes(tagId) ? currentTags.filter(t => t !== tagId) : [...currentTags, tagId];
    handleSaveLead({ ...lead, tags: currentTags.join(',') });
  };

  // --- MOTOR ANALYTICS AVANÇADO & REGRAS DE COMISSÃO INTEGRAL ---
  const analytics = useMemo(() => {
    // 1. Filtragem Base
    const active = leads.filter(l => !l.isArchived);
    const won = active.filter(l => l.stage === 'fechado');
    const lost = active.filter(l => l.stage === 'perdido');
    
    // 2. Funil de Conversão
    const funnel = {
      contato: active.length,
      orcamento: active.filter(l => ['orcamento', 'negociacao', 'fechado'].includes(l.stage)).length,
      fechado: won.length,
      perdido: lost.length
    };

    // 3. Taxas Técnicas
    const rates = {
      total: funnel.contato > 0 ? (funnel.fechado / funnel.contato) * 100 : 0,
      c2o: funnel.contato > 0 ? (funnel.orcamento / funnel.contato) * 100 : 0,
      n2f: funnel.orcamento > 0 ? (funnel.fechado / funnel.orcamento) * 100 : 0
    };

    // 4. Consolidação Financeira Mensal
    const totalRev = Object.values(commSettings.weeks).reduce((a, b) => a + Number(b.revenue), 0);
    const avgTicket = (Object.values(commSettings.weeks).reduce((a, b) => a + Number(b.ticket), 0)) / 4;

    // 5. Verificação de Metas Operacionais (KPIs)
    const kpis = {
      cross: won.length > 0 ? (won.filter(l => l.hasCrossSell).length / won.length) * 100 : 0,
      up: won.length > 0 ? (won.filter(l => l.hasUpSell).length / won.length) * 100 : 0,
      post: won.length > 0 ? (won.filter(l => l.postSale).length / won.length) * 100 : 0,
      fup: funnel.orcamento > 0 ? (active.filter(l => l.followUp).length / funnel.orcamento) * 100 : 0,
      react: active.filter(l => l.reactivated).length
    };

    // --- CÁLCULO DE COMISSÃO (NÍVEL HARD) ---
    const revPerf = (totalRev / goals.revenue) * 100;
    
    // Regra 1: Escada Base por Performance de Venda
    let baseRate = 0;
    if (revPerf >= 110) baseRate = 3.5;
    else if (revPerf >= 100) baseRate = 2.5;
    else if (revPerf >= 90) baseRate = 1.5;

    // Regra 2: Aceleradores Técnicos (+0.5% cada se bater a meta específica)
    const isMarginOk = Number(commSettings.profitMargin) > 0;
    const accel_conv = (rates.total >= goals.conversion) ? 0.5 : 0;
    const accel_cross = (kpis.cross >= goals.crossSell) ? 0.5 : 0;
    const accel_up = (kpis.up >= goals.upSell) ? 0.5 : 0;

    // Regra 3: Taxa Final (Bloqueada se margem for 0 ou negativa)
    const finalRate = isMarginOk ? (baseRate + accel_conv + accel_cross + accel_up) : 0;

    // Regra 4: Bônus Operacional R$ 300 (ALL-IN: Deve bater TODAS as metas fixas)
    const bonusHabilitado = 
      funnel.contato >= goals.contacts && 
      kpis.fup >= goals.followUp && 
      kpis.post >= goals.postSale && 
      kpis.react >= goals.reactivated;

    // Resultado Financeiro Líquido
    const totalCommission = (totalRev * (finalRate / 100)) + (bonusHabilitado ? 300 : 0);

    return { 
      funnel, rates, totalRev, avgTicket, revPerf, kpis, 
      finalRate, totalCommission, bonusHabilitado, isMarginOk 
    };
  }, [leads, commSettings, goals]);

  // Detector de Inatividade (Lead parado há mais de 3 dias)
  const isStale = (date) => {
    if (!date) return false;
    return (Date.now() - new Date(date).getTime()) > (3 * 24 * 60 * 60 * 1000);
  };

  if (loading) return (
    <div className="h-screen bg-slate-900 flex flex-col items-center justify-center font-black tracking-[1em] text-blue-500 animate-pulse uppercase">
      SALESPRO: CARREGANDO INFRAESTRUTURA...
    </div>
  );

  return (
    <div className="min-h-screen bg-[#F1F5F9] p-4 md:p-10 font-sans selection:bg-blue-600 selection:text-white">
      
      {/* HEADER INTEGRAL v5.0 */}
      <header className="max-w-[1800px] mx-auto mb-10 flex flex-col xl:flex-row justify-between items-center gap-10">
        <div className="flex items-center gap-8">
          <div className="bg-slate-900 p-7 rounded-[2.5rem] shadow-2xl shadow-blue-200 group hover:rotate-6 transition-all duration-500">
            <TrendingUp className="text-blue-500" size={40} />
          </div>
          <div>
            <h1 className="text-6xl font-black tracking-tighter text-slate-900 italic leading-none">
              SALES<span className="text-blue-600">PRO</span> 
              <span className="text-[14px] not-italic text-slate-400 ml-4 font-bold border-l pl-4 border-slate-300">ENTERPRISE v5.0</span>
            </h1>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.6em] mt-2 flex items-center gap-2">
              <span className="w-2 h-2 bg-emerald-500 rounded-full animate-ping"></span> Real-Time Analytics Connected
            </p>
          </div>
        </div>

        <div className="flex flex-wrap justify-center gap-4 bg-white p-4 rounded-[4rem] shadow-xl border-2 border-white">
          <div className="flex bg-slate-100 p-2 rounded-[2.5rem] mr-4">
            {[1, 2, 3, 4].map(w => (
              <button key={w} onClick={() => setCurrentWeek(w)} className={`px-8 py-3 rounded-2xl font-black text-[11px] transition-all ${currentWeek === w ? 'bg-white text-blue-600 shadow-md scale-110' : 'text-slate-400 hover:text-slate-600'}`}>W{w}</button>
            ))}
          </div>
          <nav className="flex gap-2">
            {[
              { id: 'pipeline', label: 'Pipeline', icon: <Layers size={14}/> },
              { id: 'metrics', label: 'Indicadores', icon: <Target size={14}/> },
              { id: 'funnel', label: 'Funil', icon: <ArrowDownWideNarrow size={14}/> },
              { id: 'commission', label: 'Comissão', icon: <DollarSign size={14}/> }
            ].map(tab => (
              <button key={tab.id} onClick={() => setActiveTab(tab.id)} className={`px-10 py-5 rounded-[2rem] font-black text-[11px] uppercase transition-all flex items-center gap-4 ${activeTab === tab.id ? 'bg-slate-900 text-white shadow-2xl scale-105' : 'text-slate-500 hover:bg-slate-50'}`}>
                {tab.icon} {tab.label}
              </button>
            ))}
          </nav>
          <div className="w-px h-12 bg-slate-200 mx-4"></div>
          <button onClick={() => setIsModalOpen(true)} className="bg-blue-600 text-white p-5 rounded-full shadow-lg hover:rotate-180 transition-all duration-700 hover:scale-110 active:scale-95"><PlusCircle size={28} /></button>
        </div>
      </header>

      <main className="max-w-[1800px] mx-auto">
        
        {/* ABA: PIPELINE MASTER (DRAG AND DROP) */}
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
                  className="bg-slate-200/40 p-6 rounded-[3.5rem] min-h-[900px] border-2 border-dashed border-slate-300/30 transition-all">
                  
                  <div className="mb-8 flex justify-between items-center px-6">
                    <div>
                      <h3 className="font-black text-[12px] uppercase text-slate-800 tracking-widest">{stage.label}</h3>
                      <p className="text-[9px] text-slate-400 font-bold uppercase">{stage.desc}</p>
                    </div>
                    <span className="bg-white text-blue-600 px-4 py-2 rounded-2xl text-[11px] font-black shadow-sm border border-slate-100">{stageLeads.length}</span>
                  </div>

                  <div className="space-y-6">
                    {stageLeads.map(lead => {
                      const expired = isStale(lead.lastUpdate) && !['fechado', 'perdido'].includes(stage.id);
                      return (
                        <div key={lead.id} 
                          draggable 
                          onDragStart={(e)=>e.dataTransfer.setData("leadId", lead.id)}
                          className={`bg-white p-8 rounded-[3.5rem] shadow-sm border-2 transition-all hover:shadow-2xl hover:scale-[1.03] group relative cursor-grab active:cursor-grabbing ${expired ? 'border-rose-200 ring-8 ring-rose-50' : 'border-white'}`}>
                          
                          {expired && (
                            <div className="absolute -left-3 top-12 bg-rose-500 text-white p-3 rounded-full shadow-xl animate-bounce z-20" title=" Lead parado há 3 dias!">
                              <Clock size={16}/>
                            </div>
                          )}
                          
                          <button onClick={() => deleteLead(lead.id)} className="absolute -right-2 -top-2 bg-white text-rose-400 p-4 rounded-full shadow-xl opacity-0 group-hover:opacity-100 transition-all hover:bg-rose-600 hover:text-white z-20 border"><Trash2 size={16}/></button>

                          <div className="flex flex-wrap gap-2 mb-6">
                            {lead.tags?.split(',').filter(t=>t).map(tId => {
                              const tag = AVAILABLE_TAGS.find(at => at.id === tId);
                              return tag && <span key={tId} className={`px-4 py-1.5 rounded-full text-[8px] font-black uppercase tracking-wider ${tag.light}`}>{tag.label}</span>;
                            })}
                          </div>

                          <h4 className="font-black text-[15px] text-slate-900 uppercase mb-2 leading-tight">{lead.name}</h4>
                          <div className="text-emerald-600 font-black text-2xl mb-6 flex items-center gap-1 italic">
                            <span className="text-sm not-italic opacity-40 mr-1">R$</span> {Number(lead.value).toLocaleString()}
                          </div>
                          
                          <div className="bg-slate-50 p-6 rounded-[2rem] mb-6 border border-slate-100">
                             <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-2">
                               <FileText size={12}/> Briefing Técnico
                             </p>
                             <textarea 
                               className="w-full text-[11px] bg-transparent border-none font-medium text-slate-600 resize-none outline-none placeholder:text-slate-300"
                               placeholder="Clique para adicionar notas..."
                               rows={3}
                               value={lead.notes || ''}
                               onChange={(e) => setLeads(leads.map(l => l.id === lead.id ? {...l, notes: e.target.value} : l))}
                               onBlur={() => handleSaveLead(leads.find(l => l.id === lead.id))}
                             />
                          </div>

                          <div className="grid grid-cols-4 gap-2 mb-6 px-2">
                            {AVAILABLE_TAGS.map(tag => (
                              <button key={tag.id} onClick={()=>toggleTag(lead, tag.id)} className={`w-5 h-5 rounded-full border-2 transition-all ${lead.tags?.includes(tag.id) ? `${tag.color} border-white shadow-lg scale-125` : 'bg-slate-100 border-slate-200 hover:border-blue-400'}`} />
                            ))}
                          </div>

                          <div className="grid grid-cols-2 gap-3">
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

        {/* ABA: INDICADORES OPERACIONAIS (FAROL SEMANAL) */}
        {activeTab === 'metrics' && (
           <div className="bg-white rounded-[4rem] shadow-2xl border-4 border-white overflow-hidden animate-in slide-in-from-bottom-10">
              <div className="bg-slate-900 p-12 text-white flex justify-between items-center">
                 <div className="flex items-center gap-6">
                    <Activity className="text-blue-500" size={36}/>
                    <div>
                       <h3 className="text-3xl font-black uppercase tracking-tighter">Métricas de Performance Operacional</h3>
                       <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.4em]">Monitoramento semanal em tempo real</p>
                    </div>
                 </div>
                 <div className="bg-white/10 px-8 py-4 rounded-3xl border border-white/5 flex gap-10">
                    <div className="text-center"><p className="text-[9px] font-black opacity-40 uppercase mb-1">Total Leads</p><p className="text-2xl font-black">{leads.length}</p></div>
                    <div className="text-center"><p className="text-[9px] font-black opacity-40 uppercase mb-1">Média Mensal</p><p className="text-2xl font-black">{(leads.length / 4).toFixed(1)}</p></div>
                 </div>
              </div>
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-slate-50 text-[11px] uppercase font-black tracking-widest text-slate-400 border-b">
                    <th className="p-12">KPI Estratégico</th>
                    <th className="p-12 text-center">Meta Ciclo</th>
                    {[1, 2, 3, 4].map(w => <th key={w} className="p-12 text-center">W{w} Perf.</th>)}
                    <th className="p-12 text-center bg-blue-50 text-blue-600">Total Consolidado</th>
                  </tr>
                </thead>
                <tbody className="divide-y font-bold text-sm uppercase text-slate-600">
                  <KPIEntry title="Captação de Leads" meta={goals.contacts} total={analytics.funnel.contato} leads={leads} field="contacts" format={(v)=>v} />
                  <KPIEntry title="Taxa de Conversão" meta={goals.conversion+"%"} total={analytics.rates.total.toFixed(1)+"%"} leads={leads} field="conv" format={(v)=>v.toFixed(1)+"%"} isPercent />
                  <KPIEntry title="Aproveitamento Cross-Sell" meta={goals.crossSell+"%"} total={analytics.kpis.cross.toFixed(1)+"%"} leads={leads} field="cross" format={(v)=>v.toFixed(1)+"%"} isPercent />
                  <KPIEntry title="Taxa de Up-Sell" meta={goals.upSell+"%"} total={analytics.kpis.up.toFixed(1)+"%"} leads={leads} field="up" format={(v)=>v.toFixed(1)+"%"} isPercent />
                  <KPIEntry title="Eficiência de Follow-up" meta={goals.followUp+"%"} total={analytics.kpis.fup.toFixed(1)+"%"} leads={leads} field="fup" format={(v)=>v.toFixed(1)+"%"} isPercent />
                </tbody>
              </table>
              <div className="p-12 bg-slate-50 flex justify-end gap-4 border-t">
                 <div className="flex items-center gap-3 text-[10px] font-black text-slate-400 mr-8">LEGENDA FAROL:</div>
                 <div className="flex items-center gap-2 text-[10px] font-black uppercase"><div className="w-3 h-3 rounded-full bg-emerald-500"></div> Bateu Meta</div>
                 <div className="flex items-center gap-2 text-[10px] font-black uppercase"><div className="w-3 h-3 rounded-full bg-rose-500"></div> Abaixo da Meta</div>
              </div>
           </div>
        )}

        {/* ABA: COMISSÃO & AUDITORIA (HARD CORE) */}
        {activeTab === 'commission' && (
          <div className="space-y-12 animate-in slide-in-from-bottom-10 pb-20">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
              {/* Card de Faturamento */}
              <div className="bg-slate-900 p-20 rounded-[5rem] text-white shadow-2xl relative overflow-hidden group">
                 <DollarSign className="absolute -right-20 -top-20 opacity-5 group-hover:scale-110 transition-all duration-1000" size={500}/>
                 <p className="text-blue-500 font-black uppercase tracking-[0.5em] text-xs mb-8">Faturamento Bruto Consolidado</p>
                 <h3 className="text-[120px] font-black tracking-tighter mb-12 font-mono leading-none">R$ {analytics.totalRev.toLocaleString()}</h3>
                 <div className="flex gap-16 border-t border-white/10 pt-12">
                    <div><p className="text-[10px] font-black opacity-40 uppercase mb-2">Atingimento da Meta</p><p className="text-5xl font-black">{analytics.revPerf.toFixed(1)}%</p></div>
                    <div><p className="text-[10px] font-black opacity-40 uppercase mb-2">Ticket Médio Ciclo</p><p className="text-5xl font-black">R$ {analytics.avgTicket.toLocaleString()}</p></div>
                 </div>
              </div>

              {/* Card de Comissão Final */}
              <div className="bg-white p-20 rounded-[5rem] border-[16px] border-emerald-500 shadow-2xl text-center flex flex-col justify-center items-center relative overflow-hidden">
                 <div className="absolute top-10 right-10 bg-emerald-100 text-emerald-600 p-5 rounded-full shadow-inner"><Award size={48}/></div>
                 <p className="text-slate-400 font-black uppercase tracking-[0.4em] mb-6 text-sm">Remuneração Variável Líquida</p>
                 <h3 className="text-[120px] text-emerald-600 font-black tracking-tighter font-mono leading-none">R$ {analytics.totalCommission.toLocaleString()}</h3>
                 <div className="mt-12 flex flex-col items-center gap-6">
                    <div className="bg-emerald-600 text-white px-12 py-4 rounded-full font-black text-sm uppercase tracking-widest shadow-2xl flex items-center gap-4">
                      Taxa de Performance Aplicada: {analytics.finalRate.toFixed(2)}%
                    </div>
                    {analytics.bonusHabilitado && (
                      <div className="text-emerald-500 font-black text-xs uppercase animate-pulse border-b-2 border-emerald-500 pb-1">
                        + Bônus Operacional (R$ 300,00) Conquistado ✓
                      </div>
                    )}
                 </div>
              </div>
            </div>

            {/* PAINEL DE AUDITORIA DE REGRAS (INTEGRAL) */}
            <div className="bg-white rounded-[4rem] shadow-2xl border-4 border-white overflow-hidden">
               <div className="bg-slate-900 p-12 text-white flex justify-between items-center">
                  <div className="flex items-center gap-8">
                    <div className="bg-blue-600 p-5 rounded-3xl shadow-lg"><Gauge size={40}/></div>
                    <div>
                      <h4 className="text-3xl font-black uppercase tracking-tighter">Painel de Auditoria e Trava de Segurança</h4>
                      <p className="text-[11px] opacity-40 font-black uppercase tracking-[0.4em]">Algoritmo de Remuneração v5.0 Master</p>
                    </div>
                  </div>
                  {!analytics.isMarginOk && (
                    <div className="bg-rose-500/20 border-2 border-rose-500 text-rose-500 px-10 py-4 rounded-[2rem] font-black text-sm animate-pulse flex items-center gap-4 uppercase">
                      <Lock size={20}/> Margem de Lucro Inválida: Pagamento Travado
                    </div>
                  )}
               </div>
               
               <table className="w-full text-left">
                  <thead className="bg-slate-50 border-b">
                     <tr className="text-[11px] font-black text-slate-400 uppercase tracking-widest">
                        <th className="p-12">Métrica para Comissão</th>
                        <th className="p-12">Regra Operacional Aplicada</th>
                        <th className="p-12 text-center">Meta Ciclo</th>
                        <th className="p-12 text-center">Realizado</th>
                        <th className="p-12 text-center">Veredito</th>
                     </tr>
                  </thead>
                  <tbody className="divide-y font-bold text-sm uppercase text-slate-700">
                     <IndicatorRow label="Escada Performance" rule={`Alíquota Base: ${analytics.revPerf >= 90 ? 'ATIVADA' : 'ZERA (Abaixo de 90%)'}`} meta="90/100/110%" real={analytics.revPerf.toFixed(1)+"%"} ok={analytics.revPerf >= 90} />
                     <IndicatorRow label="Taxa de Conversão" rule="Acelerador: ≥ Meta → +0,5% na Taxa Final" meta={goals.conversion+"%"} real={analytics.rates.total.toFixed(1)+"%"} ok={analytics.rates.total >= goals.conversion} />
                     <IndicatorRow label="Frequência Cross Sell" rule="Acelerador: ≥ 40% das vendas → +0,5% na Taxa" meta={goals.crossSell+"%"} real={analytics.kpis.cross.toFixed(1)+"%"} ok={analytics.kpis.cross >= goals.crossSell} />
                     <IndicatorRow label="Frequência Up Sell" rule="Acelerador: ≥ 15% das vendas → +0,5% na Taxa" meta={goals.upSell+"%"} real={analytics.kpis.up.toFixed(1)+"%"} ok={analytics.kpis.up >= goals.upSell} />
                     <IndicatorRow label="Volume de Atendimento" rule="Bônus Fixo: Parte do pacote de R$ 300" meta={goals.contacts} real={analytics.funnel.contato} ok={analytics.funnel.contato >= goals.contacts} />
                     <IndicatorRow label="Qualidade Pós-Venda" rule="Bônus Fixo: Cobertura de 100% das vendas" meta={goals.postSale+"%"} real={analytics.kpis.post.toFixed(1)+"%"} ok={analytics.kpis.post >= goals.postSale} />
                     <IndicatorRow label="Recuperação Clientes" rule="Bônus Fixo: ≥ 8 Clientes Reativados" meta={goals.reactivated} real={analytics.kpis.react} ok={analytics.kpis.react >= goals.reactivated} />
                  </tbody>
               </table>

               <div className="p-16 bg-slate-50 border-t flex flex-wrap gap-12 items-center justify-between">
                  <div className="flex flex-wrap gap-8">
                     <div className="space-y-3">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4">Margem de Lucro Bruta %</label>
                        <input type="number" className="w-52 p-6 border-4 border-white rounded-[2.5rem] font-black bg-white shadow-xl outline-none focus:border-blue-500 transition-all text-xl" value={commSettings.profitMargin} onChange={e => setCommSettings({...commSettings, profitMargin: e.target.value})} />
                     </div>
                     <div className="space-y-3">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4">Meta Faturamento (R$)</label>
                        <input type="number" className="w-64 p-6 border-4 border-white rounded-[2.5rem] font-black bg-white shadow-xl outline-none focus:border-blue-500 transition-all text-xl" value={goals.revenue} onChange={e => setGoals({...goals, revenue: e.target.value})} />
                     </div>
                  </div>
                  <div className="flex gap-4">
                    {[1, 2, 3, 4].map(w => (
                       <div key={w} className="space-y-2">
                          <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-4 text-center block">Semana {w}</label>
                          <input type="number" className="w-40 p-5 border-2 rounded-[2rem] font-black bg-white focus:border-blue-500 outline-none text-center" value={commSettings.weeks[w].revenue} onChange={e => setCommSettings({...commSettings, weeks: {...commSettings.weeks, [w]: {...commSettings.weeks[w], revenue: e.target.value}}})} />
                       </div>
                    ))}
                  </div>
               </div>
            </div>
          </div>
        )}

        {/* ABA: FUNIL E FLUXO (VISUAL) */}
        {activeTab === 'funnel' && (
          <div className="bg-white p-24 rounded-[5rem] shadow-2xl border animate-in zoom-in duration-500">
             <div className="flex items-center gap-8 mb-24">
                <div className="bg-blue-600 p-8 rounded-[3rem] text-white shadow-2xl rotate-12"><PieChart size={56}/></div>
                <div>
                   <h3 className="text-6xl font-black tracking-tighter uppercase">Health Check: Funil Comercial</h3>
                   <p className="text-sm font-black text-slate-400 uppercase tracking-[0.5em]">Análise de gargalos e taxas de conversão</p>
                </div>
             </div>
             <div className="max-w-6xl mx-auto space-y-12">
                <FunnelStep label="Lead Captado (Top)" count={analytics.funnel.contato} percent={100} color="bg-slate-300" />
                <FunnelRate value={analytics.rates.c2o} label="Qualificação p/ Orçamento" />
                <FunnelStep label="Apresentação Técnica" count={analytics.funnel.orcamento} percent={analytics.rates.c2o} color="bg-blue-500" />
                <FunnelRate value={analytics.rates.n2f} label="Eficiência de Fechamento" />
                <FunnelStep label="Conversão em Venda" count={analytics.funnel.fechado} percent={analytics.rates.total} color="bg-emerald-600" />
                <div className="pt-20 grid grid-cols-3 gap-10">
                   <div className="bg-slate-50 p-12 rounded-[4rem] text-center border-2 border-white shadow-inner">
                      <p className="text-[10px] font-black text-slate-400 uppercase mb-4 tracking-widest">Leads Descartados</p>
                      <h5 className="text-6xl font-black text-rose-500">{analytics.funnel.perdido}</h5>
                   </div>
                   <div className="bg-slate-50 p-12 rounded-[4rem] text-center border-2 border-white shadow-inner">
                      <p className="text-[10px] font-black text-slate-400 uppercase mb-4 tracking-widest">Leads em Aberto</p>
                      <h5 className="text-6xl font-black text-blue-600">{analytics.funnel.contato - analytics.funnel.fechado - analytics.funnel.perdido}</h5>
                   </div>
                   <div className="bg-slate-50 p-12 rounded-[4rem] text-center border-2 border-white shadow-inner">
                      <p className="text-[10px] font-black text-slate-400 uppercase mb-4 tracking-widest">Churn Comercial</p>
                      <h5 className="text-6xl font-black text-slate-400">{ (analytics.funnel.perdido / analytics.funnel.contato * 100).toFixed(1) || 0 }%</h5>
                   </div>
                </div>
             </div>
          </div>
        )}
      </main>

      {/* MODAL DE CADASTRO MASTER v5.0 */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/95 backdrop-blur-2xl flex items-center justify-center p-6 z-[1000] animate-in fade-in duration-300">
          <div className="bg-white rounded-[6rem] p-24 max-w-4xl w-full shadow-2xl border-t-[24px] border-blue-600 animate-in zoom-in-95 duration-500 relative">
            <button onClick={()=>setIsModalOpen(false)} className="absolute top-12 right-12 text-slate-300 hover:text-rose-500 transition-colors"><X size={48}/></button>
            
            <div className="mb-20">
              <h2 className="text-6xl font-black uppercase italic tracking-tighter text-slate-900">Nova Oportunidade</h2>
              <p className="text-xs font-black text-slate-400 uppercase tracking-[0.5em] mt-2">Ativação de card no pipeline de vendas</p>
            </div>

            <div className="space-y-12">
              <div className="space-y-4">
                <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-8 flex items-center gap-2"><User size={14}/> Nome da Empresa / Lead Principal</label>
                <input className="w-full p-10 rounded-[4rem] bg-slate-50 border-4 border-transparent focus:border-blue-500 font-black outline-none transition-all text-2xl shadow-inner placeholder:text-slate-200" value={newLead.name} onChange={e=>setNewLead({...newLead, name: e.target.value})} placeholder="Ex: BlueChip Technologies Inc." />
              </div>
              
              <div className="grid grid-cols-2 gap-12">
                <div className="space-y-4">
                  <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-8 flex items-center gap-2"><DollarSign size={14}/> Estimativa de Contrato (R$)</label>
                  <input type="number" className="w-full p-10 rounded-[4rem] bg-slate-50 border-4 border-transparent focus:border-blue-500 font-black outline-none text-2xl shadow-inner" value={newLead.value} onChange={e=>setNewLead({...newLead, value: e.target.value})} placeholder="0.00" />
                </div>
                <div className="space-y-4 flex flex-col justify-end">
                   <button 
                     onClick={()=>setNewLead({...newLead, reactivated: !newLead.reactivated})} 
                     className={`w-full p-10 rounded-[4rem] font-black uppercase text-sm border-4 transition-all flex items-center justify-center gap-4 ${newLead.reactivated ? 'bg-emerald-500 border-emerald-500 text-white shadow-2xl scale-105' : 'bg-slate-50 border-transparent text-slate-400'}`}>
                     {newLead.reactivated ? <CheckCircle2 size={24}/> : <RotateCcw size={24}/>}
                     {newLead.reactivated ? 'Cliente Reativado ✓' : 'É uma Reativação?'}
                   </button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-8 pt-8 border-t border-slate-100">
                 <LeadToggle label="Follow-up Requerido" active={newLead.followUp} onClick={()=>setNewLead({...newLead, followUp: !newLead.followUp})} />
                 <LeadToggle label="Pós-venda Planejado" active={newLead.postSale} onClick={()=>setNewLead({...newLead, postSale: !newLead.postSale})} />
              </div>

              <button 
                disabled={isSaving || !newLead.name}
                onClick={async ()=>{
                  await handleSaveLead({...newLead, week: currentWeek, isArchived: false, tags: ''});
                  setIsModalOpen(false);
                  setNewLead({name: '', value: '', vendor: 'Vendedor 1', notes: '', stage: 'contato', tags: '', followUp: false, postSale: false, hasCrossSell: false, hasUpSell: false, reactivated: false});
                }} 
                className="w-full bg-blue-600 text-white p-12 rounded-[5rem] font-black uppercase tracking-[0.5em] text-2xl shadow-2xl hover:scale-105 active:scale-95 transition-all flex items-center justify-center gap-8 mt-10 group"
              >
                {isSaving ? 'SINCRONIZANDO...' : 'ATIVAR ESTRATÉGIA'} <ArrowRight size={40} className="group-hover:translate-x-4 transition-transform"/>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// --- COMPONENTES AUXILIARES DE ALTA DENSIDADE ---

const QuickAction = ({ label, active, color, onClick }) => (
  <button onClick={onClick} className={`p-5 rounded-[2rem] border-2 text-[9px] font-black uppercase transition-all flex items-center justify-center ${active ? `${color} text-white border-transparent shadow-lg scale-105` : 'bg-white text-slate-300 border-slate-100 hover:border-slate-300'}`}>{label}</button>
);

const LeadToggle = ({ label, active, onClick }) => (
  <button onClick={onClick} className={`flex items-center justify-between p-8 rounded-[3rem] border-4 transition-all ${active ? 'bg-blue-50 border-blue-500 text-blue-600' : 'bg-slate-50 border-transparent text-slate-400'}`}>
     <span className="font-black text-[11px] uppercase tracking-widest">{label}</span>
     <div className={`w-10 h-10 rounded-full flex items-center justify-center ${active ? 'bg-blue-500 text-white' : 'bg-slate-200 text-slate-400'}`}>
        {active ? <Check size={20}/> : <X size={20}/>}
     </div>
  </button>
);

const IndicatorRow = ({ label, rule, meta, real, ok }) => (
  <tr className={`group transition-all ${!ok ? 'bg-rose-50/20' : 'hover:bg-slate-50'}`}>
    <td className="p-12 font-black text-slate-900 text-base">{label}</td>
    <td className="p-12 text-slate-400 italic text-[11px] normal-case font-medium">{rule}</td>
    <td className="p-12 text-center font-black text-slate-400 text-base">{meta}</td>
    <td className="p-12 text-center font-black text-blue-600 text-xl">{real}</td>
    <td className="p-12 text-center">
       <div className={`inline-flex items-center gap-4 px-10 py-3 rounded-full font-black text-[10px] shadow-sm ${ok ? 'bg-emerald-100 text-emerald-600' : 'bg-rose-100 text-rose-600'}`}>
          <div className={`w-3 h-3 rounded-full ${ok ? 'bg-emerald-500' : 'bg-rose-500 animate-pulse'}`}></div>
          {ok ? 'CUMPRIDO ✓' : 'EM DÉBITO'}
       </div>
    </td>
  </tr>
);

const KPIEntry = ({ title, meta, total, leads, field, format, isPercent }) => {
  const getWeeklyVal = (w) => {
    const f = leads.filter(l => !l.isArchived && Number(l.week || 1) === w);
    const won = f.filter(l => l.stage === 'fechado');
    if (field === 'contacts') return f.length;
    if (field === 'conv') return f.length > 0 ? (won.length / f.length) * 100 : 0;
    if (field === 'cross') return won.length > 0 ? (won.filter(l => l.hasCrossSell).length / won.length) * 100 : 0;
    if (field === 'up') return won.length > 0 ? (won.filter(l => l.hasUpSell).length / won.length) * 100 : 0;
    if (field === 'fup') return f.length > 0 ? (f.filter(l => l.followUp).length / f.length) * 100 : 0;
    return 0;
  };

  const getFarol = (val) => {
    const target = isPercent ? parseFloat(meta) : parseFloat(meta) / 4;
    return val >= target ? 'bg-emerald-500' : 'bg-rose-500';
  };

  return (
    <tr className="hover:bg-slate-50/50 transition-colors">
      <td className="p-12 font-black text-slate-800 text-base">{title}</td>
      <td className="p-12 text-center text-slate-300 italic font-medium">Meta: {meta}</td>
      {[1, 2, 3, 4].map(w => {
        const val = getWeeklyVal(w);
        return (
          <td key={w} className="p-12 text-center">
            <div className="flex flex-col items-center gap-3">
              <div className={`w-6 h-6 rounded-full ${getFarol(val)} shadow-xl shadow-inner ring-4 ring-white transition-transform hover:scale-125`} />
              <span className="text-[11px] text-slate-400 font-black">{format(val)}</span>
            </div>
          </td>
        );
      })}
      <td className="p-12 text-center bg-blue-50/40 border-l border-white shadow-inner">
        <span className="text-2xl font-black text-blue-900 drop-shadow-sm">{total}</span>
      </td>
    </tr>
  );
};

const FunnelStep = ({ label, count, percent, color }) => (
  <div className="flex items-center gap-10">
    <div className={`h-28 ${color} rounded-[4rem] flex items-center justify-between px-16 text-white shadow-2xl transition-all hover:translate-x-4 duration-500`} style={{ width: `${Math.max(percent, 35)}%` }}>
      <span className="font-black uppercase tracking-[0.3em] text-sm">{label}</span>
      <div className="flex flex-col items-end">
        <span className="font-black text-5xl font-mono leading-none">{count}</span>
        <span className="text-[10px] opacity-60 font-black uppercase mt-1">leads ativos</span>
      </div>
    </div>
    <div className="text-slate-200 font-black text-4xl italic">{percent.toFixed(0)}%</div>
  </div>
);

const FunnelRate = ({ value, label }) => (
  <div className="flex flex-col items-center py-6 border-l-8 border-dotted border-slate-100 ml-28">
    <div className="bg-white border-4 border-slate-50 px-10 py-4 rounded-[2rem] shadow-xl flex items-center gap-4">
       <TrendingUp className="text-blue-500" size={20}/>
       <span className="text-slate-800 font-black text-xs uppercase tracking-[0.2em]">{label}: <span className="text-blue-600 ml-2 text-lg">{value.toFixed(1)}%</span></span>
    </div>
  </div>
);
