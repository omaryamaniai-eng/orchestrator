# Assistant véhicules électriques

Plateforme conversationnelle qui aide un particulier à choisir une voiture électrique, simuler son financement, vérifier son éligibilité et demander une offre. Elle reprend fidèlement le prototype HTML « Assistant véhicules électriques » et le rend fonctionnel :

- **Next.js 15 / TypeScript** pour l'interface et les routes API ;
- **LangChain JS** comme framework IA (routage d'intention, extraction de critères, chaîne RAG, chaîne conversationnelle) ;
- **OpenRouter** comme fournisseur d'inférence, avec le modèle **Gemma 26B** par défaut.

L'authentification est volontairement contournée : toutes les requêtes sont attribuées à un utilisateur de démonstration (voir `src/server/auth.ts`).

## Démarrage

```bash
npm install --legacy-peer-deps
```

```bash
cp .env.example .env.local
```

Renseigner `OPENROUTER_API_KEY` dans `.env.local`, puis :

```bash
npm run dev
```

L'application est servie sur http://localhost:3000. Sans clé OpenRouter, la plateforme reste utilisable : le routage se fait par règles et les réponses documentaires sont extractives.

Autres commandes :

```bash
npm test
```

```bash
npm run build && npm start
```

## Parcours couverts

| Parcours | Déclencheur | Traitement |
| --- | --- | --- |
| Recommandation | « Trouver ma voiture électrique » ou description libre du besoin | Le modèle extrait usage, carrosserie, places, budget… et préremplit le formulaire ; filtrage et tri sur le catalogue ; carrousel avec versions, fiche, 3D, favoris |
| Estimation de budget | « Je ne connais pas mon budget » dans le formulaire | Capacité d'emprunt sur 84 mois (règle de démonstration à 40 %) |
| Questions documentaires (RAG) | Questions sur motorisations, recharge, autonomie, financement… | Retriever BM25 sur la base documentaire, réponse rédigée par le modèle avec citations [n], panneau des sources |
| Choix du véhicule | Clic sur une carte ou « Choisir ce véhicule » | Repris dans la simulation et la demande |
| Simulation | « Simuler le crédit » | Crédit classique ou LOA, calcul côté serveur, enregistrement dans « Mes simulations » |
| Comparaison | « Comparer trois durées » | Trois durées autour de la simulation courante |
| Éligibilité | « Vérifier mon éligibilité » | Formulaire en deux étapes, niveau Favorable / À étudier / Défavorable |
| Demande d'offre | « Recevoir l'offre » | Coordonnées, consentement, code à 6 chiffres (3 essais, renvoi après 30 s), récapitulatif |
| Conversation libre | Salutations, questions sur le catalogue | Chaîne conversationnelle avec le catalogue et l'état de la conversation en contexte |

Les conversations, favoris, simulations enregistrées et demandes d'offre sont persistés et rechargés depuis la barre latérale. La dictée vocale utilise l'API Web Speech du navigateur ; les petits fichiers texte joints sont transmis au modèle comme contexte.

## Architecture

```
src/
  lib/domain/            Domaine partagé client / serveur
    catalog.ts           Catalogue, versions, recommandation
    finance.ts           Crédit, LOA, estimation de budget, éligibilité, téléphone
    types.ts             Blocs de message, actions, événements du protocole
  server/
    config.ts            Variables d'environnement
    auth.ts              Authentification contournée (point d'entrée unique)
    llm/model.ts         ChatOpenAI LangChain branché sur OpenRouter
    llm/router.ts        Routage d'intention + extraction de critères (JSON), repli par règles
    llm/chains.ts        Chaîne conversationnelle et chaîne RAG (streaming)
    rag/knowledge.ts     Base documentaire de démonstration
    rag/retriever.ts     Retriever LangChain BM25 en mémoire
    orchestrator/        Parcours, état de conversation, traitement d'un tour
    store/store.ts       Persistance JSON sur disque
    sms.ts               Génération du code et fournisseur SMS (journalisation par défaut)
  app/api/
    chat                 POST : un tour de conversation, réponse en flux NDJSON
    conversations        GET liste, GET / DELETE par identifiant
    favorites            GET, POST
    simulations          GET, POST, DELETE
    me, health           Utilisateur courant, état du modèle
  components/assistant/  Interface React (messages, formulaires, carrousel, panneaux)
```

### Protocole de conversation

Le client envoie à `POST /api/chat` soit un message libre, soit une action d'interface (soumission de formulaire, choix de véhicule, vérification du code…). Le serveur répond par un flux d'événements JSON, un par ligne : `message` (création ou mise à jour d'un message et de ses blocs), `delta` (jetons de texte), `remove`, `state`, `toast`, `simulations`, `error`, `done`.

Les messages de l'assistant sont composés de blocs typés (texte, formulaire, carrousel, résultat de simulation, sources…). Les montants sont toujours calculés par le code, jamais par le modèle ; le modèle rédige le texte, classe les demandes et extrait les critères.

### Remplacer les éléments de démonstration

- **Authentification** : implémenter `getCurrentUser` dans `src/server/auth.ts`.
- **Persistance** : remplacer `JsonStore` dans `src/server/store/store.ts` par une base de données (le fichier JSON convient à une instance unique ; sur Vercel, `/tmp` n'est pas durable).
- **SMS** : implémenter `SmsProvider` dans `src/server/sms.ts` et passer `OTP_DEMO_MODE=false`.
- **Catalogue, documentation, règles de financement** : `src/lib/domain/catalog.ts`, `src/server/rag/knowledge.ts`, `src/lib/domain/finance.ts`. Les valeurs entre crochets (`[Marque]`, `[Valeur]`) sont des emplacements à compléter.
- **Recherche documentaire** : le retriever BM25 peut être remplacé par un VectorStore LangChain sans changer la chaîne RAG.
