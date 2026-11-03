import React, { useState } from 'react';
import { 
  X, Lock, KeyRound, Mail, Eye, EyeOff, AlertCircle, ArrowRight 
} from 'lucide-react';
import { UserRole, Salesperson, StoreProfile, SystemUser } from '../../types';
import { BrandLogo } from './BrandLogo';
import { auditLogger } from '../../services/auditLogger';
import { storageService } from '../../services/storage';
import { firebaseAuth } from '../../services/firebase';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLoginSuccess?: (role: UserRole, salesperson?: Salesperson) => void;
  onSuccess?: (role: UserRole, salesperson?: Salesperson) => void;
  onAuthenticatedUser?: (user: SystemUser, salesperson?: Salesperson) => void;
  salespeople: Salesperson[];
  store?: StoreProfile;
  title?: string;
  subtitle?: string;
  targetRole?: UserRole;
  defaultRole?: UserRole;
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  onLoginSuccess,
  onSuccess,
  onAuthenticatedUser,
  salespeople,
  store,
  title,
  subtitle,
  targetRole
}) => {
  const [emailInput, setEmailInput] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleSuccessCallback = (user: SystemUser, salesperson?: Salesperson) => {
    if (onAuthenticatedUser) {
      onAuthenticatedUser(user, salesperson);
    }
    if (onLoginSuccess) {
      onLoginSuccess(user.papel, salesperson);
    } else if (onSuccess) {
      onSuccess(user.papel, salesperson);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    const cleanPass = password.trim();
    if (!cleanPass) {
      setErrorMsg('Informe sua senha de acesso.');
      return;
    }

    const loginIdentifier = emailInput.trim();
    if (!loginIdentifier) {
      setErrorMsg('Informe seu e-mail corporativo para autenticação.');
      return;
    }

    setIsSubmitting(true);
    const authResult = storageService.authenticateUser(loginIdentifier, cleanPass);

    if (!authResult.success || !authResult.user) {
      setErrorMsg(authResult.error || 'Credenciais inválidas. Verifique e-mail e senha.');
      setIsSubmitting(false);
      return;
    }

    if (targetRole && authResult.user.papel !== targetRole) {
      setErrorMsg(`Permissão negada: A conta informada não possui privilégio de ${targetRole === 'gestor' ? 'Gestor Geral' : 'Vendedor'}.`);
      setIsSubmitting(false);
      return;
    }

    await firebaseAuth.signInStaff(authResult.user.email, cleanPass);

    let matchedSeller: Salesperson | undefined;
    if (authResult.user.papel === 'vendedor') {
      matchedSeller =
        salespeople.find(
          s => s.id === authResult.user!.id || s.email.toLowerCase() === authResult.user!.email.toLowerCase()
        ) || salespeople[0];
    }

    auditLogger.log({
      acao: 'LOGIN_SISTEMA',
      categoria: 'sistema',
      usuarioNome: authResult.user.nome,
      usuarioPapel: authResult.user.papel,
      usuarioId: authResult.user.id,
      descricao: `Autenticação verificada (${authResult.user.papel.toUpperCase()}): ${authResult.user.nome}.`
    });

    handleSuccessCallback(authResult.user, matchedSeller);
    setPassword('');
    setEmailInput('');
    setIsSubmitting(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-6 animate-in fade-in duration-200">
      <div className="bg-[#17171A] border border-[#2D2D32] rounded-[16px] w-full max-w-md overflow-hidden shadow-2xl relative text-[#F5F5F5] my-8">
        
        {/* Header */}
        <div className="px-6 py-5 border-b border-[#2D2D32] flex items-center justify-between bg-[#080809]">
          <div className="flex items-center gap-3">
            <BrandLogo store={store} size="sm" showText={false} />
            <div>
              <h3 className="text-sm font-bold text-[#F5F5F5] font-display">
                {title || 'Autenticação de Segurança'}
              </h3>
              <p className="text-[11px] text-[#A7A7AB]">
                {subtitle || 'Confirme suas credenciais corporativas para continuar'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-[8px] bg-[#202024] hover:bg-[#2D2D32] flex items-center justify-center text-[#CAC9CA] hover:text-white transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          
          {errorMsg && (
            <div className="p-3 rounded-[8px] bg-[#D4130D]/10 border border-[#D4130D]/30 flex items-start gap-2.5 text-xs text-[#F5F5F5] animate-in fade-in">
              <AlertCircle className="w-4 h-4 text-[#D4130D] shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* E-mail Corporativo */}
          <div>
            <label className="block text-xs font-semibold text-[#A7A7AB] uppercase tracking-wider mb-1.5">
              E-mail Corporativo
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 text-[#A7A7AB] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="email"
                required
                autoFocus
                maxLength={120}
                value={emailInput}
                onChange={(e) => {
                  setEmailInput(e.target.value);
                  if (errorMsg) setErrorMsg('');
                }}
                placeholder="seu.email@vaveiculos.com.br"
                className="w-full bg-[#202024] border border-[#343439] rounded-[8px] pl-9 pr-3 py-2.5 text-xs sm:text-sm text-[#F5F5F5] placeholder-[#68686E] focus:outline-none focus:border-[#D4130D] transition-colors"
              />
            </div>
          </div>

          {/* Campo de Senha */}
          <div>
            <label className="block text-xs font-semibold text-[#A7A7AB] uppercase tracking-wider mb-1.5">
              Senha de Acesso
            </label>
            <div className="relative">
              <KeyRound className="w-4 h-4 text-[#A7A7AB] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type={showPassword ? 'text' : 'password'}
                required
                maxLength={64}
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  if (errorMsg) setErrorMsg('');
                }}
                placeholder="Informe sua senha pessoal"
                className="w-full bg-[#202024] border border-[#343439] rounded-[8px] pl-9 pr-10 py-2.5 text-xs sm:text-sm text-[#F5F5F5] placeholder-[#68686E] focus:outline-none focus:border-[#D4130D] transition-colors"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[#A7A7AB] hover:text-[#F5F5F5] cursor-pointer"
                title={showPassword ? 'Ocultar senha' : 'Exibir senha'}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Quick Chips para Apresentação */}
          <div className="flex items-center justify-between gap-2 pt-1 text-[10px]">
            <span className="text-[#8E8D92]">Preenchimento rápido:</span>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => {
                  setEmailInput('admin@vaveiculos.com.br');
                  setPassword('Va@2026!');
                  setErrorMsg('');
                }}
                className="px-2 py-0.5 rounded bg-[#D4130D]/20 hover:bg-[#D4130D]/30 text-[#D4130D] border border-[#D4130D]/30 font-semibold cursor-pointer transition-colors"
              >
                Gestor
              </button>
              <button
                type="button"
                onClick={() => {
                  setEmailInput('carlos@vaveiculos.com.br');
                  setPassword('Va@2026!');
                  setErrorMsg('');
                }}
                className="px-2 py-0.5 rounded bg-amber-500/20 hover:bg-amber-500/30 text-amber-400 border border-amber-500/30 font-semibold cursor-pointer transition-colors"
              >
                Vendedor
              </button>
            </div>
          </div>

          <div className="pt-2 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-[8px] bg-[#202024] hover:bg-[#2D2D32] border border-[#2D2D32] text-xs font-semibold text-[#CAC9CA] transition-colors cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2.5 rounded-[8px] bg-[#D4130D] hover:bg-[#E3271F] disabled:opacity-50 text-white text-xs font-bold flex items-center gap-2 shadow-sm transition-all cursor-pointer"
            >
              <Lock className="w-3.5 h-3.5" />
              {isSubmitting ? 'Verificando...' : 'Confirmar Acesso'}
              <ArrowRight className="w-3.5 h-3.5 ml-1" />
            </button>
          </div>

        </form>

      </div>
    </div>
  );
};

