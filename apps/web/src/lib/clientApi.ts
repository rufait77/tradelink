import axios from 'axios';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'https://api.tradelinkpro.net';

/**
 * Raw API client for the Client Portal pages.
 * Does NOT include JWT auth interceptors — client portal uses
 * token-based access via URL params, not Bearer tokens.
 */
const clientApi = axios.create({
  baseURL: API_BASE,
  headers: { 'Content-Type': 'application/json' },
});

export default clientApi;
