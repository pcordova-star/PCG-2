import Image from "next/image";

interface PcgLogoProps {
  size?: number;
}

export function PcgLogo({ size = 60 }: PcgLogoProps) {
  return (
    <div className="flex items-center justify-center">
       <Image
        src="/logo.png"
        alt="PCG - Plataforma de Control y Gestión"
        width={size}
        height={size}
        priority
      />
    </div>
  );
}
