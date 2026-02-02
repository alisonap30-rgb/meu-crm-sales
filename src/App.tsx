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
  Globe, LayoutDashboard, ListChecks, ArrowRightCircle, Scale, Coins,
  Flame, Rocket, Trophy, Star, Lightbulb, MessageSquare, BriefcaseIcon,
  Crown, Fingerprint, Key, ShieldAlert, ZapOff, TrendingDown, MousePointerSquare,
  FileSpreadsheet, ClipboardCheck, History, Laptop, Zap as ZapIcon
} from 'lucide-react';

// =============================================================================
// --- CONFIGURAÇÕES DE AMBIENTE E NEGÓCIO ---
// =============================================================================

const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL || "",
  import.meta.env.VITE_SUPABASE_ANON_KEY || ""
);

const STAGES = [
  { id: 'contato', label: 'Prospecção', color: 'bg-slate-400', border: 'border-slate-400', accent: 'text-slate-500' },
  { id: 'orcamento', label: 'Orçamento', color: 'bg-blue-500', border: 'border-blue-500', accent: 'text-blue-500' },
  { id: 'negociacao', label: 'Negociação', color: 'bg-amber-500', border: 'border-amber-500', accent: 'text-amber-500' },
  { id: 'fechado', label: 'Fechado', color: 'bg-emerald-500', border: 'border-emerald-500', accent: 'text-emerald-500' },
  { id: 'perdido', label: 'Perdido', color: 'bg-rose-500', border: 'border-rose-500', accent: 'text-rose-500' }
] as const;

const AVAILABLE_TAGS = [
  { id: 'proposta', label: 'PROPOSTA ENVIADA', color: 'bg-blue-600', light: 'bg-blue-50' },
  { id: 'followup', label: 'AGUARDANDO RETORNO', color: 'bg-amber-600', light: 'bg-amber-50' },
  { id: 'urgente', label: 'PRIORIDADE ALTA', color: 'bg-red-600', light: 'bg-red-50' },
  { id: 'reuniao', label: 'REUNIÃO AGENDADA', color: 'bg-emerald-600', light: 'bg-emerald-50' }
];

// =============================================================================
// --- COMPONENTE PRINCIPAL: ULTRA CRM ENTERPRISE ---
// =============================================================================

export default function UltraCRMEnterprise() {
  // --- ESTADOS DE PERSISTÊNCIA ---
  const [leads, setLeads] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [activeTab, setActiveTab] = useState('pipeline');
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [draggedItem, setDraggedItem] = useState<string | null>(null);

  // --- ESTADOS DE METAS E COMISSIONAMENTO (EDITÁVEIS) ---
  const [goals, setGoals] = useState({
    revenue: 100000,     // Meta de Faturamento Mensal [cite: 635]
    ticket: 5000,        // Meta de Ticket Médio [cite: 636]
    contacts: 400,       // Meta de Contatos/Mês [cite: 637]
    reactivated: 8,      // Meta de Clientes Reativados [cite: 638]
  });

  const [commSettings, setCommSettings] = useState({
    weeks: { 1: 0, 2: 0, 3: 0, 4: 0 }, [cite: 641]
    profitMargin: 15,    // Margem de Lucro (Regra de Ouro) [cite: 642]
    taxRate: 6           // Imposto sobre Nota [cite: 643]
  });

  // =============================================================================
  // --- OPERAÇÕES DE BANCO DE DADOS ---
  // =============================================================================

  const fetchLeads = useCallback(async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('leads')
        .select('*')
        .order('lastUpdate', { ascending: false }); [cite: 651, 654]

      if (error) throw error;
      setLeads(data || []);
    } catch (err) {
      console.error("Erro crítico de sincronização:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchLeads(); }, [fetchLeads]);

  const updateLead = async (id: string, updates: any) => {
    const payload = { ...updates, lastUpdate: new Date().toISOString() }; [cite: 665]
    setLeads(prev => prev.map(l => l.id === id ? { ...l, ...payload } : l));
    const { error } = await supabase.from('leads').update(payload).eq('id', id); [cite: 667]
    if (error) console.error("Falha no update remoto:", error);
  };

  const toggleTag = (lead: any, tagId: string) => {
    const current = lead.tags ? lead.tags.split(',').filter((t: string) => t !== "") : [];
    const updated = current.includes(tagId) ? current.filter((t: string) => t !== tagId) : [...current, tagId]; [cite: 672]
    updateLead(lead.id, { tags: updated.join(',') });
  };

  // =============================================================================
  // --- MOTOR DE CÁLCULO E AUDITORIA (LOGIC CORE) ---
  // =============================================================================

  const brain = useMemo(() => {
    const activeLeads = leads.filter(l => !l.isArchived);
    const wonLeads = activeLeads.filter(l => l.stage === 'fechado');
    const totalRevReal = Object.values(commSettings.weeks).reduce((a, b) => a + Number(b), 0); [cite: 681]
    const revPerf = (totalRevReal / goals.revenue) * 100; [cite: 682]

    const kpis = {
      revenue: totalRevReal,
      count: activeLeads.length,
      wonCount: wonLeads.length,
      tm: wonLeads.length > 0 ? (wonLeads.reduce((acc, curr) => acc + (Number(curr.value) || 0), 0) / wonLeads.length) : 0, [cite: 688]
      conv: activeLeads.length > 0 ? (wonLeads.length / activeLeads.length) * 100 : 0,
      cross: wonLeads.length > 0 ? (wonLeads.filter(l => l.hasCrossSell).length / wonLeads.length) * 100 : 0,
      up: wonLeads.length > 0 ? (wonLeads.filter(l => l.hasUpSell).length / wonLeads.length) * 100 : 0,
      fup: activeLeads.filter(l => ['orcamento', 'negociacao', 'fechado'].includes(l.stage)).length > 0
        ? (activeLeads.filter(l => l.followUp).length / activeLeads.filter(l => ['orcamento', 'negociacao', 'fechado'].includes(l.stage)).length) * 100 : 0, [cite: 693]
      post: wonLeads.length > 0 ? (wonLeads.filter(l => l.postSale).length / wonLeads.length) * 100 : 0,
      react: activeLeads.filter(l => l.reactivated).length
    };

    const isMarginOk = commSettings.profitMargin > 0; [cite: 698]

    let baseRate = 0;
    if (revPerf >= 110) baseRate = 3.5;
    else if (revPerf >= 100) baseRate = 2.5;
    else if (revPerf >= 90) baseRate = 1.5; [cite: 701, 703]

    const accel = {
      ticket: (isMarginOk && kpis.tm >= goals.ticket) ? 0.5 : 0,
      conv: (isMarginOk && kpis.conv >= 5) ? 0.5 : 0,
      cross: (isMarginOk && kpis.cross >= 40) ? 0.5 : 0,
      up: (isMarginOk && kpis.up >= 15) ? 0.5 : 0 [cite: 706, 709]
    };

    const finalRate = isMarginOk ? (baseRate + accel.ticket + accel.conv + accel.cross + accel.up) : 0; [cite: 711]

    const combo = {
      contacts: kpis.count >= goals.contacts,
      fup: kpis.fup >= 90,
      post: kpis.post >= 100,
      react: kpis.react >= goals.reactivated [cite: 714, 717]
    };

    const qualifiesBonus300 = isMarginOk && combo.contacts && combo.fup && combo.post && combo.react; [cite: 719]
    const bonus300Value = qualifiesBonus300 ? 300 : 0;
    const finalCommission = (totalRevReal * (finalRate / 100)) + bonus300Value; [cite: 721]

    return { kpis, finalRate, finalCommission, isMarginOk, combo, bonus300Value, revPerf, accel };
  }, [leads, goals, commSettings]);

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex overflow-hidden font-sans text-slate-900">
      
      {/* SIDEBAR DE ALTA DENSIDADE */}
      <aside className={`bg-slate-950 text-white transition-all duration-700 ease-[cubic-bezier(0.23,1,0.32,1)] flex flex-col z-[100] border-r border-white/5 ${sidebarOpen ? 'w-[360px]' : 'w-[100px]'}`}>
        <div className="p-10 flex items-center gap-6 border-b border-white/5">
          <div className="bg-gradient-to-br from-blue-600 to-indigo-700 p-4 rounded-3xl shadow-2xl shadow-blue-500/20">
            <ZapIcon size={28} className="fill-white"/>
          </div>
          {sidebarOpen && (
            <div className="animate-in fade-in slide-in-from-left-4 duration-1000">
              <h1 className="text-2xl font-black italic uppercase tracking-tighter leading-none">Ultra<span className="text-blue-500">Sales</span></h1>
              <p className="text-[9px] font-black text-slate-500 tracking-[0.3em] uppercase mt-1 text-nowrap">Enterprise Sales Engine</p>
            </div>
          )}
        </div>
        
        <nav className="p-6 flex-1 space-y-3 overflow-y-auto custom-scrollbar">
          <SidebarLink icon={<LayoutDashboard/>} label="Pipeline Estratégico" active={activeTab === 'pipeline'} onClick={() => setActiveTab('pipeline')} open={sidebarOpen} />
          <SidebarLink icon={<Coins/>} label="Painel de Comissão" active={activeTab === 'commission'} onClick={() => setActiveTab('commission')} open={sidebarOpen} />
          <SidebarLink icon={<PieChart/>} label="Métricas & KPIs" active={activeTab === 'metrics'} onClick={() => setActiveTab('metrics')} open={sidebarOpen} />

          {sidebarOpen && (
            <div className="mt-16 pt-10 border-t border-white/5 space-y-12 animate-in fade-in duration-1000">
              <section>
                <label className="text-[10px] font-black text-blue-500 uppercase tracking-[0.3em] mb-8 block">Configuração de Metas</label>
                <div className="space-y-6">
                  <MetaInput label="Faturamento Mensal (R$)" value={goals.revenue} onChange={(v:any) => setGoals({...goals, revenue: v})} />
                  <MetaInput label="Ticket Médio Alvo (R$)" value={goals.ticket} onChange={(v:any) => setGoals({...goals, ticket: v})} />
                  <MetaInput label="Contatos Exigidos" value={goals.contacts} onChange={(v:any) => setGoals({...goals, contacts: v})} />
                  <MetaInput label="Clientes Reativados" value={goals.reactivated} onChange={(v:any) => setGoals({...goals, reactivated: v})} />
                </div>
              </section>
              <section className="bg-slate-900/50 p-6 rounded-[2.5rem] border border-white/5">
                <MetaInput label="Margem de Lucro (%)" value={commSettings.profitMargin} onChange={(v:any) => setCommSettings({...commSettings, profitMargin: v})} isHighlight />
              </section>
            </div>
          )}
        </nav>
        
        <button onClick={() => setSidebarOpen(!sidebarOpen)} className="p-10 flex justify-center hover:bg-white/5 transition-all text-slate-500">
          <ArrowDownWideNarrow className={sidebarOpen ? "rotate-90" : "-rotate-90"} />
        </button>
      </aside>

      {/* ÁREA PRINCIPAL DE CONTEÚDO */}
      <main className="flex-1 flex flex-col overflow-hidden relative">
        
        {/* HEADER DE COMANDO */}
        <header className="h-28 bg-white/80 backdrop-blur-xl border-b border-slate-200 flex items-center justify-between px-12 z-50">
          <div className="flex items-center gap-12">
            <div className="relative group">
              <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-300" size={20}/>
              <input
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                placeholder="Pesquisar leads ou tags..."
                className="pl-14 pr-8 py-4 bg-slate-100/50 border-2 border-transparent focus:border-blue-500/20 focus:bg-white rounded-3xl outline-none w-[400px] font-bold text-slate-600 transition-all"
              />
            </div>
            
            <div className="hidden xl:flex items-center gap-6 p-4 bg-slate-50 rounded-3xl border border-slate-100">
              {AVAILABLE_TAGS.map(tag => (
                <div key={tag.id} className="flex items-center gap-3">
                  <div className={`w-3.5 h-3.5 rounded-full ${tag.color} shadow-sm`}></div>
                  <span className="text-[10px] font-black uppercase text-slate-500 whitespace-nowrap">{tag.label}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-8">
            <div className="text-right">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Performance</p>
              <p className={`text-xl font-black italic ${brain.revPerf >= 100 ? 'text-emerald-500' : 'text-slate-900'}`}>{brain.revPerf.toFixed(1)}%</p>
            </div>
            <button onClick={() => setIsModalOpen(true)} className="bg-slate-950 text-white px-10 py-5 rounded-[1.8rem] font-black uppercase text-xs tracking-widest hover:bg-blue-600 hover:shadow-2xl hover:shadow-blue-500/40 transition-all flex items-center gap-3 active:scale-95">
              <PlusCircle size={20}/> Adicionar Oportunidade
            </button>
          </div>
        </header>

        {/* VIEWPORT DINÂMICO */}
        <div className="flex-1 overflow-auto p-12 bg-[#F8FAFC] custom-scrollbar">
          
          {/* ABA: PIPELINE */}
          {activeTab === 'pipeline' && (
            <div className="flex gap-10 h-full min-w-[1800px] animate-in fade-in slide-in-from-bottom-4 duration-700">
              {STAGES.map(stage => {
                const stageLeads = leads.filter(l => l.stage === stage.id && l.name.toLowerCase().includes(searchTerm.toLowerCase()));
                const stageTotal = stageLeads.reduce((acc, curr) => acc + (Number(curr.value) || 0), 0);

                return (
                  <div
                    key={stage.id}
                    onDragOver={e => e.preventDefault()}
                    onDrop={e => {
                      const id = e.dataTransfer.getData("leadId");
                      updateLead(id, { stage: stage.id });
                      setDraggedItem(null);
                    }}
                    className={`w-[360px] flex flex-col bg-slate-200/30 rounded-[3.5rem] p-7 border-2 border-dashed transition-all duration-500 ${draggedItem ? 'border-blue-500/20 bg-blue-50/20' : 'border-transparent'}`}
                  >
                    <div className="mb-10 px-4 flex justify-between items-end">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <span className={`w-3 h-3 rounded-full ${stage.color}`}></span>
                          <span className="font-black uppercase text-slate-400 text-[10px] tracking-[0.2em]">{stage.label}</span>
                        </div>
                        <h3 className="text-3xl font-black italic text-slate-900 tracking-tighter">R$ {stageTotal.toLocaleString('pt-BR')}</h3>
                      </div>
                      <span className="bg-white px-4 py-1.5 rounded-full text-[11px] font-black text-slate-400 shadow-sm border border-slate-100">{stageLeads.length}</span>
                    </div>

                    <div className="space-y-6 overflow-y-auto pr-2 custom-scrollbar flex-1 pb-10">
                      {stageLeads.map(lead => (
                        <div
                          key={lead.id}
                          draggable
                          onDragStart={e => {
                            e.dataTransfer.setData("leadId", lead.id);
                            setDraggedItem(lead.id);
                          }}
                          className="bg-white p-8 rounded-[3.2rem] shadow-sm border-2 border-transparent hover:border-blue-500 transition-all cursor-grab active:cursor-grabbing group relative overflow-hidden"
                        >
                          <div className="flex justify-between gap-1 mb-6 p-2 bg-slate-50 rounded-full border border-slate-100">
                            {AVAILABLE_TAGS.map(tag => (
                              <button
                                key={tag.id}
                                onClick={() => toggleTag(lead, tag.id)}
                                title={tag.label}
                                className={`w-6 h-6 rounded-full border-2 transition-all ${lead.tags?.includes(tag.id) ? `${tag.color} border-white shadow-md scale-110` : 'bg-white border-slate-200 hover:border-slate-400'}`}
                              />
                            ))}
                          </div>
                          <div className="space-y-1 mb-6">
                            <input
                              className="font-black text-slate-950 uppercase text-sm bg-transparent border-none w-full outline-none focus:text-blue-600 transition-colors"
                              value={lead.name}
                              onChange={e => updateLead(lead.id, { name: e.target.value.toUpperCase() })}
                            />
                            <div className="flex items-center text-emerald-600 font-black">
                              <span className="text-xs mr-1 font-bold">R$</span>
                              <input
                                type="number"
                                className="bg-transparent border-none font-black italic text-2xl w-full outline-none focus:ring-0"
                                value={lead.value}
                                onChange={e => updateLead(lead.id, { value: Number(e.target.value) })}
                              />
                            </div>
                          </div>
                          <div className="grid grid-cols-2 gap-2.5">
                             <CardAction active={lead.followUp} label="FOLLOW-UP" onClick={() => updateLead(lead.id, { followUp: !lead.followUp })} color="bg-amber-400" />
                             <CardAction active={lead.hasUpSell} label="UP-SELL" onClick={() => updateLead(lead.id, { hasUpSell: !lead.hasUpSell })} color="bg-purple-400" />
                             <CardAction active={lead.hasCrossSell} label="CROSS-SELL" onClick={() => updateLead(lead.id, { hasCrossSell: !lead.hasCrossSell })} color="bg-sky-400" />
                             <CardAction active={lead.reactivated} label="REATIVADO" onClick={() => updateLead(lead.id, { reactivated: !lead.reactivated })} color="bg-emerald-400" />
                             <CardAction active={lead.postSale} label="PÓS-VENDA 100%" onClick={() => updateLead(lead.id, { postSale: !lead.postSale })} color="bg-indigo-500" full />
                          </div>
                          <div className="absolute top-6 right-8 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button onClick={() => updateLead(lead.id, { isArchived: true })} className="text-slate-200 hover:text-rose-500 transition-colors"><Trash2 size={16}/></button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* ABA: COMISSÃO */}
          {activeTab === 'commission' && (
            <div className="max-w-[1400px] mx-auto space-y-12 animate-in slide-in-from-bottom-10 duration-1000">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
                <div className="lg:col-span-2 space-y-12">
                  <div className={`p-20 rounded-[5rem] text-white shadow-2xl relative overflow-hidden transition-all duration-1000 ${brain.isMarginOk ? 'bg-slate-950' : 'bg-rose-950'}`}>
                    <div className="absolute top-0 right-0 p-24 opacity-5 -rotate-12"><Scale size={400}/></div>
                    <p className="text-blue-500 font-black uppercase tracking-[0.5em] text-[11px] mb-8 flex items-center gap-4"><ShieldCheck size={20}/> Auditoria de Remuneração Variável V4.2</p>
                    <h2 className="text-[12rem] font-black italic tracking-tighter leading-none mb-12 drop-shadow-2xl">R$ {brain.finalCommission.toLocaleString('pt-BR')}</h2>
                    {!brain.isMarginOk && (
                      <div className="bg-white/5 p-10 rounded-[3rem] border border-rose-500/30 text-rose-500 font-black uppercase text-[11px] mb-12 animate-pulse flex items-center gap-6 leading-relaxed">
                        <ZapOff size={40}/>
                        <div>BLOQUEIO DE SEGURANÇA ATIVO: A margem de lucro informada ({commSettings.profitMargin}%) é insuficiente. Ajuste a margem na sidebar para liberar.</div>
                      </div>
                    )}
                    <div className="grid grid-cols-4 gap-12 pt-16 border-t border-white/10">
                      <AuditItem label="Alíquota Final" value={`${brain.finalRate.toFixed(2)}%`} />
                      <AuditItem label="Bônus Fixo" value={`R$ ${brain.bonus300Value}`} />
                      <AuditItem label="Base Calculada" value={`R$ ${brain.kpis.revenue.toLocaleString('pt-BR')}`} />
                      <AuditItem label="Meta Realizada" value={`${brain.revPerf.toFixed(0)}%`} isBlue />
                    </div>
                  </div>

                  <div className="bg-white p-16 rounded-[5rem] shadow-sm border border-slate-100">
                    <div className="flex justify-between items-center mb-16">
                      <h3 className="text-3xl font-black italic uppercase tracking-tighter flex items-center gap-5"><Rocket className="text-blue-600" size={32}/> Aceleradores de Percentual</h3>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                      <BonusRuleCard status={brain.accel.ticket > 0} label="Ticket Médio" target={`R$ ${goals.ticket.toLocaleString()}`} current={`R$ ${brain.kpis.tm.toFixed(0)}`} />
                      <BonusRuleCard status={brain.accel.conv > 0} label="Taxa Conversão" target="5.0%" current={`${brain.kpis.conv.toFixed(1)}%`} />
                      <BonusRuleCard status={brain.accel.cross > 0} label="Mix Cross-Sell" target="40.0%" current={`${brain.kpis.cross.toFixed(1)}%`} />
                      <BonusRuleCard status={brain.accel.up > 0} label="Mix Up-Sell" target="15.0%" current={`${brain.kpis.up.toFixed(1)}%`} />
                    </div>
                    <div className="mt-16 bg-slate-900 rounded-[4rem] p-16 text-white relative overflow-hidden group">
                      <h4 className="text-2xl font-black italic text-blue-400 uppercase mb-4 tracking-tighter">Bônus de Qualidade Operacional (R$ 300,00)</h4>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
                        <ComboStatBox active={brain.combo.contacts} label="Contatos" val={`${brain.kpis.count}/${goals.contacts}`} />
                        <ComboStatBox active={brain.combo.fup} label="Follow-up" val={`${brain.kpis.fup.toFixed(0)}%/90%`} />
                        <ComboStatBox active={brain.combo.post} label="Pós-Venda" val={`${brain.kpis.post.toFixed(0)}%/100%`} />
                        <ComboStatBox active={brain.combo.react} label="Reativados" val={`${brain.kpis.react}/${goals.reactivated}`} />
                      </div>
                    </div>
                  </div>
                </div>

                <aside className="space-y-12">
                  <div className="bg-slate-950 p-12 rounded-[4.5rem] text-white shadow-2xl">
                    <p className="text-[10px] font-black text-blue-500 uppercase tracking-[0.4em] mb-12 text-center">Faturamento Semanal (R$)</p>
                    <div className="space-y-12">
                      {[1, 2, 3, 4].map(w => (
                        <div key={w} className="group text-center">
                          <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-4 block">Volume Semana {w}</label>
                          <input
                            type="number"
                            value={commSettings.weeks[w as keyof typeof commSettings.weeks]}
                            onChange={e => setCommSettings({...commSettings, weeks: {...commSettings.weeks, [w]: e.target.value}})}
                            className="bg-transparent border-b-2 border-white/10 w-full text-center font-black text-5xl py-4 outline-none focus:border-blue-600 transition-all"
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="bg-white p-12 rounded-[4.5rem] border border-slate-100 shadow-sm text-center">
                    <Activity className="mx-auto text-blue-600 mb-8" size={56}/>
                    <h4 className="font-black uppercase text-[11px] tracking-widest text-slate-400 mb-2">Aproveitamento de Margem</h4>
                    <p className="text-7xl font-black italic text-slate-950 tracking-tighter">{commSettings.profitMargin}%</p>
                    <div className={`mt-8 inline-flex items-center gap-3 px-8 py-3 rounded-full font-black text-[11px] uppercase ${brain.isMarginOk ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}>
                      {brain.isMarginOk ? 'Margem Operacional Segura' : 'Crítico: Sem Margem'}
                    </div>
                  </div>
                </aside>
              </div>
            </div>
          )}

          {/* ABA: MÉTRICAS */}
          {activeTab === 'metrics' && (
            <div className="max-w-[1400px] mx-auto space-y-12 animate-in fade-in duration-1000">
               <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
                  <MetricWidget label="Taxa de Conversão" val={`${brain.kpis.conv.toFixed(1)}%`} meta="5.0%" icon={<Gauge/>} progress={brain.kpis.conv / 5 * 100} color="text-blue-500" />
                  <MetricWidget label="Follow-up Rate" val={`${brain.kpis.fup.toFixed(1)}%`} meta="90.0%" icon={<Clock/>} progress={brain.kpis.fup / 90 * 100} color="text-amber-500" />
                  <MetricWidget label="Ticket Médio" val={`R$ ${brain.kpis.tm.toFixed(0)}`} meta={`R$ ${goals.ticket}`} icon={<TrendingUp/>} progress={brain.kpis.tm / goals.ticket * 100} color="text-emerald-500" />
                  <MetricWidget label="Reativação Carteira" val={brain.kpis.react} meta={goals.reactivated} icon={<RotateCcw/>} progress={brain.kpis.react / goals.reactivated * 100} color="text-purple-500" />
               </div>
               <div className="bg-white rounded-[5rem] shadow-xl overflow-hidden border border-slate-100">
                  <div className="p-16 border-b border-slate-50 flex justify-between items-center bg-slate-50/50">
                     <h3 className="text-4xl font-black italic uppercase tracking-tighter">Auditoria de Metas</h3>
                  </div>
                  <table className="w-full border-collapse">
                     <thead className="bg-slate-50 text-[10px] font-black uppercase text-slate-400 tracking-[0.3em]">
                        <tr>
                           <th className="p-12 text-left">Pilar Estratégico</th>
                           <th className="p-12 text-center">Meta Fixada</th>
                           <th className="p-12 text-center">Performance Real</th>
                           <th className="p-12 text-right">Validação Bônus</th>
                        </tr>
                     </thead>
                     <tbody className="divide-y divide-slate-100 font-bold">
                        <AuditTableRow label="Taxa de Conversão de Pipeline" meta="5.0%" current={`${brain.kpis.conv.toFixed(1)}%`} status={brain.kpis.conv >= 5} />
                        <AuditTableRow label="Eficiência de Follow-up (CRM)" meta="90.0%" current={`${brain.kpis.fup.toFixed(1)}%`} status={brain.kpis.fup >= 90} />
                        <AuditTableRow label="Qualidade de Pós-Venda" meta="100.0%" current={`${brain.kpis.post.toFixed(1)}%`} status={brain.kpis.post >= 100} />
                        <AuditTableRow label="Mix de Venda Cross-Sell" meta="40.0%" current={`${brain.kpis.cross.toFixed(1)}%`} status={brain.kpis.cross >= 40} />
                        <AuditTableRow label="Oportunidades de Upsell" meta="15.0%" current={`${brain.kpis.up.toFixed(1)}%`} status={brain.kpis.up >= 15} />
                     </tbody>
                  </table>
               </div>
            </div>
          )}
        </div>

        {/* MODAL DE ENTRADA */}
        {isModalOpen && (
          <div className="fixed inset-0 bg-slate-950/90 backdrop-blur-2xl z-[999] flex items-center justify-center p-8">
             <div className="bg-white w-full max-w-2xl rounded-[5rem] p-20 shadow-2xl relative border-t-[30px] border-blue-600 animate-in zoom-in-95 duration-500">
                <button onClick={() => setIsModalOpen(false)} className="absolute top-12 right-12 text-slate-300 hover:text-rose-500 transition-all transform hover:rotate-90"><X size={40}/></button>
                <div className="mb-16">
                   <h2 className="text-7xl font-black italic uppercase tracking-tighter leading-[0.8]">Entrada<br/><span className="text-blue-600 text-8xl">Lead</span></h2>
                </div>
                <div className="space-y-10">
                   <input className="w-full p-10 bg-slate-100 rounded-[2.5rem] font-black text-4xl outline-none focus:bg-white border-4 border-transparent focus:border-blue-600 transition-all text-slate-900" placeholder="NOME COMPLETO" />
                   <button className="w-full py-12 bg-slate-950 text-white rounded-full font-black uppercase text-2xl tracking-[0.2em] shadow-2xl hover:bg-blue-600 transition-all flex items-center justify-center gap-8">Registrar Proposta <ArrowRightCircle size={48}/></button>
                </div>
             </div>
          </div>
        )}
      </main>
    </div>
  );
}

// =============================================================================
// --- SUBCOMPONENTES DE UI ---
// =============================================================================

function SidebarLink({ icon, label, active, onClick, open }: any) {
  return (
    <button onClick={onClick} className={`w-full flex items-center gap-6 p-6 rounded-[2rem] transition-all duration-500 group ${active ? 'bg-blue-600 text-white shadow-2xl shadow-blue-500/40 translate-x-3' : 'text-slate-500 hover:bg-white/5 hover:text-white'}`}>
      <span className={`transition-transform duration-500 ${active ? 'scale-125' : 'group-hover:scale-110'}`}>{icon}</span>
      {open && <span className="font-black uppercase text-[11px] tracking-[0.2em] whitespace-nowrap">{label}</span>}
    </button>
  );
}

function MetaInput({ label, value, onChange, isHighlight }: any) {
  return (
    <div className="group">
      <label className={`text-[9px] font-black uppercase tracking-widest mb-3 block ${isHighlight ? 'text-blue-400' : 'text-slate-600'}`}>{label}</label>
      <input type="number" value={value} onChange={e => onChange(Number(e.target.value))} className="w-full bg-transparent border-b-2 border-white/10 text-white font-black text-3xl py-3 outline-none focus:border-blue-500 transition-all" />
    </div>
  );
}

function CardAction({ active, label, onClick, color, full }: any) {
  return (
    <button onClick={onClick} className={`py-4 rounded-2xl text-[10px] font-black text-black border-2 transition-all shadow-sm ${full ? 'col-span-2' : ''} ${active ? `${color} border-transparent shadow-md scale-[1.02]` : 'bg-white border-slate-100 hover:border-slate-300'}`}>
      {label}
    </button>
  );
}

function AuditItem({ label, value, isBlue }: any) {
  return (
    <div className="text-center group">
       <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em] mb-4 group-hover:text-blue-400 transition-colors">{label}</p>
       <p className={`text-6xl font-black italic tracking-tighter ${isBlue ? 'text-blue-500' : 'text-white'}`}>{value}</p>
    </div>
  );
}

function BonusRuleCard({ status, label, target, current }: any) {
  return (
    <div className={`p-10 rounded-[3.5rem] border-2 transition-all duration-700 flex items-start gap-8 ${status ? 'bg-emerald-500/5 border-emerald-500/20 shadow-lg' : 'bg-slate-50 border-slate-100 opacity-40'}`}>
       <div className={`p-5 rounded-3xl ${status ? 'bg-emerald-500 text-white shadow-xl shadow-emerald-500/20' : 'bg-slate-200 text-slate-400'}`}>
          {status ? <Check strokeWidth={5} size={24}/> : <X strokeWidth={5} size={24}/>}
       </div>
       <div className="flex-1">
          <div className="flex justify-between items-center mb-2">
             <h4 className={`font-black uppercase text-sm ${status ? 'text-emerald-800' : 'text-slate-500'}`}>{label}</h4>
             <span className={`text-[11px] font-black ${status ? 'text-emerald-500' : 'text-slate-400'}`}>{status ? '+0.5%' : '0%'}</span>
          </div>
          <p className="text-[10px] font-bold text-slate-400 mb-5">Meta Exigida: {target}</p>
          <div className="bg-white/80 px-6 py-2.5 rounded-2xl text-xs font-black text-slate-900 shadow-sm inline-block border border-slate-100 italic">Performance: {current}</div>
       </div>
    </div>
  );
}

function ComboStatBox({ active, label, val }: any) {
  return (
    <div className={`p-8 rounded-[2.5rem] border-2 transition-all duration-1000 ${active ? 'bg-blue-600 border-transparent shadow-2xl shadow-blue-500/20 scale-[1.05]' : 'bg-white/5 border-white/10 opacity-30'}`}>
       <p className={`text-[11px] font-black uppercase mb-3 tracking-widest ${active ? 'text-blue-100' : 'text-slate-600'}`}>{label}</p>
       <p className={`text-2xl font-black italic ${active ? 'text-white' : 'text-slate-500'}`}>{val}</p>
    </div>
  );
}

function MetricWidget({ label, val, icon, meta, progress, color }: any) {
  return (
    <div className="bg-white p-14 rounded-[5rem] shadow-sm border border-slate-100 hover:shadow-2xl transition-all duration-700 group">
       <div className="flex justify-between items-start mb-12">
          <div className={`p-6 rounded-[2.5rem] bg-slate-50 ${color} shadow-sm group-hover:scale-110 transition-transform`}>{icon}</div>
          <div className="text-right">
             <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest mb-2">{label}</p>
             <p className="text-5xl font-black italic text-slate-950 tracking-tighter">{val}</p>
          </div>
       </div>
       <div className="space-y-5">
          <div className="flex justify-between items-end text-[11px] font-black uppercase">
             <span className="text-slate-400 tracking-widest">Objetivo: {meta}</span>
             <span className={color}>{progress.toFixed(0)}%</span>
          </div>
          <div className="h-5 w-full bg-slate-50 rounded-full overflow-hidden p-1.5 shadow-inner">
             <div className={`h-full rounded-full transition-all duration-1000 ${color.replace('text', 'bg')}`} style={{ width: `${Math.min(progress, 100)}%` }}></div>
          </div>
       </div>
    </div>
  );
}

function AuditTableRow({ label, meta, current, status }: any) {
  return (
    <tr className="hover:bg-slate-50 transition-colors group">
       <td className="p-12 font-black text-slate-950 uppercase text-[13px]">{label}</td>
       <td className="p-12 text-center text-slate-400 font-black italic text-lg">{meta}</td>
       <td className="p-12 text-center"><span className="bg-slate-900 text-white px-8 py-3 rounded-full text-xs font-black italic group-hover:bg-blue-600 transition-colors shadow-lg">{current}</span></td>
       <td className="p-12 text-right">
          {status ? (
            <div className="flex items-center justify-end gap-4 text-emerald-500 font-black uppercase text-[11px] tracking-widest"><CheckCircle2 size={22}/> Batida e Validada</div>
          ) : (
            <div className="flex items-center justify-end gap-4 text-slate-300 font-black uppercase text-[11px] tracking-widest"><AlertCircle size={22}/> Em Processo</div>
          )}
       </td>
    </tr>
  );
}
