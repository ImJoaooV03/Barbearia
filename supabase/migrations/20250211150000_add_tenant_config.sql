/*
  # Add Google Config to Tenants
  
  Adiciona colunas para armazenar configurações de API diretamente no banco de dados,
  permitindo configuração via UI sem redeploy.
*/

ALTER TABLE tenants 
ADD COLUMN IF NOT EXISTS google_config JSONB DEFAULT NULL;

-- Exemplo de estrutura do JSONB:
-- {
--   "clientId": "...",
--   "apiKey": "..."
-- }
