import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { Flag } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/lib/auth";

export function ReportDialog({
  companionId,
  bookingId,
  urgent,
  label = "Report",
}: {
  companionId?: string;
  bookingId?: string;
  urgent?: boolean;
  label?: string;
}) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const { user } = useSession();

  const send = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error("Please sign in first");
      if (reason.trim().length < 5) throw new Error("Please describe what happened");
      const { error } = await supabase.from("reports").insert({
        reporter_id: user.id,
        companion_id: companionId ?? null,
        booking_id: bookingId ?? null,
        reason: reason.trim().slice(0, 1000),
        is_urgent: !!urgent,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      setOpen(false);
      setReason("");
      toast.success(urgent ? "The owner has been alerted" : "Report sent to the owner");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant={urgent ? "destructive" : "ghost"} size="sm">
          <Flag className="mr-1.5 size-4" />
          {label}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{urgent ? "Safety concern" : "Report"}</DialogTitle>
          <DialogDescription>
            {urgent
              ? "This alerts the owner straight away. If you are in danger, call 999 first."
              : "Tell the owner what happened. Reports are private."}
          </DialogDescription>
        </DialogHeader>
        <Textarea
          value={reason}
          maxLength={1000}
          rows={5}
          placeholder="What happened?"
          onChange={(e) => setReason(e.target.value)}
        />
        <Button onClick={() => send.mutate()} disabled={send.isPending}>
          {send.isPending ? "Sending..." : "Send"}
        </Button>
      </DialogContent>
    </Dialog>
  );
}
