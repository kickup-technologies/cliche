# 🚀 Setup — Cliché Aromas

## 1. Instalar dependencias nuevas

```bash
pnpm add @supabase/supabase-js stripe @stripe/stripe-js resend
```

## 2. Configurar variables de entorno

```bash
cp .env.local.example .env.local
# Edita .env.local con tus credenciales reales
```

## 3. Crear la base de datos en Supabase

1. Ve a https://supabase.com → crea un proyecto nuevo
2. Ve a **SQL Editor**
3. Copia y pega el contenido de `supabase/schema.sql`
4. Click **Run**

Esto crea:
- Tabla `products` (inventario real)
- Tabla `subscribers` (emails capturados)
- Tabla `promotions` (timers y códigos)
- Tabla `orders` (pedidos pagados)
- Tabla `cart_items` (carritos activos)

## 4. Crear función de Supabase para descontar stock

En el **SQL Editor** de Supabase, ejecuta también:

```sql
CREATE OR REPLACE FUNCTION decrement_stock(p_product_id UUID, p_quantity INTEGER)
RETURNS void AS $$
BEGIN
  UPDATE products
  SET stock = GREATEST(stock - p_quantity, 0)
  WHERE id = p_product_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

## 5. Configurar Stripe

1. Ve a https://dashboard.stripe.com
2. Copia `Publishable key` y `Secret key` → pégalos en `.env.local`
3. Para webhooks locales: `stripe listen --forward-to localhost:3000/api/webhooks/stripe`
4. Copia el `Signing secret` → `STRIPE_WEBHOOK_SECRET` en `.env.local`

## 6. Configurar Resend (emails)

1. Ve a https://resend.com → crea cuenta gratis
2. Verifica tu dominio o usa el sandbox para pruebas
3. Crea un API Key → pégalo en `.env.local`

## 7. Correr en desarrollo

```bash
pnpm dev
```

---

## Stack completo

| Capa | Tecnología |
|------|-----------|
| Frontend | Next.js 16 + React 19 + Tailwind v4 |
| Base de datos | Supabase (PostgreSQL) |
| Pagos | Stripe Checkout |
| Emails | Resend |
| Deploy | Vercel |

## Flujo de conversión

```
Visita → Hero + Urgency Bar
       → Popup a los 5s (email → descuento 20%)
       → Productos con stock real + badges de escasez
       → Sticky bar con countdown timer
       → Exit intent (email → descuento 15%)
       → Checkout Stripe → Webhook → Email confirmación
```
