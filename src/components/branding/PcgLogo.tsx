import Image from "next/image";

interface PcgLogoProps {
  size?: number;
}

export function PcgLogo({ size = 40 }: PcgLogoProps) {
  return (
    <div className="flex items-center gap-2">
      <span className="font-semibold tracking-wide text-slate-800 text-lg">
        PCG
      </span>
    </div>
  );
}
