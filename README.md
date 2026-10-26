# HandiMonde — Carte des lieux accessibles

> **Projet signature · 06/06 · CARTOGRAPHIE** — [Étude de projet : problème, choix techniques et limites](https://github.com/Nikoju1977/Nikoju1977/blob/main/SHOWCASE.md) · [Portfolio Studio Niko Design](https://github.com/Nikoju1977).


**Catégorie : accessibilité & cartographie** · Studio Niko Design

Application web de consultation de lieux et d'équipements accessibles, basée sur les informations disponibles dans **OpenStreetMap**. Son but est de faciliter la recherche d'informations pratiques sur l'accessibilité, notamment pour les personnes à mobilité réduite.

## Fonctionnement

- Interface web en français (`index.html`, `app.html`).
- Carte web construite avec **Leaflet** et des données **OpenStreetMap**.
- Recherche et informations d'accessibilité d'après les données fournies par les sources.
- Fonctions serveur regroupées dans `api/` pour interroger les services externes.

Les informations cartographiques participatives peuvent être **absentes, datées ou incorrectes**. Il faut vérifier sur place ou auprès de l'établissement avant un déplacement important.

## Démarrage local

Pour explorer l'interface statique :

```bash
python3 -m http.server 8000
```

Puis ouvrir http://localhost:8000/. **Attention :** le simple serveur Python ne fournit pas les fonctions `/api` ; certaines fonctionnalités réseau demandent un environnement compatible avec la configuration Vercel.

## Déploiement

`vercel.json` définit les routes suivantes :

| Route publique | Fonction |
| --- | --- |
| `/places` | `/api/osm` |
| `/assist` | `/api/ai` |
| `/find` | `/api/geo` |

Consulter les variables d'environnement et la configuration des services utilisés dans les fonctions serveur avant déploiement. **Ne jamais committer de clés d'API.**

## Confidentialité et accessibilité

- La géolocalisation du navigateur, lorsqu'elle est sollicitée, nécessite une autorisation de l'utilisateur.
- Les recherches et coordonnées transmises à un service externe peuvent être traitées selon la politique de ce service.
- Le dépôt utilise des typographies adaptées à la lisibilité et des styles dédiés ; cela **ne constitue pas** une certification d'accessibilité numérique.
- Les données OpenStreetMap sont soumises à leurs conditions de réutilisation (ODbL) et aux obligations d'attribution applicables.

## Fichiers principaux

```text
index.html   Interface de consultation
app.html     Interface alternative
api/         Fonctions serveur (ai, geo, osm)
test.html    Page de test / vérification manuelle
vercel.json  Routage et en-têtes HTTP
```

**Statut :** application en développement ; aucune conformité WCAG/RGAA n'est revendiquée par cette documentation.

[Retour au catalogue Studio Niko Design](https://github.com/Nikoju1977).
