import { notFound } from "next/navigation";

/**
 * Root-level catch-all route to handle any unmatched URLs
 * that don't start with a valid locale prefix.
 * This ensures non-existent pages return a proper 404 status code
 * instead of a soft 404 (HTTP 200).
 */
export default function RootCatchAllPage() {
  notFound();
}
