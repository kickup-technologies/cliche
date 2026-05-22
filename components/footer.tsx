"use client"

import Link from "next/link"
import { Instagram, Facebook, MessageCircle, Mail } from "lucide-react"

function TikTokIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
      <path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-2.88 2.5 2.89 2.89 0 01-2.89-2.89 2.89 2.89 0 012.89-2.89c.28 0 .54.04.79.1V9.01a6.34 6.34 0 00-.79-.05 6.34 6.34 0 00-6.34 6.34 6.34 6.34 0 006.34 6.34 6.34 6.34 0 006.33-6.34V8.69a8.27 8.27 0 004.84 1.55V6.79a4.85 4.85 0 01-1.07-.1z"/>
    </svg>
  )
}

const footerLinks = {
  productos: [
    { name: "Aromas para Hogar", href: "/#productos" },
    { name: "Atomizadores Textiles", href: "/#productos" },
    { name: "Kits de Regalo", href: "/#productos" },
    { name: "Aroma Agua", href: "/productos/aroma-agua" },
    { name: "Kit Armonía x3", href: "/productos/kit-armonia-x3" },
  ],
  empresa: [
    { name: "Nuestra Historia", href: "/#nosotros" },
    { name: "Marcas aliadas", href: "/#marcas" },
    { name: "Crea tu aroma", href: "https://clichecolombia.com/pages/quiero-crear-un-aroma-para-mi-marca" },
    { name: "Distribuidores", href: "https://wa.me/573194565463?text=Hola!+Quiero+info+sobre+distribuidores" },
  ],
  soporte: [
    { name: "WhatsApp: +57 319 456 5463", href: "https://wa.me/573194565463" },
    { name: "hola@clichecolombia.com", href: "mailto:hola@clichecolombia.com" },
    { name: "Preguntas Frecuentes", href: "/#faq" },
    { name: "Envíos y Devoluciones", href: "/terminos-condiciones#envios" },
    { name: "Guía de Aromas", href: "/#beneficios" },
  ],
  legal: [
    { name: "Términos y Condiciones", href: "/terminos-condiciones" },
    { name: "Política de Privacidad", href: "/politica-privacidad" },
  ],
}

const socialLinks = [
  { name: "Instagram", icon: Instagram,    href: "https://www.instagram.com/clichecolombia/" },
  { name: "TikTok",    icon: TikTokIcon,   href: "https://www.tiktok.com/@clichecolombia" },
  { name: "Facebook",  icon: Facebook,     href: "https://www.facebook.com/clichecolombia" },
  { name: "WhatsApp",  icon: MessageCircle, href: "https://wa.me/573194565463?text=Hola!+Vi+sus+productos+y+quiero+más+información" },
  { name: "Email",     icon: Mail,         href: "mailto:hola@clichecolombia.com" },
]

export function Footer() {
  return (
    <footer className="bg-foreground text-background">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Main footer content */}
        <div className="py-16 lg:py-20">
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-8 lg:gap-12">
            {/* Brand column */}
            <div className="col-span-2">
              <Link href="/" className="inline-flex flex-col items-start mb-6">
                <svg 
                  viewBox="0 0 60 40" 
                  className="h-8 w-12 text-primary"
                  fill="currentColor"
                >
                  <path d="M30 5c-8 0-15 6-15 15s7 15 15 15c8 0 15-6 15-15S38 5 30 5zm0 25c-5.5 0-10-4.5-10-10s4.5-10 10-10 10 4.5 10 10-4.5 10-10 10z" />
                  <circle cx="30" cy="20" r="4" />
                </svg>
                <span className="font-serif text-2xl font-semibold tracking-wide text-background mt-1">
                  Cliché
                </span>
              </Link>
              <p className="text-background/70 text-sm leading-relaxed mb-6 max-w-xs">
                Creamos experiencias sensoriales únicas que transforman espacios y evocan emociones. Aromas artesanales con alma colombiana.
              </p>
              <div className="flex items-center gap-4">
                {socialLinks.map((social) => (
                  <Link
                    key={social.name}
                    href={social.href}
                    className="w-10 h-10 rounded-full bg-background/10 flex items-center justify-center hover:bg-primary transition-colors"
                  >
                    <social.icon className="w-5 h-5" />
                    <span className="sr-only">{social.name}</span>
                  </Link>
                ))}
              </div>
            </div>

            {/* Products column */}
            <div>
              <h4 className="font-serif text-sm font-semibold uppercase tracking-wider text-background mb-4">
                Productos
              </h4>
              <ul className="space-y-3">
                {footerLinks.productos.map((link) => (
                  <li key={link.name}>
                    <Link
                      href={link.href}
                      className="text-sm text-background/70 hover:text-primary transition-colors"
                    >
                      {link.name}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            {/* Company column */}
            <div>
              <h4 className="font-serif text-sm font-semibold uppercase tracking-wider text-background mb-4">
                Empresa
              </h4>
              <ul className="space-y-3">
                {footerLinks.empresa.map((link) => (
                  <li key={link.name}>
                    <Link
                      href={link.href}
                      className="text-sm text-background/70 hover:text-primary transition-colors"
                    >
                      {link.name}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            {/* Support column */}
            <div>
              <h4 className="font-serif text-sm font-semibold uppercase tracking-wider text-background mb-4">
                Soporte
              </h4>
              <ul className="space-y-3">
                {footerLinks.soporte.map((link) => (
                  <li key={link.name}>
                    <Link
                      href={link.href}
                      className="text-sm text-background/70 hover:text-primary transition-colors"
                    >
                      {link.name}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            {/* Legal column */}
            <div>
              <h4 className="font-serif text-sm font-semibold uppercase tracking-wider text-background mb-4">
                Legal
              </h4>
              <ul className="space-y-3">
                {footerLinks.legal.map((link) => (
                  <li key={link.name}>
                    <Link
                      href={link.href}
                      className="text-sm text-background/70 hover:text-primary transition-colors"
                    >
                      {link.name}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="border-t border-background/10 py-6">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <p className="text-sm text-background/60">
              © 2025 Bienestar by Cliché. Todos los derechos reservados. · Colombia 🇨🇴
            </p>
            <div className="flex items-center gap-6">
              <img
                src="https://upload.wikimedia.org/wikipedia/commons/thumb/5/5e/Visa_Inc._logo.svg/200px-Visa_Inc._logo.svg.png"
                alt="Visa"
                className="h-6 opacity-60 invert"
              />
              <img
                src="https://upload.wikimedia.org/wikipedia/commons/thumb/2/2a/Mastercard-logo.svg/200px-Mastercard-logo.svg.png"
                alt="Mastercard"
                className="h-6 opacity-60"
              />
              <span className="text-xs text-background/40">Pagos seguros</span>
            </div>
          </div>
        </div>
      </div>
    </footer>
  )
}
