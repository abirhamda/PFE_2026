import db from "../db.js";

// Récupérer la liste complète des médicaments
export const getAllMedicaments = async (req, res) => {
  try {
    const [rows] = await db.execute('SELECT * FROM medicaments_stock ORDER BY nom ASC');
    res.json(rows);
  } catch (error) {
    console.error('Erreur lors de la récupération des médicaments :', error);
    res.status(500).json({ error: error.message });
  }
};

// Mettre à jour la quantité d’un médicament (ex : diminution)
export const updateQuantite = async (req, res) => {
  const { id } = req.params;
  const { quantite } = req.body;

  if (quantite === undefined || quantite < 0) {
    return res.status(400).json({ error: 'Quantité invalide' });
  }

  try {
    // Vérifie que le médicament existe
    const [medicament] = await db.execute('SELECT * FROM medicaments_stock WHERE id = ?', [id]);
    if (medicament.length === 0) {
      return res.status(404).json({ error: 'Médicament non trouvé' });
    }

    await db.execute('UPDATE medicaments_stock SET quantite = ? WHERE id = ?', [quantite, id]);
    res.json({ message: 'Quantité mise à jour avec succès' });
  } catch (error) {
    console.error('Erreur lors de la mise à jour de la quantité :', error);
    res.status(500).json({ error: error.message });
  }
};

export const handleDemande = async (req, res) => {
  const { pharmacyId } = req.params;
  const { action } = req.body;

  try {
    console.log(`💊 Demande ${action} reçue pour la pharmacie ID ${pharmacyId}`);
    res.json({ success: true, message: `Demande ${action} traitée.` });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Erreur serveur' });
  }
};






export default {
  getAllMedicaments,
  updateQuantite,
  handleDemande,
};

