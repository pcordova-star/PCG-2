'use client'
import { motion } from 'framer-motion'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { CheckSquare } from 'lucide-react'
import { useEffect, useState } from 'react'
import { QuickAvanceSheet } from './QuickAvanceSheet'

export default function QuickActionAvance() {
  const [open, setOpen] = useState(false)
  const [animate, setAnimate] = useState(false)

  useEffect(() => {
    const seen = localStorage.getItem('qa_avance_seen')
    if (!seen) {
      setAnimate(true)
      const t = setTimeout(() => {
        setAnimate(false)
        localStorage.setItem('qa_avance_seen', 'true')
      }, 8000)
      return () => clearTimeout(t)
    }
  }, [])

  return (
    <>
      <Card
        role="button"
        aria-label="Registrar avance diario"
        className="w-full p-4 sm:p-6 shadow-md cursor-pointer bg-gradient-to-r from-primary/10 to-primary/5"
        onClick={() => setOpen(true)}
      >
        <div className="flex items-center gap-4">
          <motion.div
            animate={animate ? { scale: [1, 1.06, 1], y: [0, -4, 0] } : {}}
            transition={{ duration: 1.6, repeat: animate ? Infinity : 0, ease: 'easeInOut' }}
          >
            <CheckSquare className="h-10 w-10 text-primary" />
          </motion.div>
          <div className="flex-1">
            <h3 className="text-lg font-semibold">Registrar avance diario</h3>
            <p className="text-sm text-muted-foreground">Toca para informar progreso con fotos</p>
          </div>
          <Button onClick={(e) => { e.stopPropagation(); setOpen(true); }}>Abrir</Button>
        </div>
      </Card>

      <QuickAvanceSheet open={open} onOpenChange={setOpen} />
    </>
  )
}
