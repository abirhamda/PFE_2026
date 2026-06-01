import db from "../db.js";

export const normalizeRole = (role) => String(role || "").trim().toLowerCase();
export const normalizeEmail = (email) => String(email || "").trim().toLowerCase();

export const resolvePharmacyContext = async (connection, user) => {
  const role = normalizeRole(user?.role);
  const email = normalizeEmail(user?.email);

  if (role !== "pharmacist" || !email) {
    return null;
  }

  const [rows] = await connection.execute(
    `SELECT id_pharmacie, nom_pharmacie, email, telephone, president_pharmacie, is_active
     FROM pharmacie
     WHERE email = ?
     LIMIT 1`,
    [email],
  );

  return rows[0] || null;
};

export const resolveSupplierContext = async (connection, user) => {
  const role = normalizeRole(user?.role);
  const email = normalizeEmail(user?.email);

  if (role !== "supplier" || !email) {
    return null;
  }

  const [rows] = await connection.execute(
    `SELECT id, nom, prenom, email, telephone, is_active
     FROM suppliers
     WHERE email = ?
     LIMIT 1`,
    [email],
  );

  return rows[0] || null;
};

export const canAccessPharmacy = async (connection, user, pharmacyId) => {
  const role = normalizeRole(user?.role);
  if (role === "admin") {
    return true;
  }

  const pharmacy = await resolvePharmacyContext(connection, user);
  return Boolean(pharmacy && Number(pharmacy.id_pharmacie) === Number(pharmacyId));
};

export const canAccessSupplier = async (connection, user, supplierId) => {
  const role = normalizeRole(user?.role);
  if (role === "admin") {
    return true;
  }

  const supplier = await resolveSupplierContext(connection, user);
  return Boolean(supplier && Number(supplier.id) === Number(supplierId));
};

export const getDbConnection = async () => db.getConnection();
