import React, { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import { 
  TrendingUp, PlusCircle, Trash2, BarChart2, Target, AlertCircle, Archive, 
  RotateCcw, Tag as TagIcon, Info, CheckCircle2, ChevronRight, DollarSign,
  User, Calendar, FileText, ClipboardList, ShieldCheck, Zap, ArrowRight,
  Clock, Award, BarChart, Grab, Search, Filter, Settings
} from 'lucide-react';

// --- CONFIGURAÇÃO SUPABASE ---
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || "";
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || "";
const supabase = (SUPABASE_URL && SUPABASE_KEY) ? createClient(SUPABASE_URL, SUPABASE_KEY) : null;

const AVAILABLE_TAGS = [
  { id: 'proposta', label: 'PROPOSTA ENVIADA', color: 'bg-blue-500' },
  { id: 'followup', label: 'AGUARDANDO RETORNO', color: 'bg-amber-500' },
  { id: 'urgente', label: 'PRIORIDADE ALTA', color: 'bg-red-500' },
  { id: 'reuniao', label: 'REUNIÃO AGENDADA', color: 'bg-emerald-500' },
];

export default function CRMSystem() {
  // --- ESTADOS CORE ---
  const [currentWeek, setCurrentWeek] = useState(1);
  const [activeTab, setActiveTab] = useState('pipeline');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterCycle, setFilterCycle] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  
  const [newLead, setNewLead] = useState({ 
    name: '', value: '', vendor: 'Vendedor 1', notes: '', tags: '', stage: 'contato' 
  });

  // --- CONFIGURAÇÃO DE METAS E REGRAS ---
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

  const [commissionData, setCommissionData] = useState({
    weeks: { 
      1: { revenue: 0, ticket: 0 }, 
      2: { revenue: 0, ticket: 0 }, 
      3: { revenue: 0, ticket: 0 }, 
      4: { revenue: 0, ticket: 0 } 
    },
    profitMargin: 0
  });

  // --- BUSCA E SINCRONIZAÇÃO ---
  useEffect(() => {
    if (!supabase) return;
    fetchLeads();
    const channel = supabase.channel('crm-realtime-v5')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'leads' }, () => fetchLeads())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  const fetchLeads = async () => {
    if (!supabase) return;
    const { data, error } = await supabase.from('leads').select('*').order('lastUpdate', { ascending: false });
    if (!error) setLeads(data || []);
    setLoading(false);
  };

  const saveLead = async (leadData) => {
    if (!supabase) return;
    const payload = { 
      ...leadData, 
      value: Number(leadData.value) || 0,
      lastUpdate: new Date().toISOString() 
    };
    const { error } = await supabase.from('leads').upsert(payload);
    if (!error) fetchLeads();
  };

  const deleteLead = async (id) => {
    if(!supabase) return;
    if(window.confirm("⚠️ EXCLUSÃO PERMANENTE: Deseja apagar este lead do sistema?")) {
      const { error } = await supabase.from('leads').delete().eq('id', id);
      if (!error) fetchLeads();
    }
  };

  // --- LÓGICA DE DRAG AND DROP (HTML5 NATIVO) ---
  const handleDragStart = (e, id) => {
    e.dataTransfer.setData("leadId", id);
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  };

  const handleDrop = async (e, newStage) => {
    e.preventDefault();
    const id = e.dataTransfer.getData("leadId");
    const lead = leads.find(l => l.id === id);
    if (lead && lead.stage !== newStage) {
      await saveLead({ ...lead, stage: newStage });
    }
  };

  // --- CÁLCULOS DE KPI E PERFORMANCE ---
  const calculateMetrics = (data) => {
    const active = data.filter(l => !l.isArchived);
    const won = active.filter(l => l.stage === 'fechado');
    const total = active.length || 0;
    
    return {
      contacts: total,
      followUp: total > 0 ? (active.filter(l => l.followUp).length / total) * 100 : 0,
      crossSell: won.length > 0 ? (won.filter(l => l.hasCrossSell).length / won.length) * 100 : 0,
      upSell: won.length > 0 ? (won.filter(l => l.hasUpSell).length / won.length) * 100 : 0,
      postSale: won.length > 0 ? (won.filter(l => l.postSale).length / won.length) * 100 : 0,
      conversion: total > 0 ? (won.length / total) * 100 : 0,
      reactivated: active.filter(l => l.reactivated && l.stage === 'fechado').length
    };
  };

  const metrics = calculateMetrics(leads);
  const totalRevenue = Object.values(commissionData.weeks).reduce((acc, curr) => acc + Number(curr.revenue), 0);
  const avgTicketAchieved = (Object.values(commissionData.weeks).filter(w => Number(w.ticket) > 0).length > 0)
    ? (Object.values(commissionData.weeks).reduce((acc, curr) => acc + Number(curr.ticket), 0) / Object.values(commissionData.weeks).filter(w => Number(w.ticket) > 0).length)
    : 0;

  const revPercentage = (totalRevenue / goals.revenue) * 100;
  
  // Regra de Comissão Base
  const baseCommissionRate = revPercentage >= 110 ? 3.5 : revPercentage >= 100 ? 2.5 : revPercentage >= 90 ? 1.5 : 0;
  
  // Aceleradores (+0.5% cada)
  const hasProfit = Number(commissionData.profitMargin) > 0;
  const accelerators = hasProfit ? (
    (avgTicketAchieved >= goals.ticket ? 0.5 : 0) +
    (metrics.crossSell >= goals.crossSell ? 0.5 : 0) +
    (metrics.upSell >= goals.upSell ? 0.5 : 0)
  ) : 0;

  // Bônus Fixo R$ 300
  const bonusFixoValido = metrics.contacts >= goals.contacts && metrics.followUp >= goals.followUp;
  
  const totalRate = baseCommissionRate + accelerators;
  const finalCommission = (totalRevenue * (totalRate / 100)) + (bonusFixoValido ? 300 : 0);

  if (loading) return (
    <div className="h-screen bg-slate-900 flex flex-col items-center justify-center">
      <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-4"></div>
      <p className="text-blue-500 font-black tracking-widest uppercase text-xs">Sincronizando Motor SalesPro...</p>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#F1F5F9] p-4 md:p-8 font-sans text-slate-900">
      
      {/* CABEÇALHO E CONTROLE DE NAVEGAÇÃO */}
      <header className="max-w-7xl mx-auto mb-10 flex flex-col lg:flex-row justify-between items-center gap-6">
        <div className="flex items-center gap-4">
          <div className="bg-blue-600 p-4 rounded-[2rem] shadow-2xl shadow-blue-200 text-white">
            <TrendingUp size={30} />
          </div>
          <div>
            <h1 className="text-3xl font-black tracking-tighter">SalesPro <span className="text-blue-600">Ultra</span></h1>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.3em]">Full Enterprise Dashboard</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3 bg-white p-2.5 rounded-[2.5rem] shadow-xl border border-white">
          <div className="flex bg-slate-100 p-1.5 rounded-2xl mr-4">
            {[1, 2, 3, 4].map(w => (
              <button key={w} onClick={() => setCurrentWeek(w)} className={`px-5 py-2.5 rounded-xl font-black text-xs transition-all ${currentWeek === w ? 'bg-white text-blue-600 shadow-md scale-105' : 'text-slate-400'}`}>S{w}</button>
            ))}
          </div>
          <nav className="flex gap-1">
            {['pipeline', 'metrics', 'commission', 'archive'].map(tab => (
              <button key={tab} onClick={() => setActiveTab(tab)} className={`px-6 py-3 rounded-2xl font-black text-[10px] uppercase transition-all ${activeTab === tab ? 'bg-slate-900 text-white shadow-xl' : 'text-slate-500 hover:bg-slate-50'}`}>
                {tab === 'metrics' ? 'Indicadores' : tab === 'commission' ? 'Financeiro' : tab === 'archive' ? 'Histórico' : 'Pipeline'}
              </button>
            ))}
          </nav>
          <div className="flex items-center gap-2 border-l pl-4 border-slate-100">
             <button onClick={() => setIsModalOpen(true)} className="bg-blue-600 text-white p-3 rounded-full shadow-lg hover:scale-110 active:scale-95 transition-all"><PlusCircle size={22} /></button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto">
        
        {/* ABA 1: PIPELINE COM DRAG & DROP */}
        {activeTab === 'pipeline' && (
          <div className="grid grid-cols-1 md:grid-cols-5 gap-5 animate-in fade-in duration-500">
            {['contato', 'orcamento', 'negociacao', 'fechado', 'perdido'].map(stage => {
              const stageLeads = leads.filter(l => l.stage === stage && Number(l.week) === currentWeek && !l.isArchived);
              const columnTotal = stageLeads.reduce((acc, curr) => acc + (Number(curr.value) || 0), 0);
              
              return (
                <div 
                  key={stage} 
                  onDragOver={handleDragOver} 
                  onDrop={(e) => handleDrop(e, stage)}
                  className="bg-slate-200/40 p-5 rounded-[2.5rem] border-2 border-dashed border-slate-300/50 min-h-[800px] transition-colors hover:bg-slate-200/60"
                >
                  <div className="mb-6 px-2 flex justify-between items-end">
                    <div>
                      <h3 className="font-black text-[10px] uppercase text-slate-400 tracking-widest mb-1">{stage}</h3>
                      <p className="text-xl font-black text-slate-800">R$ {columnTotal.toLocaleString()}</p>
                    </div>
                    <span className="text-[10px] font-black bg-white text-blue-600 px-2 py-1 rounded-lg shadow-sm">{stageLeads.length}</span>
                  </div>

                  <div className="space-y-4">
                    {stageLeads.map(lead => {
                      const isStale = (Date.now() - new Date(lead.lastUpdate).getTime()) > (3 * 24 * 60 * 60 * 1000) && stage !== 'fechado';
                      return (
                        <div 
                          key={lead.id} 
                          draggable 
                          onDragStart={(e) => handleDragStart(e, lead.id)}
                          className={`bg-white p-5 rounded-[2rem] shadow-sm border-2 transition-all cursor-grab active:cursor-grabbing hover:shadow-2xl relative group ${isStale ? 'border-rose-100 bg-rose-50/20' : 'border-white'}`}
                        >
                          {isStale && <div className="absolute -left-2 top-1/2 -translate-y-1/2 bg-rose-500 text-white p-1 rounded-full animate-pulse z-10"><Clock size={12}/></div>}
                          <button onClick={() => deleteLead(lead.id)} className="absolute -right-2 -top-2 bg-white text-rose-400 p-2 rounded-full shadow-lg border opacity-0 group-hover:opacity-100 transition-all hover:bg-rose-500 hover:text-white"><Trash2 size={14}/></button>
                          
                          <div className="flex justify-between items-start mb-3">
                            <span className="text-[9px] font-black text-slate-300 uppercase">{lead.vendor}</span>
                            <Grab size={14} className="text-slate-200 group-hover:text-blue-400 transition-colors" />
                          </div>

                          <h4 className="font-black text-xs text-slate-800 uppercase mb-1 leading-tight">{lead.name}</h4>
                          <div className="text-emerald-600 font-black text-sm mb-4">R$ {Number(lead.value).toLocaleString()}</div>
                          
                          <textarea 
                            className="w-full text-[10px] p-3 bg-slate-50 border-none rounded-xl resize-none font-medium text-slate-500 mb-4 focus:ring-1 focus:ring-blue-100"
                            rows="2" placeholder="Notas..." value={lead.notes || ''}
                            onChange={(e) => saveLead({...lead, notes: e.target.value})}
                          />

                          <div className="pt-4 border-t border-slate-50 grid grid-cols-2 gap-2">
                            <QuickAction label="F-Up" active={lead.followUp} color="bg-amber-500" onClick={()=>saveLead({...lead, followUp: !lead.followUp})} />
                            <QuickAction label="P-Venda" active={lead.postSale} color="bg-indigo-600" onClick={()=>saveLead({...lead, postSale: !lead.postSale})} />
                            <QuickAction label="Cross" active={lead.hasCrossSell} color="bg-blue-600" onClick={()=>saveLead({...lead, hasCrossSell: !lead.hasCrossSell})} />
                            <QuickAction label="Up" active={lead.hasUpSell} color="bg-emerald-600" onClick={()=>saveLead({...lead, hasUpSell: !lead.hasUpSell})} />
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

        {/* ABA 2: KPIs E INDICADORES (A VISÃO HARD DE DADOS) */}
        {activeTab === 'metrics' && (
          <div className="bg-white rounded-[3rem] shadow-2xl border overflow-hidden animate-in slide-in-from-bottom-10">
            <div className="p-10 border-b bg-slate-50/50 flex items-center justify-between">
              <h3 className="text-2xl font-black uppercase tracking-tighter flex items-center gap-3"><BarChart2 className="text-blue-600"/> Dashboard de Performance Semanal</h3>
              <div className="flex gap-4">
                 <div className="bg-white px-6 py-2 rounded-2xl border text-[10px] font-black uppercase shadow-sm">Ciclo Ativo: {leads.filter(l=>!l.isArchived).length} leads</div>
              </div>
            </div>
            <table className="w-full text-left">
              <thead className="bg-slate-900 text-white text-[10px] font-black uppercase tracking-widest">
                <tr>
                  <th className="p-10">Métrica Estratégica</th>
                  <th className="p-10 text-center">Meta do Ciclo</th>
                  {[1,2,3,4].map(w=><th key={w} className="p-10 text-center">Semana {w}</th>)}
                  <th className="p-10 text-center bg-blue-900">Total Ciclo</th>
                </tr>
              </thead>
              <tbody className="divide-y font-bold text-xs uppercase text-slate-600">
                <MetricRow title="Novos Contatos Realizados" meta={goals.contacts} field="contacts" data={leads} format={v=>v} total={metrics.contacts}/>
                <MetricRow title="Taxa de Follow-up (%)" meta={goals.followUp+"%"} field="followUp" data={leads} format={v=>v.toFixed(1)+"%"} total={metrics.followUp.toFixed(1)+"%"} isPercent/>
                <MetricRow title="Taxa de Cross-Sell (%)" meta={goals.crossSell+"%"} field="crossSell" data={leads} format={v=>v.toFixed(1)+"%"} total={metrics.crossSell.toFixed(1)+"%"} isPercent/>
                <MetricRow title="Taxa de Up-Sell (%)" meta={goals.upSell+"%"} field="upSell" data={leads} format={v=>v.toFixed(1)+"%"} total={metrics.upSell.toFixed(1)+"%"} isPercent/>
                <MetricRow title="Pós-Venda Ativo (%)" meta={goals.postSale+"%"} field="postSale" data={leads} format={v=>v.toFixed(1)+"%"} total={metrics.postSale.toFixed(1)+"%"} isPercent/>
                <MetricRow title="Conversão Final (%)" meta={goals.conversion+"%"} field="conversion" data={leads} format={v=>v.toFixed(1)+"%"} total={metrics.conversion.toFixed(1)+"%"} isPercent/>
              </tbody>
            </table>
          </div>
        )}

        {/* ABA 3: FINANCEIRO E REGRAS DE COMISSÃO */}
        {activeTab === 'commission' && (
          <div className="space-y-10 animate-in zoom-in duration-500">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
              <div className="bg-blue-600 p-12 rounded-[3.5rem] text-white shadow-2xl relative overflow-hidden group">
                <div className="absolute top-[-20px] right-[-20px] opacity-10 group-hover:rotate-12 transition-all duration-1000"><DollarSign size={200}/></div>
                <p className="text-[12px] font-black uppercase tracking-[0.4em] opacity-60 mb-3">Faturamento Bruto</p>
                <h3 className="text-7xl font-black tracking-tighter mb-10 font-mono">R$ {totalRevenue.toLocaleString()}</h3>
                <div className="grid grid-cols-2 gap-10 pt-10 border-t border-blue-400">
                  <div><p className="text-[10px] font-black opacity-60 mb-1 uppercase">Ticket Médio</p><p className="text-2xl font-black">R$ {avgTicketAchieved.toLocaleString()}</p></div>
                  <div><p className="text-[10px] font-black opacity-60 mb-1 uppercase">Atingimento</p><p className="text-2xl font-black">{revPercentage.toFixed(1)}%</p></div>
                </div>
              </div>
              <div className="bg-white p-12 rounded-[3.5rem] border-[6px] border-emerald-500 shadow-2xl flex flex-col justify-center items-center text-center">
                <Award className="text-emerald-500 mb-6" size={50}/>
                <p className="text-[12px] text-slate-400 font-black uppercase tracking-widest mb-4">Comissão Líquida Prevista</p>
                <h3 className="text-8xl text-emerald-600 font-black tracking-tighter font-mono">R$ {finalCommission.toLocaleString()}</h3>
                <div className="mt-8 bg-emerald-600 text-white px-8 py-3 rounded-2xl font-black text-xs uppercase tracking-widest shadow-lg">Taxa Total: {totalRate.toFixed(1)}%</div>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
               <div className="bg-slate-900 p-10 rounded-[3rem] text-white shadow-xl">
                  <h4 className="text-xs font-black uppercase mb-8 border-b border-white/10 pb-6 flex items-center gap-3"><ShieldCheck className="text-blue-500"/> Escada de Vendas</h4>
                  <div className="space-y-5">
                    <RuleRow label="Meta 90% a 99%" val="1.5%" active={revPercentage >= 90 && revPercentage < 100}/>
                    <RuleRow label="Meta 100% a 109%" val="2.5%" active={revPercentage >= 100 && revPercentage < 110}/>
                    <RuleRow label="Meta 110% (Ultra)" val="3.5%" active={revPercentage >= 110}/>
                  </div>
               </div>
               <div className="bg-slate-900 p-10 rounded-[3rem] text-white shadow-xl">
                  <h4 className="text-xs font-black uppercase mb-8 border-b border-white/10 pb-6 flex items-center gap-3"><Zap className="text-amber-500"/> Aceleradores (+0.5%)</h4>
                  <div className="space-y-5">
                    <RuleRow label="Meta Ticket Médio" val="+0.5%" active={avgTicketAchieved >= goals.ticket}/>
                    <RuleRow label="Meta Cross-Sell" val="+0.5%" active={metrics.crossSell >= goals.crossSell}/>
                    <RuleRow label="Meta Up-Sell" val="+0.5%" active={metrics.upSell >= goals.upSell}/>
                  </div>
               </div>
               <div className="bg-slate-900 p-10 rounded-[3rem] text-white shadow-xl">
                  <h4 className="text-xs font-black uppercase mb-8 border-b border-white/10 pb-6 flex items-center gap-3"><Target className="text-emerald-500"/> Bônus Fixo R$ 300</h4>
                  <div className="bg-white/5 p-8 rounded-[2rem]">
                     <p className="text-xs text-slate-400 mb-6 leading-relaxed">Concedido ao atingir as metas de volume de **Contatos** e **Taxa de Follow-up** simultaneamente.</p>
                     <div className="flex justify-between items-center"><span className="text-[10px] font-black uppercase">STATUS:</span><span className={`text-xs font-black ${bonusFixoValido ? 'text-emerald-400' : 'text-rose-400'}`}>{bonusFixoValido ? 'HABILITADO' : 'PENDENTE'}</span></div>
                  </div>
               </div>
            </div>

            <div className="bg-white rounded-[3rem] border shadow-xl p-12">
               <h4 className="text-sm font-black uppercase text-blue-600 mb-10 flex items-center gap-3"><ClipboardList/> Gestão de Metas do Ciclo</h4>
               <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-12 pb-12 border-b">
                  <MetInput label="Meta Faturamento" val={goals.revenue} onChange={v=>setGoals({...goals, revenue:v})}/>
                  <MetInput label="Meta Ticket Médio" val={goals.ticket} onChange={v=>setGoals({...goals, ticket:v})}/>
                  <MetInput label="Margem Lucro (%)" val={commissionData.profitMargin} onChange={v=>setCommissionData({...commissionData, profitMargin:v})}/>
               </div>
               <table className="w-full text-left">
                 <thead><tr className="text-[11px] font-black text-slate-400 uppercase border-b"><th className="p-6">Semana</th><th className="p-6">Faturamento Real (R$)</th><th className="p-6">Ticket Médio (R$)</th></tr></thead>
                 <tbody className="divide-y">
                   {[1,2,3,4].map(w => (
                     <tr key={w} className="hover:bg-slate-50 transition-colors">
                       <td className="p-8 font-black text-slate-400 text-xs tracking-widest">S{w} OPERATIVA</td>
                       <td className="p-4"><input type="number" className="w-full p-4 bg-slate-100 rounded-2xl font-black border-none focus:ring-2 focus:ring-blue-500" value={commissionData.weeks[w].revenue} onChange={e => setCommissionData({...commissionData, weeks: {...commissionData.weeks, [w]: {...commissionData.weeks[w], revenue: e.target.value}}})} /></td>
                       <td className="p-4"><input type="number" className="w-full p-4 bg-slate-100 rounded-2xl font-black border-none focus:ring-2 focus:ring-blue-500" value={commissionData.weeks[w].ticket} onChange={e => setCommissionData({...commissionData, weeks: {...commissionData.weeks, [w]: {...commissionData.weeks[w], ticket: e.target.value}}})} /></td>
                     </tr>
                   ))}
                 </tbody>
               </table>
            </div>
          </div>
        )}

        {/* ABA 4: HISTÓRICO E ARQUIVO */}
        {activeTab === 'archive' && (
          <div className="space-y-8 animate-in slide-in-from-right-10">
            <div className="bg-white p-12 rounded-[3rem] border shadow-sm flex flex-col md:flex-row justify-between items-center gap-8">
               <h3 className="text-2xl font-black uppercase tracking-tighter flex items-center gap-4 text-slate-400"><Archive size={30}/> Arquivo de Performance</h3>
               <input type="text" placeholder="Buscar por cliente ou ciclo..." className="p-5 border-2 rounded-2xl font-black bg-slate-50 outline-none w-full md:w-96 focus:border-blue-500" onChange={e => setSearchTerm(e.target.value)} />
            </div>
            <div className="bg-white rounded-[3rem] shadow-2xl border overflow-hidden">
               <table className="w-full text-left">
                  <thead className="bg-slate-900 text-white font-black uppercase text-[10px] tracking-widest">
                    <tr><th className="p-10">Lead</th><th className="p-10">Vendedor</th><th className="p-10 text-center">Valor</th><th className="p-10 text-center">Ciclo</th><th className="p-10 text-center">Ações</th></tr>
                  </thead>
                  <tbody className="divide-y font-bold uppercase text-slate-600 text-xs">
                    {leads.filter(l => l.isArchived).filter(l => !searchTerm || l.name.toLowerCase().includes(searchTerm.toLowerCase())).map(lead => (
                      <tr key={lead.id} className="hover:bg-slate-50">
                        <td className="p-10 font-black text-slate-800">{lead.name}</td>
                        <td className="p-10"><span className="bg-blue-50 text-blue-600 px-3 py-1 rounded-lg border">{lead.vendor}</span></td>
                        <td className="p-10 text-center text-emerald-600 font-black">R$ {Number(lead.value).toLocaleString()}</td>
                        <td className="p-10 text-center"><span className="bg-slate-100 px-4 py-2 rounded-xl">{lead.cycle_name || 'LEGADO'}</span></td>
                        <td className="p-10 text-center">
                           <button onClick={() => saveLead({...lead, isArchived: false})} className="text-blue-500 hover:scale-125 transition-all"><RotateCcw size={20}/></button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
               </table>
            </div>
          </div>
        )}
      </main>

      {/* MODAL PARA ATIVAR NOVO LEAD */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/90 backdrop-blur-md flex items-center justify-center p-4 z-[100] animate-in fade-in">
          <div className="bg-white rounded-[3.5rem] p-12 max-w-xl w-full shadow-2xl border-t-[20px] border-blue-600 animate-in zoom-in duration-300">
            <h2 className="text-3xl font-black mb-10 uppercase text-slate-800 tracking-tighter">Ativar Novo Lead</h2>
            <div className="space-y-6">
              <input placeholder="Empresa ou Organização" className="w-full p-6 rounded-3xl border-2 font-black bg-slate-50 outline-none focus:border-blue-500" value={newLead.name} onChange={e => setNewLead({...newLead, name: e.target.value})} />
              <div className="grid grid-cols-2 gap-6">
                <input type="number" placeholder="Valor Projetado R$" className="w-full p-6 rounded-3xl border-2 font-black bg-slate-50 outline-none focus:border-blue-500" value={newLead.value} onChange={e => setNewLead({...newLead, value: e.target.value})} />
                <select className="w-full p-6 rounded-3xl border-2 font-black bg-slate-50 outline-none focus:border-blue-500" value={newLead.vendor} onChange={e => setNewLead({...newLead, vendor: e.target.value})}><option>Vendedor 1</option><option>Vendedor 2</option></select>
              </div>
              <textarea placeholder="Briefing e detalhes da oportunidade..." className="w-full p-6 rounded-3xl border-2 font-black bg-slate-50 outline-none focus:border-blue-500" rows="3" value={newLead.notes} onChange={e => setNewLead({...newLead, notes: e.target.value})} />
              <button onClick={async () => { if(!newLead.name) return; await saveLead({...newLead, week: currentWeek, isArchived: false}); setIsModalOpen(false); setNewLead({name:'', value:'', vendor:'Vendedor 1', notes:'', tags:'', stage:'contato'}); }} className="w-full bg-blue-600 text-white p-8 rounded-[2rem] font-black uppercase shadow-xl hover:scale-[1.02] active:scale-95 transition-all tracking-[0.2em]">Ativar Lead no Pipeline</button>
              <button onClick={() => setIsModalOpen(false)} className="w-full text-slate-400 font-black uppercase text-[10px] tracking-[0.3em] py-2">Cancelar Operação</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// --- SUBCOMPONENTES AUXILIARES ---

const QuickAction = ({ label, active, color, onClick }) => (
    <button onClick={onClick} className={`p-2.5 rounded-2xl border text-[8px] font-black uppercase transition-all shadow-sm ${active ? `${color} text-white border-transparent scale-105` : 'bg-white text-slate-300 border-slate-100'}`}>{label}</button>
);

const RuleRow = ({ label, val, active }) => (
    <div className={`flex justify-between items-center p-5 rounded-2xl border-2 transition-all ${active ? 'bg-white/10 border-emerald-500 shadow-lg scale-[1.02]' : 'bg-white/5 border-transparent opacity-30'}`}><span className="text-[10px] font-black uppercase tracking-widest text-white">{label}</span><span className={`text-sm font-black ${active ? 'text-emerald-400' : 'text-slate-500'}`}>{val}</span></div>
);

const MetInput = ({ label, val, onChange }) => (
    <div className="space-y-3"><label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4">{label}</label><input type="number" className="w-full p-6 border-2 rounded-[2rem] font-black bg-slate-50 outline-none focus:border-blue-500 transition-all shadow-inner" value={val} onChange={e => onChange(e.target.value)} /></div>
);

const MetricRow = ({ title, meta, total, field, data, format, isPercent=false }) => {
    const getStatusColor = (v) => {
        const targetValue = isPercent ? parseFloat(meta) : parseFloat(meta)/4;
        if(v >= targetValue) return 'bg-emerald-500';
        if(v >= targetValue * 0.7) return 'bg-amber-500';
        return 'bg-rose-500';
    };
    
    const getWeekVal = (w) => {
        const sLeads = data.filter(l => Number(l.week) === w && !l.isArchived);
        const won = sLeads.filter(l => l.stage === 'fechado');
        if(field === 'contacts') return sLeads.length;
        if(field === 'followUp') return sLeads.length > 0 ? (sLeads.filter(l=>l.followUp).length / sLeads.length) * 100 : 0;
        if(field === 'crossSell') return won.length > 0 ? (won.filter(l=>l.hasCrossSell).length / won.length) * 100 : 0;
        if(field === 'upSell') return won.length > 0 ? (won.filter(l=>l.hasUpSell).length / won.length) * 100 : 0;
        if(field === 'postSale') return won.length > 0 ? (won.filter(l=>l.postSale).length / won.length) * 100 : 0;
        if(field === 'conversion') return sLeads.length > 0 ? (won.length / sLeads.length) * 100 : 0;
        return 0;
    };

    return (
        <tr className="hover:bg-slate-50 transition-colors">
            <td className="p-10 font-black text-slate-700">{title}</td>
            <td className="p-10 text-center italic text-slate-400 font-bold">{meta}</td>
            {[1,2,3,4].map(w => {
                const val = getWeekVal(w);
                return (
                    <td key={w} className="p-10 text-center"><div className="flex flex-col items-center gap-2"><div className={`w-4 h-4 rounded-full ${getStatusColor(val)} shadow-lg ring-4 ring-slate-100`}/><span className="text-[10px] font-black">{format(val)}</span></div></td>
                );
            })}
            <td className="p-10 text-center bg-blue-50/50"><div className="flex flex-col items-center gap-2"><div className={`w-6 h-6 rounded-full ${getStatusColor(parseFloat(total))} shadow-xl`}/><span className="text-xl font-black text-blue-900">{total}</span></div></td>
        </tr>
    );
};
