-- Enable pgvector for the policy knowledge base (semantic search of policy chunks).
CREATE EXTENSION IF NOT EXISTS vector;
-- pgcrypto is handy for gen_random_uuid() and digest() helpers.
CREATE EXTENSION IF NOT EXISTS pgcrypto;
