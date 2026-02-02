import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { createClient } from '@supabase/supabase-js';
import { 
  TrendingUp, PlusCircle, Trash2, BarChart2, Target, AlertCircle, Archive, 
  RotateCcw, Tag as TagIcon, Info, CheckCircle2, ChevronRight, DollarSign,
  User, Calendar, FileText, ClipboardList, ShieldCheck, Zap, ArrowRight,
  Clock, Award, BarChart, Grab, Search, Filter, Settings, RefreshCw,
  Layers, ArrowDownWideNarrow, PieChart, Activity, AlertTriangle, XCircle
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
    conversion: 5,
    minMargin: 15 // Meta de Margem Líquida
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
    name: '', value: '', vendor: 'Vendedor 1', notes: '', stage: 'contato', tags: '', week: 1,
    followUp: false, postSale: false, hasCrossSell: false, hasUpSell: false, reactivated: false
  });

  // --- PERSISTÊNCIA ---
  const fetchLeads = useCallback(async () => {
    if (!supabase) return;
    const { data, error } = await supabase.from('leads').select('*').order('lastUpdate', { ascending: false });
    if (!error) setLeads(data || []);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchLeads();
    if (!supabase) return;
    const channel = supabase.channel('crm_sync').on('postgres_changes', { event: '*', schema: 'public', table: 'leads' }, fetchLeads).subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [fetchLeads]);

  const handleSaveLead = async (leadData) => {
    if (!supabase) return;
    setIsSaving(true);
    const payload = { ...leadData, value: Number(leadData.value) || 0, lastUpdate: new Date().toISOString() };
    const { error } = await supabase.from('leads').upsert(payload);
    if (!error) fetchLeads();
    setIsSaving(false);
  };

  const deleteLead = async (id) => {
    if (!window.confirm("Deseja deletar este lead permanentemente?")) return;
    const { error } = await supabase.from('leads').delete().eq('id', id);
    if (!error) fetchLeads();
  };

  // Funções de Manutenção de Dados
  const archiveAllCurrent = async () => {
    if (!window.confirm("Isso irá arquivar todos os leads do pipeline para iniciar um novo mês. Continuar?")) return;
    const currentLeads = leads.filter(l => !l.isArchived);
    for (const lead of currentLeads) {
      await supabase.from('leads').update({ isArchived: true }).eq('id', lead.id);
    }
    fetchLeads();
  };

  const clearHistory = async () => {
    if (!window.confirm("TEM CERTEZA? Isso apagará permanentemente todos os dados do histórico!")) return;
    const archivedLeads = leads.filter(l => l.isArchived);
    for (const lead of archivedLeads) {
      await supabase.from('leads').delete().eq('id', lead.id);
    }
    fetchLeads();
  };

  const toggleTag = (lead, tagId) => {
    let currentTags = lead.tags ? lead.tags.split(',') : [];
    currentTags = currentTags.includes(tagId) ? currentTags.filter(t => t !== tagId) : [...currentTags, tagId];
    handleSaveLead({ ...lead, tags: currentTags.join(',') });
  };

  // --- MOTOR DE DRAG & DROP ---
  const onDragStart = (e, id) => { e.dataTransfer.setData("leadId", id); };
  const onDragOver = (e) => { e.preventDefault(); e.currentTarget.classList.add('bg-slate-200'); };
  const onDragLeave = (e) => { e.currentTarget.classList.remove('bg-slate-200'); };
  const onDrop = async (e, targetStage) => {
    e.preventDefault();
    e.currentTarget.classList.remove('bg-slate-200');
    const id = e.dataTransfer.getData("leadId");
    const lead = leads.find(l => l.id === id);
    if (lead && lead.stage !== targetStage) handleSaveLead({ ...lead, stage: targetStage });
  };

  // --- MOTOR ANALYTICS ---
  const analytics = useMemo(() => {
    const active = leads.filter(l => !l.isArchived); // Somente leads ativos para o Funil
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
      n2f: funnel.negociacao > 0 ? (funnel.fechado / funnel.negociacao) * 100 : 0
    };

    const totalRev = Object.values(commSettings.weeks).reduce((a, b) => a + Number(b.revenue), 0);
    const avgTicket = (Object.values(commSettings.weeks).filter(w => Number(w.ticket) > 0).length > 0)
      ? (Object.values(commSettings.weeks).reduce((a, b) => a + Number(b.ticket), 0) / Object.values(commSettings.weeks).filter(w => Number(w.ticket) > 0).length)
      : 0;

    const revPerf = (totalRev / goals.revenue) * 100;
    const marginOk = Number(commSettings.profitMargin) >= goals.minMargin;

    const kpis = {
      cross: won.length > 0 ? (won.filter(l => l.hasCrossSell).length / won.length) * 100 : 0,
      up: won.length > 0 ? (won.filter(l => l.hasUpSell).length / won.length) * 100 : 0,
      post: won.length > 0 ? (won.filter(l => l.postSale).length / won.length) * 100 : 0,
      fup: active.length > 0 ? (active.filter(l => l.followUp).length / active.length) * 100 : 0,
      react: active.filter(l => l.reactivated).length
    };

    let baseRate = 0;
    if (marginOk) { // Só calcula comissão se a margem líquida for atingida
      if (revPerf >= 110) baseRate = 3.5;
      else if (revPerf >= 100) baseRate = 2.5;
      else if (revPerf >= 90) baseRate = 1.5;
    }

    const accelerators = marginOk ? (
      (avgTicket >= goals.ticket ? 0.5 : 0) +
      (kpis.cross >= goals.crossSell ? 0.5 : 0) +
      (kpis.up >= goals.upSell ? 0.5 : 0) +
      (rates.total >= goals.conversion ? 0.5 : 0)
    ) : 0;

    const bonusFixoHabilitado = active.length >= goals.contacts && kpis.fup >= goals.followUp;
    const finalCommission = (totalRev * ((baseRate + accelerators) / 100)) + (bonusFixoHabilitado ? 300 : 0);

    return { funnel, rates, totalRev, avgTicket, revPerf, kpis, finalRate: baseRate + accelerators, finalCommission, bonusFixoHabilitado, marginOk };
  }, [leads, commSettings, goals]);

  if (loading) return <div className="h-screen bg-slate-900 flex items-center justify-center text-blue-500 font-black animate-pulse">CARREGANDO ENGINE...</div>;

  return (
    <div className="min-h-screen bg-[#F1F5F9] p-4 md:p-8 font-sans">
      {/* HEADER */}
      <header className="max-w-[1600px] mx-auto mb-10 flex flex-col xl:flex-row justify-between items-center gap-8">
        <div className="flex items-center gap-6">
          <div className="bg-slate-900 p-5 rounded-[2.5rem] shadow-2xl"><TrendingUp className="text-blue-600" size={32} /></div>
          <div>
            <h1 className="text-4xl font-black italic text-slate-900">SALES<span className="text-blue-600">PRO</span> CORE</h1>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Enterprise Control v6.0</p>
          </div>
        </div>
        
        <div className="flex flex-wrap items-center gap-3 bg-white p-3 rounded-[3rem] shadow-xl">
          <div className="flex bg-slate-100 p-1.5 rounded-2xl mr-4">
            {[1, 2, 3, 4].map(w => (
              <button key={w} onClick={() => setCurrentWeek(w)} className={`px-5 py-2.5 rounded-xl font-black text-xs transition-all ${currentWeek === w ? 'bg-white text-blue-600 shadow-md' : 'text-slate-400'}`}>S{w}</button>
            ))}
          </div>
          <nav className="flex gap-1">
            {['pipeline', 'funnel', 'metrics', 'commission', 'archive'].map(tab => (
              <button key={tab} onClick={() => setActiveTab(tab)} className={`px-6 py-3 rounded-2xl font-black text-[10px] uppercase transition-all ${activeTab === tab ? 'bg-slate-900 text-white' : 'text-slate-500'}`}>
                {tab}
              </button>
            ))}
          </nav>
          <button onClick={() => setIsModalOpen(true)} className="bg-blue-600 text-white p-4 rounded-full shadow-lg ml-4"><PlusCircle size={22} /></button>
        </div>
      </header>

      <main className="max-w-[1600px] mx-auto">
        {/* PIPELINE */}
        {activeTab === 'pipeline' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center bg-white p-6 rounded-[2.5rem] shadow-sm border">
              <div className="relative w-full max-w-md">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18}/>
                <input 
                  type="text" 
                  placeholder="Pesquisar leads no pipeline..." 
                  className="w-full pl-12 pr-4 py-3 bg-slate-50 border-none rounded-2xl font-bold text-sm outline-none focus:ring-2 focus:ring-blue-100"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              <button onClick={archiveAllCurrent} className="flex items-center gap-2 bg-slate-900 text-white px-6 py-3 rounded-2xl font-black text-[10px] uppercase hover:bg-blue-600 transition-all">
                <Archive size={14}/> Limpar e Arquivar Mês
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
              {STAGES.map(stage => {
                const stageLeads = leads.filter(l => 
                  l.stage === stage.id && 
                  Number(l.week) === currentWeek && 
                  !l.isArchived &&
                  l.name.toLowerCase().includes(searchTerm.toLowerCase())
                );
                return (
                  <div key={stage.id} onDragOver={onDragOver} onDragLeave={onDragLeave} onDrop={(e) => onDrop(e, stage.id)} className="bg-slate-200/40 p-6 rounded-[3rem] min-h-[800px] transition-all">
                    <div className="mb-6 flex justify-between items-center px-2">
                      <h3 className="font-black text-[10px] uppercase text-slate-400 tracking-widest">{stage.label}</h3>
                      <span className="bg-white px-3 py-1 rounded-lg text-[10px] font-black text-blue-600 border shadow-sm">{stageLeads.length}</span>
                    </div>
                    <div className="space-y-4">
                      {stageLeads.map(lead => (
                        <div key={lead.id} draggable onDragStart={(e) => onDragStart(e, lead.id)} className="bg-white p-5 rounded-[2rem] shadow-sm border-2 border-white hover:shadow-xl transition-all group relative">
                          <button onClick={() => deleteLead(lead.id)} className="absolute -right-2 -top-2 bg-white text-rose-500 p-2 rounded-full shadow-lg opacity-0 group-hover:opacity-100 transition-all z-10"><Trash2 size={12}/></button>
                          
                          <div className="flex justify-between items-start mb-3">
                            <span className="text-[8px] font-black text-blue-600 bg-blue-50 px-2 py-1 rounded-md uppercase">{lead.vendor}</span>
                            {lead.reactivated && <span className="text-[8px] font-black text-amber-600 bg-amber-50 px-2 py-1 rounded-md uppercase border border-amber-100">Reativado</span>}
                          </div>

                          <h4 className="font-black text-xs uppercase mb-2">{lead.name}</h4>
                          
                          {/* VALOR EDITÁVEL NO CARD */}
                          <div className="flex items-center gap-1 mb-4 bg-slate-50 p-2 rounded-xl border border-dashed border-slate-200">
                            <span className="text-[10px] font-black text-slate-400">R$</span>
                            <input 
                              type="number" 
                              className="bg-transparent font-black text-emerald-600 text-sm outline-none w-full"
                              value={lead.value}
                              onChange={(e) => handleSaveLead({...lead, value: e.target.value})}
                            />
                          </div>

                          <div className="grid grid-cols-2 gap-2 mt-4 pt-4 border-t">
                            <QuickAction label="Follow-Up" active={lead.followUp} onClick={()=>handleSaveLead({...lead, followUp: !lead.followUp})} color="bg-amber-500" />
                            <QuickAction label="Up-Sell" active={lead.hasUpSell} onClick={()=>handleSaveLead({...lead, hasUpSell: !lead.hasUpSell})} color="bg-emerald-600" />
                            <QuickAction label="Reativado" active={lead.reactivated} onClick={()=>handleSaveLead({...lead, reactivated: !lead.reactivated})} color="bg-orange-500" />
                            <QuickAction label="Cross-Sell" active={lead.hasCrossSell} onClick={()=>handleSaveLead({...lead, hasCrossSell: !lead.hasCrossSell})} color="bg-blue-600" />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* FUNIL */}
        {activeTab === 'funnel' && (
          <div className="bg-white p-12 rounded-[4rem] shadow-2xl">
             <div className="flex items-center gap-4 mb-12">
                <PieChart size={32} className="text-blue-600"/>
                <h3 className="text-3xl font-black uppercase italic">Análise de Funil Operacional</h3>
             </div>
             <div className="flex flex-col gap-4 max-w-4xl mx-auto">
                <FunnelStep label="Leads Ativos (Mês)" count={analytics.funnel.contato} color="bg-slate-400" />
                <FunnelStep label="Orçamentos" count={analytics.funnel.orcamento} color="bg-blue-500" />
                <FunnelStep label="Negociações" count={analytics.funnel.negociacao} color="bg-amber-500" />
                <FunnelStep label="Fechados" count={analytics.funnel.fechado} color="bg-emerald-600" />
             </div>
          </div>
        )}

        {/* KPIs */}
        {activeTab === 'metrics' && (
          <div className="bg-white rounded-[4rem] shadow-2xl border overflow-hidden">
            <div className="p-10 bg-slate-50 border-b flex justify-between items-center">
               <h3 className="text-2xl font-black uppercase flex items-center gap-3"><Activity className="text-blue-600"/> Dashboard Estratégico</h3>
               <div className="flex gap-4">
                  <div className="bg-white p-4 rounded-2xl border text-center min-w-[120px]">
                    <p className="text-[10px] font-black text-slate-400 uppercase">Conversão Total</p>
                    <p className="text-2xl font-black">{analytics.rates.total.toFixed(1)}%</p>
                  </div>
               </div>
            </div>
            <table className="w-full">
              <thead className="bg-slate-900 text-white text-[11px] font-black uppercase">
                <tr>
                  <th className="p-10 text-left">Indicador</th>
                  <th className="p-10 text-center">Meta Ciclo (Editável)</th>
                  <th className="p-10 text-center">Realizado</th>
                  <th className="p-10 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                <KPIRowEditable title="Novos Contatos" val={goals.contacts} onChange={v=>setGoals({...goals, contacts: v})} current={analytics.funnel.contato} />
                <KPIRowEditable title="Taxa Conversão Total (%)" val={goals.conversion} onChange={v=>setGoals({...goals, conversion: v})} current={analytics.rates.total.toFixed(1)} isPercent />
                <KPIRowEditable title="Taxa Up-Sell (%)" val={goals.upSell} onChange={v=>setGoals({...goals, upSell: v})} current={analytics.kpis.up.toFixed(1)} isPercent />
                <KPIRowEditable title="Clientes Reativados" val={goals.reactivated} onChange={v=>setGoals({...goals, reactivated: v})} current={analytics.kpis.react} />
                <KPIRowEditable title="Taxa Follow-Up (%)" val={goals.followUp} onChange={v=>setGoals({...goals, followUp: v})} current={analytics.kpis.fup.toFixed(1)} isPercent />
              </tbody>
            </table>
          </div>
        )}

        {/* FINANCEIRO */}
        {activeTab === 'commission' && (
          <div className="space-y-10">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <div className="bg-slate-900 p-12 rounded-[4rem] text-white">
                <p className="text-xs font-black text-blue-500 uppercase tracking-widest mb-4">Margem de Lucro Atual</p>
                <div className="flex items-end gap-4 mb-8">
                  <h3 className="text-7xl font-black">{commSettings.profitMargin}%</h3>
                  <div className={`mb-2 px-4 py-1 rounded-full text-[10px] font-black ${analytics.marginOk ? 'bg-emerald-500 text-white' : 'bg-rose-500 text-white animate-pulse'}`}>
                    {analytics.marginOk ? 'MARGEM ATINGIDA' : 'MARGEM ABAIXO DA META'}
                  </div>
                </div>
                <div className="pt-8 border-t border-white/10 flex items-center gap-6">
                  <ParamInput label="Meta Margem Líquida %" val={goals.minMargin} onChange={v=>setGoals({...goals, minMargin: v})} dark />
                  <ParamInput label="Margem Real do Ciclo %" val={commSettings.profitMargin} onChange={v=>setCommSettings({...commSettings, profitMargin: v})} dark />
                </div>
              </div>

              <div className="bg-white p-12 rounded-[4rem] border-[10px] border-emerald-500 text-center flex flex-col justify-center items-center">
                 <p className="text-xs font-black text-slate-400 uppercase mb-4">Comissão Prevista</p>
                 <h3 className="text-8xl font-black text-emerald-600 font-mono">R$ {analytics.finalCommission.toLocaleString()}</h3>
                 {!analytics.marginOk && <p className="mt-4 text-rose-500 font-black text-[10px] uppercase flex items-center gap-2"><AlertTriangle size={14}/> Pagamento travado por margem insuficiente</p>}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <FinanceBox title="Aceleradores Ativos" icon={<Zap className="text-amber-500"/>}>
                <FinanceRule label="Ticket Médio" val="+0.5%" active={analytics.avgTicket >= goals.ticket}/>
                <FinanceRule label="Conversão Total" val="+0.5%" active={analytics.rates.total >= goals.conversion}/>
                <FinanceRule label="Taxa Cross-Sell" val="+0.5%" active={analytics.kpis.cross >= goals.crossSell}/>
                <FinanceRule label="Taxa Up-Sell" val="+0.5%" active={analytics.kpis.up >= goals.upSell}/>
              </FinanceBox>

              <div className="bg-slate-900 p-10 rounded-[3.5rem] text-white">
                <h4 className="text-xs font-black uppercase mb-6 flex items-center gap-2 border-b border-white/10 pb-4"><Award className="text-emerald-500"/> Bônus Operacional R$ 300</h4>
                <div className="space-y-4">
                  <BonusItem label="Meta Contatos" reached={analytics.funnel.contato >= goals.contacts} />
                  <BonusItem label="Meta Follow-Up" reached={analytics.kpis.fup >= goals.followUp} />
                  <BonusItem label="Pós-Venda Ativo" reached={analytics.kpis.post >= goals.postSale} />
                  <BonusItem label="Clientes Reativados" reached={analytics.kpis.react >= goals.reactivated} />
                </div>
                <div className={`mt-8 p-6 rounded-2xl text-center font-black ${analytics.bonusFixoHabilitado ? 'bg-emerald-500' : 'bg-white/10 opacity-30'}`}>
                  {analytics.bonusFixoHabilitado ? 'LIBERADO' : 'BLOQUEADO'}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* HISTÓRICO */}
        {activeTab === 'archive' && (
          <div className="space-y-6">
            <div className="bg-white p-8 rounded-[3rem] border flex justify-between items-center">
              <h3 className="text-2xl font-black uppercase flex items-center gap-3"><Archive/> Arquivo de Leads</h3>
              <button onClick={clearHistory} className="bg-rose-100 text-rose-600 px-8 py-4 rounded-2xl font-black text-xs uppercase flex items-center gap-2 hover:bg-rose-600 hover:text-white transition-all">
                <Trash2 size={16}/> Limpar Dados Históricos
              </button>
            </div>
            {/* Lista simples de arquivados aqui... */}
          </div>
        )}
      </main>

      {/* MODAL NOVO LEAD */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/90 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-2xl rounded-[3rem] p-12 relative">
            <button onClick={()=>setIsModalOpen(false)} className="absolute right-8 top-8 text-slate-300 hover:text-slate-900"><XCircle size={32}/></button>
            <h2 className="text-3xl font-black mb-8 italic uppercase">Novo <span className="text-blue-600">Lead</span></h2>
            <div className="grid grid-cols-2 gap-6">
              <input type="text" placeholder="Nome do Cliente" className="p-4 bg-slate-100 rounded-2xl border-none font-bold" value={newLead.name} onChange={e=>setNewLead({...newLead, name: e.target.value})}/>
              <input type="number" placeholder="Valor Estimado" className="p-4 bg-slate-100 rounded-2xl border-none font-bold" value={newLead.value} onChange={e=>setNewLead({...newLead, value: e.target.value})}/>
              <select className="p-4 bg-slate-100 rounded-2xl border-none font-bold" value={newLead.vendor} onChange={e=>setNewLead({...newLead, vendor: e.target.value})}>
                <option>Vendedor 1</option>
                <option>Vendedor 2</option>
              </select>
              <button 
                onClick={async () => {
                  await handleSaveLead(newLead);
                  setIsModalOpen(false);
                  setNewLead({name: '', value: '', vendor: 'Vendedor 1', notes: '', stage: 'contato', tags: '', week: currentWeek});
                }}
                className="bg-blue-600 text-white font-black rounded-2xl p-4 uppercase shadow-lg shadow-blue-200"
              >
                Cadastrar na Pipeline
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// --- SUBCOMPONENTES AUXILIARES ---

function QuickAction({ label, active, onClick, color }) {
  return (
    <button onClick={onClick} className={`px-2 py-2 rounded-lg text-[8px] font-black uppercase transition-all border ${active ? `${color} text-white border-transparent shadow-md` : 'bg-slate-50 text-slate-400 border-slate-100'}`}>
      {label}
    </button>
  );
}

function FunnelStep({ label, count, color }) {
  return (
    <div className="flex items-center gap-4">
      <div className={`h-16 flex-1 ${color} rounded-2xl flex items-center justify-between px-8 text-white`}>
        <span className="font-black uppercase text-sm">{label}</span>
        <span className="text-2xl font-black">{count}</span>
      </div>
    </div>
  );
}

function KPIRowEditable({ title, val, onChange, current, isPercent }) {
  return (
    <tr className="hover:bg-slate-50">
      <td className="p-8 font-black text-slate-800 uppercase text-xs">{title}</td>
      <td className="p-8 text-center">
        <input 
          type="number" 
          className="w-24 p-3 bg-slate-100 rounded-xl font-black text-center border-none focus:ring-2 focus:ring-blue-100" 
          value={val} 
          onChange={e => onChange(e.target.value)}
        />
      </td>
      <td className="p-8 text-center">
        <span className="bg-slate-900 text-white px-6 py-2 rounded-full font-black italic">{current}{isPercent ? '%' : ''}</span>
      </td>
      <td className="p-8 text-right font-black uppercase text-[10px]">
        {Number(current) >= Number(val) ? <span className="text-emerald-500">Batida</span> : <span className="text-rose-400">Pendente</span>}
      </td>
    </tr>
  );
}

function ParamInput({ label, val, onChange, dark }) {
  return (
    <div className="flex flex-col gap-2">
      <label className={`text-[8px] font-black uppercase ${dark ? 'text-slate-500' : 'text-slate-400'}`}>{label}</label>
      <input 
        type="number" 
        className={`p-3 rounded-xl font-black text-sm outline-none ${dark ? 'bg-white/5 border border-white/10 text-white' : 'bg-slate-100 text-slate-900'}`} 
        value={val} 
        onChange={e => onChange(e.target.value)}
      />
    </div>
  );
}

function FinanceBox({ title, icon, children }) {
  return (
    <div className="bg-white p-10 rounded-[3.5rem] border shadow-sm">
      <h4 className="text-xs font-black uppercase mb-8 flex items-center gap-3 border-b pb-4">{icon} {title}</h4>
      <div className="space-y-4">{children}</div>
    </div>
  );
}

function FinanceRule({ label, val, active }) {
  return (
    <div className={`flex justify-between items-center p-4 rounded-2xl border-2 transition-all ${active ? 'border-emerald-500 bg-emerald-50' : 'border-slate-50 bg-slate-50 opacity-40'}`}>
      <span className="text-[10px] font-black uppercase text-slate-600">{label}</span>
      <span className="text-sm font-black text-slate-900">{val}</span>
    </div>
  );
}

function BonusItem({ label, reached }) {
  return (
    <div className="flex justify-between items-center px-4 py-2 bg-white/5 rounded-xl border border-white/5">
      <span className="text-[9px] font-black uppercase text-slate-400">{label}</span>
      {reached ? <CheckCircle2 size={16} className="text-emerald-500"/> : <XCircle size={16} className="text-rose-500"/>}
    </div>
  );
}
