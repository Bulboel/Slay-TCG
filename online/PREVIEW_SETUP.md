# Site de test indépendant — Triade d'Hackénia

GitHub Pages publie un seul site par dépôt. Ne pas changer **Settings > Pages** de `Bulboel/Slay-TCG` : cela remplacerait le jeu public.

## Installation (une fois)
1. Créer un dépôt public distinct `Bulboel/Slay-TCG-Preview` avec un README et une branche `main`.
2. Dans ce nouveau dépôt, ajouter le fichier `.github/workflows/preview.yml` avec le contenu de `online/preview-pages-workflow.yml` du dépôt source.
3. Dans le nouveau dépôt : **Settings > Pages > Build and deployment > Source : GitHub Actions**.
4. Dans **Actions**, exécuter le workflow **Deploy Triade preview** avec **Run workflow**.

Le workflow récupère la branche `feature/pvp-online-supabase` du dépôt source, sans écrire dans `main` et sans modifier la production.

URL attendue **après déploiement réussi** : `https://bulboel.github.io/Slay-TCG-Preview/`.

Attention : le stockage local est lié au domaine et au chemin. Les collections enregistrées sur l'ancien site ne sont pas automatiquement copiées sur ce nouveau domaine de test. Les deux joueurs doivent créer ou importer leurs decks sur la prévisualisation.
