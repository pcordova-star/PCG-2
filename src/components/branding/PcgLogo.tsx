import Image from "next/image";

interface PcgLogoProps {
  size?: number;
}

export function PcgLogo({ size = 40 }: PcgLogoProps) {
  return (
    <div className="flex items-center gap-2">
      <Image
        src="/pcg-logo.png"
        alt="PCG - Plataforma de Control y Gestión"
        width={size}
        height={size}
        priority
      />
      <span className="font-semibold tracking-wide text-slate-800">
        PCG
      </span>
    </div>
  );
}
