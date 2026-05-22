"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { Menu, Search, ShoppingBag, User, ChevronDown, Heart } from "lucide-react"
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

const navigation = [
  {
    name: "Aromas",
    href: "/#productos",
    submenu: [
      { name: "Para el Hogar", href: "/#productos" },
      { name: "Para Ropa", href: "/#productos" },
      { name: "Kits de Regalo", href: "/#productos" },
    ],
  },
  { name: "Colecciones", href: "/#productos" },
  { name: "Ofertas", href: "/#productos", highlight: true },
  { name: "Nosotros", href: "/#nosotros" },
]

export function Header() {
  const [isOpen, setIsOpen] = useState(false)
  const [isScrolled, setIsScrolled] = useState(false)
  const { items, openDrawer } = useCart()
  const cartCount = items.reduce((acc, i) => acc + i.quantity, 0)

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 50)
    }
    window.addEventListener("scroll", handleScroll)
    return () => window.removeEventListener("scroll", handleScroll)
  }, [])

  return (
    <header className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
      isScrolled 
        ? "bg-background/95 backdrop-blur-md shadow-sm" 
        : "bg-transparent"
    }`} style={{ top: isScrolled ? 0 : "40px" }}>
      <nav className="container mx-auto px-4">
        <div className="flex h-16 lg:h-20 items-center justify-between">
          {/* Mobile menu */}
          <div className="lg:hidden">
            <Sheet open={isOpen} onOpenChange={setIsOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className={isScrolled ? "text-foreground" : "text-white"}>
                  <Menu className="h-6 w-6" />
                  <span className="sr-only">Abrir menú</span>
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-[300px] bg-background">
                <div className="flex flex-col gap-6 pt-8">
                  {navigation.map((item) => (
                    <div key={item.name}>
                      {item.submenu ? (
                        <div className="space-y-3">
                          <span className="text-lg font-serif font-semibold text-foreground">
                            {item.name}
                          </span>
                          <div className="pl-4 space-y-2">
                            {item.submenu.map((sub) => (
                              <Link
                                key={sub.name}
                                href={sub.href}
                                className="block text-muted-foreground hover:text-primary transition-colors"
                                onClick={() => setIsOpen(false)}
                              >
                                {sub.name}
                              </Link>
                            ))}
                          </div>
                        </div>
                      ) : (
                        <Link
                          href={item.href}
                          className={`text-lg font-serif font-semibold transition-colors ${
                            item.highlight ? "text-primary" : "text-foreground hover:text-primary"
                          }`}
                          onClick={() => setIsOpen(false)}
                        >
                          {item.name}
                          {item.highlight && (
                            <span className="ml-2 text-xs bg-red-500 text-white px-2 py-0.5 rounded-full">
                              -30%
                            </span>
                          )}
                        </Link>
                      )}
                    </div>
                  ))}
                  
                  {/* Mobile CTA */}
                  <div className="pt-6 border-t border-border">
                    <Button className="w-full" size="lg">
                      COMPRAR AHORA
                    </Button>
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
                    isScrolled ? "text-foreground hover:text-primary" : "text-white/90 hover:text-white"
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
                  className={`text-sm font-medium transition-colors ${
                    isScrolled ? "text-foreground hover:text-primary" : "text-white/90 hover:text-white"
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
              isScrolled ? "text-foreground" : "text-white"
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
                className={`text-sm font-medium transition-colors flex items-center gap-1 ${
                  item.highlight 
                    ? "text-red-400 hover:text-red-300" 
                    : isScrolled 
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
          <div className="flex items-center gap-1">
            <Button 
              variant="ghost" 
              size="icon" 
              className={`hidden sm:flex ${isScrolled ? "text-foreground hover:text-primary" : "text-white/90 hover:text-white hover:bg-white/10"}`}
            >
              <Search className="h-5 w-5" />
              <span className="sr-only">Buscar</span>
            </Button>
            <Button 
              variant="ghost" 
              size="icon" 
              className={`hidden sm:flex ${isScrolled ? "text-foreground hover:text-primary" : "text-white/90 hover:text-white hover:bg-white/10"}`}
            >
              <Heart className="h-5 w-5" />
              <span className="sr-only">Favoritos</span>
            </Button>
            <Button 
              variant="ghost" 
              size="icon" 
              className={`hidden sm:flex ${isScrolled ? "text-foreground hover:text-primary" : "text-white/90 hover:text-white hover:bg-white/10"}`}
            >
              <User className="h-5 w-5" />
              <span className="sr-only">Cuenta</span>
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className={`relative ${isScrolled ? "text-foreground hover:text-primary" : "text-white/90 hover:text-white hover:bg-white/10"}`}
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
