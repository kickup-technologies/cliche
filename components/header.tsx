"use client"

import { useState, useEffect, useRef } from "react"
import Link from "next/link"
import Image from "next/image"
import { usePathname } from "next/navigation"
import { ShoppingBag, ChevronDown, ChevronRight, Heart, Instagram, User, Package, LogOut, LogIn, Crown, Leaf, Gift, Users, X, ShieldCheck } from "lucide-react"
import { Sheet, SheetContent, SheetTrigger, SheetClose } from "@/components/ui/sheet"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu"
import { ProductSearch } from "@/components/product-search"
import { useCart } from "@/context/cart-context"
import { useFavorites } from "@/context/favorites-context"
import { useAuth } from "@/context/auth-context"
import { getSupabaseBrowser } from "@/lib/supabase/client"
import { tierOf, SPENT_STATUSES, formatCOP } from "@/lib/loyalty"

// Navegación depurada: cada enlace tiene un destino DISTINTO (sin redundancias).
const navigation = [
  {
    name: "Aromas",
    href: "/catalogo",
    submenu: [
      { name: "Para el Hogar", href: "/catalogo?categoria=hogar" },
      { name: "Para Ropa", href: "/catalogo?categoria=ropa" },
      { name: "Kits de Regalo", href: "/catalogo?categoria=kit" },
      { name: "Ver todo el catálogo", href: "/catalogo" },
    ],
  },
  { name: "Arma tu kit", href: "/arma-tu-kit", highlight: true },
  { name: "Nosotros", href: "/nosotros" },
]

// Menú móvil — listas planas, editoriales (sin acordeones ni tarjetas).
const MOBILE_EXPLORE = [
  { name: "Aromas", href: "/catalogo", icon: Leaf },
  { name: "Arma tu kit", href: "/arma-tu-kit", icon: Gift, dot: true },
  { name: "Nosotros", href: "/nosotros", icon: Users },
]
const MOBILE_ACCOUNT = [
  { name: "Mis pedidos", href: "/cuenta?seccion=pedidos", icon: Package },
  { name: "Mis datos", href: "/cuenta?seccion=datos", icon: User },
  { name: "Lista de deseos", href: "/favoritos", icon: Heart },
]

export function Header() {
  const [isOpen, setIsOpen] = useState(false)
  const [isScrolled, setIsScrolled] = useState(false)
  // Cursor deslizante (hover) para el nav de escritorio.
  const [deskPos, setDeskPos] = useState({ left: 0, width: 0, opacity: 0 })
  const SLIDE = "left 0.3s cubic-bezier(0.22,1,0.36,1), width 0.3s cubic-bezier(0.22,1,0.36,1), opacity 0.2s ease"
  const moveDesk = (el: HTMLElement) => setDeskPos({ left: el.offsetLeft - 14, width: el.offsetWidth + 28, opacity: 1 })
  const { items, openDrawer } = useCart()
  const { count: favCount } = useFavorites()
  const { user, signOut } = useAuth()
  const pathname = usePathname()
  const cartCount = items.reduce((acc, i) => acc + i.quantity, 0)
  const useSolid =
    isScrolled ||
    (pathname?.startsWith("/productos/") ?? false) ||
    pathname === "/checkout" ||
    pathname === "/catalogo" ||
    (pathname?.startsWith("/cuenta") ?? false) ||
    (pathname?.startsWith("/pedido") ?? false)

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 50)
    window.addEventListener("scroll", handleScroll)
    return () => window.removeEventListener("scroll", handleScroll)
  }, [])

  // Datos del cliente para el menú de cuenta (nombre real + nivel Cliché Club).
  const [orders, setOrders] = useState<{ status: string; total: number }[]>([])
  useEffect(() => {
    if (!user) { setOrders([]); return }
    getSupabaseBrowser().from("orders").select("status, total")
      .then(({ data }: { data: { status: string; total: number }[] | null }) => setOrders(data ?? []))
  }, [user])
  // ¿La sesión es de una cuenta administradora? (lo decide el servidor; el
  // cliente solo recibe sí/no). Muestra el acceso directo al panel.
  const [isAdminAcct, setIsAdminAcct] = useState(false)
  useEffect(() => {
    if (!user) { setIsAdminAcct(false); return }
    fetch("/api/admin/whoami").then((r) => r.json())
      .then((d: { isAdminEmail?: boolean }) => setIsAdminAcct(!!d?.isAdminEmail))
      .catch(() => setIsAdminAcct(false))
  }, [user])
  // Menú de cuenta: se abre al pasar el cursor (con retardo al salir para alcanzar el menú).
  const [accountOpen, setAccountOpen] = useState(false)
  const accountTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const openAccount = () => { if (accountTimer.current) clearTimeout(accountTimer.current); setAccountOpen(true) }
  const closeAccountSoon = () => { if (accountTimer.current) clearTimeout(accountTimer.current); accountTimer.current = setTimeout(() => setAccountOpen(false), 160) }
  const accountName = (((user?.user_metadata?.first_name as string) || (user?.user_metadata?.full_name as string) || user?.email?.split("@")[0] || "").trim()) || "Cuenta"
  const spent = orders.filter((o) => SPENT_STATUSES.includes(o.status)).reduce((s, o) => s + (o.total || 0), 0)
  const { tier, next } = tierOf(spent)
  const clubProgress = next ? Math.min(100, Math.round(((spent - tier.min) / (next.min - tier.min)) * 100)) : 100

  const navLink = (extra = "") =>
    `text-[11px] font-medium uppercase tracking-[0.18em] transition-colors ${
      useSolid ? "text-foreground/70 hover:text-primary" : "text-white/80 hover:text-white"
    } ${extra}`

  const iconBtn = `relative flex h-9 w-9 items-center justify-center rounded-full transition-colors ${
    useSolid ? "text-foreground hover:text-primary hover:bg-foreground/5" : "text-white hover:bg-white/10"
  }`

  return (
    <header
      className={`fixed left-0 right-0 z-50 transition-all duration-300 ${
        useSolid ? "bg-background/90 backdrop-blur-xl border-b border-foreground/[0.06]" : "bg-transparent"
      }`}
      style={{ top: useSolid ? 0 : "40px" }}
    >
      <nav className="container mx-auto px-4 sm:px-6">
        <div className="grid h-16 lg:h-[72px] grid-cols-[1fr_auto_1fr] items-center">
          {/* ── Left: desktop nav / mobile menu ── */}
          <div className="flex items-center justify-start">
            {/* Mobile menu trigger */}
            <div className="lg:hidden">
              <Sheet open={isOpen} onOpenChange={setIsOpen}>
                <SheetTrigger asChild>
                  <button
                    aria-label="Abrir menú"
                    className={`flex items-center justify-center h-10 w-10 rounded-full transition-colors ${
                      useSolid ? "text-foreground hover:bg-foreground/5" : "text-white hover:bg-white/10"
                    }`}
                  >
                    <span className="flex flex-col gap-[5px]">
                      <span className={`block h-[1.5px] w-5 rounded-full ${useSolid ? "bg-foreground" : "bg-white"}`} />
                      <span className={`block h-[1.5px] w-5 rounded-full ${useSolid ? "bg-foreground" : "bg-white"}`} />
                      <span className={`block h-[1.5px] w-3 rounded-full ${useSolid ? "bg-foreground" : "bg-white"}`} />
                    </span>
                  </button>
                </SheetTrigger>
                <SheetContent side="left" className="w-[90vw] max-w-sm border-0 p-0 [&>button]:hidden" style={{ background: "linear-gradient(180deg, #2B1612 0%, #341B15 100%)" }}>
                  <div className="flex h-full flex-col">
                    {/* Header */}
                    <div className="flex h-20 flex-shrink-0 items-center justify-between px-7">
                      <Link href="/" onClick={() => setIsOpen(false)}>
                        <span className="font-serif text-2xl font-bold tracking-wide text-white">Cliché</span>
                      </Link>
                      <SheetClose className="flex items-center gap-2.5 text-white/45 outline-none">
                        <span className="text-[10px] uppercase tracking-[0.25em]">Menú</span>
                        <X className="h-5 w-5" />
                      </SheetClose>
                    </div>

                    <div className="flex-1 overflow-y-auto px-7 pb-6">
                      {/* EXPLORAR */}
                      <p className="mb-1 mt-2 text-[10px] uppercase tracking-[0.3em] text-white/40">Explorar</p>
                      <div>
                        {MOBILE_EXPLORE.map(({ name, href, icon: Icon, dot }) => (
                          <Link key={name} href={href} onClick={() => setIsOpen(false)} className="flex h-16 items-center gap-4 border-b border-white/[0.06] transition-colors hover:bg-white/[0.03]">
                            <Icon className="h-[19px] w-[19px] flex-shrink-0 text-white/65" strokeWidth={1.3} />
                            <span className="flex-1 font-serif text-lg font-light text-white/90">{name}</span>
                            {dot ? <span className="h-1.5 w-1.5 rounded-full bg-[#C89282]" /> : <ChevronRight className="h-4 w-4 text-white/30" />}
                          </Link>
                        ))}
                      </div>

                      {/* CUENTA */}
                      <p className="mb-3 mt-8 text-[10px] uppercase tracking-[0.3em] text-white/40">Cuenta</p>
                      {user ? (
                        <>
                          {/* Fila premium única: nombre + estado */}
                          <Link href="/cuenta?seccion=datos" onClick={() => setIsOpen(false)} className="flex h-20 items-center gap-3.5 rounded-[20px] px-4 backdrop-blur-sm transition-colors" style={{ backgroundColor: "rgba(255,255,255,0.05)" }}>
                            <span className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-full border border-white/20"><User className="h-5 w-5 text-white/80" strokeWidth={1.4} /></span>
                            <span className="min-w-0 flex-1">
                              <span className="block truncate font-serif text-lg leading-tight text-white">{((user?.user_metadata?.full_name as string)?.trim()) || accountName}</span>
                              <span className="mt-0.5 flex items-center gap-1 text-[12px] font-medium" style={{ color: "#E0B341" }}><Crown className="h-3 w-3" /> Miembro {tier.name}</span>
                            </span>
                            <ChevronRight className="h-4 w-4 flex-shrink-0 text-white/30" />
                          </Link>

                          {/* Opciones de cuenta */}
                          <div className="mt-2">
                            {MOBILE_ACCOUNT.map(({ name, href, icon: Icon }) => (
                              <Link key={name} href={href} onClick={() => setIsOpen(false)} className="flex h-14 items-center gap-4 border-b border-white/[0.06] transition-colors hover:bg-white/[0.03]">
                                <Icon className="h-[18px] w-[18px] flex-shrink-0 text-white/60" strokeWidth={1.4} />
                                <span className="flex-1 text-[15px] text-white/85">{name}</span>
                                <ChevronRight className="h-4 w-4 text-white/25" />
                              </Link>
                            ))}
                            {isAdminAcct && (
                              <Link href="/admin-cliche-secret" onClick={() => setIsOpen(false)} className="flex h-14 items-center gap-4 border-b border-white/[0.06] transition-colors hover:bg-white/[0.03]">
                                <ShieldCheck className="h-[18px] w-[18px] flex-shrink-0 text-white/60" strokeWidth={1.4} />
                                <span className="flex-1 text-[15px] text-white/85">Panel administrador</span>
                                <ChevronRight className="h-4 w-4 text-white/25" />
                              </Link>
                            )}
                            <button type="button" onClick={() => { signOut(); setIsOpen(false) }} className="flex h-14 w-full items-center gap-4 transition-opacity hover:opacity-80" style={{ color: "#D98A7C" }}>
                              <LogOut className="h-[18px] w-[18px] flex-shrink-0" strokeWidth={1.4} />
                              <span className="flex-1 text-left text-[15px]">Cerrar sesión</span>
                            </button>
                          </div>
                        </>
                      ) : (
                        <div>
                          <Link href="/cuenta" onClick={() => setIsOpen(false)} className="flex h-14 items-center gap-4 border-b border-white/[0.06] text-[15px] text-white/85">
                            <LogIn className="h-[18px] w-[18px] text-white/60" strokeWidth={1.4} /> <span className="flex-1">Iniciar sesión</span> <ChevronRight className="h-4 w-4 text-white/25" />
                          </Link>
                          <Link href="/cuenta" onClick={() => setIsOpen(false)} className="flex h-14 items-center gap-4 text-[15px] text-white/85">
                            <User className="h-[18px] w-[18px] text-white/60" strokeWidth={1.4} /> <span className="flex-1">Crear cuenta</span> <ChevronRight className="h-4 w-4 text-white/25" />
                          </Link>
                        </div>
                      )}
                    </div>

                    {/* CTA + footer (compacto) */}
                    <div className="flex-shrink-0 px-7 pb-6 pt-2">
                      <Link
                        href="/catalogo"
                        onClick={() => setIsOpen(false)}
                        className="flex h-12 w-full items-center justify-center gap-2 rounded-full text-sm font-medium tracking-wide text-white transition-opacity hover:opacity-90"
                        style={{ backgroundColor: "#C89282" }}
                      >
                        <ShoppingBag className="h-4 w-4" /> Ver colección
                      </Link>
                      <div className="mt-3 flex items-center justify-center gap-4">
                        <a
                          href="https://instagram.com/clichearomasoficial"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-1.5 text-[11px] tracking-wide text-white/35 transition-colors hover:text-white/60"
                        >
                          <Instagram className="h-3.5 w-3.5" /> Instagram
                        </a>
                        <span className="text-[9px] uppercase tracking-[0.2em] text-white/15">Aromas artesanales · Colombia</span>
                      </div>
                    </div>
                  </div>
                </SheetContent>
              </Sheet>
            </div>

            {/* Desktop nav — con cursor deslizante en hover */}
            <div className="relative hidden lg:flex items-center gap-7" onMouseLeave={() => setDeskPos((p) => ({ ...p, opacity: 0 }))}>
              {/* Indicador deslizante (detrás de los enlaces) */}
              <span
                aria-hidden
                className="pointer-events-none absolute top-1/2 z-0 -translate-y-1/2 rounded-full"
                style={{ left: deskPos.left, width: deskPos.width, height: 38, opacity: deskPos.opacity, backgroundColor: useSolid ? "rgba(45,26,20,0.06)" : "rgba(255,255,255,0.15)", transition: SLIDE }}
              />
              {navigation.map((item) =>
                item.submenu ? (
                  <DropdownMenu key={item.name}>
                    <DropdownMenuTrigger onMouseEnter={(e) => moveDesk(e.currentTarget)} className={navLink("relative z-10 flex items-center gap-1 outline-none")}>
                      {item.name}
                      <ChevronDown className="h-3 w-3" />
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="start" className="w-52 rounded-xl">
                      {item.submenu.map((sub) => (
                        <DropdownMenuItem key={sub.name} asChild>
                          <Link href={sub.href} className="cursor-pointer">{sub.name}</Link>
                        </DropdownMenuItem>
                      ))}
                    </DropdownMenuContent>
                  </DropdownMenu>
                ) : (
                  <Link key={item.name} href={item.href} onMouseEnter={(e) => moveDesk(e.currentTarget)} className={navLink("relative z-10 flex items-center gap-1.5")}>
                    {item.name}
                    {item.highlight && <span className="h-1.5 w-1.5 rounded-full bg-primary" />}
                  </Link>
                ),
              )}
            </div>
          </div>

          {/* ── Center: logo ── */}
          <Link href="/" className="flex items-center justify-center" aria-label="Cliché — Inicio">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/images/logo-cliche.png"
              alt="Cliché — Marketing Olfativo"
              className={`h-12 w-auto object-contain transition-all duration-300 lg:h-14 ${
                useSolid ? "" : "brightness-0 invert"
              }`}
            />
          </Link>

          {/* ── Right: actions ── */}
          <div className="flex items-center justify-end gap-1">
            <Link href="/catalogo" className={navLink("hidden lg:inline-flex mr-3")}>
              Catálogo
            </Link>
            <ProductSearch buttonClassName={iconBtn} />
            <Link href="/favoritos" className={`${iconBtn} hidden sm:flex`} aria-label="Favoritos">
              <Heart className={`h-[18px] w-[18px] ${favCount > 0 ? "fill-red-500 text-red-500" : ""}`} />
              {favCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 h-4 w-4 rounded-full bg-red-500 text-[9px] font-bold text-white flex items-center justify-center">
                  {favCount}
                </span>
              )}
            </Link>
            <DropdownMenu open={accountOpen} onOpenChange={setAccountOpen} modal={false}>
              <DropdownMenuTrigger onMouseEnter={openAccount} onMouseLeave={closeAccountSoon} className={`${iconBtn} outline-none`} aria-label="Mi cuenta">
                <User className="h-[18px] w-[18px]" />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" sideOffset={12} onMouseEnter={openAccount} onMouseLeave={closeAccountSoon} className="w-72 origin-top-right overflow-hidden rounded-[20px] border-foreground/10 p-0 shadow-[0_16px_40px_rgba(0,0,0,0.12)] duration-200 data-[state=open]:zoom-in-95 data-[state=open]:slide-in-from-top-1 sm:w-80 sm:rounded-[24px] sm:shadow-[0_24px_70px_-12px_rgba(45,26,20,0.28)]">
                {user ? (
                  <>
                    {/* HERO con Club — solo escritorio/tablet */}
                    <div className="relative hidden min-h-[150px] flex-col justify-between p-5 sm:flex">
                      <Image src="/images/cuenta/pedidos-banner.jpg" alt="" fill className="object-cover" sizes="320px" />
                      <div aria-hidden className="absolute inset-0" style={{ background: "linear-gradient(120deg, rgba(20,12,8,0.86) 0%, rgba(20,12,8,0.62) 50%, rgba(20,12,8,0.40) 100%)" }} />
                      <div className="relative flex items-center gap-3">
                        <div className="relative flex-shrink-0">
                          <div className="flex h-[52px] w-[52px] items-center justify-center rounded-full font-serif text-xl font-bold shadow-lg" style={{ backgroundColor: "#FAF8F5", color: "#2D1A14" }}>{accountName.charAt(0).toUpperCase()}</div>
                          <span className="absolute -bottom-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full ring-2 ring-[#2D1A14]" style={{ backgroundColor: "#E0B341", color: "#2D1A14" }}><Crown className="h-3 w-3" /></span>
                        </div>
                        <div className="min-w-0">
                          <p className="text-[11px] leading-none text-white/60">Hola,</p>
                          <p className="mt-1 truncate font-serif text-xl leading-tight text-white">{accountName}</p>
                        </div>
                      </div>
                      <div className="relative mt-4">
                        <div className="flex items-center justify-between">
                          <span className="flex items-center gap-1.5 text-[12px] font-semibold text-white"><Crown className="h-3.5 w-3.5" style={{ color: "#E0B341" }} /> Cliché Club</span>
                          <span className="rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider" style={{ backgroundColor: "#E0B341", color: "#2D1A14" }}>{tier.name}</span>
                        </div>
                        <span className="mt-2 block h-1.5 overflow-hidden rounded-full" style={{ backgroundColor: "rgba(255,255,255,0.22)" }}><span className="block h-full rounded-full" style={{ width: `${clubProgress}%`, backgroundColor: "#E0B341" }} /></span>
                        <p className="mt-1.5 text-[11px] text-white/75">{next ? <>Faltan <b className="text-white">{formatCOP(next.min - spent)}</b> para nivel {next.name}</> : "Nivel máximo alcanzado ✨"}</p>
                      </div>
                    </div>

                    {/* HEADER compacto — solo móvil (sin hero, club ni progreso) */}
                    <div className="flex items-center gap-3 border-b px-4 py-3 sm:hidden" style={{ borderColor: "#2D1A1410" }}>
                      <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full font-serif text-base font-bold" style={{ backgroundColor: "#2D1A14", color: "#FAF8F5" }}>{accountName.charAt(0).toUpperCase()}</div>
                      <div className="min-w-0">
                        <p className="truncate font-serif text-[15px] leading-tight" style={{ color: "#2D1A14" }}>{((user?.user_metadata?.full_name as string)?.trim()) || accountName}</p>
                        <p className="mt-0.5 flex items-center gap-1 text-[11px] font-semibold" style={{ color: "#A07A1F" }}><Crown className="h-3 w-3" /> Miembro {tier.name}</p>
                      </div>
                    </div>

                    {/* Filas — compactas en móvil */}
                    <div className="p-2">
                      <DropdownMenuItem asChild>
                        <Link href="/cuenta?seccion=pedidos" className="flex h-12 cursor-pointer items-center gap-3 rounded-[14px] px-4 text-[15px] text-[#2D1A14] focus:bg-[#F8F2EE] focus:text-[#A67163] sm:h-14 sm:px-[18px]"><Package className="h-[18px] w-[18px]" /> <span className="flex-1">Mis pedidos</span> <ChevronRight className="h-4 w-4 opacity-30" /></Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem asChild>
                        <Link href="/cuenta?seccion=datos" className="flex h-12 cursor-pointer items-center gap-3 rounded-[14px] px-4 text-[15px] text-[#2D1A14] focus:bg-[#F8F2EE] focus:text-[#A67163] sm:h-14 sm:px-[18px]"><User className="h-[18px] w-[18px]" /> <span className="flex-1">Mis datos</span> <ChevronRight className="h-4 w-4 opacity-30" /></Link>
                      </DropdownMenuItem>
                      {isAdminAcct && (
                        <DropdownMenuItem asChild>
                          <Link href="/admin-cliche-secret" className="flex h-12 cursor-pointer items-center gap-3 rounded-[14px] px-4 text-[15px] text-[#2D1A14] focus:bg-[#F8F2EE] focus:text-[#A67163] sm:h-14 sm:px-[18px]"><ShieldCheck className="h-[18px] w-[18px]" /> <span className="flex-1">Panel administrador</span> <ChevronRight className="h-4 w-4 opacity-30" /></Link>
                        </DropdownMenuItem>
                      )}
                      <DropdownMenuSeparator className="my-1.5" />
                      <DropdownMenuItem onClick={() => signOut()} className="flex h-12 cursor-pointer items-center gap-3 rounded-[14px] px-4 text-[15px] text-red-500/90 focus:bg-red-50 focus:text-red-600 sm:px-[18px]">
                        <LogOut className="h-[18px] w-[18px]" /> <span className="flex-1">Cerrar sesión</span>
                      </DropdownMenuItem>
                    </div>
                  </>
                ) : (
                  <div className="p-2">
                    <DropdownMenuItem asChild>
                      <Link href="/cuenta" className="cursor-pointer gap-2"><LogIn className="h-4 w-4" /> Iniciar sesión</Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link href="/cuenta" className="cursor-pointer gap-2"><User className="h-4 w-4" /> Crear cuenta</Link>
                    </DropdownMenuItem>
                  </div>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
            <button onClick={openDrawer} className={iconBtn} aria-label="Carrito">
              <ShoppingBag className="h-[18px] w-[18px]" />
              {cartCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 h-4 w-4 rounded-full bg-primary text-[9px] font-bold text-primary-foreground flex items-center justify-center">
                  {cartCount}
                </span>
              )}
            </button>
          </div>
        </div>
      </nav>
    </header>
  )
}
