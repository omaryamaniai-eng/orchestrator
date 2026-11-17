/**
 * Base documentaire de démonstration. Chaque section devient un passage indexé.
 * Les éléments entre crochets sont à remplacer par la documentation réelle
 * (guides internes, fiches constructeur, FAQ).
 */

export interface KnowledgeDoc {
  id: string;
  title: string;
  sub: string;
  sections: { title: string; text: string }[];
}

export const KNOWLEDGE: KnowledgeDoc[] = [
  {
    id: "guide-motorisations",
    title: "Guide des motorisations électrifiées",
    sub: "Base documentaire · mis à jour le [Date]",
    sections: [
      {
        title: "Électrique à batterie (BEV)",
        text: "Un véhicule 100 % électrique (BEV) fonctionne uniquement avec un moteur électrique alimenté par une batterie. Il ne possède pas de moteur thermique et se recharge exclusivement sur une prise domestique, une wallbox ou une borne publique. Il n'émet pas de gaz d'échappement à l'usage.",
      },
      {
        title: "Hybride non rechargeable (HEV)",
        text: "Un véhicule hybride non rechargeable (HEV) associe un moteur thermique et un moteur électrique alimenté par une petite batterie. Cette batterie se recharge en roulant, notamment lors du freinage et des décélérations. Il ne se branche pas sur une prise.",
      },
      {
        title: "Hybride rechargeable et prolongateur",
        text: "Le PHEV et le REEV associent tous deux une batterie rechargeable sur prise et un moteur thermique. Ils se distinguent par la manière dont l'énergie arrive aux roues. Sur un PHEV, le moteur thermique peut entraîner les roues, seul ou avec le moteur électrique. Sur un REEV, seul le moteur électrique entraîne les roues.",
      },
      {
        title: "Hybride rechargeable (PHEV)",
        text: "Un hybride rechargeable (PHEV) dispose d'une batterie plus petite qu'un véhicule électrique, conçue pour les trajets quotidiens courts en mode électrique. Quand la batterie est vide ou à forte allure, le moteur thermique prend le relais et entraîne directement les roues. Il se recharge sur prise ou borne, et partiellement en roulant.",
      },
      {
        title: "Électrique à prolongateur d'autonomie (REEV)",
        text: "Un véhicule électrique à prolongateur d'autonomie (REEV, aussi appelé EREV) est toujours entraîné par son moteur électrique. Un petit moteur thermique sert de générateur : il produit de l'électricité pour recharger la batterie en roulant, sans jamais entraîner les roues. La conduite reste électrique en permanence.",
      },
      {
        title: "Choisir sa motorisation",
        text: "Pour un usage majoritairement urbain avec recharge à domicile, un véhicule électrique à batterie est le plus adapté. Pour des trajets quotidiens courts et des longs trajets fréquents sans infrastructure de recharge, un PHEV ou un REEV offre plus de souplesse. Le REEV convient à ceux qui veulent une conduite électrique au quotidien sans contrainte d'autonomie.",
      },
    ],
  },
  {
    id: "fiche-reev",
    title: "Fiche technique [Marque] [Modèle] REEV",
    sub: "Documentation constructeur · [Date]",
    sections: [
      {
        title: "Chaîne de traction",
        text: "Les roues sont entraînées uniquement par le moteur électrique. Le moteur thermique fonctionne comme un générateur qui recharge la batterie en roulant. Il démarre automatiquement lorsque le niveau de batterie descend sous un seuil défini.",
      },
      {
        title: "Batterie et recharge",
        text: "La batterie se recharge sur une prise domestique renforcée, une wallbox ou une borne publique en courant alternatif, et sur une borne rapide en courant continu selon la version. Capacité de la batterie : [Valeur] kWh. Puissance de charge maximale : [Valeur] kW.",
      },
      {
        title: "Modes de conduite",
        text: "Le conducteur peut choisir un mode tout électrique, un mode de maintien de la charge qui conserve l'énergie de la batterie pour plus tard, et un mode automatique qui gère seul le démarrage du générateur.",
      },
    ],
  },
  {
    id: "faq-recharge",
    title: "FAQ recharge à domicile",
    sub: "Base documentaire · mis à jour le [Date]",
    sections: [
      {
        title: "Où recharger un véhicule hybride",
        text: "Les versions PHEV et REEV se rechargent sur une prise domestique renforcée, une wallbox ou une borne publique. Un véhicule hybride non rechargeable ne se branche pas : sa batterie se recharge en roulant.",
      },
      {
        title: "Prise domestique, prise renforcée ou wallbox",
        text: "Une prise domestique standard permet une recharge lente, adaptée à un usage occasionnel. Une prise renforcée est conçue pour supporter une charge prolongée en toute sécurité. Une wallbox offre une recharge plus rapide et des fonctions de programmation ; son installation doit être réalisée par un électricien qualifié.",
      },
      {
        title: "Bornes publiques",
        text: "Les bornes publiques en courant alternatif (AC) conviennent à une recharge pendant un stationnement prolongé. Les bornes rapides en courant continu (DC) permettent de récupérer une grande partie de l'autonomie en peu de temps lors des longs trajets, si le véhicule les accepte.",
      },
      {
        title: "Recharger sans garage",
        text: "Sans recharge à domicile, il est possible de s'appuyer sur les bornes du lieu de travail, des centres commerciaux et des parkings publics. Dans ce cas, un hybride rechargeable ou un électrique à prolongateur réduit la dépendance aux bornes.",
      },
    ],
  },
  {
    id: "guide-autonomie",
    title: "Comprendre l'autonomie",
    sub: "Base documentaire · mis à jour le [Date]",
    sections: [
      {
        title: "Ce qui influence l'autonomie",
        text: "L'autonomie réelle dépend de la vitesse, du style de conduite, du relief, de la température extérieure et de l'usage de la climatisation ou du chauffage. Elle est généralement meilleure en ville, grâce à la récupération d'énergie au freinage, que sur autoroute à vitesse élevée.",
      },
      {
        title: "Comparer l'autonomie des modèles",
        text: "L'autonomie annoncée par le constructeur est mesurée selon un cycle normalisé et sert à comparer les modèles entre eux. Les versions dites Grande autonomie embarquent une batterie de plus grande capacité. Les valeurs de chaque modèle figurent dans sa fiche technique : [Valeur] km.",
      },
      {
        title: "Préserver la batterie",
        text: "Pour préserver la batterie au quotidien, il est conseillé de privilégier la recharge lente, d'éviter de laisser le véhicule longtemps à charge pleine ou vide, et de programmer la recharge pendant les heures creuses lorsque c'est possible.",
      },
    ],
  },
  {
    id: "guide-financement",
    title: "Guide du financement automobile",
    sub: "Base documentaire · mis à jour le [Date]",
    sections: [
      {
        title: "Crédit classique",
        text: "Avec un crédit classique, vous empruntez le prix du véhicule moins votre apport, et vous remboursez des mensualités fixes sur la durée choisie. Vous êtes propriétaire du véhicule dès l'achat.",
      },
      {
        title: "Location avec option d'achat (LOA)",
        text: "La location avec option d'achat consiste à payer des loyers pendant la durée du contrat. À la fin, vous pouvez lever l'option d'achat en payant le montant final prévu, ou restituer le véhicule. Une option d'achat plus élevée réduit les loyers mensuels.",
      },
      {
        title: "Apport et durée",
        text: "Un apport plus élevé réduit le montant financé, donc la mensualité et le coût total du crédit. Une durée plus longue réduit la mensualité mais augmente le coût total du crédit. Une durée plus courte réduit le coût total.",
      },
      {
        title: "Capacité de remboursement",
        text: "L'organisme de financement évalue la capacité de remboursement à partir des revenus, des charges et des crédits en cours. La règle appliquée dans cet assistant est une règle de démonstration à remplacer par celle de l'organisme de financement.",
      },
    ],
  },
  {
    id: "guide-entretien",
    title: "Entretien d'un véhicule électrique",
    sub: "Base documentaire · mis à jour le [Date]",
    sections: [
      {
        title: "Ce qui change à l'entretien",
        text: "Un véhicule électrique ne nécessite ni vidange moteur, ni remplacement de courroie de distribution, ni changement d'embrayage. L'entretien porte principalement sur les pneumatiques, les freins, le liquide de refroidissement de la batterie, le filtre d'habitacle et les mises à jour logicielles.",
      },
      {
        title: "Freinage",
        text: "La récupération d'énergie au freinage sollicite moins les plaquettes et les disques. Il reste nécessaire de faire contrôler le système de freinage régulièrement selon le carnet d'entretien du constructeur.",
      },
    ],
  },
];
