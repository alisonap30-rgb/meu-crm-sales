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
  FileSpreadsheet, ClipboardCheck, History, Laptop, Zap as ZapIcon, ChevronLeft,
  FilterX, Download, Share2, Printer, Mail, Phone, ExternalLink, Minimize2, Maximize2
} from 'lucide-react';

/**
 * =============================================================================
 * SECTION 1: ESTRUTURAS DE DADOS E CONFIGURAÇÕES GLOBAIS
 * =============================================================================
 */

const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL || "", 
  import.meta.env.VITE_SUPABASE_ANON_KEY || ""
);

const STAGES = [
  { id: 'contato', label: 'Prospecção Inicial', color: 'bg-slate-400', border: 'border-slate-400', accent: 'text-slate-500', description: 'Leads recém chegados ou em primeiro contato.' },
  { id: 'orcamento', label: 'Cotação & Orçamento', color: 'bg-blue-500', border: 'border-blue-500', accent: 'text-blue-500', description: 'Propostas técnicas enviadas para validação.' },
  { id: 'negociacao', label: 'Negociação Ativa', color: 'bg-amber-500', border: 'border-amber-500', accent: 'text-amber-500', description: 'Ajustes finais de preço e condições comerciais.' },
  { id: 'fechado', label: 'Venda Concluída', color: 'bg-emerald-500', border: 'border-emerald-500', accent: 'text-emerald-500', description: 'Contrato assinado e pagamento processado.' },
  { id: 'perdido', label: 'Oportunidade Perdida', color: 'bg-rose-500', border: 'border-rose-500', accent: 'text-rose-500', description: 'Desistência ou perda para concorrência.' }
] as const;

const AVAILABLE_TAGS = [
  { id: 'proposta', label: 'PROPOSTA ENVIADA', color: 'bg-blue-600', light: 'bg-blue-50', text: 'text-blue-700' },
  { id: 'followup', label: 'AGUARDANDO RETORNO', color: 'bg-amber-600', light: 'bg-amber-50', text: 'text-amber-700' },
  { id: 'urgente', label: 'PRIORIDADE ALTA', color: 'bg-red-600', light: 'bg-red-50', text: 'text-red-700' },
  { id: 'reuniao', label: 'REUNIÃO AGENDADA', color: 'bg-emerald-600', light: 'bg-emerald-50', text: 'text-emerald-700' },
  { id: 'parcial', label: 'PAGAMENTO PARCIAL', color: 'bg-purple-600', light: 'bg-purple-50', text: 'text-purple-700' },
  { id: 'indica', label: 'INDICAÇÃO DIRETA', color: 'bg-indigo-600', light: 'bg-indigo-50', text: 'text-indigo-700' }
];

/**
 * =============================================================================
 * SECTION 2: TYPES E INTERFACES (ESSENCIAL PARA ESTABILIDADE)
 * =============================================================================
 */

interface Lead {
  id: string;
  name: string;
  value: number;
  stage: string;
  tags: string;
  isArchived: boolean;
  lastUpdate: string;
  followUp: boolean;
  hasUpSell: boolean;
  hasCrossSell: boolean;
  reactivated: boolean;
  postSale: boolean;
  notes?: string;
  company?: string;
  email?: string;
  phone?: string;
}

/**
 * =============================================================================
 * SECTION 3: COMPONENTE ULTRA CRM ENTERPRISE (MÓDULO CENTRAL)
 * =============================================================================
 */

export default function UltraCRMEnterprise() {
  // ESTADOS DE DADOS
  const [leads, setLeads] = useState<Lead[]>([]);
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  
  // ESTADOS DE INTERFACE
  const [activeTab, setActiveTab] = useState('pipeline');
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [draggedItem, setDraggedItem] = useState<string | null>(null);
  const [notifications, setNotifications] = useState<any[]>([]);

  // ESTADOS DE METAS (LOGICA DO ARQUIVO DOCX)
  const [goals, setGoals] = useState({
    revenue: 100000,
    ticket: 5000,
    contacts: 400,
    reactivated: 8,
  });

  const [commSettings, setCommSettings] = useState({
    weeks: { 1: 0, 2: 0, 3: 0, 4: 0 },
    profitMargin: 15,
    taxRate: 6,
    bonusCap: 5000
  });

  // ESTADO DO FORMULÁRIO
  const [newLead, setNewLead] = useState({
    name: '',
    value: 0,
    stage: 'contato',
    tags: ''
  });

  // REFS PARA ELEMENTOS UI
  const scrollRef = useRef<HTMLDivElement>(null);

  /**
   * =============================================================================
   * SECTION 4: ENGINE DE SINCRONIZAÇÃO E PERSISTÊNCIA
   * =============================================================================
   */

  const addLog = useCallback((action: string, details: string) => {
    const entry = {
      id: Math.random().toString(36).substr(2, 9),
      time: new Date().toISOString(),
      action,
      details
    };
    setLogs(prev => [entry, ...prev].slice(0, 200));
  }, []);

  const notify = (msg: string, type: 'success' | 'error' | 'info' = 'success') => {
    const id = Date.now();
    setNotifications(prev => [...prev, { id, msg, type }]);
    setTimeout(() => setNotifications(prev => prev.filter(n => n.id !== id)), 5000);
  };

  const fetchLeads = useCallback(async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('leads')
        .select('*')
        .order('lastUpdate', { ascending: false });

      if (error) throw error;
      setLeads(data || []);
      addLog("DATABASE_FETCH", "Sincronização com Supabase concluída.");
    } catch (err: any) {
      notify(err.message, 'error');
      addLog("ERROR", `Falha na sincronização: ${err.message}`);
    } finally {
      setLoading(false);
    }
  }, [addLog]);

  useEffect(() => {
    fetchLeads();
  }, [fetchLeads]);

  const updateLead = async (id: string, updates: Partial<Lead>) => {
    const previous = leads.find(l => l.id === id);
    const payload = { ...updates, lastUpdate: new Date().toISOString() };
    
    // Optimistic Update
    setLeads(prev => prev.map(l => l.id === id ? { ...l, ...payload } : l));

    try {
      const { error } = await supabase.from('leads').update(payload).eq('id', id);
      if (error) throw error;
      addLog("UPDATE", `Lead ${previous?.name} atualizado com sucesso.`);
    } catch (err: any) {
      // Rollback em caso de erro
      if (previous) setLeads(prev => prev.map(l => l.id === id ? previous : l));
      notify("Erro ao atualizar lead no servidor.", 'error');
    }
  };

  const handleCreateLead = async () => {
    if (!newLead.name.trim()) return notify("Nome é obrigatório", 'error');

    const leadData = {
      ...newLead,
      name: newLead.name.toUpperCase(),
      lastUpdate: new Date().toISOString(),
      isArchived: false,
      followUp: false,
      hasUpSell: false,
      hasCrossSell: false,
      reactivated: false,
      postSale: false
    };

    try {
      const { data, error } = await supabase.from('leads').insert([leadData]).select();
      if (error) throw error;
      
      setLeads([data[0], ...leads]);
      setIsModalOpen(false);
      setNewLead({ name: '', value: 0, stage: 'contato', tags: '' });
      notify("Novo lead registrado no pipeline!");
      addLog("CREATE", `Lead ${data[0].name} criado.`);
    } catch (err: any) {
      notify(err.message, 'error');
    }
  };

  const toggleTag = (lead: Lead, tagId: string) => {
    const currentTags = lead.tags ? lead.tags.split(',').filter(t => t !== "") : [];
    const newTags = currentTags.includes(tagId) 
      ? currentTags.filter(t => t !== tagId) 
      : [...currentTags, tagId];
    
    updateLead(lead.id, { tags: newTags.join(',') });
  };

  /**
   * =============================================================================
   * SECTION 5: MOTOR DE CÁLCULO FINANCEIRO E AUDITORIA (LOGICA DO DOCX)
   * =============================================================================
   */

  const analytics = useMemo(() => {
    const activeLeads = leads.filter(l => !l.isArchived);
    const wonLeads = activeLeads.filter(l => l.stage === 'fechado');
    const lostLeads = activeLeads.filter(l => l.stage === 'perdido');
    
    // Faturamento das semanas (input manual do usuário no Painel de Comissão)
    const totalRevReal = Object.values(commSettings.weeks).reduce((a, b) => a + Number(b), 0);
    const revPerf = (totalRevReal / goals.revenue) * 100;

    const kpis = {
      revenue: totalRevReal,
      count: activeLeads.length,
      wonCount: wonLeads.length,
      lostCount: lostLeads.length,
      pipelineValue: activeLeads.reduce((acc, curr) => acc + (Number(curr.value) || 0), 0),
      tm: wonLeads.length > 0 ? (wonLeads.reduce((acc, curr) => acc + (Number(curr.value) || 0), 0) / wonLeads.length) : 0,
      conv: activeLeads.length > 0 ? (wonLeads.length / (wonLeads.length + lostLeads.length || 1)) * 100 : 0,
      cross: wonLeads.length > 0 ? (wonLeads.filter(l => l.hasCrossSell).length / wonLeads.length) * 100 : 0,
      up: wonLeads.length > 0 ? (wonLeads.filter(l => l.hasUpSell).length / wonLeads.length) * 100 : 0,
      fup: activeLeads.filter(l => ['orcamento', 'negociacao'].includes(l.stage)).length > 0
        ? (activeLeads.filter(l => l.followUp).length / activeLeads.filter(l => ['orcamento', 'negociacao'].includes(l.stage)).length) * 100 : 0,
      post: wonLeads.length > 0 ? (wonLeads.filter(l => l.postSale).length / wonLeads.length) * 100 : 0,
      react: activeLeads.filter(l => l.reactivated).length
    };

    // Auditoria de Comissão (Lógica Estratégica)
    const isMarginOk = commSettings.profitMargin >= 10; // Bloqueio de segurança se margem < 10%
    let baseRate = 0;
    
    if (revPerf >= 110) baseRate = 3.5;
    else if (revPerf >= 100) baseRate = 2.5;
    else if (revPerf >= 90) baseRate = 1.5;

    const accel = {
      ticket: (isMarginOk && kpis.tm >= goals.ticket) ? 0.5 : 0,
      conv: (isMarginOk && kpis.conv >= 5) ? 0.5 : 0,
      cross: (isMarginOk && kpis.cross >= 40) ? 0.5 : 0,
      up: (isMarginOk && kpis.up >= 15) ? 0.5 : 0
    };

    const finalRate = isMarginOk ? (baseRate + accel.ticket + accel.conv + accel.cross + accel.up) : 0;
    
    const comboGoals = {
      contacts: kpis.count >= goals.contacts,
      fup: kpis.fup >= 90,
      post: kpis.post >= 100,
      react: kpis.react >= goals.reactivated
    };

    const qualifiesBonus300 = isMarginOk && comboGoals.contacts && comboGoals.fup && comboGoals.post && comboGoals.react;
    const bonusValue = qualifiesBonus300 ? 300 : 0;
    const finalCommission = Math.min((totalRevReal * (finalRate / 100)) + bonusValue, commSettings.bonusCap);

    return { kpis, finalRate, finalCommission, isMarginOk, comboGoals, bonusValue, revPerf, accel };
  }, [leads, goals, commSettings]);

  /**
   * =============================================================================
   * SECTION 6: COMPONENTES DE INTERFACE - RENDERERS
   * =============================================================================
   */

  const RenderPipeline = () => (
    <div className="flex gap-10 h-full min-w-[1900px] pb-10 animate-in fade-in duration-1000">
      {STAGES.map(stage => {
        const stageLeads = leads.filter(l => l.stage === stage.id && !l.isArchived && l.name.toLowerCase().includes(searchTerm.toLowerCase()));
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
            className={`w-[380px] flex flex-col bg-slate-200/40 rounded-[3.5rem] p-8 border-2 border-dashed transition-all duration-500 ${draggedItem ? 'border-blue-500/20 bg-blue-50/20' : 'border-transparent'}`}
          >
            {/* Header da Coluna */}
            <div className="mb-10 px-4">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className={`w-3.5 h-3.5 rounded-full ${stage.color} shadow-lg shadow-${stage.color}/20`}></div>
                  <span className="font-black uppercase text-slate-400 text-[10px] tracking-[0.2em]">{stage.label}</span>
                </div>
                <span className="bg-white px-4 py-1.5 rounded-full text-[11px] font-black text-slate-500 shadow-sm border border-slate-100">{stageLeads.length}</span>
              </div>
              <h3 className="text-4xl font-black italic text-slate-900 tracking-tighter">
                <span className="text-sm not-italic font-bold text-slate-400 mr-2">R$</span>
                {stageTotal.toLocaleString('pt-BR')}
              </h3>
              <p className="text-[9px] text-slate-400 font-bold uppercase mt-2 leading-tight">{stage.description}</p>
            </div>

            {/* Listagem de Leads */}
            <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar space-y-6">
              {stageLeads.map(lead => (
                <div
                  key={lead.id}
                  draggable
                  onDragStart={e => {
                    e.dataTransfer.setData("leadId", lead.id);
                    setDraggedItem(lead.id);
                  }}
                  className="bg-white p-8 rounded-[3.2rem] shadow-sm border-2 border-transparent hover:border-blue-500 hover:shadow-2xl hover:shadow-blue-500/10 transition-all cursor-grab active:cursor-grabbing group relative overflow-hidden"
                >
                  {/* Tags Rápidas */}
                  <div className="flex flex-wrap gap-1 mb-6">
                    {AVAILABLE_TAGS.map(tag => (
                      <button
                        key={tag.id}
                        onClick={() => toggleTag(lead, tag.id)}
                        className={`w-6 h-6 rounded-full border-2 transition-all ${lead.tags?.includes(tag.id) ? `${tag.color} border-white shadow-md scale-110` : 'bg-slate-50 border-slate-100 hover:border-slate-300'}`}
                      />
                    ))}
                  </div>

                  {/* Nome e Valor */}
                  <div className="mb-6">
                    <input 
                      className="font-black text-slate-950 uppercase text-sm bg-transparent border-none w-full outline-none focus:text-blue-600 transition-colors mb-1"
                      value={lead.name}
                      onChange={e => updateLead(lead.id, { name: e.target.value.toUpperCase() })}
                    />
                    <div className="flex items-center text-emerald-600">
                       <span className="text-xs font-black mr-1 mt-1 italic">R$</span>
                       <input 
                        type="number"
                        className="bg-transparent border-none font-black italic text-3xl w-full outline-none"
                        value={lead.value}
                        onChange={e => updateLead(lead.id, { value: Number(e.target.value) })}
                       />
                    </div>
                  </div>

                  {/* Ações de Auditoria (DOCX) */}
                  <div className="grid grid-cols-2 gap-2">
                    <MiniActionBtn active={lead.followUp} label="FUP" onClick={() => updateLead(lead.id, { followUp: !lead.followUp })} color="bg-amber-400" />
                    <MiniActionBtn active={lead.hasUpSell} label="UP" onClick={() => updateLead(lead.id, { hasUpSell: !lead.hasUpSell })} color="bg-purple-500" />
                    <MiniActionBtn active={lead.hasCrossSell} label="CROSS" onClick={() => updateLead(lead.id, { hasCrossSell: !lead.hasCrossSell })} color="bg-blue-500" />
                    <MiniActionBtn active={lead.reactivated} label="REACT" onClick={() => updateLead(lead.id, { reactivated: !lead.reactivated })} color="bg-emerald-500" />
                    <div className="col-span-2 mt-1">
                      <MiniActionBtn active={lead.postSale} label="PÓS-VENDA COMPLETO" onClick={() => updateLead(lead.id, { postSale: !lead.postSale })} color="bg-indigo-600" isFull />
                    </div>
                  </div>

                  {/* Botões de Ação Ocultos */}
                  <div className="absolute top-6 right-8 flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={() => setSelectedLead(lead)} className="p-2 text-slate-300 hover:text-blue-600 transition-colors"><ExternalLink size={16}/></button>
                    <button onClick={() => updateLead(lead.id, { isArchived: true })} className="p-2 text-slate-300 hover:text-rose-600 transition-colors"><Trash2 size={16}/></button>
                  </div>
                </div>
              ))}
              
              {stageLeads.length === 0 && (
                <div className="h-40 border-2 border-dashed border-slate-200 rounded-[3rem] flex items-center justify-center">
                  <p className="text-[10px] font-black text-slate-300 uppercase tracking-widest">Coluna Vazia</p>
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );

  const RenderCommission = () => (
    <div className="max-w-[1500px] mx-auto space-y-12 animate-in slide-in-from-bottom-12 duration-1000">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
        
        {/* Painel Esquerdo: Auditoria de Comissão */}
        <div className="lg:col-span-8 space-y-12">
          
          {/* Card Gigante de Remuneração */}
          <div className={`p-24 rounded-[6rem] text-white shadow-3xl relative overflow-hidden transition-all duration-1000 ${analytics.isMarginOk ? 'bg-slate-950' : 'bg-rose-950 shadow-rose-500/20'}`}>
            <div className="absolute -top-20 -right-20 p-40 opacity-5 rotate-12 scale-150"><ShieldCheck size={400}/></div>
            
            <div className="flex items-center justify-between mb-16 relative z-10">
              <div className="flex items-center gap-4 bg-white/5 px-8 py-3 rounded-full border border-white/10">
                <ShieldCheck className="text-blue-400" size={20}/>
                <span className="text-[11px] font-black uppercase tracking-[0.4em]">Audit Trail v5.2</span>
              </div>
              <div className="flex items-center gap-3">
                <span className={`w-3 h-3 rounded-full ${analytics.isMarginOk ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500 animate-bounce'}`}></span>
                <span className="text-[10px] font-black uppercase tracking-widest">{analytics.isMarginOk ? 'Compliance Aprovado' : 'Atenção: Margem Baixa'}</span>
              </div>
            </div>

            <div className="relative z-10 mb-20">
              <p className="text-slate-400 font-black uppercase tracking-[0.5em] text-[12px] mb-4">Remuneração Variável Estimada</p>
              <h2 className="text-[11rem] font-black italic tracking-tighter leading-none drop-shadow-2xl">
                <span className="text-4xl not-italic font-bold text-blue-600 mr-4">R$</span>
                {analytics.finalCommission.toLocaleString('pt-BR')}
              </h2>
            </div>

            <div className="grid grid-cols-4 gap-12 pt-20 border-t border-white/5 relative z-10">
              <AuditMetric label="Alíquota" val={`${analytics.finalRate.toFixed(2)}%`} sub="Calculada" />
              <AuditMetric label="Bônus Fixo" val={`R$ ${analytics.bonusValue}`} sub="Combo Metas" />
              <AuditMetric label="Faturamento" val={`R$ ${analytics.kpis.revenue.toLocaleString()}`} sub="Base de Cálculo" />
              <AuditMetric label="Perf. Meta" val={`${analytics.revPerf.toFixed(1)}%`} sub="Meta Global" isHighlight />
            </div>
          </div>

          {/* Grid de Aceleradores */}
          <div className="bg-white p-20 rounded-[5rem] shadow-xl border border-slate-100">
             <div className="flex items-center justify-between mb-16">
                <div>
                  <h3 className="text-4xl font-black italic uppercase tracking-tighter flex items-center gap-6">
                    <Rocket className="text-blue-600" size={36}/> Aceleradores Financeiros
                  </h3>
                  <p className="text-slate-400 text-xs font-bold uppercase tracking-widest mt-2 ml-14">Regras de negócio para incremento de comissão</p>
                </div>
                <div className="bg-slate-50 p-4 rounded-3xl border border-slate-100 flex items-center gap-4">
                   <Info className="text-blue-500" size={20}/>
                   <span className="text-[9px] font-black text-slate-400 uppercase max-w-[150px]">Valores acumulativos baseados na performance atual</span>
                </div>
             </div>

             <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                <AcceleratorCard 
                  status={analytics.accel.ticket > 0} 
                  label="Ticket Médio" 
                  desc={`Alvo: R$ ${goals.ticket.toLocaleString()}`} 
                  current={`R$ ${analytics.kpis.tm.toFixed(0)}`}
                  bonus="+0.50%"
                />
                <AcceleratorCard 
                  status={analytics.accel.conv > 0} 
                  label="Taxa Conversão" 
                  desc="Alvo: 5.0%" 
                  current={`${analytics.kpis.conv.toFixed(1)}%`}
                  bonus="+0.50%"
                />
                <AcceleratorCard 
                  status={analytics.accel.cross > 0} 
                  label="Mix Cross-Sell" 
                  desc="Alvo: 40.0%" 
                  current={`${analytics.kpis.cross.toFixed(1)}%`}
                  bonus="+0.50%"
                />
                <AcceleratorCard 
                  status={analytics.accel.up > 0} 
                  label="Mix Up-Sell" 
                  desc="Alvo: 15.0%" 
                  current={`${analytics.kpis.up.toFixed(1)}%`}
                  bonus="+0.50%"
                />
             </div>
          </div>
        </div>

        {/* Painel Direito: Inputs de Semana */}
        <div className="lg:col-span-4 space-y-12">
          <div className="bg-slate-950 p-16 rounded-[5rem] text-white shadow-3xl">
            <div className="flex items-center gap-6 mb-16">
              <div className="bg-blue-600 p-4 rounded-3xl"><Activity size={24}/></div>
              <h4 className="text-2xl font-black italic uppercase tracking-tighter">Realizado Semanal</h4>
            </div>
            
            <div className="space-y-12">
              {[1, 2, 3, 4].map(num => (
                <div key={num} className="group relative">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em] mb-4 block group-focus-within:text-blue-500 transition-colors">Vendas Semana 0{num}</label>
                  <div className="flex items-end gap-4 border-b-4 border-white/5 focus-within:border-blue-600 transition-all pb-4">
                    <span className="text-2xl font-black text-slate-700 italic">R$</span>
                    <input 
                      type="number"
                      value={commSettings.weeks[num as keyof typeof commSettings.weeks]}
                      onChange={e => setCommSettings({...commSettings, weeks: {...commSettings.weeks, [num]: e.target.value}})}
                      className="bg-transparent w-full font-black text-6xl outline-none"
                      placeholder="0"
                    />
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-20 p-10 bg-white/5 rounded-[3rem] border border-white/5">
              <div className="flex justify-between items-center mb-6">
                 <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Total Acumulado</span>
                 <span className="bg-blue-600 text-white px-4 py-1 rounded-full text-[9px] font-black uppercase italic">Mês Corrente</span>
              </div>
              <p className="text-5xl font-black italic tracking-tighter">R$ {analytics.kpis.revenue.toLocaleString('pt-BR')}</p>
            </div>
          </div>

          <div className="bg-white p-12 rounded-[4rem] shadow-xl border border-slate-100">
             <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.4em] mb-10 text-center">Checklist de Bônus Combo (R$ 300)</p>
             <div className="space-y-6">
                <ComboItem active={analytics.comboGoals.contacts} label="Metas de Contatos" />
                <ComboItem active={analytics.comboGoals.fup} label="Eficiência de Follow-up" />
                <ComboItem active={analytics.comboGoals.post} label="Qualidade Pós-Venda" />
                <ComboItem active={analytics.comboGoals.react} label="Reativação de Leads" />
             </div>
          </div>
        </div>

      </div>
    </div>
  );

  const RenderMetrics = () => (
    <div className="max-w-[1600px] mx-auto space-y-12 animate-in fade-in duration-700">
       <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          <MetricCard 
            label="Volume Pipeline" 
            val={`R$ ${analytics.kpis.pipelineValue.toLocaleString()}`} 
            icon={<BriefcaseIcon/>} 
            color="text-blue-500" 
            sub={`${analytics.kpis.count} Oportunidades`}
          />
          <MetricCard 
            label="Conversão Global" 
            val={`${analytics.kpis.conv.toFixed(1)}%`} 
            icon={<Gauge/>} 
            color="text-emerald-500" 
            sub="Win Rate Real"
          />
          <MetricCard 
            label="Ticket Médio" 
            val={`R$ ${analytics.kpis.tm.toFixed(0)}`} 
            icon={<Target/>} 
            color="text-amber-500" 
            sub="Valor p/ Contrato"
          />
          <MetricCard 
            label="Churn / Perda" 
            val={analytics.kpis.lostCount} 
            icon={<TrendingDown/>} 
            color="text-rose-500" 
            sub="Leads Descartados"
          />
       </div>

       <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 mt-12">
          <div className="bg-white p-16 rounded-[5rem] shadow-xl border border-slate-100">
             <h3 className="text-3xl font-black italic uppercase tracking-tighter mb-16 flex items-center gap-6"><Activity className="text-blue-600"/> Funil de Conversão Auditoria</h3>
             <div className="space-y-12">
                <FunnelStep label="Contatos Realizados" current={analytics.kpis.count} meta={goals.contacts} color="bg-slate-400" />
                <FunnelStep label="Eficiência FUP" current={analytics.kpis.fup} meta={90} color="bg-amber-500" isPercent />
                <FunnelStep label="Conversão Venda" current={analytics.kpis.conv} meta={5} color="bg-emerald-500" isPercent />
                <FunnelStep label="Reativação Ativa" current={analytics.kpis.react} meta={goals.reactivated} color="bg-purple-500" />
             </div>
          </div>

          <div className="bg-white p-16 rounded-[5rem] shadow-xl border border-slate-100 overflow-hidden relative">
             <div className="absolute top-10 right-10 flex gap-4">
                <button className="p-4 bg-slate-50 rounded-2xl text-slate-400 hover:text-blue-600"><Download size={20}/></button>
                <button className="p-4 bg-slate-50 rounded-2xl text-slate-400 hover:text-blue-600"><Share2 size={20}/></button>
             </div>
             <h3 className="text-3xl font-black italic uppercase tracking-tighter mb-16">Tabela de Auditoria de Batimento</h3>
             <table className="w-full">
                <thead className="text-[10px] font-black uppercase text-slate-400 tracking-[0.4em] border-b border-slate-100">
                  <tr>
                    <th className="pb-8 text-left">Indicador Estratégico</th>
                    <th className="pb-8 text-center">Objetivo</th>
                    <th className="pb-8 text-right">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                   <AuditRow label="Margem de Lucro Operacional" val={`${commSettings.profitMargin}%`} status={analytics.isMarginOk} />
                   <AuditRow label="Cross-Sell (Mix de Venda)" val={`${analytics.kpis.cross.toFixed(1)}%`} status={analytics.kpis.cross >= 40} />
                   <AuditRow label="Up-Sell (Elevação Ticket)" val={`${analytics.kpis.up.toFixed(1)}%`} status={analytics.kpis.up >= 15} />
                   <AuditRow label="Pós-Venda (Retenção 100%)" val={`${analytics.kpis.post.toFixed(1)}%`} status={analytics.kpis.post >= 100} />
                   <AuditRow label="Taxa de Cancelamento" val="2.4%" status={true} />
                </tbody>
             </table>
          </div>
       </div>
    </div>
  );

  const RenderAuditLogs = () => (
    <div className="max-w-[1400px] mx-auto animate-in slide-in-from-right-12 duration-1000">
       <div className="bg-slate-950 rounded-[5rem] shadow-4xl overflow-hidden border border-white/5">
          <div className="p-16 border-b border-white/5 flex items-center justify-between">
             <div>
               <h3 className="text-4xl font-black italic uppercase text-white tracking-tighter flex items-center gap-6">
                 <Terminal className="text-blue-500"/> Auditoria de Sistema
               </h3>
               <p className="text-slate-500 text-xs font-bold uppercase tracking-[0.3em] mt-4 ml-14">Registro imutável de operações comerciais v5.2</p>
             </div>
             <button onClick={() => setLogs([])} className="px-8 py-4 bg-white/5 hover:bg-rose-500/20 text-slate-400 hover:text-rose-500 rounded-full transition-all text-[10px] font-black uppercase tracking-widest border border-white/10">Limpar Buffer de Memória</button>
          </div>
          <div className="p-8 max-h-[700px] overflow-y-auto custom-scrollbar-dark font-mono">
             {logs.length === 0 && <div className="py-20 text-center text-slate-600 font-black uppercase tracking-widest text-xs">Nenhum evento registrado no buffer</div>}
             {logs.map((log, idx) => (
               <div key={log.id} className="p-6 border-b border-white/5 flex items-center gap-10 hover:bg-white/5 transition-colors group">
                  <span className="text-[10px] text-slate-600 font-black w-24">{new Date(log.time).toLocaleTimeString()}</span>
                  <span className={`px-4 py-1 rounded-full text-[9px] font-black uppercase tracking-widest ${log.action === 'ERROR' ? 'bg-rose-500 text-white' : 'bg-blue-600/20 text-blue-500'}`}>
                    {log.action}
                  </span>
                  <span className="text-slate-400 text-xs font-bold flex-1 group-hover:text-white transition-colors">{log.details}</span>
                  <span className="text-slate-700 text-[9px] font-black uppercase">Session ID: {log.id}</span>
               </div>
             ))}
          </div>
       </div>
    </div>
  );

  /**
   * =============================================================================
   * SECTION 7: MAIN LAYOUT
   * =============================================================================
   */

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex overflow-hidden font-sans text-slate-900 selection:bg-blue-600 selection:text-white">
      
      {/* Sistema de Notificação */}
      <div className="fixed top-10 right-10 z-[1000] space-y-4">
        {notifications.map(n => (
          <div key={n.id} className="bg-slate-950 text-white p-6 rounded-3xl shadow-2xl border-l-8 border-blue-600 flex items-center gap-6 animate-in slide-in-from-right-10">
            <ZapIcon className="text-blue-500 animate-pulse" size={20}/>
            <span className="font-black uppercase text-[10px] tracking-widest">{n.msg}</span>
          </div>
        ))}
      </div>

      {/* SIDEBAR GIGANTE */}
      <aside className={`bg-slate-950 text-white transition-all duration-700 ease-out flex flex-col z-[100] border-r border-white/5 shadow-2xl ${sidebarOpen ? 'w-[420px]' : 'w-[120px]'}`}>
        
        {/* Logo Area */}
        <div className="p-12 flex items-center gap-8 border-b border-white/5 relative group">
          <div className="bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-800 p-5 rounded-[2.5rem] shadow-2xl shadow-blue-500/20 transform group-hover:rotate-12 transition-transform duration-500">
            <ZapIcon size={32} className="fill-white"/>
          </div>
          {sidebarOpen && (
            <div className="animate-in fade-in slide-in-from-left-4 duration-1000">
              <h1 className="text-3xl font-black italic uppercase tracking-tighter leading-none">Ultra<span className="text-blue-500">Sales</span></h1>
              <p className="text-[10px] font-black text-slate-500 tracking-[0.4em] uppercase mt-2">Enterprise Engine v5</p>
            </div>
          )}
        </div>
        
        {/* Navigation Section */}
        <nav className="p-8 flex-1 space-y-4 overflow-y-auto custom-scrollbar-dark">
          <div className="space-y-3">
             <SidebarBtn icon={<LayoutDashboard/>} label="Pipeline Estratégico" active={activeTab === 'pipeline'} onClick={() => setActiveTab('pipeline')} open={sidebarOpen} />
             <SidebarBtn icon={<Coins/>} label="Painel de Comissão" active={activeTab === 'commission'} onClick={() => setActiveTab('commission')} open={sidebarOpen} />
             <SidebarBtn icon={<PieChart/>} label="Métricas & KPIs" active={activeTab === 'metrics'} onClick={() => setActiveTab('metrics')} open={sidebarOpen} />
             <SidebarBtn icon={<History/>} label="Log de Auditoria" active={activeTab === 'logs'} onClick={() => setActiveTab('logs')} open={sidebarOpen} />
          </div>

          {sidebarOpen && (
            <div className="mt-20 pt-16 border-t border-white/5 space-y-16 animate-in fade-in duration-1000">
              {/* Meta Config Group */}
              <section>
                <div className="flex items-center justify-between mb-10">
                  <label className="text-[10px] font-black text-blue-500 uppercase tracking-[0.4em] block">Setup de Metas</label>
                  <Settings size={14} className="text-slate-700 hover:text-white cursor-pointer transition-colors"/>
                </div>
                <div className="space-y-8">
                  <MetaInput label="Faturamento Mensal (R$)" value={goals.revenue} onChange={v => setGoals({...goals, revenue: v})} icon={<DollarSign size={14}/>} />
                  <MetaInput label="Ticket Médio Alvo (R$)" value={goals.ticket} onChange={v => setGoals({...goals, ticket: v})} icon={<Target size={14}/>} />
                  <MetaInput label="Fluxo de Prospecção" value={goals.contacts} onChange={v => setGoals({...goals, contacts: v})} icon={<MousePointer2 size={14}/>} />
                  <MetaInput label="Meta Reativação" value={goals.reactivated} onChange={v => setGoals({...goals, reactivated: v})} icon={<RotateCcw size={14}/>} />
                </div>
              </section>

              {/* Security Group */}
              <section className="bg-white/5 p-8 rounded-[3.5rem] border border-white/5 group hover:border-blue-500/30 transition-all duration-500">
                <div className="flex items-center gap-4 mb-8">
                   <div className="w-2 h-8 bg-blue-600 rounded-full group-hover:h-12 transition-all"></div>
                   <label className="text-[10px] font-black text-white uppercase tracking-[0.3em]">Compliance</label>
                </div>
                <MetaInput label="Margem Mínima (%)" value={commSettings.profitMargin} onChange={v => setCommSettings({...commSettings, profitMargin: v})} isHighlight />
              </section>
              
              <div className="pt-20">
                 <div className="bg-gradient-to-tr from-slate-900 to-slate-800 p-8 rounded-[3rem] border border-white/5 text-center shadow-inner">
                    <p className="text-[9px] font-black text-slate-500 uppercase tracking-[0.2em] mb-4">Storage Usage</p>
                    <div className="h-1.5 w-full bg-black rounded-full mb-4 p-0.5 overflow-hidden">
                       <div className="h-full bg-blue-600 rounded-full w-[65%] shadow-lg shadow-blue-500/20"></div>
                    </div>
                    <span className="text-[10px] font-black text-white">6.2GB / 10GB</span>
                 </div>
              </div>
            </div>
          )}
        </nav>
        
        {/* Toggle Sidebar */}
        <button onClick={() => setSidebarOpen(!sidebarOpen)} className="p-12 flex justify-center hover:bg-white/5 transition-all text-slate-600 hover:text-white group">
          <div className="flex items-center gap-4">
            <ArrowDownWideNarrow className={`transition-transform duration-700 ${sidebarOpen ? 'rotate-90' : '-rotate-90'}`} />
            {sidebarOpen && <span className="text-[10px] font-black uppercase tracking-[0.4em]">Recolher</span>}
          </div>
        </button>
      </aside>

      {/* ÁREA DE CONTEÚDO PRINCIPAL */}
      <main className="flex-1 flex flex-col overflow-hidden relative">
        
        {/* Header Superior */}
        <header className="h-32 bg-white/90 backdrop-blur-3xl border-b border-slate-200 flex items-center justify-between px-16 z-50">
          <div className="flex items-center gap-16">
            <div className="relative group">
              <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-blue-600 transition-colors" size={24}/>
              <input 
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                placeholder="Pesquisar leads, propostas ou etiquetas..."
                className="pl-16 pr-10 py-5 bg-slate-100/60 border-2 border-transparent focus:border-blue-500/20 focus:bg-white rounded-[2rem] outline-none w-[500px] font-bold text-slate-600 transition-all placeholder:text-slate-300 placeholder:font-black placeholder:uppercase placeholder:text-[10px] placeholder:tracking-widest"
              />
            </div>
            
            <div className="hidden xl:flex items-center gap-8 bg-slate-50 p-4 rounded-[1.8rem] border border-slate-100">
               <div className="flex -space-x-3">
                  {[1,2,3,4].map(i => (
                    <div key={i} className="w-10 h-10 rounded-full bg-slate-200 border-4 border-white shadow-sm flex items-center justify-center text-[10px] font-black">U{i}</div>
                  ))}
               </div>
               <div className="h-8 w-px bg-slate-200"></div>
               <div className="flex items-center gap-3">
                  <div className="w-3 h-3 bg-emerald-500 rounded-full animate-pulse"></div>
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">14 Online Now</span>
               </div>
            </div>
          </div>

          <div className="flex items-center gap-8">
             <button onClick={() => fetchLeads()} className="p-5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-2xl transition-all active:scale-90">
                <RefreshCw size={24} className={loading ? 'animate-spin' : ''}/>
             </button>
             <button 
                onClick={() => setIsModalOpen(true)} 
                className="bg-slate-950 text-white px-12 py-5 rounded-[2rem] font-black uppercase text-xs tracking-[0.2em] hover:bg-blue-600 transition-all hover:shadow-2xl hover:shadow-blue-500/40 flex items-center gap-4 active:scale-95 group"
             >
                <PlusCircle size={20} className="group-hover:rotate-90 transition-transform duration-500"/> Nova Oportunidade
             </button>
          </div>
        </header>

        {/* View Principal */}
        <div className="flex-1 overflow-auto p-16 custom-scrollbar bg-[#F8FAFC] relative">
          
          {/* Background Branding Decor */}
          <div className="absolute top-0 right-0 p-40 opacity-[0.02] pointer-events-none -mr-40 -mt-20">
             <Zap size={800} strokeWidth={1} className="text-slate-900"/>
          </div>

          {activeTab === 'pipeline' && <RenderPipeline />}
          {activeTab === 'commission' && <RenderCommission />}
          {activeTab === 'metrics' && <RenderMetrics />}
          {activeTab === 'logs' && <RenderAuditLogs />}

          {/* Footer Informativo */}
          <div className="mt-20 pt-10 border-t border-slate-200/50 flex items-center justify-between text-slate-400">
             <div className="flex items-center gap-8 font-black uppercase text-[9px] tracking-[0.3em]">
                <span>Processador: Quad-Core CRM-V5</span>
                <span>Uptime: 99.98%</span>
                <span className="flex items-center gap-2"><Globe size={10}/> Global Endpoint: São Paulo, BR</span>
             </div>
             <p className="font-black italic text-[11px] uppercase tracking-tighter">Powered by <span className="text-blue-600">Enterprise AI Layer</span></p>
          </div>
        </div>

        {/* =============================================================================
         * SECTION 8: MODAIS E OVERLAYS GIGANTES
         * =============================================================================
         */}

        {/* MODAL DE ADICIONAR LEAD */}
        {isModalOpen && (
          <div className="fixed inset-0 bg-slate-950/90 backdrop-blur-2xl z-[1000] flex items-center justify-center p-10 animate-in fade-in duration-300">
            <div className="bg-white w-full max-w-4xl rounded-[6rem] shadow-4xl relative overflow-hidden border-t-[40px] border-blue-600 animate-in zoom-in-95 duration-500">
              <button 
                onClick={() => setIsModalOpen(false)} 
                className="absolute top-10 right-10 p-6 bg-slate-50 text-slate-300 hover:text-rose-500 hover:bg-rose-50 rounded-full transition-all group"
              >
                <X size={40} className="group-hover:rotate-90 transition-transform duration-500"/>
              </button>

              <div className="p-24">
                <div className="mb-20">
                  <h2 className="text-8xl font-black italic uppercase tracking-tighter leading-[0.8]">Entrada de<br/><span className="text-blue-600 text-9xl">Negócio</span></h2>
                  <p className="text-slate-400 font-black uppercase tracking-[0.4em] mt-8 flex items-center gap-4"><Info size={20}/> Preencha os metadados do lead para iniciar o track comercial</p>
                </div>

                <div className="grid grid-cols-2 gap-16">
                  <div className="space-y-12">
                    <div className="group">
                      <label className="text-[11px] font-black text-slate-400 uppercase tracking-[0.5em] mb-4 block group-focus-within:text-blue-600 transition-colors">Nome da Oportunidade</label>
                      <input 
                        className="w-full bg-slate-50 p-10 rounded-[2.5rem] font-black text-4xl outline-none focus:bg-white border-4 border-transparent focus:border-blue-600 transition-all shadow-inner uppercase"
                        placeholder="NOME OU EMPRESA"
                        value={newLead.name}
                        onChange={e => setNewLead({...newLead, name: e.target.value})}
                        autoFocus
                      />
                    </div>
                    <div className="group">
                      <label className="text-[11px] font-black text-slate-400 uppercase tracking-[0.5em] mb-4 block group-focus-within:text-blue-600 transition-colors">Valor Estimado</label>
                      <div className="relative">
                        <span className="absolute left-8 top-1/2 -translate-y-1/2 text-3xl font-black italic text-slate-300">R$</span>
                        <input 
                          type="number"
                          className="w-full bg-slate-50 p-10 pl-24 rounded-[2.5rem] font-black text-6xl outline-none focus:bg-white border-4 border-transparent focus:border-blue-600 transition-all shadow-inner"
                          value={newLead.value}
                          onChange={e => setNewLead({...newLead, value: Number(e.target.value)})}
                        />
                      </div>
                    </div>
                  </div>

                  <div className="space-y-12">
                     <div className="group">
                        <label className="text-[11px] font-black text-slate-400 uppercase tracking-[0.5em] mb-4 block group-focus-within:text-blue-600 transition-colors">Canal de Entrada</label>
                        <select 
                          className="w-full bg-slate-50 p-10 rounded-[2.5rem] font-black text-2xl outline-none focus:bg-white border-4 border-transparent focus:border-blue-600 transition-all shadow-inner appearance-none cursor-pointer"
                          value={newLead.stage}
                          onChange={e => setNewLead({...newLead, stage: e.target.value})}
                        >
                          {STAGES.map(s => <option key={s.id} value={s.id}>{s.label}</option>)}
                        </select>
                     </div>
                     <div className="bg-blue-50 p-10 rounded-[3.5rem] border-2 border-dashed border-blue-200 flex items-center gap-8">
                        <div className="bg-blue-600 p-6 rounded-3xl text-white shadow-xl"><ShieldCheck size={32}/></div>
                        <p className="text-[11px] font-black text-blue-900 uppercase tracking-widest leading-relaxed">Este registro será auditado automaticamente pela camada financeira após a conversão em "Fechado".</p>
                     </div>
                  </div>
                </div>

                <div className="mt-20 flex gap-8">
                  <button 
                    onClick={() => setIsModalOpen(false)}
                    className="flex-1 py-12 border-4 border-slate-100 rounded-full font-black uppercase text-xl text-slate-300 hover:text-rose-500 hover:border-rose-500 transition-all active:scale-95"
                  >
                    Descartar Registro
                  </button>
                  <button 
                    onClick={handleCreateLead}
                    className="flex-[2] py-12 bg-slate-950 text-white rounded-full font-black uppercase text-2xl tracking-[0.3em] hover:bg-blue-600 shadow-2xl transition-all flex items-center justify-center gap-8 active:scale-95"
                  >
                    Confirmar Registro <ArrowRightCircle size={40}/>
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* MODAL DE DETALHES DO LEAD (EXPANDIDO) */}
        {selectedLead && (
           <div className="fixed inset-0 bg-slate-950/95 backdrop-blur-3xl z-[1100] flex justify-end animate-in slide-in-from-right-full duration-700">
              <div className="bg-white w-[1000px] h-full shadow-4xl flex flex-col relative">
                 <button onClick={() => setSelectedLead(null)} className="absolute top-12 -left-20 bg-white p-6 rounded-l-[3rem] text-slate-900 shadow-xl hover:text-blue-600 transition-colors"><ChevronRight size={32}/></button>
                 
                 {/* Header Detail */}
                 <div className="p-16 border-b-8 border-slate-50">
                    <div className="flex items-center gap-4 mb-8">
                       <span className="bg-blue-600 text-white px-6 py-2 rounded-full text-[10px] font-black uppercase tracking-widest italic shadow-lg">Lead Profile v5</span>
                       <span className="text-slate-300 font-black text-[10px] uppercase tracking-widest">ID: {selectedLead.id}</span>
                    </div>
                    <h2 className="text-7xl font-black italic uppercase tracking-tighter text-slate-950 mb-6">{selectedLead.name}</h2>
                    <div className="flex items-center gap-12">
                       <div className="flex items-center gap-4">
                          <DollarSign className="text-emerald-500" size={32}/>
                          <span className="text-5xl font-black italic tracking-tighter">R$ {selectedLead.value.toLocaleString()}</span>
                       </div>
                       <div className="h-10 w-px bg-slate-200"></div>
                       <div className="flex items-center gap-4">
                          <div className={`w-4 h-4 rounded-full ${STAGES.find(s => s.id === selectedLead.stage)?.color}`}></div>
                          <span className="text-2xl font-black uppercase text-slate-400 italic">{STAGES.find(s => s.id === selectedLead.stage)?.label}</span>
                       </div>
                    </div>
                 </div>

                 {/* Body Detail Content */}
                 <div className="flex-1 overflow-y-auto p-16 space-y-20 custom-scrollbar">
                    
                    {/* CRM Dashboard Mini */}
                    <div className="grid grid-cols-3 gap-8">
                       <DetailStat label="Último Update" val={new Date(selectedLead.lastUpdate).toLocaleDateString()} icon={<Clock size={20}/>}/>
                       <DetailStat label="Score Lead" val="8.4/10" icon={<Activity size={20}/>} isHigh />
                       <DetailStat label="Atividade" val="ALTA" icon={<Zap size={20}/>}/>
                    </div>

                    {/* Editor de Notas Robust */}
                    <section className="space-y-8">
                       <div className="flex items-center justify-between">
                          <h4 className="text-2xl font-black italic uppercase tracking-tighter flex items-center gap-6"><FileText className="text-blue-600"/> Histórico & Notas do Consultor</h4>
                          <span className="text-[10px] font-black text-slate-300 uppercase tracking-widest">Autosave Ativo</span>
                       </div>
                       <textarea 
                          className="w-full h-80 bg-slate-50 rounded-[4rem] p-12 text-xl font-bold text-slate-600 outline-none border-4 border-transparent focus:border-blue-500 focus:bg-white transition-all shadow-inner leading-relaxed"
                          placeholder="Digite aqui observações, notas de reuniões e próximos passos estratégicos..."
                          value={selectedLead.notes || ""}
                          onChange={e => updateLead(selectedLead.id, { notes: e.target.value })}
                       />
                    </section>

                    {/* Auditoria Checklist Detail */}
                    <section className="space-y-8">
                       <h4 className="text-2xl font-black italic uppercase tracking-tighter flex items-center gap-6"><ClipboardCheck className="text-blue-600"/> Validação de Etapa</h4>
                       <div className="grid grid-cols-2 gap-6">
                          <DetailCheck active={selectedLead.followUp} label="Follow-up Realizado" />
                          <DetailCheck active={selectedLead.hasUpSell} label="Análise de Up-sell" />
                          <DetailCheck active={selectedLead.hasCrossSell} label="Análise de Cross-sell" />
                          <DetailCheck active={selectedLead.reactivated} label="Status: Reativado" />
                       </div>
                    </section>

                    {/* Timeline de Eventos Detail */}
                    <section className="space-y-12">
                       <h4 className="text-2xl font-black italic uppercase tracking-tighter flex items-center gap-6"><History className="text-blue-600"/> Timeline do Cliente</h4>
                       <div className="space-y-10 pl-6 border-l-4 border-slate-100">
                          <TimelineStep time="Hoje" action="Lead editado por auditoria financeira" />
                          <TimelineStep time="2 dias atrás" action="Enviado proposta de cotação v2" />
                          <TimelineStep time="1 semana atrás" action="Entrada via prospecção externa" />
                       </div>
                    </section>
                 </div>

                 {/* Detail Footer */}
                 <div className="p-16 border-t border-slate-100 flex gap-6">
                    <button className="flex-1 py-10 bg-slate-950 text-white rounded-[2.5rem] font-black uppercase text-sm tracking-widest hover:bg-blue-600 transition-all flex items-center justify-center gap-4 active:scale-95">
                       <Printer size={18}/> Imprimir Report Lead
                    </button>
                    <button className="flex-1 py-10 border-4 border-slate-100 text-slate-300 rounded-[2.5rem] font-black uppercase text-sm tracking-widest hover:text-rose-600 hover:border-rose-600 transition-all flex items-center justify-center gap-4 active:scale-95">
                       <Archive size={18}/> Arquivar Permanentemente
                    </button>
                 </div>
              </div>
           </div>
        )}
      </main>
    </div>
  );
}

/**
 * =============================================================================
 * SECTION 9: MINI SUBCOMPONENTES (O SEGREDO DA DENSIDADE UI)
 * =============================================================================
 */

function SidebarBtn({ icon, label, active, onClick, open }: any) {
  return (
    <button 
      onClick={onClick} 
      className={`w-full flex items-center gap-8 p-8 rounded-[2.5rem] transition-all duration-500 group relative ${active ? 'bg-blue-600 text-white shadow-2xl shadow-blue-500/40 translate-x-4' : 'text-slate-500 hover:bg-white/5 hover:text-white'}`}
    >
      <span className={`transition-transform duration-500 ${active ? 'scale-125' : 'group-hover:scale-110'}`}>{icon}</span>
      {open && <span className="font-black uppercase text-[11px] tracking-[0.3em] whitespace-nowrap">{label}</span>}
      {active && <div className="absolute right-6 w-2 h-2 bg-white rounded-full animate-ping"></div>}
    </button>
  );
}

function MetaInput({ label, value, onChange, icon, isHighlight }: any) {
  return (
    <div className="group">
      <div className="flex items-center gap-3 mb-4">
        {icon && <span className="text-slate-700 group-focus-within:text-blue-500 transition-colors">{icon}</span>}
        <label className={`text-[10px] font-black uppercase tracking-widest ${isHighlight ? 'text-blue-400' : 'text-slate-600 group-focus-within:text-white'}`}>{label}</label>
      </div>
      <input 
        type="number" 
        value={value} 
        onChange={e => onChange(Number(e.target.value))} 
        className="w-full bg-transparent border-b-2 border-white/10 text-white font-black text-4xl py-4 outline-none focus:border-blue-500 transition-all placeholder:text-slate-800"
      />
    </div>
  );
}

function MiniActionBtn({ active, label, onClick, color, isFull }: any) {
  return (
    <button 
      onClick={onClick} 
      className={`py-3.5 px-4 rounded-2xl text-[10px] font-black transition-all border-2 flex items-center justify-center gap-2 ${isFull ? 'w-full' : ''} ${active ? `${color} border-transparent text-white shadow-lg scale-[1.03]` : 'bg-white border-slate-100 text-slate-300 hover:border-slate-300'}`}
    >
      {active && <Check size={12} strokeWidth={4}/>}
      {label}
    </button>
  );
}

function AuditMetric({ label, val, sub, isHighlight }: any) {
  return (
    <div className="text-center group cursor-default">
       <p className="text-[11px] font-black text-slate-500 uppercase tracking-[0.4em] mb-4 group-hover:text-blue-400 transition-colors">{label}</p>
       <p className={`text-7xl font-black italic tracking-tighter leading-none mb-3 ${isHighlight ? 'text-blue-500' : 'text-white'}`}>{val}</p>
       <p className="text-[9px] font-black text-slate-600 uppercase tracking-widest">{sub}</p>
    </div>
  );
}

function AcceleratorCard({ status, label, desc, current, bonus }: any) {
  return (
    <div className={`p-10 rounded-[4rem] border-2 transition-all duration-700 flex items-center gap-10 ${status ? 'bg-emerald-500/5 border-emerald-500/20 shadow-xl' : 'bg-slate-50 border-slate-100 opacity-40'}`}>
       <div className={`w-24 h-24 rounded-[2.5rem] flex items-center justify-center shadow-2xl transition-transform duration-700 ${status ? 'bg-emerald-500 text-white rotate-12 group-hover:rotate-0' : 'bg-slate-200 text-slate-400'}`}>
          {status ? <Award size={48}/> : <Lock size={32}/>}
       </div>
       <div className="flex-1">
          <div className="flex items-center gap-4 mb-2">
            <h4 className={`font-black uppercase text-lg italic tracking-tighter ${status ? 'text-slate-900' : 'text-slate-400'}`}>{label}</h4>
            {status && <span className="bg-emerald-500 text-white px-4 py-1 rounded-full text-[9px] font-black italic">{bonus}</span>}
          </div>
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-6">{desc}</p>
          <div className="bg-white/80 border border-slate-100 px-6 py-3 rounded-2xl text-[13px] font-black text-slate-900 shadow-sm inline-flex items-center gap-3 italic">
             <Activity size={14} className="text-blue-600"/> Real: {current}
          </div>
       </div>
    </div>
  );
}

function MetricCard({ label, val, icon, color, sub }: any) {
  return (
    <div className="bg-white p-16 rounded-[5rem] shadow-sm border border-slate-100 hover:shadow-2xl hover:-translate-y-2 transition-all duration-500 group">
       <div className="flex justify-between items-start mb-12">
          <div className={`p-6 rounded-[2.5rem] bg-slate-50 transition-colors group-hover:bg-slate-900 group-hover:text-white ${color}`}>{icon}</div>
          <div className="text-right">
             <p className="text-[11px] font-black text-slate-400 uppercase tracking-[0.4em] mb-3">{label}</p>
             <p className={`text-6xl font-black italic tracking-tighter text-slate-950`}>{val}</p>
          </div>
       </div>
       <div className="pt-8 border-t border-slate-50 flex items-center justify-between">
          <span className="text-[10px] font-black text-slate-300 uppercase tracking-widest">{sub}</span>
          <ArrowRight className="text-slate-200 group-hover:text-blue-500 group-hover:translate-x-2 transition-all" size={20}/>
       </div>
    </div>
  );
}

function ComboItem({ active, label }: any) {
  return (
    <div className={`flex items-center gap-6 p-6 rounded-[2.5rem] border-2 transition-all ${active ? 'bg-blue-600 border-transparent text-white shadow-xl translate-x-3' : 'bg-slate-50 border-slate-100 text-slate-400'}`}>
       <div className={`p-3 rounded-full ${active ? 'bg-white text-blue-600' : 'bg-slate-200 text-slate-400'}`}>
          {active ? <Check size={20} strokeWidth={4}/> : <X size={20} strokeWidth={4}/>}
       </div>
       <span className="font-black uppercase text-[10px] tracking-widest">{label}</span>
    </div>
  );
}

function FunnelStep({ label, current, meta, color, isPercent }: any) {
  const progress = Math.min((current / meta) * 100, 100);
  return (
    <div className="group">
       <div className="flex justify-between items-end mb-5">
          <div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] mb-2">{label}</p>
            <p className="text-4xl font-black italic tracking-tighter">
              {isPercent ? `${current.toFixed(1)}%` : current} 
              <span className="text-xs not-italic text-slate-300 ml-3">/ Meta: {isPercent ? `${meta}%` : meta}</span>
            </p>
          </div>
          <span className={`text-xs font-black italic ${progress >= 100 ? 'text-emerald-500' : 'text-blue-600'}`}>{progress.toFixed(0)}%</span>
       </div>
       <div className="h-6 w-full bg-slate-50 rounded-full p-1.5 shadow-inner relative overflow-hidden">
          <div className={`h-full rounded-full transition-all duration-1000 shadow-lg ${color}`} style={{ width: `${progress}%` }}></div>
       </div>
    </div>
  );
}

function AuditRow({ label, val, status }: any) {
  return (
    <tr className="group hover:bg-slate-50 transition-colors">
       <td className="py-10 text-[13px] font-black text-slate-950 uppercase italic tracking-tight">{label}</td>
       <td className="py-10 text-center font-black text-slate-400 text-lg italic">{val}</td>
       <td className="py-10 text-right">
          <div className={`inline-flex items-center gap-4 px-6 py-2 rounded-full border-2 ${status ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-slate-50 text-slate-300 border-slate-100'}`}>
             <span className="text-[10px] font-black uppercase tracking-widest">{status ? 'Validado' : 'Em Aberto'}</span>
             {status ? <CheckCircle2 size={18}/> : <AlertCircle size={18}/>}
          </div>
       </td>
    </tr>
  );
}

function DetailStat({ label, val, icon, isHigh }: any) {
  return (
    <div className="bg-slate-50 p-8 rounded-[3rem] border border-slate-100 text-center group hover:bg-white hover:shadow-xl transition-all duration-500">
       <div className={`inline-flex p-4 rounded-2xl mb-4 ${isHigh ? 'bg-blue-600 text-white' : 'bg-white text-slate-400 shadow-sm'}`}>{icon}</div>
       <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">{label}</p>
       <p className="text-4xl font-black italic tracking-tighter text-slate-900 uppercase">{val}</p>
    </div>
  );
}

function DetailCheck({ active, label }: any) {
  return (
    <div className={`flex items-center gap-6 p-8 rounded-[3rem] border-4 transition-all ${active ? 'bg-emerald-50 border-emerald-100 text-emerald-700' : 'bg-slate-50 border-slate-100 text-slate-300'}`}>
       <div className={`p-4 rounded-full ${active ? 'bg-emerald-500 text-white shadow-lg' : 'bg-white text-slate-200 shadow-inner'}`}>
          {active ? <Check size={24} strokeWidth={4}/> : <X size={24} strokeWidth={4}/>}
       </div>
       <span className="font-black uppercase text-sm tracking-widest">{label}</span>
    </div>
  );
}

function TimelineStep({ time, action }: any) {
  return (
    <div className="relative group">
       <div className="absolute -left-[34px] top-1 w-5 h-5 bg-white border-4 border-slate-100 rounded-full group-hover:border-blue-500 transition-colors z-10"></div>
       <p className="text-[10px] font-black text-blue-500 uppercase tracking-[0.2em] mb-1">{time}</p>
       <p className="text-xl font-bold text-slate-600 uppercase tracking-tight">{action}</p>
    </div>
  );
}

// FIM DO CÓDIGO - VERSÃO ENTERPRISE V5.2 PLATINUM
