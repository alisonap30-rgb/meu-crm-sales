import React, { useState, useEffect, useMemo } from 'react';
import { createClient } from '@supabase/supabase-js';
import { 
  TrendingUp, Layers, ArrowDownWideNarrow, BarChart, 
  DollarSign, Archive, PlusCircle, Trash2, Info, 
  ShieldCheck, Zap, Award, Settings, 
  Search, RotateCcw, X, ArrowRight, Activity, PieChart
} from 'lucide-react';
import { Toaster, toast } from 'sonner';

// --- CONFIGURAÇÃO SUPABASE ---
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
const supabase = (supabaseUrl && supabaseAnonKey) ? createClient(supabaseUrl, supabaseAnonKey) : null;

// --- CONSTANTES DE NEGÓCIO ---
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

// --- COMPONENTES DE UI COM ALTO CONTRASTE ---

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

const FinanceRule = ({ label, val, active }) => (
  <div className={`flex justify-between items-center p-6 rounded-[2rem] border-2 transition-all ${
    active ? 'bg-white/10 border-emerald-500 shadow-lg' : 'bg-white/5 border-transparent opacity-30'
  }`}>
    <span className="text-[10px] font-black uppercase tracking-widest text-white">{label}</span>
    <span className={`text-sm font-black ${active ? 'text-emerald-400' : 'text-slate-100'}`}>{val}</span>
  </div>
);

const ParamInput = ({ label, val, onChange }) => (
  <div className="flex flex-col gap-3">
    <label className="text-[11px] font-black text-slate-600 uppercase tracking-[0.2em] ml-6">
      {label}
    </label>
    <input 
      type="number" 
      className="w-full p-6 border-2 border-slate-300 rounded-[2rem] font-black bg-white text-slate-900 text-xl outline-none focus:border-blue-600 focus:ring-4 focus:ring-blue-100 transition-all shadow-md" 
      value={val} 
      onChange={e => onChange(e.target.value)} 
    />
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

  const [commSettings, setCommSettings] = useState({
    profitMargin: 20,
    weeks: {
      1: { revenue: 0 }, 2: { revenue: 0 }, 3: { revenue: 0 }, 4: { revenue: 0 }
    }
  });

  const [newLead, setNewLead] = useState({
    name: '', value: '', vendor: 'Vendedor 1', notes: '', 
    stage: 'contato', tags: '', followUp: false, 
    postSale: false, hasCrossSell: false, hasUpSell: false, reactivated: false
  });

  // --- PERSISTÊNCIA E REALTIME ---
  const fetchLeads = async () => {
    if (!supabase) return;
    const { data, error } = await supabase
      .from('leads')
      .select('*')
      .order('created_at', { ascending: false });
    
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
    
    if (error) {
      toast.error("Erro na Sincronização");
      console.error(error);
    }
    setIsSaving(false);
  };

  const handleCreateLead = async () => {
    if (!newLead.name.trim() || !newLead.value) {
      toast.error('Campos Obrigatórios Vazios');
      return;
    }
    await handleSaveLead({ ...newLead, week: currentWeek, isArchived: false });
    setIsModalOpen(false);
    setNewLead({ name: '', value: '', vendor: 'Vendedor 1', notes: '', stage: 'contato', tags: '', followUp: false, postSale: false, hasCrossSell: false, hasUpSell: false, reactivated: false });
    toast.success("Oportunidade Ativada!");
  };

  const deleteLead = async (id) => {
    if (!supabase) return;
    const { error } = await supabase.from('leads').delete().eq('id', id);
    if (!error) toast.success("Lead Removido");
  };

  useEffect(() => {
    if (!supabase) { setLoading(false); return; }
    fetchLeads();
    const sub = supabase.channel('sync_ultra')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'leads' }, fetchLeads)
      .subscribe();
    return () => { supabase.removeChannel(sub); };
  }, []);

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

  if (loading) return (
    <div className="h-screen bg-slate-900 flex items-center justify-center font-black text-blue-500 italic animate-pulse">
      BOOTING SALESPRO CORE...
    </div>
  );

  return (
    <div className="min-h-screen bg-[#F1F5F9] p-4 md:p-8 font-sans text-slate-900">
      <Toaster position="top-right" richColors />
      
      {/* HEADER */}
      <header className="max-w-[1600px] mx-auto mb-10 flex flex-col xl:flex-row justify-between items-center gap-8">
        <div className="flex items-center gap-6">
          <div className="bg-slate-900 p-5 rounded-[2.5rem] shadow-2xl">
            <TrendingUp className="text-blue-500" size={32} />
          </div>
          <div>
            <h1 className="text-4xl font-black tracking-tighter text-slate-900 italic uppercase">Sales<span className="text-blue-600">Pro</span> Ultra</h1>
            <p className="text-[11px] font-black text-slate-500 uppercase tracking-[0.4em] flex items-center gap-2">
              <span className="w-2 h-2 bg-emerald-500 rounded-full animate-ping"></span> Live Control Panel
            </p>
          </div>
        </div>

        <div className="flex flex-wrap justify-center gap-3 bg-white p-3 rounded-[3rem] shadow-xl border border-white">
          <div className="flex bg-slate-100 p-1.5 rounded-2xl mr-4">
            {[1, 2, 3, 4].map(w => (
              <button key={w} onClick={() => setCurrentWeek(w)} className={`px-5 py-2.5 rounded-xl font-black text-xs transition-all ${currentWeek === w ? 'bg-white text-blue-600 shadow-md scale-105' : 'text-slate-400'}`}>
                S{w}
              </button>
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
              <button key={tab.id} onClick={() => setActiveTab(tab.id)} className={`px-6 py-3 rounded-2xl font-black text-[10px] uppercase transition-all ${activeTab === tab.id ? 'bg-slate-900 text-white shadow-2xl scale-105' : 'text-slate-500 hover:bg-slate-50'}`}>
                <span className="flex items-center gap-2">{tab.icon} {tab.label}</span>
              </button>
            ))}
          </nav>
          <button onClick={() => setIsModalOpen(true)} className="bg-blue-600 text-white p-4 rounded-full shadow-lg hover:scale-110 transition-all ml-2 active:scale-95">
            <PlusCircle size={22} />
          </button>
        </div>
      </header>

      <main className="max-w-[1600px] mx-auto">
        {/* VIEW: PIPELINE (PRINCIPAL) */}
        {activeTab === 'pipeline' && (
          <div className="grid grid-cols-1 md:grid-cols-5 gap-6 animate-in fade-in duration-500">
            {STAGES.map(stage => {
              const stageLeads = leads.filter(l => l.stage === stage.id && Number(l.week) === currentWeek && !l.isArchived);
              const columnValue = stageLeads.reduce((acc, curr) => acc + (Number(curr.value) || 0), 0);
              return (
                <div 
                  key={stage.id} 
                  onDragOver={(e) => e.preventDefault()} 
                  onDrop={(e) => {
                    const id = e.dataTransfer.getData("leadId");
                    const lead = leads.find(l => String(l.id) === String(id));
                    if (lead) handleSaveLead({ ...lead, stage: stage.id });
                  }} 
                  className="bg-slate-200/50 p-6 rounded-[3rem] border-2 border-dashed border-slate-300 min-h-[600px]"
                >
                  <div className="mb-8 px-2 flex justify-between items-start">
                    <div>
                      <h3 className="font-black text-[10px] uppercase text-slate-500 tracking-[0.2em] mb-1">{stage.label}</h3>
                      <p className="text-xl font-black text-slate-900 tracking-tighter italic">R$ {columnValue.toLocaleString()}</p>
                    </div>
                    <span className="bg-white px-3 py-1 rounded-full text-[10px] font-black text-slate-900 border border-slate-200 shadow-sm">{stageLeads.length}</span>
                  </div>
                  
                  <div className="space-y-5">
                    {stageLeads.map(lead => (
                      <div 
                        key={lead.id} 
                        draggable 
                        onDragStart={(e) => e.dataTransfer.setData("leadId", lead.id)} 
                        className="bg-white p-6 rounded-[2.5rem] shadow-md border-2 border-white hover:border-blue-400 hover:shadow-2xl relative group cursor-grab active:cursor-grabbing transition-all"
                      >
                        <button onClick={() => deleteLead(lead.id)} className="absolute -right-2 -top-2 bg-white text-rose-500 p-2 rounded-full shadow-xl border border-slate-100 opacity-0 group-hover:opacity-100 transition-all">
                          <Trash2 size={12}/>
                        </button>
                        
                        <h4 className="font-black text-xs text-slate-900 uppercase mb-1 tracking-tight">{lead.name}</h4>
                        <div className="text-emerald-600 font-black text-sm mb-4 italic">R$ {Number(lead.value).toLocaleString()}</div>
                        
                        <div className="grid grid-cols-2 gap-2 mb-4">
                           <QuickAction label="FUP" active={lead.followUp} color="bg-blue-600" onClick={() => handleSaveLead({...lead, followUp: !lead.followUp})} />
                           <QuickAction label="PÓS" active={lead.postSale} color="bg-emerald-600" onClick={() => handleSaveLead({...lead, postSale: !lead.postSale})} />
                        </div>
                        
                        <div className="flex justify-between items-center pt-4 border-t border-slate-50">
                           <button onClick={() => handleSaveLead({...lead, isArchived: true})} className="text-[9px] font-black text-slate-400 hover:text-slate-900 uppercase transition-colors">Arquivar</button>
                           <div className="flex gap-1">
                             {AVAILABLE_TAGS.map(tag => (
                               <div key={tag.id} className={`w-3 h-3 rounded-full ${lead.tags?.includes(tag.id) ? tag.color : 'bg-slate-100'}`} />
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

        {/* VIEW: FUNIL DE VENDAS */}
        {activeTab === 'funnel' && (
          <div className="max-w-4xl mx-auto space-y-2 animate-in slide-in-from-bottom-10">
            <FunnelStep label="Total Leads (Contatos)" count={analytics.funnel.contato} percent={100} color="bg-slate-900" />
            <div className="flex justify-center w-full py-1">
              <div className="bg-white border text-[10px] font-black px-4 py-1.5 rounded-full shadow-md text-blue-600 border-blue-100 uppercase italic">
                {analytics.rates.c2o.toFixed(1)}% Conversão Proposta
              </div>
            </div>
            <FunnelStep label="Propostas Realizadas" count={analytics.funnel.orcamento} percent={analytics.rates.c2o} color="bg-blue-600" />
            <div className="flex justify-center w-full py-1">
              <div className="bg-white border text-[10px] font-black px-4 py-1.5 rounded-full shadow-md text-indigo-600 border-indigo-100 uppercase italic">
                {analytics.rates.o2n.toFixed(1)}% Conversão Negociação
              </div>
            </div>
            <FunnelStep label="Em Negociação Final" count={analytics.funnel.negociacao} percent={analytics.rates.o2n * (analytics.rates.c2o/100)} color="bg-indigo-600" />
            <div className="flex justify-center w-full py-1">
              <div className="bg-white border text-[10px] font-black px-4 py-1.5 rounded-full shadow-md text-emerald-600 border-emerald-100 uppercase italic">
                {analytics.rates.n2f.toFixed(1)}% Fechamento Final
              </div>
            </div>
            <FunnelStep label="Vendas Concluídas" count={analytics.funnel.fechado} percent={analytics.rates.total} color="bg-emerald-500" />
          </div>
        )}

        {/* VIEW: KPIs SEMANAIS */}
        {activeTab === 'metrics' && (
          <div className="bg-white rounded-[4rem] shadow-2xl border-4 border-white overflow-hidden animate-in zoom-in-95">
             <table className="w-full">
                <thead className="bg-slate-900 text-white font-black uppercase text-[10px] tracking-widest">
                   <tr>
                      <th className="p-14 text-left">Indicador de Performance</th>
                      <th className="p-14">Meta</th>
                      <th className="p-14">S-01</th>
                      <th className="p-14">S-02</th>
                      <th className="p-14">S-03</th>
                      <th className="p-14">S-04</th>
                      <th className="p-14 bg-blue-600 shadow-xl">Consolidado</th>
                   </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                   <KPIRow title="Novos Contatos Realizados" meta={goals.contacts} total={analytics.funnel.contato} field="contato" data={leads} format={v => v} />
                   <KPIRow title="Execução de Follow-up (%)" meta={`${goals.followUp}%`} total={`${analytics.kpis.fup.toFixed(0)}%`} field="fup" data={leads} format={v => `${v.toFixed(0)}%`} isPercent />
                   <KPIRow title="Fidelização / Pós-Venda" meta={`${goals.postSale}%`} total={`${analytics.kpis.post.toFixed(0)}%`} field="post" data={leads} format={v => `${v.toFixed(0)}%`} isPercent />
                   <KPIRow title="Cross-Sell de Produtos" meta={`${goals.crossSell}%`} total={`${analytics.kpis.cross.toFixed(0)}%`} field="cross" data={leads} format={v => `${v.toFixed(0)}%`} isPercent />
                </tbody>
             </table>
          </div>
        )}

        {/* VIEW: FINANCEIRO E COMISSÕES */}
        {activeTab === 'commission' && (
          <div className="space-y-10 animate-in fade-in duration-500">
             <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
                <div className="lg:col-span-2 bg-slate-900 p-16 rounded-[4.5rem] text-white shadow-2xl relative overflow-hidden">
                   <div className="relative z-10">
                      <p className="text-blue-500 font-black uppercase tracking-[0.3em] mb-4 italic">Faturamento Bruto Consolidado</p>
                      <h3 className="text-8xl font-black font-mono tracking-tighter mb-10">R$ {analytics.totalRev.toLocaleString()}</h3>
                      <div className="grid grid-cols-3 gap-10 pt-10 border-t border-white/10">
                         <div><p className="text-[10px] opacity-40 uppercase mb-2">Ticket Médio</p><p className="text-3xl font-black italic">R$ {analytics.avgTicket.toLocaleString()}</p></div>
                         <div><p className="text-[10px] opacity-40 uppercase mb-2">Atingimento Meta</p><p className="text-3xl font-black text-emerald-400">{analytics.revPerf.toFixed(1)}%</p></div>
                         <div><p className="text-[10px] opacity-40 uppercase mb-2">Comissão Real (%)</p><p className="text-3xl font-black">{analytics.finalRate.toFixed(1)}%</p></div>
                      </div>
                   </div>
                   <div className="absolute top-0 right-0 p-20 opacity-10"><PieChart size={300}/></div>
                </div>
                
                <div className="bg-white p-16 rounded-[4.5rem] border-[12px] border-emerald-500 shadow-2xl flex flex-col justify-center text-center">
                   <Award className="mx-auto mb-6 text-emerald-600" size={64}/>
                   <p className="text-slate-500 font-black uppercase tracking-widest mb-2 italic">Remuneração Variável</p>
                   <h3 className="text-7xl text-slate-900 font-black font-mono tracking-tighter shadow-sm">R$ {analytics.finalCommission.toLocaleString()}</h3>
                   <div className={`mt-10 p-5 rounded-3xl font-black text-[11px] uppercase shadow-inner ${analytics.bonusFixoHabilitado ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-400'}`}>
                      {analytics.bonusFixoHabilitado ? '🚀 Bônus R$ 300 Habilitado' : '🔒 Bônus Pendente'}
                   </div>
                </div>
             </div>

             <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
                <FinanceBox title="Aceleradores Ativos" icon={<Zap size={18}/>}>
                   <FinanceRule label="Ticket Médio > Meta" val="+ 0.5%" active={analytics.avgTicket >= goals.ticket} />
                   <FinanceRule label="Taxa Cross-Sell > Meta" val="+ 0.5%" active={analytics.kpis.cross >= goals.crossSell} />
                   <FinanceRule label="Taxa Up-Sell > Meta" val="+ 0.5%" active={analytics.kpis.up >= goals.upSell} />
                </FinanceBox>
                
                <FinanceBox title="Trava de Bônus (Checklist)" icon={<ShieldCheck size={18}/>}>
                   <FinanceRule label="Mínimo 40 Contatos" val={analytics.funnel.contato} active={analytics.funnel.contato >= goals.contacts} />
                   <FinanceRule label="Follow-up Mínimo 80%" val={`${analytics.kpis.fup.toFixed(0)}%`} active={analytics.kpis.fup >= goals.followUp} />
                   <FinanceRule label="Pós-Venda Mínimo 90%" val={`${analytics.kpis.post.toFixed(0)}%`} active={analytics.kpis.post >= goals.postSale} />
                </FinanceBox>

                <div className="bg-white p-12 rounded-[4rem] border-4 border-white shadow-2xl">
                   <h4 className="text-xs font-black uppercase mb-10 text-slate-500 flex items-center gap-4 italic"><Settings size={18}/> Parametrização do Ciclo</h4>
                   <div className="space-y-8">
                      <ParamInput label="Meta Mensal Receita (R$)" val={goals.revenue} onChange={v => setGoals({...goals, revenue: v})} />
                      <ParamInput label="Meta Ticket Médio (R$)" val={goals.ticket} onChange={v => setGoals({...goals, ticket: v})} />
                      <div className="p-6 bg-blue-50 rounded-3xl border border-blue-100">
                         <p className="text-[10px] font-black text-blue-800 uppercase mb-2">Dica de Gestão</p>
                         <p className="text-[11px] text-blue-600 font-bold leading-relaxed italic">Ajuste as metas no início do mês para alinhar o motor de aceleradores de comissão.</p>
                      </div>
                   </div>
                </div>
             </div>
          </div>
        )}

        {/* VIEW: HISTÓRICO / ARQUIVO */}
        {activeTab === 'archive' && (
          <div className="space-y-10 animate-in fade-in duration-500">
             <div className="bg-white p-10 rounded-[3rem] border-4 border-white shadow-xl flex justify-between items-center">
                <div className="flex items-center gap-6">
                   <div className="bg-slate-900 p-4 rounded-3xl text-white shadow-lg"><Archive size={24}/></div>
                   <div>
                      <h3 className="text-2xl font-black uppercase italic tracking-tighter">Arquivo de Inteligência</h3>
                      <p className="text-[10px] text-slate-500 font-black uppercase tracking-widest">Histórico de Oportunidades</p>
                   </div>
                </div>
                <div className="relative w-96">
                   <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-400" size={20}/>
                   <input 
                      type="text" 
                      placeholder="Filtrar por nome ou empresa..." 
                      className="w-full p-6 pl-16 rounded-3xl border-2 border-slate-200 bg-white font-black text-slate-900 text-sm outline-none focus:border-blue-600 transition-all shadow-inner" 
                      onChange={e => setSearchTerm(e.target.value)} 
                   />
                </div>
             </div>

             <div className="bg-white rounded-[4rem] shadow-2xl border-4 border-white overflow-hidden">
                <table className="w-full text-left">
                   <thead className="bg-slate-50 text-slate-500 font-black uppercase text-[10px] tracking-widest border-b border-slate-100">
                      <tr>
                        <th className="p-10">Lead / Empresa</th>
                        <th className="p-10">Vendedor Original</th>
                        <th className="p-10 text-center">Valor Base</th>
                        <th className="p-10 text-center">Restaurar</th>
                      </tr>
                   </thead>
                   <tbody className="divide-y divide-slate-100 font-bold text-slate-700 text-xs">
                      {leads.filter(l => l.isArchived).filter(l => l.name.toLowerCase().includes(searchTerm.toLowerCase())).map(lead => (
                        <tr key={lead.id} className="hover:bg-slate-50 transition-all uppercase">
                           <td className="p-10 font-black text-slate-900">{lead.name}</td>
                           <td className="p-10"><span className="bg-slate-100 px-4 py-1.5 rounded-xl border border-slate-200">{lead.vendor}</span></td>
                           <td className="p-10 text-center text-emerald-600 font-black italic">R$ {Number(lead.value).toLocaleString()}</td>
                           <td className="p-10 text-center">
                              <button 
                                onClick={() => handleSaveLead({...lead, isArchived: false})} 
                                className="p-4 rounded-2xl border-2 border-slate-100 hover:border-blue-600 hover:bg-blue-600 hover:text-white transition-all shadow-sm active:scale-90"
                              >
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

      {/* MODAL: NOVO LEAD (SUPER ALTO CONTRASTE) */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/90 backdrop-blur-xl flex items-center justify-center p-4 z-[300] animate-in fade-in duration-300">
          <div className="bg-white rounded-[4rem] p-16 max-w-2xl w-full shadow-2xl border-t-[16px] border-blue-600 relative overflow-hidden">
            <button onClick={() => setIsModalOpen(false)} className="absolute top-10 right-10 text-slate-400 hover:text-rose-500 transition-colors">
              <X size={36} strokeWidth={3}/>
            </button>
            
            <h2 className="text-4xl font-black mb-12 uppercase italic tracking-tighter text-slate-900">Nova <span className="text-blue-600 underline">Oportunidade</span></h2>
            
            <div className="space-y-10">
               <div className="space-y-4">
                  <label className="text-[11px] font-black text-slate-600 uppercase tracking-widest ml-4 italic underline decoration-blue-500 underline-offset-4">
                    Identificação do Lead
                  </label>
                  <input 
                    className="w-full p-8 rounded-[2.5rem] border-2 border-slate-300 bg-white font-black text-slate-900 text-xl outline-none focus:border-blue-600 focus:ring-4 focus:ring-blue-50 transition-all shadow-md" 
                    value={newLead.name} 
                    onChange={e => setNewLead({...newLead, name: e.target.value})} 
                    placeholder="Ex: Corporativo Internacional S.A" 
                  />
               </div>

               <div className="grid grid-cols-2 gap-10">
                  <div className="space-y-4">
                     <label className="text-[11px] font-black text-slate-600 uppercase tracking-widest ml-4 italic underline decoration-blue-500 underline-offset-4">
                       Valor (R$)
                     </label>
                     <input 
                        type="number" 
                        className="w-full p-8 rounded-[2.5rem] border-2 border-slate-300 bg-white font-black text-slate-900 text-xl outline-none focus:border-blue-600 focus:ring-4 focus:ring-blue-50 transition-all shadow-md" 
                        value={newLead.value} 
                        onChange={e => setNewLead({...newLead, value: e.target.value})} 
                        placeholder="0.00" 
                     />
                  </div>
                  <div className="space-y-4">
                     <label className="text-[11px] font-black text-slate-600 uppercase tracking-widest ml-4 italic underline decoration-blue-500 underline-offset-4">
                       Vendedor
                     </label>
                     <select 
                        className="w-full p-8 rounded-[2.5rem] border-2 border-slate-300 bg-white font-black text-slate-900 text-xl outline-none focus:border-blue-600 transition-all shadow-md appearance-none" 
                        value={newLead.vendor} 
                        onChange={e => setNewLead({...newLead, vendor: e.target.value})}
                     >
                        <option>Vendedor 1</option>
                        <option>Vendedor 2</option>
                        <option>Canal Digital</option>
                     </select>
                  </div>
               </div>

               <div className="p-8 bg-slate-50 rounded-[3rem] border-2 border-slate-100 flex items-center justify-between shadow-inner">
                  <div className="flex items-center gap-5">
                     <div 
                        className={`p-5 rounded-full shadow-lg transition-all cursor-pointer ${newLead.reactivated ? 'bg-blue-600 text-white rotate-12 scale-110' : 'bg-white text-slate-300 border-2'}`}
                        onClick={() => setNewLead({...newLead, reactivated: !newLead.reactivated})}
                     >
                        <Activity size={28}/>
                     </div>
                     <div>
                        <p className="text-[12px] font-black uppercase tracking-widest text-slate-900 italic">Lead Reativado?</p>
                        <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Habilita bônus extra de histórico</p>
                     </div>
                  </div>
                  <div 
                    className={`w-16 h-9 rounded-full border-2 p-1 transition-all cursor-pointer ${newLead.reactivated ? 'bg-blue-600 border-blue-600 shadow-lg' : 'bg-slate-200 border-slate-200'}`}
                    onClick={() => setNewLead({...newLead, reactivated: !newLead.reactivated})}
                  >
                     <div className={`w-6 h-6 bg-white rounded-full shadow-xl transition-all ${newLead.reactivated ? 'translate-x-7' : 'translate-x-0'}`}></div>
                  </div>
               </div>

               <button 
                disabled={isSaving || !newLead.name || !newLead.value} 
                onClick={handleCreateLead} 
                className="w-full bg-blue-600 text-white p-10 rounded-[3rem] font-black uppercase shadow-[0_20px_50px_rgba(37,99,235,0.3)] hover:bg-blue-700 hover:scale-[1.02] active:scale-95 transition-all text-xl flex items-center justify-center gap-4 group"
               >
                  {isSaving ? 'Sincronizando Sistema...' : 'Ativar Oportunidade Agora'} 
                  <ArrowRight size={28} className="group-hover:translate-x-3 transition-transform duration-300"/>
               </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
