# Slay TCG

Prototype jouable d’un jeu de cartes tactique 1 contre 1 dans l’univers d’Hackénia.

## Jouer

Ouvrez `index.html` dans un navigateur, ou activez GitHub Pages dans **Settings > Pages** en choisissant la branche `main` et le dossier racine.

## Contenu de cette version

- plateau de 3 × 3 cases ;
- cinq cartes par joueur ;
- adversaire contrôlé par l’ordinateur ;
- captures classiques ;
- règles optionnelles Identique, Plus et Combo ;
- mains ouvertes ou cachées ;
- distribution aléatoire ou fixe ;
- interface adaptée aux ordinateurs et téléphones.

## Mise à jour du 28 septembre 2026

- 128 illustrations, dont 33 nouvelles et six Divines. Les Sans-chiffres utilise E = 3 et B = 8.
- Numéros de collection publiés dans `assets/data/card-numbers.js`, avec les variantes regroupées par nom. Ne jamais réordonner `pool` : les anciens decks enregistrent ses positions.
- Tri indépendant de la collection et des decks par numéro, nom ou rareté.
- Cadres purement visuels : 10 exemplaires d’un même identifiant = doré ; 100 = diamant. Les exemplaires foil sont déjà inclus dans le total. Les variantes ont des compteurs séparés.
- Cinquième emplacement toujours foil et jouable, sans Souvenirs : 10 % rare, 5 % alternative, 1 % parallèle, 0,5 % Divine. La protection parallèle au 200e booster reste prioritaire si aucune n’est possédée.
- À l’intérieur des Divines, Kayla représente 2 % des tirages, chacune des cinq autres 19,6 %. La préférence pour les cartes manquantes ne s’applique jamais à cette rareté. Les decks sont limités à deux rares (variantes rares comprises) et une Divine, pour les joueurs comme pour les IA. Les Divines ne sont pas proposées aux paliers 25/50, mais le bonus supplémentaire de chaque 100 boosters permet de choisir dans tout le set, Kayla comprise. Les anciens compteurs reçoivent aussi leurs bonus de 100, une seule fois.
- Partie 4 : défi obligatoire de la torche, reprise du duel, épilogue de l’araignée blanche et récompense de première réussite.
- Tutoriel avec exercice de capture sans effet sur la sauvegarde. Icônes Android/iOS adaptées au monogramme H du dos des cartes.

Le monogramme a été adapté avec l’outil de génération d’images à partir du dos officiel : conserver le H doré et son cercle, retirer les éléments autour, cadrage carré sur fond bleu nuit. Les fichiers utilisés par le site sont dans `assets/icons/`.

### Vérification

`node tests/story.test.cjs` et `node tests/collection.test.cjs` ne nécessitent aucune dépendance. `node tests/collection-dom.test.cjs` nécessite `jsdom`. Ce dernier vérifie le démarrage de la page, le tri, les cadres, le tutoriel, les récompenses et la reprise de la partie 4.

Le tri par quantité affiche les illustrations les plus possédées en premier. En duel mobile, le plateau, les mains et la pioche Souvenir tiennent dans la hauteur disponible ; la chronique est accessible par Historique.

Mise à jour du set : 136 cartes, dont les cinq Hydrelithes majeures eau/feu/foudre/glace/vent, Hackénia, la cathédrale de Forfalla et le temple de Heaum. Numérotation : héros, personnages, créatures, objets/scènes, lieux, alternatives, parallèles, Divines, puis Souvenirs. Les identifiants et positions internes des decks restent inchangés. Tris alphabétique et rareté disponibles dans les deux sens. La compagnie du rêve est retirée de la pioche et des anciennes parties restaurées.

Ajout de neuf cartes (145 au total). Le pèlerin utilise L=7, I=1, E=3, soit haut/droite/bas/gauche : 1/3/3/7. Le bouton Loupe des mains ouvre les cartes visibles avec précédent/suivant ; les mains cachées restent protégées. Retour au menu reste fixé en haut des panneaux Collection et Mes decks. Partie 5 : La fin de la mine, duel à gagner contre l’araignée géante, coup final de Bolduc, repos puis portail mystérieux. Reprise sauvegardée et récompense unique de 1 booster + 50 or.

Set Un nouveau départ finalisé à 150 cartes : Réussite critique est la dernière carte jouable (#137), suivie des 13 Souvenirs. Le dernier emplacement alternative/parallèle/Divine déclenche un ange lumineux en SVG animé (2,7 secondes), avec révélation immédiate possible et respect du mouvement réduit. Aucun changement des probabilités.

### Menu et ouverture séquentielle — 29 septembre

Le menu principal adopte une auberge illustrée aux contours encrés, une palette émeraude/or et des accès en deux colonnes sur mobile. Le décor `assets/menu-tavern.webp` a été créé avec l’outil intégré ImageGen puis converti en WebP. Direction du prompt : « Fantasy comic-book tavern, bold ink outlines, teal and amber, oak gaming table, green/gold face-down cards, twenty-sided die, candle lantern, arch window overlooking woodland and a medieval city; calm dark centre for HTML controls; no people, text or UI buttons. »

Les boosters présentent une seule carte à la fois avec retournement, bouton suivant, consultation des cartes déjà vues, zoom et raccourci vers la dernière carte foil. L’ange est ancré au centre du cadre de cette dernière carte. Les transitions respectent la préférence de réduction des animations. Les cartes du paquet restent sauvegardées pendant l’ouverture et ne sont attribuées qu’à la validation finale. L’image vide de la carte #094 a été remplacée depuis l’original, avec une nouvelle URL pour contourner l’ancien cache.

Validation navigateur : `node tests/presentation-browser.cjs` avec Playwright installé (ou `CHROMIUM_EXECUTABLE_PATH` et `@sparticuz/chromium` pour Chromium autonome). Vérifie le déroulement, le zoom, l’ange centré, la reprise du paquet et l’absence de défilement aux formats 320×568, 390×667 et 844×390.
