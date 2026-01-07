import * as React from "react"

const MOBILE_BREAKPOINT = 768

export function useIsMobile() {
  const [isMobile, setIsMobile] = React.useState<boolean | undefined>(undefined)

  React.useEffect(() => {
    // Esta función solo se ejecutará en el cliente, después del montaje inicial.
    const checkIsMobile = () => {
      setIsMobile(window.innerWidth < MOBILE_BREAKPOINT)
    };

    // Establecer el valor inicial
    checkIsMobile();

    // Escuchar cambios
    window.addEventListener("resize", checkIsMobile);
    
    // Limpieza al desmontar
    return () => window.removeEventListener("resize", checkIsMobile);
  }, []) // El array de dependencias vacío asegura que se ejecute solo una vez en el cliente

  return !!isMobile
}
