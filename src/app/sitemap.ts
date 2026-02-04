// src/app/sitemap.ts
import { MetadataRoute } from 'next';

/**
 * Genera el sitemap.xml para el sitio.
 * Este archivo es leído por los motores de búsqueda para descubrir e indexar las páginas.
 */
export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://pcg-2.vercel.app';

  // Páginas estáticas principales de la web pública
  const staticRoutes = [
    '/',
    '/precios',
    '/terminos',
  ];

  const staticUrls = staticRoutes.map((route) => ({
    url: `${baseUrl}${route}`,
    lastModified: new Date().toISOString(),
    changeFrequency: 'monthly' as const,
    priority: route === '/' ? 1 : 0.7, // La home es la más importante
  }));

  // Páginas SEO de módulos/funcionalidades clave
  const seoRoutes = [
    '/control-subcontratistas-ds44',
    '/software-prevencion-riesgos-construccion',
    '/software-estados-de-pago-construccion',
  ];

  const seoUrls = seoRoutes.map((route) => ({
    url: `${baseUrl}${route}`,
    lastModified: new Date().toISOString(),
    changeFrequency: 'weekly' as const, 
    priority: 0.9, 
  }));

  // Artículos del blog
  const blogRoutes = [
    '/blog/checklist-ds44-documentos-subcontratistas',
    '/blog/errores-estados-de-pago-construccion',
  ];

  const blogUrls = blogRoutes.map((route) => ({
    url: `${baseUrl}${route}`,
    lastModified: new Date().toISOString(),
    changeFrequency: 'monthly' as const,
    priority: 0.8, // Importantes para construir autoridad
  }));


  return [...staticUrls, ...seoUrls, ...blogUrls];
}
