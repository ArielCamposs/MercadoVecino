export const translateError = (message: string | undefined): string => {
    if (!message) return 'Ha ocurrido un error inesperado. Inténtalo de nuevo.';

    const lowerMessage = message.toLowerCase();

    // Supabase Auth Errors
    if (lowerMessage.includes('invalid login credentials')) {
        return 'El correo o la contraseña son incorrectos. Por favor, verifica tus datos.';
    }
    if (lowerMessage.includes('email not confirmed')) {
        return 'Tu correo electrónico aún no ha sido verificado. Revisa tu bandeja de entrada.';
    }
    if (lowerMessage.includes('user already registered')) {
        return 'Ya existe una cuenta con este correo electrónico.';
    }
    if (lowerMessage.includes('password should be at least')) {
        return 'La contraseña debe tener al menos 6 caracteres.';
    }
    if (lowerMessage.includes('invalid email structure')) {
        return 'El formato del correo electrónico no es válido.';
    }
    if (lowerMessage.includes('network request failed')) {
        return 'Hubo un problema de conexión. Verifica tu internet e inténtalo de nuevo.';
    }
    if (lowerMessage.includes('user not found')) {
        return 'No encontramos una cuenta asociada a este correo.';
    }
    if (lowerMessage.includes('too many requests')) {
        return 'Has intentado demasiadas veces. Por favor, espera un momento antes de reintentar.';
    }
    if (lowerMessage.includes('rate limit exceeded')) {
        return 'Límite de intentos excedido. Por favor, intenta más tarde.';
    }
    if (lowerMessage.includes('refresh_token_not_found') || lowerMessage.includes('session_not_found')) {
        return 'Tu sesión ha expirado. Por favor, inicia sesión de nuevo.';
    }
    if (lowerMessage.includes('jwt expired')) {
        return 'Tu sesión ha caducado. Por favor, vuelve a entrar.';
    }

    // Database Errors
    if (lowerMessage.includes('duplicate key value violates unique constraint')) {
        return 'Este registro ya existe en nuestra base de datos.';
    }
    if (lowerMessage.includes('violates foreign key constraint')) {
        return 'No se pudo completar la acción porque falta información requerida.';
    }

    // Default: return translated generic error if possible, or the original if it looks like Spanish (heuristic: contains accented characters or common Spanish words)
    const spanishWords = ['error', 'no', 'el', 'la', 'un', 'una', 'es', 'está', 'falla', 'problema', 'pudimos', 'intentar'];
    const seemsSpanish = spanishWords.some(word => lowerMessage.includes(word)) || /[áéíóúñ]/i.test(message);

    if (seemsSpanish) return message;

    return `Error: ${message}`;
};
