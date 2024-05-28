const session = require("express-session");
const express = require("express");
const bodyParser = require("body-parser");
const mysql = require("mysql");
const path = require("path");
const dotenv = require("dotenv");

dotenv.config();

const app = express();

// Configuración de express-session
app.use(
  session({
    secret: "secreto", // Cambia 'secreto' por una cadena secreta para firmar la sesión
    resave: false,
    saveUninitialized: false,
  })
);

// Configuración de la base de datos
const db = mysql.createConnection({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
});

db.connect((err) => {
  if (err) {
    console.error("Error conectando a la base de datos:", err);
    return;
  }
  console.log("Conectado a la base de datos.");
});

// Middleware
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, "public")));
app.set("views", path.join(__dirname, "views")); // Establece la carpeta de vistas
app.set("view engine", "ejs"); // Establece el motor de plantillas como EJS

// Rutas para servir las páginas HTML
// Establecer la carpeta views como el directorio para las vistas
app.use(express.static(path.join(__dirname, "views")));

// Rutas para servir las páginas HTML

app.get("/login", (req, res) => {
  res.sendFile(path.join(__dirname, "views", "login.html"));
});

app.get("/registro", (req, res) => {
  res.sendFile(path.join(__dirname, "views", "registro.html"));
});

app.get("/registroacademico", (req, res) => {
  res.sendFile(path.join(__dirname, "views", "registroacademico.html"));
});

app.get("/registrocurso", (req, res) => {
  res.sendFile(path.join(__dirname, "views", "administracioncursos.html"));
});

app.get("/inicioadmin", (req, res) => {
  res.sendFile(path.join(__dirname, "views", "inicioadmin.html"));
});

app.get("/inicioteacher", (req, res) => {
  res.sendFile(path.join(__dirname, "views", "inicioprofesor.html"));
});

app.get("/iniciostudent", (req, res) => {
  res.sendFile(path.join(__dirname, "views", "home.html"));
});

///////////////////////////////////////// " Espacio para inicio de Sesion y cerrar sesion " ////////////////////////////////////////////////////////////////////////////////////////////
app.post("/login", (req, res) => {
  const { username, password } = req.body;

  // Verificar en la tabla de admins
  let sql = "SELECT * FROM admins WHERE username = ? AND password = ?";
  db.query(sql, [username, password], (err, adminResult) => {
    if (err) {
      console.error(
        "Error al verificar las credenciales en la tabla de admins:",
        err
      );
      res.status(500).send("Error al verificar las credenciales");
      return;
    }
    if (adminResult.length > 0) {
      req.session.user = { id: adminResult[0].id, role: "admin" };
      res.redirect("/inicioadmin");
      return;
    }

    // Verificar en la tabla de profesores
    sql = "SELECT * FROM profesores WHERE username = ? AND password = ?";
    db.query(sql, [username, password], (err, profesorResult) => {
      if (err) {
        console.error(
          "Error al verificar las credenciales en la tabla de profesores:",
          err
        );
        res.status(500).send("Error al verificar las credenciales");
        return;
      }
      if (profesorResult.length > 0) {
        req.session.user = {
          id: profesorResult[0].numero_documento,
          role: "profesor",
        };
        res.redirect("/inicioteacher");
        return;
      }

      // Verificar en la tabla de estudiantes
      sql = "SELECT * FROM estudiantes WHERE username = ? AND password = ?";
      db.query(sql, [username, password], (err, estudianteResult) => {
        if (err) {
          console.error(
            "Error al verificar las credenciales en la tabla de estudiantes:",
            err
          );
          res.status(500).send("Error al verificar las credenciales");
          return;
        }
        if (estudianteResult.length > 0) {
          req.session.user = {
            id: estudianteResult[0].numero_documento,
            role: "estudiante",
          };
          res.redirect("/iniciostudent");
          return;
        }

        // Ninguna tabla coincide con las credenciales proporcionadas
        res.status(401).send("Usuario o contraseña incorrectos");
      });
    });
  });
});

// Ruta para cerrar sesión
app.get("/logout", (req, res) => {
  // Destruir la sesión en el servidor
  req.session.destroy((err) => {
    if (err) {
      console.error("Error al cerrar sesión:", err);
      res.status(500).send("Error al cerrar sesión");
      return;
    }
    // Redirigir al usuario a la página de inicio de sesión
    res.redirect("/login");
  });
});

// Rutas para servir las vistas basadas en el rol del usuario
app.get("/inicioadmin", (req, res) => {
  res.sendFile(path.join(__dirname, "views", "inicioadmin.html"));
});

app.get("/inicioteacher", (req, res) => {
  res.sendFile(path.join(__dirname, "views", "inicioprofesor.html"));
});

app.get("/iniciostudent", (req, res) => {
  res.sendFile(path.join(__dirname, "views", "home.html"));
});

///////////////////////////////////////// " Espacio del perfil de Administradores " //////////////////////////////////////////////////////////////////////////////////////

// Ruta para manejar el registro académico
app.post("/registroacademico", (req, res) => {
  const {
    nombre,
    apellidos,
    tipo_documento,
    numero_documento,
    cargo,
    correo,
    telefono,
    direccion,
    programa,
  } = req.body;
  const sql =
    "INSERT INTO usuarios (nombre, apellidos, tipo_documento, numero_documento, cargo, correo, telefono, direccion, programa) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)";

  // Verificamos el cargo del usuario
  if (cargo.toLowerCase() === "estudiante") {
    // Si el cargo es estudiante, insertamos en la tabla de estudiantes
    const estudianteSql =
      "INSERT INTO estudiantes (username, password, numero_documento, nombre, apellido, programa) VALUES (?, ?, ?, ?, ?, ?)";
    db.query(
      estudianteSql,
      [correo, numero_documento, numero_documento, nombre, apellidos, programa],
      (err, result) => {
        if (err) {
          console.error("Error al registrar el estudiante:", err);
          res.status(500).send("Error al registrar el estudiante");
          return;
        }
        console.log("Estudiante registrado con éxito");
      }
    );
  } else if (cargo.toLowerCase() === "profesor") {
    // Si el cargo es profesor, insertamos en la tabla de profesores
    const profesorSql =
      "INSERT INTO profesores (username, password, numero_documento) VALUES (?, ?, ?)";
    db.query(
      profesorSql,
      [correo, numero_documento, numero_documento],
      (err, result) => {
        if (err) {
          console.error("Error al registrar el profesor:", err);
          res.status(500).send("Error al registrar el profesor");
          return;
        }
        console.log("Profesor registrado con éxito");
      }
    );
  } else if (cargo.toLowerCase() === "administrativo") {
    // Si el cargo es administrador, insertamos en la tabla de admins
    const adminSql =
      "INSERT INTO admins (username, password, numero_documento) VALUES (?, ?, ?)";
    db.query(
      adminSql,
      [correo, numero_documento, numero_documento],
      (err, result) => {
        if (err) {
          console.error("Error al registrar el administrador:", err);
          res.status(500).send("Error al registrar el administrador");
          return;
        }
        console.log("Administrador registrado con éxito");
      }
    );
  }

  // Insertamos en la tabla de usuarios independientemente del cargo
  db.query(
    sql,
    [
      nombre,
      apellidos,
      tipo_documento,
      numero_documento,
      cargo,
      correo,
      telefono,
      direccion,
      programa,
    ],
    (err, result) => {
      if (err) {
        console.error("Error al registrar el usuario:", err);
        res.status(500).send("Error al registrar el usuario");
        return;
      }
      res.redirect("/inicioadmin");
    }
  );
});

// Ruta para manejar el registro de curso
app.post("/registrocurso", (req, res) => {
  const { id_curso, nombre_curso, docente, creditos, programa, semestre } =
    req.body;
  const sql =
    "INSERT INTO cursos (id_curso, nombre_curso, docente, creditos, programa, semestre) VALUES (?, ?, ?, ?, ?, ?)";
  db.query(
    sql,
    [id_curso, nombre_curso, docente, creditos, programa, semestre],
    (err, result) => {
      if (err) {
        console.error("Error al registrar el cursoo:", err);
        res.status(500).send("Error al registrar el usuario");
        return;
      }
      console.log("Curso registrado con éxito");
      res.redirect("/inicioadmin");
    }
  );
});

app.get("/traerprofe", (req, res) => {
  const sql =
    "SELECT nombre, apellidos, numero_documento FROM usuarios WHERE cargo = 'Profesor'";
  db.query(sql, (err, results) => {
    if (err) {
      console.error("Error al obtener los profesores:", err);
      res.status(500).json({ error: "Error al obtener los profesores" });
    } else {
      console.log("Profesores obtenidos con éxito");
      res.json({ profesores: results });
    }
  });
});

// Ruta para manejar la búsqueda de cursos y usuarios por ID y tipo
app.get("/buscar", (req, res) => {
  const tipo = req.query.type;
  const id = req.query.id;

  if (tipo === "curso") {
    buscarCursoPorId(id, res);
  } else if (tipo === "estudiante" || tipo === "profesor") {
    buscarUsuarioPorNumeroDocumentoYCargo(id, tipo, res);
  } else {
    res.status(400).json({ error: "Tipo de búsqueda no válido" });
  }
});

const buscarCursoPorId = (id, res) => {
  const query = "SELECT * FROM cursos WHERE id_curso = ?";
  db.query(query, [id], (err, result) => {
    if (err) {
      console.error("Error ejecutando la consulta:", err);
      res.status(500).json({ error: "Error en el servidor" });
      return;
    }
    if (result.length > 0) {
      res.json(result[0]);
    } else {
      res.status(404).json({ error: "Curso no encontrado" });
    }
  });
};

const buscarUsuarioPorNumeroDocumentoYCargo = (numeroDocumento, cargo, res) => {
  const query =
    "SELECT * FROM usuarios WHERE numero_documento = ? AND cargo = ?";
  db.query(query, [numeroDocumento, cargo], (err, result) => {
    if (err) {
      console.error("Error ejecutando la consulta:", err);
      res.status(500).json({ error: "Error en el servidor" });
      return;
    }
    if (result.length > 0) {
      res.json(result[0]);
    } else {
      res.status(404).json({ error: "Usuario no encontrado" });
    }
  });
};

// Ruta para actualizar un curso existente
app.put("/actualizarCurso", (req, res) => {
  const idCurso = req.query.id;
  const { nombreCurso, docente, creditos, programa, semestre } = req.body;

  const sql =
    "UPDATE cursos SET nombre_curso = ?, docente = ?, creditos = ?, programa = ?, semestre = ? WHERE id_curso = ?";
  db.query(
    sql,
    [nombreCurso, docente, creditos, programa, semestre, idCurso],
    (err, result) => {
      if (err) {
        console.error("Error al actualizar el curso:", err);
        res.status(500).send("Error al actualizar el curso");
        return;
      }
      console.log("Curso actualizado correctamente");
      res.sendStatus(200);
    }
  );
});

// Ruta para eliminar un curso
app.delete("/eliminarCurso", (req, res) => {
  const idCurso = req.query.id;

  const sql = "DELETE FROM cursos WHERE id_curso = ?";
  db.query(sql, [idCurso], (err, result) => {
    if (err) {
      console.error("Error al eliminar el curso:", err);
      res.status(500).send("Error al eliminar el curso");
      return;
    }
    console.log("Curso eliminado correctamente");
    res.sendStatus(200);
  });
});

app.delete("/eliminarUsuario", (req, res) => {
  const id = req.query.id;
  const query = "DELETE FROM usuarios WHERE id = ?";
  db.query(query, [id], (err, result) => {
    if (err) {
      console.error("Error ejecutando la consulta:", err);
      res.status(500).json({ error: "Error en el servidor" });
      return;
    }
    res.json({ message: "Usuario eliminado correctamente" });
  });
});

app.put("/actualizarUsuario", (req, res) => {
  const {
    id,
    nombreUsuario,
    apellidos,
    tipoDocumento,
    numeroDocumento,
    cargo,
    correo,
    telefono,
    direccion,
    programa,
  } = req.body;
  const query =
    "UPDATE usuarios SET nombre = ?, apellidos = ?, tipo_documento = ?, numero_documento = ?, cargo = ?, correo = ?, telefono = ?, direccion = ?, programa = ? WHERE id = ?";
  db.query(
    query,
    [
      nombreUsuario,
      apellidos,
      tipoDocumento,
      numeroDocumento,
      cargo,
      correo,
      telefono,
      direccion,
      programa,
      id,
    ],
    (err, result) => {
      if (err) {
        console.error("Error ejecutando la consulta:", err);
        res.status(500).json({ error: "Error en el servidor" });
        return;
      }
      res.json({ message: "Usuario actualizado correctamente" });
    }
  );
});

///////////////////////////////////////// " Espacio del perfil de Profesores " ////////////////////////////////////////////////////////////////////////////////////////////

app.get("/miscursosprofesor", (req, res) => {
  if (req.session.user && req.session.user.role === "profesor") {
    const numeroDocumento = req.session.user.id;
    const sql = "SELECT * FROM cursos WHERE docente = ?";
    db.query(sql, [numeroDocumento], (err, results) => {
      if (err) {
        console.error("Error al obtener los cursos:", err);
        res.status(500).json({ error: "Error al obtener los cursos" });
      } else {
        res.json({ courses: results });
      }
    });
  } else {
    res.status(401).json({ error: "No autorizado" });
  }
});

// Ruta para obtener un estudiante por número de documento
app.get("/obtenerEstudiante/:numero_documento", (req, res) => {
  const numero_documento = req.params.numero_documento;
  const sql = "SELECT * FROM estudiantes WHERE numero_documento = ?";
  db.query(sql, [numero_documento], (err, results) => {
    if (err) {
      console.error("Error al obtener el estudiante:", err);
      res.status(500).json({ error: "Error al obtener el estudiante" });
    } else {
      if (results.length > 0) {
        const estudiante = results[0];
        res.json({ estudiante });
      } else {
        res.status(404).json({ error: "Estudiante no encontrado" });
      }
    }
  });
});

// Ruta para actualizar un estudiante por número de documento
app.put("/actualizarEstudiante/:numero_documento", (req, res) => {
  const numero_documento = req.params.numero_documento;
  const { nombre, apellido, username, programa, corte_1, corte_2, corte_3 } = req.body;
  const sql = "UPDATE estudiantes SET nombre=?, apellido=?, username=?, programa=?, corte_1=?, corte_2=?, corte_3=? WHERE numero_documento=?";
  db.query(sql, [nombre, apellido, username, programa, corte_1, corte_2, corte_3, numero_documento], (err, result) => {
    if (err) {
      console.error("Error al actualizar el estudiante:", err);
      res.status(500).json({ error: "Error al actualizar el estudiante" });
    } else {
      res.json({ message: "Estudiante actualizado correctamente" });
    }
  });
});

///////////////////////////////////////// " Espacio para usuario Estudiantes " ////////////////////////////////////////////////////////////////////////////////////////////


// Ruta para obtener los detalles del estudiante que ha iniciado sesión
app.get("/obtenerEstudianteSesion", (req, res) => {
  if (req.session.user && req.session.user.role === "estudiante") {
    const numero_documento = req.session.user.id;
    const sql = "SELECT * FROM estudiantes WHERE numero_documento = ?";
    db.query(sql, [numero_documento], (err, results) => {
      if (err) {
        console.error("Error al obtener el estudiante:", err);
        res.status(500).json({ error: "Error al obtener el estudiante" });
      } else {
        if (results.length > 0) {
          const estudiante = results[0];
          res.json({ estudiante });
        } else {
          res.status(404).json({ error: "Estudiante no encontrado" });
        }
      }
    });
  } else {
    res.status(401).json({ error: "No autorizado" });
  }
});



///////////////////////////////////////// " Espacio para iniciar el servidor " ////////////////////////////////////////////////////////////////////////////////////////////

// Iniciar el servidor
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Servidor iniciado en el puerto ${PORT}`);
});
