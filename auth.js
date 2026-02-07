// Sistema de autenticación simple pero seguro
class AuthSystem {
    constructor() {
        this.usersKey = 'horasExtrasUsers';
        this.currentUserKey = 'horasExtrasCurrentUser';
        this.sessionKey = 'horasExtrasSession';
        this.init();
    }

    init() {
        // Crear usuario admin por defecto si no existe
        if (!this.getUsers().length) {
            this.createUser('admin', 'admin123', 'Administrador');
        }
    }

    // Encriptación simple (para desarrollo, en producción usar bcrypt)
    encrypt(password) {
        return btoa(unescape(encodeURIComponent(password)));
    }

    // Crear usuario
    createUser(username, password, name) {
        const users = this.getUsers();
        
        if (users.some(u => u.username === username)) {
            return { success: false, message: 'El usuario ya existe' };
        }

        const user = {
            id: Date.now(),
            username: username.toLowerCase(),
            password: this.encrypt(password),
            name: name,
            role: username === 'admin' ? 'admin' : 'user',
            created: new Date().toISOString(),
            lastLogin: null
        };

        users.push(user);
        localStorage.setItem(this.usersKey, JSON.stringify(users));
        
        return { success: true, user: { ...user, password: undefined } };
    }

    // Login
    login(username, password) {
        const users = this.getUsers();
        const user = users.find(u => u.username === username.toLowerCase());
        
        if (!user) {
            return { success: false, message: 'Usuario no encontrado' };
        }

        if (user.password !== this.encrypt(password)) {
            return { success: false, message: 'Contraseña incorrecta' };
        }

        // Actualizar último login
        user.lastLogin = new Date().toISOString();
        localStorage.setItem(this.usersKey, JSON.stringify(users));

        // Crear sesión
        const session = {
            userId: user.id,
            token: this.generateToken(),
            expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // 24 horas
            ip: this.getClientIP()
        };

        localStorage.setItem(this.sessionKey, JSON.stringify(session));
        localStorage.setItem(this.currentUserKey, JSON.stringify({
            id: user.id,
            username: user.username,
            name: user.name,
            role: user.role
        }));

        // Registrar en logs
        this.logActivity(user.id, 'login', 'Inicio de sesión exitoso');

        return { 
            success: true, 
            user: { 
                id: user.id, 
                username: user.username, 
                name: user.name, 
                role: user.role 
            } 
        };
    }

    // Logout
    logout() {
        const currentUser = this.getCurrentUser();
        if (currentUser) {
            this.logActivity(currentUser.id, 'logout', 'Cierre de sesión');
        }
        
        localStorage.removeItem(this.sessionKey);
        localStorage.removeItem(this.currentUserKey);
        window.location.href = 'index.html';
    }

    // Verificar sesión
    isAuthenticated() {
        const session = JSON.parse(localStorage.getItem(this.sessionKey) || 'null');
        
        if (!session) return false;
        
        // Verificar expiración
        if (new Date(session.expires) < new Date()) {
            this.logout();
            return false;
        }

        // Verificar IP (seguridad básica)
        if (session.ip !== this.getClientIP()) {
            this.logout();
            return false;
        }

        return true;
    }

    // Obtener usuario actual
    getCurrentUser() {
        return JSON.parse(localStorage.getItem(this.currentUserKey) || 'null');
    }

    // Obtener todos los usuarios
    getUsers() {
        return JSON.parse(localStorage.getItem(this.usersKey) || '[]');
    }

    // Generar token simple
    generateToken() {
        return 'token_' + Date.now() + '_' + Math.random().toString(36).substr(2);
    }

    // Obtener IP del cliente
    getClientIP() {
        // En producción, esto vendría del servidor
        return 'local-' + navigator.userAgent.substring(0, 50);
    }

    // Registrar actividad
    logActivity(userId, action, details) {
        const logs = JSON.parse(localStorage.getItem('horasExtrasLogs') || '[]');
        
        logs.push({
            userId,
            action,
            details,
            timestamp: new Date().toISOString(),
            ip: this.getClientIP(),
            userAgent: navigator.userAgent
        });

        // Mantener solo los últimos 1000 logs
        if (logs.length > 1000) {
            logs.splice(0, logs.length - 1000);
        }

        localStorage.setItem('horasExtrasLogs', JSON.stringify(logs));
    }

    // Cambiar contraseña
    changePassword(username, oldPassword, newPassword) {
        const users = this.getUsers();
        const userIndex = users.findIndex(u => u.username === username);
        
        if (userIndex === -1) {
            return { success: false, message: 'Usuario no encontrado' };
        }

        if (users[userIndex].password !== this.encrypt(oldPassword)) {
            return { success: false, message: 'Contraseña actual incorrecta' };
        }

        users[userIndex].password = this.encrypt(newPassword);
        localStorage.setItem(this.usersKey, JSON.stringify(users));
        
        this.logActivity(users[userIndex].id, 'password_change', 'Cambio de contraseña');
        
        return { success: true, message: 'Contraseña cambiada exitosamente' };
    }

    // Bloquear usuario después de intentos fallidos
    checkFailedAttempts(username) {
        const attemptsKey = `login_attempts_${username}`;
        const attempts = JSON.parse(localStorage.getItem(attemptsKey) || '[]');
        
        // Limpiar intentos antiguos (más de 15 minutos)
        const recentAttempts = attempts.filter(attempt => 
            new Date() - new Date(attempt.time) < 15 * 60 * 1000
        );

        if (recentAttempts.length >= 5) {
            return { blocked: true, message: 'Demasiados intentos. Intenta más tarde.' };
        }

        return { blocked: false };
    }

    // Registrar intento fallido
    recordFailedAttempt(username) {
        const attemptsKey = `login_attempts_${username}`;
        const attempts = JSON.parse(localStorage.getItem(attemptsKey) || '[]');
        
        attempts.push({
            time: new Date().toISOString(),
            ip: this.getClientIP()
        });

        localStorage.setItem(attemptsKey, JSON.stringify(attempts));
    }

    // Limpiar intentos fallidos
    clearFailedAttempts(username) {
        localStorage.removeItem(`login_attempts_${username}`);
    }
}

// Inicializar sistema de autenticación
const auth = new AuthSystem();

// Middleware para proteger páginas
function requireAuth() {
    if (!auth.isAuthenticated()) {
        window.location.href = 'index.html';
        return false;
    }
    return true;
}

// Middleware para verificar rol
function requireRole(requiredRole) {
    const user = auth.getCurrentUser();
    if (!user || user.role !== requiredRole) {
        window.location.href = 'main.html';
        return false;
    }
    return true;
}