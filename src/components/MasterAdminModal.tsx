import React, { useState, useEffect } from 'react';
import { 
  X, 
  Lock, 
  KeyRound, 
  Calendar, 
  DollarSign, 
  CheckCircle2, 
  AlertTriangle, 
  Save, 
  ShieldCheck, 
  Clock, 
  RefreshCw,
  Power,
  Plus,
  Eye,
  EyeOff
} from 'lucide-react';
import { SystemSubscription } from '../types';
import { saveSubscription, checkIsSubscriptionExpired } from '../services/storeService';

const MASTER_PASSWORD = 'xT7$mQ2!vB9#';

interface MasterAdminModalProps {
  isOpen: boolean;
  onClose: () => void;
  subscription: SystemSubscription;
}

export const MasterAdminModal: React.FC<MasterAdminModalProps> = ({
  isOpen,
  onClose,
  subscription,
}) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [passwordInput, setPasswordInput] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [passwordError, setPasswordError] = useState('');
  
  // Form values
  const [monthlyFee, setMonthlyFee] = useState<number>(subscription.monthlyFee || 150);
  const [startDate, setStartDate] = useState<string>(subscription.startDate || new Date().toISOString().split('T')[0]);
  const [dueDate, setDueDate] = useState<string>(subscription.dueDate || new Date().toISOString().split('T')[0]);
  const [isExpiredManual, setIsExpiredManual] = useState<boolean>(subscription.isExpiredManualOverride || false);
  const [notes, setNotes] = useState<string>(subscription.notes || '');

  const [isSaving, setIsSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');

  // Sync state when props update
  useEffect(() => {
    if (subscription) {
      setMonthlyFee(subscription.monthlyFee || 150);
      setStartDate(subscription.startDate || new Date().toISOString().split('T')[0]);
      setDueDate(subscription.dueDate || new Date().toISOString().split('T')[0]);
      setIsExpiredManual(subscription.isExpiredManualOverride || false);
      setNotes(subscription.notes || '');
    }
  }, [subscription, isOpen]);

  if (!isOpen) return null;

  const handlePasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (passwordInput.trim() === MASTER_PASSWORD) {
      setIsAuthenticated(true);
      setPasswordError('');
      setPasswordInput('');
    } else {
      setPasswordError('Senha master incorreta. Acesso não autorizado.');
    }
  };

  // Helper to add days to due date
  const handleAddDays = (days: number) => {
    const baseDate = dueDate ? new Date(dueDate + 'T12:00:00') : new Date();
    // If already expired, advance from today
    const now = new Date();
    const effectiveBase = baseDate.getTime() < now.getTime() ? now : baseDate;
    
    effectiveBase.setDate(effectiveBase.getDate() + days);
    const newDueDate = effectiveBase.toISOString().split('T')[0];
    setDueDate(newDueDate);
    setIsExpiredManual(false); // remove manual lock
  };

  const handleSave = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setIsSaving(true);
    setSuccessMsg('');

    try {
      const updated: SystemSubscription = {
        ...subscription,
        monthlyFee: Number(monthlyFee) || 0,
        startDate,
        dueDate,
        isExpiredManualOverride: isExpiredManual,
        notes,
        updatedAt: new Date().toISOString(),
      };

      await saveSubscription(updated);
      setSuccessMsg('✓ Dados da assinatura e vencimento salvos com sucesso!');
      setTimeout(() => setSuccessMsg(''), 4000);
    } catch (err) {
      console.error('Error saving subscription:', err);
    } finally {
      setIsSaving(false);
    }
  };

  // Calculate preview status with current form dates
  const previewExpired = checkIsSubscriptionExpired({
    id: 'preview',
    monthlyFee,
    startDate,
    dueDate,
    isExpiredManualOverride: isExpiredManual,
  });

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center p-3 sm:p-4 bg-stone-950/85 backdrop-blur-md animate-in fade-in overflow-y-auto">
      <div className="bg-white w-full max-w-lg rounded-3xl shadow-2xl border border-stone-200 overflow-hidden flex flex-col my-auto animate-in zoom-in-95">
        
        {/* Top Header */}
        <div className="p-4 sm:p-5 bg-stone-900 text-white flex items-center justify-between border-b border-stone-800">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-blue-600 text-white flex items-center justify-center font-bold">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-base">Painel Master de Assinatura</h3>
              <p className="text-[11px] text-stone-400">Controle de Mensalidade & Expiração</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-stone-400 hover:text-white hover:bg-stone-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Lock Screen if Not Authenticated */}
        {!isAuthenticated ? (
          <div className="p-6 sm:p-8 text-center space-y-5">
            <div className="w-14 h-14 rounded-2xl bg-amber-100 text-amber-700 mx-auto flex items-center justify-center">
              <KeyRound className="w-7 h-7" />
            </div>

            <div>
              <h4 className="font-extrabold text-stone-900 text-lg">Acesso Restrito do Administrador</h4>
              <p className="text-xs text-stone-500 mt-1">
                Digite a senha master para gerenciar a mensalidade e a liberação do site.
              </p>
            </div>

            <form onSubmit={handlePasswordSubmit} className="space-y-3.5 max-w-xs mx-auto">
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Digite a senha master"
                  value={passwordInput}
                  onChange={(e) => setPasswordInput(e.target.value)}
                  className="w-full text-center py-3 pl-4 pr-10 rounded-xl border border-stone-300 focus:border-blue-600 focus:ring-2 focus:ring-blue-500/20 text-sm font-bold outline-none"
                  autoFocus
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600 p-1"
                  tabIndex={-1}
                  title={showPassword ? 'Ocultar senha' : 'Ver senha'}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>

              {passwordError && (
                <p className="text-xs font-bold text-rose-600 animate-in fade-in">{passwordError}</p>
              )}

              <button
                type="submit"
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-xl text-sm transition-all shadow-md shadow-blue-700/20 active:scale-98"
              >
                Acessar Painel Master
              </button>
            </form>
          </div>
        ) : (
          /* Master Admin Management Form */
          <div className="p-4 sm:p-6 space-y-5 overflow-y-auto max-h-[82vh]">
            
            {/* Live Status Banner */}
            <div className={`p-4 rounded-2xl border flex items-start gap-3 ${
              previewExpired.isExpired 
                ? 'bg-rose-50 border-rose-200 text-rose-900' 
                : 'bg-blue-50 border-blue-200 text-blue-900'
            }`}>
              {previewExpired.isExpired ? (
                <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
              ) : (
                <CheckCircle2 className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
              )}
              <div className="flex-1">
                <span className="font-extrabold text-xs uppercase tracking-wider block">
                  Status Atual do Site:
                </span>
                <p className="font-extrabold text-sm sm:text-base mt-0.5">
                  {previewExpired.isExpired 
                    ? '⛔ SITE BLOQUEADO / EXPIRADO' 
                    : '✅ SITE ATIVO & LIBERADO'}
                </p>
                <p className="text-xs mt-1 text-stone-600">
                  {previewExpired.isExpired
                    ? 'Os clientes estão vendo a tela de "Página expirada". Atualize a data de vencimento abaixo para reativar o site imediatamente.'
                    : `Vencimento programado para ${previewExpired.formattedDueDate} (${previewExpired.daysRemaining} dias restantes).`}
                </p>
              </div>
            </div>

            {successMsg && (
              <div className="p-3 bg-blue-100 border border-blue-300 text-blue-900 text-xs font-bold rounded-xl flex items-center gap-2 animate-in fade-in">
                <CheckCircle2 className="w-4 h-4 text-blue-700 shrink-0" />
                <span>{successMsg}</span>
              </div>
            )}

            {/* Subscription Form Inputs */}
            <div className="space-y-4">
              {/* Valor Mensal */}
              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1 flex items-center gap-1.5">
                  <DollarSign className="w-4 h-4 text-stone-500" />
                  <span>Valor Mensal (R$):</span>
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-stone-400">R$</span>
                  <input
                    type="number"
                    step="0.01"
                    value={monthlyFee}
                    onChange={(e) => setMonthlyFee(parseFloat(e.target.value) || 0)}
                    placeholder="150.00"
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-stone-300 text-sm font-black text-stone-900 outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              {/* Datas de Início e Vencimento */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-stone-700 mb-1 flex items-center gap-1.5">
                    <Calendar className="w-4 h-4 text-stone-500" />
                    <span>Data de Início:</span>
                  </label>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl border border-stone-300 text-xs font-bold text-stone-800 outline-none focus:border-blue-500 bg-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-stone-700 mb-1 flex items-center gap-1.5">
                    <Calendar className="w-4 h-4 text-blue-600" />
                    <span>Data de Vencimento:</span>
                  </label>
                  <input
                    type="date"
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl border border-stone-300 text-xs font-black text-blue-900 outline-none focus:border-blue-500 bg-white ring-2 ring-blue-500/10"
                  />
                </div>
              </div>

              {/* Botões Rápidos de Renovação */}
              <div className="p-3.5 bg-stone-50 border border-stone-200 rounded-2xl space-y-2">
                <span className="text-[11px] font-extrabold text-stone-600 uppercase tracking-wider block">
                  ⚡ Renovar / Estender Prazo Rapidamente:
                </span>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => handleAddDays(30)}
                    className="py-2 px-2 rounded-xl bg-white hover:bg-blue-50 text-blue-700 border border-blue-200 text-xs font-bold transition-all shadow-xs flex items-center justify-center gap-1 active:scale-95"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>+ 30 Dias</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleAddDays(60)}
                    className="py-2 px-2 rounded-xl bg-white hover:bg-blue-50 text-blue-700 border border-blue-200 text-xs font-bold transition-all shadow-xs flex items-center justify-center gap-1 active:scale-95"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>+ 60 Dias</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleAddDays(365)}
                    className="py-2 px-2 rounded-xl bg-white hover:bg-blue-50 text-blue-700 border border-blue-200 text-xs font-bold transition-all shadow-xs flex items-center justify-center gap-1 active:scale-95"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>+ 1 Ano</span>
                  </button>
                </div>
              </div>

              {/* Opção Manual de Bloqueio/Teste */}
              <div className="p-3 bg-stone-50 border border-stone-200 rounded-2xl flex items-center justify-between gap-3">
                <div>
                  <span className="text-xs font-bold text-stone-800 block">
                    Forçar Bloqueio Imediato (Manual)
                  </span>
                  <span className="text-[11px] text-stone-500 block">
                    Ative caso queira suspender o site mesmo antes da data de vencimento.
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setIsExpiredManual(!isExpiredManual)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 ${
                    isExpiredManual
                      ? 'bg-rose-600 text-white shadow-xs'
                      : 'bg-stone-200 text-stone-700 hover:bg-stone-300'
                  }`}
                >
                  {isExpiredManual ? 'Bloqueio Ativo' : 'Desativado'}
                </button>
              </div>

              {/* Observações / Anotações */}
              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1">
                  Observações Internas (Cliente / Contrato):
                </label>
                <textarea
                  rows={2}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Ex: Mensalidade paga via Pix referente ao mês de Outubro..."
                  className="w-full px-3 py-2 rounded-xl border border-stone-300 text-xs text-stone-800 bg-white outline-none focus:border-blue-500"
                />
              </div>
            </div>

            {/* Botão Salvar e Atualizar Site */}
            <div className="pt-2">
              <button
                type="button"
                onClick={() => handleSave()}
                disabled={isSaving}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-extrabold py-3.5 px-4 rounded-2xl text-sm flex items-center justify-center gap-2 shadow-lg shadow-blue-700/25 active:scale-98 transition-all disabled:opacity-50"
              >
                {isSaving ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Salvando Alterações...</span>
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    <span>Salvar Dados & Reativar Site</span>
                  </>
                )}
              </button>
            </div>

          </div>
        )}

      </div>
    </div>
  );
};
