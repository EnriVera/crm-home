# CRM-HOME
crm-home es una aplicacion web para tener un crm personal, dentro se va atener multiples funcionalidad que algunas de ellas estan relacionadas y otras funcionalidad no estan relacionadas. El objetivo es tener un apartado de tareas estilo TRELLO, otra de las herramientas es de un traqueo del tiempo tanto personal como de tareas, esas tareas salen de la herramienta de tareas estilo trello, otra de las herramientas de control de finansas perosnales  es de un gestor de ingresos, gastos, trasferencias. Mas adelante se incluiran mas herramientas, por eso se busca que la aplicacion sea escalable.

# Detalles de las funcionalidades
Arbol de las secciones que se van a mostrar en un lateral izquierdo
|-Dashboard
|-Tareas
|-Schedule
|-Client
|-Finance
|  |-Income
|  |-Expenses
|  |_Trasfers
|-Config

## Config
Dentro de la url /config, va a tener los siguiente:
  1.  Se va a tener unos tabs que cada tab se vaya a llamar (usuario, tipos, categoría, cuentas, apps, monedas, adjuntos), cada uno va a tener los siguiente:
    - ususario, Dentro se va a mostrar toda la información del usuario. Tambien desde ahi se puede cerrar seccion.
    - tipos, Va a tener un botón nuevo, esos despliega un lateral derecho para completar toda la información. Y también va a tener la parte de vistas, que se va a mostrar en tipo grilla y lista.
    - categoria, Va a tener un botón nuevo, esos despliega un lateral derecho para completar toda la información. Y también va a tener la parte de vistas, que se va a mostrar en tipo grilla y lista.
    - cuentas, Va a tener un botón nuevo, esos despliega un lateral derecho para completar toda la información. Y también va a tener la parte de vistas, que se va a mostrar en tipo grilla y lista.
    - apps, Va a tener un botón nuevo, esos despliega un lateral derecho para completar toda la información. Y también va a tener la parte de vistas, que se va a mostrar en tipo grilla y lista.
    - monedas, Va a tener un botón nuevo, esos despliega un lateral derecho para completar toda la información. Y también va a tener la parte de vistas, que se va a mostrar en tipo grilla y lista.
    - adjuntos, va a tener la parte de vistas, que se va a mostrar en tipo grilla y lista.

## Tarea
En la url de /tasks, va a tener lo siguiente:
  1- Un boton de nueva tareas, esto a abrir un lateral derecho que se tiene que completar con:
    - Titulo.
    - Descripcion. Usar el paquete de lexical
    - Cliente (opcional), si se selcciona un cliente..los tipos y las categorias tienen que ser del cliente segun la tabla type_categories_client y el campo tccl_clie_id.
    - Tipo de tarea (obligatorio), puede ser un tipo cualquiera o del cliente que selecciono.
    - Categoria (opcional), la categoria deve ser segun el tipo que selecciono. No puede seleccionar una categoria si no selecciono un tipo de tarea. Tambien la categoria puede ser libre o segun el cliente.
    - Adjunto(opcional), puede agregar 1 o mas de 1 adjunto en el campo task_atta_id
    - Cuando se guarda la tarea, se guarda con el task_tast_id = pendiente
  2- Al lado del boton nueva tarea tiene que tener un ruedita de configuracion que eso va a rederigir a /tarea-config
  3- Abajo del boton de nueva tarea, que haya una seccion donde se pueda ver las tareas creadas con deferentes vistas (grilla, kanban, lista), la grilla va a tener el siguiente orden:
    - Boton para abrir la tarea y poder editarla
    - Icono, seria el icono de tipo de tarea
    - Titulo, titulo de la tarea
    - Descripcion, descripcion brebe de la tarea
    - Categoria, categoria seleccionada en la tera
    - Cliente, cliente seleccionado en la tarea
    - Estado, estado en la que esta la tarea
  en el caso de la vista kanban se va amostras por estados y segun el orden que se definio en la tabla task_state y la columna tast_order. En el caso de la vista lista, va aser lo siguiente:
    - En la izquierda va a tener el icono del tipo de tarea
    - En el header, puede tener el nombre del cliente, el estado, etc..
    - En el centro, tiene el titulo
    - En el fotter, tiene la descripcion de la tarea
En la url de /tasks-config, va a tener lo siguiente:
  1- Va a tener unos taps, por el momento solo va tener 1 solo que se llamar "Estados". Y al entrar a este tap, va a tener los siguiente:
    - Va a tener un boton nuevo, que eso levante un lateral derecho para podre completar los datos del estado
    - Tambien va atener las vista grilla y lista para mostrar la info de los estados.
## Client
En la url de /clients, va tener un CURD, poder crear, modificar, eliminar. Tambien ver los cllientes con las vista de grilla y lista

## Finance
Todo los modulos de finance tambien va a ser un CRUD, poder crear, modificar, eliminar. Tambien ver los cllientes con las vista de grilla y lista. La url de las siguiente funciones va a ser:
Income = /incomes
Expenses = /expenses
Trasfers = /trasfers

## Schedule
En la url de /schedules, va tener los siguiente:
  - En la parte top va a ser un compoenente que a la izquierda va a tener un input de tipo text, a la redrecha un selector de tipo y luego un selector de categoria y al final un boton de play, para iniciar el tiempo de va allevar esa tarea. En el input va a ser libre pero tambien al momento de escribir va a ir a buscar las tareas que hay disponibles en la seccion de tasks y se mostraran en un tipo poup debajo del input y cuando se selcciona 1 tareas, eso va a ser que ese schedules va a estar relacionado con la tarea. En el caso de escribir algo que no esta realacionado a una tarea, no tiene que crear un tareas, va a ser un schedules si relacion a 1 tarea.
  - Abajo de ese componente va a ver una seccion que se mostraran los schedules que se corrienron y tendran un boton para por iniciar el schedule, en el caso de seleccionar ese schedules se tiene que completar el componente de ariba. Si se esatba corriendo un schedules y se selecciono otro de la lista, el que se estaba ejecutando tiene que terminar e iniciar el que se selecciono. Tiene que tener un buscador
  - Tambien deve haber un componente que mustre en un grafico de trota, que se mostrara el tiempo de cada schedule
  - El ultimo es una informacion completa de cada dia que schedules se ejecutaron, mostrar tambien a que tarea, tipo, categoria. hora de inicio, hora de finalizacion, tipo de ejecucion. Tiene que tener un buscador como tambien un filtro de tipo, categoria y tarea.

## Login
En la parate del login en el url /login, solo se tiene que pedir el email, luego de ello se tiene que enviar un codigo OTP al email y rederigir a /login-verification. Cuando la persona copia el codigo, lo pega en el campo de OTP de /login-verification, tiene que usar el paguete input-otp. Una vez validado lo redirigue a /dashboard

## Datos a tener en cuenta
  - Todos los compoenente tiene que se modulares y reutilizables.
  - Para el manejar los adjuntos, se tiene que subir en los "Server Assets" de (https://nitro.build/docs/assets) se va a guardar el afdjunto con un id, con ese id se guarda en la tabla attachments como tambien la info del adjunto.
  - Cuando se crea un registro se coloca una fecha en los campos que tenga "created_at"
  - Cuando se modifica un registro, se le coloca una fecha en los campos que tenga el "updated_at".
  - Cuando se tiene que eliminar un registro, siempre tiene que ser logico, se tiene que agregar una fecha en el campo que tenga "deleted_at".
  - Permitir el manejo de cache, con la herramienta de nitro.
  - Utilizar buenas practicas de codificacion, de modelado de base da datos.
  - Toda la aplicacion va a funcionar con websocket (https://nitro.build/docs/websocket).
  - En los modulos que pidan descripcion se tiene que usar el paquete de lexical.
  - En los modulos que piudan color, se tiene que usar el paquete de colorful.
  - Para el manejo de los iconos, se va a usar el phosphor-icons.
  - Para funciones de typescrypt, se pueden usar el paquete usehooks-ts.
  - Para el manejo de errores en el frontend, usaremos react-error-boundary.
  - Para el manejo de fechas, usaremos el paquete de day-picker.
  - Para las animacion usaremos el paquete spring.
  - Para el uso de toast, usaremos el paquete de sonner.
  - En el caso del envio de correo, se tiene que generar un registro en la BD que se quiere enviar un regiustro y luego una task, lee la bd y si ve que hay email que se tiene que enviar, el se que se envarga en enviar el email, se va ausar esta funcionc (https://nitro.build/docs/tasks).
  - Para el drag de las card en el kanban, usaremos el dnd-kit. Tambien se pueden usar otras herramientas del mismo paquetes, para otras cosas que se necesitan.
  - Los laterales izquiedos que vana a contener los modulos como tambien el lateral derecho que se van a usar para la creacion/edicion de los modulos. Tiene que permitir el resizable, con ello usaremos el paquete resizable-panels.
  - Para el manejo de las rutas, cuando se consulta/crea un registro o levantar una modal, siempre cualquier accion se tiene que usar nuqs.
  - Hay que tener un componente llamada "BeseView" donde adentro va tener una vista grilla, lista, canban. Tambien va tener un boton para cambiear de vista + a un filtro de buscador. Ejemplo de como tiene que funcionar el componenete "BeseView". Canda "BeseView" se tiene que generar un un id para que en el caso que haya varios "BeseView" en un mismo lugar no se colisionen con la informacion:

    << HTML >>
    <BeseView 
      :filters = "fiters" // esto va a contener un objento que contendra la los filtros que va a contener (por el momento va a tener el filtro de busqueda), el filtro se tiene que guardar en el local storage que el nombre del localstorage va a ser el id de "BeseView". Ejemplo del obj = {"search": "xxxxxx"}
      :records  = "registros" // se la pasa la info que se tiene que mostrar
      :grid_structure = "grid_structure" // se le va a pasar la structura de como se tiene que visualizar
      :list_structure = "list_structure" // se le va a pasar la structura de como se tiene que visualizar
      :kanban_structure = "kanban_structure" // se le va a pasar la structura de como se tiene que visualizar las card
      :view = "['list', 'grid']" (Nota: en este caso solo mustra la vista lista y grilla, no va a mostra la vista "kanban") // or // "['list']" (Nota: en este caso solo mustra la vista lista, no va a mostra la vista "grilla" y "kanban") // or // Si no se colocar la prop de ":view" significa que van todas las vistas ("lista", "grilla", "kanban")
    />


# Herramientas / Framework / Bibleotecas / arquitectura a usar:

## Arquitectura
Tanto el frontend como el backend se tienen que manejar como un monolito - monorepo.
frontend - usar atomic desing
backend - clean arquitectur

## Backend
nitro: https://nitro.build/
h3: https://v1.h3.dev/
turborepo: https://turborepo.dev/
shiki: https://shiki.style/
orpc: https://orpc.dev/
kysely: https://kysely.dev/
bun: https://bun.com/
BD: PostgreSQL
vite: https://vite.dev/
effect: https://www.effect.website/

## Frontend
octanejs: https://octanejs.dev/llms.txt
tsrx: https://octanejs.dev/docs/tsrx-vs-tsx
vite: https://octanejs.dev/docs/build-tools#vite
bun: https://bun.com/
tailwindcss: https://tailwindcss.com/
zagjs: https://github.com/octanejs/octane/tree/main/packages/zag - https://zagjs.com/llms-react.txt

### tanstack
tanstack-store: https://github.com/octanejs/octane/tree/main/packages/tanstack-store
tanstack-db: https://github.com/octanejs/octane/tree/main/packages/tanstack-db
tanstack-router: https://github.com/octanejs/octane/tree/main/packages/tanstack-router
tanstack-query: https://github.com/octanejs/octane/tree/main/packages/tanstack-query
tanstack-router-ssr-query: https://github.com/octanejs/octane/tree/main/packages/tanstack-router-ssr-query
tanstack-form: https://github.com/octanejs/octane/tree/main/packages/tanstack-form
tanstack-virtual: https://github.com/octanejs/octane/tree/main/packages/tanstack-virtual
tanstack-table: https://github.com/octanejs/octane/tree/main/packages/tanstack-table
charts: https://tanstack.com/charts/latest

### Manejo de idiomas
i18next: https://github.com/octanejs/octane/tree/main/packages/i18next

### Otras
nuqs: https://github.com/octanejs/octane/tree/main/packages/nuqs
input-otp: https://github.com/octanejs/octane/tree/main/packages/input-otp
lexical: https://github.com/octanejs/octane/tree/main/packages/lexical
colorful: https://github.com/octanejs/octane/tree/main/packages/colorful
phosphor-icons: https://github.com/octanejs/octane/tree/main/packages/phosphor-icons
usehooks-ts: https://github.com/octanejs/octane/tree/main/packages/usehooks-ts
react-error-boundary: https://github.com/octanejs/octane/tree/main/packages/react-error-boundary
resizable-panels: https://github.com/octanejs/octane/tree/main/packages/resizable-panels
day-picker: https://github.com/octanejs/octane/tree/main/packages/day-picker
spring: https://github.com/octanejs/octane/tree/main/packages/spring
dnd-kit: https://github.com/octanejs/octane/tree/main/packages/dnd-kit
sonner: https://github.com/octanejs/octane/tree/main/packages/sonner
uso del Makefile


# Estuctura de BD
NOTA: Los UUID se tiene que suar el UUID7.
```sql
CREATE TABLE "types" (
    "type_id" uuid NOT NULL,
    "type_title" varchar NOT NULL,
    "type_description" varchar,
    "type_color" varchar,
    "type_icono" varchar,
    "type_apps_id" uuid NOT NULL,
    "type_created_at" timestamptz NOT NULL,
    "type_updated_at" timestamptz NOT NULL,
    "type_deleted_at" timestamptz,
    PRIMARY KEY ("type_id")
);

CREATE TABLE "emial_sending" (
    "emse_id" uuid NOT NULL,
    "emse_from" varchar NOT NULL,
    "emse_to" varchar NOT NULL,
    "emse_title" text NOT NULL,
    "emse_description" text NOT NULL,
    "emse_user_id" uuid,
    "emse_logi_id" uuid,
    "emse_task_id" uuid,
    "emse_created_at" timestamptz NOT NULL,
    "emse_updated_at" timestamptz NOT NULL,
    "emse_sino_sending" bigint,
    PRIMARY KEY ("emse_id")
);

CREATE TABLE "type_categories_client" (
    "tccl_id" uuid NOT NULL,
    "tccl_type_id" uuid NOT NULL,
    "tccl_cate_id" uuid NOT NULL,
    "tccl_clie_id" uuid,
    "tccl_created_at" timestamptz NOT NULL,
    "tccl_updated_at" timestamptz NOT NULL,
    "tccl_deleted_at" timestamptz,
    PRIMARY KEY ("tccl_id")
);

CREATE TABLE "categories" (
    "cate_id" uuid NOT NULL,
    "cate_title" varchar NOT NULL,
    "cate_description" varchar,
    "cate_icono" varchar,
    "cate_color" varchar,
    "cate_apps_id" uuid NOT NULL,
    "cate_created_at" timestamptz NOT NULL,
    "cate_updated_at" timestamptz NOT NULL,
    "cate_deleted_at" timestamptz,
    PRIMARY KEY ("cate_id")
);

CREATE TABLE "user" (
    "user_id" uuid NOT NULL,
    "user_name" varchar NOT NULL,
    "user_email" varchar NOT NULL,
    "user_sino_emailverificado" int NOT NULL,
    "user_created_at" timestamptz NOT NULL,
    "user_updated_at" timestamptz NOT NULL,
    PRIMARY KEY ("user_id")
);

CREATE TABLE "login" (
    "logi_id" uuid NOT NULL,
    "logi_emial" varchar NOT NULL,
    "logi_code" numeric,
    "logi_created_at" timestamptz NOT NULL,
    "logi_updated_at" timestamptz NOT NULL,
    PRIMARY KEY ("logi_id")
);

CREATE TABLE "client" (
    "clie_id" uuid NOT NULL,
    "clie_name" varchar NOT NULL,
    "clie_email" varchar,
    "clie_areaphone" numeric,
    "clie_phone" numeric,
    "clie_atta_id" uuid,
    "clie_acco_id" uuid,
    "clie_created_at" timestamptz NOT NULL,
    "clie_updated_at" timestamptz NOT NULL,
    "clie_deleted_at" timestamptz,
    PRIMARY KEY ("clie_id")
);

CREATE TABLE "logs" (
    "logs_id" uuid NOT NULL,
    "logs_user_id" uuid NOT NULL,
    "logs_task_id" uuid,
    "logs_taty_id" uuid,
    "logs_taca_id" uuid,
    "logs_clie_id" uuid,
    "logs_type_id" uuid,
    "logs_cate_id" uuid,
    "logs_acco_id" uuid,
    "logs_sche_id" uuid,
    "logs_inco_id" uuid,
    "logs_expe_id" uuid,
    "logs_tran_id" uuid,
    "logs_title" varchar NOT NULL,
    "logs_description" text NOT NULL,
    "logs_created_at" timestamptz NOT NULL,
    "logs_updated_at" timestamptz NOT NULL,
    PRIMARY KEY ("logs_id")
);

CREATE TABLE "task" (
    "task_id" uuid NOT NULL,
    "task_user_id" uuid NOT NULL,
    "task_title" varchar NOT NULL,
    "task_description" varchar,
    "task_clie_id" uuid,
    "task_type_id" uuid NOT NULL,
    "task_cate_id" uuid,
    "task_tast_id" uuid,
    "task_atta_id" uuid[],
    "task_created_at" timestamptz NOT NULL,
    "task_updated_at" timestamptz NOT NULL,
    "task_deleted_at" timestamptz,
    PRIMARY KEY ("task_id")
);

CREATE TABLE "task_state" (
    "tast_id" uuid NOT NULL,
    "tast_title" varchar,
    "tast_color" varchar,
    "tast_icono" varchar NOT NULL,
    "tast_order" int NOT NULL,
    "tast_created_at" timestamptz NOT NULL,
    "tast_updated_at" timestamptz NOT NULL,
    "tast_deleted_at" timestamptz,
    PRIMARY KEY ("tast_id")
);

CREATE TABLE "sino" (
    "sino_id" int NOT NULL,
    "sino_validate" int,
    PRIMARY KEY ("sino_id")
);

CREATE TABLE "schedule" (
    "sche_id" uuid NOT NULL,
    "sche_user_id" uuid,
    "sche_title" varchar,
    "sche_clie_id" uuid NOT NULL,
    "sche_task_id" uuid NOT NULL,
    "sche_type_id" uuid NOT NULL,
    "sche_cate_id" uuid NOT NULL,
    "sche_created_at" timestamptz NOT NULL,
    "sche_updated_at" timestamptz NOT NULL,
    "sche_deleted_at" timestamptz,
    PRIMARY KEY ("sche_id")
);

CREATE TABLE "schedule_items" (
    "scit_id" uuid NOT NULL,
    "scit_sche_id" uuid NOT NULL,
    "scit_date" date NOT NULL,
    "scit_schedulefrom" time NOT NULL,
    "scit_scheduleto" time,
    "scit_cantschedule" time,
    "scit_created_at" timestamptz NOT NULL,
    "scit_updated_at" timestamptz NOT NULL,
    "scit_deleted_at" timestamptz,
    PRIMARY KEY ("scit_id")
);

CREATE TABLE "income" (
    "inco_id" uuid NOT NULL,
    "inco_title" varchar NOT NULL,
    "inco_descriptions" varchar,
    "inco_acco_id" uuid NOT NULL,
    "inco_clie_id" uuid,
    "inco_type_id" uuid NOT NULL,
    "inco_cate_id" uuid,
    "inco_curr_id" uuid NOT NULL,
    "inco_amount" numeric NOT NULL,
    "inco_atta_id" uuid[],
    "inco_created_at" timestamptz NOT NULL,
    "inco_updated_at" timestamptz NOT NULL,
    "inco_deleted_at" timestamptz,
    PRIMARY KEY ("inco_id")
);

CREATE TABLE "apps" (
    "apps_id" uuid NOT NULL,
    "apps_name" varchar NOT NULL,
    "apps_description" varchar,
    "apps_url" varchar,
    "apps_sino_active" int NOT NULL,
    "apps_created_at" timestamptz NOT NULL,
    "apps_updated_at" timestamptz NOT NULL,
    "apps_deleted_at" timestamptz,
    PRIMARY KEY ("apps_id")
);

CREATE TABLE "currency" (
    "curr_id" uuid NOT NULL,
    "curr_title" varchar NOT NULL,
    "curr_code" varchar NOT NULL,
    "curr_symbol" varchar NOT NULL,
    "curr_decimal" double precision NOT NULL,
    "curr_created_at" timestamptz NOT NULL,
    "curr_updated_at" timestamptz NOT NULL,
    "curr_deleted_at" timestamptz,
    PRIMARY KEY ("curr_id")
);

CREATE TABLE "expenses" (
    "expe_id" uuid NOT NULL,
    "expe_title" varchar NOT NULL,
    "expe_descriptions" varchar,
    "expe_acco_id" uuid NOT NULL,
    "expe_clie_id" uuid,
    "expe_type_id" uuid NOT NULL,
    "expe_cate_id" uuid,
    "expe_curr_id" uuid NOT NULL,
    "expe_amount" numeric NOT NULL,
    "expe_atta_id" uuid[],
    "expe_created_at" timestamptz NOT NULL,
    "expe_updated_at" timestamptz NOT NULL,
    "expe_deleted_at" timestamptz,
    PRIMARY KEY ("expe_id")
);

CREATE TABLE "accounts" (
    "acco_id" uuid NOT NULL,
    "acco_title" varchar NOT NULL,
    "acco_icon" varchar NOT NULL,
    "acco_color" varchar NOT NULL,
    "acco_curr_id" uuid NOT NULL,
    "acco_amount" numeric NOT NULL,
    "acco_created_at" timestamptz NOT NULL,
    "acco_updated_at" timestamptz NOT NULL,
    "acco_deleted_at" timestamptz,
    PRIMARY KEY ("acco_id")
);

CREATE TABLE "attachments" (
    "atta_id" uuid NOT NULL,
    "atta_s3id" text NOT NULL,
    "atta_title" varchar NOT NULL,
    "atta_format" varchar NOT NULL,
    "atta_created_at" timestamptz NOT NULL,
    "atta_updated_at" timestamptz NOT NULL,
    "atta_deleted_at" timestamptz,
    PRIMARY KEY ("atta_id")
);

CREATE TABLE "transfers" (
    "tran_id" uuid NOT NULL,
    "tran_acco_from" uuid NOT NULL,
    "tran_sino_other" int NOT NULL,
    "tran_acco_to" uuid,
    "tran_other" varchar,
    "tran_curr_id" uuid NOT NULL,
    "tran_amount" numeric NOT NULL,
    "tran_atta_id" uuid[],
    "tran_created_at" timestamptz NOT NULL,
    "tran_updated_at" timestamptz NOT NULL,
    "tran_deleted_at" timestamptz,
    PRIMARY KEY ("tran_id")
);

-- Foreign key constraints
ALTER TABLE "categories" ADD CONSTRAINT "fk_categories_cate_id_logs_logs_taca_id" FOREIGN KEY("cate_id") REFERENCES "logs"("logs_taca_id");
ALTER TABLE "categories" ADD CONSTRAINT "fk_categories_cate_id_task_task_cate_id" FOREIGN KEY("cate_id") REFERENCES "task"("task_cate_id");
ALTER TABLE "categories" ADD CONSTRAINT "fk_categories_cate_id_type_categories_client_tccl_cate_id" FOREIGN KEY("cate_id") REFERENCES "type_categories_client"("tccl_cate_id");
ALTER TABLE "client" ADD CONSTRAINT "fk_client_clie_id_logs_logs_clie_id" FOREIGN KEY("clie_id") REFERENCES "logs"("logs_clie_id");
ALTER TABLE "client" ADD CONSTRAINT "fk_client_clie_id_task_task_clie_id" FOREIGN KEY("clie_id") REFERENCES "task"("task_clie_id");
ALTER TABLE "login" ADD CONSTRAINT "fk_login_logi_id_emial_sending_emse_logi_id" FOREIGN KEY("logi_id") REFERENCES "emial_sending"("emse_logi_id");
ALTER TABLE "task" ADD CONSTRAINT "fk_task_task_id_emial_sending_emse_task_id" FOREIGN KEY("task_id") REFERENCES "emial_sending"("emse_task_id");
ALTER TABLE "task" ADD CONSTRAINT "fk_task_task_id_logs_logs_task_id" FOREIGN KEY("task_id") REFERENCES "logs"("logs_task_id");
ALTER TABLE "task" ADD CONSTRAINT "fk_task_task_user_id_user_user_id" FOREIGN KEY("task_user_id") REFERENCES "user"("user_id");
ALTER TABLE "type_categories_client" ADD CONSTRAINT "fk_type_categories_client_tccl_clie_id_client_clie_id" FOREIGN KEY("tccl_clie_id") REFERENCES "client"("clie_id");
ALTER TABLE "types" ADD CONSTRAINT "fk_types_type_id_logs_logs_taty_id" FOREIGN KEY("type_id") REFERENCES "logs"("logs_taty_id");
ALTER TABLE "types" ADD CONSTRAINT "fk_types_type_id_task_task_type_id" FOREIGN KEY("type_id") REFERENCES "task"("task_type_id");
ALTER TABLE "types" ADD CONSTRAINT "fk_types_type_id_type_categories_client_tccl_type_id" FOREIGN KEY("type_id") REFERENCES "type_categories_client"("tccl_type_id");
ALTER TABLE "user" ADD CONSTRAINT "fk_user_user_id_emial_sending_emse_user_id" FOREIGN KEY("user_id") REFERENCES "emial_sending"("emse_user_id");
ALTER TABLE "user" ADD CONSTRAINT "fk_user_user_id_logs_logs_user_id" FOREIGN KEY("user_id") REFERENCES "logs"("logs_user_id");
ALTER TABLE "task_state" ADD CONSTRAINT "fk_task_state_tast_id_task_task_tast_id" FOREIGN KEY("tast_id") REFERENCES "task"("task_tast_id");
ALTER TABLE "sino" ADD CONSTRAINT "fk_sino_sino_id_user_user_sino_emailverificado" FOREIGN KEY("sino_id") REFERENCES "user"("user_sino_emailverificado");
ALTER TABLE "schedule" ADD CONSTRAINT "fk_schedule_sche_clie_id_client_clie_id" FOREIGN KEY("sche_clie_id") REFERENCES "client"("clie_id");
ALTER TABLE "schedule" ADD CONSTRAINT "fk_schedule_sche_task_id_task_task_id" FOREIGN KEY("sche_task_id") REFERENCES "task"("task_id");
ALTER TABLE "schedule" ADD CONSTRAINT "fk_schedule_sche_type_id_types_type_id" FOREIGN KEY("sche_type_id") REFERENCES "types"("type_id");
ALTER TABLE "schedule" ADD CONSTRAINT "fk_schedule_sche_cate_id_categories_cate_id" FOREIGN KEY("sche_cate_id") REFERENCES "categories"("cate_id");
ALTER TABLE "schedule_items" ADD CONSTRAINT "fk_schedule_items_scit_sche_id_schedule_sche_id" FOREIGN KEY("scit_sche_id") REFERENCES "schedule"("sche_id");
ALTER TABLE "schedule" ADD CONSTRAINT "fk_schedule_sche_user_id_user_user_id" FOREIGN KEY("sche_user_id") REFERENCES "user"("user_id");
ALTER TABLE "apps" ADD CONSTRAINT "fk_apps_apps_id_categories_cate_apps_id" FOREIGN KEY("apps_id") REFERENCES "categories"("cate_apps_id");
ALTER TABLE "apps" ADD CONSTRAINT "fk_apps_apps_id_types_type_apps_id" FOREIGN KEY("apps_id") REFERENCES "types"("type_apps_id");
ALTER TABLE "client" ADD CONSTRAINT "fk_client_clie_id_income_inco_clie_id" FOREIGN KEY("clie_id") REFERENCES "income"("inco_clie_id");
ALTER TABLE "types" ADD CONSTRAINT "fk_types_type_id_income_inco_type_id" FOREIGN KEY("type_id") REFERENCES "income"("inco_type_id");
ALTER TABLE "categories" ADD CONSTRAINT "fk_categories_cate_id_income_inco_cate_id" FOREIGN KEY("cate_id") REFERENCES "income"("inco_cate_id");
ALTER TABLE "currency" ADD CONSTRAINT "fk_currency_curr_id_income_inco_curr_id" FOREIGN KEY("curr_id") REFERENCES "income"("inco_curr_id");
ALTER TABLE "client" ADD CONSTRAINT "fk_client_clie_id_expenses_expe_clie_id" FOREIGN KEY("clie_id") REFERENCES "expenses"("expe_clie_id");
ALTER TABLE "types" ADD CONSTRAINT "fk_types_type_id_expenses_expe_type_id" FOREIGN KEY("type_id") REFERENCES "expenses"("expe_type_id");
ALTER TABLE "categories" ADD CONSTRAINT "fk_categories_cate_id_expenses_expe_cate_id" FOREIGN KEY("cate_id") REFERENCES "expenses"("expe_cate_id");
ALTER TABLE "currency" ADD CONSTRAINT "fk_currency_curr_id_expenses_expe_curr_id" FOREIGN KEY("curr_id") REFERENCES "expenses"("expe_curr_id");
ALTER TABLE "accounts" ADD CONSTRAINT "fk_accounts_acco_curr_id_currency_curr_id" FOREIGN KEY("acco_curr_id") REFERENCES "currency"("curr_id");
ALTER TABLE "accounts" ADD CONSTRAINT "fk_accounts_acco_id_client_clie_acco_id" FOREIGN KEY("acco_id") REFERENCES "client"("clie_acco_id");
ALTER TABLE "accounts" ADD CONSTRAINT "fk_accounts_acco_id_expenses_expe_acco_id" FOREIGN KEY("acco_id") REFERENCES "expenses"("expe_acco_id");
ALTER TABLE "accounts" ADD CONSTRAINT "fk_accounts_acco_id_income_inco_acco_id" FOREIGN KEY("acco_id") REFERENCES "income"("inco_acco_id");
ALTER TABLE "attachments" ADD CONSTRAINT "fk_attachments_atta_id_expenses_expe_atta_id" FOREIGN KEY("atta_id") REFERENCES "expenses"("expe_atta_id");
ALTER TABLE "attachments" ADD CONSTRAINT "fk_attachments_atta_id_income_inco_atta_id" FOREIGN KEY("atta_id") REFERENCES "income"("inco_atta_id");
ALTER TABLE "attachments" ADD CONSTRAINT "fk_attachments_atta_id_client_clie_atta_id" FOREIGN KEY("atta_id") REFERENCES "client"("clie_atta_id");
ALTER TABLE "attachments" ADD CONSTRAINT "fk_attachments_atta_id_task_task_atta_id" FOREIGN KEY("atta_id") REFERENCES "task"("task_atta_id");
ALTER TABLE "accounts" ADD CONSTRAINT "fk_accounts_acco_id_transfers_tran_acco_from" FOREIGN KEY("acco_id") REFERENCES "transfers"("tran_acco_from");
ALTER TABLE "sino" ADD CONSTRAINT "fk_sino_sino_id_transfers_tran_sino_other" FOREIGN KEY("sino_id") REFERENCES "transfers"("tran_sino_other");
ALTER TABLE "accounts" ADD CONSTRAINT "fk_accounts_acco_id_transfers_tran_acco_to" FOREIGN KEY("acco_id") REFERENCES "transfers"("tran_acco_to");
ALTER TABLE "currency" ADD CONSTRAINT "fk_currency_curr_id_transfers_tran_curr_id" FOREIGN KEY("curr_id") REFERENCES "transfers"("tran_curr_id");
ALTER TABLE "attachments" ADD CONSTRAINT "fk_attachments_atta_id_transfers_tran_atta_id" FOREIGN KEY("atta_id") REFERENCES "transfers"("tran_atta_id");
ALTER TABLE "types" ADD CONSTRAINT "fk_types_type_id_logs_logs_type_id" FOREIGN KEY("type_id") REFERENCES "logs"("logs_type_id");
ALTER TABLE "categories" ADD CONSTRAINT "fk_categories_cate_id_logs_logs_cate_id" FOREIGN KEY("cate_id") REFERENCES "logs"("logs_cate_id");
ALTER TABLE "accounts" ADD CONSTRAINT "fk_accounts_acco_id_logs_logs_acco_id" FOREIGN KEY("acco_id") REFERENCES "logs"("logs_acco_id");
ALTER TABLE "schedule" ADD CONSTRAINT "fk_schedule_sche_id_logs_logs_sche_id" FOREIGN KEY("sche_id") REFERENCES "logs"("logs_sche_id");
ALTER TABLE "income" ADD CONSTRAINT "fk_income_inco_id_logs_logs_inco_id" FOREIGN KEY("inco_id") REFERENCES "logs"("logs_inco_id");
ALTER TABLE "income" ADD CONSTRAINT "fk_income_inco_id_logs_logs_inco_id" FOREIGN KEY("inco_id") REFERENCES "logs"("logs_inco_id");
ALTER TABLE "expenses" ADD CONSTRAINT "fk_expenses_expe_id_logs_logs_expe_id" FOREIGN KEY("expe_id") REFERENCES "logs"("logs_expe_id");
ALTER TABLE "transfers" ADD CONSTRAINT "fk_transfers_tran_id_logs_logs_tran_id" FOREIGN KEY("tran_id") REFERENCES "logs"("logs_tran_id");
```

## Cosas a tener en caunta, si se crea una tabla de BD
  1.  Todas la tablas tiene que ser en ingles
  2. Los campos siempre van a tener 4 letras que hacer referencia a la tabla, por ej la tabla "categories" sus cuatro letras que lo identifica son "cate"
  3. En el caso de hacerce referencia a otra tabla, tiene que ir la 4 letras de la tabla origen segido de un "_" las 4 letras de la tabla en refrencia. Por ej. la tabla "type_categories_client" sus cuatro letras son "tccl" y como quiero hacer una referencia a "categorias" el campo va a ser "tccl_cate_id".
  4. Todos los campos va a tener los campos "created_at", "updated_at", "deleted_at".
