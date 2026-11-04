import { Constants, type Enums } from '@/types/database';

export type PlanCategory = Enums<'plan_category'>;

/** Categorías en el orden en que aparecen en los filtros (vienen del enum de la BD). */
export const PLAN_CATEGORIES = Constants.public.Enums.plan_category;

export const CATEGORY_INFO: Record<PlanCategory, { label: string; color: string }> = {
  gastronomia: { label: 'Gastronomía', color: '#E8590C' },
  cafes: { label: 'Cafés', color: '#8B5E34' },
  cultura: { label: 'Cultura', color: '#7048E8' },
  naturaleza: { label: 'Naturaleza', color: '#2F9E44' },
  vida_nocturna: { label: 'Vida nocturna', color: '#C2255C' },
  experiencias: { label: 'Experiencias', color: '#1C7ED6' },
};
