"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { Menu, ShoppingBag, ChevronDown, Heart, Instagram, ArrowRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Sheet,
  SheetContent,
  SheetTrigger,
} from "@/components/ui/sheet"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { useCart } from "@/context/cart-context"
import { useFavorites } from "@/context/favorites-context"

const navigation = [
  {
    name: "Aromas",
    href: "/catalogo",
    submenu: [
      { name: "Para el Hogar", href: "/catalogo?categoria=hogar" },
      { name: "Para Ropa", href: "/catalogo?categoria=ropa" },
      { name: "Kits de Regalo", href: "/catalogo?categoria=kit" },
    ],
  },
  { name: "Colecciones", href: "/catalogo" },
  { name: "Ofertas", href: "/ofertas", highlight: true },
  { name: "Nosotros", href: "/#nosotros" },
]

export function Header() {
  const [isOpen, setIsOpen] = useState(false)
  const [isScrolled, setIsScrolled] = useState(false)
  const { items, openDrawer } = useCart()
  const { count: favCount } = useFavorites()
  const pathname = usePathname()
  const cartCount = items.reduce((acc, i) => acc + i.quantity, 0)
  const useSolid = isScrolled || (pathname?.startsWith("/productos/") ?? false) || pathname === "/checkout" || pathname === "/catalogo" || pathname?.startsWith("/pedido")

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 50)
    }
    window.addEventListener("scroll", handleScroll)
    return () => window.removeEventListener("scroll", handleScroll)
  }, [])

  return (
    <header className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
      useSolid
        ? "bg-background/95 backdrop-blur-md shadow-sm"
        : "bg-transparent"
    }`} style={{ top: useSolid ? 0 : "40px" }}>
      <nav className="container mx-auto px-4">
        <div className="flex h-16 lg:h-20 items-center justify-between">
          {/* Mobile menu */}
          <div className="lg:hidden">
            <Sheet open={isOpen} onOpenChange={setIsOpen}>
              <SheetTrigger asChild>
                <button
                  className={`flex items-center gap-2 px-3 py-2 rounded-xl border transition-all duration-200 ${
                    useSolid
                      ? "border-border text-foreground hover:border-primary hover:text-primary bg-background/60"
                      : "border-white/25 text-white hover:border-white/60 hover:bg-white/10 bg-transparent"
                  }`}
                >
                  <span className={`flex flex-col gap-[4px]`}>
                    <span className={`block h-[1.5px] w-5 rounded-full transition-colors ${useSolid ? "bg-foreground" : "bg-white"}`} />
                    <span className={`block h-[1.5px] w-3.5 rounded-full transition-colors ${useSolid ? "bg-foreground" : "bg-white"}`} />
                  </span>
                  <span className={`text-[11px] font-semibold tracking-widest uppercase transition-colors ${useSolid ? "text-foreground" : "text-white"}`}>
                    Menú
                  </span>
                </button>
              </SheetTrigger>
              <SheetContent side="left" className="w-[85vw] max-w-sm p-0 border-0 bg-[#2D1A14]">
                <div className="flex flex-col h-full">

                  {/* Header del menú */}
                  <div className="flex items-center justify-between px-7 pt-8 pb-6 border-b border-white/8">
                    <Link href="/" onClick={() => setIsOpen(false)}>
                      <span className="font-serif text-2xl font-bold tracking-widest text-white uppercase">
                        Cliché
                      </span>
                    </Link>
                    <p className="text-[10px] text-white/25 tracking-[0.2em] uppercase">Menú</p>
                  </div>

                  {/* Navegación */}
                  <nav className="flex-1 px-7 py-8 space-y-1 overflow-y-auto">
                    {navigation.map((item, idx) => (
                      <div key={item.name}>
                        {item.submenu ? (
                          <div className="mb-2">
                            {/* Categoría padre */}
                            <p className="text-[10px] text-white/30 tracking-[0.25em] uppercase mb-3 mt-4 first:mt-0">
                              {item.name}
                            </p>
                            <div className="space-y-1">
                              {item.submenu.map((sub) => (
                                <Link
                                  key={sub.name}
                                  href={sub.href}
                                  onClick={() => setIsOpen(false)}
                                  className="flex items-center justify-between py-3 px-4 rounded-xl text-white/70 hover:text-white hover:bg-white/6 transition-all duration-200 group"
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
                            className={`flex items-center justify-between py-3.5 px-4 rounded-xl transition-all duration-200 group ${
                              item.highlight
                                ? "text-[#A67163] hover:bg-[#A67163]/10"
                                : "text-white/80 hover:text-white hover:bg-white/6"
                            }`}
                          >
                            <span className="font-serif text-lg font-light">{item.name}</span>
                            <div className="flex items-center gap-2">
                              {item.highlight && (
                                <span className="text-[9px] font-bold bg-red-500 text-white px-2 py-0.5 rounded-full tracking-wider">
                                  HOT
                                </span>
                              )}
                              <ArrowRight className="w-3.5 h-3.5 opacity-0 group-hover:opacity-60 transition-opacity" />
                            </div>
                          </Link>
                        )}
                        {/* Separador sutil entre secciones */}
                        {idx < navigation.length - 1 && !item.submenu && (
                          <div className="mx-4 border-b border-white/5 mt-1" />
                        )}
                      </div>
                    ))}
                  </nav>

                  {/* Footer del menú */}
                  <div className="px-7 pb-10 space-y-4 border-t border-white/8 pt-6">
                    {/* CTA */}
                    <Link
                      href="/catalogo"
                      onClick={() => setIsOpen(false)}
                      className="flex items-center justify-center gap-2 w-full bg-[#A67163] hover:bg-[#8B5E52] text-white font-semibold text-sm tracking-wide py-4 rounded-xl transition-colors duration-200"
                    >
                      <ShoppingBag className="w-4 h-4" />
                      Ver colección
                    </Link>

                    {/* Redes sociales */}
                    <div className="flex items-center justify-center gap-4 pt-2">
                      <a
                        href="https://instagram.com/clichearomasoficial"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1.5 text-white/30 hover:text-white/60 transition-colors text-xs tracking-wide"
                      >
                        <Instagram className="w-3.5 h-3.5" />
                        Instagram
                      </a>
                      <span className="text-white/15">·</span>
                      <a
                        href="https://tiktok.com/@clichearomasoficial"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1.5 text-white/30 hover:text-white/60 transition-colors text-xs tracking-wide"
                      >
                        <svg className="w-3 h-3" viewBox="0 0 24 24" fill="currentColor">
                          <path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-2.88 2.5 2.89 2.89 0 01-2.89-2.89 2.89 2.89 0 012.89-2.89c.28 0 .54.04.79.1V9.01a6.34 6.34 0 00-.79-.05 6.34 6.34 0 00-6.34 6.34 6.34 6.34 0 006.34 6.34 6.34 6.34 0 006.33-6.34V8.69a8.27 8.27 0 004.84 1.55V6.79a4.85 4.85 0 01-1.07-.1z"/>
                        </svg>
                        TikTok
                      </a>
                    </div>

                    <p className="text-center text-white/15 text-[9px] tracking-widest uppercase">
                      Aromas artesanales · Colombia
                    </p>
                  </div>

                </div>
              </SheetContent>
            </Sheet>
          </div>

          {/* Desktop navigation - Left */}
          <div className="hidden lg:flex lg:items-center lg:gap-6">
            {navigation.slice(0, 2).map((item) =>
              item.submenu ? (
                <DropdownMenu key={item.name}>
                  <DropdownMenuTrigger className={`flex items-center gap-1 text-sm font-medium transition-colors outline-none ${
                    useSolid ? "text-foreground hover:text-primary" : "text-white/90 hover:text-white"
                  }`}>
                    {item.name}
                    <ChevronDown className="h-4 w-4" />
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start" className="w-48">
                    {item.submenu.map((sub) => (
                      <DropdownMenuItem key={sub.name} asChild>
                        <Link href={sub.href}>{sub.name}</Link>
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
              ) : (
                <Link
                  key={item.name}
                  href={item.href}
                  className={`link-underline text-sm font-medium transition-colors ${
                    useSolid ? "text-foreground hover:text-primary" : "text-white/90 hover:text-white"
                  }`}
                >
                  {item.name}
                </Link>
              )
            )}
          </div>

          {/* Logo */}
          <Link href="/" className="flex flex-col items-center">
            <span className={`font-serif text-2xl lg:text-3xl font-bold tracking-wide transition-colors ${
              useSolid ? "text-foreground" : "text-white"
            }`}>
              Cliché
            </span>
          </Link>

          {/* Desktop navigation - Right */}
          <div className="hidden lg:flex lg:items-center lg:gap-6">
            {navigation.slice(2).map((item) => (
              <Link
                key={item.name}
                href={item.href}
                className={`link-underline text-sm font-medium transition-colors flex items-center gap-1 ${
                  item.highlight 
                    ? "text-red-400 hover:text-red-300"
                    : useSolid
                      ? "text-foreground hover:text-primary"
                      : "text-white/90 hover:text-white"
                }`}
              >
                {item.name}
                {item.highlight && (
                  <span className="text-[10px] bg-red-500 text-white px-1.5 py-0.5 rounded-full font-bold">
                    HOT
                  </span>
                )}
              </Link>
            ))}
          </div>

          {/* Icons */}
          <div className="flex items-center gap-2">
            {/* Catálogo — acceso rápido a todos los productos */}
            <Link
              href="/catalogo"
              className={`hidden lg:flex items-center gap-1.5 text-xs font-semibold border rounded-full px-3 py-1.5 transition-colors ${
                useSolid
                  ? "border-border text-foreground hover:border-primary hover:text-primary"
                  : "border-white/30 text-white hover:border-white hover:bg-white/10"
              }`}
            >
              Catálogo
            </Link>
            <Link
              href="/favoritos"
              className={`hidden sm:flex relative w-9 h-9 items-center justify-center rounded-md transition-colors ${useSolid ? "text-foreground hover:text-primary" : "text-white/90 hover:text-white hover:bg-white/10"}`}
              aria-label="Ver favoritos"
            >
              <Heart className={`h-5 w-5 transition-colors ${favCount > 0 ? "fill-red-500 text-red-500" : ""}`} />
              {favCount > 0 && (
                <span className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-red-500 text-[9px] font-bold text-white flex items-center justify-center">
                  {favCount}
                </span>
              )}
            </Link>
            <Button
              variant="ghost"
              size="icon"
              className={`relative ${useSolid ? "text-foreground hover:text-primary" : "text-white/90 hover:text-white hover:bg-white/10"}`}
              onClick={openDrawer}
            >
              <ShoppingBag className="h-5 w-5" />
              {cartCount > 0 && (
                <span className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-primary text-[10px] font-bold text-primary-foreground flex items-center justify-center">
                  {cartCount}
                </span>
              )}
              <span className="sr-only">Carrito</span>
            </Button>
          </div>
        </div>
      </nav>
    </header>
  )
}
