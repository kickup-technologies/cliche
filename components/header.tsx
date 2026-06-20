"use client"

import { useState, useEffect, useRef } from "react"
import Link from "next/link"
import Image from "next/image"
import { usePathname } from "next/navigation"
import { ShoppingBag, ChevronDown, ChevronRight, Heart, Instagram, User, Package, LogOut, LogIn, Crown } from "lucide-react"
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu"
import { useCart } from "@/context/cart-context"
import { useFavorites } from "@/context/favorites-context"
import { useAuth } from "@/context/auth-context"
import { getSupabaseBrowser } from "@/lib/supabase/client"
import { tierOf, SPENT_STATUSES, formatCOP } from "@/lib/loyalty"
import { SEGMENTS } from "@/lib/segments"

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
  {
    // Quick-access de categorías B2B — "¿A qué huele tu marca?"
    name: "Marcas",
    href: "/catalogo",
    submenu: SEGMENTS.map((s) => ({ name: s.label, href: `/catalogo?segmento=${s.key}` })),
  },
  { name: "Arma tu kit", href: "/arma-tu-kit", highlight: true },
  { name: "Ofertas", href: "/ofertas", highlight: true },
  { name: "Nosotros", href: "/nosotros" },
]

export function Header() {
  const [isOpen, setIsOpen] = useState(false)
  const [openSection, setOpenSection] = useState<string | null>(null)
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
                <SheetContent side="left" className="w-[85vw] max-w-sm p-0 border-0 bg-[#2D1A14]">
                  <div className="flex flex-col h-full">
                    <div className="flex items-center justify-between px-7 pt-8 pb-6 border-b border-white/10">
                      <Link href="/" onClick={() => setIsOpen(false)}>
                        <span className="font-serif text-2xl font-bold tracking-wide text-white">Cliché</span>
                      </Link>
                      <p className="text-[10px] text-white/25 tracking-[0.25em] uppercase">Menú</p>
                    </div>

                    <nav className="flex-1 overflow-y-auto px-5 py-6">
                      {navigation.map((item) =>
                        item.submenu ? (
                          <div key={item.name} className="border-b border-white/[0.07]">
                            <button
                              type="button"
                              onClick={() => setOpenSection(openSection === item.name ? null : item.name)}
                              className="flex w-full items-center justify-between rounded-xl px-3 py-4 text-left transition-colors hover:bg-white/[0.05]"
                            >
                              <span className="font-serif text-lg font-light text-white/90">{item.name}</span>
                              <ChevronDown
                                className={`h-4 w-4 text-white/40 transition-transform duration-300 ${openSection === item.name ? "rotate-180" : ""}`}
                              />
                            </button>
                            <div
                              className="overflow-hidden transition-all duration-300 ease-out"
                              style={{ maxHeight: openSection === item.name ? item.submenu.length * 46 + 12 : 0 }}
                            >
                              <div className="pb-3">
                                {item.submenu.map((sub) => (
                                  <Link
                                    key={sub.name}
                                    href={sub.href}
                                    onClick={() => setIsOpen(false)}
                                    className="block rounded-lg py-2.5 pl-6 text-[15px] text-white/55 transition-colors hover:text-white"
                                  >
                                    {sub.name}
                                  </Link>
                                ))}
                              </div>
                            </div>
                          </div>
                        ) : (
                          <Link
                            key={item.name}
                            href={item.href}
                            onClick={() => setIsOpen(false)}
                            className="flex items-center justify-between border-b border-white/[0.07] rounded-xl px-3 py-4 transition-colors hover:bg-white/[0.05]"
                          >
                            <span className={`font-serif text-lg font-light ${item.highlight ? "text-[#C99]" : "text-white/90"}`}>{item.name}</span>
                            {item.highlight && <span className="h-1.5 w-1.5 rounded-full bg-[#A67163]" />}
                          </Link>
                        ),
                      )}

                      {/* ── Cuenta ── */}
                      <div className="mt-7">
                        <p className="mb-1 px-3 text-[10px] uppercase tracking-[0.25em] text-white/30">Cuenta</p>
                        {user ? (
                          <>
                            <Link href="/cuenta?seccion=pedidos" onClick={() => setIsOpen(false)} className="flex items-center gap-3 rounded-xl px-3 py-3 text-[15px] text-white/80 transition-colors hover:bg-white/[0.05] hover:text-white">
                              <User className="h-[18px] w-[18px]" /> Mi cuenta
                            </Link>
                            <button type="button" onClick={() => { signOut(); setIsOpen(false) }} className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-[15px] text-red-300/80 transition-colors hover:bg-white/[0.05] hover:text-red-300">
                              <LogOut className="h-[18px] w-[18px]" /> Cerrar sesión
                            </button>
                          </>
                        ) : (
                          <>
                            <Link href="/cuenta" onClick={() => setIsOpen(false)} className="flex items-center gap-3 rounded-xl px-3 py-3 text-[15px] text-white/80 transition-colors hover:bg-white/[0.05] hover:text-white">
                              <LogIn className="h-[18px] w-[18px]" /> Iniciar sesión
                            </Link>
                            <Link href="/cuenta" onClick={() => setIsOpen(false)} className="flex items-center gap-3 rounded-xl px-3 py-3 text-[15px] text-white/80 transition-colors hover:bg-white/[0.05] hover:text-white">
                              <User className="h-[18px] w-[18px]" /> Crear cuenta
                            </Link>
                          </>
                        )}
                      </div>
                    </nav>

                    <div className="px-7 pb-10 space-y-4 border-t border-white/10 pt-6">
                      <Link
                        href="/catalogo"
                        onClick={() => setIsOpen(false)}
                        className="flex items-center justify-center gap-2 w-full bg-[#A67163] hover:bg-[#8B5E52] text-white font-medium text-sm tracking-wide py-3.5 rounded-full transition-colors"
                      >
                        <ShoppingBag className="w-4 h-4" /> Ver colección
                      </Link>
                      <div className="flex items-center justify-center gap-4 pt-1">
                        <a
                          href="https://instagram.com/clichearomasoficial"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-1.5 text-white/30 hover:text-white/60 transition-colors text-xs tracking-wide"
                        >
                          <Instagram className="w-3.5 h-3.5" /> Instagram
                        </a>
                      </div>
                      <p className="text-center text-white/15 text-[9px] tracking-[0.25em] uppercase">
                        Aromas artesanales · Colombia
                      </p>
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
              <DropdownMenuContent align="end" sideOffset={12} onMouseEnter={openAccount} onMouseLeave={closeAccountSoon} className="w-80 origin-top-right overflow-hidden rounded-[24px] border-foreground/10 p-0 shadow-[0_24px_70px_-12px_rgba(45,26,20,0.28)] duration-200 data-[state=open]:zoom-in-95 data-[state=open]:slide-in-from-top-1">
                {user ? (
                  <>
                    {/* HERO oscuro con Club integrado */}
                    <div className="relative flex min-h-[150px] flex-col justify-between p-5">
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
                      {/* Club integrado dentro del hero */}
                      <div className="relative mt-4">
                        <div className="flex items-center justify-between">
                          <span className="flex items-center gap-1.5 text-[12px] font-semibold text-white"><Crown className="h-3.5 w-3.5" style={{ color: "#E0B341" }} /> Cliché Club</span>
                          <span className="rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider" style={{ backgroundColor: "#E0B341", color: "#2D1A14" }}>{tier.name}</span>
                        </div>
                        <span className="mt-2 block h-1.5 overflow-hidden rounded-full" style={{ backgroundColor: "rgba(255,255,255,0.22)" }}><span className="block h-full rounded-full" style={{ width: `${clubProgress}%`, backgroundColor: "#E0B341" }} /></span>
                        <p className="mt-1.5 text-[11px] text-white/75">{next ? <>Faltan <b className="text-white">{formatCOP(next.min - spent)}</b> para nivel {next.name}</> : "Nivel máximo alcanzado ✨"}</p>
                      </div>
                    </div>

                    {/* Filas premium */}
                    <div className="p-2">
                      <DropdownMenuItem asChild>
                        <Link href="/cuenta?seccion=pedidos" className="flex h-14 cursor-pointer items-center gap-3 rounded-[14px] px-[18px] text-[15px] text-[#2D1A14] focus:bg-[#F8F2EE] focus:text-[#A67163]"><Package className="h-[18px] w-[18px]" /> <span className="flex-1">Mis pedidos</span> <ChevronRight className="h-4 w-4 opacity-30" /></Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem asChild>
                        <Link href="/cuenta?seccion=datos" className="flex h-14 cursor-pointer items-center gap-3 rounded-[14px] px-[18px] text-[15px] text-[#2D1A14] focus:bg-[#F8F2EE] focus:text-[#A67163]"><User className="h-[18px] w-[18px]" /> <span className="flex-1">Mis datos</span> <ChevronRight className="h-4 w-4 opacity-30" /></Link>
                      </DropdownMenuItem>
                      <DropdownMenuSeparator className="my-1.5" />
                      <DropdownMenuItem onClick={() => signOut()} className="flex h-12 cursor-pointer items-center gap-3 rounded-[14px] px-[18px] text-[15px] text-red-500/90 focus:bg-red-50 focus:text-red-600">
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
