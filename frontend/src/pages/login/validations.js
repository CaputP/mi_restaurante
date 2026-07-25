const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const phoneRegex = /^[0-9]{9}$/;
const nameRegex = /^[A-ZÁÉÍÓÚÜÑ ]+$/;
const passwordRegex =/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,72}$/;

export function validateAuthForm({
    isRegister,
    nombre,
    correo,
    telefono,
    password,
    confirmPassword
}) {
    const newErrors = {
        nombre: "",
        correo: "",
        telefono: "",
        password: "",
        confirmPassword: ""
    };

    const nombreLimpio = nombre.trim();
    const correoLimpio = correo.trim().toLowerCase();
    const telefonoLimpio = telefono.trim();

    // Validaciones comunes para login y registro
    if (correoLimpio === "") {
        newErrors.correo = "El correo es obligatorio.";
    } else if (!emailRegex.test(correoLimpio)) {
        newErrors.correo = "Ingresa un correo válido.";
    }

    if (password === "") {
        newErrors.password =
            "La contraseña es obligatoria.";
    } else if (!passwordRegex.test(password)) {
        newErrors.password =
            "Debe tener entre 8 y 72 caracteres, al menos una mayúscula, una minúscula y un número.";
    }

    // Validaciones exclusivas del registro
    if (isRegister) {
        if (nombreLimpio === "") {
            newErrors.nombre = "El nombre es obligatorio.";
        } else if (nombreLimpio.length < 3) {
            newErrors.nombre =
                "El nombre debe tener al menos 3 caracteres.";
        } else if (!nameRegex.test(nombreLimpio)) {
            newErrors.nombre =
                "El nombre solo puede contener letras mayúsculas y espacios.";
        }

        if (telefonoLimpio === "") {
            newErrors.telefono = "El teléfono es obligatorio.";
        } else if (!phoneRegex.test(telefonoLimpio)) {
            newErrors.telefono =
                "El teléfono debe contener exactamente 9 dígitos.";
        }

        if (confirmPassword === "") {
            newErrors.confirmPassword =
                "Debes confirmar la contraseña.";
        } else if (password !== confirmPassword) {
            newErrors.confirmPassword =
                "Las contraseñas no coinciden.";
        }
    }

    return newErrors;
}