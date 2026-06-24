// src/config.js

// Lista de UIDs de Firebase Auth permitidos para acceder al panel de administración.
export const ADMIN_UIDS = [
  "8xcJN74gWTag0kEBlezF67WApQ92", // Juancho
  "A84YNswLzgZPCNUCHhPxVvavVjG2", // admin/soporte
];

// Helper para verificar si un UID es administrador en el cliente
export const checkIsAdmin = (uid) => {
  return ADMIN_UIDS.includes(uid);
};
