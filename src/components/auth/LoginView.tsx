import React, { useState } from 'react';
import { 
  Lock, Mail, KeyRound, Eye, EyeOff, 
  ArrowRight, AlertCircle, ArrowLeft
} from 'lucide-react';
import { StoreProfile, SystemUser } from '../../types';
import { BrandLogo } from '../common/BrandLogo';
import { storageService } from '../../services/storage';
import { firebaseAuth } from '../../services/firebase';

interface LoginViewProps {
  store: StoreProfile;
  onLoginSuccess: (user: SystemUser) => void;
  onOpenShowroom: () => void;
}

export const LoginView: React.FC<LoginViewProps> = ({
  store,
  onLoginSuccess,
  onOpenShowroom
}) => {
  const [loginInput, setLoginInput] = useState(() => {
    try {
      return localStorage.getItem('vaveiculos_remember_user') || '';
    } catch {
      return '';
    }
  });
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (!loginInput.trim()) {
      setErrorMsg('Por favor, informe seu e-mail corporativo.');
      return;
    }
    if (!password.trim()) {
      setErrorMsg('Por favor, informe sua senha de acesso.');
      return;
    }

    setIsLoading(true);

    setTimeout(async () => {
      const result = storageService.authenticateUser(loginInput, password);

      if (!result.success || !result.user) {
        setErrorMsg(result.error || 'Credenciais inválidas. Verifique seu e-mail e senha.');
        setIsLoading(false);
        return;
      }

      await firebaseAuth.signInStaff(result.user.email, password);

      if (rememberMe) {
        localStorage.setItem('vaveiculos_remember_user', result.user.email);
      } else {
        localStorage.removeItem('vaveiculos_remember_user');
      }

      setPassword('');
      setIsLoading(false);
      onLoginSuccess(result.user);
    }, 250);
  };

  return (
    <div className="min-h-screen bg-[#080809] text-[#F5F5F5] flex flex-col justify-between selection:bg-[#D4130D] selection:text-white relative overflow-hidden font-sans">
      
      {/* Background ambient lighting effects */}
      <div className="absolute -top-40 -left-40 w-96 h-96 bg-[#D4130D]/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-[#3B82F6]/10 rounded-full blur-3xl pointer-events-none" />

      {/* Top Bar with Showroom Return */}
      <header className="h-16 px-4 sm:px-8 border-b border-[#2D2D32]/80 flex items-center justify-between z-10 bg-[#080809]/80 backdrop-blur-md">
        <BrandLogo store={store} size="sm" />

        <button
          type="button"
          onClick={onOpenShowroom}
          className="flex items-center gap-2 px-3.5 py-1.5 rounded-[8px] bg-[#17171A] hover:bg-[#202024] border border-[#2D2D32] hover:border-[#D4130D]/50 text-xs font-semibold text-[#CAC9CA] hover:text-white transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-3.5 h-3.5 text-[#D4130D]" />
          <span>Vitrine Pública de Veículos</span>
        </button>
      </header>

      {/* Main Login Card Area */}
      <main className="flex-1 flex items-center justify-center p-4 sm:p-6 z-10 my-4">
        <div className="w-full max-w-md bg-[#121214] border border-[#2D2D32] rounded-[20px] shadow-2xl p-6 sm:p-8 space-y-6">
          
          {/* Card Header */}
          <div className="text-center space-y-2">
            <div className="inline-flex p-3 rounded-[12px] bg-[#17171A] border border-[#2D2D32] text-[#D4130D] shadow-inner mb-1">
              <Lock className="w-6 h-6" />
            </div>
            <h1 className="text-xl sm:text-2xl font-black text-[#F5F5F5] font-display tracking-tight uppercase">
              Painel de Gestão VA
            </h1>
            <p className="text-xs text-[#A7A7AB]">
              Informe suas credenciais corporativas para acessar o sistema
            </p>
          </div>

          {/* Error Message */}
          {errorMsg && (
            <div className="p-3.5 rounded-[10px] bg-[#D4130D]/10 border border-[#D4130D]/30 flex items-start gap-2.5 text-xs text-[#F87171] animate-in fade-in-50">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-[#D4130D]" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            
            {/* Campo de Identificação e E-mail */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-[#A7A7AB] uppercase tracking-wider block">
                E-mail ou Nome de Usuário
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-[#A7A7AB] absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  required
                  autoFocus
                  maxLength={120}
                  value={loginInput}
                  onChange={(e) => {
                    setLoginInput(e.target.value);
                    if (errorMsg) setErrorMsg('');
                  }}
                  placeholder="usuario@vaveiculos.com.br"
                  className="w-full bg-[#1A1A1E] text-sm text-[#F5F5F5] placeholder-[#68686E] pl-10 pr-3 py-2.5 rounded-[8px] border border-[#2D2D32] focus:border-[#D4130D] focus:outline-none focus:ring-1 focus:ring-[#D4130D] transition-colors"
                />
              </div>
            </div>

            {/* Campo de Senha */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-[11px] font-bold text-[#A7A7AB] uppercase tracking-wider block">
                  Senha de Acesso
                </label>
              </div>
              <div className="relative">
                <KeyRound className="w-4 h-4 text-[#A7A7AB] absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  maxLength={64}
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    if (errorMsg) setErrorMsg('');
                  }}
                  placeholder="••••••••"
                  className="w-full bg-[#1A1A1E] text-sm text-[#F5F5F5] placeholder-[#68686E] pl-10 pr-10 py-2.5 rounded-[8px] border border-[#2D2D32] focus:border-[#D4130D] focus:outline-none focus:ring-1 focus:ring-[#D4130D] transition-colors"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#A7A7AB] hover:text-[#F5F5F5] transition-colors cursor-pointer"
                  title={showPassword ? 'Ocultar senha' : 'Exibir senha'}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Remember Me */}
            <div className="flex items-center justify-between pt-1">
              <label className="flex items-center gap-2 cursor-pointer text-xs text-[#CAC9CA]">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="w-4 h-4 rounded bg-[#1A1A1E] border-[#2D2D32] text-[#D4130D] focus:ring-0 focus:ring-offset-0 cursor-pointer"
                />
                <span>Lembrar meu e-mail neste dispositivo</span>
              </label>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3 px-4 rounded-[8px] bg-[#D4130D] hover:bg-[#E3271F] disabled:opacity-50 text-white font-bold text-sm tracking-wide uppercase transition-all shadow-lg flex items-center justify-center gap-2 cursor-pointer mt-2"
            >
              {isLoading ? (
                <span>Validando credenciais...</span>
              ) : (
                <>
                  <span>Entrar no Sistema</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* Quick Fill Demo Credentials para Apresentação */}
          <div className="pt-2 border-t border-[#2D2D32]/80">
            <span className="text-[10px] uppercase font-bold text-[#A7A7AB] tracking-wider block mb-2 text-center">
              Credenciais Prontas para Apresentação
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => {
                  setLoginInput('admin@vaveiculos.com.br');
                  setPassword('Va@2026!');
                  setErrorMsg('');
                }}
                className="p-2.5 rounded-[10px] bg-[#17171A] hover:bg-[#202024] border border-[#2D2D32] hover:border-[#D4130D]/60 text-left transition-colors cursor-pointer group"
                title="Clique para preencher credenciais de Gestor Geral"
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-bold text-[#F5F5F5] group-hover:text-[#D4130D] transition-colors">
                    1. Gestor Geral
                  </span>
                  <span className="text-[9px] px-1.5 py-0.5 rounded bg-[#D4130D]/20 text-[#D4130D] font-bold">
                    Acesso Total
                  </span>
                </div>
                <span className="text-[10px] text-[#CAC9CA] block truncate">admin@vaveiculos.com.br</span>
                <span className="text-[9px] text-[#8E8D92] block mt-0.5">DRE, Auditoria, Comissões, Estoque</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setLoginInput('carlos@vaveiculos.com.br');
                  setPassword('Va@2026!');
                  setErrorMsg('');
                }}
                className="p-2.5 rounded-[10px] bg-[#17171A] hover:bg-[#202024] border border-[#2D2D32] hover:border-amber-500/60 text-left transition-colors cursor-pointer group"
                title="Clique para preencher credenciais de Vendedor"
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-bold text-[#F5F5F5] group-hover:text-amber-400 transition-colors">
                    2. Vendedor (Carlos)
                  </span>
                  <span className="text-[9px] px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-400 font-bold">
                    Comercial
                  </span>
                </div>
                <span className="text-[10px] text-[#CAC9CA] block truncate">carlos@vaveiculos.com.br</span>
                <span className="text-[9px] text-[#8E8D92] block mt-0.5">Estoque, Vendas, Contratos</span>
              </button>
            </div>
            <p className="text-[10px] text-[#8E8D92] text-center mt-2">
              Senha padrão de demonstração: <strong className="text-white font-mono">Va@2026!</strong>
            </p>
          </div>

          {/* Aviso Institucional de Segurança */}
          <div className="pt-2 border-t border-[#2D2D32]/60 text-center">
            <p className="text-[11px] text-[#68686E]">
              Acesso monitorado e protegido por hash criptográfico e sessão assinada. Em caso de perda de senha, solicite redefinição ao Gestor Geral.
            </p>
          </div>

        </div>
      </main>

      {/* Footer */}
      <footer className="py-4 border-t border-[#2D2D32]/60 text-center text-[11px] text-[#68686E] z-10 bg-[#080809]">
        <div className="max-w-4xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-1">
          <span>{store.nomeFantasia} • Areial - PB • CNPJ: {store.cnpj}</span>
          <span className="text-[#A7A7AB]">Autenticação Segura & Trilha de Auditoria LGPD</span>
        </div>
      </footer>

    </div>
  );
};

