"use client"

import Link from "next/link"
import { Instagram, Facebook, MessageCircle } from "lucide-react"

const footerLinks = {
  productos: [
    { name: "Aromas para Hogar", href: "#" },
    { name: "Atomizadores Textiles", href: "#" },
    { name: "Velas Artesanales", href: "#" },
    { name: "Kits de Regalo", href: "#" },
    { name: "Esencias", href: "#" },
  ],
  empresa: [
    { name: "Nuestra Historia", href: "#" },
    { name: "Sostenibilidad", href: "#" },
    { name: "Distribuidores", href: "#" },
    { name: "Trabaja con Nosotros", href: "#" },
    { name: "Blog", href: "#" },
  ],
  soporte: [
    { name: "Contacto", href: "#" },
    { name: "Preguntas Frecuentes", href: "#" },
    { name: "Envíos y Devoluciones", href: "#" },
    { name: "Guía de Aromas", href: "#" },
  ],
  legal: [
    { name: "Términos y Condiciones", href: "#" },
    { name: "Política de Privacidad", href: "#" },
    { name: "Cookies", href: "#" },
  ],
}

const socialLinks = [
  { name: "Instagram", icon: Instagram, href: "#" },
  { name: "Facebook", icon: Facebook, href: "#" },
  { name: "WhatsApp", icon: MessageCircle, href: "#" },
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
              © 2024 Cliché. Todos los derechos reservados.
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
