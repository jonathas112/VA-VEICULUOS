import React from 'react';
import { StoreProfile } from '../../types';

interface BrandLogoProps {
  store?: Partial<StoreProfile> | null;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showText?: boolean;
  isCollapsed?: boolean;
  className?: string;
  imgClassName?: string;
  textClassName?: string;
  subtextClassName?: string;
}

export const BrandLogo: React.FC<BrandLogoProps> = ({
  store,
  size = 'md',
  showText = true,
  isCollapsed = false,
  className = '',
  imgClassName = '',
  textClassName = '',
  subtextClassName = ''
}) => {
  const [imgError, setImgError] = React.useState(false);
  const logoUrl = store?.logoUrl;
  const storeName = store?.nomeFantasia || 'VA VEÍCULOS';
  const city = store?.cidade || 'Areial';
  const state = store?.estado || 'PB';

  // Size mappings
  const emblemSizes = {
    sm: 'w-7 h-7 text-xs rounded-[6px]',
    md: 'w-9 h-9 text-sm rounded-[8px]',
    lg: 'w-12 h-12 text-base rounded-[10px]',
    xl: 'w-16 h-16 text-xl rounded-[14px]'
  };

  const imageSizes = {
    sm: 'h-7 max-w-[110px]',
    md: 'h-9 max-w-[140px]',
    lg: 'h-12 max-w-[180px]',
    xl: 'h-16 max-w-[220px]'
  };

  const textSizes = {
    sm: 'text-xs',
    md: 'text-sm',
    lg: 'text-lg',
    xl: 'text-2xl'
  };

  // If a valid custom logo URL is present and hasn't errored
  const hasCustomLogo = Boolean(logoUrl && logoUrl.trim().length > 0 && !imgError);

  if (hasCustomLogo && !isCollapsed) {
    return (
      <div className={`flex items-center gap-3 ${className}`}>
        <img
          src={logoUrl}
          alt={storeName}
          onError={() => setImgError(true)}
          className={`object-contain ${imageSizes[size]} ${imgClassName}`}
        />
        {showText && (
          <div className="flex flex-col overflow-hidden">
            <div className="flex items-center gap-1.5">
              <span className={`font-display font-black tracking-tight text-[#F5F5F5] uppercase leading-none ${textSizes[size]} ${textClassName}`}>
                {storeName}
              </span>
              <span className="w-1.5 h-1.5 rounded-full bg-[#D4130D] shrink-0" />
            </div>
            <span className={`text-[10px] text-[#A7A7AB] font-medium tracking-wider uppercase mt-0.5 leading-none ${subtextClassName}`}>
              {city} - {state} • Gestão Automotiva
            </span>
          </div>
        )}
      </div>
    );
  }

  if (hasCustomLogo && isCollapsed) {
    return (
      <div className={`flex items-center justify-center ${className}`}>
        <img
          src={logoUrl}
          alt={storeName}
          onError={() => setImgError(true)}
          className={`object-contain ${emblemSizes[size]} ${imgClassName}`}
        />
      </div>
    );
  }

  // Premium default automotive emblem for VA Veículos
  return (
    <div className={`flex items-center gap-3 ${className}`}>
      {/* Automotive metallic shield emblem */}
      <div className={`${emblemSizes[size]} bg-gradient-to-br from-[#E4E4E7] via-[#71717A] to-[#27272A] p-[1.5px] shadow-md shrink-0 transition-transform group-hover:scale-105`}>
        <div className="w-full h-full bg-gradient-to-b from-[#141417] to-[#0A0A0C] rounded-[inherit] flex items-center justify-center relative overflow-hidden group-hover:bg-[#1A1A1E] transition-colors">
          {/* Subtle metallic reflection lines */}
          <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/5 to-white/10 pointer-events-none" />
          
          {/* Monogram VA */}
          <span className="font-display font-black tracking-tighter text-[#F5F5F5] select-none z-10 leading-none">
            VA
          </span>

          {/* Automotive red performance underline bar */}
          <span className="absolute bottom-0 left-0 right-0 h-[2.5px] bg-[#D4130D]" />
        </div>
      </div>

      {showText && !isCollapsed && (
        <div className="flex flex-col overflow-hidden">
          <div className="flex items-center gap-1.5">
            <span className={`font-display font-black tracking-tight text-[#F5F5F5] uppercase leading-none ${textSizes[size]} ${textClassName}`}>
              {storeName}
            </span>
            <span className="w-1.5 h-1.5 rounded-full bg-[#D4130D] shrink-0" />
          </div>
          <span className={`text-[10px] text-[#A7A7AB] font-medium tracking-wider uppercase mt-1 leading-none ${subtextClassName}`}>
            {city} - {state} • Gestão Automotiva
          </span>
        </div>
      )}
    </div>
  );
};
