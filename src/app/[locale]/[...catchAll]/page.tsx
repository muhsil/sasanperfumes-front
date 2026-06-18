import { notFound } from "next/navigation";

/**
 * Catch-all route to handle any unmatched URLs under [locale].
 * This ensures non-existent pages return a proper 404 status code
 * instead of a soft 404 (HTTP 200 with homepage content).
 */
export default function CatchAllPage() {
  notFound();
}
