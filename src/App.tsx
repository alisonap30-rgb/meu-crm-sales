import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { createClient } from '@supabase/supabase-js';
import { 
  TrendingUp, PlusCircle, Trash2, Target, RotateCcw, CheckCircle2, DollarSign,
  FileText, Zap, ArrowRight, Clock, Award, Search, PieChart, Activity, Gauge, 
  Lock, X, Scale, Coins, AlertCircle, BarChart2, Filter, Layers, Check, BriefcaseIcon
} from 'lucide-react';

// --- CONFIGURAÇÃO SUPABASE ---
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || "";
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || "";
const supabase = (SUPABASE_URL && SUPABASE_KEY) ? createClient(SUPABASE_URL, SUPABASE_KEY) : null;

// --- CONSTANTES ---
const STAGES = [
  { id: 'contato', label: 'Prospecção', color: 'bg-slate-400' },
  { id: 'orcamento', label: 'Orçamento', color: 'bg-blue-500' },
  { id: 'negociacao', label: 'Negociação', color: 'bg-amber-500' },
  { id: 'fechado', label: 'Fechado', color: 'bg-emerald-500' },
  { id: 'perdido', label: 'Perdido', color: 'bg-rose-500' }
] as const;

const AVAILABLE_TAGS = [
  { id: 'proposta', label: 'PROPOSTA', color: 'bg-blue-600', light: 'bg-blue-50 text-blue-700' },
  { id: 'followup', label: 'FUP', color: 'bg-amber-600', light: 'bg-amber-50 text-amber-800' },
  { id: 'urgente', label: 'URGENTE', color: 'bg-red-600', light: 'bg-red-50 text-red-700' },
  { id: 'reuniao', label: 'REUNIÃO', color: 'bg-emerald-600', light: 'bg-emerald-50 text-emerald-700' }
];

export default function CRMMasterElite() {
  const [leads, setLeads] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [activeTab, setActiveTab] = useState('pipeline');
  const [currentWeek, setCurrentWeek] = useState(1);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // METAS EDITÁVEIS
  const [goals, setGoals] = useState({
    revenue: 100000,
    ticket: 5000,        // Editável
    contacts: 400,       // Editável (Contatos/mês)
    reactivated: 8,      // Editável
    conversion: 5,       // Meta Fixa 5%
    followUp: 90,        // Meta Fixa 90%
    crossSell: 40,       // Meta Fixa 40%
    upSell: 15,          // Meta Fixa 15%
    postSale: 100        // Meta Fixa 100%
  });

  const [commSettings, setCommSettings] = useState({
    weeks: { 1: { revenue: 0 }, 2: { revenue: 0 }, 3: { revenue: 0 }, 4: { revenue: 0 } } as any,
    profitMargin: 15
  });

  const [newLead, setNewLead] = useState({
    name: '', value: 0, stage: 'contato', notes: '', tags: '',
    followUp: false, postSale: false, hasCrossSell: false, hasUpSell: false, reactivated: false
  });

  // --- BUSCA E UPDATE ---
  const fetchLeads = useCallback(async () => {
    if (!supabase) return;
    const { data } = await supabase.from('leads').select('*').order('lastUpdate', { ascending: false });
    setLeads(data || []);
    setLoading(false);
  }, []);

  useEffect(() => { fetchLeads(); }, [fetchLeads]);

  const updateLead = async (id: string, updates: any) => {
    const payload = { ...updates, lastUpdate: new Date().toISOString() };
    setLeads(prev => prev.map(l => l.id === id ? { ...l, ...payload } : l));
    if (supabase) await supabase.from('leads').update(payload).eq('id', id);
  };

  const toggleTag = (lead: any, tagId: string) => {
    let current = lead.tags ? lead.tags.split(',').filter((t:string)=>t) : [];
    const updated = current.includes(tagId) ? current.filter((t:string)=>t !== tagId) : [...current, tagId];
    updateLead(lead.id, { tags: updated.join(',') });
  };

  // --- ENGINE DE CÁLCULO DE COMISSÃO (REGRAS SOLICITADAS) ---
  const analytics = useMemo(() => {
    const active = leads.filter(l => !l.isArchived);
    const searched = active.filter(l => l.name.toLowerCase().includes(searchTerm.toLowerCase()));
    const won = active.filter(l => l.stage === 'fechado');
    
    // Cálculos Base
    const funnel = {
      prospec: active.length,
      orc: active.filter(l => ['orcamento', 'negociacao', 'fechado'].includes(l.stage)).length,
      fechado: won.length
    };

    const kpis = {
      conv: active.length > 0 ? (won.length / active.length) * 100 : 0,
      cross: won.length > 0 ? (won.filter(l => l.hasCrossSell).length / won.length) * 100 : 0,
      up: won.length > 0 ? (won.filter(l => l.hasUpSell).length / won.length) * 100 : 0,
      fup: funnel.orc > 0 ? (active.filter(l => l.followUp).length / funnel.orc) * 100 : 0,
      post: won.length > 0 ? (won.filter(l => l.postSale).length / won.length) * 100 : 0,
      react: active.filter(l => l.reactivated).length,
      ticket: won.length > 0 ? (won.reduce((a,c) => a + Number(c.value), 0) / won.length) : 0
    };

    const totalRev = Object.values(commSettings.weeks).reduce((a: any, b: any) => a + Number(b.revenue || 0), 0);
    const revPerf = (totalRev / goals.revenue) * 100;
    
    // Regra Principal: Margem > 0
    const isMarginOk = commSettings.profitMargin > 0;

    // Alíquota Base (Faturamento)
    let baseRate = 0;
    if (revPerf >= 110) baseRate = 3.5;
    else if (revPerf >= 100) baseRate = 2.5;
    else if (revPerf >= 90) baseRate = 1.5;

    // Bônus Variáveis (+0.5% cada) - Dependem da Margem > 0
    const bonusTicket = (isMarginOk && kpis.ticket >= goals.ticket) ? 0.5 : 0;
    const bonusConv = (isMarginOk && kpis.conv >= goals.conversion) ? 0.5 : 0;
    const bonusCross = (isMarginOk && kpis.cross >= goals.crossSell) ? 0.5 : 0;
    const bonusUp = (isMarginOk && kpis.up >= goals.upSell) ? 0.5 : 0;

    const finalRate = isMarginOk ? (baseRate + bonusTicket + bonusConv + bonusCross + bonusUp) : 0;

    // Bônus de R$ 300,00 (Regra: Todas as 4 sub-metas devem ser atingidas)
    const subMetaProspec = funnel.prospec >= goals.contacts;
    const subMetaFUP = kpis.fup >= goals.followUp;
    const subMetaPost = kpis.post >= goals.postSale;
    const subMetaReact = kpis.react >= goals.reactivated;

    const qualifiesForFixedBonus = isMarginOk && subMetaProspec && subMetaFUP && subMetaPost && subMetaReact;
    const fixedBonusValue = qualifiesForFixedBonus ? 300 : 0;

    return { 
      searched, funnel, kpis, totalRev, finalRate, 
      totalComm: (totalRev * (finalRate / 100)) + fixedBonusValue,
      isMarginOk, fixedBonusValue,
      subMetas: { subMetaProspec, subMetaFUP, subMetaPost, subMetaReact }
    };
  }, [leads, searchTerm, commSettings, goals]);

  return (
    <div className="min-h-screen bg-[#F1F5F9] p-4 lg:p-6 text-[11px] font-sans">
      
      {/* HEADER */}
      <header className="max-w-[1800px] mx-auto mb-8 flex justify-between items-center bg-white p-5 rounded-[2.5rem] shadow-sm border border-white">
        <h1 className="text-3xl font-black italic text-slate-900 tracking-tighter">SALES<span className="text-blue-600">ULTRA</span></h1>
        <div className="flex gap-2">
          {['pipeline', 'metrics', 'commission'].map(t => (
            <button key={t} onClick={() => setActiveTab(t)} className={`px-6 py-2 rounded-full font-black uppercase transition-all ${activeTab === t ? 'bg-slate-900 text-white' : 'text-slate-400'}`}>{t}</button>
          ))}
          <button onClick={() => setIsModalOpen(true)} className="bg-blue-600 text-white p-2 rounded-full ml-4 shadow-lg shadow-blue-100 hover:scale-110 transition-transform"><PlusCircle size={24}/></button>
        </div>
      </header>

      {/* VIEW: PIPELINE */}
      {activeTab === 'pipeline' && (
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          {STAGES.map(stage => {
            const stageLeads = analytics.searched.filter(l => l.stage === stage.id && Number(l.week || 1) === currentWeek);
            const stageTotal = stageLeads.reduce((acc, curr) => acc + (Number(curr.value) || 0), 0);
            return (
              <div key={stage.id} onDragOver={e => e.preventDefault()} onDrop={e => updateLead(e.dataTransfer.getData("leadId"), { stage: stage.id })} className="bg-slate-200/40 rounded-[2.5rem] p-4 min-h-[750px] flex flex-col border border-slate-300/30">
                <div className="mb-6 px-3">
                  <span className="font-black uppercase text-slate-500 text-[8px] tracking-[0.2em]">{stage.label}</span>
                  <div className="text-2xl font-black italic text-slate-900">R$ {stageTotal.toLocaleString('pt-BR')}</div>
                </div>

                <div className="space-y-4">
                  {stageLeads.map(lead => (
                    <div key={lead.id} draggable onDragStart={e => e.dataTransfer.setData("leadId", lead.id)} className="bg-white p-5 rounded-[2.5rem] shadow-md border-2 border-white hover:border-blue-100 transition-all cursor-grab">
                      
                      {/* PÍLULAS DE TAGS */}
                      <div className="flex flex-wrap gap-1 mb-3">
                        {lead.tags?.split(',').filter((t:any)=>t).map((tId:any) => {
                          const tag = AVAILABLE_TAGS.find(at => at.id === tId);
                          return tag && <span key={tId} className={`px-2 py-0.5 rounded-full text-[7px] font-black uppercase border ${tag.light}`}>{tag.label}</span>;
                        })}
                      </div>

                      <input className="font-black text-slate-900 uppercase text-[12px] mb-2 bg-transparent border-none w-full outline-none" value={lead.name} onChange={e => updateLead(lead.id, { name: e.target.value })} />
                      
                      <div className="flex items-center text-emerald-600 font-black mb-3">
                        <span className="mr-1 italic text-[9px]">R$</span>
                        <input type="number" className="bg-transparent border-none p-0 focus:ring-0 font-black italic text-base w-full outline-none" value={lead.value} onChange={e => updateLead(lead.id, { value: Number(e.target.value) })} />
                      </div>

                      <textarea className="w-full text-[9px] font-bold text-slate-500 bg-slate-50 rounded-xl p-3 border-none resize-none h-14 mb-4 outline-none" placeholder="Briefing..." value={lead.notes || ''} onChange={e => updateLead(lead.id, { notes: e.target.value })} />

                      {/* BOTÕES DE TAGS NOS CARDS */}
                      <div className="flex justify-between gap-1 mb-4 p-1.5 bg-slate-50 rounded-full">
                        {AVAILABLE_TAGS.map(tag => (
                          <button key={tag.id} onClick={() => toggleTag(lead, tag.id)} className={`w-5 h-5 rounded-full border-2 transition-all ${lead.tags?.includes(tag.id) ? `${tag.color} border-white shadow-sm` : 'bg-white border-slate-100'}`} />
                        ))}
                      </div>

                      {/* BOTÕES DE ATRIBUTOS (NEGRITO E PRETO) */}
                      <div className="grid grid-cols-2 gap-1.5">
                        <button onClick={() => updateLead(lead.id, { followUp: !lead.followUp })} className={`py-1.5 rounded-xl text-[8px] border font-black ${lead.followUp ? 'bg-amber-400 text-black border-transparent' : 'bg-white text-black border-slate-100'}`}>FOLLOW-UP</button>
                        <button onClick={() => updateLead(lead.id, { hasUpSell: !lead.hasUpSell })} className={`py-1.5 rounded-xl text-[8px] border font-black ${lead.hasUpSell ? 'bg-purple-400 text-black border-transparent' : 'bg-white text-black border-slate-100'}`}>UP-SELL</button>
                        <button onClick={() => updateLead(lead.id, { hasCrossSell: !lead.hasCrossSell })} className={`py-1.5 rounded-xl text-[8px] border font-black ${lead.hasCrossSell ? 'bg-blue-400 text-black border-transparent' : 'bg-white text-black border-slate-100'}`}>CROSS-SELL</button>
                        <button onClick={() => updateLead(lead.id, { reactivated: !lead.reactivated })} className={`py-1.5 rounded-xl text-[8px] border font-black ${lead.reactivated ? 'bg-emerald-400 text-black border-transparent' : 'bg-white text-black border-slate-100'}`}>REATIADO</button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* VIEW: COMMISSION - DARK MODE */}
      {activeTab === 'commission' && (
        <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-8 bg-slate-950 p-12 rounded-[4rem] text-white">
          <div className="lg:col-span-2 space-y-8">
            <div>
              <p className="text-blue-400 font-black uppercase tracking-[0.4em] mb-2 text-[10px]">Total de Comissão</p>
              <h2 className="text-8xl font-black italic tracking-tighter">R$ {analytics.totalComm.toLocaleString('pt-BR')}</h2>
              {analytics.profitMargin <= 0 && <div className="text-rose-500 font-black mt-4 flex items-center gap-2 uppercase tracking-widest animate-pulse"><Lock size={16}/> Pagamento Bloqueado (Margem ≤ 0)</div>}
            </div>

            <div className="grid gap-4 pt-10">
              <h3 className="text-blue-400 font-black uppercase italic mb-4 text-[10px] tracking-widest">Faróis de Premiação</h3>
              
              {/* REGRAS DE 0.5% */}
              <Rule status={analytics.kpis.ticket >= goals.ticket} label="Meta Ticket Médio" desc={`Realizado: R$ ${analytics.kpis.ticket.toFixed(0)} / Meta: R$ ${goals.ticket}`} />
              <Rule status={analytics.kpis.conv >= goals.conversion} label="Meta Conversão Total (5%)" desc={`Realizado: ${analytics.kpis.conv.toFixed(1)}%`} />
              <Rule status={analytics.kpis.cross >= goals.crossSell} label="Meta Cross-Sell (40%)" desc={`Realizado: ${analytics.kpis.cross.toFixed(1)}%`} />
              <Rule status={analytics.kpis.up >= goals.upSell} label="Meta Up-Sell (15%)" desc={`Realizado: ${analytics.kpis.up.toFixed(1)}%`} />

              {/* REGRA BÔNUS FIXO R$ 300,00 */}
              <div className={`p-6 rounded-3xl border-2 transition-all ${analytics.fixedBonusValue > 0 ? 'bg-blue-600/20 border-blue-500' : 'bg-white/5 border-white/5 opacity-50'}`}>
                <div className="flex justify-between items-center mb-4">
                  <p className="font-black uppercase italic text-blue-400 text-lg">Bônus Extra R$ 300,00</p>
                  {analytics.fixedBonusValue > 0 ? <CheckCircle2 className="text-blue-400" /> : <X className="text-rose-500" />}
                </div>
                <div className="grid grid-cols-2 gap-4">
                   <MiniRule status={analytics.subMetas.subMetaProspec} label={`Prospec: ${analytics.funnel.prospec}/${goals.contacts}`} />
                   <MiniRule status={analytics.subMetas.subMetaFUP} label={`FUP: ${analytics.kpis.fup.toFixed(0)}%/90%`} />
                   <MiniRule status={analytics.subMetas.subMetaPost} label={`Pós-Venda: ${analytics.kpis.post.toFixed(0)}%/100%`} />
                   <MiniRule status={analytics.subMetas.subMetaReact} label={`Reativ: ${analytics.kpis.react}/${goals.reactivated}`} />
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <div className="bg-white/5 p-8 rounded-[3rem] border border-white/10 space-y-6">
               <p className="font-black text-center text-blue-400 uppercase italic">Ajuste de Metas Editáveis</p>
               <div className="space-y-4">
                 <GoalInput label="Meta Ticket Médio (R$)" val={goals.ticket} onChange={v => setGoals({...goals, ticket: v})} />
                 <GoalInput label="Meta Contatos/Mês" val={goals.contacts} onChange={v => setGoals({...goals, contacts: v})} />
                 <GoalInput label="Meta Clientes Reativados" val={goals.reactivated} onChange={v => setGoals({...goals, reactivated: v})} />
                 <GoalInput label="Meta Faturamento Mês (R$)" val={goals.revenue} onChange={v => setGoals({...goals, revenue: v})} />
                 <div className="pt-4 border-t border-white/10">
                    <GoalInput label="Margem de Lucro (%)" val={commSettings.profitMargin} onChange={v => setCommSettings({...commSettings, profitMargin: v})} highlight />
                 </div>
               </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL NOVO LEAD */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-950/90 backdrop-blur-md z-[9999] flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-xl rounded-[4rem] p-12 shadow-2xl relative border-t-[15px] border-blue-600">
            <button onClick={() => setIsModalOpen(false)} className="absolute top-10 right-10 text-slate-300 hover:text-rose-500 transition-colors"><X size={32}/></button>
            <h2 className="text-4xl font-black uppercase italic tracking-tighter mb-10">Novo Lead</h2>
            <div className="space-y-5">
              <input className="w-full p-6 bg-slate-100 rounded-3xl font-black text-xl outline-none" placeholder="NOME DA EMPRESA" value={newLead.name} onChange={e => setNewLead({...newLead, name: e.target.value.toUpperCase()})} />
              <input type="number" className="w-full p-6 bg-slate-100 rounded-3xl font-black text-xl outline-none" placeholder="VALOR ESTIMADO (R$)" value={newLead.value} onChange={e => setNewLead({...newLead, value: Number(e.target.value)})} />
              <textarea className="w-full p-6 bg-slate-100 rounded-3xl font-black text-sm outline-none h-24" placeholder="BREVE BRIEFING DO LEAD..." value={newLead.notes} onChange={e => setNewLead({...newLead, notes: e.target.value})} />
              <button 
                onClick={async () => {
                  if (supabase) await supabase.from('leads').insert([{...newLead, lastUpdate: new Date().toISOString(), week: currentWeek}]);
                  setIsModalOpen(false); fetchLeads();
                  setNewLead({name: '', value: 0, stage: 'contato', notes: '', tags: '', followUp: false, postSale: false, hasCrossSell: false, hasUpSell: false, reactivated: false});
                }}
                className="w-full p-8 bg-blue-600 text-white rounded-full font-black uppercase text-xl shadow-xl hover:scale-[1.02] transition-all"
              >CRIAR OPORTUNIDADE</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// --- SUBCOMPONENTES ---
const Rule = ({ status, label, desc }: any) => (
  <div className={`flex items-center gap-4 p-5 rounded-3xl border transition-all ${status ? 'bg-emerald-500/10 border-emerald-500/30' : 'bg-white/5 border-white/5 opacity-40'}`}>
    <div className={`w-3 h-3 rounded-full ${status ? 'bg-emerald-500 shadow-[0_0_10px_#10b981]' : 'bg-rose-500'}`} />
    <div className="flex-1">
      <p className={`font-black uppercase text-[10px] ${status ? 'text-emerald-400' : 'text-slate-500'}`}>{label}</p>
      <p className="text-[9px] font-bold opacity-60 text-slate-400">{desc}</p>
    </div>
    {status ? <CheckCircle2 className="text-emerald-500" size={18}/> : <AlertCircle className="text-slate-600" size={18}/>}
  </div>
);

const MiniRule = ({ status, label }: any) => (
  <div className="flex items-center gap-2">
    <div className={`w-2 h-2 rounded-full ${status ? 'bg-blue-400' : 'bg-rose-500'}`} />
    <span className={`text-[9px] font-black uppercase ${status ? 'text-white' : 'text-slate-500'}`}>{label}</span>
  </div>
);

const GoalInput = ({ label, val, onChange, highlight }: any) => (
  <div>
    <label className="text-[8px] font-black uppercase opacity-40 ml-4 mb-2 block tracking-widest">{label}</label>
    <input 
      type="number" 
      value={val} 
      onChange={e => onChange(Number(e.target.value))} 
      className={`w-full bg-white/5 border border-white/10 p-4 rounded-2xl font-black text-xl text-center outline-none focus:border-blue-500 transition-all ${highlight ? 'text-blue-400' : 'text-white'}`} 
    />
  </div>
);
