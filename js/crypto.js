// ===== Web Crypto API Utilities (AES-GCM 256-bit + PBKDF2) =====

var activeSessionPassword = null;

/**
 * Convierte un ArrayBuffer o Uint8Array a una cadena Base64 segura
 */
function bufferToBase64(buffer) {
    const bytes = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);
    let binary = '';
    const len = bytes.byteLength;
    const chunkSize = 0x8000; // 32KB chunks para evitar desbordamiento de pila
    for (let i = 0; i < len; i += chunkSize) {
        binary += String.fromCharCode.apply(null, bytes.subarray(i, Math.min(i + chunkSize, len)));
    }
    return btoa(binary);
}

/**
 * Convierte una cadena Base64 a Uint8Array
 */
function base64ToBuffer(base64) {
    const binary = atob(base64);
    const len = binary.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
        bytes[i] = binary.charCodeAt(i);
    }
    return bytes;
}

/**
 * Deriva una clave criptográfica AES-GCM de 256 bits a partir de una contraseña usando PBKDF2
 */
async function deriveEncryptionKey(password, saltBytes, keyUsages = ['encrypt', 'decrypt']) {
    const encoder = new TextEncoder();
    const passwordBytes = encoder.encode(password);

    // Importar el material de clave inicial de la contraseña
    const keyMaterial = await crypto.subtle.importKey(
        'raw',
        passwordBytes,
        { name: 'PBKDF2' },
        false,
        ['deriveKey']
    );

    // Derivar clave simétrica AES-GCM con 100,000 iteraciones y SHA-256
    return await crypto.subtle.deriveKey(
        {
            name: 'PBKDF2',
            salt: saltBytes,
            iterations: 100000,
            hash: 'SHA-256'
        },
        keyMaterial,
        { name: 'AES-GCM', length: 256 },
        false,
        keyUsages
    );
}

/**
 * Cifra un objeto JavaScript o cadena de texto usando AES-GCM 256 bits
 * Retorna un objeto con formato { encrypted: true, version: 1, salt, iv, ciphertext }
 */
async function encryptData(dataObj, password) {
    if (!password) {
        throw new Error('Se requiere una contraseña para cifrar los datos.');
    }

    const salt = crypto.getRandomValues(new Uint8Array(16)); // 128-bit salt
    const iv = crypto.getRandomValues(new Uint8Array(12));   // 96-bit IV recomendado para GCM

    const key = await deriveEncryptionKey(password, salt, ['encrypt']);

    const encoder = new TextEncoder();
    const jsonString = typeof dataObj === 'string' ? dataObj : JSON.stringify(dataObj);
    const plaintextBytes = encoder.encode(jsonString);

    const ciphertextBuffer = await crypto.subtle.encrypt(
        {
            name: 'AES-GCM',
            iv: iv
        },
        key,
        plaintextBytes
    );

    return {
        encrypted: true,
        version: 1,
        algorithm: 'AES-GCM-256',
        kdf: 'PBKDF2-SHA256-100K',
        salt: bufferToBase64(salt),
        iv: bufferToBase64(iv),
        ciphertext: bufferToBase64(ciphertextBuffer),
        timestamp: new Date().toISOString()
    };
}

/**
 * Descifra un paquete cifrado con AES-GCM usando la contraseña proporcionada
 * Lanza un error si la contraseña es incorrecta o si los datos han sido alterados (Auth Tag mismatch)
 */
async function decryptData(encryptedPackage, password) {
    if (!password) {
        throw new Error('Se requiere una contraseña para descifrar los datos.');
    }

    let payload = encryptedPackage;
    if (typeof payload === 'string') {
        payload = JSON.parse(payload);
    }

    if (!payload || !payload.ciphertext || !payload.salt || !payload.iv) {
        throw new Error('Formato de datos cifrados inválido.');
    }

    const salt = base64ToBuffer(payload.salt);
    const iv = base64ToBuffer(payload.iv);
    const ciphertext = base64ToBuffer(payload.ciphertext);

    const key = await deriveEncryptionKey(password, salt, ['decrypt']);

    const decryptedBuffer = await crypto.subtle.decrypt(
        {
            name: 'AES-GCM',
            iv: iv
        },
        key,
        ciphertext
    );

    const decoder = new TextDecoder();
    const plaintext = decoder.decode(decryptedBuffer);

    return JSON.parse(plaintext);
}

/**
 * Detecta si un string u objeto representa un paquete cifrado válido
 */
function isEncryptedPayload(data) {
    if (!data) return false;
    if (typeof data === 'object') {
        return data.encrypted === true && Boolean(data.ciphertext && data.salt && data.iv);
    }
    if (typeof data === 'string') {
        const trimmed = data.trim();
        if (trimmed.startsWith('{') && trimmed.includes('"encrypted":true') && trimmed.includes('"ciphertext"')) {
            try {
                const parsed = JSON.parse(trimmed);
                return parsed.encrypted === true && Boolean(parsed.ciphertext);
            } catch (e) {
                return false;
            }
        }
    }
    return false;
}
