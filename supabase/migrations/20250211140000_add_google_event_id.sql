/*
  # Add Google Event ID to Appointments
  Adds a column to store the Google Calendar Event ID reference.
  
  ## Metadata:
  - Schema-Category: "Structural"
  - Impact-Level: "Low"
  - Requires-Backup: false
  - Reversible: true
*/

ALTER TABLE appointments 
ADD COLUMN IF NOT EXISTS google_event_id TEXT;
