import React from 'react';
import { LucideIcon } from 'lucide-react';

// Status badge with strict functional colors requested:
// Disponível: #22C55E | Vendido: #D4130D | Reservado: #F59E0B | Em negociação: #3B82F6 | Manutenção: #A855F7 | Inativo: #71717A
export interface StatusBadgeProps {
  status: 'em_estoque' | 'disponivel' | 'vendido' | 'reservado' | 'em_negociacao' | 'manutencao' | 'inativo' | 'repasse' | 'garantia' | 'pendente' | 'aprovado' | string;
  label?: string;
  size?: 'sm' | 'md';
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, label, size = 'sm' }) => {
  let bg = 'bg-[#2D2D32]/60';
  let text = 'text-[#CAC9CA]';
  let border = 'border-[#2D2D32]';
  let dotColor = '#CAC9CA';
  let displayLabel = label;

  switch (status.toLowerCase()) {
    case 'em_estoque':
    case 'disponivel':
    case 'disponível':
      bg = 'bg-[#22C55E]/10';
      text = 'text-[#22C55E]';
      border = 'border-[#22C55E]/20';
      dotColor = '#22C55E';
      displayLabel = displayLabel || 'DISPONÍVEL';
      break;
    case 'vendido':
      bg = 'bg-[#D4130D]/10';
      text = 'text-[#D4130D]';
      border = 'border-[#D4130D]/20';
      dotColor = '#D4130D';
      displayLabel = displayLabel || 'VENDIDO';
      break;
    case 'reservado':
      bg = 'bg-[#F59E0B]/10';
      text = 'text-[#F59E0B]';
      border = 'border-[#F59E0B]/20';
      dotColor = '#F59E0B';
      displayLabel = displayLabel || 'RESERVADO';
      break;
    case 'em_negociacao':
    case 'em negociação':
      bg = 'bg-[#3B82F6]/10';
      text = 'text-[#3B82F6]';
      border = 'border-[#3B82F6]/20';
      dotColor = '#3B82F6';
      displayLabel = displayLabel || 'EM NEGOCIAÇÃO';
      break;
    case 'manutencao':
    case 'manutenção':
      bg = 'bg-[#A855F7]/10';
      text = 'text-[#A855F7]';
      border = 'border-[#A855F7]/20';
      dotColor = '#A855F7';
      displayLabel = displayLabel || 'MANUTENÇÃO';
      break;
    case 'inativo':
      bg = 'bg-[#71717A]/10';
      text = 'text-[#71717A]';
      border = 'border-[#71717A]/20';
      dotColor = '#71717A';
      displayLabel = displayLabel || 'INATIVO';
      break;
    case 'repasse':
      bg = 'bg-[#F59E0B]/10';
      text = 'text-[#F59E0B]';
      border = 'border-[#F59E0B]/30';
      dotColor = '#F59E0B';
      displayLabel = displayLabel || 'REPASSE';
      break;
    case 'garantia':
    case 'venda':
      bg = 'bg-[#22C55E]/10';
      text = 'text-[#22C55E]';
      border = 'border-[#22C55E]/20';
      dotColor = '#22C55E';
      displayLabel = displayLabel || 'GARANTIA 90D';
      break;
    case 'pendente':
      bg = 'bg-[#F59E0B]/10';
      text = 'text-[#F59E0B]';
      border = 'border-[#F59E0B]/30';
      dotColor = '#F59E0B';
      displayLabel = displayLabel || 'PENDENTE';
      break;
    case 'aprovado':
      bg = 'bg-[#22C55E]/10';
      text = 'text-[#22C55E]';
      border = 'border-[#22C55E]/20';
      dotColor = '#22C55E';
      displayLabel = displayLabel || 'APROVADO';
      break;
    default:
      displayLabel = displayLabel || status.toUpperCase();
      break;
  }

  const py = size === 'sm' ? 'py-0.5' : 'py-1';
  const px = size === 'sm' ? 'px-2' : 'px-2.5';
  const textSz = size === 'sm' ? 'text-[11px]' : 'text-xs';

  return (
    <span className={`inline-flex items-center gap-1.5 ${px} ${py} rounded-full border ${bg} ${border} ${text} ${textSz} font-semibold uppercase tracking-wider whitespace-nowrap`}>
      <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: dotColor }} />
      {displayLabel}
    </span>
  );
};

// Standardized Page Header according to section 6
export interface PageHeaderProps {
  breadcrumb?: string;
  title: string;
  subtitle?: string;
  primaryAction?: {
    label: string;
    icon?: LucideIcon;
    onClick: () => void;
    id?: string;
  };
  secondaryAction?: {
    label: string;
    icon?: LucideIcon;
    onClick: () => void;
    id?: string;
  };
}

export const PageHeader: React.FC<PageHeaderProps> = ({
  breadcrumb,
  title,
  subtitle,
  primaryAction,
  secondaryAction
}) => {
  return (
    <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-6">
      <div>
        {breadcrumb && (
          <p className="text-xs text-[#A7A7AB] font-medium tracking-wide uppercase mb-1">
            {breadcrumb}
          </p>
        )}
        <h1 className="text-2xl lg:text-[28px] font-bold text-[#F5F5F5] font-display tracking-tight leading-tight">
          {title}
        </h1>
        {subtitle && (
          <p className="text-sm text-[#A7A7AB] mt-1 font-normal max-w-2xl">
            {subtitle}
          </p>
        )}
      </div>

      <div className="flex items-center gap-3 self-start md:self-auto shrink-0">
        {secondaryAction && (
          <button
            type="button"
            id={secondaryAction.id}
            onClick={secondaryAction.onClick}
            className="flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-[10px] bg-[#202024] hover:bg-[#2D2D32] border border-[#2D2D32] text-[#CAC9CA] hover:text-[#F5F5F5] transition-colors focus:outline-none focus:ring-1 focus:ring-[#D4130D]"
          >
            {secondaryAction.icon && <secondaryAction.icon className="w-4 h-4 text-[#A7A7AB]" />}
            {secondaryAction.label}
          </button>
        )}
        {primaryAction && (
          <button
            type="button"
            id={primaryAction.id}
            onClick={primaryAction.onClick}
            className="flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-[10px] bg-[#D4130D] hover:bg-[#E3271F] active:bg-[#980707] text-white shadow-sm transition-colors focus:outline-none focus:ring-2 focus:ring-[#D4130D]/50 cursor-pointer"
          >
            {primaryAction.icon && <primaryAction.icon className="w-4 h-4" />}
            {primaryAction.label}
          </button>
        )}
      </div>
    </div>
  );
};

// Standardized KPI Card according to section 7
export interface KpiCardProps {
  title: string;
  value: string | number;
  comparison?: string;
  trend?: 'up' | 'down' | 'neutral';
  icon?: LucideIcon;
  subtext?: string;
  isRedHighlight?: boolean;
}

export const KpiCard: React.FC<KpiCardProps> = ({
  title,
  value,
  comparison,
  trend,
  icon: Icon,
  subtext,
  isRedHighlight
}) => {
  const valStr = String(value);
  // Dynamic font sizing based on content length to guarantee zero overflow
  const valueSizeClass = 
    valStr.length > 13 
      ? 'text-lg sm:text-xl lg:text-2xl' 
      : valStr.length > 9 
      ? 'text-xl sm:text-2xl lg:text-[26px]' 
      : 'text-2xl sm:text-[28px] lg:text-[30px]';

  return (
    <div 
      className={`p-4 sm:p-5 rounded-[12px] bg-[#17171A] border ${
        isRedHighlight ? 'border-[#D4130D]/40 shadow-[0_0_15px_rgba(212,19,13,0.08)]' : 'border-[#2D2D32]'
      } transition-colors min-w-0 flex flex-col justify-between overflow-hidden`}
    >
      <div className="flex items-center justify-between gap-2 mb-2 min-w-0">
        <span 
          className="text-[11px] sm:text-xs font-semibold text-[#A7A7AB] uppercase tracking-wider truncate min-w-0"
          title={title}
        >
          {title}
        </span>
        {Icon && (
          <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-[#202024] flex items-center justify-center border border-[#2D2D32] shrink-0">
            <Icon className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-[#CAC9CA]" />
          </div>
        )}
      </div>

      <div 
        className={`${valueSizeClass} font-bold text-[#F5F5F5] font-display font-num tracking-tight leading-tight my-1 truncate min-w-0`}
        title={valStr}
      >
        {value}
      </div>

      {(comparison || subtext) && (
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs pt-1.5 border-t border-[#2D2D32]/40 mt-2 min-w-0">
          {comparison && (
            <span
              className={`font-semibold shrink-0 text-[11px] sm:text-xs px-1.5 py-0.5 rounded-[4px] ${
                trend === 'up'
                  ? 'text-[#22C55E] bg-[#22C55E]/10 border border-[#22C55E]/20'
                  : trend === 'down'
                  ? 'text-[#D4130D] bg-[#D4130D]/10 border border-[#D4130D]/20'
                  : 'text-[#CAC9CA] bg-[#202024] border border-[#2D2D32]'
              }`}
            >
              {comparison}
            </span>
          )}
          {subtext && (
            <span 
              className="text-[#A7A7AB] text-[11px] sm:text-xs leading-normal truncate min-w-0 flex-1"
              title={subtext}
            >
              {subtext}
            </span>
          )}
        </div>
      )}
    </div>
  );
};

// Standard Horizontal Tab Navigation according to section 10
export interface TabItem {
  id: string;
  label: string;
  count?: number;
  icon?: LucideIcon;
}

export interface UnderlineTabsProps {
  tabs: TabItem[];
  activeTab: string;
  onTabChange: (tabId: string) => void;
}

export const UnderlineTabs: React.FC<UnderlineTabsProps> = ({
  tabs,
  activeTab,
  onTabChange
}) => {
  return (
    <div className="border-b border-[#2D2D32] mb-6 overflow-x-auto no-scrollbar">
      <nav className="flex space-x-6 min-w-max">
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className={`relative py-3 text-sm font-medium transition-colors flex items-center gap-2 border-b-2 -mb-[1px] focus:outline-none cursor-pointer ${
                isActive
                  ? 'text-[#F5F5F5] font-semibold border-[#D4130D]'
                  : 'text-[#A7A7AB] hover:text-[#F5F5F5] border-transparent'
              }`}
            >
              {Icon && <Icon className={`w-4 h-4 ${isActive ? 'text-[#D4130D]' : 'text-[#A7A7AB]'}`} />}
              <span>{tab.label}</span>
              {typeof tab.count === 'number' && (
                <span
                  className={`ml-1 text-[11px] px-1.5 py-0.2 rounded-full font-bold ${
                    isActive
                      ? 'bg-[#D4130D] text-white'
                      : 'bg-[#202024] text-[#CAC9CA] border border-[#2D2D32]'
                  }`}
                >
                  {tab.count}
                </span>
              )}
            </button>
          );
        })}
      </nav>
    </div>
  );
};

// Form styling helper class tokens
export const formStyles = {
  input: "w-full bg-[#202024] border border-[#343439] rounded-[8px] px-3.5 py-2 text-sm text-[#F5F5F5] placeholder-[#68686E] focus:outline-none focus:border-[#D4130D] transition-colors",
  textarea: "w-full bg-[#202024] border border-[#343439] rounded-[8px] px-3.5 py-2 text-sm text-[#F5F5F5] placeholder-[#68686E] focus:outline-none focus:border-[#D4130D] transition-colors",
  select: "w-full bg-[#202024] border border-[#343439] rounded-[8px] px-3.5 py-2 text-sm text-[#F5F5F5] focus:outline-none focus:border-[#D4130D] transition-colors cursor-pointer",
  label: "block text-xs font-semibold text-[#A7A7AB] uppercase tracking-wider mb-1.5",
  card: "bg-[#17171A] border border-[#2D2D32] rounded-[12px] p-5",
  tableHeader: "bg-[#202024]/70 text-[#CAC9CA] text-xs font-semibold uppercase tracking-wider text-left py-3 px-4 border-b border-[#2D2D32]",
  tableRow: "h-[50px] border-b border-[#2D2D32] hover:bg-[#202024]/40 transition-colors text-sm text-[#F5F5F5]"
};
