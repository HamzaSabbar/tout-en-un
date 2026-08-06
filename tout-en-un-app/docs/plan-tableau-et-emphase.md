# Plan — nœud `tableau` et emphase en ligne dans le contenu riche

Document de reprise autonome. Il contient tout ce qu'il faut pour mener ce
chantier sans rien connaître de la conversation qui l'a préparé.

## 1. Pourquoi

Le lot 4 a livré un modèle de contenu riche à cinq types de nœuds : `paragraphe`,
`liste`, `formule`, `image`, `code`. Trois exercices réels de Physique-Chimie ont
ensuite été écrits (`scripts/seed-exercices-pc.ts`), comme la roadmap l'exigeait
avant d'industrialiser la saisie. Ils ont fait apparaître deux manques que les
tests unitaires ne pouvaient pas signaler, puisque ceux-ci vérifient ce que le
modèle sait faire, jamais ce qu'il ignore.

1. **Aucun tableau.** Un suivi temporel donne un tableau de mesures, une étude de
   réaction un tableau d'avancement : ce sont des figures imposées du programme
   officiel, pas des cas limites. Le tableau de mesures du troisième exercice est
   aujourd'hui un nœud `code`. Le rendu passe — police à chasse fixe, colonnes
   alignées — mais la sémantique est fausse : un lecteur d'écran annonce du code,
   et la mise en forme ne s'adapte pas à la largeur.
2. **Aucune emphase.** Écrire `**le réactif limitant**` est un réflexe, et les
   astérisques s'affichaient telles quelles. Le professeur le rencontrera à son
   premier exercice.

Les deux sont déjà décrits en section 8 de `docs/lot-4-cloture-todo.md`, sous le
titre « Ce que trois exercices réels ont appris au modèle de contenu ». Ce plan
les corrige.

## 2. État du dépôt au moment d'écrire ce plan

- `main` contient le lot 4 complet (PR #9 fusionnée en `606c635`), la PR #8
  (terminal cible) et la PR #10 (fiche de clôture, `1877a96`).
- Branche courante : **`exercices-physique-chimie`**, commit `52ef29a`, poussée,
  **PR #11 ouverte et non fusionnée**. Elle apporte les trois exercices réels.
- Un début d'édition est **non committé** dans
  `src/modules/exercice/document-riche.ts` : deux constantes ajoutées,
  `COLONNES_MAX_TABLEAU = 12` et `LIGNES_MAX_TABLEAU = 60`. Rien d'autre.

**Décision à prendre d'abord :** fusionner la PR #11 puis repartir de `main`, ou
poursuivre sur la même branche. Poursuivre sur `exercices-physique-chimie` est
cohérent, puisque ce chantier découle directement de son contenu et met à jour le
même script de semis. Si la PR #11 est déjà fusionnée, créer une branche neuve
depuis `main`, par exemple `contenu-riche-tableau-emphase`.

## 3. Décisions de conception, déjà arrêtées

### 3.1 Emphase : `**gras**`, une seule forme

Même grammaire que les formules entre dollars, ce qui donne trois règles
identiques et donc rien de nouveau à apprendre :

- une paire non appariée reste du texte, jamais une erreur ;
- une paire vide reste du texte ;
- `\*` produit une astérisque littérale, comme `\$` produit un dollar.

**Une seule forme, le gras, rendue en `<strong>`.** L'italique n'a pas d'usage
propre ici : les variables et les grandeurs relèvent des formules, où le rendu
mathématique les met déjà en italique. Ajouter `*italique*` créerait une ambiguïté
d'analyse pour un besoin qui n'existe pas.

**Une emphase peut contenir une formule** — « **la vitesse $v$ augmente** » — donc
le découpage se fait en deux temps : les segments d'emphase d'abord, les fragments
de formule à l'intérieur de chacun. L'inverse serait faux : une formule est opaque,
ce qu'elle contient n'ouvre pas d'emphase.

### 3.2 Tableau : en-têtes obligatoires, cellules pouvant être vides

- `entetes` : au moins une colonne, au plus `COLONNES_MAX_TABLEAU`.
- `lignes` : au moins une, au plus `LIGNES_MAX_TABLEAU`.
- **Chaque ligne doit avoir exactement autant de cellules que d'en-têtes.** Un
  tableau irrégulier se rend de travers ; mieux vaut refuser l'écriture.
- **Les cellules peuvent être vides**, contrairement aux autres textes du modèle :
  un tableau d'avancement en comporte par nature (état initial, état final).
  Il faut donc un schéma de cellule distinct de `texteSchema`, sans `min(1)`.
- Les cellules acceptent formules en ligne et emphase, comme tout texte.
- `legende` facultative, rendue en `<caption>`.

## 4. Le piège à connaître avant d'écrire le schéma

`tableauSchema` fait partie d'un `z.discriminatedUnion("type", [...])`.
**N'y attache pas `.refine()` ou `.superRefine()`** : cela transforme l'objet en
`ZodEffects`, que l'union discriminée peut refuser d'accepter comme membre.

La vérification « chaque ligne a autant de cellules que d'en-têtes » se place donc
**au niveau du document**, dans un `superRefine` sur `documentRicheSchema`, qui
n'appartient à aucune union. `documentRicheSchema` devient alors un `ZodEffects` ;
c'est sans conséquence, `safeParse`, `parse` et `z.infer` continuent de marcher, et
`analyserDocumentRiche` comme `champDocumentRicheSchema` passent par lui.

Vérifier ce point tôt : si l'union accepte `.refine`, la contrainte peut vivre sur
le nœud, ce qui est plus local. Sinon, le contrôle au niveau document est le repli
prévu.

## 5. Fichiers à modifier

### `src/modules/exercice/document-riche.ts`

Ajouter, en gardant l'ordre de lecture actuel du fichier :

```ts
export interface SegmentTexte {
  emphase: boolean;
  fragments: FragmentTexte[];
}

const MARQUEUR_EMPHASE = "**";

// Cherche la fermeture en sautant les échappements ET les portions entre
// dollars : sans cela, `**` à l'intérieur d'une formule couperait la formule.
function trouverFermetureEmphase(texte: string, debut: number): number

export function decouperTexteRiche(texte: string): SegmentTexte[]
```

`decouperTexteRiche` parcourt la chaîne, saute `\X` et les portions `$...$`, et à
chaque `**` cherche sa fermeture. Non appariée ou vide : on avance de deux
caractères, le marqueur reste du texte. Appariée : on pousse le texte accumulé en
segment non emphatique, puis l'intérieur en segment emphatique. Chaque segment est
passé à `decouperFormulesEnLigne`, qui reste inchangé dans son rôle.

Modifier aussi `decouperFormulesEnLigne` pour que l'échappement couvre les deux
caractères :

```ts
if (texte[i] === "\\" && (texte[i + 1] === "$" || texte[i + 1] === "*")) {
  tampon += texte[i + 1];
  i += 2;
  continue;
}
```

Ajouter le schéma de tableau, à côté des autres nœuds :

```ts
// Sans `min(1)`, contrairement à `texteSchema` : un tableau d'avancement a des
// cellules vides par nature.
const celluleSchema = z.string().max(LONGUEUR_MAX_TEXTE).refine(/* même plafond
  de formule en ligne que texteSchema */);

const tableauSchema = z
  .object({
    type: z.literal("tableau"),
    entetes: z.array(celluleSchema).min(1).max(COLONNES_MAX_TABLEAU),
    lignes: z.array(z.array(celluleSchema).min(1).max(COLONNES_MAX_TABLEAU))
      .min(1)
      .max(LIGNES_MAX_TABLEAU),
    legende: z.string().trim().max(300).optional(),
  })
  .strict();
```

L'ajouter à `noeudSchema`, puis poser le contrôle de régularité dans un
`superRefine` de `documentRicheSchema` (voir section 4).

Les constantes `COLONNES_MAX_TABLEAU` et `LIGNES_MAX_TABLEAU` sont **déjà
présentes** dans le fichier, non committées.

### `src/components/contenu-riche/document.tsx`

`TexteRiche` passe de `decouperFormulesEnLigne` à `decouperTexteRiche` :

```tsx
function TexteRiche({ texte }: { texte: string }) {
  return (
    <>
      {decouperTexteRiche(texte).map((segment, index) => {
        const contenu = segment.fragments.map((fragment, rang) =>
          fragment.type === "texte" ? (
            <Fragment key={rang}>{fragment.valeur}</Fragment>
          ) : (
            <Formule key={rang} latex={fragment.valeur} />
          ),
        );
        return segment.emphase ? (
          <strong key={index}>{contenu}</strong>
        ) : (
          <Fragment key={index}>{contenu}</Fragment>
        );
      })}
    </>
  );
}
```

Ajouter la branche `tableau` au `switch` de `Noeud`. Le `default` existant sert
l'exhaustivité TypeScript : il signalera l'oubli si la branche manque.

```tsx
case "tableau":
  return (
    // `overflow-x-auto` sur le conteneur, jamais sur la page : un tableau large
    // sur téléphone doit défiler dans sa boîte, sinon la page entière déborde et
    // la recette à 375 px échoue.
    <div className="overflow-x-auto">
      <table className="w-full border-collapse text-sm">
        {noeud.legende && (
          <caption className="caption-bottom pt-2 text-sm text-muted-foreground">
            {noeud.legende}
          </caption>
        )}
        <thead>
          <tr>
            {noeud.entetes.map((entete, rang) => (
              <th key={rang} scope="col" className="border-b px-3 py-2 text-left font-semibold">
                <TexteRiche texte={entete} />
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {noeud.lignes.map((ligne, rangLigne) => (
            <tr key={rangLigne}>
              {ligne.map((cellule, rangCellule) => (
                <td key={rangCellule} className="border-b px-3 py-2 align-top">
                  <TexteRiche texte={cellule} />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
```

### `src/app/(admin)/contenu/[matiereId]/chapitres/[chapitreId]/cours/[coursId]/apercu-contenu-riche.tsx`

La prévisualisation du back-office extrait les formules nœud par nœud pour les
compiler. **Elle ignore aujourd'hui les cellules de tableau** : ajouter `tableau`
à la collecte, sinon une formule placée dans un tableau ne serait pas
prévisualisée et le professeur n'aurait aucun retour avant enregistrement.

Dans `formulesDuDocument`, le calcul de `textes` doit inclure :

```ts
noeud.type === "tableau" ? [...noeud.entetes, ...noeud.lignes.flat()] : []
```

### `scripts/seed-exercices-pc.ts`

Deux retouches sur le troisième exercice, « Cinétique : attaque du zinc par
l'acide chlorhydrique » :

1. Remplacer le nœud `code` du tableau de mesures par un vrai nœud `tableau` :

```ts
{
  type: "tableau",
  entetes: ["$t$ (min)", "0", "2", "4", "6", "8", "10", "15", "20"],
  lignes: [["$V(\\mathrm{H_2})$ (mL)", "0", "18", "32", "43", "51", "57", "65", "68"]],
  legende: "Volume de dihydrogène dégagé au cours du temps.",
}
```

2. Remettre l'emphase là où elle a été retirée faute de support, dans la
   correction : « le zinc est le réactif limitant » et « la vitesse diminue ».
   Chercher les deux phrases, elles sont formulées en clair aujourd'hui.

Envisager aussi un tableau d'avancement dans ce même exercice : c'est la figure la
plus attendue du programme, et elle exercera les cellules vides.

### Documentation

- `docs/architecture.md` section 9 : la liste des types de nœuds apparaît dans
  « Décisions du lot 4, qui donnent leur forme exacte à ce modèle ». Y ajouter
  `tableau`, et décrire l'emphase à côté des formules en ligne.
- `docs/lot-4-cloture-todo.md` section 8 : la sous-section « Ce que trois
  exercices réels ont appris au modèle de contenu » annonce que les deux manques
  ne sont **pas** corrigés. La mettre à jour pour dire qu'ils l'ont été, et par
  quelle branche.

## 6. Tests à écrire

### `src/modules/exercice/document-riche.test.ts`

Emphase, en miroir exact des cas déjà écrits pour les dollars :

- sépare texte et emphase ;
- une paire non appariée reste du texte (`"un ** deux"`) ;
- une paire vide reste du texte (`"un **** deux"`) ;
- `\*` rend une astérisque littérale ;
- une emphase contenant une formule donne un segment emphatique à deux fragments ;
- **`**` à l'intérieur d'une formule ne ferme pas l'emphase** — le cas qui motive
  `trouverFermetureEmphase` ;
- chaîne vide : aucun segment.

Tableau :

- un tableau régulier est accepté ;
- une ligne plus courte ou plus longue que les en-têtes est refusée ;
- une cellule vide est acceptée ;
- au-delà de `COLONNES_MAX_TABLEAU` colonnes ou `LIGNES_MAX_TABLEAU` lignes,
  refus ;
- une clé inconnue sur le nœud est refusée, comme pour les autres nœuds.

### `src/components/contenu-riche/document.test.tsx`

- une emphase rend un `<strong>` ;
- une emphase contenant une formule rend le `<strong>` **et** le balisage KaTeX ;
- le texte d'une emphase reste échappé (`**<script>**` ne produit pas de balise) ;
- un tableau rend `<table>`, `<th scope="col">` et le bon nombre de `<td>` ;
- une légende rend un `<caption>` ;
- une formule dans une cellule est rendue par KaTeX.

## 7. Vérification

Dans cet ordre, en montrant la sortie.

```sh
npm run typecheck
npm run lint          # doit rester sans aucun avertissement
npm test              # 343 tests avant ce chantier
npm run build
npm run budget:js     # la fiche d'exercice était à 122,6 Ko sur 200
```

Le budget est le point de vigilance : `decouperTexteRiche` est importé par la
prévisualisation du back-office, donc par du code client, mais le rendu élève
reste serveur. Aucune augmentation notable n'est attendue côté élève.

Puis la recette de bout en bout, qui exige une base PostgreSQL jetable — voir la
section 8. Les scénarios existants ne touchent pas au tableau ni à l'emphase :
ils doivent passer sans modification.

```sh
npx playwright test
```

Envisager d'ajouter au scénario du lot 4 un tableau et une emphase dans l'énoncé,
pour que la recette couvre aussi les nouveaux nœuds de bout en bout.

## 8. Environnement local : ce qu'il faut savoir

Ces points ont coûté cher à établir. Ils ne sont pas dans les autres documents.

### Base de test jetable

Un cluster PostgreSQL 18 jetable vit dans le répertoire de travail temporaire de
la session, port **55432**, base **`e2e_lot4`** déjà migrée. Il est **arrêté** à
la fin de chaque session et doit être relancé.

`pg_ctl start` lancé depuis un shell meurt avec ce shell. Le démarrer détaché :

```powershell
Start-Process -FilePath "C:\Program Files\PostgreSQL\18\bin\pg_ctl.exe" `
  -ArgumentList "-D","`"<scratchpad>\pgdata`"","-l","`"<scratchpad>\pg.log`"","-o","`"-p 55432`"","start" `
  -WindowStyle Hidden
```

Si le répertoire `pgdata` a disparu, recréer un cluster jetable et appliquer les
migrations :

```sh
export DATABASE_URL="postgresql://postgres:postgres@127.0.0.1:55432/e2e_lot4"
export DIRECT_URL="$DATABASE_URL"
npx prisma migrate deploy
```

**Ne jamais viser la base de développement partagée.** `.env` pointe vers un
Supabase distant ; les variables exportées dans le shell l'emportent, car
`dotenv` n'écrase jamais une variable déjà définie.

### Serveur de production pour la recette

`playwright.config.ts` lance `pnpm build && pnpm start` quand `CI` est défini, et
réutilise un serveur existant sinon. Pour itérer vite sur des changements qui ne
touchent pas au code applicatif, garder un serveur bâti et le relancer à la main :

```powershell
Start-Process -FilePath (Get-Command node).Source `
  -ArgumentList "node_modules\next\dist\bin\next","start" `
  -WorkingDirectory "<repo>\tout-en-un-app" -WindowStyle Hidden
```

avec `DATABASE_URL`, `DIRECT_URL` et `STOCKAGE_LOCAL_AUTORISE=oui` dans
l'environnement. Libérer le port 3000 avant chaque relance, sinon Playwright
échoue sur « port already used ».

Toute modification du code applicatif impose un `npm run build` complet, deux à
quatre minutes sur cette machine.

### Mémoire

La machine tourne autour de 1 Go libre sur 8. Sous cette pression, un scénario
Playwright qui prend 20 secondes peut en prendre 180, et des délais d'attente trop
courts font échouer la recette à un endroit variable — ce qui ressemble à un
défaut alors que c'en est un d'attente. Fermer le navigateur et les fenêtres
d'éditeur inutiles avant une exécution longue.

### Aperçu visuel du contenu

Pour regarder le rendu sans passer par l'application : rendre les documents avec
`renderToStaticMarkup` dans un test vitest temporaire, écrire une page HTML avec
`node_modules/katex/dist/katex.min.css` en ligne, puis capturer :

```sh
npx playwright screenshot --full-page --viewport-size "900,1400" \
  "file:///C:/chemin/apercu.html" apercu.png
```

Node ne charge pas les `.tsx` directement : passer par vitest, qui a la
transformation JSX configurée. Supprimer les fichiers temporaires ensuite.

## 9. Livraison

- Commit unique ou deux, code et documentation ensemble, sur la branche retenue
  en section 2.
- PR vers `main`, en expliquant que le chantier vient de trois exercices réels et
  non d'une intuition.
- Fusion après CI verte.
