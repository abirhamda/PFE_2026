import db from "../db.js";
import { resolveSupplierContext } from "../utils/userContext.js";

const shapeProduct = (row) => ({
  ...row,
  prix: row.prix === null ? null : Number(row.prix),
  quantite_disponible: Number(row.quantite_disponible || 0),
  is_active: Boolean(row.is_active),
});

const buildStats = (items) => ({
  total: items.length,
  actifs: items.filter((item) => item.is_active).length,
  rupture: items.filter((item) => item.quantite_disponible <= 0).length,
  faible_stock: items.filter((item) => item.quantite_disponible > 0 && item.quantite_disponible <= 10).length,
});

export const getMyProducts = async (req, res) => {
  const connection = await db.getConnection();
  try {
    const supplier = await resolveSupplierContext(connection, req.user);
    if (!supplier) {
      return res.status(403).json({ success: false, error: "Profil fournisseur invalide" });
    }

    const search = String(req.query?.search || "").trim().toLowerCase();
    const params = [supplier.id];
    let whereSearch = "";
    if (search) {
      whereSearch = " AND LOWER(CONCAT_WS(' ', nom, description, unite)) LIKE ?";
      params.push(`%${search}%`);
    }

    const [rows] = await connection.execute(
      `SELECT id, supplier_id, nom, description, prix, quantite_disponible, unite, is_active, created_at, updated_at
       FROM supplier_products
       WHERE supplier_id = ?${whereSearch}
       ORDER BY updated_at DESC, nom ASC`,
      params,
    );

    const items = rows.map(shapeProduct);
    return res.json({ success: true, items, stats: buildStats(items) });
  } catch (error) {
    console.error("Erreur recuperation produits fournisseur:", error);
    return res.status(500).json({ success: false, error: "Erreur lors de la recuperation des produits" });
  } finally {
    connection.release();
  }
};

export const createProduct = async (req, res) => {
  const connection = await db.getConnection();
  try {
    const supplier = await resolveSupplierContext(connection, req.user);
    if (!supplier) {
      return res.status(403).json({ success: false, error: "Profil fournisseur invalide" });
    }

    const nom = String(req.body?.nom || "").trim();
    const description = req.body?.description ? String(req.body.description).trim() : null;
    const unite = req.body?.unite ? String(req.body.unite).trim() : null;
    const quantiteDisponible = Number(req.body?.quantite_disponible ?? 0);
    const prix = req.body?.prix === "" || req.body?.prix === null || req.body?.prix === undefined ? null : Number(req.body?.prix);

    if (!nom || !Number.isFinite(quantiteDisponible) || quantiteDisponible < 0 || (prix !== null && (!Number.isFinite(prix) || prix < 0))) {
      return res.status(400).json({ success: false, error: "Les informations du produit sont invalides" });
    }

    const [result] = await connection.execute(
      `INSERT INTO supplier_products
       (supplier_id, nom, description, prix, quantite_disponible, unite, is_active, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, 1, NOW(), NOW())`,
      [supplier.id, nom, description, prix, quantiteDisponible, unite],
    );

    const [rows] = await connection.execute(
      `SELECT id, supplier_id, nom, description, prix, quantite_disponible, unite, is_active, created_at, updated_at
       FROM supplier_products
       WHERE id = ?`,
      [result.insertId],
    );

    return res.status(201).json({ success: true, item: shapeProduct(rows[0]) });
  } catch (error) {
    console.error("Erreur creation produit fournisseur:", error);
    const duplicate = error?.code === "ER_DUP_ENTRY";
    return res.status(duplicate ? 409 : 500).json({
      success: false,
      error: duplicate ? "Un produit avec ce nom existe deja" : "Erreur lors de la creation du produit",
    });
  } finally {
    connection.release();
  }
};

export const updateProduct = async (req, res) => {
  const connection = await db.getConnection();
  try {
    const supplier = await resolveSupplierContext(connection, req.user);
    if (!supplier) {
      return res.status(403).json({ success: false, error: "Profil fournisseur invalide" });
    }

    const productId = Number(req.params.id);
    const nom = String(req.body?.nom || "").trim();
    const description = req.body?.description ? String(req.body.description).trim() : null;
    const unite = req.body?.unite ? String(req.body.unite).trim() : null;
    const quantiteDisponible = Number(req.body?.quantite_disponible ?? 0);
    const prix = req.body?.prix === "" || req.body?.prix === null || req.body?.prix === undefined ? null : Number(req.body?.prix);
    const isActive = req.body?.is_active === undefined ? true : Boolean(req.body.is_active);

    if (!nom || !Number.isFinite(quantiteDisponible) || quantiteDisponible < 0 || (prix !== null && (!Number.isFinite(prix) || prix < 0))) {
      return res.status(400).json({ success: false, error: "Les informations du produit sont invalides" });
    }

    const [existingRows] = await connection.execute(
      "SELECT id FROM supplier_products WHERE id = ? AND supplier_id = ? LIMIT 1",
      [productId, supplier.id],
    );
    if (existingRows.length === 0) {
      return res.status(404).json({ success: false, error: "Produit introuvable" });
    }

    await connection.execute(
      `UPDATE supplier_products
       SET nom = ?, description = ?, prix = ?, quantite_disponible = ?, unite = ?, is_active = ?, updated_at = NOW()
       WHERE id = ? AND supplier_id = ?`,
      [nom, description, prix, quantiteDisponible, unite, isActive ? 1 : 0, productId, supplier.id],
    );

    const [rows] = await connection.execute(
      `SELECT id, supplier_id, nom, description, prix, quantite_disponible, unite, is_active, created_at, updated_at
       FROM supplier_products
       WHERE id = ?`,
      [productId],
    );

    return res.json({ success: true, item: shapeProduct(rows[0]) });
  } catch (error) {
    console.error("Erreur mise a jour produit fournisseur:", error);
    const duplicate = error?.code === "ER_DUP_ENTRY";
    return res.status(duplicate ? 409 : 500).json({
      success: false,
      error: duplicate ? "Un produit avec ce nom existe deja" : "Erreur lors de la mise a jour du produit",
    });
  } finally {
    connection.release();
  }
};

export const deleteProduct = async (req, res) => {
  const connection = await db.getConnection();
  try {
    const supplier = await resolveSupplierContext(connection, req.user);
    if (!supplier) {
      return res.status(403).json({ success: false, error: "Profil fournisseur invalide" });
    }

    const productId = Number(req.params.id);
    const [result] = await connection.execute(
      "DELETE FROM supplier_products WHERE id = ? AND supplier_id = ?",
      [productId, supplier.id],
    );
    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, error: "Produit introuvable" });
    }

    return res.json({ success: true, message: "Produit supprime avec succes" });
  } catch (error) {
    console.error("Erreur suppression produit fournisseur:", error);
    return res.status(500).json({ success: false, error: "Erreur lors de la suppression du produit" });
  } finally {
    connection.release();
  }
};

export default {
  getMyProducts,
  createProduct,
  updateProduct,
  deleteProduct,
};
