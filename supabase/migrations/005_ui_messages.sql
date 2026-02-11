-- Migration 005: Add ui_messages column to sessions for full conversation restore
-- Stores complete AI SDK UIMessage[] as JSONB for loading conversation history

ALTER TABLE sessions
  ADD COLUMN IF NOT EXISTS ui_messages JSONB DEFAULT '[]'::jsonb;
