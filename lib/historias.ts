/**
 * Historias de producto (la "Descripción" de cada ficha de aroma), reescritas
 * con enfoque de relato el 7-nov-2026, igual que en Bienestar by Cliché: una
 * escena que abre, las notas como un recorrido, el lugar o momento de uso (y,
 * cuando la fuente lo sugiere, una línea para marcas y tiendas) y el cierre
 * "Notas: … Familia olfativa: …".
 *
 * Solo datos que ya estaban en la descripción de la BD: sin promesas de salud
 * ("calma la mente", "regula el cortisol", "reduce la ansiedad"…), sin
 * superlativos que no se puedan sostener ("más vendido", "la más cara del
 * mundo") y sin cifras nuevas. Si una nota choca con lib/catalog-data.ts,
 * manda la BD.
 *
 * Se aplican SOLO si el panel conserva el texto anterior (empieza igual que
 * `antes`) o no tiene texto: si alguien escribe otra descripción en el panel,
 * manda la del panel.
 */
export const HISTORIAS: Record<string, { antes: string; texto: string }> = {
  "aroma-agua": {
    antes: "Bergamota italiana, lirio acuático y alm",
    texto: `Es la sensación de una casa recién organizada, con las ventanas abiertas y todo en su lugar. Agua abre con la bergamota italiana, brillante y cítrica; el lirio acuático le da un corazón limpio y transparente, y el almizcle marino lo cierra con un fondo suave que se queda en el aire.

Rocíalo en la sala, en el baño o en tu espacio de trabajo: en segundos el ambiente se siente más fresco, ordenado y vivo. También acompaña hoteles, spas y oficinas que quieren oler a espacio bien cuidado.

Notas: bergamota italiana, lirio acuático y almizcle marino. Familia olfativa: fresca, acuática y cítrica.`,
  },
  "aroma-air-fresh": {
    antes: "La sensación de recién limpio, al instan",
    texto: `La cama del perro, la cobija del gato, el rincón donde comen: los espacios de las mascotas también merecen oler a recién limpio. Air Fresh es un aroma fresco y neutro que neutraliza, renueva y deja el ambiente impecable al instante, con una frescura discreta.

Rocíalo en sus camas, cobijas y rincones, o en el lugar donde guardas sus cosas. Para marcas y tiendas de mascotas es el detalle que transmite higiene y cariño en cada producto que entregan.

Notas: notas limpias y frescor neutro. Familia olfativa: fresca y limpia.`,
  },
  "aroma-aire": {
    antes: "Ozono fresco, bambú verde y almizcle bla",
    texto: `Vivas en el piso que vivas, hay días en que la casa se siente cargada, como si le faltara aire. Un solo puf de Aire y llega la sensación de ventana abierta y brisa de campo. El ozono fresco entra limpio y mineral, el bambú verde le pone un matiz vegetal y el almizcle blanco deja un fondo suave.

Es el aroma de la oficina en casa y de la habitación: para arrancar la jornada con el espacio despejado o para renovar el cuarto cuando lo abres por la mañana.

Notas: ozono fresco, bambú verde y almizcle blanco. Familia olfativa: fresca, mineral y verde.`,
  },
  "aroma-best-friends": {
    antes: "Frambuesa, flores dulces y azúcar suave.",
    texto: `La pijamada, la tarde de tareas en grupo, la sala llena de amigos: hay espacios que se viven en compañía. Best Friends los acompaña con un aroma dulce y alegre. La frambuesa abre jugosa, las flores dulces le dan un corazón tierno y el azúcar suave lo cierra con un fondo cálido.

Rocíalo en el cuarto de los niños, en la habitación de estudiante o en el lugar donde se reúnen. El espacio se siente alegre, cálido y acogedor, de esos donde la visita se queda un rato más.

Notas: frambuesa, flores dulces y azúcar suave. Familia olfativa: dulce, frutal y floral.`,
  },
  "aroma-brillos-seda": {
    antes: "Flores blancas, seda natural y almizcle ",
    texto: `Abres el clóset y la ropa huele como si alguien la hubiera doblado con cuidado. Brillos de Seda empieza con flores blancas, luminosas y delicadas; la seda natural le aporta una sensación suave y limpia, y el almizcle suave le da un fondo tibio.

Úsalo en el clóset, sobre la cama o en el dormitorio para que la ropa, las sábanas y los espacios se sientan recién cuidados. En una boutique, es la forma de transmitir lujo accesible desde que el cliente cruza la puerta.

Notas: flores blancas, seda natural y almizcle suave. Familia olfativa: floral, suave y almizclada.`,
  },
  "aroma-calor-de-lana": {
    antes: "Cachemir suave, ámbar cálido y vainilla ",
    texto: `Afuera llueve; adentro hay una manta, una taza caliente y un libro a medio leer. Calor de Lana huele a esa tarde. El cachemir suave abre como una tela tibia, el ámbar cálido envuelve el espacio y la vainilla seca lo cierra con una dulzura medida, en su punto justo.

Es el aroma de las noches frías y los días de lluvia. Rocíalo en el cuarto, en la sala o en tu rincón de lectura cuando quieras que la casa se sienta como un abrazo y una buena compañía.

Notas: cachemir suave, ámbar cálido y vainilla seca. Familia olfativa: cálida, ambarada y suave.`,
  },
  "aroma-coconut": {
    antes: "Verano dulce en cada puf. Coco cremoso, ",
    texto: `Un vestido de baño recién sacado de la bolsa, una camiseta de playa, la ropa de los niños lista para las vacaciones: Coconut les pone verano en cada puf. El coco cremoso abre suave, la almendra y la piña le dan un toque goloso y frutal, y la tonka lo cierra con un fondo dulce. Es el aroma que llamamos «coconut sugar pop».

Rocíalo sobre prendas playeras e infantiles. Para marcas de vestidos de baño, ropa de playa e infantil es una firma tropical que despierta antojo y alegría a la primera olida.

Notas: coco cremoso, almendra, piña y tonka. Familia olfativa: dulce, tropical y golosa.`,
  },
  "aroma-dulce-lana": {
    antes: "Ámbar dorado, lana suave y vainilla ahum",
    texto: `Hay una diferencia entre volver a casa y llegar a tu hogar, y casi siempre empieza en la puerta. Dulce Lana es confort puro: el ámbar dorado abre cálido y luminoso, la lana suave le da la textura de una cobija recién sacada del clóset y la vainilla ahumada lo cierra con un fondo profundo y acogedor.

Rocíalo en el dormitorio, en la sala o en la entrada, para que las personas que quieres se sientan bienvenidas desde que cruzan la puerta.

Notas: ámbar dorado, lana suave y vainilla ahumada. Familia olfativa: cálida, ambarada y dulce.`,
  },
  "aroma-eternamente-indigo": {
    antes: "Iris azul, violeta intensa y almizcle pr",
    texto: `«¿A qué huele tu casa?». Es la pregunta que aparece cuando alguien entra y se encuentra con Eternamente Índigo. El iris azul abre elegante, la violeta intensa le da profundidad y el almizcle profundo deja una firma que se reconoce enseguida y se queda en el recuerdo de quien la siente.

Es para quienes quieren que su espacio tenga identidad propia: la sala donde recibes, la entrada, el lugar que tus visitas van a recordar. Esa misma firma inconfundible le sirve a una marca que quiere ser reconocida por su aroma.

Notas: iris azul, violeta intensa y almizcle profundo. Familia olfativa: floral, intensa y almizclada.`,
  },
  "aroma-frescura-de-lino": {
    antes: "Lino suave, cedro blanco y brisa fresca.",
    texto: `Sábanas recién tendidas, toallas dobladas, un clóset en orden. Frescura de Lino es la versión más delicada y femenina de nuestra familia de lino. El lino suave abre limpio, la brisa fresca le da aire y el cedro blanco ayuda a que el aroma se quede más tiempo en las fibras.

Úsalo en el clóset, sobre la ropa de cama o en el baño, donde quieres una sensación de pulcritud que habla en voz baja y se percibe con discreción.

Notas: lino suave, cedro blanco y brisa fresca. Familia olfativa: fresca, limpia y ligeramente amaderada.`,
  },
  "aroma-happiness": {
    antes: "Cítricos alegres, flores de primavera y ",
    texto: `Suena la alarma, entra la primera luz y la cocina empieza a oler a café. Happiness está hecho para ese arranque. Los cítricos alegres abren brillantes, las flores de primavera le suman un corazón luminoso y el almizcle fresco lo deja limpio y ligero.

Rocíalo en el baño de la mañana, en la cocina o en cualquier rincón donde quieras empezar el día con un ambiente lleno de energía y buen ánimo desde la primera hora.

Notas: cítricos alegres, flores de primavera y almizcle fresco. Familia olfativa: cítrica, floral y fresca.`,
  },
  "aroma-hilos-de-seda": {
    antes: "Seda blanca, polvos suaves y almizcle cr",
    texto: `Hay espacios que se cuidan en silencio: el vestidor, un baño de lujo, el cuarto del bebé. Hilos de Seda está pensado para ellos. La seda blanca abre suave, los polvos suaves le dan un toque polvoroso y limpio, y el almizcle cremoso lo envuelve todo con delicadeza.

Úsalo en el vestidor, el baño, el cuarto del bebé o el dormitorio para crear una atmósfera de spa privado, envolvente y discreta. Puedes rociarlo sobre la ropa y la ropa de cama: no mancha textiles.

Notas: seda blanca, polvos suaves y almizcle cremoso. Familia olfativa: suave, polvorosa y almizclada.`,
  },
  "aroma-indigo-profundo": {
    antes: "Lavanda francesa, violeta y cedro oscuro",
    texto: `Una sala amplia, techos altos, un espacio que pide un aroma con presencia. Índigo Profundo es la versión intensa de Índigo. La lavanda francesa abre aromática y limpia, la violeta le da un corazón elegante y el cedro oscuro lo asienta con un fondo amaderado y firme.

Se queda más tiempo en el ambiente y en las telas, así que rinde en salas amplias y estudios. En una tienda, llena el espacio con una presencia aromática equilibrada, en su justa medida.

Notas: lavanda francesa, violeta y cedro oscuro. Familia olfativa: aromática, floral y amaderada.`,
  },
  "aroma-luxury": {
    antes: "Oud árabe, ámbar oriental y especias exó",
    texto: `Una sala de primera clase en algún lugar del Medio Oriente: maderas oscuras, luz baja, todo en su punto. Luxury huele a eso. El oud árabe abre profundo y amaderado, el ámbar oriental le da calidez y las especias exóticas dejan una estela que se nota apenas entras.

Es para los espacios que piden algo fuera de lo común: la sala donde recibes, el estudio, una tienda o una marca de lujo. Una sola aplicación y el ambiente sube de categoría.

Notas: oud árabe, ámbar oriental y especias exóticas. Familia olfativa: amaderada, oriental y especiada.`,
  },
  "aroma-lycra-de-verano": {
    antes: "Cítricos vibrantes, sal marina y vetiver",
    texto: `Los tenis listos, la terraza con sol, la música sonando. Lycra de Verano es energía en estado puro. Los cítricos vibrantes abren con fuerza, la sal marina le trae aire de mar y el vetiver le da un fondo con carácter que lo sostiene.

Rocíalo en el gimnasio de la casa, en el cuarto de los niños, en la terraza o en tu espacio de trabajo, cuando quieras que el ambiente vibre desde temprano y el día arranque con impulso.

Notas: cítricos vibrantes, sal marina y vetiver. Familia olfativa: cítrica, marina y fresca.`,
  },
  "aroma-mahai": {
    antes: "Coco tropical, vainilla de Madagascar y ",
    texto: `Sandalias en la puerta, una tarde de sol en la terraza y ese olor a vacaciones que uno quisiera guardar en un frasco. Mahai lo trae a casa. El coco tropical abre cremoso, la flor de tiaré le pone un corazón floral y luminoso, y la vainilla de Madagascar lo redondea con un fondo dulce.

Úsalo en la terraza, la cocina o el baño cuando quieras que el espacio transmita verano, alegría y buen humor.

Notas: coco tropical, vainilla de Madagascar y flor de tiaré. Familia olfativa: tropical, dulce y floral.`,
  },
  "aroma-navidad": {
    antes: "Pino natural, canela caliente y naranja ",
    texto: `Las novenas, el árbol armado en la sala, la casa llena de familia: Navidad guarda la magia de diciembre en un puf. El pino natural abre verde y fresco, la canela caliente le da calidez y la naranja especiada lo cierra con un toque cítrico y festivo.

Rocíalo en las reuniones y fiestas de fin de año, o en cualquier mes en que quieras volver a esa nostalgia del hogar familiar en fiestas. Diciembre cabe en cualquier época del año, cuando quieras y donde quieras.

Notas: pino natural, canela caliente y naranja especiada. Familia olfativa: especiada, cálida y festiva.`,
  },
  "aroma-romeo-y-julieta": {
    antes: "Rosa roja intenso, jazmín natural y almi",
    texto: `Hay noches que se planean con detalle: la mesa para dos, la luz tenue, la canción elegida. Romeo y Julieta es el aroma para crear ese escenario. La rosa roja abre intensa, el jazmín natural le suma un corazón floral y envolvente, y el almizcle blanco lo deja suave en el aire.

Rocíalo en la habitación de pareja, en el comedor antes de una cena especial o sobre los cojines, para esos momentos que merecen recordarse. También es un regalo romántico con mucha intención.

Notas: rosa roja, jazmín natural y almizcle blanco. Familia olfativa: floral, romántica e intensa.`,
  },
  "aroma-seda-del-lejano-oriente": {
    antes: "Sofisticación que transporta. Vainilla c",
    texto: `Alguien pasa por la tienda y voltea a buscar de dónde viene ese aroma. Seda del Lejano Oriente es de esos que detienen el paso. La vainilla cremosa abre suave, el cardamomo le pone un toque especiado y el cedro elegante lo sostiene con un fondo envolvente y misterioso.

Es un aroma para vestir una marca de lujo sensorial: rocíalo en la tienda o sobre las prendas, bolsos y accesorios que entregas, para que tu marca se sienta exótica y memorable desde el primer contacto.

Notas: vainilla cremosa, cedro y cardamomo. Familia olfativa: oriental, especiada y envolvente.`,
  },
  "aroma-sello-de-dios": {
    antes: "Incienso sagrado, mirra árabe y madera d",
    texto: `Antes de que empiece el ruido del día hay un momento de silencio: una oración, la lectura de la mañana, unos minutos de meditación. Sello de Dios acompaña ese ritual. El incienso sagrado abre solemne, la mirra árabe le da un corazón resinoso y profundo, y la madera de oud lo asienta con un fondo cálido.

En segundos el ambiente gana profundidad y presencia. Úsalo en tu espacio espiritual, en el rincón de meditación o al iniciar el día. En una tienda, transmite misticismo y distinción a quien entra.

Notas: incienso sagrado, mirra árabe y madera de oud. Familia olfativa: amaderada, resinosa y profunda.`,
  },
  "aroma-sugar-pop": {
    antes: "Pitaya, lychée, flor de Jamaica y vainil",
    texto: `Tu cuarto, tus reglas: la cama llena de cojines, el clóset con tus prendas favoritas y tu playlist sonando. Sugar Pop es de la línea Cliché for girls y huele a diversión. La pitaya y el lychée abren dulces y frutales, la flor de Jamaica le pone un toque floral y la vainilla lo cierra suave.

Rocíalo en el ambiente o sobre los textiles: en tu cuarto, en tu clóset o sobre tu ropa, para que tu espacio huela a ti.

Notas: pitaya, lychée, flor de Jamaica y vainilla. Familia olfativa: dulce, frutal y divertida. Spray de 250 ml.`,
  },
  "aroma-tao": {
    antes: "Sándalo zen, bambú vivo y agua de rosas.",
    texto: `El tapete de yoga extendido, una taza de té, el teléfono en silencio. Tao está diseñado para esos espacios. El sándalo zen abre cálido y sereno, el bambú vivo le aporta un aire verde y el agua de rosas lo cierra con una nota floral delicada.

Rocíalo en tu rincón de meditación, en el espacio donde trabajas desde casa o en el cuarto como parte de tu ritual de la noche. Es un aroma para espacios de concentración, práctica y pausa.

Notas: sándalo zen, bambú vivo y agua de rosas. Familia olfativa: amaderada, verde y floral.`,
  },
  "aroma-tierra": {
    antes: "Pachulí, cedro de Virginia y vetiver hon",
    texto: `Una biblioteca de madera, un sillón de cuero, una conversación sin afán. Tierra es un aroma denso, terroso y adulto, de los que le dan carácter a cualquier espacio. El pachulí abre profundo, el cedro de Virginia le da estructura y el vetiver hondureño lo asienta con un fondo amaderado.

Úsalo en la sala o en el estudio cuando quieras que el espacio se sienta con peso propio. En una tienda, transmite solidez desde la entrada.

Notas: pachulí, cedro de Virginia y vetiver hondureño. Familia olfativa: amaderada, terrosa y profunda.`,
  },
  "aroma-vientos-de-lino": {
    antes: "Lino limpio, algodón fresco y brisa mari",
    texto: `La ropa recién sacada del tendedero, todavía tibia de sol, y las sábanas limpias el día que las cambias. Vientos de Lino huele a eso, siempre. El lino limpio abre fresco, el algodón fresco le da suavidad y la brisa marina le pone aire.

Es para quienes prefieren el olor a ropa bien lavada. Rocíalo en el dormitorio, el clóset o el baño, y sobre telas, almohadas y sábanas: el olor a limpio te acompaña durante todo el día.

Notas: lino limpio, algodón fresco y brisa marina. Familia olfativa: fresca, limpia y algodonada.`,
  },
  "aroma-watermelon": {
    antes: "Pura diversión dulce. Sandía jugosa en s",
    texto: `Una tajada de sandía fría en un día de calor, con el jugo escurriendo por las manos. Watermelon es pura diversión dulce. La sandía jugosa abre fresca y frutal, y la nota candy la lleva a su versión más golosa, tipo caramelo.

Es un aroma alegre que arranca sonrisas, pensado para marcas infantiles: rocíalo en la tienda y sobre los textiles. Porque la felicidad también se huele, y esta se queda todo el día.

Notas: sandía y notas candy. Familia olfativa: dulce, frutal y divertida.`,
  },
}

/** La historia para mostrar: la nueva si el panel conserva el texto anterior (o está vacío); si alguien escribió otra en el panel, manda la del panel. */
export function historiaDe(slug: string, delPanel?: string | null): string | undefined {
  const h = HISTORIAS[slug]
  if (!h) return delPanel || undefined
  const panel = (delPanel || "").trim()
  if (!panel || panel.startsWith(h.antes)) return h.texto
  return panel
}
