/*
  # Enable Realtime
  Habilita a replicação em tempo real para as tabelas críticas do dashboard.
  Isso permite que o frontend receba atualizações instantâneas (INSERT, UPDATE, DELETE).

  ## Metadata:
  - Schema-Category: "Safe"
  - Impact-Level: "Low"
  - Requires-Backup: false
*/

-- Adiciona as tabelas à publicação 'supabase_realtime'
-- Isso diz ao Supabase para enviar eventos dessas tabelas para os clientes conectados via WebSocket
alter publication supabase_realtime add table appointments;
alter publication supabase_realtime add table customers;
alter publication supabase_realtime add table orders;
alter publication supabase_realtime add table products;
alter publication supabase_realtime add table services;
