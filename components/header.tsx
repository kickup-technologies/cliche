"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { ShoppingBag, ChevronDown, Heart, Instagram, ArrowRight, User, Package, MapPin, Settings, LogOut, LogIn } from "lucide-react"
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu"
import { useCart } from "@/context/cart-context"
import { useFavorites } from "@/context/favorites-context"
import { useAuth } from "@/context/auth-context"
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
  const [isScrolled, setIsScrolled] = useState(false)
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

                    <nav className="flex-1 px-7 py-8 space-y-1 overflow-y-auto">
                      {navigation.map((item) => (
                        <div key={item.name}>
                          {item.submenu ? (
                            <div className="mb-3">
                              <p className="text-[10px] text-white/30 tracking-[0.25em] uppercase mb-3">{item.name}</p>
                              <div className="space-y-1">
                                {item.submenu.map((sub) => (
                                  <Link
                                    key={sub.name}
                                    href={sub.href}
                                    onClick={() => setIsOpen(false)}
                                    className="flex items-center justify-between py-2.5 px-4 rounded-xl text-white/70 hover:text-white hover:bg-white/[0.06] transition-all group"
                                  >
                                    <span className="font-serif text-base">{sub.name}</span>
                                    <ArrowRight className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 transition-opacity" />
                                  </Link>
                                ))}
                              </div>
                            </div>
                          ) : (
                            <Link
                              href={item.href}
                              onClick={() => setIsOpen(false)}
                              className={`flex items-center justify-between py-3 px-4 rounded-xl transition-all group ${
                                item.highlight ? "text-[#C99] hover:bg-white/[0.06]" : "text-white/80 hover:text-white hover:bg-white/[0.06]"
                              }`}
                            >
                              <span className="font-serif text-lg font-light">{item.name}</span>
                              <ArrowRight className="w-3.5 h-3.5 opacity-0 group-hover:opacity-60 transition-opacity" />
                            </Link>
                          )}
                        </div>
                      ))}
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

            {/* Desktop nav */}
            <div className="hidden lg:flex items-center gap-7">
              {navigation.map((item) =>
                item.submenu ? (
                  <DropdownMenu key={item.name}>
                    <DropdownMenuTrigger className={navLink("flex items-center gap-1 outline-none")}>
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
                  <Link key={item.name} href={item.href} className={navLink("flex items-center gap-1.5")}>
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
            <DropdownMenu>
              <DropdownMenuTrigger className={`${iconBtn} outline-none`} aria-label="Mi cuenta">
                <User className="h-[18px] w-[18px]" />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                {user ? (
                  <>
                    <DropdownMenuLabel className="font-normal">
                      <p className="text-[10px] uppercase tracking-widest text-muted-foreground">Mi cuenta</p>
                      <p className="truncate text-sm font-medium text-foreground">{user.email}</p>
                    </DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem asChild>
                      <Link href="/cuenta?seccion=pedidos" className="cursor-pointer gap-2"><Package className="h-4 w-4" /> Mis pedidos</Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link href="/cuenta?seccion=datos" className="cursor-pointer gap-2"><User className="h-4 w-4" /> Mis datos</Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link href="/cuenta?seccion=direcciones" className="cursor-pointer gap-2"><MapPin className="h-4 w-4" /> Direcciones</Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link href="/cuenta?seccion=config" className="cursor-pointer gap-2"><Settings className="h-4 w-4" /> Configuración</Link>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => signOut()} className="cursor-pointer gap-2 text-red-600 focus:text-red-600">
                      <LogOut className="h-4 w-4" /> Cerrar sesión
                    </DropdownMenuItem>
                  </>
                ) : (
                  <>
                    <DropdownMenuItem asChild>
                      <Link href="/cuenta" className="cursor-pointer gap-2"><LogIn className="h-4 w-4" /> Iniciar sesión</Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link href="/cuenta" className="cursor-pointer gap-2"><User className="h-4 w-4" /> Crear cuenta</Link>
                    </DropdownMenuItem>
                  </>
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
