-- Positive traits (20)
insert into public.trait_options (name, type) values
  ('Brave', 'positive'), ('Clever', 'positive'), ('Charismatic', 'positive'),
  ('Agile', 'positive'), ('Strong', 'positive'), ('Wise', 'positive'),
  ('Lucky', 'positive'), ('Perceptive', 'positive'), ('Empathetic', 'positive'),
  ('Resourceful', 'positive'), ('Stealthy', 'positive'), ('Diplomatic', 'positive'),
  ('Creative', 'positive'), ('Resilient', 'positive'), ('Loyal', 'positive'),
  ('Precise', 'positive'), ('Energetic', 'positive'), ('Adaptable', 'positive'),
  ('Intimidating', 'positive'), ('Charming', 'positive');

-- Negative traits (20)
insert into public.trait_options (name, type) values
  ('Cowardly', 'negative'), ('Clumsy', 'negative'), ('Arrogant', 'negative'),
  ('Greedy', 'negative'), ('Impulsive', 'negative'), ('Stubborn', 'negative'),
  ('Naive', 'negative'), ('Paranoid', 'negative'), ('Lazy', 'negative'),
  ('Reckless', 'negative'), ('Jealous', 'negative'), ('Dishonest', 'negative'),
  ('Fearful', 'negative'), ('Hot-headed', 'negative'), ('Distrustful', 'negative'),
  ('Vain', 'negative'), ('Pessimistic', 'negative'), ('Forgetful', 'negative'),
  ('Indecisive', 'negative'), ('Overconfident', 'negative');

-- Backgrounds (20)
insert into public.background_options (name) values
  ('Orphan'), ('Ex-military'), ('Famous'), ('Noble'), ('Criminal'),
  ('Scholar'), ('Traveler'), ('Merchant'), ('Healer'), ('Hunter'),
  ('Sailor'), ('Farmer'), ('Monk'), ('Entertainer'), ('Detective'),
  ('Inventor'), ('Prophet'), ('Exile'), ('Spy'), ('Athlete');

-- Seed event row (update event_start_at before the event)
insert into public.event (name, event_start_at)
values ('Birthday Role Game', '2099-01-01T00:00:00Z');
