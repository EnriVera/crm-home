export default defineI18nConfig(() => ({
  messages: {
    es: {
      app: {
        name: "CRM-HOME",
      },
      nav: {
        general: "General",
        finance: "Finanzas",
        system: "Sistema",
        dashboard: "Dashboard",
        tasks: "Tareas",
        tasksConfig: "Configuración de tareas",
        schedules: "Schedule",
        clients: "Clientes",
        incomes: "Ingresos",
        expenses: "Gastos",
        transfers: "Transferencias",
        config: "Configuración",
      },
      legal: {
        terms: "Términos",
        privacy: "Privacidad",
        cookies: "Cookies",
      },
      dashboard: {
        title: "Dashboard",
        subtitle: "Resumen de tu actividad al {date}",
        newTask: "+ Nueva tarea",
        timerTitle: "Timer activo",
        timerIdle: "No hay ningún timer corriendo.",
        timerCta: "Iniciá tu primer timer",
        statesTitle: "Tareas por estado",
        totalTasks: "{count} tareas en total",
        recentTitle: "Últimas tareas",
        recentEmpty: "Todavía no hay tareas.",
        updatedAt: "Actualizada {date}",
        emptyTitle: "Empezá por acá",
        emptyCreateTask: "Creá tu primera tarea",
        emptyStartTimer: "Iniciá tu primer timer",
        loadError: "No pudimos cargar tus tareas.",
        viewAll: "Ver todas",
      },
      auth: {
        title: "Iniciar sesión",
        subtitle: "Entrá a tu estudio con tu email.",
        emailLabel: "Email",
        // The placeholder cannot hold an "@": the vue-i18n tokenizer reads it
        // as the start of a linked message and rejects the message.
        emailPlaceholder: "nombre en estudio.com",
        hint: "Sin contraseña: te enviamos un código por email",
        sendCode: "Enviar código",
        sending: "Enviando…",
        verify: "Verificar",
        verifyTitle: "Verificación en dos pasos",
        otpSubtitle: "Ingresá el código de 6 dígitos que enviamos a {email}.",
        otpWrong: "Código incorrecto, revisalo e intentá de nuevo",
        otpExpired: "El código venció, pedí uno nuevo",
        resend: "Reenviar código ({seconds})",
        resendReady: "Reenviar código",
        backToLogin: "Volver al inicio de sesión",
        errors: {
          invalidEmail: "Ingresá un email válido",
          otpInvalid: "No pudimos verificar el código",
          rateLimited: "Esperá un momento antes de pedir otro código",
          unknown: "Algo salió mal, intentá de nuevo",
        },
      },
      brand: {
        headline: "Tu estudio, en orden.",
        subtitle:
          "Un solo lugar para tus tareas, tu tiempo y tus finanzas.",
        task: "Tareas con tipos, estados y fechas límite",
        timer: "Timer libre o ligado a una tarea, con historial diario",
        finance: "Clientes, ingresos, gastos y transferencias",
      },
      config: {
        title: "Configuración",
        loadError: "No pudimos cargar tu configuración.",
        themeError: "No pudimos guardar tu preferencia de tema.",
        tabs: {
          ariaLabel: "Secciones de configuración",
          perfil: "Perfil",
          perfilSubtitle: "Tu perfil, la apariencia del sistema y tu sesión",
          estados: "Estados de tarea",
          estadosSubtitle: "Estados de las columnas del tablero de tareas",
          tipos: "Tipos",
          tiposSubtitle: "Tipos de trabajo para clasificar tus tareas",
          apps: "Aplicaciones",
          appsSubtitle: "Los módulos de la aplicación",
          monedas: "Monedas",
          monedasSubtitle: "Las monedas disponibles para tus cuentas",
        },
        profile: {
          title: "Información personal",
          subtitle: "Estos datos vienen de tu cuenta",
          name: "Nombre completo",
          email: "Email",
        },
        appearance: {
          title: "Apariencia",
          subtitle: "Elegí cómo querés ver la interfaz",
        },
        theme: {
          light: "Claro",
          dark: "Oscuro",
          system: "Sistema",
        },
        session: {
          title: "Sesión",
          subtitle: "Sesión activa en este dispositivo",
          logout: "Cerrar sesión",
        },
        types: {
          search: "Buscar tipos…",
          namePlaceholder: "Nombre del tipo",
          add: "Agregar tipo",
          save: "Guardar",
          rename: "Renombrar tipo",
          renamePrompt: "Nuevo nombre del tipo",
          delete: "Eliminar",
          info:
            "Los tipos agrupan tus tareas por área de trabajo y se muestran como etiquetas.",
        },
        states: {
          add: "Agregar estado",
          save: "Guardar",
          namePlaceholder: "Nombre del estado",
          rename: "Renombrar estado",
          renamePrompt: "Nuevo nombre del estado",
          delete: "Eliminar",
          info:
            "Los estados nuevos aparecen automáticamente como columnas en el tablero de tareas.",
        },
        apps: {
          info:
            "Las aplicaciones son los módulos del producto y no se editan desde tu cuenta.",
        },
        monedas: {
          decimals: "decimales",
          info:
            "Las monedas son globales y se usan para calcular el saldo de tus cuentas.",
        },
        modules: {
          tasks: "Tareas",
          incomes: "Ingresos",
          expenses: "Gastos",
          schedules: "Schedule",
        },
      },
      scaffold: {
        placeholder: "En construcción",
      },
      common: {
        loading: "Cargando…",
      },
    },
  },
}));
