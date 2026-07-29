# Tout en Un — version PHP

Version autonome de la landing page, compatible avec un hébergement PHP classique.

## Fichiers à envoyer sur Hostinger

Envoyez tout le contenu de ce dossier dans `public_html` :

- `index.php`
- le dossier `assets`

Le serveur ouvrira automatiquement `index.php` lorsque le domaine sera visité.

## Tester localement

Avec PHP installé :

```powershell
php -S localhost:8000
```

Puis ouvrez <http://localhost:8000>.

## Modifier le contenu

- Textes, tarifs et FAQ : `index.php`
- Apparence et responsive : `assets/styles.css`
- Menu, FAQ et animations : `assets/app.js`

Les liens `connexion.php`, `confidentialite.php` et `conditions.php` sont conservés comme destinations futures, car ces pages n'existaient pas dans l'application Next.js d'origine.
