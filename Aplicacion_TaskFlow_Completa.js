/**
 * TASKFLOW - Aplicación de Gestión de Tareas
 * Asignatura: Desarrollo de Aplicaciones Web
 * Profesor: Víctor Alfonso Segura Palma
 */

const express = require('express');
const mongoose = require('mongoose');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware para procesar JSON y archivos estáticos
app.use(express.json());

// ==========================================
// 1. MODELO MONGOOSE (src/models/Tarea.js)
// ==========================================
const TareaSchema = new mongoose.Schema({
    titulo: {
        type: String,
        required: [true, 'El título es obligatorio'],
        minlength: [3, 'El título debe tener al menos 3 caracteres']
    },
    descripcion: {
        type: String,
        default: ''
    },
    completado: {
        type: Boolean,
        default: false
    }
}, {
    timestamps: true
});

const Tarea = mongoose.model('Tarea', TareaSchema);

// ==========================================
// 2. CONEXIÓN A BASE DE DATOS (src/config/database.js)
// ==========================================
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/taskflow_db';

mongoose.connect(MONGODB_URI)
    .then(() => console.log('✅ Conexión exitosa a la base de datos MongoDB'))
    .catch(err => console.error('❌ Error al conectar a MongoDB:', err.message));

// ==========================================
// 3. RUTAS Y CRUD API (src/routes/tareas.routes.js)
// ==========================================

// GET: Listar todas las tareas
app.get('/api/tareas', async (req, res) => {
    try {
        const tareas = await Tarea.find().sort({ createdAt: -1 });
        res.json(tareas);
    } catch (error) {
        res.status(500).json({ error: 'Error al obtener las tareas' });
    }
});

// GET: Buscar tarea por ID
app.get('/api/tareas/:id', async (req, res) => {
    try {
        const tarea = await Tarea.findById(req.params.id);
        if (!tarea) return res.status(404).json({ error: 'Tarea no encontrada' });
        res.json(tarea);
    } catch (error) {
        res.status(400).json({ error: 'ID inválido' });
    }
});

// POST: Crear nueva tarea
app.post('/api/tareas', async (req, res) => {
    try {
        const nuevaTarea = new Tarea(req.body);
        const tareaGuardada = await nuevaTarea.save();
        res.status(201).json(tareaGuardada);
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
});

// PUT: Actualizar o marcar como completada
app.put('/api/tareas/:id', async (req, res) => {
    try {
        const tareaActualizada = await Tarea.findByIdAndUpdate(
            req.params.id, 
            req.body, 
            { new: true, runValidators: true }
        );
        if (!tareaActualizada) return res.status(404).json({ error: 'Tarea no encontrada para actualizar' });
        res.json(tareaActualizada);
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
});

// DELETE: Eliminar tarea
app.delete('/api/tareas/:id', async (req, res) => {
    try {
        const tareaEliminada = await Tarea.findByIdAndDelete(req.params.id);
        if (!tareaEliminada) return res.status(404).json({ error: 'Tarea no encontrada para eliminar' });
        res.json({ mensaje: 'Tarea eliminada correctamente' });
    } catch (error) {
        res.status(400).json({ error: 'ID inválido' });
    }
});

// ==========================================
// 4. FRONTEND INTEGRADO (public/index.html)
// ==========================================
app.get('/', (req, res) => {
    res.send(`
    <!DOCTYPE html>
    <html lang="es">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>TaskFlow - Gestión de Tareas</title>
        <style>
            * { box-sizing: border-box; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; }
            body { background-color: #f4f6f9; margin: 0; padding: 20px; display: flex; justify-content: center; }
            .container { max-width: 600px; width: 100%; background: white; padding: 25px; border-radius: 10px; box-shadow: 0 4px 10px rgba(0,0,0,0.1); }
            h1 { text-align: center; color: #333; margin-bottom: 20px; }
            .form-group { display: flex; flex-direction: column; gap: 10px; margin-bottom: 20px; }
            input, textarea, button { padding: 10px; border-radius: 5px; border: 1px solid #ccc; font-size: 14px; }
            button { background-color: #007bff; color: white; border: none; cursor: pointer; font-weight: bold; }
            button:hover { background-color: #0056b3; }
            .error { color: red; font-size: 13px; display: none; }
            .task-list { list-style: none; padding: 0; }
            .task-item { background: #f8f9fa; padding: 12px; border-radius: 5px; margin-bottom: 10px; border-left: 4px solid #007bff; display: flex; justify-content: space-between; align-items: center; }
            .task-item.completed { border-left-color: #28a745; opacity: 0.7; }
            .task-item.completed span { text-decoration: line-through; }
            .actions { display: flex; gap: 8px; }
            .btn-delete { background-color: #dc3545; }
            .btn-delete:hover { background-color: #c82333; }
            .btn-check { background-color: #28a745; }
            .btn-check:hover { background-color: #218838; }
        </style>
    </head>
    <body>
        <div class="container">
            <h1>TaskFlow</h1>
            <form id="taskForm" class="form-group">
                <input type="text" id="titulo" placeholder="Título de la tarea (mínimo 3 caracteres)" required>
                <textarea id="descripcion" placeholder="Descripción opcional"></textarea>
                <span id="errorMsg" class="error"></span>
                <button type="submit">Agregar Tarea</button>
            </form>
            <hr>
            <h3>Mis Tareas</h3>
            <ul id="taskList" class="task-list"></ul>
        </div>

        <script>
            const API_URL = '/api/tareas';

            async function cargarTareas() {
                const res = await fetch(API_URL);
                const tareas = await res.json();
                const list = document.getElementById('taskList');
                list.innerHTML = '';
                
                tareas.forEach(t => {
                    const li = document.createElement('li');
                    li.className = \`task-item \${t.completado ? 'completed' : ''}\`;
                    li.innerHTML = \`
                        <div>
                            <strong>\${t.titulo}</strong>
                            <p style="margin: 3px 0 0; font-size: 13px; color: #666;">\${t.descripcion || 'Sin descripción'}</p>
                        </div>
                        <div class="actions">
                            <button class="btn-check" onclick="toggleTarea('\${t._id}', \${!t.completado})">\${t.completado ? 'Desmarcar' : 'Completar'}</button>
                            <button class="btn-delete" onclick="eliminarTarea('\${t._id}')">Eliminar</button>
                        </div>
                    \`;
                    list.appendChild(li);
                });
            }

            document.getElementById('taskForm').addEventListener('submit', async (e) => {
                e.preventDefault();
                const titulo = document.getElementById('titulo').value;
                const descripcion = document.getElementById('descripcion').value;
                const errorMsg = document.getElementById('errorMsg');

                const res = await fetch(API_URL, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ titulo, descripcion })
                });

                const data = await res.json();
                if (!res.ok) {
                    errorMsg.innerText = data.error || 'Error al guardar';
                    errorMsg.style.display = 'block';
                } else {
                    errorMsg.style.display = 'none';
                    document.getElementById('titulo').value = '';
                    document.getElementById('descripcion').value = '';
                    cargarTareas();
                }
            });

            async function toggleTarea(id, completado) {
                await fetch(\`\${API_URL}/\${id}\`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ completado })
                });
                cargarTareas();
            }

            async function eliminarTarea(id) {
                await fetch(\`\${API_URL}/\${id}\`, { method: 'DELETE' });
                cargarTareas();
            }

            cargarTareas();
        </script>
    </body>
    </html>
    `);
});

// Arrancar Servidor
app.listen(PORT, () => {
    console.log(`🚀 Servidor TaskFlow ejecutándose en http://localhost:${PORT}`);
});