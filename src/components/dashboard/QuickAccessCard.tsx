
"use client";

import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { LucideIcon, Sparkles } from "lucide-react";

interface QuickAccessCardProps {
  title: string;
  description: string;
  icon: LucideIcon;
  color: 'orange' | 'blue' | 'green' | 'purple' | 'yellow' | 'pink';
  onClick: () => void;
  isPremium?: boolean;
}

export function QuickAccessCard({ title, description, icon: Icon, color, onClick, isPremium = false }: QuickAccessCardProps) {
  const colorClasses = {
    orange: 'bg-orange-500 hover:bg-orange-600 text-white',
    blue: 'bg-blue-500 hover:bg-blue-600 text-white',
    green: 'bg-green-500 hover:bg-green-600 text-white',
    purple: 'bg-purple-500 hover:bg-purple-600 text-white',
    yellow: 'bg-yellow-500 hover:bg-yellow-600 text-white',
    pink: 'bg-pink-500 hover:bg-pink-600 text-white',
  };

  const iconColorClasses = {
      orange: 'text-orange-200',
      blue: 'text-blue-200',
      green: 'text-green-200',
      purple: 'text-purple-200',
      yellow: 'text-yellow-200',
      pink: 'text-pink-200',
  }

  return (
    <Card className="rounded-xl border bg-white shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1 overflow-hidden relative">
      {isPremium && (
        <div className="absolute top-2 right-2 flex items-center gap-1 bg-white/20 backdrop-blur-sm text-white text-xs font-bold px-2 py-1 rounded-full border border-white/30">
          <Sparkles className="h-3 w-3" />
          <span>Premium</span>
        </div>
      )}
      <div className={cn("p-6 text-center text-white", colorClasses[color])}>
        <div className="relative w-fit mx-auto">
             <Icon className={cn("h-16 w-16 mx-auto animate-pulse", iconColorClasses[color])} strokeWidth={1.5}/>
             <div className={cn("absolute inset-0 flex items-center justify-center animate-ping-slow", colorClasses[color])}>
                <Icon className={cn("h-16 w-16", iconColorClasses[color])} strokeWidth={1.5}/>
             </div>
        </div>
        <CardTitle className="mt-4 text-xl font-bold">{title}</CardTitle>
        <CardDescription className="text-white/80 mt-1">{description}</CardDescription>
      </div>
      <div className="p-4 bg-slate-50">
        <Button className="w-full" variant="secondary" onClick={onClick}>
          Iniciar Registro
        </Button>
      </div>
       <style jsx>{`
        @keyframes ping-slow {
          75%, 100% {
            transform: scale(1.8);
            opacity: 0;
          }
        }
        .animate-ping-slow {
          animation: ping-slow 2.5s cubic-bezier(0, 0, 0.2, 1) infinite;
        }
      `}</style>
    </Card>
  );
}
