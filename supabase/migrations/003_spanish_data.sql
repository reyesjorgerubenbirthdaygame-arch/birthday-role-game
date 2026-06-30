-- Translate trait and background option names to Spanish

-- Positive traits
UPDATE trait_options SET name = 'Valiente' WHERE name = 'Brave' AND type = 'positive';
UPDATE trait_options SET name = 'Astuto/a' WHERE name = 'Clever' AND type = 'positive';
UPDATE trait_options SET name = 'Carismático/a' WHERE name = 'Charismatic' AND type = 'positive';
UPDATE trait_options SET name = 'Ágil' WHERE name = 'Agile' AND type = 'positive';
UPDATE trait_options SET name = 'Fuerte' WHERE name = 'Strong' AND type = 'positive';
UPDATE trait_options SET name = 'Sabio/a' WHERE name = 'Wise' AND type = 'positive';
UPDATE trait_options SET name = 'Afortunado/a' WHERE name = 'Lucky' AND type = 'positive';
UPDATE trait_options SET name = 'Perspicaz' WHERE name = 'Perceptive' AND type = 'positive';
UPDATE trait_options SET name = 'Empático/a' WHERE name = 'Empathetic' AND type = 'positive';
UPDATE trait_options SET name = 'Ingenioso/a' WHERE name = 'Resourceful' AND type = 'positive';
UPDATE trait_options SET name = 'Sigiloso/a' WHERE name = 'Stealthy' AND type = 'positive';
UPDATE trait_options SET name = 'Diplomático/a' WHERE name = 'Diplomatic' AND type = 'positive';
UPDATE trait_options SET name = 'Creativo/a' WHERE name = 'Creative' AND type = 'positive';
UPDATE trait_options SET name = 'Resiliente' WHERE name = 'Resilient' AND type = 'positive';
UPDATE trait_options SET name = 'Leal' WHERE name = 'Loyal' AND type = 'positive';
UPDATE trait_options SET name = 'Preciso/a' WHERE name = 'Precise' AND type = 'positive';
UPDATE trait_options SET name = 'Enérgico/a' WHERE name = 'Energetic' AND type = 'positive';
UPDATE trait_options SET name = 'Adaptable' WHERE name = 'Adaptable' AND type = 'positive';
UPDATE trait_options SET name = 'Intimidante' WHERE name = 'Intimidating' AND type = 'positive';
UPDATE trait_options SET name = 'Encantador/a' WHERE name = 'Charming' AND type = 'positive';

-- Negative traits
UPDATE trait_options SET name = 'Cobarde' WHERE name = 'Cowardly' AND type = 'negative';
UPDATE trait_options SET name = 'Torpe' WHERE name = 'Clumsy' AND type = 'negative';
UPDATE trait_options SET name = 'Arrogante' WHERE name = 'Arrogant' AND type = 'negative';
UPDATE trait_options SET name = 'Codicioso/a' WHERE name = 'Greedy' AND type = 'negative';
UPDATE trait_options SET name = 'Impulsivo/a' WHERE name = 'Impulsive' AND type = 'negative';
UPDATE trait_options SET name = 'Terco/a' WHERE name = 'Stubborn' AND type = 'negative';
UPDATE trait_options SET name = 'Ingenuo/a' WHERE name = 'Naive' AND type = 'negative';
UPDATE trait_options SET name = 'Paranoico/a' WHERE name = 'Paranoid' AND type = 'negative';
UPDATE trait_options SET name = 'Perezoso/a' WHERE name = 'Lazy' AND type = 'negative';
UPDATE trait_options SET name = 'Temerario/a' WHERE name = 'Reckless' AND type = 'negative';
UPDATE trait_options SET name = 'Celoso/a' WHERE name = 'Jealous' AND type = 'negative';
UPDATE trait_options SET name = 'Deshonesto/a' WHERE name = 'Dishonest' AND type = 'negative';
UPDATE trait_options SET name = 'Miedoso/a' WHERE name = 'Fearful' AND type = 'negative';
UPDATE trait_options SET name = 'Irascible' WHERE name = 'Hot-headed' AND type = 'negative';
UPDATE trait_options SET name = 'Desconfiado/a' WHERE name = 'Distrustful' AND type = 'negative';
UPDATE trait_options SET name = 'Vanidoso/a' WHERE name = 'Vain' AND type = 'negative';
UPDATE trait_options SET name = 'Pesimista' WHERE name = 'Pessimistic' AND type = 'negative';
UPDATE trait_options SET name = 'Olvidadizo/a' WHERE name = 'Forgetful' AND type = 'negative';
UPDATE trait_options SET name = 'Indeciso/a' WHERE name = 'Indecisive' AND type = 'negative';
UPDATE trait_options SET name = 'Presumido/a' WHERE name = 'Overconfident' AND type = 'negative';

-- Backgrounds
UPDATE background_options SET name = 'Huérfano/a' WHERE name = 'Orphan';
UPDATE background_options SET name = 'Ex militar' WHERE name = 'Ex-military';
UPDATE background_options SET name = 'Famoso/a' WHERE name = 'Famous';
UPDATE background_options SET name = 'Noble' WHERE name = 'Noble';
UPDATE background_options SET name = 'Criminal' WHERE name = 'Criminal';
UPDATE background_options SET name = 'Erudito/a' WHERE name = 'Scholar';
UPDATE background_options SET name = 'Viajero/a' WHERE name = 'Traveler';
UPDATE background_options SET name = 'Mercader' WHERE name = 'Merchant';
UPDATE background_options SET name = 'Sanador/a' WHERE name = 'Healer';
UPDATE background_options SET name = 'Cazador/a' WHERE name = 'Hunter';
UPDATE background_options SET name = 'Marinero/a' WHERE name = 'Sailor';
UPDATE background_options SET name = 'Granjero/a' WHERE name = 'Farmer';
UPDATE background_options SET name = 'Monje' WHERE name = 'Monk';
UPDATE background_options SET name = 'Artista' WHERE name = 'Entertainer';
UPDATE background_options SET name = 'Detective' WHERE name = 'Detective';
UPDATE background_options SET name = 'Inventor/a' WHERE name = 'Inventor';
UPDATE background_options SET name = 'Profeta' WHERE name = 'Prophet';
UPDATE background_options SET name = 'Exiliado/a' WHERE name = 'Exile';
UPDATE background_options SET name = 'Espía' WHERE name = 'Spy';
UPDATE background_options SET name = 'Atleta' WHERE name = 'Athlete';
