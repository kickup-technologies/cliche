/**
 * Página temporal: muestra la imagen base de la intro a pantalla completa
 * (cover, sin márgenes) para capturarla limpia vía screenshot.
 * Eliminar tras generar el video en CF Studio.
 */
export default function IntroStill() {
  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        backgroundImage: "url(/images/intro/intro-silk-clean.png)",
        backgroundSize: "cover",
        backgroundPosition: "center",
      }}
    />
  )
}
