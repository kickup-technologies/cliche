"use client"

import { useState } from "react"
import Link from "next/link"
import { Search, ShoppingCart, Menu, X, User } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"

export function Navbar() {
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [isSearchOpen, setIsSearchOpen] = useState(false)
  const [cartCount] = useState(2)

  const navLinks = [
    { name: "Productos", href: "#productos" },
    { name: "Kits", href: "#kits" },
    { name: "Aromas Personalizados", href: "#personalizados" },
    { name: "Nosotros", href: "#nosotros" },
  ]

  return (
    <header className="sticky top-0 z-40 bg-white border-b border-border">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 md:h-20">
          {/* Logo */}
          <Link href="/" className="flex-shrink-0">
            <span className="text-xl md:text-2xl font-bold text-foreground">
              Bienestar <span className="text-primary">by Cliche</span>
            </span>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden lg:flex items-center gap-8">
            {navLinks.map((link) => (
              <Link
                key={link.name}
                href={link.href}
                className="text-muted-foreground hover:text-primary transition-colors font-medium"
              >
                {link.name}
              </Link>
            ))}
          </nav>

          {/* Desktop Actions */}
          <div className="hidden md:flex items-center gap-3">
            {/* Search */}
            <div className={cn(
              "flex items-center transition-all duration-300",
              isSearchOpen ? "w-64" : "w-10"
            )}>
              {isSearchOpen ? (
                <div className="relative w-full">
                  <Input
                    type="text"
                    placeholder="Buscar productos..."
                    className="pr-10 rounded-full"
                    autoFocus
                    onBlur={() => setIsSearchOpen(false)}
                  />
                  <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                </div>
              ) : (
                <button
                  onClick={() => setIsSearchOpen(true)}
                  className="p-2 hover:bg-muted rounded-full transition-colors"
                  aria-label="Buscar"
                >
                  <Search className="w-5 h-5 text-muted-foreground" />
                </button>
              )}
            </div>

            {/* User */}
            <button className="p-2 hover:bg-muted rounded-full transition-colors" aria-label="Mi cuenta">
              <User className="w-5 h-5 text-muted-foreground" />
            </button>

            {/* Cart */}
            <button className="p-2 hover:bg-muted rounded-full transition-colors relative" aria-label="Carrito">
              <ShoppingCart className="w-5 h-5 text-muted-foreground" />
              {cartCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 w-5 h-5 bg-primary text-primary-foreground text-xs font-bold rounded-full flex items-center justify-center">
                  {cartCount}
                </span>
              )}
            </button>

            {/* CTA */}
            <Button className="rounded-full px-6 font-semibold">
              Comprar ahora
            </Button>
          </div>

          {/* Mobile Actions */}
          <div className="flex md:hidden items-center gap-2">
            <button className="p-2 hover:bg-muted rounded-full transition-colors relative" aria-label="Carrito">
              <ShoppingCart className="w-5 h-5 text-muted-foreground" />
              {cartCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 w-5 h-5 bg-primary text-primary-foreground text-xs font-bold rounded-full flex items-center justify-center">
                  {cartCount}
                </span>
              )}
            </button>
            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="p-2 hover:bg-muted rounded-full transition-colors"
              aria-label="Menu"
            >
              {isMenuOpen ? (
                <X className="w-6 h-6 text-foreground" />
              ) : (
                <Menu className="w-6 h-6 text-foreground" />
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu */}
      <div className={cn(
        "lg:hidden border-t border-border bg-white overflow-hidden transition-all duration-300",
        isMenuOpen ? "max-h-96" : "max-h-0"
      )}>
        <div className="px-4 py-4 space-y-4">
          {/* Mobile Search */}
          <div className="relative">
            <Input
              type="text"
              placeholder="Buscar productos..."
              className="pr-10 rounded-full"
            />
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          </div>
          
          {/* Mobile Nav Links */}
          <nav className="flex flex-col gap-2">
            {navLinks.map((link) => (
              <Link
                key={link.name}
                href={link.href}
                className="py-2 px-3 text-foreground hover:bg-muted rounded-lg transition-colors font-medium"
                onClick={() => setIsMenuOpen(false)}
              >
                {link.name}
              </Link>
            ))}
          </nav>

          {/* Mobile CTA */}
          <Button className="w-full rounded-full font-semibold">
            Comprar ahora
          </Button>
        </div>
      </div>
    </header>
  )
}
