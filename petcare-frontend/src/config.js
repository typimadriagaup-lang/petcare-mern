// Single place that controls which backend URL the app talks to.
// Locally it falls back to your local backend; in production, set
// REACT_APP_API_URL as an environment variable on your hosting provider
// (e.g. Vercel) to your deployed backend's URL.
export const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';
