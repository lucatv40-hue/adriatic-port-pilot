import { createFileRoute } from "@tanstack/react-router";
import { authenticateCronRequest } from "@/integrations/supabase/cron-auth";

export const Route = createFileRoute("/api/public/jobs/import-notices")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const authFailure = await authenticateCronRequest(request);
        if (authFailure) return authFailure;
        const body = (await request.json().catch(() => ({}))) as { italy?: boolean };
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { importNotices } = await import("@/lib/notice-import.server");
        // Corpo vuoto (schedule giornaliera esistente) = tutte le fonti; {"italy":false} = solo fonti gratuite.
        return Response.json(await importNotices(supabaseAdmin, { italy: body.italy !== false }));
      },
    },
  },
});
