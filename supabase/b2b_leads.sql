-- ════════════════════════════════════════════════════════════════════════════
-- b2b_leads — contactos del formulario de cotización de /empresas (B2B).
--
-- Migración ADITIVA (2026-11-04): solo crea esta tabla y sus índices; no toca
-- ninguna tabla existente. Aplicada en el proyecto Supabase de Cliché
-- (zyednfadgizlsnsfvjow) como migración "create_b2b_leads".
--
-- Seguridad: RLS activado y SIN políticas → anon/authenticated no pueden leer
-- ni escribir. Solo el service role (API /api/empresas/lead para insertar y
-- /api/admin/b2b-leads para el panel) accede. Además se revocan los grants
-- por defecto de anon/authenticated como defensa en profundidad.
-- ════════════════════════════════════════════════════════════════════════════

create table if not exists public.b2b_leads (
  id                 uuid primary key default gen_random_uuid(),
  created_at         timestamptz not null default now(),

  -- Lo que pidió
  necesidad          text not null,
  nombre             text not null,
  empresa            text not null,
  tipo_negocio       text not null,
  ciudad             text not null,
  cantidad           text,
  para_cuando        text,
  telefono           text not null,
  email              text,
  mensaje            text,

  -- Autorización de tratamiento de datos (Ley 1581 de 2012)
  consentimiento     boolean not null default false,
  consentimiento_at  timestamptz,

  -- Origen (primer toque guardado al aterrizar)
  origen             text not null default 'directo',  -- canal derivado: google | meta | otra_campana | referido | directo
  utm_source         text,
  utm_medium         text,
  utm_campaign       text,
  utm_content        text,
  utm_term           text,
  gclid              text,
  gbraid             text,
  wbraid             text,
  fbclid             text,
  fbc                text,
  fbp                text,
  referrer           text,
  landing_page       text,
  landed_at          timestamptz,

  -- Id del evento Lead (Pixel + CAPI comparten este id → deduplicación)
  event_id           text
);

create index if not exists b2b_leads_created_at_idx on public.b2b_leads (created_at desc);
create index if not exists b2b_leads_origen_idx on public.b2b_leads (origen);

alter table public.b2b_leads enable row level security;
revoke all on table public.b2b_leads from anon, authenticated;

comment on table public.b2b_leads is
  'Contactos B2B del formulario de /empresas con su origen (UTM, gclid, fbclid). Solo service role (RLS sin políticas).';
