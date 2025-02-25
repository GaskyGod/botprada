const moment = require("moment-timezone");
const { Telegraf } = require("telegraf");

// Reemplaza con el token de tu bot
const bot = new Telegraf("8063398299:AAHNPOi5WUBovEdI28bW3ryztDmuExxRKa4");

// Estado del servicio
let servicioActivo = false;
let turnoActivo = false;
let turnoInicio = null; // Guardar hora de inicio del turno
let turnoFin = null; // Guardar hora de fin del turno
let horariosTurno = {}; // Objeto para guardar las horas de inicio y fin por país
let turnoTimeout = null;

// Zonas y lista de espera
const zonas = {
  z1: { usuario: null, tiempo: 0, inicio: null, fin: null },
  z2: { usuario: null, tiempo: 0, inicio: null, fin: null },
  z3: { usuario: null, tiempo: 0, inicio: null, fin: null },
};

const espera = [];

// Función para escapar caracteres especiales en MarkdownV2
const escapeMarkdownV2 = (text) =>
  text.replace(/[_*[\]()~>#+\-=|{}.!\\]/g, "\\$&");

// Función para obtener la hora en Colombia
const obtenerHorarioColombia = () => {
  const ahora = moment().tz("America/Bogota");
  const inicio = ahora.format("HH:mm");
  const fin = ahora.add(2, "hours").format("HH:mm");
  return { inicio, fin };
};

// Función para obtener la hora en otras zonas horarias
const obtenerHorarioPorZona = () => {
  return {
    mexico: moment().tz("America/Mexico_City").format("HH:mm"),
    venezuela: moment().tz("America/Caracas").format("HH:mm"),
    argentina: moment().tz("America/Argentina/Buenos_Aires").format("HH:mm"),
    españa: moment().tz("Europe/Madrid").format("HH:mm"),
  };
};

// Función para iniciar un nuevo turno
// Función para iniciar un nuevo turno
// Función para iniciar un nuevo turno
const iniciarTurno = (chatId) => {
  const ahoraColombia = moment().tz("America/Bogota");
  const inicioColombia = ahoraColombia.format("HH:mm");
  const finColombia = ahoraColombia.clone().add(2, "hours").format("HH:mm");

  // Guardar las horas por país
  horariosTurno = {
    colombia: { inicio: inicioColombia, fin: finColombia },
    mexico: moment().tz("America/Mexico_City").format("HH:mm"),
    venezuela: moment().tz("America/Caracas").format("HH:mm"),
    argentina: moment().tz("America/Argentina/Buenos_Aires").format("HH:mm"),
    españa: moment().tz("Europe/Madrid").format("HH:mm"),
  };

  turnoActivo = true;
  turnoInicio = inicioColombia;
  turnoFin = ahoraColombia.clone().add(2, "hours");

  // Limpiar zonas antes de iniciar nuevo turno
  Object.keys(zonas).forEach((zona) => {
    zonas[zona] = { usuario: null, tiempo: 0, inicio: null, fin: null };
  });
  
  for (let i = 0; i < 3; i++) {
    if (espera.length > 0) {
      const usuario = espera.shift();
      zonas[`z${i + 1}`] = { usuario, inicio: inicioColombia, fin: finColombia };
    }
  }

  bot.telegram.sendMessage(
    chatId,
    `✅ *Nuevo turno iniciado*\n🕒 *Hora de inicio:* ${turnoInicio} 🇨🇴\n⏳ *Hora de fin:* ${turnoFin.format("HH:mm")} 🇨🇴\n\n` +
      `🇲🇽 *Hora México:* ${horariosTurno.mexico}\n` +
      `🇻🇪 *Hora Venezuela:* ${horariosTurno.venezuela}\n` +
      `🇦🇷 *Hora Argentina:* ${horariosTurno.argentina}\n` +
      `🇪🇸 *Hora España:* ${horariosTurno.españa}`,
    { parse_mode: "MarkdownV2" }
  );

  bot.telegram.sendMessage(chatId, obtenerEstado(), { parse_mode: "MarkdownV2" });

  // 🛑 Asegurar que no haya múltiples temporizadores activos
  if (turnoTimeout) {
    clearTimeout(turnoTimeout);
  }

  // Programar el siguiente turno en 2 horas
  turnoTimeout = setTimeout(() => {
    iniciarTurno(chatId);
  }, 2 * 60 * 60 * 1000);
};


// Comando para abrir el servicio
bot.command("abrir", (ctx) => {
  if (!servicioActivo) {
    servicioActivo = true;
    iniciarTurno(ctx.chat.id); // Pasamos el chat.id al iniciar el turno
    ctx.reply("🔓 *Servicio abierto* y turno iniciado ✅", {
      parse_mode: "MarkdownV2",
    });
  } else {
    ctx.reply("⚠️ El servicio ya está abierto", { parse_mode: "MarkdownV2" });
  }
});

// Comando para cerrar el servicio
bot.command("cerrar", (ctx) => {
  servicioActivo = false;
  turnoActivo = false;
  espera.length = 0; // Vaciar la lista de espera

  if (turnoTimeout) {
    clearTimeout(turnoTimeout);
    turnoTimeout = null;
  }

  ctx.reply("🚫 *Servicio cerrado* y lista de espera vaciada", {
    parse_mode: "MarkdownV2",
  });
});

// Función para obtener el estado
// Función para obtener el estado
const obtenerEstado = () => {
  if (!servicioActivo) return "🚫 El servicio está cerrado\\.";

  const minutosRestantes = moment(turnoFin).diff(moment(), "minutes");

  let estado = "⚜️ *Lista de Espera* ⚜️\n\n";

  estado += `🇨🇴 *Hora Colombia* 🇨🇴\n`;
  estado += `⏰ ${horariosTurno.colombia.inicio} ➖ ${horariosTurno.colombia.fin}\n`;

  estado += `🇲🇽 *Hora México* 🇲🇽\n`;
  estado += `⏰ ${horariosTurno.mexico} ➖ ${moment().tz("America/Mexico_City").add(2, "hours").format("HH:mm")}\n`;

  estado += `🇻🇪 *Hora Venezuela* 🇻🇪\n`;
  estado += `⏰ ${horariosTurno.venezuela} ➖ ${moment().tz("America/Caracas").add(2, "hours").format("HH:mm")}\n`;

  estado += `🇦🇷 *Hora Argentina/Chile* 🇨🇱\n`;
  estado += `⏰ ${horariosTurno.argentina} ➖ ${moment().tz("America/Argentina/Buenos_Aires").add(2, "hours").format("HH:mm")}\n`;

  estado += `🇪🇸 *Hora España* 🇪🇸\n`;
  estado += `⏰ ${horariosTurno.españa} ➖ ${moment().tz("Europe/Madrid").add(2, "hours").format("HH:mm")}\n\n`;

  // Estado de las zonas
  for (const [key, value] of Object.entries(zonas)) {
    const numeroZona = key.replace("z", ""); // Convierte "z1" en "1"
    estado += `🔹 Zona ${numeroZona}️⃣: ${
      value.usuario ? `@${escapeMarkdownV2(value.usuario)}` : "Vacío"
    }\n`;
  }
  

  // Estado de la lista de espera
  estado += `⏳ Rotación en ${minutosRestantes} minutos\n`;
  estado += "\n⏬ *En espera:* ⏬\n";
  estado +=
    espera.length > 0
      ? espera.map((user) => `@${escapeMarkdownV2(user)}`).join("\n")
      : "Ninguno";

  return estado;
};

// Comando /estado
bot.command("lista", (ctx) => {
  ctx.reply(obtenerEstado(), { parse_mode: "MarkdownV2" });
});

// Función para asignar zona
const asignarZona = (zona, usuario, ctx) => {
  if (!servicioActivo)
    return ctx.reply("🚫 El servicio está cerrado", {
      parse_mode: "MarkdownV2",
    });

  if (zonas[zona].usuario)
    return ctx.reply("⚠️ Esta zona ya está ocupada", {
      parse_mode: "MarkdownV2",
    });

  const { inicio, fin } = horariosTurno.colombia;
  zonas[zona] = { usuario, inicio, fin };

  // Eliminar al usuario de la lista de espera si está allí
  const index = espera.indexOf(usuario);
  if (index > -1) {
    espera.splice(index, 1); // Eliminar el usuario de la lista de espera
  }

  // Dentro de la función asignarZona, después de responder con la confirmación:
  ctx.reply(
    `✅ @${escapeMarkdownV2(usuario)} asignado a *Zona ${zona.replace("zona", "")}* ${inicio} ➖ ${fin} 🇨🇴`,
    { parse_mode: "MarkdownV2" },
  );

  // Agregar esta línea para mostrar el estado:
  ctx.reply(obtenerEstado(), { parse_mode: "MarkdownV2" });
};

// Comandos /zona1, /zona2, /zona3
["z1", "z2", "z3"].forEach((zona) => {
  bot.command(zona, (ctx) => {
    let usuario = ctx.from.username || ctx.from.first_name;

    // Verificar si el comando contiene un @nombre
    const mention = ctx.message.text.split(" ")[1]; // Obtener el texto después del comando
    if (mention && mention.startsWith("@")) {
      usuario = mention.substring(1); // Extraer el nombre de usuario sin el @
    }

    asignarZona(zona, usuario, ctx); // Asignar la zona
  });
});

// Comando /espera
bot.command("espera", (ctx) => {
  let usuario = ctx.from.username || ctx.from.first_name;

  // Verificar si el comando incluye un @usuario
  const mention = ctx.message.text.split(" ")[1]; 
  if (mention && mention.startsWith("@")) {
    usuario = mention.substring(1); // Extraer nombre sin el "@"
  }

  if (espera.includes(usuario))
    return ctx.reply(`⚠️ @${escapeMarkdownV2(usuario)} ya está en la lista de espera`, {
      parse_mode: "MarkdownV2",
    });

  espera.push(usuario);

  ctx.reply(`✅ @${escapeMarkdownV2(usuario)} añadido a la lista de espera`, {
    parse_mode: "MarkdownV2",
  });

  ctx.reply(obtenerEstado(), { parse_mode: "MarkdownV2" });
});

// Función para eliminar usuario de una zona
const eliminarDeZona = (zona, ctx) => {
  if (!servicioActivo)
    return ctx.reply("🚫 El servicio está cerrado", {
      parse_mode: "MarkdownV2",
    });

  if (!zonas[zona].usuario)
    return ctx.reply("⚠️ Esta zona ya está vacía", {
      parse_mode: "MarkdownV2",
    });

  zonas[zona] = { usuario: null, tiempo: 0, inicio: null, fin: null };
  // Dentro de la función eliminarDeZona, después de responder con la confirmación:
  ctx.reply(`🗑️ *Zona ${zona.replace("zona", "")} vaciada*`, {
    parse_mode: "MarkdownV2",
  });

  // Agregar esta línea para mostrar el estado:
  ctx.reply(obtenerEstado(), { parse_mode: "MarkdownV2" });
};

// Comandos /delzona1, /delzona2, /delzona3
["z1", "z2", "z3"].forEach((zona) => {
  bot.command(`exit${zona}`, (ctx) => eliminarDeZona(zona, ctx));
});



// Comando /comandos
bot.command("comandos", (ctx) => {
  ctx.reply(
    "📌 *Lista de Comandos:*\n\n" +
      "/z1 ➖ Asignarse a la Zona 1️⃣\n" +
      "/z2 ➖ Asignarse a la Zona 2️⃣\n" +
      "/z3 ➖ Asignarse a la Zona 3️⃣\n" +
      "/espera ➖ Añadirse a la lista de espera\n" +
      "/espera @usuario ➖ Añadir a alguien a la lista de espera\n" +
      "/exitz1 ➖ Eliminar usuario de la Zona 1️⃣\n" +
      "/exitz2 ➖ Eliminar usuario de la Zona 2️⃣\n" +
      "/exitz3 ➖ Eliminar usuario de la Zona 3️⃣\n" +
      "/lista ➖ Ver el estado actual\n" +
      "/reglas ➖ Ver las reglas del grupo\n",
    { parse_mode: "MarkdownV2" }
  );
});

bot.command("reglas", (ctx) => {
  ctx.reply(
    "📌 *REGLAS DEL GRUPO:*\n\n" +
      "1️⃣ Asistencia al turno: Debes asistir a tu turno puntualmente, Si pasan 10 minutos después del inicio y no te presentas, podrías perder el turno o recibir una multa\n" +
      "2️⃣ Evita salidas constantes: No te anotes y te salgas de la lista repetidamente, Esto genera desorden y afecta a los demás participantes\n" +
      "3️⃣ No abandonar el turno: Una vez que tomas un turno, debes cumplir con él, No puedes dejarlo abandonado\n" +
      "4️⃣ Tiempo de espera: Si no asistes al turno pasados 10 minutos, el siguiente en la lista podrá tomarlo\n" +
      "📌 Nota: Para cualquier duda o pregunta, consulta con un administrador\n",
    { parse_mode: "MarkdownV2" },
  );
});

// Iniciar el bot
bot.launch();
console.log("🤖 Bot iniciado.");
